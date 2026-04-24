const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');

// ─── Helper: Sign JWT & Set HTTP-only Cookie ───────────────────────────────────
const signTokenAndCookie = (userId, res) => {
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

  res.cookie('token', token, {
    httpOnly: true,                                         // Not accessible via document.cookie
    secure: process.env.NODE_ENV === 'production',         // HTTPS only in prod
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: parseInt(process.env.COOKIE_MAX_AGE_MS) || 7 * 24 * 60 * 60 * 1000, // 7d
  });

  return token;
};

// ─── Shared: Send Auth Response ───────────────────────────────────────────────
const sendAuthResponse = (user, statusCode, res) => {
  signTokenAndCookie(user._id, res);
  res.status(statusCode).json({
    success: true,
    data: { user: user.toPublicJSON() },
  });
};

// ─── POST /api/auth/register ──────────────────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone } = req.body;

    // Check for existing account
    const existing = await User.findOne({ email });
    if (existing) {
      return next(AppError.conflict('An account with this email already exists.'));
    }

    // passwordHash field triggers bcrypt in pre-save hook
    const user = await User.create({
      name,
      email,
      passwordHash: password,
      role: role || 'Player',
      phone: phone || null,
    });

    sendAuthResponse(user, 201, res);
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Explicitly select passwordHash (excluded by default via `select: false`)
    const user = await User.findOne({ email }).select('+passwordHash');

    if (!user || !(await user.comparePassword(password))) {
      return next(AppError.unauthorized('Incorrect email or password.'));
    }

    if (!user.isActive) {
      return next(AppError.unauthorized('Your account has been deactivated. Please contact support.'));
    }

    // Update last login timestamp
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    sendAuthResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
exports.logout = (_req, res) => {
  res.cookie('token', 'logged_out', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 1000, // 1 second — effectively clears it
  });

  res.status(200).json({ success: true, message: 'Logged out successfully.' });
};

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
exports.getMe = async (req, res, next) => {
  try {
    // req.user is populated by protect middleware
    const user = await User.findById(req.user._id);
    if (!user) return next(AppError.notFound('User not found.'));

    res.status(200).json({
      success: true,
      data: { user: user.toPublicJSON() },
    });
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/users/profile ───────────────────────────────────────────────────
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, avatar } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, phone, avatar },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: { user: user.toPublicJSON() },
    });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/auth/change-password ─────────────────────────────────────────
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!user) return next(AppError.notFound('User not found.'));

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return next(AppError.unauthorized('Current password is incorrect.'));
    }

    user.passwordHash = newPassword; // Pre-save hook rehashes it
    await user.save();

    sendAuthResponse(user, 200, res); // Re-issue cookie with fresh token
  } catch (err) {
    next(err);
  }
};
