const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');

/**
 * protect — Verifies JWT from HTTP-only cookie and attaches user to req.
 *
 * Token lookup order:
 *   1. HTTP-only cookie: `token` (preferred — not accessible via JS)
 *   2. Authorization header: `Bearer <token>` (fallback for API clients/mobile)
 */
const protect = async (req, _res, next) => {
  try {
    let token;

    // 1. Cookie (preferred)
    if (req.cookies?.token) {
      token = req.cookies.token;
    }
    // 2. Bearer header (fallback)
    else if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(AppError.unauthorized('You are not logged in. Please log in to continue.'));
    }

    // Verify and decode
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Ensure user still exists (handles deleted/deactivated accounts)
    const currentUser = await User.findById(decoded.id).select('+isActive');
    if (!currentUser) {
      return next(AppError.unauthorized('The user belonging to this token no longer exists.'));
    }

    if (!currentUser.isActive) {
      return next(AppError.unauthorized('Your account has been deactivated. Please contact support.'));
    }

    // Attach to request for downstream middlewares & controllers
    req.user = currentUser;
    next();
  } catch (err) {
    next(err); // Caught by global error handler (JsonWebTokenError → 401)
  }
};

/**
 * optionalAuth — Same as protect but does NOT throw if no token is present.
 * Used on public routes that show extra data to logged-in users (e.g. turf listings).
 */
const optionalAuth = async (req, _res, next) => {
  try {
    let token;

    if (req.cookies?.token) token = req.cookies.token;
    else if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) return next(); // Not logged in — that's fine

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('+isActive');
    if (user && user.isActive) req.user = user;

    next();
  } catch {
    // Invalid token on a public route — just ignore it
    next();
  }
};

module.exports = { protect, optionalAuth };
