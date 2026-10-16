// Production Data Layer for Purr / PETUWA
// Multi-pet architecture with owner-vs-guest credentialing & backend sync

import {
  apiSavePet,
  apiUpdatePetStatus,
  apiSavePost,
  apiDeletePost,
  apiToggleLikePost,
  apiAddComment,
} from './api';

const STORAGE_KEYS = {
  PETS: 'purr_all_pets_v3',
  POSTS: 'purr_all_posts_v3',
  OWNED_PETS: 'purr_owned_pet_ids_v3',
  USER_SESSION: 'purr_user_session_v3',
};

// Optional demo pet (archived example from case study, not forced as default)
const DEMO_PONYA = {
  id: 'ponya',
  name: 'Ponya',
  ownerName: 'Satyam Panwar',
  ownerPhone: '+91 8765444444',
  address: 'Bhagirath-3. Shantikunj, Haridwar, Uttarakhand',
  species: 'Cat',
  otherSpecies: '',
  colorMarks: 'Orangish White Cat, Blue eyes, not so fat, not so thin, tiny little baby',
  bio: 'Aggressive yet cute, loves chocolate biscuits!! All Bark, no bite.',
  photo: '/assets/ponya_avatar.png',
  status: 'Indoor',
  visits: 29,
  friends: 3,
  registeredAt: '2026-09-21T10:00:00.000Z',
  homeCoordinates: { lat: 30.1934934, lng: 78.1607284 }
};

const DEMO_POSTS = [
  {
    id: 'post-1',
    petId: 'ponya',
    author: 'Satyam P.',
    authorRole: 'owner',
    avatar: '/assets/ponya_avatar.png',
    image: '/assets/post1_cinematic.png',
    caption: 'Cinematic!',
    timestamp: '10:21 PM, 23 September',
    likes: 14,
    isLiked: false,
    isSighting: false,
    comments: [
      { id: 'c1', author: 'Aisha', text: 'Holy Cinematic frame man!', timestamp: '20 min' },
      { id: 'c2', author: 'Joji', text: 'Cute', timestamp: '1 min' },
    ],
  },
  {
    id: 'post-2',
    petId: 'ponya',
    author: 'Sajal',
    authorRole: 'friend',
    avatar: null,
    image: '/assets/post2_tree.png',
    caption: 'Ponya stopped into the trees.',
    timestamp: '02:00 PM, 22 September',
    likes: 9,
    isLiked: true,
    isSighting: false,
    comments: [
      { id: 'c3', author: 'Satyam P.', text: 'Look at those big eyes 👀', timestamp: '1 hour ago' },
    ],
  },
  {
    id: 'post-3',
    petId: 'ponya',
    author: 'Aisha',
    authorRole: 'friend',
    avatar: null,
    image: '/assets/post3_aisha.png',
    caption: 'Satyam’s cat is soooo cuteeeeeeee!!!️🥹',
    timestamp: '08:44 PM, 21 September',
    likes: 19,
    isLiked: false,
    isSighting: false,
    comments: [],
  },
];

// Initialize storage cleanly
export function initStorage() {
  try {
    const rawPets = localStorage.getItem(STORAGE_KEYS.PETS);
    if (!rawPets) {
      localStorage.setItem(STORAGE_KEYS.PETS, JSON.stringify([DEMO_PONYA]));
    }
    const rawPosts = localStorage.getItem(STORAGE_KEYS.POSTS);
    if (!rawPosts) {
      localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(DEMO_POSTS));
    }
  } catch (err) {
    console.warn('Storage init warning:', err);
  }
}

// Check if current browser session owns this pet
export function isOwnerOfPet(petId) {
  if (!petId) return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.OWNED_PETS);
    const ownedIds = raw ? JSON.parse(raw) : [];
    return ownedIds.includes(petId.toLowerCase());
  } catch {
    return false;
  }
}

// Get pets owned by current browser session
export function getOwnedPets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.OWNED_PETS);
    const ownedIds = raw ? JSON.parse(raw) : [];
    const all = getAllPets();
    return all.filter(p => ownedIds.includes((p.id || '').toLowerCase()));
  } catch {
    return [];
  }
}

// Mark pet as owned by current device
export function claimPetOwnership(petId) {
  if (!petId) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.OWNED_PETS);
    const ownedIds = raw ? JSON.parse(raw) : [];
    const cleanId = petId.toLowerCase();
    if (!ownedIds.includes(cleanId)) {
      ownedIds.push(cleanId);
      localStorage.setItem(STORAGE_KEYS.OWNED_PETS, JSON.stringify(ownedIds));
    }
  } catch (err) {
    console.warn('Failed to claim ownership:', err);
  }
}

// Get all registered pets from local storage
export function getAllPets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PETS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}
export const getPets = getAllPets;

// Get pet by ID from local cache
export function getPetById(petId) {
  const pets = getAllPets();
  if (!petId) return null;
  return pets.find(p => p.id && p.id.toLowerCase() === petId.toLowerCase()) || null;
}

// Cache or update a pet in local storage
export function cachePet(petRecord) {
  if (!petRecord || !petRecord.id) return;
  try {
    const pets = getAllPets();
    const idx = pets.findIndex(p => p.id.toLowerCase() === petRecord.id.toLowerCase());
    if (idx >= 0) {
      pets[idx] = { ...pets[idx], ...petRecord };
    } else {
      pets.push(petRecord);
    }
    localStorage.setItem(STORAGE_KEYS.PETS, JSON.stringify(pets));
  } catch (err) {
    console.warn('cachePet error:', err);
  }
}

