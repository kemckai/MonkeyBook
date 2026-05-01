const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.MONKEYBOOK_DB_PATH || path.join(__dirname, 'monkeybook.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS monkeys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_token TEXT UNIQUE NOT NULL,
    monkey_name TEXT NOT NULL,
    monkey_emoji TEXT NOT NULL,
    avatar_seed INTEGER NOT NULL DEFAULT 0,
    bio TEXT DEFAULT '',
    karma INTEGER DEFAULT 0,
    streak_count INTEGER DEFAULT 0,
    streak_last_date TEXT DEFAULT '',
    banana_budget_date TEXT DEFAULT '',
    bananas_given_today INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    monkey_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    parent_id INTEGER DEFAULT NULL,
    troop_id INTEGER DEFAULT NULL,
    is_anonymous INTEGER DEFAULT 0,
    image_url TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (monkey_id) REFERENCES monkeys(id),
    FOREIGN KEY (parent_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (troop_id) REFERENCES troops(id)
  );

  CREATE TABLE IF NOT EXISTS reactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    monkey_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('banana', 'poop')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, monkey_id, type),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (monkey_id) REFERENCES monkeys(id)
  );

  CREATE TABLE IF NOT EXISTS flings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    monkey_id INTEGER NOT NULL,
    original_post_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(monkey_id, original_post_id),
    FOREIGN KEY (monkey_id) REFERENCES monkeys(id),
    FOREIGN KEY (original_post_id) REFERENCES posts(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS troops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES monkeys(id)
  );

  CREATE TABLE IF NOT EXISTS troop_members (
    troop_id INTEGER NOT NULL,
    monkey_id INTEGER NOT NULL,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (troop_id, monkey_id),
    FOREIGN KEY (troop_id) REFERENCES troops(id) ON DELETE CASCADE,
    FOREIGN KEY (monkey_id) REFERENCES monkeys(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    monkey_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    reference_id INTEGER,
    message TEXT NOT NULL,
    read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (monkey_id) REFERENCES monkeys(id)
  );

  CREATE INDEX IF NOT EXISTS idx_posts_parent ON posts(parent_id);
  CREATE INDEX IF NOT EXISTS idx_posts_troop ON posts(troop_id);
  CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_reactions_post ON reactions(post_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_monkey ON notifications(monkey_id, read);
`);

const { migrate } = require('./migrate');
migrate(db);

module.exports = db;
