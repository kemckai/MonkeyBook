const express = require('express');
const db = require('../db');

const router = express.Router();

function getMonkey(req) {
  const token = req.cookies.monkey_token;
  if (!token) return null;
  return db.prepare('SELECT * FROM monkeys WHERE session_token = ?').get(token) || null;
}

router.get('/', (_req, res) => {
  const troops = db.prepare(`
    SELECT t.*, m.monkey_name, m.monkey_emoji,
      (SELECT COUNT(*) FROM troop_members tm WHERE tm.troop_id = t.id) AS member_count,
      (SELECT COUNT(*) FROM posts p WHERE p.troop_id = t.id) AS post_count
    FROM troops t
    JOIN monkeys m ON t.created_by = m.id
    ORDER BY post_count DESC
  `).all();
  res.json(troops);
});

router.post('/', (req, res) => {
  const monkey = getMonkey(req);
  if (!monkey) return res.status(401).json({ error: 'No identity' });

  const { name, description } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name required' });
  if (name.length > 50) return res.status(400).json({ error: 'Name too long' });

  const existing = db.prepare('SELECT id FROM troops WHERE name = ?').get(name.trim());
  if (existing) return res.status(409).json({ error: 'Troop name taken' });

  const result = db.prepare('INSERT INTO troops (name, description, created_by) VALUES (?, ?, ?)').run(
    name.trim(), (description || '').slice(0, 200), monkey.id
  );

  db.prepare('INSERT INTO troop_members (troop_id, monkey_id) VALUES (?, ?)').run(result.lastInsertRowid, monkey.id);

  const troop = db.prepare('SELECT * FROM troops WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ ...troop, member_count: 1, post_count: 0 });
});

router.post('/:id/join', (req, res) => {
  const monkey = getMonkey(req);
  if (!monkey) return res.status(401).json({ error: 'No identity' });

  const troop = db.prepare('SELECT id FROM troops WHERE id = ?').get(req.params.id);
  if (!troop) return res.status(404).json({ error: 'Troop not found' });

  const existing = db.prepare('SELECT troop_id FROM troop_members WHERE troop_id = ? AND monkey_id = ?').get(troop.id, monkey.id);
  if (existing) {
    db.prepare('DELETE FROM troop_members WHERE troop_id = ? AND monkey_id = ?').run(troop.id, monkey.id);
    return res.json({ joined: false });
  }

  db.prepare('INSERT INTO troop_members (troop_id, monkey_id) VALUES (?, ?)').run(troop.id, monkey.id);
  res.json({ joined: true });
});

router.get('/:id', (req, res) => {
  const monkey = getMonkey(req);
  const troop = db.prepare(`
    SELECT t.*, m.monkey_name, m.monkey_emoji,
      (SELECT COUNT(*) FROM troop_members tm WHERE tm.troop_id = t.id) AS member_count,
      (SELECT COUNT(*) FROM posts p WHERE p.troop_id = t.id) AS post_count
    FROM troops t
    JOIN monkeys m ON t.created_by = m.id
    WHERE t.id = ?
  `).get(req.params.id);

  if (!troop) return res.status(404).json({ error: 'Troop not found' });

  const isMember = monkey ? !!db.prepare('SELECT 1 FROM troop_members WHERE troop_id = ? AND monkey_id = ?').get(troop.id, monkey.id) : false;
  res.json({ ...troop, is_member: isMember });
});

module.exports = router;
