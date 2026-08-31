import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Header from '../components/Header';
import Post from '../components/Post';
import PostComposer from '../components/PostComposer';
import ToastStack from '../components/ToastStack';
import { useMonkey } from '../context/MonkeyContext';
import { getPost, getReplies, createPost, deletePost, toggleReaction, flingPost } from '../api';

export default function Thread() {
  const { id } = useParams();
  const { monkey, loading: identityLoading } = useMonkey();
  const navigate = useNavigate();
  const [parentPost, setParentPost] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [toasts, setToasts] = useState([]);

  function pushToast(message, type = 'info') {
    const toastId = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id: toastId, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toastId));
    }, 3500);
  }

  useEffect(() => {
    if (!identityLoading && !monkey) navigate('/');
  }, [monkey, identityLoading, navigate]);

  useEffect(() => {
    if (!monkey) return;
    let cancelled = false;
    setLoading(true);
    setMissing(false);

    Promise.all([getPost(id), getReplies(id)])
      .then(([post, reps]) => {
        if (cancelled) return;
        setParentPost(post);
        setReplies(reps);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        setParentPost(null);
        setMissing(true);
        pushToast('This post may have been deleted.', 'error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const onWs = (e) => {
      const { event, data } = e.detail;
      if (event === 'post_deleted' && data.id === parseInt(id, 10)) {
        setParentPost(null);
        setMissing(true);
        pushToast('This post was deleted.', 'info');
      }
    };
    window.addEventListener('monkeybook-ws', onWs);

    return () => {
      cancelled = true;
      window.removeEventListener('monkeybook-ws', onWs);
    };
  }, [id, monkey]);

  async function handleReply(content, opts) {
    try {
      const newReply = await createPost(content, { ...opts, parent_id: parseInt(id) });
      setReplies(prev => [...prev, newReply]);
    } catch (err) {
      pushToast(err.message || 'Reply failed.', 'error');
    }
  }

  async function handleReact(postId, type) {
    try {
      const result = await toggleReaction(postId, type);
      if (postId === parseInt(id)) {
        setParentPost(prev => ({ ...prev, bananas: result.bananas, poops: result.poops }));
      } else {
        setReplies(prev => prev.map(p => p.id === postId ? { ...p, bananas: result.bananas, poops: result.poops } : p));
      }
    } catch (err) {
      pushToast(err.message || 'Reaction failed.', 'error');
    }
  }

  async function handleDelete(postId) {
    await deletePost(postId);
    if (postId === parseInt(id)) {
      navigate('/feed');
    } else {
      setReplies(prev => prev.filter(p => p.id !== postId));
    }
  }

  async function handleFling(postId) {
    await flingPost(postId);
  }

  if (identityLoading || loading) {
    return <div className="app"><Header /><div className="loading">Loading thread...</div></div>;
  }

  if (!parentPost) {
    return (
      <div className="app">
        <Header />
        <main className="feed">
          <div className="empty-feed">
            <p>{missing ? 'This post was deleted or could not be found.' : 'Post not found'}</p>
            <p style={{ marginTop: 12 }}>
              <Link to="/feed" className="btn-primary btn-sm">Back to feed</Link>
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <Header />
      <main className="feed">
        <ToastStack toasts={toasts} onDismiss={(toastId) => setToasts((prev) => prev.filter((t) => t.id !== toastId))} />
        <Post post={parentPost} onReact={handleReact} onDelete={handleDelete} onFling={handleFling} />
        <div className="thread-divider">
          <span>{replies.length} {replies.length === 1 ? 'reply' : 'replies'}</span>
        </div>
        <PostComposer onPost={handleReply} parentId={parseInt(id)} placeholder="Fling a reply..." />
        {replies.map(reply => (
          <Post key={reply.id} post={reply} onReact={handleReact} onDelete={handleDelete} onFling={handleFling} />
        ))}
      </main>
    </div>
  );
}
