const express = require('express');
const db = require('../db');
const { requireMonkey } = require('../lib/auth');
const { queueNotification } = require('../lib/notifications');

const router = express.Router();

function enrichFriend(row) {
  return {
    friendship_id: row.friendship_id,
    monkey_id: row.monkey_id,
    monkey_name: row.monkey_name,
    monkey_emoji: row.monkey_emoji,
    avatar_seed: row.avatar_seed,
    bio: row.bio,
    karma: row.karma,
    status: row.status,
    direction: row.direction,
  };
}

router.get('/', requireMonkey(async (req, res) => {
  const friends = await db.all(`
    SELECT f.id as friendship_id, f.status,
      CASE WHEN f.requester_id = ? THEN 'outgoing' ELSE 'incoming' END as direction,
      m.id as monkey_id, m.monkey_name, m.monkey_emoji, m.avatar_seed, m.bio, m.karma
    FROM friendships f
    JOIN monkeys m ON m.id = CASE WHEN f.requester_id = ? THEN f.addressee_id ELSE f.requester_id END
    WHERE (f.requester_id = ? OR f.addressee_id = ?) AND f.status = 'accepted'
    ORDER BY m.monkey_name
  `, req.monkey.id, req.monkey.id, req.monkey.id, req.monkey.id);

  res.json(friends.map(enrichFriend));
}));

router.get('/requests', requireMonkey(async (req, res) => {
  const incoming = await db.all(`
    SELECT f.id as friendship_id, f.status, 'incoming' as direction,
      m.id as monkey_id, m.monkey_name, m.monkey_emoji, m.avatar_seed, m.bio, m.karma
    FROM friendships f
    JOIN monkeys m ON m.id = f.requester_id
    WHERE f.addressee_id = ? AND f.status = 'pending'
    ORDER BY f.created_at DESC
  `, req.monkey.id);

  const outgoing = await db.all(`
    SELECT f.id as friendship_id, f.status, 'outgoing' as direction,
      m.id as monkey_id, m.monkey_name, m.monkey_emoji, m.avatar_seed, m.bio, m.karma
    FROM friendships f
    JOIN monkeys m ON m.id = f.addressee_id
    WHERE f.requester_id = ? AND f.status = 'pending'
    ORDER BY f.created_at DESC
  `, req.monkey.id);

  res.json({ incoming: incoming.map(enrichFriend), outgoing: outgoing.map(enrichFriend) });
}));

router.get('/status/:monkeyId', requireMonkey(async (req, res) => {
  const targetId = parseInt(req.params.monkeyId, 10);
  if (targetId === req.monkey.id) return res.json({ status: 'self' });

  const row = await db.get(`
    SELECT id, status, requester_id, addressee_id FROM friendships
    WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)
  `, req.monkey.id, targetId, targetId, req.monkey.id);

  if (!row) return res.json({ status: 'none' });
  if (row.status === 'accepted') return res.json({ status: 'friends', friendship_id: row.id });
  if (row.status === 'pending') {
    return res.json({
      status: row.requester_id === req.monkey.id ? 'pending_outgoing' : 'pending_incoming',
      friendship_id: row.id,
    });
  }
  res.json({ status: 'none' });
}));

router.post('/request/:monkeyId', requireMonkey(async (req, res) => {
  const addresseeId = parseInt(req.params.monkeyId, 10);
  if (addresseeId === req.monkey.id) return res.status(400).json({ error: 'Cannot friend yourself' });

  const target = await db.get('SELECT id FROM monkeys WHERE id = ?', addresseeId);
  if (!target) return res.status(404).json({ error: 'Monkey not found' });

  const existing = await db.get(`
    SELECT id, status, requester_id FROM friendships
    WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)
  `, req.monkey.id, addresseeId, addresseeId, req.monkey.id);

  if (existing) {
    if (existing.status === 'accepted') return res.status(409).json({ error: 'Already friends' });
    if (existing.status === 'pending') return res.status(409).json({ error: 'Request already pending' });
    await db.run('UPDATE friendships SET status = ?, requester_id = ?, addressee_id = ? WHERE id = ?',
      'pending', req.monkey.id, addresseeId, existing.id);
    return res.json({ friendship_id: existing.id, status: 'pending' });
  }

  const result = await db.run(
    'INSERT INTO friendships (requester_id, addressee_id, status) VALUES (?, ?, ?)',
    req.monkey.id, addresseeId, 'pending'
  );

  await queueNotification({
    monkeyId: addresseeId,
    type: 'friend_request',
    referenceId: result.lastInsertRowid,
    message: `${req.monkey.monkey_emoji} ${req.monkey.monkey_name} sent you a friend request`,
  });

  res.status(201).json({ friendship_id: result.lastInsertRowid, status: 'pending' });
}));

router.post('/accept/:id', requireMonkey(async (req, res) => {
  const friendship = await db.get('SELECT * FROM friendships WHERE id = ?', req.params.id);
  if (!friendship) return res.status(404).json({ error: 'Request not found' });
  if (friendship.addressee_id !== req.monkey.id) return res.status(403).json({ error: 'Not your request' });
  if (friendship.status !== 'pending') return res.status(400).json({ error: 'Request not pending' });

  await db.run('UPDATE friendships SET status = ? WHERE id = ?', 'accepted', friendship.id);

  const requester = await db.get('SELECT monkey_name, monkey_emoji FROM monkeys WHERE id = ?', friendship.requester_id);
  await queueNotification({
    monkeyId: friendship.requester_id,
    type: 'friend_accept',
    referenceId: friendship.id,
    message: `${req.monkey.monkey_emoji} ${req.monkey.monkey_name} accepted your friend request`,
  });

  res.json({ status: 'accepted' });
}));

router.post('/decline/:id', requireMonkey(async (req, res) => {
  const friendship = await db.get('SELECT * FROM friendships WHERE id = ?', req.params.id);
  if (!friendship) return res.status(404).json({ error: 'Request not found' });
  if (friendship.addressee_id !== req.monkey.id) return res.status(403).json({ error: 'Not your request' });

  await db.run('UPDATE friendships SET status = ? WHERE id = ?', 'declined', friendship.id);
  res.json({ status: 'declined' });
}));

router.delete('/:id', requireMonkey(async (req, res) => {
  const friendship = await db.get('SELECT * FROM friendships WHERE id = ?', req.params.id);
  if (!friendship) return res.status(404).json({ error: 'Friendship not found' });
  if (friendship.requester_id !== req.monkey.id && friendship.addressee_id !== req.monkey.id) {
    return res.status(403).json({ error: 'Not your friendship' });
  }
  await db.run('DELETE FROM friendships WHERE id = ?', friendship.id);
  res.json({ removed: true });
}));

module.exports = router;
