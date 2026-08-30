const express = require('express');
const db = require('../db');
const { getDisplayName } = require('../titles');

const router = express.Router();

let cachedMotd = null;
let cachedDate = null;

router.get('/', async (_req, res) => {
  const today = new Date().toISOString().split('T')[0];

  if (cachedDate === today && cachedMotd) {
    return res.json(cachedMotd);
  }

  const result = await db.get(`
    SELECT m.id, m.monkey_name, m.monkey_emoji, m.avatar_seed, m.created_at,
      COUNT(r.id) as poop_count
    FROM monkeys m
    JOIN posts p ON p.monkey_id = m.id
    JOIN reactions r ON r.post_id = p.id AND r.type = 'poop'
    WHERE DATE(r.created_at) = ?
    GROUP BY m.id
    ORDER BY poop_count DESC
    LIMIT 1
  `, today);

  if (!result) {
    cachedMotd = null;
    cachedDate = today;
    return res.json(null);
  }

  cachedMotd = {
    ...result,
    display_name: await getDisplayName(result),
    reason: `Received ${result.poop_count} poop${result.poop_count > 1 ? 's' : ''} today`,
  };
  cachedDate = today;

  res.json(cachedMotd);
});

module.exports = router;
