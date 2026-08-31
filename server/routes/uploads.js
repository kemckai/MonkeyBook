const express = require('express');
const path = require('path');
const fs = require('fs/promises');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requireMonkeyMiddleware } = require('../lib/auth');
const { upload, useR2, localUrl } = require('../lib/storage');
const { validateImageBuffer } = require('../lib/imageMagic');
const { enqueue, JOB_TYPES } = require('../lib/queue');

const router = express.Router();

router.post('/', requireMonkeyMiddleware, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No valid image' });

  try {
    const buffer = await fs.readFile(req.file.path);
    const validation = validateImageBuffer(buffer, req.file.mimetype);
    if (!validation.ok) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ error: validation.error });
    }

    if (!useR2()) {
      return res.json({ url: localUrl(req.file.filename), status: 'completed' });
    }

    const jobId = uuidv4();
    const now = new Date().toISOString();
    await db.run(
      `INSERT INTO media_jobs (id, monkey_id, status, temp_path, mime_type, created_at)
       VALUES (?, ?, 'pending', ?, ?, ?)`,
      jobId,
      req.monkey.id,
      req.file.path,
      validation.mime,
      now
    );

    await enqueue(JOB_TYPES.MEDIA_UPLOAD, { job_id: jobId });

    res.status(202).json({
      job_id: jobId,
      status: 'processing',
      url: localUrl(req.file.filename),
    });
  } catch (err) {
    console.error('Upload enqueue failed:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

router.get('/:jobId', requireMonkeyMiddleware, async (req, res) => {
  const job = await db.get('SELECT * FROM media_jobs WHERE id = ?', req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Upload job not found' });
  if (job.monkey_id !== req.monkey.id) return res.status(403).json({ error: 'Not your upload' });

  const previewUrl = job.temp_path ? localUrl(path.basename(job.temp_path)) : null;
  res.json({
    job_id: job.id,
    status: job.status,
    url: job.public_url || previewUrl,
    error: job.last_error || null,
  });
});

module.exports = router;
