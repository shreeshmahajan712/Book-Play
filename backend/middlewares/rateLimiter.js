const rateLimit = require('express-rate-limit');
const AppError = require('../utils/AppError');

// ─── Helper ───────────────────────────────────────────────────────────────────
const makeHandler = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,  // Return rate limit info in RateLimit-* headers
    legacyHeaders: false,    // Disable X-RateLimit-* headers
    handler: (_req, _res, next) => {
      next(AppError.tooManyRequests(message));
    },
    skip: (req) => req.ip === '127.0.0.1' && process.env.NODE_ENV === 'test',
  });

// ─── Limiters ─────────────────────────────────────────────────────────────────

/**
 * Auth limiter — strict. Prevents brute-force login attacks.
 * 10 requests per 15 minutes per IP.
 */
const authLimiter = makeHandler(
  15 * 60 * 1000,
  10,
  'Too many login attempts from this IP. Please try again after 15 minutes.'
);

/**
 * API limiter — general. Applied to all /api routes.
 * 100 requests per minute per IP.
 */
const apiLimiter = makeHandler(
  60 * 1000,
  100,
  'Too many requests from this IP. Please slow down.'
);

/**
 * Booking limiter — prevents rapid booking spam.
 * 20 booking attempts per 10 minutes per IP.
 */
const bookingLimiter = makeHandler(
  10 * 60 * 1000,
  20,
  'Too many booking requests. Please wait a moment before trying again.'
);

module.exports = { authLimiter, apiLimiter, bookingLimiter };
