const express = require('express');
const db = require('../db');
const { isFalse } = require('../database/sql');
const { requireMonkey } = require('../lib/auth');

const router = express.Router();

router.get('/', requireMonkey(async (req, res) => {
  const dialect = db.dialect || 'sqlite';
  const notifications = await db.all(
    'SELECT * FROM notifications WHERE monkey_id = ? ORDER BY created_at DESC LIMIT 50',
    req.monkey.id
  );
  const unread = (await db.get(
    `SELECT COUNT(*) as c FROM notifications WHERE monkey_id = ? AND ${isFalse(dialect, 'read')}`,
    req.monkey.id
  )).c;
  res.json({ notifications, unread_count: Number(unread) || 0 });
}));

router.put('/read-all', requireMonkey(async (req, res) => {
  const dialect = db.dialect || 'sqlite';
  const readValue = dialect === 'postgres' ? true : 1;
  await db.run('UPDATE notifications SET read = ? WHERE monkey_id = ?', readValue, req.monkey.id);
  res.json({ ok: true });
}));

router.put('/:id/read', requireMonkey(async (req, res) => {
  const dialect = db.dialect || 'sqlite';
  const readValue = dialect === 'postgres' ? true : 1;
  await db.run(
    'UPDATE notifications SET read = ? WHERE id = ? AND monkey_id = ?',
    readValue,
    req.params.id,
    req.monkey.id
  );
  res.json({ ok: true });
}));

module.exports = router;
