const express = require('express');
const { getInflight } = require('../lib/metrics');
const { getQueueStats } = require('../lib/queue');

const router = express.Router();

function metricsAuth(req, res, next) {
  const token = process.env.METRICS_TOKEN;
  if (process.env.NODE_ENV === 'production' && !token) {
    return res.status(503).json({ error: 'Metrics disabled' });
  }
  if (!token) return next();
  const header = req.headers.authorization;
  if (header === `Bearer ${token}`) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

router.use(metricsAuth);

router.get('/load', (_req, res) => {
  res.json({
    inflight: getInflight(),
    replica_id: process.env.RAILWAY_REPLICA_ID || null,
  });
});

router.get('/queue', async (_req, res) => {
  try {
    const stats = await getQueueStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