// Cache posts list for a pet
export function cachePosts(posts) {
  if (!Array.isArray(posts)) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.POSTS);
    let all = raw ? JSON.parse(raw) : [];
    const postMap = new Map();
    all.forEach(p => postMap.set(p.id, p));
    posts.forEach(p => postMap.set(p.id, p));
    const merged = Array.from(postMap.values());
    localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(merged));
  } catch (err) {
    console.warn('cachePosts error:', err);
  }
}

// Generate unique Pet ID
export function generateUniquePetId(petName) {
  const base = (petName || 'pet').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10);
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${base || 'pet'}_${randomSuffix}`;
}

// Save or Update Pet
export function savePet(petData) {
  try {
    const pets = getAllPets();
    const id = petData.id || generateUniquePetId(petData.name);
    const record = {
      id,
      name: petData.name || 'Pet',
      ownerName: petData.ownerName || '',
      ownerPhone: petData.ownerPhone || '',
      address: petData.address || '',
      species: petData.species || 'Cat',
      otherSpecies: petData.otherSpecies || '',
      colorMarks: petData.colorMarks || '',
      bio: petData.bio || petData.colorMarks || '',
      photo: petData.photo || null,
      status: petData.status || 'Indoor',
      visits: petData.visits || 1,
      friends: petData.friends || 0,
      registeredAt: petData.registeredAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      homeCoordinates: petData.homeCoordinates || { lat: 30.1934934, lng: 78.1607284 }
    };

    const idx = pets.findIndex(p => p.id.toLowerCase() === id.toLowerCase());
    if (idx >= 0) {
      pets[idx] = record;
    } else {
      pets.unshift(record);
    }

    localStorage.setItem(STORAGE_KEYS.PETS, JSON.stringify(pets));

    // Automatically register current device as owner of this created pet
    claimPetOwnership(id);

    // Sync to backend database API
    apiSavePet(record).catch(() => {});

    return record;
  } catch (err) {
    console.error('savePet error:', err);
    return petData;
  }
}

// Update Pet Status (Indoor vs Missing)
export function updatePetStatus(petId, newStatus) {
  const pets = getAllPets();
  const pet = pets.find(p => p.id.toLowerCase() === petId.toLowerCase());
  if (pet) {
    pet.status = newStatus;
    pet.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEYS.PETS, JSON.stringify(pets));

    // Sync to backend database API
    apiUpdatePetStatus(petId, newStatus).catch(() => {});
  }
  return pet;
}

// Increment visit count for QR scans
export function recordPetVisit(petId) {
  try {
    const pets = getAllPets();
    const pet = pets.find(p => p.id.toLowerCase() === petId.toLowerCase());
    if (pet) {
      pet.visits = (pet.visits || 0) + 1;
      localStorage.setItem(STORAGE_KEYS.PETS, JSON.stringify(pets));
    }
  } catch {}
}

// Get posts for a specific pet
export function getPostsForPet(petId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.POSTS);
    const allPosts = raw ? JSON.parse(raw) : [];
    if (!petId) return allPosts;
    return allPosts.filter(p => (p.petId || 'ponya').toLowerCase() === petId.toLowerCase());
  } catch {
    return [];
  }
}

// Add a new post or sighting
export function addPost(postData) {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.POSTS);
    const allPosts = raw ? JSON.parse(raw) : [];
    const newPost = {
      id: `post_${Date.now()}`,
      timestamp: 'Just now',
      likes: 0,
      isLiked: false,
      comments: [],
      ...postData
    };
    allPosts.unshift(newPost);
    localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(allPosts));

    // Sync to backend database API
    apiSavePost(newPost).catch(() => {});

    return newPost;
  } catch (err) {
    console.error('addPost error:', err);
    return postData;
  }
}

// Delete post
export function deletePost(postId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.POSTS);
    let allPosts = raw ? JSON.parse(raw) : [];
    allPosts = allPosts.filter(p => p.id !== postId);
    localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(allPosts));

    // Sync to backend database API
    apiDeletePost(postId).catch(() => {});
  } catch {}
}

// Toggle Like on post
export function toggleLikePost(postId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.POSTS);
    const allPosts = raw ? JSON.parse(raw) : [];
    const post = allPosts.find(p => p.id === postId);
    if (post) {
      post.isLiked = !post.isLiked;
      post.likes = post.isLiked ? (post.likes + 1) : Math.max(0, post.likes - 1);
      localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(allPosts));

      // Sync to backend database API
      apiToggleLikePost(postId).catch(() => {});
    }
    return post;
  } catch {}
}

// Add comment to post
export function addComment(postId, authorName, text) {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.POSTS);
    const allPosts = raw ? JSON.parse(raw) : [];
    const post = allPosts.find(p => p.id === postId);
    if (post) {
      if (!Array.isArray(post.comments)) post.comments = [];
      const newComment = {
        id: `c_${Date.now()}`,
        author: authorName || 'Visitor',
        text: text.trim(),
        timestamp: 'Just now'
      };
      post.comments.push(newComment);
      localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(allPosts));

      // Sync to backend database API
      apiAddComment(postId, authorName, text).catch(() => {});

      return newComment;
    }
  } catch {}
  return null;
}

// Current user session management
export function getUserSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_SESSION);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function setUserSession(session) {
  try {
    localStorage.setItem(STORAGE_KEYS.USER_SESSION, JSON.stringify(session));
  } catch {}
}

export const getCurrentUser = getUserSession;
export const setCurrentUser = setUserSession;
