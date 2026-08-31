require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { startWorker } = require('./jobs/runner');

startWorker();

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));
