const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { generateMonkeyIdentity } = require('../monkeys');

const USER_COOKIE = 'user_token';
const MONKEY_COOKIE = 'monkey_token';
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 1000 * 60 * 60 * 24 * 365,
};

function setUserCookie(res, token) {
  res.cookie(USER_COOKIE, token, COOKIE_OPTS);
}

function setMonkeyCookie(res, token) {
  res.cookie(MONKEY_COOKIE, token, COOKIE_OPTS);
}

function clearAuthCookies(res) {
  res.clearCookie(USER_COOKIE, { httpOnly: true, sameSite: 'lax' });
  res.clearCookie(MONKEY_COOKIE, { httpOnly: true, sameSite: 'lax' });
}

async function getUser(req) {
  const token = req.cookies[USER_COOKIE];
  if (!token) return null;
  return db.get(
    'SELECT id, email, is_admin, created_at, last_login_at FROM users WHERE session_token = ?',
    token
  );
}

async function getMonkey(req) {
  const token = req.cookies[MONKEY_COOKIE];
  if (!token) return null;
  return db.get('SELECT * FROM monkeys WHERE session_token = ?', token);
}

async function getMonkeyForUser(userId) {
  return db.get('SELECT * FROM monkeys WHERE user_id = ?', userId);
}

async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

async function createMonkeyForUser(userId) {
  const token = uuidv4();
  const { name, emoji } = generateMonkeyIdentity();
  const avatarSeed = Math.floor(Math.random() * 2147483647);
  const result = await db.run(
    'INSERT INTO monkeys (user_id, session_token, monkey_name, monkey_emoji, avatar_seed) VALUES (?, ?, ?, ?, ?)',
    userId,
    token,
    name,
    emoji,
    avatarSeed
  );
  const monkey = await db.get('SELECT * FROM monkeys WHERE id = ?', result.lastInsertRowid);
  return { monkey, token };
}

async function issueSession(res, user, monkeyToken) {
  const sessionToken = uuidv4();
  await db.run('UPDATE users SET session_token = ?, last_login_at = CURRENT_TIMESTAMP WHERE id = ?', sessionToken, user.id);
  setUserCookie(res, sessionToken);
  if (monkeyToken) setMonkeyCookie(res, monkeyToken);
  return sessionToken;
}

function isAdminEmail(email) {
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
}

function requireUser(handler) {
  return async (req, res, next) => {
    try {
      const user = await getUser(req);
      if (!user) return res.status(401).json({ error: 'Login required' });
      req.user = user;
      return handler(req, res, next);
    } catch (err) {
      next(err);
    }
  };
}

function requireMonkey(handler) {
  return async (req, res, next) => {
    try {
      const user = await getUser(req);
      if (!user) return res.status(401).json({ error: 'Login required' });
      const monkey = await getMonkey(req);
      if (!monkey) return res.status(401).json({ error: 'No monkey identity' });
      if (monkey.user_id && monkey.user_id !== user.id) {
        return res.status(403).json({ error: 'Session mismatch' });
      }
      req.user = user;
      req.monkey = monkey;
      return handler(req, res, next);
    } catch (err) {
      next(err);
    }
  };
}

function requireAdmin(handler) {
  return async (req, res, next) => {
    try {
      const user = await getUser(req);
      if (!user || !user.is_admin) return res.status(403).json({ error: 'Admin only' });
      req.user = user;
      return handler(req, res, next);
    } catch (err) {
      next(err);
    }
  };
}

module.exports = {
  USER_COOKIE,
  MONKEY_COOKIE,
  setUserCookie,
  setMonkeyCookie,
  clearAuthCookies,
  getUser,
  getMonkey,
  getMonkeyForUser,
  hashPassword,
  verifyPassword,
  createMonkeyForUser,
  issueSession,
  isAdminEmail,
  requireUser,
  requireMonkey,
  requireAdmin,
};
