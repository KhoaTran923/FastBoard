import rateLimit from 'express-rate-limit';

// Skipped outside production so local development is never throttled
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
 * Strict limiter for login/register to slow brute-force guessing; not applied
 * to /me or /refresh, which run during normal app usage.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, error: 'Too many attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInDev,
});
