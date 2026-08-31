const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../lib/auth');
const { getAdminDashboard } = require('../lib/adminDashboard');
const { broadcast } = require('../ws');

const router = express.Router();

router.get('/reports', requireAdmin(async (_req, res) => {
  const reports = await db.all(`
    SELECT r.*, p.content as post_content, p.monkey_id as post_author_id,
      rep.monkey_name as reporter_name, rep.monkey_emoji as reporter_emoji,
      auth.monkey_name as author_name, auth.monkey_emoji as author_emoji
    FROM reports r
    JOIN posts p ON p.id = r.post_id
    JOIN monkeys rep ON rep.id = r.reporter_id
    JOIN monkeys auth ON auth.id = p.monkey_id
    WHERE r.status = 'pending'
    ORDER BY r.created_at ASC
    LIMIT 100
  `);
  res.json(reports);
}));

router.get('/stats', requireAdmin(async (_req, res) => {
  const dashboard = await getAdminDashboard();
  res.json(dashboard);
}));

router.post('/reports/:id/dismiss', requireAdmin(async (req, res) => {
  const report = await db.get('SELECT id FROM reports WHERE id = ?', req.params.id);
  if (!report) return res.status(404).json({ error: 'Report not found' });

  await db.run(
    'UPDATE reports SET status = ?, resolved_at = CURRENT_TIMESTAMP, resolved_by = ? WHERE id = ?',
    'dismissed', req.user.id, req.params.id
  );
  res.json({ status: 'dismissed' });
}));

router.post('/reports/:id/resolve', requireAdmin(async (req, res) => {
  const report = await db.get('SELECT * FROM reports WHERE id = ?', req.params.id);
  if (!report) return res.status(404).json({ error: 'Report not found' });

  const post = await db.get('SELECT troop_id FROM posts WHERE id = ?', report.post_id);
  await db.run('DELETE FROM posts WHERE id = ?', report.post_id);
  broadcast('post_deleted', { id: report.post_id, troop_id: post?.troop_id ?? null });

  await db.run(
    'UPDATE reports SET status = ?, resolved_at = CURRENT_TIMESTAMP, resolved_by = ? WHERE post_id = ? AND status = ?',
    'resolved', req.user.id, report.post_id, 'pending'
  );
  res.json({ status: 'resolved', post_deleted: true });
}));

router.delete('/posts/:id', requireAdmin(async (req, res) => {
  const post = await db.get('SELECT id, troop_id FROM posts WHERE id = ?', req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  await db.run('DELETE FROM posts WHERE id = ?', req.params.id);
  broadcast('post_deleted', { id: Number(req.params.id), troop_id: post.troop_id });
  res.json({ deleted: true });
}));

module.exports = router;
