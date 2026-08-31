const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const localStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage: localStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
});

function useR2() {
  return !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET);
}

function getS3Client() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
}

async function uploadBufferToR2(buffer, mimeType, sourcePath) {
  const ext = path.extname(sourcePath) || '.bin';
  const key = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const client = getS3Client();
  await client.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  }));
  const publicBase = process.env.R2_PUBLIC_URL || `https://${process.env.R2_BUCKET}.${process.env.R2_ACCOUNT_ID}.r2.dev`;
  return `${publicBase.replace(/\/$/, '')}/${key}`;
}

/** @deprecated Prefer enqueueing media.upload jobs; kept for sync local dev paths */
async function uploadToR2(file) {
  const body = await fs.promises.readFile(file.path);
  const url = await uploadBufferToR2(body, file.mimetype, file.path);
  await fs.promises.unlink(file.path).catch(() => {});
  return url;
}

function localUrl(filename) {
  return `/api/uploads/${filename}`;
}

module.exports = { upload, useR2, uploadToR2, uploadBufferToR2, localUrl, uploadsDir };
