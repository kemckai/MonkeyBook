const express = require('express');
const db = require('../db');
const { getDisplayName } = require('../titles');
const { broadcast } = require('../ws');

const router = express.Router();
const DAILY_BANANA_LIMIT = 10;

function getMonkey(req) {
  const token = req.cookies.monkey_token;
  if (!token) return null;
  return db.prepare('SELECT * FROM monkeys WHERE session_token = ?').get(token) || null;
}

function checkBananaBudget(monkey) {
  const today = new Date().toISOString().split('T')[0];
  if (monkey.banana_budget_date !== today) {
    db.prepare('UPDATE monkeys SET banana_budget_date = ?, bananas_given_today = 0 WHERE id = ?').run(today, monkey.id);
    monkey.banana_budget_date = today;
    monkey.bananas_given_today = 0;
  }
  return monkey.bananas_given_today < DAILY_BANANA_LIMIT;
}

function updateKarma(postOwnerId) {
  const bananas = db.prepare(`SELECT COUNT(*) as c FROM reactions r JOIN posts p ON r.post_id = p.id WHERE p.monkey_id = ? AND r.type = 'banana'`).get(postOwnerId).c;
  const poops = db.prepare(`SELECT COUNT(*) as c FROM reactions r JOIN posts p ON r.post_id = p.id WHERE p.monkey_id = ? AND r.type = 'poop'`).get(postOwnerId).c;
  const karma = (bananas * 2) - poops;
  db.prepare('UPDATE monkeys SET karma = ? WHERE id = ?').run(karma, postOwnerId);
}

router.post('/:postId/:type', (req, res) => {
  const monkey = getMonkey(req);
  if (!monkey) return res.status(401).json({ error: 'No monkey identity' });

  const { postId, type } = req.params;
  if (!['banana', 'poop'].includes(type)) return res.status(400).json({ error: 'Invalid reaction type' });

  const post = db.prepare('SELECT id, monkey_id FROM posts WHERE id = ?').get(postId);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const existing = db.prepare('SELECT id FROM reactions WHERE post_id = ? AND monkey_id = ? AND type = ?').get(postId, monkey.id, type);

  if (existing) {
    db.prepare('DELETE FROM reactions WHERE id = ?').run(existing.id);
    if (type === 'banana') {
      db.prepare('UPDATE monkeys SET bananas_given_today = MAX(0, bananas_given_today - 1) WHERE id = ?').run(monkey.id);
    }
  } else {
    if (type === 'banana') {
      if (!checkBananaBudget(monkey)) {
        return res.status(429).json({ error: 'Daily banana limit reached (10/day)', bananas_remaining: 0 });
      }
      db.prepare('UPDATE monkeys SET bananas_given_today = bananas_given_today + 1 WHERE id = ?').run(monkey.id);
    }
    db.prepare('INSERT INTO reactions (post_id, monkey_id, type) VALUES (?, ?, ?)').run(postId, monkey.id, type);

    if (post.monkey_id !== monkey.id) {
      const emoji = type === 'banana' ? '🍌' : '💩';
      db.prepare('INSERT INTO notifications (monkey_id, type, reference_id, message) VALUES (?, ?, ?, ?)').run(
        post.monkey_id, 'reaction', parseInt(postId), `${getDisplayName(monkey)} sent ${emoji} on your post`
      );
      broadcast('new_notification', { monkey_id: post.monkey_id });
    }
  }

  updateKarma(post.monkey_id);

  const counts = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'banana' THEN 1 ELSE 0 END), 0) AS bananas,
      COALESCE(SUM(CASE WHEN type = 'poop' THEN 1 ELSE 0 END), 0) AS poops
    FROM reactions WHERE post_id = ?
  `).get(postId);

  const updatedMonkey = db.prepare('SELECT bananas_given_today FROM monkeys WHERE id = ?').get(monkey.id);
  const bananasRemaining = DAILY_BANANA_LIMIT - (updatedMonkey.bananas_given_today || 0);
  const response = { ...counts, bananas_remaining: bananasRemaining };
  broadcast('new_reaction', { post_id: Number(postId), ...response });
  res.json(response);
});

module.exports = router;
