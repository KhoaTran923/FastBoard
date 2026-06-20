import rateLimit from 'express-rate-limit';

// Rate limiting is skipped outside production so local development and testing
// (hot reloads, repeated logins) are never throttled. It stays active in prod.
const skipInDev = () => process.env.NODE_ENV !== 'production';

/** Generous limiter applied to the whole API. */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInDev,
});

/**
 * Strict limiter for the credential endpoints (login/register) to slow down
 * brute-force guessing. Deliberately NOT applied to /me or /refresh, which run
 * during normal app usage (e.g. on every page load) and must not be throttled.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, error: 'Too many attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInDev,
});
