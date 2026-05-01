const express = require('express');
const db = require('../db');

const router = express.Router();

function getMonkeyId(req) {
  const token = req.cookies.monkey_token;
  if (!token) return null;
  const monkey = db.prepare('SELECT id FROM monkeys WHERE session_token = ?').get(token);
  return monkey ? monkey.id : null;
}

router.get('/', (req, res) => {
  const monkeyId = getMonkeyId(req);
  if (!monkeyId) return res.status(401).json({ error: 'No identity' });

  const notifications = db.prepare(`
    SELECT * FROM notifications
    WHERE monkey_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).all(monkeyId);

  const unreadCount = db.prepare('SELECT COUNT(*) as c FROM notifications WHERE monkey_id = ? AND read = 0').get(monkeyId).c;

  res.json({ notifications, unread_count: unreadCount });
});

router.put('/:id/read', (req, res) => {
  const monkeyId = getMonkeyId(req);
  if (!monkeyId) return res.status(401).json({ error: 'No identity' });

  db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND monkey_id = ?').run(req.params.id, monkeyId);
  res.json({ ok: true });
});

router.put('/read-all', (req, res) => {
  const monkeyId = getMonkeyId(req);
  if (!monkeyId) return res.status(401).json({ error: 'No identity' });

  db.prepare('UPDATE notifications SET read = 1 WHERE monkey_id = ?').run(monkeyId);
  res.json({ ok: true });
});

module.exports = router;
