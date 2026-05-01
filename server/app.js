const http = require('http');
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const { init: initWS, broadcast } = require('./ws');
const identityRoutes = require('./routes/identity');
const postRoutes = require('./routes/posts');
const reactionRoutes = require('./routes/reactions');
const troopRoutes = require('./routes/troops');
const notificationRoutes = require('./routes/notifications');
const motdRoutes = require('./routes/motd');

function createApp({ withStaticClient = true, withWebSocket = true } = {}) {
  const app = express();
  const server = http.createServer(app);

  if (withWebSocket) {
    initWS(server);
  }

  const corsOrigin =
    process.env.NODE_ENV === 'production'
      ? process.env.CLIENT_ORIGIN || true
      : true;
  app.use(cors({ origin: corsOrigin, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  const uploadsDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    }
  });
  const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      cb(null, allowed.includes(file.mimetype));
    }
  });

  app.use('/uploads', express.static(uploadsDir));
  app.use('/api/uploads', express.static(uploadsDir));

  app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No valid image' });
    res.json({ url: `/api/uploads/${req.file.filename}` });
  });

  app.use('/api/identity', identityRoutes);
  app.use('/api/posts', postRoutes);
  app.use('/api/reactions', reactionRoutes);
  app.use('/api/troops', troopRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/monkey-of-the-day', motdRoutes);

  app.broadcast = broadcast;

  if (withStaticClient) {
    const clientDist = path.join(__dirname, '..', 'client', 'dist');
    if (fs.existsSync(clientDist)) {
      app.use(express.static(clientDist));
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
