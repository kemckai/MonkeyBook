const db = require('../db');

async function cacheGet(key) {
  const row = await db.get(
    'SELECT value, expires_at FROM app_cache WHERE cache_key = ?',
    key
  );
  if (!row) return null;

  if (row.expires_at && new Date(row.expires_at) <= new Date()) {
    await db.run('DELETE FROM app_cache WHERE cache_key = ?', key);
    return null;
  }

  return typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
}

async function cacheSet(key, value, expiresAt = null) {
  const valueJson = JSON.stringify(value);
  const dialect = db.dialect || 'sqlite';

  if (dialect === 'postgres') {
    await db.run(
      `INSERT INTO app_cache (cache_key, value, expires_at)
       VALUES (?, ?::jsonb, ?)
       ON CONFLICT (cache_key) DO UPDATE SET value = EXCLUDED.value, expires_at = EXCLUDED.expires_at`,
      key,
      valueJson,
      expiresAt
    );
    return;
  }

  await db.run(
    `INSERT INTO app_cache (cache_key, value, expires_at) VALUES (?, ?, ?)
     ON CONFLICT(cache_key) DO UPDATE SET value = excluded.value, expires_at = excluded.expires_at`,
    key,
    valueJson,
    expiresAt
  );
}

module.exports = { cacheGet, cacheSet };
