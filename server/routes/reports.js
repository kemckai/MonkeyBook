const express = require('express');
const db = require('../db');
const { requireMonkey } = require('../lib/auth');

const router = express.Router();
const VALID_REASONS = ['spam', 'harassment', 'hate', 'nudity', 'violence', 'other'];

router.post('/', requireMonkey(async (req, res) => {
  const { post_id, reason, details } = req.body;
  if (!post_id || !reason) return res.status(400).json({ error: 'post_id and reason required' });
  if (!VALID_REASONS.includes(reason)) return res.status(400).json({ error: 'Invalid reason' });

  const post = await db.get('SELECT id FROM posts WHERE id = ?', post_id);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const fullReason = details ? `${reason}: ${String(details).slice(0, 500)}` : reason;

  const existing = await db.get(
    'SELECT id FROM reports WHERE post_id = ? AND reporter_id = ? AND status = ?',
    post_id, req.monkey.id, 'pending'
  );
  if (existing) return res.status(409).json({ error: 'You already reported this post' });

  const result = await db.run(
    'INSERT INTO reports (post_id, reporter_id, reason) VALUES (?, ?, ?)',
    post_id, req.monkey.id, fullReason
  );

  res.status(201).json({ id: result.lastInsertRowid, status: 'pending' });
}));

module.exports = router;
