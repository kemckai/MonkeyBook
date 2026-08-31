const MIME_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

const ALLOWED_MIMES = new Set(Object.keys(MIME_EXT));

function detectImageMime(buffer) {
  if (!buffer || buffer.length < 12) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'image/png';
  }
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
    return 'image/gif';
  }
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46
    && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return 'image/webp';
  }

  return null;
}

function validateImageBuffer(buffer, claimedMime) {
  const detected = detectImageMime(buffer);
  if (!detected) {
    return { ok: false, error: 'Invalid image file' };
  }
  if (claimedMime && claimedMime !== detected) {
    return { ok: false, error: 'Image type does not match file contents' };
  }
  if (!ALLOWED_MIMES.has(detected)) {
    return { ok: false, error: 'Unsupported image type' };
  }
  return { ok: true, mime: detected };
}

function extensionForMime(mime) {
  return MIME_EXT[mime] || '.bin';
}

module.exports = {
  ALLOWED_MIMES,
  detectImageMime,
  validateImageBuffer,
  extensionForMime,
};
