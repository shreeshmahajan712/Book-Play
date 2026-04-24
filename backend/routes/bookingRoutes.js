const router = require('express').Router();
const bookingController = require('../controllers/bookingController');
const { protect } = require('../middlewares/authMiddleware');
const { restrictTo } = require('../middlewares/rbacMiddleware');
const { validate } = require('../middlewares/validateMiddleware');
const { bookingLimiter, apiLimiter } = require('../middlewares/rateLimiter');
const { createBookingSchema, cancelBookingSchema, getBookingsQuerySchema } = require('../validators/bookingValidator');

// ── Razorpay Webhook — must be RAW body (registered before express.json in server.js) ──
// Route: POST /api/bookings/webhook/razorpay
// NOTE: This route is mounted separately in server.js with raw body parsing.
//       It is listed here for documentation; server.js mounts it directly.

// ── Player routes ─────────────────────────────────────────────────────────────
router.post(
  '/',
  protect,
  restrictTo('Player'),
  bookingLimiter,
  validate(createBookingSchema),
  bookingController.createBooking
);

router.get(
  '/my',
  protect,
  validate(getBookingsQuerySchema, 'query'),
  bookingController.getMyBookings
);

router.patch(
  '/:id/cancel',
  protect,
  validate(cancelBookingSchema),
  bookingController.cancelBooking
);

// ── Owner routes ──────────────────────────────────────────────────────────────
router.get(
  '/turf/:turfId',
  protect,
  restrictTo('Owner', 'Admin'),
  validate(getBookingsQuerySchema, 'query'),
  bookingController.getTurfBookings
);

// ── Owner Revenue Dashboard ───────────────────────────────────────────────────
router.get(
  '/revenue',
  protect,
  restrictTo('Owner', 'Admin'),
  bookingController.getOwnerRevenue
);

module.exports = router;
