/**
 * Allow image URLs from our own upload paths / R2 bucket only.
 */
function isAllowedImageUrl(url) {
  if (url == null || url === '') return true;
  if (typeof url !== 'string' || url.length > 2048) return false;

  if (url.startsWith('/api/uploads/')) return true;

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;

  const r2Base = process.env.R2_PUBLIC_URL?.replace(/\/$/, '');
  if (r2Base && url.startsWith(`${r2Base}/uploads/`)) return true;

  const clientOrigin = process.env.CLIENT_ORIGIN?.replace(/\/$/, '');
  if (clientOrigin && url.startsWith(`${clientOrigin}/api/uploads/`)) return true;

  return false;
}

module.exports = { isAllowedImageUrl };
