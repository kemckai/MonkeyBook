import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Post from '../components/Post';
import PostComposer from '../components/PostComposer';
import ToastStack from '../components/ToastStack';
import { useMonkey } from '../context/MonkeyContext';
import { getTroop, getPosts, createPost, deletePost, toggleReaction, flingPost, joinTroop } from '../api';

export default function TroopFeed() {
  const { id } = useParams();
  const { monkey, loading: identityLoading } = useMonkey();
  const navigate = useNavigate();
  const [troop, setTroop] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [joinPending, setJoinPending] = useState(false);

  function pushToast(message, type = 'info') {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }

  useEffect(() => {
    if (!identityLoading && !monkey) navigate('/');
  }, [monkey, identityLoading, navigate]);

  useEffect(() => {
    if (!monkey) return;
    Promise.all([getTroop(id), getPosts({ troop_id: id })])
      .then(([t, data]) => { setTroop(t); setPosts(data.posts); })
      .catch((err) => {
        console.error(err);
        pushToast('Could not load troop feed.', 'error');
      })
      .finally(() => setLoading(false));
  }, [id, monkey]);

  async function handleJoin() {
    if (joinPending) return;
    setJoinPending(true);
    try {
      const result = await joinTroop(id);
      setTroop(prev => ({ ...prev, is_member: result.joined, member_count: prev.member_count + (result.joined ? 1 : -1) }));
    } catch (err) {
      pushToast(err.message || 'Could not update troop membership.', 'error');
    } finally {
      setJoinPending(false);
    }
  }

  async function handlePost(content, opts) {
    try {
      const newPost = await createPost(content, { ...opts, troop_id: parseInt(id) });
      setPosts(prev => [newPost, ...prev]);
    } catch (err) {
      pushToast(err.message || 'Could not create troop post.', 'error');
    }
  }

  async function handleReact(postId, type) {
    try {
      const result = await toggleReaction(postId, type);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, bananas: result.bananas, poops: result.poops } : p));
    } catch (err) {
      pushToast(err.message || 'Reaction failed.', 'error');
    }
  }

  async function handleDelete(postId) {
    await deletePost(postId);
    setPosts(prev => prev.filter(p => p.id !== postId));
  }

  async function handleFling(postId) {
    await flingPost(postId);
  }

  if (identityLoading || loading) {
    return <div className="app"><Header /><div className="loading">Loading troop...</div></div>;
  }

  if (!troop) {
    return <div className="app"><Header /><div className="empty-feed">Troop not found</div></div>;
  }

  return (
    <div className="app">
      <Header />
      <main className="feed">
        <ToastStack toasts={toasts} onDismiss={(toastId) => setToasts((prev) => prev.filter((t) => t.id !== toastId))} />
        <div className="troop-header-card">
          <h2>{troop.name}</h2>
          {troop.description && <p className="troop-desc">{troop.description}</p>}
          <div className="troop-meta">
            <span>{troop.member_count} members</span>
            <button className={`join-btn ${troop.is_member ? 'joined' : ''}`} disabled={joinPending} onClick={handleJoin}>
              {joinPending ? '...' : troop.is_member ? 'Leave' : 'Join'}
            </button>
          </div>
        </div>
        {troop.is_member && <PostComposer onPost={handlePost} troopId={parseInt(id)} placeholder={`Post in ${troop.name}...`} />}
        {posts.length === 0 ? (
          <div className="empty-feed"><p>No posts in this troop yet.</p></div>
        ) : (
          posts.map(post => (
            <Post key={post.id} post={post} onReact={handleReact} onDelete={handleDelete} onFling={handleFling} />
          ))
        )}
      </main>
    </div>
  );
}
