const express = require('express');
const db = require('../db');
const { maxExpr } = require('../database/sql');
const { getDisplayName } = require('../titles');
const { requireMonkey } = require('../lib/auth');
const { queueNotification } = require('../lib/notifications');
const { broadcast } = require('../ws');

const router = express.Router();
const DAILY_BANANA_LIMIT = 10;
const dialect = () => db.dialect || 'sqlite';

async function checkBananaBudget(monkey) {
  const today = new Date().toISOString().split('T')[0];
  if (monkey.banana_budget_date !== today) {
    await db.run('UPDATE monkeys SET banana_budget_date = ?, bananas_given_today = 0 WHERE id = ?', today, monkey.id);
    monkey.banana_budget_date = today;
    monkey.bananas_given_today = 0;
  }
  return monkey.bananas_given_today < DAILY_BANANA_LIMIT;
}

async function updateKarma(postOwnerId) {
  const bananas = (await db.get(`SELECT COUNT(*) as c FROM reactions r JOIN posts p ON r.post_id = p.id WHERE p.monkey_id = ? AND r.type = 'banana'`, postOwnerId)).c;
  const poops = (await db.get(`SELECT COUNT(*) as c FROM reactions r JOIN posts p ON r.post_id = p.id WHERE p.monkey_id = ? AND r.type = 'poop'`, postOwnerId)).c;
  const karma = (bananas * 2) - poops;
  await db.run('UPDATE monkeys SET karma = ? WHERE id = ?', karma, postOwnerId);
}

router.post('/:postId/:type', requireMonkey(async (req, res) => {
  const { postId, type } = req.params;
  if (!['banana', 'poop'].includes(type)) return res.status(400).json({ error: 'Invalid reaction type' });

  const post = await db.get('SELECT id, monkey_id, troop_id FROM posts WHERE id = ?', postId);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const existing = await db.get('SELECT id FROM reactions WHERE post_id = ? AND monkey_id = ? AND type = ?', postId, req.monkey.id, type);

  if (existing) {
    await db.run('DELETE FROM reactions WHERE id = ?', existing.id);
    if (type === 'banana') {
      const maxSql = maxExpr(dialect(), 'bananas_given_today - 1', '0');
      await db.run(`UPDATE monkeys SET bananas_given_today = ${maxSql} WHERE id = ?`, req.monkey.id);
    }
  } else {
    if (type === 'banana') {
      if (!(await checkBananaBudget(req.monkey))) {
        return res.status(429).json({ error: 'Daily banana limit reached (10/day)', bananas_remaining: 0 });
      }
      await db.run('UPDATE monkeys SET bananas_given_today = bananas_given_today + 1 WHERE id = ?', req.monkey.id);
    }
    await db.run('INSERT INTO reactions (post_id, monkey_id, type) VALUES (?, ?, ?)', postId, req.monkey.id, type);

    if (post.monkey_id !== req.monkey.id) {
      const emoji = type === 'banana' ? '🍌' : '💩';
      await queueNotification({
        monkeyId: post.monkey_id,
        type: 'reaction',
        referenceId: parseInt(postId, 10),
        message: `${await getDisplayName(req.monkey)} sent ${emoji} on your post`,
      });
    }
  }

  await updateKarma(post.monkey_id);

  const counts = await db.get(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'banana' THEN 1 ELSE 0 END), 0) AS bananas,
      COALESCE(SUM(CASE WHEN type = 'poop' THEN 1 ELSE 0 END), 0) AS poops
    FROM reactions WHERE post_id = ?
  `, postId);

  const updatedMonkey = await db.get('SELECT bananas_given_today FROM monkeys WHERE id = ?', req.monkey.id);
  const bananasRemaining = DAILY_BANANA_LIMIT - (updatedMonkey.bananas_given_today || 0);
  const response = { ...counts, bananas_remaining: bananasRemaining };
  broadcast('new_reaction', { post_id: Number(postId), troop_id: post.troop_id, ...response });
  res.json(response);
}));

module.exports = router;
