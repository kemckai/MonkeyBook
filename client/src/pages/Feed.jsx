import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from '../components/Header';
import Post from '../components/Post';
import PostComposer from '../components/PostComposer';
import ToastStack from '../components/ToastStack';
import { useMonkey } from '../context/MonkeyContext';
import { getPosts, createPost, deletePost, toggleReaction, flingPost, getMonkeyOfTheDay } from '../api';

export default function Feed() {
  const { monkey } = useMonkey();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('fresh');
  const [cursor, setCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [bananasRemaining, setBananasRemaining] = useState(10);
  const [motd, setMotd] = useState(null);
  const [toasts, setToasts] = useState([]);
  const seenWsEvents = useRef(new Set());
  const [switchingSort, setSwitchingSort] = useState(false);
  const observerRef = useRef(null);
  const sentinelRef = useRef(null);

  function pushToast(message, type = 'info') {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }

  const fetchPosts = useCallback(async (resetCursor = true) => {
    if (!monkey) return;
    if (resetCursor) setLoading(true);
    try {
      const data = await getPosts({
        sort: sort === 'trending' ? 'trending' : undefined,
        feed: sort === 'friends' ? 'friends' : undefined,
        cursor: resetCursor ? undefined : cursor,
      });
      if (resetCursor) {
        setPosts(data.posts);
      } else {
        setPosts(prev => [...prev, ...data.posts]);
      }
      setCursor(data.next_cursor);
    } catch (e) {
      console.error(e);
      pushToast('Could not load feed right now.', 'error');
    }
    finally { setLoading(false); setLoadingMore(false); }
  }, [monkey, sort, cursor]);

  useEffect(() => {
    if (monkey) {
      setSwitchingSort(true);
      fetchPosts(true);
      getMonkeyOfTheDay().then(setMotd).catch(() => {});
      setTimeout(() => setSwitchingSort(false), 250);
    }
  }, [monkey, sort]);

  // Infinite scroll
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && cursor && !loadingMore) {
        setLoadingMore(true);
        fetchPosts(false);
      }
    }, { threshold: 0.1 });
    observer.observe(sentinelRef.current);
    observerRef.current = observer;
    return () => observer.disconnect();
  }, [cursor, loadingMore, fetchPosts]);

  const handleWsMessage = useCallback((event, data) => {
    const key = `${event}:${JSON.stringify(data)}`;
    if (seenWsEvents.current.has(key)) return;
    seenWsEvents.current.add(key);
    if (seenWsEvents.current.size > 200) {
      const first = seenWsEvents.current.values().next().value;
      seenWsEvents.current.delete(first);
    }

    if (event === 'new_post' && !data.parent_id) {
      setPosts(prev => prev.some(p => p.id === data.id) ? prev : [data, ...prev]);
    } else if (event === 'new_reply') {
      setPosts(prev => prev.map(p => p.id === data.parent_id ? { ...p, reply_count: (p.reply_count || 0) + 1 } : p));
    } else if (event === 'post_deleted') {
      setPosts(prev => prev.filter(p => p.id !== data.id));
    } else if (event === 'new_reaction') {
      setPosts(prev => prev.map(p => p.id === data.post_id ? { ...p, bananas: data.bananas, poops: data.poops } : p));
    } else if (event === 'post_flung') {
      setPosts(prev => prev.map(p => p.id === data.post_id ? { ...p, fling_count: Math.max(0, (p.fling_count || 0) + (data.flung ? 1 : -1)) } : p));
    }
  }, []);

  useEffect(() => {
    const onWs = (e) => {
      const { event, data } = e.detail;
      handleWsMessage(event, data);
    };
    window.addEventListener('monkeybook-ws', onWs);
    return () => window.removeEventListener('monkeybook-ws', onWs);
  }, [handleWsMessage]);

  async function handlePost(content, opts) {
    try {
      const newPost = await createPost(content, opts);
      setPosts(prev => [newPost, ...prev]);
    } catch (err) {
      pushToast(err.message || 'Unable to post right now.', 'error');
    }
  }

  async function handleReact(postId, type) {
    try {
      const result = await toggleReaction(postId, type);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, bananas: result.bananas, poops: result.poops } : p));
      if (result.bananas_remaining !== undefined) setBananasRemaining(result.bananas_remaining);
    } catch (err) {
      if (type === 'banana') {
        pushToast(err.message || 'Banana limit reached', 'error');
      } else {
        console.error(err);
        pushToast('Reaction failed. Try again.', 'error');
      }
    }
  }

  async function handleDelete(postId) {
    const snapshot = posts;
    setPosts(prev => prev.filter(p => p.id !== postId));
    try {
      await deletePost(postId);
    } catch (err) {
      setPosts(snapshot);
      pushToast(err.message || 'Delete failed.', 'error');
    }
  }

  async function handleFling(postId) {
    try {
      await flingPost(postId);
    } catch (err) {
      pushToast(err.message || 'Fling failed.', 'error');
    }
  }

  if (loading) {
    return <div className="app"><Header /><div className="loading">Loading the jungle...</div></div>;
  }

  return (
    <div className="app">
      <Header />
      <main className="feed">
        <ToastStack toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
        {motd && (
          <div className="motd-banner">
            <span className="motd-label">💩 Monkey of the Day</span>
            <span className="motd-name">{motd.monkey_emoji} {motd.display_name}</span>
            <span className="motd-reason">{motd.reason}</span>
          </div>
        )}
        <div className="feed-tabs">
          <button className={`tab ${sort === 'fresh' ? 'active' : ''}`} disabled={switchingSort} onClick={() => setSort('fresh')}>Fresh</button>
          <button className={`tab ${sort === 'friends' ? 'active' : ''}`} disabled={switchingSort} onClick={() => setSort('friends')}>Friends</button>
          <button className={`tab ${sort === 'trending' ? 'active' : ''}`} disabled={switchingSort} onClick={() => setSort('trending')}>Trending</button>
          <span className="banana-budget">🍌 {bananasRemaining} left today</span>
        </div>
        <PostComposer onPost={handlePost} />
        {posts.length === 0 ? (
          <div className="empty-feed"><p>{sort === 'friends' ? 'No posts from friends yet. Add some monkeys!' : 'No posts yet. Be the first monkey to fling something.'}</p></div>
        ) : (
          posts.map(post => (
            <Post key={post.id} post={post} onReact={handleReact} onDelete={handleDelete} onFling={handleFling} bananasRemaining={bananasRemaining} onReported={(msg, type) => pushToast(msg, type || 'success')} />
          ))
        )}
        <div ref={sentinelRef} className="scroll-sentinel" />
        {loadingMore && <div className="loading">Loading more...</div>}
      </main>
    </div>
  );
}
