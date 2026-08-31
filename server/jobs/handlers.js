const fs = require('fs/promises');
const db = require('../db');
const { sendPasswordResetEmail } = require('../lib/email');
const { deliverNotification } = require('../lib/notifications');
const { publish } = require('../lib/events');
const { uploadBufferToR2 } = require('../lib/storage');
const { JOB_TYPES } = require('../lib/queue');

async function handleEmailPasswordReset(payload) {
  await sendPasswordResetEmail(payload.email, payload.token);
}

async function handleMediaUpload(payload) {
  const { job_id: jobId } = payload;
  const job = await db.get('SELECT * FROM media_jobs WHERE id = ?', jobId);
  if (!job) throw new Error(`Media job ${jobId} not found`);

  await db.run("UPDATE media_jobs SET status = 'processing' WHERE id = ?", jobId);

  try {
    const buffer = await fs.readFile(job.temp_path);
    const publicUrl = await uploadBufferToR2(buffer, job.mime_type, job.temp_path);
    const now = new Date().toISOString();

    await db.run(
      "UPDATE media_jobs SET status = 'completed', public_url = ?, completed_at = ? WHERE id = ?",
      publicUrl,
      now,
      jobId
    );

    await fs.unlink(job.temp_path).catch(() => {});
    await publish('media_ready', { job_id: jobId, url: publicUrl, monkey_id: job.monkey_id });
  } catch (err) {
    const now = new Date().toISOString();
    await db.run(
      "UPDATE media_jobs SET status = 'failed', last_error = ?, completed_at = ? WHERE id = ?",
      err.message,
      now,
      jobId
    );
    throw err;
  }
}

async function handleNotificationDeliver(payload) {
  await deliverNotification(payload);
}

const HANDLERS = {
  [JOB_TYPES.EMAIL_PASSWORD_RESET]: handleEmailPasswordReset,
  [JOB_TYPES.MEDIA_UPLOAD]: handleMediaUpload,
  [JOB_TYPES.NOTIFICATION_DELIVER]: handleNotificationDeliver,
};

async function processJob(job) {
  const payload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;
  const handler = HANDLERS[job.type];
  if (!handler) throw new Error(`Unknown job type: ${job.type}`);
  await handler(payload);
}

module.exports = { processJob, HANDLERS };
