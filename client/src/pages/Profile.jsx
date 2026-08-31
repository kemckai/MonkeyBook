import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/Header';
import Post from '../components/Post';
import MonkeyAvatar from '../components/MonkeyAvatar';
import ToastStack from '../components/ToastStack';
import { useMonkey } from '../context/MonkeyContext';
import { getProfile, getMonkeyPosts, toggleReaction, deletePost, flingPost, getFriendStatus, sendFriendRequest, acceptFriendRequest, removeFriend } from '../api';

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
  const [friendStatus, setFriendStatus] = useState(null);
  const [friendshipId, setFriendshipId] = useState(null);

  function pushToast(message, type = 'info') {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }

  const isMe = monkey && monkey.id === parseInt(id);

  useEffect(() => {
    if (!monkey) return;
    let cancelled = false;

    function loadProfile() {
      setLoading(true);
      Promise.all([getProfile(id), getMonkeyPosts(id)])
        .then(([prof, p]) => {
          if (cancelled) return;
          setProfile(prof);
          setPosts(p);
          setBioText(prof.bio || '');
        })
        .catch((err) => {
          if (cancelled) return;
          console.error(err);
          pushToast('Could not load profile.', 'error');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }

    loadProfile();

    if (monkey.id !== parseInt(id, 10)) {
      getFriendStatus(id).then((s) => {
        if (cancelled) return;
        setFriendStatus(s.status);
        setFriendshipId(s.friendship_id || null);
      }).catch(() => {});
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') loadProfile();
    };
    document.addEventListener('visibilitychange', onVisible);

    const onWs = (e) => {
      const { event, data } = e.detail;
      if (event === 'post_deleted') {
        setPosts((prev) => prev.filter((p) => p.id !== data.id));
        setProfile((prev) => prev ? { ...prev, post_count: Math.max(0, (prev.post_count || 0) - 1) } : prev);
      }
    };
    window.addEventListener('monkeybook-ws', onWs);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('monkeybook-ws', onWs);
    };
  }, [id, monkey]);

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
    setProfile(prev => prev ? { ...prev, post_count: Math.max(0, (prev.post_count || 0) - 1) } : prev);
  }

  async function handleFling(postId) {
    await flingPost(postId);
  }

  async function handleFriendAction() {
    try {
      if (friendStatus === 'none') {
        const res = await sendFriendRequest(parseInt(id, 10));
        setFriendStatus('pending_outgoing');
        setFriendshipId(res.friendship_id);
        pushToast('Friend request sent!', 'success');
      } else if (friendStatus === 'pending_incoming') {
        await acceptFriendRequest(friendshipId);
        setFriendStatus('friends');
        pushToast('You are now friends!', 'success');
      } else if (friendStatus === 'pending_outgoing') {
        await removeFriend(friendshipId);
        setFriendStatus('none');
        setFriendshipId(null);
        pushToast('Request cancelled.', 'info');
      }
    } catch (err) {
      pushToast(err.message || 'Friend action failed.', 'error');
    }
  }

  function friendButtonLabel() {
    if (friendStatus === 'friends') return '✓ Friends';
    if (friendStatus === 'pending_outgoing') return 'Cancel Request';
    if (friendStatus === 'pending_incoming') return 'Accept Request';
    return '+ Add Friend';
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
          {!isMe && friendStatus && friendStatus !== 'self' && (
            <button
              className={`btn-primary btn-sm friend-profile-btn ${friendStatus === 'friends' ? 'disabled' : ''}`}
              onClick={handleFriendAction}
              disabled={friendStatus === 'friends'}
            >
              {friendButtonLabel()}
            </button>
          )}
        </div>
        <h3 className="section-heading">Posts</h3>
        {posts.length === 0 ? (
          <div className="empty-feed"><p>{isMe ? 'No posts yet. Fling something from the feed!' : 'No public posts yet.'}</p></div>
        ) : (
          posts.map(post => (
            <Post key={post.id} post={post} onReact={handleReact} onDelete={handleDelete} onFling={handleFling} />
          ))
        )}
      </main>
    </div>
  );
}
