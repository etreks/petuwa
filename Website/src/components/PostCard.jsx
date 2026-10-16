import React, { useState } from 'react';
import { Heart, MoreHorizontal, ArrowUp } from 'lucide-react';

export default function PostCard({
  post,
  isOwner,
  onToggleLike,
  onAddComment,
  onDeletePost,
  onShowToast,
}) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showMenu, setShowMenu] = useState(false);

  const handleCommentSubmit = (e) => {
    e?.preventDefault();
    if (!commentText.trim()) return;

    const author = isOwner ? 'Owner' : 'Visitor';
    onAddComment(post.id, author, commentText.trim());
    setCommentText('');
    setShowComments(true);
    onShowToast?.('Comment added 💬');
  };

  return (
    <article className="petuwa-post-card">
      {/* Header: Author on left, ... on right */}
      <div className="petuwa-post-header">
        <span className="petuwa-author-name">{post.author}</span>
        {isOwner && (
          <div className="petuwa-menu-wrapper">
            <button
              type="button"
              className="petuwa-more-btn"
              onClick={() => setShowMenu(!showMenu)}
              title="Post options"
            >
              <MoreHorizontal size={18} color="#000000" />
            </button>
            {showMenu && (
              <div className="petuwa-dropdown-menu">
                <button
                  type="button"
                  className="petuwa-dropdown-item text-red"
                  onClick={() => {
                    setShowMenu(false);
                    onDeletePost(post.id);
                  }}
                >
                  Delete post
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Image matching Slide 7 & 8 */}
      {post.image && (
        <div
          className="petuwa-post-image-box"
          onClick={() => setShowComments(!showComments)}
          style={{ cursor: 'pointer' }}
        >
          <img
            src={post.image}
            alt={post.caption || 'Pet photo'}
            className="petuwa-post-img"
            loading="lazy"
          />
        </div>
      )}

      {/* Meta Row: Caption + Timestamp on left, Heart icon on right */}
      <div className="petuwa-post-meta">
        <div
          className="petuwa-meta-text"
          onClick={() => setShowComments(!showComments)}
          style={{ cursor: 'pointer', flex: 1 }}
        >
          {post.caption && <h3 className="petuwa-post-caption">{post.caption}</h3>}
          <p className="petuwa-post-timestamp">{post.timestamp}</p>
        </div>

        <button
          type="button"
          className="petuwa-heart-btn"
          onClick={() => onToggleLike(post.id)}
          title="Like post"
        >
          <Heart
            size={22}
            fill={post.isLiked ? '#E11D48' : 'none'}
            color={post.isLiked ? '#E11D48' : '#000000'}
            strokeWidth={1.8}
          />
        </button>
      </div>

      {/* Comments Thread matching Slide 8 */}
      {showComments && (
        <div className="petuwa-comments-thread">
          <div className="petuwa-comments-divider" />
          <div className="petuwa-comments-list">
            {post.comments && post.comments.length > 0 ? (
              post.comments.map((c) => {
                const initial = (c.author || 'A')[0].toUpperCase();
                return (
                  <div key={c.id} className="petuwa-comment-row">
                    <div className="petuwa-avatar-circle">{initial}</div>
                    <div className="petuwa-comment-content">
                      <span className="petuwa-comment-body">{c.text}</span>
                    </div>
                    <span className="petuwa-comment-time">{c.timestamp || '20 min'}</span>
                  </div>
                );
              })
            ) : (
              <div className="petuwa-no-comments">No comments yet. Be the first to comment!</div>
            )}
          </div>

          {/* Add a comment input matching Slide 8 */}
          <form onSubmit={handleCommentSubmit} className="petuwa-comment-input-bar">
            <input
              type="text"
              className="petuwa-comment-input"
              placeholder="Add a comment"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <button
              type="submit"
              className="petuwa-send-arrow-btn"
              disabled={!commentText.trim()}
              title="Post comment"
            >
              <ArrowUp size={16} color="#FFFFFF" strokeWidth={2.4} />
            </button>
          </form>
        </div>
      )}
    </article>
  );
}
