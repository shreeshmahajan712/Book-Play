const winston = require('winston');

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format: [TIMESTAMP] [LEVEL]: message \n (stack if error)
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
});

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }), // captures stack traces for Error objects
    logFormat
  ),
  transports: [
    // Console: only in non-production (colorized)
    ...(process.env.NODE_ENV !== 'production'
      ? [new winston.transports.Console({ format: combine(colorize(), logFormat) })]
      : []),

    // File: errors only
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 3,
    }),

    // File: all logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
  ],
  // Don't crash on uncaught exceptions — log them
  exceptionHandlers: [new winston.transports.File({ filename: 'logs/exceptions.log' })],
  rejectionHandlers: [new winston.transports.File({ filename: 'logs/rejections.log' })],
});

module.exports = logger;
