import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  getPetById,
  cachePet,
  getPostsForPet,
  cachePosts,
  updatePetStatus,
  recordPetVisit,
  addPost,
  deletePost,
  toggleLikePost,
  addComment,
  isOwnerOfPet,
} from '../services/storage';
import NearbyVetsModal from '../components/NearbyVetsModal';
import NewPostModal from '../components/NewPostModal';
import {
  apiGetPetById,
  apiGetPosts,
  apiSendNotification,
  apiSavePost,
} from '../services/api';

export default function PetProfilePage({ onShowToast }) {
  const { petId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Load pet and posts with local cache for immediate render
  const [pet, setPet] = useState(() => getPetById(petId || 'ponya'));
  const [posts, setPosts] = useState(() => getPostsForPet(pet?.id || 'ponya'));
  const [isLoading, setIsLoading] = useState(!pet);

  // Ownership: Only true if this device registered the pet
  const isOwner = isOwnerOfPet(pet?.id);

  // Active post for Slide 8 Comments View
  const [activePostId, setActivePostId] = useState(() => searchParams.get('post') || null);
  const [commentInputText, setCommentInputText] = useState('');

  // Modals & Popups state
  const [showVetsModal, setShowVetsModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [activeMenuPostId, setActiveMenuPostId] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const targetId = petId || 'ponya';

    // 1. Immediate local cache lookup
    const cachedPet = getPetById(targetId);
    if (cachedPet) {
      setPet(cachedPet);
      const currentPosts = getPostsForPet(cachedPet.id);
      setPosts(currentPosts);
      recordPetVisit(cachedPet.id);
      setIsLoading(false);
    }

    // 2. Async database API fetch for cross-device persistence & freshness
    apiGetPetById(targetId)
      .then((dbPet) => {
        if (!isMounted) return;
        if (dbPet) {
          setPet(dbPet);
          cachePet(dbPet);
          recordPetVisit(dbPet.id);
        }
        setIsLoading(false);
      })
      .catch(() => {
        if (isMounted) setIsLoading(false);
      });

    // 3. Async database API fetch for community posts
    apiGetPosts(targetId)
      .then((dbPosts) => {
        if (!isMounted) return;
        if (Array.isArray(dbPosts) && dbPosts.length > 0) {
          setPosts(dbPosts);
          cachePosts(dbPosts);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [petId]);

  // Keep active post updated with fresh post state
  const activePost = activePostId ? (posts.find((p) => p.id === activePostId) || posts[0]) : null;

  if (isLoading) {
    return (
      <div className="figma-profile-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#888', fontSize: 13, fontFamily: 'Inter, sans-serif' }}>Loading profile...</p>
      </div>
    );
  }

  if (!pet) {
    return (
      <div className="figma-profile-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <h2 style={{ fontSize: 18, marginBottom: 8, fontFamily: 'Inter, sans-serif' }}>Pet Not Found</h2>
        <p style={{ color: '#666', fontSize: 13, marginBottom: 20, fontFamily: 'Inter, sans-serif' }}>
          This pet profile does not exist or may have been removed.
        </p>
        <button
          style={{
            padding: '10px 24px',
            background: '#000',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 13,
            cursor: 'pointer'
          }}
          onClick={() => navigate('/register')}
        >
          Register Pet
        </button>
      </div>
    );
  }

  // Toggle status (Indoor vs Missing) - Owner Only
  const handleToggleStatus = () => {
    if (!isOwner) {
      onShowToast?.('Only the pet owner can change status');
      return;
    }
    const newStatus = pet.status === 'Indoor' ? 'Missing' : 'Indoor';
    const updated = updatePetStatus(pet.id, newStatus);
    setPet({ ...pet, ...updated, status: newStatus });
    onShowToast?.(newStatus === 'Missing' ? 'Status set to Missing' : 'Status set to Indoor');
  };

  // Direct 1-tap WhatsApp location share matching Slide 12 & 14
  const handleShareLocationOnWhatsApp = () => {
    const rawPhone = (pet?.ownerPhone || '8765444444').replace(/\D/g, '');
    const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;

    const launchWithCoords = (lat, lng) => {
      const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
      const message = `Hurray! I find your Pet,buddy! 💪\nHere's my location:\n${mapsUrl}`;
      const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

      apiSendNotification({
        petId: pet.id,
        ownerPhone: pet.ownerPhone,
        finderCoords: { lat, lng },
        message,
      }).catch(() => {});

      window.open(waUrl, '_blank');
      onShowToast?.('Dispatched location alert to owner via WhatsApp! 💬');
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          launchWithCoords(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          launchWithCoords(30.1934934, 78.1607284);
        },
        { timeout: 5000 }
      );
    } else {
      launchWithCoords(30.1934934, 78.1607284);
    }
  };

  // Post actions
  const handleDeletePost = (postId) => {
    deletePost(postId);
    const updated = getPostsForPet(pet.id);
    setPosts(updated);
    if (activePostId === postId) {
      setActivePostId(null);
      setSearchParams({});
    }
    onShowToast?.('Post removed');
  };

  const handlePostCreated = (newPostData) => {
    addPost(newPostData);
    apiSavePost(newPostData).catch(() => {});
    setPosts(getPostsForPet(pet.id));
    setShowPostModal(false);
  };

  const handleToggleLike = (postId) => {
    toggleLikePost(postId);
    const updated = getPostsForPet(pet.id);
    setPosts(updated);
  };

  const handleAddCommentSubmit = (e) => {
    e?.preventDefault();
    if (!commentInputText.trim() || !activePost) return;

    const author = isOwner ? (pet.ownerName || 'Owner') : 'Visitor';
    addComment(activePost.id, author, commentInputText.trim());
    setCommentInputText('');
    const updated = getPostsForPet(pet.id);
    setPosts(updated);
    onShowToast?.('Comment added 💬');
  };

  const openPostComments = (post) => {
    setActivePostId(post.id);
    setSearchParams({ post: post.id });
  };

  const closePostComments = () => {
    setActivePostId(null);
    setSearchParams({});
  };

  // ─────────────────────────────────────────────────────────────
  // 1. POST DETAIL & COMMENTS VIEW (100% Exact Figma Specs)
  // When user clicks on a post on the profile
  // ─────────────────────────────────────────────────────────────
  if (activePost) {
    const isFirstPost = activePost.id === 'post-ponya-1' || activePost.id === 'post-1' || activePost.caption === 'Cinematic!';
    const detailPhotoSrc = isFirstPost ? '/assets/post1_cinematic_tall.png' : (activePost.image || '/assets/post1_cinematic_tall.png');

    return (
      <div className="figma-post-detail-screen">
        {/* PURR logo at left: 20px, top: 16px (Clicking returns to feed) */}
        <h1
          className="figma-feed-brand"
          onClick={closePostComments}
          title="Back to profile feed"
        >
          PURR
        </h1>

        {/* Top-right Plus Button at left: 355px, top: 5px */}
        <button
          type="button"
          className="figma-feed-plus-btn"
          onClick={() => setShowPostModal(true)}
          title="Add photo or post"
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#000000"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        {/* Satyam P. author name at left: 23px, top: 70px */}
        <div className="figma-detail-author">
          {activePost.author}
        </div>

        {/* ... More Button at left: 359px, top: 66px */}
        <button
          type="button"
          className="figma-detail-more"
          onClick={() => setActiveMenuPostId(activeMenuPostId === activePost.id ? null : activePost.id)}
          title="Post options"
        >
          ...
        </button>

        {/* Dropdown Menu Popup if active */}
        {activeMenuPostId === activePost.id && (
          <div
            className="figma-feed-menu-popup"
            style={{ top: '88px', right: '23px' }}
          >
            {isOwner && (
              <button
                type="button"
                className="figma-feed-menu-item"
                onClick={() => {
                  setActiveMenuPostId(null);
                  handleDeletePost(activePost.id);
                }}
              >
                Delete post
              </button>
            )}
            <button
              type="button"
              className="figma-feed-menu-item"
              style={{ color: '#000000' }}
              onClick={() => {
                setActiveMenuPostId(null);
                navigator.clipboard?.writeText(window.location.href);
                onShowToast?.('Post link copied! 📋');
              }}
            >
              Share post
            </button>
          </div>
        )}

        {/* Screenshot 2026-09-22 at 10.27.21 PM 2: 353px x 413px at left: 23px, top: 91px */}
        <img
          src={detailPhotoSrc}
          alt={activePost.caption || 'Cat photo'}
          className="figma-detail-img"
        />

        {/* Cinematic! Caption at left: 23px, top: 509px */}
        <h3 className="figma-detail-caption">
          {activePost.caption}
        </h3>

        {/* 10:21 PM, 23 September Timestamp at left: 23px, top: 523px */}
        <div className="figma-detail-time">
          {activePost.timestamp}
        </div>

        {/* Screenshot 2026-09-25 at 9.58.32 PM 1: Heart Like Button at left: 344px, top: 511px */}
        <button
          type="button"
          className="figma-detail-heart-btn"
          onClick={() => handleToggleLike(activePost.id)}
          title="Like post"
        >
          <svg
            width="25"
            height="25"
            viewBox="0 0 24 24"
            fill={activePost.isLiked ? '#E11D48' : 'none'}
            stroke={activePost.isLiked ? '#E11D48' : '#000000'}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>

        {/* Rectangle 15: 402px x 1px Divider Line at top: 552px */}
        <div className="figma-detail-divider" />

        {/* Comments Scrollable List (Frame 55, Frame 56, etc.) */}
        <div className="figma-detail-comments-scroll">
          {activePost.comments && activePost.comments.length > 0 ? (
            activePost.comments.map((comment, cIdx) => {
              const initial = (comment.author || 'A')[0].toUpperCase();
              const cTop = cIdx * 41;
              return (
                <div
                  key={comment.id || cIdx}
                  className="figma-detail-comment-frame"
                  style={{ top: `${cTop}px` }}
                >
                  {/* Rectangle 68: 22x22px circle */}
                  <div className="figma-detail-comment-avatar">
                    <span className="figma-detail-comment-initial">{initial}</span>
                  </div>

                  {/* Comment Text */}
                  <div className="figma-detail-comment-text">
                    {comment.text}
                  </div>

                  {/* Comment Time */}
                  <div className="figma-detail-comment-time">
                    {comment.timestamp}
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ padding: '24px 23px', fontSize: 12, color: '#9D9D9D', fontFamily: 'Inter, sans-serif' }}>
              No comments yet.
            </div>
          )}
        </div>

        {/* Frame 54: Add a comment Input Frame at left: 23px, top: 813px, 351x36px */}
        <form onSubmit={handleAddCommentSubmit} className="figma-detail-add-frame">
          <input
            type="text"
            className="figma-detail-add-input"
            placeholder="Add a comment"
            value={commentInputText}
            onChange={(e) => setCommentInputText(e.target.value)}
          />
        </form>

        {/* New Post Modal */}
        {showPostModal && (
          <NewPostModal
            pet={pet}
            isOwner={isOwner}
            onClose={() => setShowPostModal(false)}
            onPostCreated={handlePostCreated}
            onShowToast={onShowToast}
          />
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. MAIN PET PROFILE & COMMUNITY FEED VIEW (100% Figma Spec)
  // Height: 1216px (scrolling inside 874px chassis)
  // ─────────────────────────────────────────────────────────────
  const calculatedHeight = Math.max(1216, 254 + posts.length * 316 + 50);

  return (
    <div className="figma-profile-container">
      <div
        className="figma-profile-screen"
        style={{ minHeight: `${calculatedHeight}px` }}
      >
        {/* 1. Header: PURR logo at left: 20px, top: 16px, width: 63px */}
        <h1 className="figma-feed-brand" onClick={() => navigate('/')}>
          PURR
        </h1>

        {/* 2. Header: Plus Button (Screenshot 2026-04-12 at 19.22.45 1) at left: 355px, top: 5px, 41x38 */}
        <button
          type="button"
          className="figma-feed-plus-btn"
          onClick={() => setShowPlusMenu(!showPlusMenu)}
          title="Add / Register pet"
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#000000"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        {/* Plus Action Menu Popup */}
        {showPlusMenu && (
          <div className="figma-plus-popup" style={{ top: '48px', right: '16px' }}>
            <button
              type="button"
              className="figma-plus-menu-item"
              onClick={() => {
                setShowPlusMenu(false);
                setShowPostModal(true);
              }}
            >
              📸 Add Post to {pet.name}
            </button>
            <button
              type="button"
              className="figma-plus-menu-item"
              onClick={() => {
                setShowPlusMenu(false);
                navigate('/register');
              }}
            >
              🐾 Register a New Pet
            </button>
            <button
              type="button"
              className="figma-plus-menu-item"
              onClick={() => {
                setShowPlusMenu(false);
                navigate(`/qr/${pet.id}`);
              }}
            >
              🏷️ View Collar QR Tag
            </button>
          </div>
        )}

        {/* 3. Frame 29 (Avatar box border): 91x110 at left: 26px, top: 77px */}
        <div className="figma-feed-frame-29" />

        {/* 4. Avatar photo (Screenshot 2026-04-08 at 20.25.08 1): 74x107 at left: 36px, top: 79px */}
        <img
          src={pet.photo || '/assets/ponya_avatar.png'}
          alt={pet.name}
          className="figma-feed-avatar"
        />

        {/* 5. @ponya at left: 137px, top: 80px */}
        <div className="figma-feed-handle">
          @{pet.name.toLowerCase().replace(/\s+/g, '')}
        </div>

        {/* 6. Cat/Feline at left: 137px, top: 98px */}
        <div className="figma-feed-species">
          {pet.species === 'Cat' ? 'Cat/Feline' : pet.species || 'Cat/Feline'}
        </div>

        {/* 7. Stats: 3 Posts, 3 Friends, 29 Visits/month at top: 124px */}
        <div className="figma-feed-stat-posts">
          {posts.length} Posts
        </div>
        <div className="figma-feed-stat-friends">
          {pet.friends || 3} Friends
        </div>
        <div className="figma-feed-stat-visits">
          {pet.visits || 29} Visits/month
        </div>

        {/* 8. Status row at top: 157px */}
        <div className="figma-feed-status-label">
          Status
        </div>
        <button
          type="button"
          className={`figma-feed-frame-49 ${pet.status === 'Missing' ? 'missing' : ''}`}
          onClick={isOwner ? handleToggleStatus : undefined}
          title={isOwner ? 'Click to toggle status (Indoor / Missing)' : undefined}
          style={{ cursor: isOwner ? 'pointer' : 'default' }}
        >
          {pet.status || 'Indoor'}
        </button>

        {/* 9. Bio row (Screenshot 2026-04-12 at 00.37.29 1 pencil icon) at top: 196px */}
        <div className="figma-feed-bio-icon">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#000000"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
          </svg>
        </div>
        <p className="figma-feed-bio-text">
          {pet.bio || pet.colorMarks || 'Aggressive yet cute, loves chocolate biscuits!! All Bark, no bite.'}
        </p>

        {/* 10. Rectangle 15 (Divider line): 350x2px at left: 26px, top: 239px */}
        <div className="figma-feed-divider-15" />

        {/* Empty state for pets with 0 posts */}
        {posts.length === 0 && (
          <div style={{
            position: 'absolute',
            top: '280px',
            left: '26px',
            right: '26px',
            textAlign: 'center',
            padding: '40px 16px',
            background: '#F9FAFB',
            borderRadius: '16px',
            border: '1px dashed #D1D5DB'
          }}>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', fontWeight: 600, color: '#111827', margin: '0 0 6px 0' }}>
              No photos yet of {pet.name} 🐾
            </p>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#6B7280', margin: '0 0 18px 0' }}>
              Be the first to share a moment or sighting!
            </p>
            <button
              type="button"
              onClick={() => setShowPostModal(true)}
              style={{
                background: '#000000',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '9px 20px',
                fontSize: '12px',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              + Add First Photo
            </button>
          </div>
        )}

        {/* 11. Feed Posts matching Slide 6 & 7 */}
        {posts.map((post, idx) => {
          const baseTop = idx === 0 ? 254 : idx === 1 ? 570 : idx === 2 ? 884 : 254 + idx * 316;
          const authorTop = idx === 0 ? 259 : idx === 1 ? 575 : idx === 2 ? 889 : baseTop + 5;
          const moreTop = idx === 0 ? 254 : idx === 1 ? 568 : idx === 2 ? 882 : baseTop;
          const imgTop = idx === 0 ? 278 : idx === 1 ? 594 : idx === 2 ? 908 : baseTop + 24;
          const captionTop = idx === 0 ? 522 : idx === 1 ? 838 : idx === 2 ? 1152 : baseTop + 268;
          const timeTop = idx === 0 ? 536 : idx === 1 ? 852 : idx === 2 ? 1166 : baseTop + 282;

          const authorLeft = idx === 0 ? '36px' : idx === 1 ? '32px' : '31px';
          const captionLeft = idx === 0 ? '35px' : idx === 1 ? '32px' : '31px';
          const timeLeft = idx === 0 ? '35px' : idx === 1 ? '32px' : '31px';

          const fallbackImg =
            idx === 0
              ? '/assets/post1_cinematic.png'
              : idx === 1
              ? '/assets/post2_tree.png'
              : '/assets/post3_aisha.png';

          return (
            <React.Fragment key={post.id || `post-${idx}`}>
              {/* Author Name */}
              <div
                className="figma-feed-post-author"
                style={{ top: `${authorTop}px`, left: authorLeft }}
              >
                {post.author}
              </div>

              {/* ... More Options Button */}
              <button
                type="button"
                className="figma-feed-post-more"
                style={{ top: `${moreTop}px`, left: '348px' }}
                onClick={() => setActiveMenuPostId(activeMenuPostId === post.id ? null : post.id)}
                title="Post options"
              >
                ...
              </button>

              {/* Dropdown Menu Popup */}
              {activeMenuPostId === post.id && (
                <div
                  className="figma-feed-menu-popup"
                  style={{ top: `${moreTop + 22}px` }}
                >
                  {isOwner && (
                    <button
                      type="button"
                      className="figma-feed-menu-item"
                      onClick={() => {
                        setActiveMenuPostId(null);
                        handleDeletePost(post.id);
                      }}
                    >
                      Delete post
                    </button>
                  )}
                  <button
                    type="button"
                    className="figma-feed-menu-item"
                    style={{ color: '#000000' }}
                    onClick={() => {
                      setActiveMenuPostId(null);
                      navigator.clipboard?.writeText(window.location.href);
                      onShowToast?.('Post link copied! 📋');
                    }}
                  >
                    Share post
                  </button>
                </div>
              )}

              {/* Post Image: 350x244 with 12px radius */}
              <img
                src={post.image || fallbackImg}
                alt={post.caption || 'Pet photo'}
                className="figma-feed-post-img"
                style={{ top: `${imgTop}px`, left: '29px' }}
                onClick={() => openPostComments(post)}
                loading="lazy"
                title="Click to view comments"
              />

              {/* Caption */}
              <h3
                className="figma-feed-post-caption"
                style={{ top: `${captionTop}px`, left: captionLeft }}
                onClick={() => openPostComments(post)}
                title="Click to view comments"
              >
                {post.caption}
              </h3>

              {/* Timestamp */}
              <div
                className="figma-feed-post-time"
                style={{ top: `${timeTop}px`, left: timeLeft }}
              >
                {post.timestamp}
              </div>
            </React.Fragment>
          );
        })}

        {/* Floating Emergency Actions Overlay (Slide 12 - only when Missing) */}
        {pet.status === 'Missing' && (
          <div className="petuwa-floating-overlay">
            <button
              type="button"
              className="petuwa-pill-whatsapp"
              onClick={handleShareLocationOnWhatsApp}
              title="Share Live Location on WhatsApp"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.634.06-1.579-.331-.799-.332-1.486-.867-2.062-1.442-.647-.647-1.114-1.398-1.399-2.029-.271-.599-.015-1.173.238-1.42.176-.171.385-.23.513-.23.128 0 .256.002.368.01.12.008.28.026.433.391.16.384.545 1.33.593 1.428.048.098.08.214.016.342-.064.128-.096.208-.192.32-.096.112-.208.25-.297.336-.104.101-.212.211-.092.417.12.206.533.88 1.144 1.424.787.7 1.45.918 1.656 1.02.206.102.326.09.447-.049.12-.139.513-.598.65-.804.137-.206.273-.172.457-.103.184.069 1.168.551 1.369.652.201.101.335.151.384.236.049.085.049.493-.095.898z" />
              </svg>
              <span>Share Location</span>
            </button>

            <button
              type="button"
              className="petuwa-pill-aid"
              onClick={() => setShowVetsModal(true)}
              title="Emergency Veterinary Assistance"
            >
              <span className="aid-plus">+</span>
              <span>AID</span>
            </button>
          </div>
        )}
      </div>

      {/* Emergency Nearby Vets Modal */}
      {showVetsModal && (
        <NearbyVetsModal
          pet={pet}
          onClose={() => setShowVetsModal(false)}
          onShowToast={onShowToast}
        />
      )}

      {/* New Post Creator Modal */}
      {showPostModal && (
        <NewPostModal
          pet={pet}
          isOwner={isOwner}
          onClose={() => setShowPostModal(false)}
          onPostCreated={handlePostCreated}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
}
