import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import MonkeyAvatar from './MonkeyAvatar';
import BlurredPost from './BlurredPost';

export default function Post({ post, onReact, onDelete, onFling, bananasRemaining }) {
  const [blurRevealed, setBlurRevealed] = useState(false);
  const [pending, setPending] = useState({
    banana: false,
    poop: false,
    fling: false,
    delete: false,
  });
  const [pulse, setPulse] = useState({ banana: false, poop: false });

  function timeAgo(dateStr) {
    const seconds = Math.floor((Date.now() - new Date(dateStr + 'Z').getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  const totalReactions = post.bananas + post.poops;
  const poopRatio = totalReactions > 5 ? post.poops / totalReactions : 0;
  const showBlur = poopRatio > 0.8 && !blurRevealed;

  async function withPending(key, fn) {
    if (pending[key]) return;
    setPending((prev) => ({ ...prev, [key]: true }));
    if (key === 'banana' || key === 'poop') {
      setPulse((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => setPulse((prev) => ({ ...prev, [key]: false })), 260);
    }
    try {
      await fn();
    } finally {
      setPending((prev) => ({ ...prev, [key]: false }));
    }
  }

  return (
    <article className={`post post-enter ${showBlur ? 'post-blurred' : ''}`}>
      <BlurredPost
        bananas={post.bananas}
        poops={post.poops}
        blurRevealed={blurRevealed}
        onReveal={() => setBlurRevealed(true)}
      >
        <div className="post-header">
          <Link to={post.monkey_id ? `/monkey/${post.monkey_id}` : '#'} className="post-author">
            <MonkeyAvatar monkeyId={post.is_anonymous ? null : post.monkey_id} size={28} />
            <span>{post.monkey_name}</span>
          </Link>
          <span className="post-time">{timeAgo(post.created_at)}</span>
        </div>
        {post.fling_count > 0 && post.last_fling_name && (
          <p className="post-fling-line" title="Most recent fling">
            🙊 Flung by {post.last_fling_emoji} {post.last_fling_name}
            {post.fling_count > 1 ? ` · ${post.fling_count} flings` : ''}
          </p>
        )}

        <p className="post-content">{post.content}</p>
        {post.image_url && <img src={post.image_url} alt="Post attachment" className="post-image" />}

        <div className="post-actions">
          <button className={`reaction-btn ${pulse.banana ? 'reaction-pulse' : ''}`} disabled={pending.banana} onClick={() => withPending('banana', () => onReact(post.id, 'banana'))} aria-label="Banana reaction"
            title={bananasRemaining !== undefined ? `${bananasRemaining} bananas left today` : ''}>
            {pending.banana ? '⏳' : '🍌'} <span className="count">{post.bananas}</span>
          </button>
          <button className={`reaction-btn ${pulse.poop ? 'reaction-pulse' : ''}`} disabled={pending.poop} onClick={() => withPending('poop', () => onReact(post.id, 'poop'))} aria-label="Poop reaction">
            {pending.poop ? '⏳' : '💩'} <span className="count">{post.poops}</span>
          </button>
          <Link to={`/post/${post.id}`} className="reaction-btn" aria-label="Replies">
            💬 <span className="count">{post.reply_count || 0}</span>
          </Link>
          <button className="reaction-btn" disabled={pending.fling} onClick={() => withPending('fling', () => onFling(post.id))} aria-label="Fling">
            {pending.fling ? '⏳' : '🙊'} <span className="count">{post.fling_count || 0}</span>
          </button>
          {post.is_mine && (
            <button className="delete-btn" disabled={pending.delete} onClick={() => withPending('delete', () => onDelete(post.id))} aria-label="Delete post">
              {pending.delete ? '⏳' : '🗑️'}
            </button>
          )}
        </div>
      </BlurredPost>
    </article>
  );
}
