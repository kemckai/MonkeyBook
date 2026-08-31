const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const request = require('supertest');

const testDbPath = path.join(__dirname, 'test-monkeybook.db');
process.env.MONKEYBOOK_DB_PATH = testDbPath;
delete process.env.DATABASE_URL;
process.env.SYNC_JOBS = '1';
process.env.EMBEDDED_WORKER = 'false';

if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
if (fs.existsSync(`${testDbPath}-wal`)) fs.unlinkSync(`${testDbPath}-wal`);
if (fs.existsSync(`${testDbPath}-shm`)) fs.unlinkSync(`${testDbPath}-shm`);

const { createApp } = require('../app');
const { app, server } = createApp({ withStaticClient: false, withWebSocket: false, withRealtime: false });

test.after(() => {
  server.close();
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  if (fs.existsSync(`${testDbPath}-wal`)) fs.unlinkSync(`${testDbPath}-wal`);
  if (fs.existsSync(`${testDbPath}-shm`)) fs.unlinkSync(`${testDbPath}-shm`);
});

async function registerAndLogin(agent, email) {
  const reg = await agent.post('/api/auth/register').send({ email, password: 'testpass123' });
  assert.equal(reg.status, 201);
  assert.equal(reg.body.monkey, null);
  const claim = await agent.post('/api/identity/claim');
  assert.equal(claim.status, 201);
  return { ...reg.body, monkey: claim.body };
}

test('auth register and login flow works', async () => {
  const agent = request.agent(app);

  const before = await agent.get('/api/auth/me');
  assert.equal(before.status, 200);
  assert.equal(before.body, null);

  const user = await registerAndLogin(agent, `test-${Date.now()}@example.com`);
  assert.ok(user.id);
  assert.ok(user.email);
  assert.ok(user.monkey);

  const me = await agent.get('/api/auth/me');
  assert.equal(me.status, 200);
  assert.equal(me.body.email, user.email);
});

test('identity claim requires auth', async () => {
  const agent = request.agent(app);
  const blocked = await agent.post('/api/identity/claim');
  assert.equal(blocked.status, 401);
});

test('upload requires monkey auth', async () => {
  const blocked = await request(app)
    .post('/api/upload')
    .attach('image', Buffer.from('fake'), { filename: 'test.png', contentType: 'image/png' });
  assert.equal(blocked.status, 401);
});

test('metrics endpoints expose load and queue stats', async () => {
  const load = await request(app).get('/api/metrics/load');
  assert.equal(load.status, 200);
  assert.equal(typeof load.body.inflight, 'number');

  const queue = await request(app).get('/api/metrics/queue');
  assert.equal(queue.status, 200);
  assert.equal(typeof queue.body.pending, 'number');
  assert.equal(typeof queue.body.backlog, 'number');
});

test('troop posting requires membership', async () => {
  const owner = request.agent(app);
  const outsider = request.agent(app);

  await registerAndLogin(owner, `owner-${Date.now()}@example.com`);
  await registerAndLogin(outsider, `outsider-${Date.now()}@example.com`);

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
  await registerAndLogin(author, `author-${Date.now()}@example.com`);
  await registerAndLogin(reactor, `reactor-${Date.now()}@example.com`);

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

test('friend request and accept flow', async () => {
  const a = request.agent(app);
  const b = request.agent(app);
  const userA = await registerAndLogin(a, `friend-a-${Date.now()}@example.com`);
  const userB = await registerAndLogin(b, `friend-b-${Date.now()}@example.com`);

  const req = await a.post(`/api/friends/request/${userB.monkey.id}`);
  assert.equal(req.status, 201);

  const requests = await b.get('/api/friends/requests');
  assert.equal(requests.body.incoming.length, 1);

  const accept = await b.post(`/api/friends/accept/${requests.body.incoming[0].friendship_id}`);
  assert.equal(accept.status, 200);

  const friends = await a.get('/api/friends');
  assert.equal(friends.body.length, 1);
});

test('report post creates pending report', async () => {
  process.env.ADMIN_EMAILS = `admin-${Date.now()}@example.com`;
  const author = request.agent(app);
  const reporter = request.agent(app);
  const admin = request.agent(app);

  await registerAndLogin(author, `post-author-${Date.now()}@example.com`);
  await registerAndLogin(reporter, `reporter-${Date.now()}@example.com`);
  const adminUser = await registerAndLogin(admin, process.env.ADMIN_EMAILS);
  assert.ok(adminUser.is_admin);

  const post = await author.post('/api/posts').send({ content: 'bad post' });
  const report = await reporter.post('/api/reports').send({ post_id: post.body.id, reason: 'spam' });
  assert.equal(report.status, 201);

  const reports = await admin.get('/api/admin/reports');
  assert.equal(reports.status, 200);
  assert.ok(reports.body.length >= 1);
});
