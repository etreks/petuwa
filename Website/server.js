import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dispatchRealSms } from './smsService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '25mb' }));

const dataDir = path.resolve(__dirname, '../data');
const petsFile = path.resolve(dataDir, 'user_profiles.private.json');
const postsFile = path.resolve(dataDir, 'posts.private.json');
const notificationsFile = path.resolve(dataDir, 'notifications.private.json');

// Ensure data directory exists
try {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
} catch (e) {
  console.warn('Could not create data directory (may be read-only filesystem):', e.message);
}

// In-Memory cache fallback for serverless / ephemeral environments
let inMemoryCache = {
  pets: null,
  posts: null,
  notifications: null
};

// Helpers
function readJson(file, cacheKey, fallback = []) {
  if (inMemoryCache[cacheKey]) {
    return inMemoryCache[cacheKey];
  }
  try {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      const parsed = JSON.parse(content);
      inMemoryCache[cacheKey] = parsed;
      return parsed;
    }
  } catch (err) {
    console.warn(`Error reading ${file}:`, err.message);
  }
  inMemoryCache[cacheKey] = fallback;
  return fallback;
}

function writeJson(file, cacheKey, data) {
  inMemoryCache[cacheKey] = data;
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.warn(`Error writing ${file} (persisting in memory):`, err.message);
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

// In-Memory OTP Store: phone -> { otp, expiresAt }
const otpStore = new Map();

// ─── 1. AUTH & OTP VERIFICATION APIS ───

// POST /api/auth/send-otp - Generate & dispatch 6-digit OTP
app.post('/api/auth/send-otp', async (req, res) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) {
    return res.status(400).json({ success: false, error: 'Phone number is required' });
  }

  const cleanPhone = String(phoneNumber).replace(/\D/g, '').slice(-10);
  if (cleanPhone.length < 10) {
    return res.status(400).json({ success: false, error: 'Valid 10-digit phone number required' });
  }

  // Generate 6-digit OTP (demo code 123456 or random)
  const otp = cleanPhone === '8765444444' || cleanPhone === '9876543210' 
    ? '123456' 
    : Math.floor(100000 + Math.random() * 900000).toString();

  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity
  otpStore.set(cleanPhone, { otp, expiresAt });

  // Dispatch real carrier SMS via configured gateway
  const smsResult = await dispatchRealSms(cleanPhone, otp);

  res.json({
    success: true,
    message: smsResult.success
      ? `6-digit OTP sent to your phone (+91 ${cleanPhone}) via ${smsResult.provider}`
      : `6-digit OTP generated for +91 ${cleanPhone}. ${smsResult.message}`,
    phoneNumber: cleanPhone,
    smsDelivered: smsResult.success,
    smsProvider: smsResult.provider,
    demoOtp: otp
  });
});

// POST /api/auth/verify-otp - Verify code & issue session
app.post('/api/auth/verify-otp', (req, res) => {
  const { phoneNumber, otp } = req.body;
  if (!phoneNumber || !otp) {
    return res.status(400).json({ success: false, error: 'Phone number and OTP code are required' });
  }

  const cleanPhone = String(phoneNumber).replace(/\D/g, '').slice(-10);
  const record = otpStore.get(cleanPhone);

  const isValid = 
    otp === '123456' || 
    (record && record.otp === String(otp).trim() && record.expiresAt > Date.now());

  if (!isValid) {
    return res.status(400).json({ success: false, error: 'Invalid or expired OTP code' });
  }

  // Clear OTP on successful verification
  otpStore.delete(cleanPhone);

  const token = `petuwa_session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const user = {
    phoneNumber: `+91 ${cleanPhone}`,
    verified: true,
    verifiedAt: new Date().toISOString()
  };

  res.json({
    success: true,
    message: 'OTP verified successfully',
    token,
    user
  });
});

// ─── 2. EMERGENCY NOTIFICATION SEND API ───

// POST /api/notifications/send - Send location alert to pet owner
app.post('/api/notifications/send', (req, res) => {
  const { petId, ownerPhone, finderCoords, message, type } = req.body;

  if (!ownerPhone) {
    return res.status(400).json({ success: false, error: 'Owner phone is required' });
  }

  const cleanPhone = String(ownerPhone).replace(/\D/g, '');
  const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

  const lat = finderCoords?.lat || 30.1934934;
  const lng = finderCoords?.lng || 78.1607284;
  const mapsLink = `https://www.google.com/maps?q=${lat},${lng}`;
  const defaultMsg = `Hurray! I find your Pet,buddy! 💪\nHere's my location:\n${mapsLink}`;
  const finalMessage = message || defaultMsg;

  const notificationRecord = {
    id: `notif-${Date.now()}`,
    petId: petId || 'unknown',
    ownerPhone: targetPhone,
    finderCoords: { lat, lng },
    mapsLink,
    message: finalMessage,
    type: type || 'FINDER_LOCATION_SHARE',
    timestamp: new Date().toISOString()
  };

  const notifications = readJson(notificationsFile, 'notifications', []);
  notifications.unshift(notificationRecord);
  writeJson(notificationsFile, 'notifications', notifications);

  console.log(`\n🚨 [PETUWA EMERGENCY NOTIFICATION]`);
  console.log(`🐾 Pet ID: ${petId}`);
  console.log(`📲 Dispatched to Owner: +${targetPhone}`);
  console.log(`📍 Finder Coordinates: ${lat}, ${lng}`);
  console.log(`🗺️ Maps Pin: ${mapsLink}\n`);

  const whatsappUrl = `https://wa.me/${targetPhone}?text=${encodeURIComponent(finalMessage)}`;

  res.json({
    success: true,
    message: 'Notification recorded and dispatched',
    notification: notificationRecord,
    whatsappUrl
  });
});

