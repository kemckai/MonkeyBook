import React, { useState, useRef } from 'react';
import { uploadImage } from '../api';

export default function PostComposer({ onPost, parentId = null, troopId = null, placeholder }) {
  const [content, setContent] = useState('');
  const [isAnon, setIsAnon] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef(null);

  const charLimit = 500;
  const remaining = charLimit - content.length;

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadImage(file);
      setImageUrl(url);
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onPost(content, { parent_id: parentId, troop_id: troopId, is_anonymous: isAnon, image_url: imageUrl });
      setContent('');
      setIsAnon(false);
      setImageUrl(null);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="composer" onSubmit={handleSubmit}>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value.slice(0, charLimit))}
        placeholder={placeholder || 'Fling your thoughts into the void...'}
        rows={3}
      />
      {imageUrl && (
        <div className="composer-preview">
          <img src={imageUrl} alt="Upload preview" />
          <button type="button" onClick={() => setImageUrl(null)} className="remove-img">✕</button>
        </div>
      )}
      <div className="composer-footer">
        <div className="composer-options">
          <label className="anon-toggle">
            <input type="checkbox" checked={isAnon} onChange={(e) => setIsAnon(e.target.checked)} />
            <span>🙈 Anonymous</span>
          </label>
          <button type="button" className="upload-btn" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? '...' : '📷'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} hidden />
        </div>
        <div className="composer-right">
          <span className={`char-count ${remaining < 50 ? 'warn' : ''}`}>{remaining}</span>
          <button type="submit" disabled={!content.trim() || submitting}>
            {submitting ? 'Posting...' : 'Fling It'}
          </button>
        </div>
      </div>
    </form>
  );
}
