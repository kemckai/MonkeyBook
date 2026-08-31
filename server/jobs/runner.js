const { claimNext, complete, fail, reapStuckJobs } = require('../lib/queue');
const { processJob } = require('./handlers');

const POLL_MS = parseInt(process.env.WORKER_POLL_MS || '1000', 10);
let running = false;
let timer = null;

async function processOne() {
  const job = await claimNext();
  if (!job) return false;

  try {
    await processJob(job);
    await complete(job.id);
  } catch (err) {
    console.error(`Job ${job.id} (${job.type}) failed:`, err);
    await fail(job.id, err);
  }
  return true;
}

async function poll() {
  if (!running) return;
  try {
    await reapStuckJobs();
    let processed = true;
    while (processed && running) {
      processed = await processOne();
    }
  } catch (err) {
    console.error('Worker poll error:', err);
  }
  if (running) {
    timer = setTimeout(poll, POLL_MS);
  }
}

function startWorker() {
  if (running) return;
  running = true;
  console.log(`[worker] started (poll every ${POLL_MS}ms)`);
  poll();
}

function stopWorker() {
  running = false;
  if (timer) clearTimeout(timer);
  timer = null;
}

module.exports = { startWorker, stopWorker, processOne };
