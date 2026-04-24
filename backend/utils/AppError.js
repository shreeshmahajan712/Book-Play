/**
 * AppError — Operational Error Class
 *
 * Distinguishes between "operational" errors (known, expected — e.g. 404, 400)
 * and "programmer" errors (bugs — e.g. TypeError, ReferenceError).
 *
 * The global error handler only sends safe messages to the client for
 * operational errors. All others surface as a generic 500.
 */
class AppError extends Error {
  /**
   * @param {string} message    - Human-readable error message (sent to client)
   * @param {number} statusCode - HTTP status code (400, 401, 403, 404, 409, 422, 500…)
   * @param {object} [meta]     - Optional extra data attached to the error (not sent to client)
   */
  constructor(message, statusCode, meta = {}) {
    super(message);

    this.statusCode = statusCode;
    this.status = String(statusCode).startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // Flag checked by global error handler
    this.meta = meta;

    // Capture a clean stack trace (excludes this constructor frame)
    Error.captureStackTrace(this, this.constructor);
  }
}

// ─── Factory helpers for common HTTP errors ───────────────────────────────────

AppError.badRequest = (msg, meta) => new AppError(msg || 'Bad Request', 400, meta);
AppError.unauthorized = (msg, meta) => new AppError(msg || 'Unauthorized', 401, meta);
AppError.forbidden = (msg, meta) => new AppError(msg || 'Forbidden', 403, meta);
AppError.notFound = (msg, meta) => new AppError(msg || 'Not Found', 404, meta);
AppError.conflict = (msg, meta) => new AppError(msg || 'Conflict', 409, meta);
AppError.unprocessable = (msg, meta) => new AppError(msg || 'Unprocessable Entity', 422, meta);
AppError.tooManyRequests = (msg, meta) => new AppError(msg || 'Too Many Requests', 429, meta);
AppError.internal = (msg, meta) => new AppError(msg || 'Internal Server Error', 500, meta);

module.exports = AppError;
