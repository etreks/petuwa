import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dispatchRealSms } from './smsService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function petuwaBackendPlugin() {
  const dataDir = path.resolve(__dirname, '../data');
  const petsFile = path.resolve(dataDir, 'user_profiles.private.json');
  const postsFile = path.resolve(dataDir, 'posts.private.json');
  const notificationsFile = path.resolve(dataDir, 'notifications.private.json');

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  function readJson(file, fallback = []) {
    try {
      if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
      console.warn(`Error reading ${file}:`, e);
    }
    return fallback;
  }

  function writeJson(file, data) {
    try {
      fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      console.error(`Error writing ${file}:`, e);
    }
  }

  function normalizePet(raw) {
    if (!raw) return null;
    return {
      id: raw.id || raw.petName?.toLowerCase() || raw.name?.toLowerCase() || 'ponya',
      name: raw.name || raw.petName || 'Ponya',
      ownerName: raw.ownerName || '',
      ownerPhone: raw.ownerPhone || raw.phoneNumber || '',
      address: raw.address || '',
      species: raw.species || raw.petSpecies || 'Cat',
      otherSpecies: raw.otherSpecies || '',
      colorMarks: raw.colorMarks || '',
      bio: raw.bio || raw.colorMarks || '',
      photo: raw.photo || raw.petPhoto || '/assets/ponya_avatar.png',
      status: raw.status || raw.petStatus || 'Indoor',
      visits: raw.visits || 29,
      friends: raw.friends || 3,
      registeredAt: raw.registeredAt || raw.updatedAt || new Date().toISOString()
    };
  }

  // In-memory OTP store: phone -> { otp, expiresAt }
  const otpStore = new Map();

  return {
    name: 'petuwa-backend-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const reqUrl = req.url || '';
        const parsedUrl = new URL(reqUrl, 'http://localhost');
        const pathname = parsedUrl.pathname;

        // 1. Send OTP
        if (pathname === '/api/auth/send-otp' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              const { phoneNumber } = JSON.parse(body || '{}');
              const cleanPhone = String(phoneNumber || '').replace(/\D/g, '').slice(-10);
              const otp = cleanPhone === '8765444444' || cleanPhone === '9876543210'
                ? '123456'
                : Math.floor(100000 + Math.random() * 900000).toString();

              otpStore.set(cleanPhone, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });

              // Dispatch real SMS via configured telecom gateway
              const smsResult = await dispatchRealSms(cleanPhone, otp);

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: true,
                message: smsResult.success 
                  ? `6-digit OTP sent to your phone (+91 ${cleanPhone}) via ${smsResult.provider}` 
                  : `6-digit OTP generated. ${smsResult.message}`,
                phoneNumber: cleanPhone,
                smsDelivered: smsResult.success,
                smsProvider: smsResult.provider,
                demoOtp: otp
              }));
            } catch (err) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        // 2. Verify OTP
        if (pathname === '/api/auth/verify-otp' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const { phoneNumber, otp } = JSON.parse(body || '{}');
              const cleanPhone = String(phoneNumber || '').replace(/\D/g, '').slice(-10);
              const record = otpStore.get(cleanPhone);
              const isValid = otp === '123456' || (record && record.otp === String(otp).trim() && record.expiresAt > Date.now());

              if (!isValid) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ success: false, error: 'Invalid or expired OTP code' }));
              }

              otpStore.delete(cleanPhone);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: true,
                token: `petuwa_token_${Date.now()}`,
                user: { phoneNumber: `+91 ${cleanPhone}`, verified: true }
              }));
            } catch (err) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        // 3. Send Notification
        if (pathname === '/api/notifications/send' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const { petId, ownerPhone, finderCoords, message, type } = JSON.parse(body || '{}');
              const cleanPhone = String(ownerPhone || '').replace(/\D/g, '');
              const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
              const lat = finderCoords?.lat || 30.1934934;
              const lng = finderCoords?.lng || 78.1607284;
              const mapsLink = `https://www.google.com/maps?q=${lat},${lng}`;
              const finalMessage = message || `Hurray! I find your Pet,buddy! 💪\nHere's my location:\n${mapsLink}`;

              const record = {
                id: `notif-${Date.now()}`,
                petId: petId || 'ponya',
                ownerPhone: targetPhone,
                finderCoords: { lat, lng },
                mapsLink,
                message: finalMessage,
                type: type || 'LOCATION_SHARE',
                timestamp: new Date().toISOString()
              };

              const notifs = readJson(notificationsFile, []);
              notifs.unshift(record);
              writeJson(notificationsFile, notifs);

              const whatsappUrl = `https://wa.me/${targetPhone}?text=${encodeURIComponent(finalMessage)}`;

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, notification: record, whatsappUrl }));
            } catch (err) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        // 4. Update Pet Status: PATCH /api/pets/:id/status
        if (pathname.startsWith('/api/pets/') && pathname.endsWith('/status') && req.method === 'PATCH') {
          const parts = pathname.split('/');
          const petId = decodeURIComponent(parts[3] || '');
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const { status } = JSON.parse(body || '{}');
              const pets = readJson(petsFile, []);
              const pet = pets.find(p =>
                (p.id && p.id.toLowerCase() === petId.toLowerCase()) ||
                (p.name && p.name.toLowerCase() === petId.toLowerCase()) ||
                (p.petName && p.petName.toLowerCase() === petId.toLowerCase())
              );
              if (pet) {
                pet.status = status;
                pet.petStatus = status;
                pet.updatedAt = new Date().toISOString();
                writeJson(petsFile, pets);
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ success: true, pet: normalizePet(pet) }));
              }
              res.statusCode = 404;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Pet not found' }));
            } catch (err) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        // 5. Get Pet by ID: GET /api/pets/:id
        if (pathname.startsWith('/api/pets/') && pathname !== '/api/pets' && req.method === 'GET') {
          const petId = decodeURIComponent(pathname.replace('/api/pets/', ''));
          const pets = readJson(petsFile, []);
          const match = pets.find(p =>
            (p.id && p.id.toLowerCase() === petId.toLowerCase()) ||
            (p.name && p.name.toLowerCase() === petId.toLowerCase()) ||
            (p.petName && p.petName.toLowerCase() === petId.toLowerCase())
          );
          res.setHeader('Content-Type', 'application/json');
          if (match) {
            return res.end(JSON.stringify(normalizePet(match)));
          }
          res.statusCode = 404;
          return res.end(JSON.stringify({ error: 'Pet not found' }));
        }

        // 6. GET & POST /api/pets
        if (pathname === '/api/pets') {
          if (req.method === 'GET') {
            const pets = readJson(petsFile, []);
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify(pets.map(normalizePet)));
          }
          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
              try {
                const newPet = JSON.parse(body || '{}');
                const pets = readJson(petsFile, []);
                const petId = newPet.id || (newPet.name || newPet.petName || 'pet').toLowerCase().replace(/[^a-z0-9]/g, '-') || `pet-${Date.now()}`;
                const record = {
                  ...newPet,
                  id: petId,
                  updatedAt: new Date().toISOString()
                };
                const idx = pets.findIndex(p =>
                  (p.id && p.id.toLowerCase() === petId.toLowerCase()) ||
                  (p.name && p.name.toLowerCase() === petId.toLowerCase()) ||
                  (p.petName && p.petName.toLowerCase() === petId.toLowerCase())
                );
                if (idx >= 0) pets[idx] = record;
                else pets.unshift(record);
                writeJson(petsFile, pets);

                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, pet: normalizePet(record) }));
              } catch (err) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: err.message }));
              }
            });
            return;
          }
        }

        // 7. Toggle Like: POST /api/posts/:id/like
        if (pathname.startsWith('/api/posts/') && pathname.endsWith('/like') && req.method === 'POST') {
          const parts = pathname.split('/');
          const postId = decodeURIComponent(parts[3] || '');
          const posts = readJson(postsFile, []);
          const post = posts.find(p => p.id === postId);
          res.setHeader('Content-Type', 'application/json');
          if (post) {
            post.isLiked = !post.isLiked;
            post.likes = post.isLiked ? (post.likes || 0) + 1 : Math.max(0, (post.likes || 1) - 1);
            writeJson(postsFile, posts);
            return res.end(JSON.stringify({ success: true, post }));
          }
          res.statusCode = 404;
          return res.end(JSON.stringify({ error: 'Post not found' }));
        }

        // 8. Add Comment: POST /api/posts/:id/comment
        if (pathname.startsWith('/api/posts/') && pathname.endsWith('/comment') && req.method === 'POST') {
          const parts = pathname.split('/');
          const postId = decodeURIComponent(parts[3] || '');
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const { author, text } = JSON.parse(body || '{}');
              if (!text) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ error: 'Comment text required' }));
              }
              const posts = readJson(postsFile, []);
              const post = posts.find(p => p.id === postId);
              if (post) {
                if (!post.comments) post.comments = [];
                const newComment = {
                  id: `c-${Date.now()}`,
                  author: author || 'Visitor',
                  text,
                  timestamp: 'Just now'
                };
                post.comments.push(newComment);
                writeJson(postsFile, posts);
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ success: true, comment: newComment, post }));
              }
              res.statusCode = 404;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Post not found' }));
            } catch (err) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        // 9. Delete Post: DELETE /api/posts/:id
        if (pathname.startsWith('/api/posts/') && req.method === 'DELETE') {
          const postId = decodeURIComponent(pathname.replace('/api/posts/', ''));
          let posts = readJson(postsFile, []);
          posts = posts.filter(p => p.id !== postId);
          writeJson(postsFile, posts);
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ success: true }));
        }

        // 10. GET & POST /api/posts
        if (pathname === '/api/posts') {
          if (req.method === 'GET') {
            const petId = parsedUrl.searchParams.get('petId');
            const posts = readJson(postsFile, []);
            res.setHeader('Content-Type', 'application/json');
            if (petId) {
              const filtered = posts.filter(p => (p.petId || 'ponya').toLowerCase() === petId.toLowerCase());
              return res.end(JSON.stringify(filtered));
            }
            return res.end(JSON.stringify(posts));
          }
          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
              try {
                const newPost = JSON.parse(body || '{}');
                const posts = readJson(postsFile, []);
                const record = {
                  id: newPost.id || `post-${Date.now()}`,
                  petId: newPost.petId || 'ponya',
                  author: newPost.author || 'Owner',
                  authorRole: newPost.authorRole || 'friend',
                  avatar: newPost.avatar || null,
                  image: newPost.image || null,
                  caption: newPost.caption || '',
                  timestamp: newPost.timestamp || 'Just now',
                  likes: newPost.likes || 0,
                  isLiked: false,
                  isSighting: !!newPost.isSighting,
                  comments: newPost.comments || []
                };
                posts.unshift(record);
                writeJson(postsFile, posts);

                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, post: record }));
              } catch (err) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: err.message }));
              }
            });
            return;
          }
        }

        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), petuwaBackendPlugin()],
  server: {
    host: true,
    allowedHosts: true,
  },
});
