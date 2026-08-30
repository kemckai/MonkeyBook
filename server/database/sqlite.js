const Database = require('better-sqlite3');
const path = require('path');
const { SQLITE_SCHEMA } = require('./schema');
const { migrate } = require('../migrate');

const dbPath = process.env.MONKEYBOOK_DB_PATH || path.join(__dirname, '..', 'monkeybook.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
const schemaSql = SQLITE_SCHEMA.replace(
  '  CREATE INDEX IF NOT EXISTS idx_monkeys_user ON monkeys(user_id);\n',
  ''
);
db.exec(schemaSql);
migrate(db);

function get(sql, ...params) {
  return Promise.resolve(db.prepare(sql).get(...params) || null);
}

function all(sql, ...params) {
  return Promise.resolve(db.prepare(sql).all(...params));
}

function run(sql, ...params) {
  return Promise.resolve(db.prepare(sql).run(...params));
}

function exec(sql) {
  return Promise.resolve(db.exec(sql));
}

module.exports = { get, all, run, exec, dialect: 'sqlite' };
