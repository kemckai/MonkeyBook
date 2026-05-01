import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useMonkey } from '../context/MonkeyContext';
import { getTroops, createTroop } from '../api';

export default function Troops() {
  const { monkey, loading: identityLoading } = useMonkey();
  const navigate = useNavigate();
  const [troops, setTroops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  useEffect(() => {
    if (!identityLoading && !monkey) navigate('/');
  }, [monkey, identityLoading, navigate]);

  useEffect(() => {
    if (monkey) {
      getTroops().then(setTroops).catch(console.error).finally(() => setLoading(false));
    }
  }, [monkey]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    const troop = await createTroop(name, desc);
    setTroops(prev => [troop, ...prev]);
    setShowCreate(false);
    setName('');
    setDesc('');
  }

  if (identityLoading || loading) {
    return <div className="app"><Header /><div className="loading">Loading troops...</div></div>;
  }

  return (
    <div className="app">
      <Header />
      <main className="feed">
        <div className="troops-header">
          <h2>Monkey Troops</h2>
          <button className="create-troop-btn" onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? 'Cancel' : '+ New Troop'}
          </button>
        </div>
        {showCreate && (
          <form className="composer" onSubmit={handleCreate}>
            <input className="troop-input" value={name} onChange={e => setName(e.target.value.slice(0, 50))} placeholder="Troop name..." />
            <input className="troop-input" value={desc} onChange={e => setDesc(e.target.value.slice(0, 200))} placeholder="Description (optional)" />
            <button type="submit" className="troop-submit">Create Troop</button>
          </form>
        )}
        {troops.length === 0 ? (
          <div className="empty-feed"><p>No troops yet. Start one.</p></div>
        ) : (
          <div className="troop-list">
            {troops.map(troop => (
              <Link to={`/troop/${troop.id}`} key={troop.id} className="troop-card">
                <h3 className="troop-name">{troop.name}</h3>
                {troop.description && <p className="troop-desc">{troop.description}</p>}
                <div className="troop-meta">
                  <span>{troop.member_count} members</span>
                  <span>{troop.post_count} posts</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
