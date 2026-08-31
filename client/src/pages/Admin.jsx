import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../context/MonkeyContext';
import { getAdminStats, getAdminReports, dismissReport, resolveReport } from '../api';

function KpiCard({ label, value, hint, variant }) {
  return (
    <div className={`dashboard-kpi${variant ? ` dashboard-kpi--${variant}` : ''}`}>
      <span className="dashboard-kpi__value">{value}</span>
      <span className="dashboard-kpi__label">{label}</span>
      {hint && <span className="dashboard-kpi__hint">{hint}</span>}
    </div>
  );
}

function formatTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

function formatRelative(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
    setRefreshing(true);
    try {
      const [s, r] = await Promise.all([getAdminStats(), getAdminReports()]);
      setStats(s);
      setReports(r);
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
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

  const t = stats?.totals || {};
  const a = stats?.activity || {};
  const q = stats?.queue || {};

  return (
    <div className="app">
      <Header />
      <main className="feed admin-page admin-dashboard">
        <header className="admin-header">
          <div>
            <h1>Admin Dashboard</h1>
            {stats?.generated_at && (
              <p className="admin-updated">Last updated {formatTime(stats.generated_at)}</p>
            )}
          </div>
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={refresh}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </header>

        {stats && (
          <>
            <section className="dashboard-section">
              <h2 className="section-heading">Site overview</h2>
              <div className="dashboard-grid">
                <KpiCard label="Users" value={t.users} />
                <KpiCard label="Monkeys" value={t.monkeys} />
                <KpiCard label="Posts" value={t.posts} hint={`${t.top_level_posts} top-level · ${t.replies} replies`} />
                <KpiCard label="Reactions" value={t.reactions} />
                <KpiCard label="Friendships" value={t.friendships} />
                <KpiCard label="Troops" value={t.troops} />
                <KpiCard
                  label="Pending reports"
                  value={t.pending_reports}
                  variant={t.pending_reports > 0 ? 'warn' : undefined}
                />
                <KpiCard label="Notifications" value={t.notifications} />
              </div>
            </section>

            <section className="dashboard-section">
              <h2 className="section-heading">Recent activity</h2>
              <div className="dashboard-grid dashboard-grid--activity">
                <KpiCard label="New users today" value={a.users_today} hint={`${a.users_7d} in last 7 days`} variant="accent" />
                <KpiCard label="Posts today" value={a.posts_today} hint={`${a.posts_7d} in last 7 days`} variant="accent" />
                <KpiCard label="Reactions today" value={a.reactions_today} variant="accent" />
              </div>
            </section>

            <div className="dashboard-panels">
              <section className="dashboard-panel">
                <h2 className="section-heading">Job queue</h2>
                <div className="dashboard-queue">
                  <div className="dashboard-queue__item">
                    <span className="dashboard-queue__value">{q.pending ?? 0}</span>
                    <span className="dashboard-queue__label">Pending</span>
                  </div>
                  <div className="dashboard-queue__item">
                    <span className="dashboard-queue__value">{q.processing ?? 0}</span>
                    <span className="dashboard-queue__label">Processing</span>
                  </div>
                  <div className={`dashboard-queue__item${q.failed > 0 ? ' dashboard-queue__item--warn' : ''}`}>
                    <span className="dashboard-queue__value">{q.failed ?? 0}</span>
                    <span className="dashboard-queue__label">Failed</span>
                  </div>
                </div>
              </section>

              <section className="dashboard-panel">
                <h2 className="section-heading">Reports by reason</h2>
                {stats.reports_by_reason?.length > 0 ? (
                  <ul className="dashboard-reason-list">
                    {stats.reports_by_reason.map((r) => (
                      <li key={r.reason}>
                        <span className="dashboard-reason-list__reason">{r.reason}</span>
                        <span className="dashboard-reason-list__count">{r.count}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="dashboard-empty">No pending reports</p>
                )}
              </section>
            </div>

            <div className="dashboard-panels">
              <section className="dashboard-panel">
                <h2 className="section-heading">Recent signups</h2>
                {stats.recent_users?.length > 0 ? (
                  <ul className="dashboard-activity-list">
                    {stats.recent_users.map((u) => (
                      <li key={u.id} className="dashboard-activity-list__item">
                        <div className="dashboard-activity-list__main">
                          <span className="dashboard-activity-list__title">{u.email}</span>
                          {u.monkey_name && (
                            <span className="dashboard-activity-list__sub">
                              {u.monkey_emoji} {u.monkey_name}
                            </span>
                          )}
                        </div>
                        <span className="dashboard-activity-list__time" title={formatTime(u.created_at)}>
                          {formatRelative(u.created_at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="dashboard-empty">No users yet</p>
                )}
              </section>

              <section className="dashboard-panel">
                <h2 className="section-heading">Recent posts</h2>
                {stats.recent_posts?.length > 0 ? (
                  <ul className="dashboard-activity-list">
                    {stats.recent_posts.map((p) => (
                      <li key={p.id} className="dashboard-activity-list__item">
                        <div className="dashboard-activity-list__main">
                          <span className="dashboard-activity-list__title">{p.preview || '(empty)'}</span>
                          <span className="dashboard-activity-list__sub">
                            {p.author} · 🍌 {p.bananas} · 💩 {p.poops}
                          </span>
                        </div>
                        <span className="dashboard-activity-list__time" title={formatTime(p.created_at)}>
                          {formatRelative(p.created_at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="dashboard-empty">No posts yet</p>
                )}
              </section>
            </div>

            {stats.top_posts?.length > 0 && (
              <section className="dashboard-section">
                <h2 className="section-heading">Top posts by bananas</h2>
                <ul className="dashboard-top-posts">
                  {stats.top_posts.map((p, i) => (
                    <li key={p.id} className="dashboard-top-posts__item">
                      <span className="dashboard-top-posts__rank">#{i + 1}</span>
                      <div className="dashboard-top-posts__body">
                        <span className="dashboard-top-posts__preview">{p.preview || '(empty)'}</span>
                        <span className="dashboard-top-posts__meta">
                          {p.author} · 🍌 {p.bananas} · 💩 {p.poops}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        <section className="dashboard-section dashboard-section--reports">
          <h2 className="section-heading">
            Pending reports
            {reports.length > 0 && <span className="dashboard-badge">{reports.length}</span>}
          </h2>
          {reports.length === 0 ? (
            <p className="dashboard-empty">No pending reports. The jungle is peaceful… for now.</p>
          ) : (
            reports.map((r) => (
              <div key={r.id} className="report-card">
                <div className="report-meta">
                  <strong>Post #{r.post_id}</strong> by {r.author_emoji} {r.author_name}
                  <br />
                  Reported by {r.reporter_emoji} {r.reporter_name} — {r.reason}
                  <br />
                  <span className="post-time">{formatTime(r.created_at)}</span>
                </div>
                <blockquote className="report-content">{r.post_content}</blockquote>
                <div className="friend-actions">
                  <button type="button" className="btn-primary btn-sm" onClick={() => handleResolve(r.id)}>
                    Delete Post & Resolve
                  </button>
                  <button type="button" className="btn-secondary btn-sm" onClick={() => handleDismiss(r.id)}>
                    Dismiss
                  </button>
                </div>
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
