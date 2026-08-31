const test = require('node:test');
const assert = require('node:assert/strict');
const { shouldDeliver } = require('../ws');

function mockClient({ userId, monkeyId, troopIds = [] } = {}) {
  return {
    userId,
    monkeyId,
    troopIds: new Set(troopIds),
  };
}

test('shouldDeliver blocks unauthenticated clients', () => {
  const client = mockClient();
  assert.equal(shouldDeliver(client, 'new_post', { id: 1 }), false);
});

test('shouldDeliver sends public feed events to authenticated users', () => {
  const client = mockClient({ userId: 1, monkeyId: 10 });
  assert.equal(shouldDeliver(client, 'new_post', { id: 1 }), true);
  assert.equal(shouldDeliver(client, 'new_reaction', { post_id: 1 }), true);
});

test('shouldDeliver scopes troop posts to troop members', () => {
  const member = mockClient({ userId: 1, monkeyId: 10, troopIds: [5] });
  const outsider = mockClient({ userId: 2, monkeyId: 20, troopIds: [] });

  const data = { id: 1, troop_id: 5 };
  assert.equal(shouldDeliver(member, 'new_post', data), true);
  assert.equal(shouldDeliver(outsider, 'new_post', data), false);
});

test('shouldDeliver scopes notifications to target monkey only', () => {
  const recipient = mockClient({ userId: 1, monkeyId: 10 });
  const other = mockClient({ userId: 2, monkeyId: 20 });

  const data = { monkey_id: 10, notification_id: 1 };
  assert.equal(shouldDeliver(recipient, 'new_notification', data), true);
  assert.equal(shouldDeliver(other, 'new_notification', data), false);
});

test('shouldDeliver scopes media_ready to uploader monkey', () => {
  const uploader = mockClient({ userId: 1, monkeyId: 10 });
  const other = mockClient({ userId: 2, monkeyId: 20 });

  const data = { job_id: 'abc', monkey_id: 10, url: 'https://example.com/x' };
  assert.equal(shouldDeliver(uploader, 'media_ready', data), true);
  assert.equal(shouldDeliver(other, 'media_ready', data), false);
});

test('shouldDeliver scopes troop_membership_changed to target monkey only', () => {
  const self = mockClient({ userId: 1, monkeyId: 10 });
  const other = mockClient({ userId: 2, monkeyId: 20 });

  const data = { monkey_id: 10 };
  assert.equal(shouldDeliver(self, 'troop_membership_changed', data), true);
  assert.equal(shouldDeliver(other, 'troop_membership_changed', data), false);
});

test('shouldDeliver ignores unknown events', () => {
  const client = mockClient({ userId: 1, monkeyId: 10 });
  assert.equal(shouldDeliver(client, 'mystery_event', {}), false);
});
