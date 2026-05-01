import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/Header';
import Post from '../components/Post';
import MonkeyAvatar from '../components/MonkeyAvatar';
import ToastStack from '../components/ToastStack';
import { useMonkey } from '../context/MonkeyContext';
import { getProfile, getMonkeyPosts, toggleReaction, deletePost, flingPost } from '../api';

export default function Profile() {
  const { id } = useParams();
  const { monkey, setBio } = useMonkey();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingBio, setEditingBio] = useState(false);
  const [bioText, setBioText] = useState('');
  const [toasts, setToasts] = useState([]);
  const [savingBio, setSavingBio] = useState(false);

  function pushToast(message, type = 'info') {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }

  const isMe = monkey && monkey.id === parseInt(id);

  useEffect(() => {
    Promise.all([getProfile(id), getMonkeyPosts(id)])
      .then(([prof, p]) => { setProfile(prof); setPosts(p); setBioText(prof.bio || ''); })
      .catch((err) => {
        console.error(err);
        pushToast('Could not load profile.', 'error');
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSaveBio() {
    if (savingBio) return;
    setSavingBio(true);
    try {
      await setBio(bioText);
      setProfile(prev => ({ ...prev, bio: bioText }));
      setEditingBio(false);
      pushToast('Bio updated.', 'success');
    } catch (err) {
      pushToast(err.message || 'Could not update bio.', 'error');
    } finally {
      setSavingBio(false);
    }
  }

  async function handleReact(postId, type) {
    const result = await toggleReaction(postId, type);
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, bananas: result.bananas, poops: result.poops } : p));
  }

  async function handleDelete(postId) {
    await deletePost(postId);
    setPosts(prev => prev.filter(p => p.id !== postId));
  }

  async function handleFling(postId) {
    await flingPost(postId);
  }

  if (loading) {
    return <div className="app"><Header /><div className="loading">Loading profile...</div></div>;
  }

  if (!profile) {
    return <div className="app"><Header /><div className="empty-feed">Monkey not found</div></div>;
  }

  return (
    <div className="app">
      <Header />
      <main className="feed">
        <ToastStack toasts={toasts} onDismiss={(toastId) => setToasts((prev) => prev.filter((t) => t.id !== toastId))} />
        <div className="profile-card">
          <MonkeyAvatar monkeyId={profile.id} size={80} />
          <h2 className="profile-name">{profile.monkey_emoji} {profile.display_name}</h2>
          {profile.title && <span className="profile-title">{profile.title}</span>}
          <div className="profile-bio">
            {editingBio ? (
              <div className="bio-edit">
                <input value={bioText} onChange={e => setBioText(e.target.value.slice(0, 100))} placeholder="Write a bio..." />
                <button disabled={savingBio} onClick={handleSaveBio}>{savingBio ? 'Saving...' : 'Save'}</button>
                <button disabled={savingBio} onClick={() => setEditingBio(false)} className="cancel">Cancel</button>
              </div>
            ) : (
              <p>
                {profile.bio || (isMe ? 'No bio yet...' : '')}
                {isMe && <button className="edit-bio-btn" onClick={() => setEditingBio(true)}>✏️</button>}
              </p>
            )}
          </div>
          <div className="profile-stats">
            <div className="stat"><span className="stat-value">{profile.karma}</span><span className="stat-label">Karma</span></div>
            <div className="stat"><span className="stat-value">{profile.post_count}</span><span className="stat-label">Posts</span></div>
            <div className="stat"><span className="stat-value">{profile.streak_count}</span><span className="stat-label">🔥 Streak</span></div>
          </div>
        </div>
        <h3 className="section-heading">Posts</h3>
        {posts.length === 0 ? (
          <div className="empty-feed"><p>No public posts yet.</p></div>
        ) : (
          posts.map(post => (
            <Post key={post.id} post={post} onReact={handleReact} onDelete={handleDelete} onFling={handleFling} />
          ))
        )}
      </main>
    </div>
  );
}
