const db = require('../db');
const { USER_COOKIE, MONKEY_COOKIE } = require('./auth');

function parseCookieHeader(header) {
  const cookies = {};
  if (!header) return cookies;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const name = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    cookies[name] = decodeURIComponent(value);
  }
  return cookies;
}

async function authenticateWebSocket(request) {
  const cookies = parseCookieHeader(request.headers.cookie);
  const userToken = cookies[USER_COOKIE];
  if (!userToken) return null;

  const user = await db.get(
    'SELECT id, email, is_admin FROM users WHERE session_token = ?',
    userToken
  );
  if (!user) return null;

  let monkey = null;
  const monkeyToken = cookies[MONKEY_COOKIE];
  if (monkeyToken) {
    monkey = await db.get('SELECT * FROM monkeys WHERE session_token = ?', monkeyToken);
    if (monkey && monkey.user_id !== user.id) monkey = null;
  }
  if (!monkey) {
    monkey = await db.get('SELECT * FROM monkeys WHERE user_id = ?', user.id);
  }

  const troopIds = new Set();
  if (monkey) {
    const rows = await db.all('SELECT troop_id FROM troop_members WHERE monkey_id = ?', monkey.id);
    for (const row of rows) troopIds.add(Number(row.troop_id));
  }

  return {
    userId: user.id,
    monkeyId: monkey?.id ?? null,
    troopIds,
  };
}

module.exports = { parseCookieHeader, authenticateWebSocket };
