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

  if (!monkeysCols.includes('avatar_seed')) addCol('monkeys', 'avatar_seed INTEGER NOT NULL DEFAULT 0');
  if (!monkeysCols.includes('bio')) addCol('monkeys', "bio TEXT DEFAULT ''");
  if (!monkeysCols.includes('karma')) addCol('monkeys', 'karma INTEGER DEFAULT 0');
  if (!monkeysCols.includes('streak_count')) addCol('monkeys', 'streak_count INTEGER DEFAULT 0');
  if (!monkeysCols.includes('streak_last_date')) addCol('monkeys', "streak_last_date TEXT DEFAULT ''");
  if (!monkeysCols.includes('banana_budget_date')) addCol('monkeys', "banana_budget_date TEXT DEFAULT ''");
  if (!monkeysCols.includes('bananas_given_today')) addCol('monkeys', 'bananas_given_today INTEGER DEFAULT 0');

  if (!postsCols.includes('parent_id')) addCol('posts', 'parent_id INTEGER DEFAULT NULL');
  if (!postsCols.includes('troop_id')) addCol('posts', 'troop_id INTEGER DEFAULT NULL');
  if (!postsCols.includes('is_anonymous')) addCol('posts', 'is_anonymous INTEGER DEFAULT 0');
  if (!postsCols.includes('image_url')) addCol('posts', "image_url TEXT DEFAULT NULL");
}

module.exports = { migrate };
