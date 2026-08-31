const { Pool } = require('pg');
const { POSTGRES_SCHEMA } = require('./schema');
const { toPg } = require('./sql');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
});

let initialized = false;

async function ensureSchema() {
  if (initialized) return;
  await pool.query(POSTGRES_SCHEMA);
  initialized = true;
}

async function get(sql, ...params) {
  await ensureSchema();
  const res = await pool.query(toPg(sql), params);
  return res.rows[0] || null;
}

async function all(sql, ...params) {
  await ensureSchema();
  const res = await pool.query(toPg(sql), params);
  return res.rows;
}

const INSERT_TABLE_RE = /^\s*INSERT\s+INTO\s+([a-z_]+)/i;
/** Tables with no serial `id` column — must not use RETURNING id */
const INSERT_WITHOUT_ID = new Set(['app_cache', 'troop_members']);

async function run(sql, ...params) {
  await ensureSchema();
  let q = toPg(sql);
  const trimmed = sql.trim();
  const tableMatch = INSERT_TABLE_RE.exec(trimmed);
  const table = tableMatch ? tableMatch[1].toLowerCase() : null;
  const isInsert = /^\s*INSERT/i.test(trimmed);
  if (isInsert && !/RETURNING/i.test(q) && table && !INSERT_WITHOUT_ID.has(table)) {
    q = `${q.replace(/;?\s*$/, '')} RETURNING id`;
  }
  const res = await pool.query(q, params);
  return {
    lastInsertRowid: res.rows[0]?.id,
    changes: res.rowCount,
  };
}

async function exec(sql) {
  await ensureSchema();
  await pool.query(sql);
}

module.exports = { get, all, run, exec, dialect: 'postgres', pool };
