import React, { useState, useRef } from 'react';
import { X, Camera } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function NewPostModal({ pet, isOwner, onClose, onPostCreated, onShowToast }) {
  const [image, setImage] = useState(null);
  const [caption, setCaption] = useState('');
  const [authorName, setAuthorName] = useState(isOwner ? pet?.ownerName : '');
  const [isSighting, setIsSighting] = useState(pet?.status === 'Missing');
  const fileRef = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 800;
        let w = img.width;
        let h = img.height;
        if (w > maxDim) { h = Math.round(h * maxDim / w); w = maxDim; }
        if (h > maxDim) { w = Math.round(w * maxDim / h); h = maxDim; }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        setImage(canvas.toDataURL('image/jpeg', 0.88));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!image && !caption.trim()) {
      onShowToast?.('Please add a photo or write something');
      return;
    }

    const finalAuthor = isOwner ? (pet?.ownerName || 'Owner') : (authorName.trim() || 'Friendly Visitor');

    const newPost = {
      petId: pet?.id || 'ponya',
      author: finalAuthor,
      authorRole: isOwner ? 'owner' : (isSighting ? 'finder' : 'friend'),
      avatar: isOwner ? pet?.photo : null,
      image,
      caption: caption.trim(),
      timestamp: 'Just now',
      isSighting,
      likes: 0,
      isLiked: false,
      comments: []
    };

    onPostCreated(newPost);
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    onShowToast?.(isSighting ? '🚨 Sighting report submitted!' : 'Photo posted! 🐾');
    onClose();
  };

  return (
    <div className="post-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="post-modal">
        <div className="post-modal-header">
          <span className="post-modal-title">
            {isSighting ? 'Report Sighting Evidence' : 'New Photo Post'}
          </span>
          <button className="post-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Sighting Checkbox (Available for any finder/friend or when pet is missing) */}
        <label className="sighting-toggle-label">
          <input
            type="checkbox"
            checked={isSighting}
            onChange={(e) => setIsSighting(e.target.checked)}
          />
          <span>🚨 Mark as Sighting / Last seen location</span>
        </label>

        {/* Image Upload Box */}
        <div
          className={`post-image-area ${image ? 'has-image' : ''}`}
          onClick={() => !image && fileRef.current?.click()}
        >
          {image ? (
            <>
              <img src={image} alt="Post preview" className="post-preview-img" />
              <button
                type="button"
                className="post-img-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  setImage(null);
                }}
              >
                <X size={14} />
              </button>
            </>
          ) : (
            <div className="post-image-placeholder">
              <Camera size={28} color="#aaa" />
              <span>Tap to snap or upload photo</span>
            </div>
          )}
        </div>
        <input
          type="file"
          accept="image/*"
          ref={fileRef}
          style={{ display: 'none' }}
          onChange={handleImageChange}
        />

        {/* Visitor Author Name */}
        {!isOwner && (
          <input
            type="text"
            className="post-author-input"
            placeholder="Your Name / Nickname (e.g. Sajal, Caretaker)"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
          />
        )}

        {/* Caption */}
        <textarea
          className="post-caption-input"
          placeholder={
            isSighting
              ? 'Where and when did you spot this pet? Any specific landmark?'
              : 'Write a caption for this moment...'
          }
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={3}
          maxLength={300}
        />

        <button
          type="button"
          className="post-submit-btn"
          onClick={handleSubmit}
          disabled={!image && !caption.trim()}
        >
          {isSighting ? 'Submit Sighting Report' : 'Post to Pet Feed'}
        </button>
      </div>
    </div>
  );
}
