const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

/**
 * Global Error Handler Middleware
 *
 * Catches all errors forwarded via next(err) or thrown in async controllers.
 * Rules:
 *  - Operational errors (AppError.isOperational = true) → send actual message
 *  - Mongoose/validation errors → convert to 400 AppError
 *  - JWT errors → convert to 401 AppError
 *  - Programmer errors / unknown → send generic 500 (never leak stack in prod)
 *
 * Sentry integration: swap the logger.error line with Sentry.captureException(err)
 * when SENTRY_DSN is configured (see bottom of file).
 */

// ─── Mongoose Error Converters ────────────────────────────────────────────────

const handleCastError = (err) => {
  const message = `Invalid ${err.path}: "${err.value}". Must be a valid MongoDB ObjectId.`;
  return new AppError(message, 400);
};

const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map((e) => e.message);
  const message = `Validation failed: ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  const message = `"${value}" is already in use for field "${field}". Please use a different value.`;
  return new AppError(message, 409);
};

// ─── JWT Error Converters ─────────────────────────────────────────────────────

const handleJWTError = () =>
  new AppError('Invalid or tampered token. Please log in again.', 401);

const handleJWTExpiredError = () =>
  new AppError('Your session has expired. Please log in again.', 401);

// ─── Sentry (optional) ────────────────────────────────────────────────────────

const notifyErrorService = (err, req) => {
  // Uncomment after Sentry is initialized in server.js (Phase 5):
  // if (process.env.SENTRY_DSN) {
  //   const Sentry = require('@sentry/node');
  //   Sentry.withScope((scope) => {
  //     scope.setUser({ id: req.user?._id, email: req.user?.email });
  //     scope.setTag('route', req.path);
  //     Sentry.captureException(err);
  //   });
  // }
  logger.error(`[${err.statusCode || 500}] ${req.method} ${req.path} — ${err.message}`, err);
};

// ─── Response Senders ─────────────────────────────────────────────────────────

const sendDevError = (err, res) => {
  res.status(err.statusCode).json({
    success: false,
    status: err.status,
    message: err.message,
    stack: err.stack,
    meta: err.meta,
  });
};

const sendProdError = (err, res) => {
  if (err.isOperational) {
    // Operational — safe to show client
    res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: err.message,
    });
  } else {
    // Programmer error — never expose internals
    res.status(500).json({
      success: false,
      status: 'error',
      message: 'Something went wrong. Please try again later.',
    });
  }
};

// ─── Global Error Handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  notifyErrorService(err, req);

  let error = err;

  // Convert known error types to AppError
  if (err.name === 'CastError') error = handleCastError(err);
  if (err.name === 'ValidationError') error = handleValidationError(err);
  if (err.code === 11000) error = handleDuplicateKeyError(err);
  if (err.name === 'JsonWebTokenError') error = handleJWTError();
  if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

  if (process.env.NODE_ENV === 'development') {
    sendDevError(error, res);
  } else {
    sendProdError(error, res);
  }
};

module.exports = errorHandler;
