const express = require('express');
const db = require('../db');
const { getDisplayName } = require('../titles');
const { nowMinus1Day, isFalse } = require('../database/sql');
const { postSelectSql, trendingScoreSql } = require('../lib/postQueries');
const { requireMonkey, getMonkey } = require('../lib/auth');
const { broadcast } = require('../ws');

const router = express.Router();

async function updateStreak(monkey) {
  const today = new Date().toISOString().split('T')[0];
  if (monkey.streak_last_date === today) return;

  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const newStreak = monkey.streak_last_date === yesterday ? monkey.streak_count + 1 : 1;
  await db.run('UPDATE monkeys SET streak_count = ?, streak_last_date = ? WHERE id = ?', newStreak, today, monkey.id);
}

async function enrichPost(post, currentMonkeyId) {
  const displayName = post.is_anonymous
    ? '???'
    : await getDisplayName({
        id: post.monkey_id,
        monkey_name: post.monkey_name,
        created_at: post.monkey_created_at,
      });
  return {
    id: post.id,
    content: post.content,
    created_at: post.created_at,
    monkey_id: post.is_anonymous ? null : post.monkey_id,
    monkey_name: displayName,
    monkey_emoji: post.is_anonymous ? '🙈' : post.monkey_emoji,
    avatar_seed: post.is_anonymous ? 0 : post.avatar_seed,
    bananas: post.bananas || 0,
    poops: post.poops || 0,
    reply_count: post.reply_count || 0,
    fling_count: post.fling_count || 0,
    last_fling_name: post.last_fling_name || null,
    last_fling_emoji: post.last_fling_emoji || null,
    parent_id: post.parent_id,
    troop_id: post.troop_id,
    is_anonymous: post.is_anonymous,
    is_mine: post.monkey_id === currentMonkeyId,
    image_url: post.image_url,
  };
}

router.get('/', requireMonkey(async (req, res) => {
  const monkeyId = req.monkey.id;
  const { sort, cursor, limit: rawLimit, troop_id, feed } = req.query;
  const limit = Math.min(parseInt(rawLimit, 10) || 20, 50);
  const dialect = db.dialect || 'sqlite';
  const dayFilter = nowMinus1Day(dialect);
  const baseSelect = postSelectSql(sort === 'trending' ? dayFilter : null);

  let query;
  let params = [];

  if (feed === 'friends') {
    const cursorClause = cursor ? 'AND p.id < ?' : '';
    query = `
      ${baseSelect}
      WHERE p.parent_id IS NULL AND p.troop_id IS NULL
        AND p.monkey_id IN (
          SELECT CASE WHEN f.requester_id = ? THEN f.addressee_id ELSE f.requester_id END
          FROM friendships f
          WHERE (f.requester_id = ? OR f.addressee_id = ?) AND f.status = 'accepted'
        )
      ${cursorClause}
      ORDER BY p.created_at DESC
      LIMIT ?
    `;
    if (cursor) params.push(monkeyId, monkeyId, monkeyId, parseInt(cursor, 10), limit);
    else params.push(monkeyId, monkeyId, monkeyId, limit);
  } else if (sort === 'trending') {
    query = `
      ${baseSelect}
      WHERE p.parent_id IS NULL
      ${troop_id ? 'AND p.troop_id = ?' : 'AND p.troop_id IS NULL'}
      ORDER BY ${trendingScoreSql(dayFilter)} DESC, p.created_at DESC
      LIMIT ?
    `;
    if (troop_id) params.push(troop_id);
    params.push(limit);
  } else {
    const cursorClause = cursor ? 'AND p.id < ?' : '';
    query = `
      ${baseSelect}
      WHERE p.parent_id IS NULL
      ${troop_id ? 'AND p.troop_id = ?' : 'AND p.troop_id IS NULL'}
      ${cursorClause}
      ORDER BY p.created_at DESC
      LIMIT ?
    `;
    if (troop_id) params.push(troop_id);
    if (cursor) params.push(parseInt(cursor, 10));
    params.push(limit);
  }

  const posts = await db.all(query, ...params);
  const result = await Promise.all(posts.map((p) => enrichPost(p, monkeyId)));
  const nextCursor = posts.length === limit ? posts[posts.length - 1].id : null;
  res.json({ posts: result, next_cursor: nextCursor });
}));

router.get('/monkey/:monkeyId/posts', async (req, res) => {
  const monkey = await getMonkey(req);
  const monkeyId = monkey ? monkey.id : null;
  const dialect = db.dialect || 'sqlite';

  const posts = await db.all(`
    ${postSelectSql()}
    WHERE p.monkey_id = ? AND ${isFalse(dialect, 'p.is_anonymous')}
    ORDER BY p.created_at DESC
    LIMIT 50
  `, req.params.monkeyId);

  const result = await Promise.all(posts.map((p) => enrichPost(p, monkeyId)));
  res.json(result);
});

