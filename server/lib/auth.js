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
  const opts = { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' };
  res.clearCookie(USER_COOKIE, opts);
  res.clearCookie(MONKEY_COOKIE, opts);
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
  if (monkeyToken) {
    setMonkeyCookie(res, monkeyToken);
  } else {
    const opts = { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' };
    res.clearCookie(MONKEY_COOKIE, opts);
  }
  return sessionToken;
}

async function invalidateUserSession(userId) {
  await db.run('UPDATE users SET session_token = NULL WHERE id = ?', userId);
}

async function resolveMonkey(req, res) {
  const user = await getUser(req);
  if (!user) return { status: 401, error: 'Login required' };
  let monkey = await getMonkey(req);
  if (!monkey) {
    monkey = await getMonkeyForUser(user.id);
    if (monkey) setMonkeyCookie(res, monkey.session_token);
  }
  if (!monkey) return { status: 401, error: 'No monkey identity' };
  if (monkey.user_id && monkey.user_id !== user.id) {
    return { status: 403, error: 'Session mismatch' };
  }
  return { user, monkey };
}

function requireMonkeyMiddleware(req, res, next) {
  resolveMonkey(req, res)
    .then((result) => {
      if (result.status) return res.status(result.status).json({ error: result.error });
      req.user = result.user;
      req.monkey = result.monkey;
      next();
    })
    .catch(next);
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
      const result = await resolveMonkey(req, res);
      if (result.status) return res.status(result.status).json({ error: result.error });
      req.user = result.user;
      req.monkey = result.monkey;
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
  invalidateUserSession,
  isAdminEmail,
  requireUser,
  requireMonkey,
  requireMonkeyMiddleware,
  requireAdmin,
};
