const express = require('express');
const db = require('../db');
const { requireMonkey, getMonkey } = require('../lib/auth');
const { broadcast } = require('../ws');

const router = express.Router();

router.get('/', async (_req, res) => {
  const troops = await db.all(`
    SELECT t.*, m.monkey_name, m.monkey_emoji,
      (SELECT COUNT(*) FROM troop_members tm WHERE tm.troop_id = t.id) AS member_count,
      (SELECT COUNT(*) FROM posts p WHERE p.troop_id = t.id) AS post_count
    FROM troops t
    JOIN monkeys m ON t.created_by = m.id
    ORDER BY post_count DESC
  `);
  res.json(troops);
});

router.post('/', requireMonkey(async (req, res) => {
  const { name, description } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name required' });
  if (name.length > 50) return res.status(400).json({ error: 'Name too long' });

  const existing = await db.get('SELECT id FROM troops WHERE name = ?', name.trim());
  if (existing) return res.status(409).json({ error: 'Troop name taken' });

  const result = await db.run(
    'INSERT INTO troops (name, description, created_by) VALUES (?, ?, ?)',
    name.trim(), (description || '').slice(0, 200), req.monkey.id
  );

  await db.run('INSERT INTO troop_members (troop_id, monkey_id) VALUES (?, ?)', result.lastInsertRowid, req.monkey.id);

  broadcast('troop_membership_changed', { monkey_id: req.monkey.id });

  const troop = await db.get('SELECT * FROM troops WHERE id = ?', result.lastInsertRowid);
  res.status(201).json({ ...troop, member_count: 1, post_count: 0 });
}));

router.post('/:id/join', requireMonkey(async (req, res) => {
  const troop = await db.get('SELECT id FROM troops WHERE id = ?', req.params.id);
  if (!troop) return res.status(404).json({ error: 'Troop not found' });

  const existing = await db.get('SELECT troop_id FROM troop_members WHERE troop_id = ? AND monkey_id = ?', troop.id, req.monkey.id);
  if (existing) {
    await db.run('DELETE FROM troop_members WHERE troop_id = ? AND monkey_id = ?', troop.id, req.monkey.id);
    broadcast('troop_membership_changed', { monkey_id: req.monkey.id });
    return res.json({ joined: false });
  }

  await db.run('INSERT INTO troop_members (troop_id, monkey_id) VALUES (?, ?)', troop.id, req.monkey.id);
  broadcast('troop_membership_changed', { monkey_id: req.monkey.id });
  res.json({ joined: true });
}));

router.get('/:id', async (req, res) => {
  const monkey = await getMonkey(req);
  const troop = await db.get(`
    SELECT t.*, m.monkey_name, m.monkey_emoji,
      (SELECT COUNT(*) FROM troop_members tm WHERE tm.troop_id = t.id) AS member_count,
      (SELECT COUNT(*) FROM posts p WHERE p.troop_id = t.id) AS post_count
    FROM troops t
    JOIN monkeys m ON t.created_by = m.id
    WHERE t.id = ?
  `, req.params.id);

  if (!troop) return res.status(404).json({ error: 'Troop not found' });

  const isMember = monkey
    ? !!(await db.get('SELECT 1 FROM troop_members WHERE troop_id = ? AND monkey_id = ?', troop.id, monkey.id))
    : false;
  res.json({ ...troop, is_member: isMember });
});

module.exports = router;
