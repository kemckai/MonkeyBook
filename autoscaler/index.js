require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { TargetScaler } = require('./scaler');

const POLL_INTERVAL_MS = parseInt(process.env.AUTOSCALE_POLL_INTERVAL_MS || '60000', 10);
const SCALE_DOWN_COOLDOWN_MS = parseInt(process.env.AUTOSCALE_SCALE_DOWN_COOLDOWN_MS || '300000', 10);
const SAMPLES = parseInt(process.env.AUTOSCALE_SAMPLES || '5', 10);
const SAMPLE_DELAY_MS = parseInt(process.env.AUTOSCALE_SAMPLE_DELAY_MS || '1000', 10);

function envBool(name, fallback = false) {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return value === 'true' || value === '1';
}

function envInt(name, fallback) {
  const parsed = parseInt(process.env[name], 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildTargets(token, tokenType) {
  const railway = { token, tokenType, samples: SAMPLES, sampleDelayMs: SAMPLE_DELAY_MS, scaleDownCooldownMs: SCALE_DOWN_COOLDOWN_MS };
  const targets = [];

  if (envBool('AUTOSCALE_WEB_ENABLED', true)) {
    const serviceId = process.env.AUTOSCALE_WEB_SERVICE_ID || process.env.TARGET_SERVICE_ID;
    const environmentId = process.env.AUTOSCALE_WEB_ENVIRONMENT_ID || process.env.TARGET_ENVIRONMENT_ID;
    const loadUrl = process.env.AUTOSCALE_WEB_LOAD_URL || process.env.TARGET_LOAD_URL;
    if (!serviceId || !environmentId || !loadUrl) {
      throw new Error('Web autoscaling requires AUTOSCALE_WEB_SERVICE_ID, AUTOSCALE_WEB_ENVIRONMENT_ID, AUTOSCALE_WEB_LOAD_URL');
    }
    targets.push(new TargetScaler({
      name: 'web',
      serviceId,
      environmentId,
      signal: 'inflight',
      loadUrl,
      targetPerReplica: envInt('AUTOSCALE_WEB_TARGET_INFLIGHT', 25),
      minReplicas: envInt('AUTOSCALE_WEB_MIN_REPLICAS', 1),
      maxReplicas: envInt('AUTOSCALE_WEB_MAX_REPLICAS', 10),
    }, railway));
  }

  if (envBool('AUTOSCALE_WORKER_ENABLED', false)) {
    const serviceId = process.env.AUTOSCALE_WORKER_SERVICE_ID;
    const environmentId = process.env.AUTOSCALE_WORKER_ENVIRONMENT_ID || process.env.AUTOSCALE_WEB_ENVIRONMENT_ID || process.env.TARGET_ENVIRONMENT_ID;
    const loadUrl = process.env.AUTOSCALE_WORKER_QUEUE_URL;
    if (!serviceId || !environmentId || !loadUrl) {
      throw new Error('Worker autoscaling requires AUTOSCALE_WORKER_SERVICE_ID, AUTOSCALE_WORKER_ENVIRONMENT_ID, AUTOSCALE_WORKER_QUEUE_URL');
    }
    targets.push(new TargetScaler({
      name: 'worker',
      serviceId,
      environmentId,
      signal: 'queue',
      loadUrl,
      targetPerReplica: envInt('AUTOSCALE_WORKER_TARGET_JOBS', 20),
      minReplicas: envInt('AUTOSCALE_WORKER_MIN_REPLICAS', 1),
      maxReplicas: envInt('AUTOSCALE_WORKER_MAX_REPLICAS', 5),
    }, railway));
  }

  if (!targets.length) {
    throw new Error('No autoscale targets enabled. Set AUTOSCALE_WEB_ENABLED and/or AUTOSCALE_WORKER_ENABLED.');
  }

  return targets;
}

async function evaluateAll(targets) {
  for (const target of targets) {
    try {
      await target.evaluate();
    } catch (err) {
      console.error(`[autoscaler:${target.name}] evaluation failed:`, err.message);
    }
  }
}

async function main() {
  const token = process.env.RAILWAY_API_TOKEN;
  if (!token) throw new Error('Missing RAILWAY_API_TOKEN');

  const tokenType = process.env.RAILWAY_TOKEN_TYPE === 'account' ? 'account' : 'project';
  const targets = buildTargets(token, tokenType);

  console.log(`[autoscaler] started with ${targets.length} target(s), poll=${POLL_INTERVAL_MS}ms`);

  while (true) {
    await evaluateAll(targets);
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

main().catch((err) => {
  console.error('[autoscaler] fatal:', err.message);
  process.exit(1);
});
