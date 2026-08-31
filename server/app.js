const http = require('http');
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');

const { init: initWS, broadcast } = require('./ws');
const { startListener } = require('./lib/events');
const authRoutes = require('./routes/auth');
const identityRoutes = require('./routes/identity');
const postRoutes = require('./routes/posts');
const reactionRoutes = require('./routes/reactions');
const troopRoutes = require('./routes/troops');
const notificationRoutes = require('./routes/notifications');
const motdRoutes = require('./routes/motd');
const friendRoutes = require('./routes/friends');
const reportRoutes = require('./routes/reports');
const adminRoutes = require('./routes/admin');
const uploadRoutes = require('./routes/uploads');
const metricsRoutes = require('./routes/metrics');
const { inflightMiddleware } = require('./lib/metrics');
const { uploadsDir } = require('./lib/storage');

function createApp({ withStaticClient = true, withWebSocket = true, withRealtime = true } = {}) {
  const app = express();
  const server = http.createServer(app);

  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  app.use(helmet({ contentSecurityPolicy: false }));

  if (withWebSocket) {
    initWS(server);
  }

  if (withRealtime && withWebSocket) {
    startListener((event, data) => broadcast(event, data)).catch((err) => {
      console.error('Failed to start realtime listener:', err);
    });
  }

  const corsOrigin =
    process.env.NODE_ENV === 'production'
      ? process.env.CLIENT_ORIGIN || true
      : true;
  app.use(cors({ origin: corsOrigin, credentials: true }));
  app.use(inflightMiddleware);
  app.use(express.json());
  app.use(cookieParser());

  app.use('/uploads', express.static(uploadsDir));
  app.use('/api/uploads', express.static(uploadsDir));

  app.use('/api/metrics', metricsRoutes);
  app.use('/api/upload', uploadRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/identity', identityRoutes);
  app.use('/api/posts', postRoutes);
  app.use('/api/reactions', reactionRoutes);
  app.use('/api/troops', troopRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/monkey-of-the-day', motdRoutes);
  app.use('/api/friends', friendRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/admin', adminRoutes);

  app.use((err, _req, res, _next) => {
    console.error(err);
    const status = err.status || err.statusCode || 500;
    res.status(status).json({ error: err.message || 'Internal server error' });
  });

  app.broadcast = broadcast;

  if (withStaticClient) {
    const clientDist = path.join(__dirname, '..', 'client', 'dist');
    if (fs.existsSync(clientDist)) {
      const iconNoCache = (req, res, next) => {
        if (/\.(ico|png)$/i.test(req.path)) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
        next();
      };
      app.use('/icons', iconNoCache, express.static(path.join(clientDist, 'icons')));
      app.use(iconNoCache, express.static(clientDist));
      app.get('/{*splat}', (_req, res) => {
        res.sendFile(path.join(clientDist, 'index.html'));
      });
    } else {
      app.get('/', (_req, res) => {
        res
          .status(503)
          .type('html')
          .send(
            '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Monkeybook</title></head><body style="font-family:system-ui;padding:2rem;max-width:36rem">' +
              '<h1>UI not built yet</h1>' +
              '<p>The API is running, but there is no <code>client/dist</code> bundle.</p>' +
              '<p><strong>Development:</strong> run <code>npm run dev</code> from the repo root and open <a href="http://localhost:3000">http://localhost:3000</a> (Vite + API).</p>' +
              '<p><strong>Production on this port:</strong> run <code>npm run build</code> first, then start the server again.</p>' +
              '</body></html>'
          );
      });
    }
  }

  return { app, server };
}

module.exports = { createApp };
