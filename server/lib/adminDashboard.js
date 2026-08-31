const db = require('../db');
const { getQueueStats } = require('./queue');

function since7d(dialect) {
  return dialect === 'postgres'
    ? "created_at >= NOW() - INTERVAL '7 days'"
    : "created_at >= datetime('now', '-7 days')";
}

function sinceToday(dialect, column = 'created_at') {
  return dialect === 'postgres'
    ? `DATE(${column}) = CURRENT_DATE`
    : `DATE(${column}) = DATE('now')`;
}

function preview(text, max = 80) {
  if (!text) return '';
  const trimmed = text.trim();
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max)}…`;
}

async function getAdminDashboard() {
  const dialect = db.dialect || 'sqlite';
  const day7 = since7d(dialect);
  const today = sinceToday(dialect);

  const [
    users,
    monkeys,
    posts,
    topLevelPosts,
    replies,
    reactions,
    friendships,
    troops,
    pendingReports,
    notifications,
    usersToday,
    users7d,
    postsToday,
    posts7d,
    reactionsToday,
    reportsByReason,
    recentUsers,
    recentPosts,
    topPosts,
    queue,
  ] = await Promise.all([
    db.get('SELECT COUNT(*) as c FROM users'),
    db.get('SELECT COUNT(*) as c FROM monkeys'),
    db.get('SELECT COUNT(*) as c FROM posts'),
    db.get('SELECT COUNT(*) as c FROM posts WHERE parent_id IS NULL'),
    db.get('SELECT COUNT(*) as c FROM posts WHERE parent_id IS NOT NULL'),
    db.get('SELECT COUNT(*) as c FROM reactions'),
    db.get("SELECT COUNT(*) as c FROM friendships WHERE status = 'accepted'"),
    db.get('SELECT COUNT(*) as c FROM troops'),
    db.get("SELECT COUNT(*) as c FROM reports WHERE status = 'pending'"),
    db.get('SELECT COUNT(*) as c FROM notifications'),
    db.get(`SELECT COUNT(*) as c FROM users WHERE ${today}`),
    db.get(`SELECT COUNT(*) as c FROM users WHERE ${day7}`),
    db.get(`SELECT COUNT(*) as c FROM posts WHERE ${today}`),
    db.get(`SELECT COUNT(*) as c FROM posts WHERE ${day7}`),
    db.get(`SELECT COUNT(*) as c FROM reactions WHERE ${today}`),
    db.all(`
      SELECT reason, COUNT(*) as count
      FROM reports WHERE status = 'pending'
      GROUP BY reason ORDER BY count DESC
    `),
    db.all(`
      SELECT u.id, u.email, u.created_at, u.last_login_at,
        m.monkey_name, m.monkey_emoji
      FROM users u
      LEFT JOIN monkeys m ON m.user_id = u.id
      ORDER BY u.created_at DESC LIMIT 8
    `),
    db.all(`
      SELECT p.id, p.content, p.created_at, p.is_anonymous,
        m.monkey_name, m.monkey_emoji,
        (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id AND r.type = 'banana') AS bananas,
        (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id AND r.type = 'poop') AS poops
      FROM posts p
      JOIN monkeys m ON m.id = p.monkey_id
      WHERE p.parent_id IS NULL
      ORDER BY p.created_at DESC LIMIT 8
    `),
    db.all(`
      SELECT p.id, p.content, p.created_at,
        m.monkey_name, m.monkey_emoji,
        (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id AND r.type = 'banana') AS bananas,
        (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id AND r.type = 'poop') AS poops
      FROM posts p
      JOIN monkeys m ON m.id = p.monkey_id
      WHERE p.parent_id IS NULL
      ORDER BY bananas DESC, p.created_at DESC LIMIT 5
    `),
    getQueueStats(),
  ]);

  return {
    generated_at: new Date().toISOString(),
    totals: {
      users: Number(users.c) || 0,
      monkeys: Number(monkeys.c) || 0,
      posts: Number(posts.c) || 0,
      top_level_posts: Number(topLevelPosts.c) || 0,
      replies: Number(replies.c) || 0,
      reactions: Number(reactions.c) || 0,
      friendships: Number(friendships.c) || 0,
      troops: Number(troops.c) || 0,
      pending_reports: Number(pendingReports.c) || 0,
      notifications: Number(notifications.c) || 0,
    },
    activity: {
      users_today: Number(usersToday.c) || 0,
      users_7d: Number(users7d.c) || 0,
      posts_today: Number(postsToday.c) || 0,
      posts_7d: Number(posts7d.c) || 0,
      reactions_today: Number(reactionsToday.c) || 0,
    },
    queue,
    reports_by_reason: reportsByReason.map((r) => ({
      reason: r.reason,
      count: Number(r.count) || 0,
    })),
    recent_users: recentUsers.map((u) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_login_at: u.last_login_at,
      monkey_name: u.monkey_name,
      monkey_emoji: u.monkey_emoji,
    })),
    recent_posts: recentPosts.map((p) => ({
      id: p.id,
      preview: preview(p.content),
      created_at: p.created_at,
      author: p.is_anonymous ? 'Anonymous' : `${p.monkey_emoji || ''} ${p.monkey_name}`.trim(),
      bananas: Number(p.bananas) || 0,
      poops: Number(p.poops) || 0,
    })),
    top_posts: topPosts.map((p) => ({
      id: p.id,
      preview: preview(p.content),
      created_at: p.created_at,
      author: `${p.monkey_emoji || ''} ${p.monkey_name}`.trim(),
      bananas: Number(p.bananas) || 0,
      poops: Number(p.poops) || 0,
    })),
  };
}

module.exports = { getAdminDashboard };
