const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { generateMonkeyIdentity } = require('../monkeys');
const { generateAvatarSVG } = require('../avatars');
const { computeTitle, getDisplayName } = require('../titles');

const router = express.Router();

function setTokenCookie(res, token) {
  res.cookie('monkey_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 365
  });
}

function enrichMonkey(monkey) {
  if (!monkey) return null;
  return {
    ...monkey,
    display_name: getDisplayName(monkey),
    title: computeTitle(monkey.id),
  };
}

router.get('/me', (req, res) => {
  const token = req.cookies.monkey_token;
  if (!token) return res.json(null);

  const monkey = db.prepare('SELECT id, monkey_name, monkey_emoji, avatar_seed, bio, karma, streak_count, created_at FROM monkeys WHERE session_token = ?').get(token);
  res.json(enrichMonkey(monkey));
});

router.post('/claim', (req, res) => {
  const existingToken = req.cookies.monkey_token;
  if (existingToken) {
    const existing = db.prepare('SELECT id, monkey_name, monkey_emoji, avatar_seed, bio, karma, streak_count, created_at FROM monkeys WHERE session_token = ?').get(existingToken);
    if (existing) return res.json(enrichMonkey(existing));
  }

  const token = uuidv4();
  const { name, emoji } = generateMonkeyIdentity();
  const avatarSeed = Math.floor(Math.random() * 2147483647);

  const result = db.prepare('INSERT INTO monkeys (session_token, monkey_name, monkey_emoji, avatar_seed) VALUES (?, ?, ?, ?)').run(token, name, emoji, avatarSeed);
  setTokenCookie(res, token);

  const monkey = db.prepare('SELECT id, monkey_name, monkey_emoji, avatar_seed, bio, karma, streak_count, created_at FROM monkeys WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(enrichMonkey(monkey));
});

router.post('/reroll', (req, res) => {
  const oldToken = req.cookies.monkey_token;
  if (oldToken) {
    db.prepare('DELETE FROM monkeys WHERE session_token = ?').run(oldToken);
  }

  const token = uuidv4();
  const { name, emoji } = generateMonkeyIdentity();
  const avatarSeed = Math.floor(Math.random() * 2147483647);

  const result = db.prepare('INSERT INTO monkeys (session_token, monkey_name, monkey_emoji, avatar_seed) VALUES (?, ?, ?, ?)').run(token, name, emoji, avatarSeed);
  setTokenCookie(res, token);

  const monkey = db.prepare('SELECT id, monkey_name, monkey_emoji, avatar_seed, bio, karma, streak_count, created_at FROM monkeys WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(enrichMonkey(monkey));
});

router.put('/bio', (req, res) => {
  const token = req.cookies.monkey_token;
  if (!token) return res.status(401).json({ error: 'No identity' });

  const monkey = db.prepare('SELECT id FROM monkeys WHERE session_token = ?').get(token);
  if (!monkey) return res.status(401).json({ error: 'No identity' });

  const { bio } = req.body;
  if (typeof bio !== 'string') return res.status(400).json({ error: 'Bio must be a string' });
  const trimmed = bio.slice(0, 100);

  db.prepare('UPDATE monkeys SET bio = ? WHERE id = ?').run(trimmed, monkey.id);
  res.json({ bio: trimmed });
});

router.get('/avatar/:id.svg', (req, res) => {
  const monkey = db.prepare('SELECT avatar_seed FROM monkeys WHERE id = ?').get(req.params.id);
  if (!monkey) return res.status(404).send('Not found');

  const svg = generateAvatarSVG(monkey.avatar_seed);
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(svg);
});

router.get('/profile/:id', (req, res) => {
  const monkey = db.prepare('SELECT id, monkey_name, monkey_emoji, avatar_seed, bio, karma, streak_count, created_at FROM monkeys WHERE id = ?').get(req.params.id);
  if (!monkey) return res.status(404).json({ error: 'Monkey not found' });

  const postCount = db.prepare('SELECT COUNT(*) as c FROM posts WHERE monkey_id = ?').get(monkey.id).c;
  const enriched = enrichMonkey(monkey);

  res.json({ ...enriched, post_count: postCount });
});

module.exports = router;
