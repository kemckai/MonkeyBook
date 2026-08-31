const { EventEmitter } = require('events');
const db = require('../db');

const CHANNEL = 'monkeybook_events';
const bus = new EventEmitter();
let pgListener = null;

async function publish(event, data) {
  const payload = JSON.stringify({ event, data });

  if (db.dialect === 'postgres' && db.pool) {
    await db.pool.query('SELECT pg_notify($1, $2)', [CHANNEL, payload]);
    return;
  }

  bus.emit('message', { event, data });
}

async function startListener(onMessage) {
  if (db.dialect === 'postgres' && db.pool) {
    const { Client } = require('pg');
    const ssl = process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false };
    pgListener = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl,
    });
    await pgListener.connect();
    await pgListener.query(`LISTEN ${CHANNEL}`);
    pgListener.on('notification', (msg) => {
      try {
        const { event, data } = JSON.parse(msg.payload);
        onMessage(event, data);
      } catch (err) {
        console.error('Invalid event payload:', err);
      }
    });
    pgListener.on('error', (err) => {
      console.error('Event listener error:', err);
    });
    return;
  }

  bus.on('message', ({ event, data }) => onMessage(event, data));
}

async function stopListener() {
  if (pgListener) {
    await pgListener.end();
    pgListener = null;
  }
}

module.exports = { publish, startListener, stopListener };