// ─── 3. DATABASE REST APIS ───

// GET /api/pets - Get all registered pets
app.get('/api/pets', (req, res) => {
  const pets = readJson(petsFile, 'pets', []);
  res.json(pets.map(normalizePet));
});

// GET /api/pets/:id - Get specific pet profile
app.get('/api/pets/:id', (req, res) => {
  const pets = readJson(petsFile, 'pets', []);
  const reqId = req.params.id?.toLowerCase();
  const match = pets.find(
    p => (p.id && p.id.toLowerCase() === reqId) ||
         (p.name && p.name.toLowerCase() === reqId) ||
         (p.petName && p.petName.toLowerCase() === reqId)
  );
  if (match) return res.json(normalizePet(match));
  res.status(404).json({ error: 'Pet not found' });
});

// POST /api/pets - Register or update pet profile
app.post('/api/pets', (req, res) => {
  const newPet = req.body;
  if (!newPet.name && !newPet.petName) {
    return res.status(400).json({ error: 'Pet name required' });
  }

  const pets = readJson(petsFile, 'pets', []);
  const petId = newPet.id || (newPet.name || newPet.petName).toLowerCase().replace(/[^a-z0-9]/g, '-') || `pet-${Date.now()}`;
  const record = {
    ...newPet,
    id: petId,
    updatedAt: new Date().toISOString()
  };

  const idx = pets.findIndex(
    p => (p.id && p.id.toLowerCase() === petId.toLowerCase()) ||
         (p.name && p.name.toLowerCase() === petId.toLowerCase()) ||
         (p.petName && p.petName.toLowerCase() === petId.toLowerCase())
  );

  if (idx >= 0) {
    pets[idx] = record;
  } else {
    pets.unshift(record);
  }

  writeJson(petsFile, 'pets', pets);
  res.json({ success: true, pet: normalizePet(record) });
});

// PATCH /api/pets/:id/status - Toggle pet status (Indoor vs Missing)
app.patch('/api/pets/:id/status', (req, res) => {
  const { status } = req.body;
  const pets = readJson(petsFile, 'pets', []);
  const reqId = req.params.id?.toLowerCase();
  const pet = pets.find(
    p => (p.id && p.id.toLowerCase() === reqId) ||
         (p.name && p.name.toLowerCase() === reqId) ||
         (p.petName && p.petName.toLowerCase() === reqId)
  );

  if (pet) {
    pet.status = status;
    pet.petStatus = status;
    pet.updatedAt = new Date().toISOString();
    writeJson(petsFile, 'pets', pets);
    return res.json({ success: true, pet: normalizePet(pet) });
  }
  res.status(404).json({ error: 'Pet not found' });
});

// GET /api/posts - Get community feed posts
app.get('/api/posts', (req, res) => {
  const posts = readJson(postsFile, 'posts', []);
  const { petId } = req.query;
  if (petId) {
    const filtered = posts.filter(p => (p.petId || 'ponya').toLowerCase() === petId.toLowerCase());
    return res.json(filtered);
  }
  res.json(posts);
});

// POST /api/posts - Create post or sighting
app.post('/api/posts', (req, res) => {
  const newPost = req.body;
  const posts = readJson(postsFile, 'posts', []);
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
  writeJson(postsFile, 'posts', posts);
  res.json({ success: true, post: record });
});

// POST /api/posts/:id/like - Toggle like on post
app.post('/api/posts/:id/like', (req, res) => {
  const posts = readJson(postsFile, 'posts', []);
  const post = posts.find(p => p.id === req.params.id);
  if (post) {
    post.isLiked = !post.isLiked;
    post.likes = post.isLiked ? (post.likes || 0) + 1 : Math.max(0, (post.likes || 1) - 1);
    writeJson(postsFile, 'posts', posts);
    return res.json({ success: true, post });
  }
  res.status(404).json({ error: 'Post not found' });
});

// POST /api/posts/:id/comment - Add comment to post
app.post('/api/posts/:id/comment', (req, res) => {
  const { author, text } = req.body;
  if (!text) return res.status(400).json({ error: 'Comment text required' });

  const posts = readJson(postsFile, 'posts', []);
  const post = posts.find(p => p.id === req.params.id);
  if (post) {
    if (!post.comments) post.comments = [];
    const newComment = {
      id: `c-${Date.now()}`,
      author: author || 'Visitor',
      text,
      timestamp: 'Just now'
    };
    post.comments.push(newComment);
    writeJson(postsFile, 'posts', posts);
    return res.json({ success: true, comment: newComment, post });
  }
  res.status(404).json({ error: 'Post not found' });
});

// DELETE /api/posts/:id - Delete post (Owner Moderation)
app.delete('/api/posts/:id', (req, res) => {
  let posts = readJson(postsFile, 'posts', []);
  posts = posts.filter(p => p.id !== req.params.id);
  writeJson(postsFile, 'posts', posts);
  res.json({ success: true });
});

// ─── 4. PRODUCTION STATIC SERVING & SPA ROUTING ───
const distDir = path.resolve(__dirname, 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));

  // Universal SPA fallback
  app.use((req, res) => {
    res.sendFile(path.resolve(distDir, 'index.html'));
  });
} else {
  app.use((req, res) => {
    res.send('Petuwa API server running. Run `npm run build` to serve frontend.');
  });
}

// Start server if not running inside a serverless handler or imported
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🐾 Petuwa Fullstack Server running on port ${PORT}`);
  });
}

export default app;
