const SQLITE_SCHEMA = `
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

  CREATE TABLE IF NOT EXISTS monkeys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE,
    session_token TEXT UNIQUE,
    monkey_name TEXT NOT NULL,
    monkey_emoji TEXT NOT NULL,
    avatar_seed INTEGER NOT NULL DEFAULT 0,
    bio TEXT DEFAULT '',
    karma INTEGER DEFAULT 0,
    streak_count INTEGER DEFAULT 0,
    streak_last_date TEXT DEFAULT '',
    banana_budget_date TEXT DEFAULT '',
    bananas_given_today INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
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

  CREATE INDEX IF NOT EXISTS idx_posts_parent ON posts(parent_id);
  CREATE INDEX IF NOT EXISTS idx_posts_troop ON posts(troop_id);
  CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_reactions_post ON reactions(post_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_monkey ON notifications(monkey_id, read);
  CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id, status);
  CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

  CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    payload TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    run_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processing_started_at DATETIME,
    last_error TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
  );

  CREATE TABLE IF NOT EXISTS media_jobs (
    id TEXT PRIMARY KEY,
    monkey_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
    temp_path TEXT,
    public_url TEXT,
    mime_type TEXT,
    last_error TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (monkey_id) REFERENCES monkeys(id)
  );

  CREATE TABLE IF NOT EXISTS app_cache (
    cache_key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    expires_at DATETIME
  );

  CREATE INDEX IF NOT EXISTS idx_jobs_pending ON jobs(status, run_at);
`;

const POSTGRES_SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    google_id TEXT UNIQUE,
    session_token TEXT UNIQUE,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    reset_token TEXT,
    reset_token_expires TIMESTAMPTZ
  );

  CREATE TABLE IF NOT EXISTS monkeys (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id),
    session_token TEXT UNIQUE,
    monkey_name TEXT NOT NULL,
    monkey_emoji TEXT NOT NULL,
    avatar_seed INTEGER NOT NULL DEFAULT 0,
    bio TEXT DEFAULT '',
    karma INTEGER DEFAULT 0,
    streak_count INTEGER DEFAULT 0,
    streak_last_date TEXT DEFAULT '',
    banana_budget_date TEXT DEFAULT '',
    bananas_given_today INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS troops (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    created_by INTEGER NOT NULL REFERENCES monkeys(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    monkey_id INTEGER NOT NULL REFERENCES monkeys(id),
    content TEXT NOT NULL,
    parent_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    troop_id INTEGER REFERENCES troops(id),
    is_anonymous BOOLEAN DEFAULT FALSE,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS reactions (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    monkey_id INTEGER NOT NULL REFERENCES monkeys(id),
    type TEXT NOT NULL CHECK(type IN ('banana', 'poop')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, monkey_id, type)
  );

  CREATE TABLE IF NOT EXISTS flings (
    id SERIAL PRIMARY KEY,
    monkey_id INTEGER NOT NULL REFERENCES monkeys(id),
    original_post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(monkey_id, original_post_id)
  );

  CREATE TABLE IF NOT EXISTS troop_members (
    troop_id INTEGER NOT NULL REFERENCES troops(id) ON DELETE CASCADE,
    monkey_id INTEGER NOT NULL REFERENCES monkeys(id),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (troop_id, monkey_id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    monkey_id INTEGER NOT NULL REFERENCES monkeys(id),
    type TEXT NOT NULL,
    reference_id INTEGER,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS friendships (
    id SERIAL PRIMARY KEY,
    requester_id INTEGER NOT NULL REFERENCES monkeys(id),
    addressee_id INTEGER NOT NULL REFERENCES monkeys(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'declined')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(requester_id, addressee_id)
  );

  CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    reporter_id INTEGER NOT NULL REFERENCES monkeys(id),
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'resolved', 'dismissed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolved_by INTEGER REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_posts_parent ON posts(parent_id);
  CREATE INDEX IF NOT EXISTS idx_posts_troop ON posts(troop_id);
  CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_reactions_post ON reactions(post_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_monkey ON notifications(monkey_id, read);
  CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id, status);
  CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
  CREATE INDEX IF NOT EXISTS idx_monkeys_user ON monkeys(user_id);

  CREATE TABLE IF NOT EXISTS jobs (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    run_at TIMESTAMPTZ DEFAULT NOW(),
    processing_started_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
  );

  CREATE TABLE IF NOT EXISTS media_jobs (
    id TEXT PRIMARY KEY,
    monkey_id INTEGER NOT NULL REFERENCES monkeys(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
    temp_path TEXT,
    public_url TEXT,
    mime_type TEXT,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
  );

  CREATE TABLE IF NOT EXISTS app_cache (
    cache_key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    expires_at TIMESTAMPTZ
  );

  CREATE INDEX IF NOT EXISTS idx_jobs_pending ON jobs(status, run_at);
`;

module.exports = { SQLITE_SCHEMA, POSTGRES_SCHEMA };
