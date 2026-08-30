import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../context/MonkeyContext';
import { getAdminStats, getAdminReports, dismissReport, resolveReport } from '../api';

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.is_admin) {
      navigate('/feed');
      return;
    }
    Promise.all([getAdminStats(), getAdminReports()])
      .then(([s, r]) => { setStats(s); setReports(r); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, navigate]);

  async function refresh() {
    const [s, r] = await Promise.all([getAdminStats(), getAdminReports()]);
    setStats(s);
    setReports(r);
  }

  async function handleDismiss(id) {
    await dismissReport(id);
    await refresh();
  }

  async function handleResolve(id) {
    await resolveReport(id);
    await refresh();
  }

  if (loading) {
    return <div className="app"><Header /><div className="loading">Loading admin...</div></div>;
  }

  return (
    <div className="app">
      <Header />
      <main className="feed admin-page">
        <h1>Admin Dashboard</h1>
        {stats && (
          <div className="admin-stats">
            <div className="stat"><span className="stat-value">{stats.users}</span><span className="stat-label">Users</span></div>
            <div className="stat"><span className="stat-value">{stats.monkeys}</span><span className="stat-label">Monkeys</span></div>
            <div className="stat"><span className="stat-value">{stats.posts}</span><span className="stat-label">Posts</span></div>
            <div className="stat"><span className="stat-value">{stats.pending_reports}</span><span className="stat-label">Pending Reports</span></div>
          </div>
        )}

        <h2 className="section-heading">Pending Reports</h2>
        {reports.length === 0 ? (
          <p className="empty-feed">No pending reports. The jungle is peaceful... for now.</p>
        ) : (
          reports.map((r) => (
            <div key={r.id} className="report-card">
              <div className="report-meta">
                <strong>Post #{r.post_id}</strong> by {r.author_emoji} {r.author_name}
                <br />
                Reported by {r.reporter_emoji} {r.reporter_name} — {r.reason}
                <br />
                <span className="post-time">{new Date(r.created_at).toLocaleString()}</span>
              </div>
              <blockquote className="report-content">{r.post_content}</blockquote>
              <div className="friend-actions">
                <button className="btn-primary btn-sm" onClick={() => handleResolve(r.id)}>Delete Post & Resolve</button>
                <button className="btn-secondary btn-sm" onClick={() => handleDismiss(r.id)}>Dismiss</button>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
