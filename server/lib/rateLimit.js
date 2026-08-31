const rateLimit = require('express-rate-limit');

const skipInTests = () => !!process.env.MONKEYBOOK_DB_PATH;

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  message: { error: 'Too many requests, try again later' },
});

const authStrictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  message: { error: 'Too many attempts, try again later' },
});

module.exports = { authLimiter, authStrictLimiter };
