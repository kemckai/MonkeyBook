const db = require('../db');
const { publish } = require('./events');

async function deliverNotification(payload) {
  const result = await db.run(
    'INSERT INTO notifications (monkey_id, type, reference_id, message) VALUES (?, ?, ?, ?)',
    payload.monkey_id,
    payload.type,
    payload.reference_id,
    payload.message
  );

  await publish(payload.broadcast_event || 'new_notification', {
    ...(payload.broadcast_data || { monkey_id: payload.monkey_id }),
    notification_id: result.lastInsertRowid,
    type: payload.type,
    reference_id: payload.reference_id,
  });

  return result.lastInsertRowid;
}

async function queueNotification({
  monkeyId,
  type,
  referenceId,
  message,
  broadcastEvent = 'new_notification',
  broadcastData,
}) {
  await deliverNotification({
    monkey_id: monkeyId,
    type,
    reference_id: referenceId,
    message,
    broadcast_event: broadcastEvent,
    broadcast_data: broadcastData || { monkey_id: monkeyId },
  });
}

module.exports = { queueNotification, deliverNotification };
