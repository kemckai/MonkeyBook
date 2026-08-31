const { enqueue, JOB_TYPES } = require('./queue');

async function queueNotification({
  monkeyId,
  type,
  referenceId,
  message,
  broadcastEvent = 'new_notification',
  broadcastData,
}) {
  await enqueue(JOB_TYPES.NOTIFICATION_DELIVER, {
    monkey_id: monkeyId,
    type,
    reference_id: referenceId,
    message,
    broadcast_event: broadcastEvent,
    broadcast_data: broadcastData || { monkey_id: monkeyId },
  });
}

module.exports = { queueNotification };
