const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const request = require('supertest');

const testDbPath = path.join(__dirname, 'test-monkeybook.db');
process.env.MONKEYBOOK_DB_PATH = testDbPath;

if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
if (fs.existsSync(`${testDbPath}-wal`)) fs.unlinkSync(`${testDbPath}-wal`);
if (fs.existsSync(`${testDbPath}-shm`)) fs.unlinkSync(`${testDbPath}-shm`);

const { createApp } = require('../app');
const { app, server } = createApp({ withStaticClient: false, withWebSocket: false });

test.after(() => {
  server.close();
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  if (fs.existsSync(`${testDbPath}-wal`)) fs.unlinkSync(`${testDbPath}-wal`);
  if (fs.existsSync(`${testDbPath}-shm`)) fs.unlinkSync(`${testDbPath}-shm`);
});

test('identity claim and me flow works', async () => {
  const agent = request.agent(app);

  const before = await agent.get('/api/identity/me');
  assert.equal(before.status, 200);
  assert.equal(before.body, null);

  const claim = await agent.post('/api/identity/claim');
  assert.equal(claim.status, 201);
  assert.ok(claim.body.id);
  assert.ok(claim.body.monkey_name);

  const me = await agent.get('/api/identity/me');
  assert.equal(me.status, 200);
  assert.equal(me.body.id, claim.body.id);
});

test('troop posting requires membership', async () => {
  const owner = request.agent(app);
  const outsider = request.agent(app);

  await owner.post('/api/identity/claim');
  await outsider.post('/api/identity/claim');

  const troop = await owner
    .post('/api/troops')
    .send({ name: `QA Troop ${Date.now()}`, description: 'test' });
  assert.equal(troop.status, 201);

  const blocked = await outsider
    .post('/api/posts')
    .send({ content: 'should fail', troop_id: troop.body.id });
  assert.equal(blocked.status, 403);

  const joined = await outsider.post(`/api/troops/${troop.body.id}/join`);
  assert.equal(joined.status, 200);
  assert.equal(joined.body.joined, true);

  const allowed = await outsider
    .post('/api/posts')
    .send({ content: 'should pass', troop_id: troop.body.id });
  assert.equal(allowed.status, 201);
});

test('daily banana budget blocks 11th banana reaction', async () => {
  const author = request.agent(app);
  const reactor = request.agent(app);
  await author.post('/api/identity/claim');
  await reactor.post('/api/identity/claim');

  for (let i = 0; i < 11; i += 1) {
    const post = await author.post('/api/posts').send({ content: `p-${i}` });
    assert.equal(post.status, 201);
    const react = await reactor.post(`/api/reactions/${post.body.id}/banana`);
    if (i < 10) {
      assert.equal(react.status, 200);
    } else {
      assert.equal(react.status, 429);
    }
  }
});