router.get('/:id/replies', async (req, res) => {
  const monkey = await getMonkey(req);
  const monkeyId = monkey ? monkey.id : null;

  const replies = await db.all(`
    ${postSelectSql()}
    WHERE p.parent_id = ?
    ORDER BY p.created_at ASC
  `, req.params.id);

  const result = await Promise.all(replies.map((p) => enrichPost(p, monkeyId)));
  res.json(result);
});

router.get('/:id', async (req, res) => {
  const monkey = await getMonkey(req);
  const monkeyId = monkey ? monkey.id : null;

  const post = await db.get(`
    ${postSelectSql()}
    WHERE p.id = ?
  `, req.params.id);

  if (!post) return res.status(404).json({ error: 'Post not found' });
  res.json(await enrichPost(post, monkeyId));
});

router.post('/', requireMonkey(async (req, res) => {
  const { content, parent_id, troop_id, is_anonymous, image_url } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ error: 'Post cannot be empty' });
  if (content.length > 500) return res.status(400).json({ error: 'Post too long (max 500 chars)' });

  if (parent_id) {
    const parent = await db.get('SELECT id FROM posts WHERE id = ?', parent_id);
    if (!parent) return res.status(404).json({ error: 'Parent post not found' });
  }
  if (troop_id) {
    const troop = await db.get('SELECT id FROM troops WHERE id = ?', troop_id);
    if (!troop) return res.status(404).json({ error: 'Troop not found' });
    const membership = await db.get('SELECT 1 FROM troop_members WHERE troop_id = ? AND monkey_id = ?', troop_id, req.monkey.id);
    if (!membership) return res.status(403).json({ error: 'Join troop before posting' });
  }

  await updateStreak(req.monkey);

  const result = await db.run(
    'INSERT INTO posts (monkey_id, content, parent_id, troop_id, is_anonymous, image_url) VALUES (?, ?, ?, ?, ?, ?)',
    req.monkey.id, content.trim(), parent_id || null, troop_id || null, is_anonymous ? 1 : 0, image_url || null
  );

  if (parent_id) {
    const parentPost = await db.get('SELECT monkey_id FROM posts WHERE id = ?', parent_id);
    if (parentPost && parentPost.monkey_id !== req.monkey.id) {
      const name = is_anonymous ? 'A mysterious monkey' : await getDisplayName(req.monkey);
      await db.run(
        'INSERT INTO notifications (monkey_id, type, reference_id, message) VALUES (?, ?, ?, ?)',
        parentPost.monkey_id, 'reply', result.lastInsertRowid, `${name} replied to your post`
      );
      broadcast('new_notification', { monkey_id: parentPost.monkey_id });
    }
  }

  const post = await db.get(`
    SELECT p.*, m.monkey_name, m.monkey_emoji, m.avatar_seed, m.created_at as monkey_created_at
    FROM posts p JOIN monkeys m ON p.monkey_id = m.id WHERE p.id = ?
  `, result.lastInsertRowid);

  const enrichedPost = await enrichPost({ ...post, bananas: 0, poops: 0, reply_count: 0, fling_count: 0 }, req.monkey.id);
  broadcast(parent_id ? 'new_reply' : 'new_post', enrichedPost);
  res.status(201).json(enrichedPost);
}));

router.post('/:id/fling', requireMonkey(async (req, res) => {
  const post = await db.get('SELECT id, monkey_id FROM posts WHERE id = ?', req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const existing = await db.get('SELECT id FROM flings WHERE monkey_id = ? AND original_post_id = ?', req.monkey.id, post.id);
  if (existing) {
    await db.run('DELETE FROM flings WHERE id = ?', existing.id);
    broadcast('post_flung', { post_id: post.id, flung: false });
    return res.json({ flung: false });
  }

  await db.run('INSERT INTO flings (monkey_id, original_post_id) VALUES (?, ?)', req.monkey.id, post.id);

  if (post.monkey_id !== req.monkey.id) {
    await db.run(
      'INSERT INTO notifications (monkey_id, type, reference_id, message) VALUES (?, ?, ?, ?)',
      post.monkey_id, 'fling', post.id, `${await getDisplayName(req.monkey)} flung your post`
    );
    broadcast('new_notification', { monkey_id: post.monkey_id });
  }

  broadcast('post_flung', { post_id: post.id, flung: true });
  res.json({ flung: true });
}));

router.delete('/:id', requireMonkey(async (req, res) => {
  const post = await db.get('SELECT monkey_id FROM posts WHERE id = ?', req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (post.monkey_id !== req.monkey.id) return res.status(403).json({ error: 'Not your post' });

  await db.run('DELETE FROM posts WHERE id = ?', req.params.id);
  broadcast('post_deleted', { id: Number(req.params.id) });
  res.json({ deleted: true });
}));

module.exports = router;
