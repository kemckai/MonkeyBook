require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { createApp } = require('./app');
const { startWorker } = require('./jobs/runner');
const PORT = process.env.PORT || 3001;

const { app, server } = createApp({ withStaticClient: true });

const embeddedWorker = process.env.EMBEDDED_WORKER === 'true'
  || (process.env.EMBEDDED_WORKER !== 'false' && process.env.NODE_ENV !== 'production');

if (embeddedWorker) {
  startWorker();
}

server.listen(PORT, () => {
  console.log(`Monkeybook API running on http://localhost:${PORT}`);
  if (embeddedWorker) console.log('[worker] embedded job processor enabled');
});

module.exports = { app, server };
