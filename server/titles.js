const db = require('./db');

const TITLE_THRESHOLDS = [
  { id: 'serial_pooper', label: 'Serial Pooper', check: (stats) => stats.poops_given >= 100 },
  { id: 'poop_starter', label: 'Poop Starter', check: (stats) => stats.poops_given >= 25 },
  { id: 'banana_hoarder', label: 'Banana Hoarder', check: (stats) => stats.bananas_received >= 50 },
  { id: 'banana_lover', label: 'Banana Lover', check: (stats) => stats.bananas_received >= 15 },
  { id: 'chaos_agent', label: 'Chaos Agent', check: (stats) => stats.posts_today >= 10 },
  { id: 'motor_mouth', label: 'Motor Mouth', check: (stats) => stats.total_posts >= 50 },
  { id: 'trash_talker', label: 'Trash Talker', check: (stats) => stats.total_posts >= 20 },
  { id: 'poop_magnet', label: 'Poop Magnet', check: (stats) => stats.poops_received >= 50 },
  { id: 'controversial', label: 'Controversial', check: (stats) => stats.poops_received >= 20 && stats.bananas_received >= 20 },
  { id: 'flinger', label: 'Top Flinger', check: (stats) => stats.flings_given >= 25 },
  { id: 'lurker', label: 'The Lurker', check: (stats) => stats.total_posts === 0 && stats.reactions_given >= 20 },
  { id: 'generous', label: 'Generous Ape', check: (stats) => stats.bananas_given >= 100 },
];

async function computeTitle(monkeyId) {
  const today = new Date().toISOString().split('T')[0];

  const stats = {
    poops_given: (await db.get(`SELECT COUNT(*) as c FROM reactions WHERE monkey_id = ? AND type = 'poop'`, monkeyId)).c,
    bananas_given: (await db.get(`SELECT COUNT(*) as c FROM reactions WHERE monkey_id = ? AND type = 'banana'`, monkeyId)).c,
    reactions_given: (await db.get(`SELECT COUNT(*) as c FROM reactions WHERE monkey_id = ?`, monkeyId)).c,
    bananas_received: (await db.get(`SELECT COUNT(*) as c FROM reactions r JOIN posts p ON r.post_id = p.id WHERE p.monkey_id = ? AND r.type = 'banana'`, monkeyId)).c,
    poops_received: (await db.get(`SELECT COUNT(*) as c FROM reactions r JOIN posts p ON r.post_id = p.id WHERE p.monkey_id = ? AND r.type = 'poop'`, monkeyId)).c,
    total_posts: (await db.get(`SELECT COUNT(*) as c FROM posts WHERE monkey_id = ?`, monkeyId)).c,
    posts_today: (await db.get(`SELECT COUNT(*) as c FROM posts WHERE monkey_id = ? AND DATE(created_at) = ?`, monkeyId, today)).c,
    flings_given: (await db.get(`SELECT COUNT(*) as c FROM flings WHERE monkey_id = ?`, monkeyId)).c,
  };

  for (const t of TITLE_THRESHOLDS) {
    if (t.check(stats)) return t.label;
  }
  return null;
}

function computeAgePrefix(createdAt) {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
  if (days >= 180) return 'Legendary';
  if (days >= 90) return 'Ancient';
  if (days >= 30) return 'Elder';
  return null;
}

async function isLazyMonkey(monkeyId) {
  const row = await db.get(`SELECT MAX(created_at) as last_post FROM posts WHERE monkey_id = ?`, monkeyId);
  if (!row || !row.last_post) return false;
  const raw = String(row.last_post);
  const last = Date.parse(raw.includes('T') ? raw : raw.replace(' ', 'T'));
  if (Number.isNaN(last)) return false;
  const daysSince = Math.floor((Date.now() - last) / (1000 * 60 * 60 * 24));
  return daysSince >= 3;
}

async function getDisplayName(monkey) {
  let name = monkey.monkey_name;
  const agePrefix = computeAgePrefix(monkey.created_at);
  if (agePrefix) name = `${agePrefix} ${name}`;
  if (await isLazyMonkey(monkey.id)) name = `Lazy ${name}`;
  return name;
}

module.exports = { computeTitle, computeAgePrefix, getDisplayName, isLazyMonkey };
