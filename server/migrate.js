/**
 * Idempotent migrations for existing SQLite DBs created before schema updates.
 * Safe to run on every startup.
 */
function migrate(db) {
  const tableCols = (table) =>
    db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);

  const monkeysCols = tableCols('monkeys');
  const postsCols = tableCols('posts');

  const addCol = (table, def) => {
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${def}`);
    } catch (e) {
      if (!String(e.message).includes('duplicate column')) throw e;
    }
  };

  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r) => r.name);

  if (!tables.includes('users')) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        google_id TEXT UNIQUE,
        session_token TEXT UNIQUE,
        is_admin INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login_at DATETIME,
        reset_token TEXT,
        reset_token_expires DATETIME
      );
    `);
  }

  if (!tables.includes('friendships')) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS friendships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        requester_id INTEGER NOT NULL,
        addressee_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'declined')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(requester_id, addressee_id),
        FOREIGN KEY (requester_id) REFERENCES monkeys(id),
        FOREIGN KEY (addressee_id) REFERENCES monkeys(id)
      );
      CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id, status);
    `);
  }

  if (!tables.includes('reports')) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        reporter_id INTEGER NOT NULL,
        reason TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'resolved', 'dismissed')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME,
        resolved_by INTEGER,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (reporter_id) REFERENCES monkeys(id),
        FOREIGN KEY (resolved_by) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
    `);
  }

  if (!monkeysCols.includes('user_id')) addCol('monkeys', 'user_id INTEGER');
  if (!monkeysCols.includes('avatar_seed')) addCol('monkeys', 'avatar_seed INTEGER NOT NULL DEFAULT 0');
  if (!monkeysCols.includes('bio')) addCol('monkeys', "bio TEXT DEFAULT ''");
  if (!monkeysCols.includes('karma')) addCol('monkeys', 'karma INTEGER DEFAULT 0');
  if (!monkeysCols.includes('streak_count')) addCol('monkeys', 'streak_count INTEGER DEFAULT 0');
  if (!monkeysCols.includes('streak_last_date')) addCol('monkeys', "streak_last_date TEXT DEFAULT ''");
  if (!monkeysCols.includes('banana_budget_date')) addCol('monkeys', "banana_budget_date TEXT DEFAULT ''");
  if (!monkeysCols.includes('bananas_given_today')) addCol('monkeys', 'bananas_given_today INTEGER DEFAULT 0');

  try {
    db.exec('CREATE INDEX IF NOT EXISTS idx_monkeys_user ON monkeys(user_id)');
  } catch (e) {
    if (!String(e.message).includes('no such column')) throw e;
  }

  if (!postsCols.includes('parent_id')) addCol('posts', 'parent_id INTEGER DEFAULT NULL');
  if (!postsCols.includes('troop_id')) addCol('posts', 'troop_id INTEGER DEFAULT NULL');
  if (!postsCols.includes('is_anonymous')) addCol('posts', 'is_anonymous INTEGER DEFAULT 0');
  if (!postsCols.includes('image_url')) addCol('posts', "image_url TEXT DEFAULT NULL");

  const usersCols = tables.includes('users') ? tableCols('users') : [];
  if (usersCols.length && !usersCols.includes('reset_token')) addCol('users', 'reset_token TEXT');
  if (usersCols.length && !usersCols.includes('reset_token_expires')) addCol('users', 'reset_token_expires DATETIME');
}

module.exports = { migrate };
