const express = require('express');
const db = require('../db');
const { generateAvatarSVG } = require('../avatars');
const { getUser, getMonkey, getMonkeyForUser, requireUser, requireMonkey } = require('../lib/auth');
const { enrichMonkey } = require('../lib/monkey');

const router = express.Router();

router.get('/me', async (req, res) => {
  const user = await getUser(req);
  if (!user) return res.json(null);

  const monkey = await getMonkey(req);
  if (!monkey) {
    const owned = await getMonkeyForUser(user.id);
    return res.json(owned ? await enrichMonkey(owned) : null);
  }
  res.json(await enrichMonkey(monkey));
});

router.post('/claim', requireUser(async (req, res) => {
  const { createMonkeyForUser, setMonkeyCookie } = require('../lib/auth');
  const existing = await getMonkeyForUser(req.user.id);
  if (existing) {
    setMonkeyCookie(res, existing.session_token);
    return res.json(await enrichMonkey(existing));
  }
  const { monkey, token } = await createMonkeyForUser(req.user.id);
  setMonkeyCookie(res, token);
  res.status(201).json(await enrichMonkey(monkey));
}));

router.put('/bio', requireMonkey(async (req, res) => {
  const { bio } = req.body;
  if (typeof bio !== 'string') return res.status(400).json({ error: 'Bio must be a string' });
  const trimmed = bio.slice(0, 100);
  await db.run('UPDATE monkeys SET bio = ? WHERE id = ?', trimmed, req.monkey.id);
  res.json({ bio: trimmed });
}));

router.get('/avatar/:id.svg', async (req, res) => {
  const monkey = await db.get('SELECT avatar_seed FROM monkeys WHERE id = ?', req.params.id);
  if (!monkey) return res.status(404).send('Not found');
  const svg = generateAvatarSVG(monkey.avatar_seed);
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(svg);
});

router.get('/profile/:id', async (req, res) => {
  const monkey = await db.get(
    'SELECT id, monkey_name, monkey_emoji, avatar_seed, bio, karma, streak_count, created_at FROM monkeys WHERE id = ?',
    req.params.id
  );
  if (!monkey) return res.status(404).json({ error: 'Monkey not found' });

  const postCount = (await db.get('SELECT COUNT(*) as c FROM posts WHERE monkey_id = ?', monkey.id)).c;
  res.json({ ...(await enrichMonkey(monkey)), post_count: postCount });
});

module.exports = router;
