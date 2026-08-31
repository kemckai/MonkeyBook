const db = require('../db');

const JOB_TYPES = {
  EMAIL_PASSWORD_RESET: 'email.password-reset',
  MEDIA_UPLOAD: 'media.upload',
  NOTIFICATION_DELIVER: 'notification.deliver',
};

function parseJob(row) {
  if (!row) return null;
  return {
    ...row,
    payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
  };
}

async function enqueue(type, payload, { runAt, maxAttempts = 3 } = {}) {
  if (process.env.SYNC_JOBS === '1') {
    const { processJob } = require('../jobs/handlers');
    await processJob({ type, payload });
    return null;
  }

  const payloadJson = JSON.stringify(payload);
  const runAtValue = runAt || new Date().toISOString();
  const result = await db.run(
    'INSERT INTO jobs (type, payload, run_at, max_attempts) VALUES (?, ?, ?, ?)',
    type,
    payloadJson,
    runAtValue,
    maxAttempts
  );
  return result.lastInsertRowid;
}

async function claimNext() {
  const dialect = db.dialect || 'sqlite';

  if (dialect === 'postgres') {
    const row = await db.get(`
      WITH next_job AS (
        SELECT id FROM jobs
        WHERE status = 'pending' AND run_at <= NOW()
        ORDER BY run_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      UPDATE jobs
      SET status = 'processing', attempts = jobs.attempts + 1
      FROM next_job
      WHERE jobs.id = next_job.id
      RETURNING jobs.*
    `);
    return parseJob(row);
  }

  const pending = await db.get(`
    SELECT id FROM jobs
    WHERE status = 'pending' AND run_at <= datetime('now')
    ORDER BY run_at ASC
    LIMIT 1
  `);
  if (!pending) return null;

  const updated = await db.run(
    "UPDATE jobs SET status = 'processing', attempts = attempts + 1 WHERE id = ? AND status = 'pending'",
    pending.id
  );
  if (!updated.changes) return claimNext();

  const row = await db.get('SELECT * FROM jobs WHERE id = ?', pending.id);
  return parseJob(row);
}

async function complete(id) {
  const now = new Date().toISOString();
  await db.run(
    "UPDATE jobs SET status = 'completed', completed_at = ? WHERE id = ?",
    now,
    id
  );
}

async function fail(id, error, { retryDelayMs = 5000 } = {}) {
  const row = await db.get('SELECT attempts, max_attempts FROM jobs WHERE id = ?', id);
  if (!row) return;

  const message = error?.message || String(error);
  if (row.attempts < row.max_attempts) {
    const runAt = new Date(Date.now() + retryDelayMs * row.attempts).toISOString();
    await db.run(
      "UPDATE jobs SET status = 'pending', last_error = ?, run_at = ? WHERE id = ?",
      message,
      runAt,
      id
    );
    return;
  }

  const now = new Date().toISOString();
  await db.run(
    "UPDATE jobs SET status = 'failed', last_error = ?, completed_at = ? WHERE id = ?",
    message,
    now,
    id
  );
}

async function getQueueStats() {
  const dialect = db.dialect || 'sqlite';
  const pendingExpr = dialect === 'postgres'
    ? "status = 'pending' AND run_at <= NOW()"
    : "status = 'pending' AND run_at <= datetime('now')";

  const pending = (await db.get(`SELECT COUNT(*) as c FROM jobs WHERE ${pendingExpr}`)).c;
  const processing = (await db.get("SELECT COUNT(*) as c FROM jobs WHERE status = 'processing'")).c;
  const failed = (await db.get("SELECT COUNT(*) as c FROM jobs WHERE status = 'failed'")).c;

  return {
    pending: Number(pending) || 0,
    processing: Number(processing) || 0,
    failed: Number(failed) || 0,
    backlog: (Number(pending) || 0) + (Number(processing) || 0),
  };
}

module.exports = {
  JOB_TYPES,
  enqueue,
  claimNext,
  complete,
  fail,
  parseJob,
  getQueueStats,
};
