const { WebSocketServer } = require('ws');
const { authenticateWebSocket } = require('./lib/wsAuth');

let wss = null;
let heartbeatInterval = null;

const TARGETED_EVENTS = {
  new_notification: 'monkey_id',
  media_ready: 'monkey_id',
  troop_membership_changed: 'monkey_id',
};

const FEED_EVENTS = new Set([
  'new_post',
  'new_reply',
  'post_flung',
  'post_deleted',
  'new_reaction',
]);

function shouldDeliver(client, event, data) {
  if (!client.userId) return false;

  const targetKey = TARGETED_EVENTS[event];
  if (targetKey) {
    const targetId = data?.[targetKey];
    if (targetId == null) return false;
    return Number(client.monkeyId) === Number(targetId);
  }

  if (FEED_EVENTS.has(event)) {
    const troopId = data?.troop_id;
    if (troopId == null) return true;
    return client.troopIds?.has(Number(troopId));
  }

  return false;
}

function init(server) {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  if (wss) {
    try { wss.close(); } catch { /* ignore */ }
    wss = null;
  }

  wss = new WebSocketServer({
    server,
    path: '/ws',
    verifyClient: (info, done) => {
      authenticateWebSocket(info.req)
        .then((session) => {
          if (!session) return done(false, 401, 'Unauthorized');
          info.req.wsSession = session;
          done(true);
        })
        .catch((err) => {
          console.error('WebSocket auth failed:', err);
          done(false, 500, 'Auth error');
        });
    },
  });

  wss.on('connection', (ws, request) => {
    const session = request.wsSession;
    if (!session) {
      ws.close(4401, 'Unauthorized');
      return;
    }

    ws.userId = session.userId;
    ws.monkeyId = session.monkeyId;
    ws.troopIds = session.troopIds;
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
  });

  heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  });
}

function broadcast(event, data) {
  if (!wss) return;
  const message = JSON.stringify({ event, data });
  wss.clients.forEach((client) => {
    if (shouldDeliver(client, event, data)) {
      client.send(message);
    }
  });
}

module.exports = { init, broadcast, shouldDeliver };
