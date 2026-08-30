const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const {
  hashPassword,
  verifyPassword,
  createMonkeyForUser,
  issueSession,
  isAdminEmail,
  getUser,
  getMonkey,
  getMonkeyForUser,
  clearAuthCookies,
  setMonkeyCookie,
  requireUser,
} = require('../lib/auth');
const { enrichMonkey } = require('../lib/monkey');
const { generateMonkeyIdentity } = require('../monkeys');
const { sendPasswordResetEmail } = require('../lib/email');
const crypto = require('crypto');

const router = express.Router();
const googleClient = process.env.GOOGLE_CLIENT_ID
  ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
  : null;

router.get('/me', async (req, res) => {
  const user = await getUser(req);
  if (!user) return res.json(null);
  const monkey = await getMonkey(req);
  res.json({
    id: user.id,
    email: user.email,
    is_admin: !!user.is_admin,
    monkey: monkey ? await enrichMonkey(monkey) : null,
  });
});

router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const existing = await db.get('SELECT id FROM users WHERE email = ?', email.toLowerCase());
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const passwordHash = await hashPassword(password);
  const isAdmin = isAdminEmail(email);
  const result = await db.run(
    'INSERT INTO users (email, password_hash, is_admin) VALUES (?, ?, ?)',
    email.toLowerCase(),
    passwordHash,
    isAdmin ? 1 : 0
  );

  const user = await db.get('SELECT id, email, is_admin FROM users WHERE id = ?', result.lastInsertRowid);
  const { monkey, token } = await createMonkeyForUser(user.id);
  await issueSession(res, user, token);

  res.status(201).json({
    id: user.id,
    email: user.email,
    is_admin: !!user.is_admin,
    monkey: await enrichMonkey(monkey),
  });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = await db.get('SELECT * FROM users WHERE email = ?', email.toLowerCase());
  if (!user || !user.password_hash) return res.status(401).json({ error: 'Invalid email or password' });

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

  let monkey = await getMonkeyForUser(user.id);
  let monkeyToken = null;
  if (!monkey) {
    const created = await createMonkeyForUser(user.id);
    monkey = created.monkey;
    monkeyToken = created.token;
  } else {
    monkeyToken = monkey.session_token;
  }

  await issueSession(res, user, monkeyToken);

  res.json({
    id: user.id,
    email: user.email,
    is_admin: !!user.is_admin,
    monkey: await enrichMonkey(monkey),
  });
});

router.post('/google', async (req, res) => {
  if (!googleClient) return res.status(503).json({ error: 'Google sign-in not configured' });

  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: 'Missing Google credential' });

  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  const email = payload.email?.toLowerCase();
  const googleId = payload.sub;
  if (!email) return res.status(400).json({ error: 'Google account has no email' });

  let user = await db.get('SELECT * FROM users WHERE google_id = ? OR email = ?', googleId, email);
  if (!user) {
    const isAdmin = isAdminEmail(email);
    const result = await db.run(
      'INSERT INTO users (email, google_id, is_admin) VALUES (?, ?, ?)',
      email,
      googleId,
      isAdmin ? 1 : 0
    );
    user = await db.get('SELECT * FROM users WHERE id = ?', result.lastInsertRowid);
  } else if (!user.google_id) {
    await db.run('UPDATE users SET google_id = ? WHERE id = ?', googleId, user.id);
  }

  let monkey = await getMonkeyForUser(user.id);
  let monkeyToken = null;
  if (!monkey) {
    const created = await createMonkeyForUser(user.id);
    monkey = created.monkey;
    monkeyToken = created.token;
  } else {
    monkeyToken = monkey.session_token;
  }

  await issueSession(res, user, monkeyToken);

  res.json({
    id: user.id,
    email: user.email,
    is_admin: !!user.is_admin,
    monkey: await enrichMonkey(monkey),
  });
});

router.post('/logout', (_req, res) => {
  clearAuthCookies(res);
  res.json({ ok: true });
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const user = await db.get('SELECT id, email FROM users WHERE email = ?', email.toLowerCase());
  if (user && user.email) {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await db.run(
      'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
      token,
      expires,
      user.id
    );
    const result = await sendPasswordResetEmail(user.email, token);
    const payload = { message: 'If that email is registered, a reset link has been sent.' };
    if (result.devUrl && process.env.NODE_ENV !== 'production') {
      payload.dev_reset_url = result.devUrl;
    }
    return res.json(payload);
  }

  res.json({ message: 'If that email is registered, a reset link has been sent.' });
});

router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and password required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const user = await db.get(
    'SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > CURRENT_TIMESTAMP',
    token
  );
  if (!user) return res.status(400).json({ error: 'Invalid or expired reset link' });

  const passwordHash = await hashPassword(password);
  await db.run(
    'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
    passwordHash,
    user.id
  );

  res.json({ message: 'Password updated. You can log in now.' });
});

router.post('/reroll-monkey', requireUser(async (req, res) => {
  const monkey = await getMonkeyForUser(req.user.id);
  if (monkey) {
    await db.run('DELETE FROM monkeys WHERE id = ?', monkey.id);
  }

  const token = uuidv4();
  const { name, emoji } = generateMonkeyIdentity();
  const avatarSeed = Math.floor(Math.random() * 2147483647);
  const result = await db.run(
    'INSERT INTO monkeys (user_id, session_token, monkey_name, monkey_emoji, avatar_seed) VALUES (?, ?, ?, ?, ?)',
    req.user.id,
    token,
    name,
    emoji,
    avatarSeed
  );
  const newMonkey = await db.get('SELECT * FROM monkeys WHERE id = ?', result.lastInsertRowid);
  setMonkeyCookie(res, token);
  res.status(201).json(await enrichMonkey(newMonkey));
}));

module.exports = router;
