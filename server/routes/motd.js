const express = require('express');
const db = require('../db');
const { getDisplayName } = require('../titles');
const { cacheGet, cacheSet } = require('../lib/cache');
const { toInt } = require('../database/sql');

const router = express.Router();

router.get('/', async (_req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const cacheKey = `motd:${today}`;

  const cached = await cacheGet(cacheKey);
  if (cached !== null) {
    return res.json(cached);
  }

  const result = await db.get(`
    SELECT m.id, m.monkey_name, m.monkey_emoji, m.avatar_seed, m.created_at,
      COUNT(r.id) as poop_count
    FROM monkeys m
    JOIN posts p ON p.monkey_id = m.id
    JOIN reactions r ON r.post_id = p.id AND r.type = 'poop'
    WHERE DATE(r.created_at) = ?
    GROUP BY m.id, m.monkey_name, m.monkey_emoji, m.avatar_seed, m.created_at
    ORDER BY poop_count DESC
    LIMIT 1
  `, today);

  if (!result) {
    await cacheSet(cacheKey, null, `${today}T23:59:59.999Z`);
    return res.json(null);
  }

  const motd = {
    ...result,
    poop_count: toInt(result.poop_count),
    display_name: await getDisplayName(result),
    reason: `Received ${toInt(result.poop_count)} poop${toInt(result.poop_count) > 1 ? 's' : ''} today`,
  };

  await cacheSet(cacheKey, motd, `${today}T23:59:59.999Z`);
  res.json(motd);
});

module.exports = router;
