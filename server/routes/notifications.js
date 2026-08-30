const express = require('express');
const db = require('../db');
const { requireMonkey } = require('../lib/auth');

const router = express.Router();

router.get('/', requireMonkey(async (req, res) => {
  const notifications = await db.all(
    'SELECT * FROM notifications WHERE monkey_id = ? ORDER BY created_at DESC LIMIT 50',
    req.monkey.id
  );
  const unread = (await db.get('SELECT COUNT(*) as c FROM notifications WHERE monkey_id = ? AND read = 0', req.monkey.id)).c;
  res.json({ notifications, unread_count: unread });
}));

router.put('/:id/read', requireMonkey(async (req, res) => {
  await db.run('UPDATE notifications SET read = 1 WHERE id = ? AND monkey_id = ?', req.params.id, req.monkey.id);
  res.json({ ok: true });
}));

router.put('/read-all', requireMonkey(async (req, res) => {
  await db.run('UPDATE notifications SET read = 1 WHERE monkey_id = ?', req.monkey.id);
  res.json({ ok: true });
}));

module.exports = router;
