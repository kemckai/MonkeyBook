import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import MonkeyAvatar from '../components/MonkeyAvatar';
import ToastStack from '../components/ToastStack';
import { useAuth } from '../context/MonkeyContext';
import {
  getFriends,
  getFriendRequests,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
} from '../api';

export default function Friends() {
  const { monkey } = useAuth();
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState({ incoming: [], outgoing: [] });
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);

  function pushToast(message, type = 'info') {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }

  async function load() {
    const [f, r] = await Promise.all([getFriends(), getFriendRequests()]);
    setFriends(f);
    setRequests(r);
  }

  useEffect(() => {
    load().catch(() => pushToast('Could not load friends.', 'error')).finally(() => setLoading(false));
  }, []);

  async function handleAccept(id) {
    await acceptFriendRequest(id);
    await load();
    pushToast('Friend request accepted!', 'success');
  }

  async function handleDecline(id) {
    await declineFriendRequest(id);
    await load();
  }

  async function handleRemove(id) {
    await removeFriend(id);
    await load();
    pushToast('Friend removed.', 'info');
  }

  if (loading) {
    return <div className="app"><Header /><div className="loading">Loading friends...</div></div>;
  }

  return (
    <div className="app">
      <Header />
      <main className="feed">
        <ToastStack toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
        <h2 className="section-heading">Friend Requests</h2>
        {requests.incoming.length === 0 ? (
          <p className="empty-feed">No pending requests.</p>
        ) : (
          requests.incoming.map((r) => (
            <div key={r.friendship_id} className="friend-row">
              <Link to={`/monkey/${r.monkey_id}`} className="friend-info">
                <MonkeyAvatar monkeyId={r.monkey_id} size={40} />
                <span>{r.monkey_emoji} {r.monkey_name}</span>
              </Link>
              <div className="friend-actions">
                <button className="btn-primary btn-sm" onClick={() => handleAccept(r.friendship_id)}>Accept</button>
                <button className="btn-secondary btn-sm" onClick={() => handleDecline(r.friendship_id)}>Decline</button>
              </div>
            </div>
          ))
        )}

        <h2 className="section-heading">Your Friends ({friends.length})</h2>
        {friends.length === 0 ? (
          <p className="empty-feed">No friends yet. Visit a monkey profile and send a request!</p>
        ) : (
          friends.map((f) => (
            <div key={f.friendship_id} className="friend-row">
              <Link to={`/monkey/${f.monkey_id}`} className="friend-info">
                <MonkeyAvatar monkeyId={f.monkey_id} size={40} />
                <span>{f.monkey_emoji} {f.monkey_name}</span>
              </Link>
              <button className="btn-secondary btn-sm" onClick={() => handleRemove(f.friendship_id)}>Remove</button>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
