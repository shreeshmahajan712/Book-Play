const crypto = require('crypto');
const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const Turf = require('../models/Turf');
const Booking = require('../models/Booking');
const AppError = require('../utils/AppError');
const cache = require('../utils/cache');
const logger = require('../utils/logger');

// ─── Razorpay client (lazy-initialised) ──────────────────────────────────────
let razorpay;
const getRazorpay = () => {
  if (!razorpay) {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpay;
};

// ─── POST /api/bookings ───────────────────────────────────────────────────────
/**
 * Atomic Booking Creation
 *
 * Flow:
 *  1. Validate turfId, date, startTime (done by Zod middleware before this runs)
 *  2. Open a MongoDB Session & start a Transaction
 *  3. Lock-check: query for existing Pending/Paid booking for the same slot
 *     (inside the session — prevents TOCTOU race conditions)
 *  4. Compute price from Turf.pricePerHour × slotDurationMinutes
 *  5. Create the Booking document (status=Pending, expiresAt=now+10min)
 *  6. Create a Razorpay order for the payment amount
 *  7. Attach razorpayOrderId to the Booking & commit the transaction
 *  8. Return the booking + Razorpay order details to the client
 *
 * If ANY step fails → abortTransaction() rolls everything back.
 */
exports.createBooking = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { turfId, date, startTime } = req.body;
    const playerId = req.user._id;

    // ── 1. Load Turf (inside session for consistent read) ───────────────────
    const turf = await Turf.findById(turfId).session(session);
    if (!turf || !turf.isActive) {
      await session.abortTransaction();
      return next(AppError.notFound('Turf not found or no longer active.'));
    }

    // ── 2. Validate that startTime is a valid slot for this turf ────────────
    const validSlots = turf.generateSlots();
    if (!validSlots.includes(startTime)) {
      await session.abortTransaction();
      return next(AppError.badRequest(
        `"${startTime}" is not a valid slot. Valid slots start at: ${validSlots.slice(0, 3).join(', ')}…`
      ));
    }

    // ── 3. Compute endTime & price ───────────────────────────────────────────
    const [sh, sm] = startTime.split(':').map(Number);
    const endMinutes = sh * 60 + sm + turf.slotDurationMinutes;
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

    const bookingDate = new Date(date);
    const day = new Date(date).getDay();
    const isWeekend = day === 0 || day === 6;
    const pricePerHour = isWeekend && turf.weekendPricePerHour
      ? turf.weekendPricePerHour
      : turf.pricePerHour;
    const basePrice = parseFloat((pricePerHour * turf.slotDurationMinutes / 60).toFixed(2));
    const commissionRate = parseFloat(process.env.COMMISSION_RATE || '0.10');
    const commissionAmount = parseFloat((basePrice * commissionRate).toFixed(2));
    const ownerPayout = parseFloat((basePrice - commissionAmount).toFixed(2));

    // ── 4. Atomic double-booking check inside the transaction ────────────────
    const conflict = await Booking.findOne({
      turfId,
      date: bookingDate,
      startTime,
      status: { $in: ['Pending', 'Paid'] },
    }).session(session);

    if (conflict) {
      await session.abortTransaction();
      return next(AppError.conflict(
        `The ${startTime} slot on ${date} is already booked. Please choose a different time.`
      ));
    }

    // ── 5. Create Razorpay order ─────────────────────────────────────────────
    let razorpayOrder;
    try {
      razorpayOrder = await getRazorpay().orders.create({
        amount: Math.round(basePrice * 100), // Razorpay uses paise (1 INR = 100 paise)
        currency: 'INR',
        receipt: `booking_${playerId}_${Date.now()}`,
        notes: { turfId: String(turfId), date, startTime, playerId: String(playerId) },
      });
    } catch (rzpErr) {
      await session.abortTransaction();
      logger.error('Razorpay order creation failed', rzpErr);
      return next(AppError.internal('Payment gateway error. Please try again.'));
    }

    // ── 6. Create Booking (Pending) ──────────────────────────────────────────
    const [booking] = await Booking.create(
      [{
        turfId,
        playerId,
        date: bookingDate,
        startTime,
        endTime,
        basePrice,
        commissionAmount,
        ownerPayout,
        totalPrice: basePrice,
        status: 'Pending',
        razorpayOrderId: razorpayOrder.id,
      }],
      { session }
    );

    // ── 7. Commit ────────────────────────────────────────────────────────────
    await session.commitTransaction();

    // Bust slot cache so the slot immediately shows as Pending to other users
    await cache.del(cache.keys.turfSlots(turfId, date));

    res.status(201).json({
      success: true,
      data: {
        booking,
        razorpay: {
          orderId: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          keyId: process.env.RAZORPAY_KEY_ID,
        },
      },
    });
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};

// ─── POST /api/bookings/webhook/razorpay ──────────────────────────────────────
/**
 * Razorpay Webhook Handler
 *
 * Security:
 *   - HMAC-SHA256 signature verification against RAZORPAY_WEBHOOK_SECRET
 *   - Webhook body MUST be raw (not parsed by express.json) — see route config
 *
 * On payment.captured:
 *   1. Verify signature
 *   2. Find booking by razorpayOrderId
 *   3. Update status → Paid, set transactionId, clear expiresAt
 */
exports.razorpayWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.rawBody; // Set by express.json verify callback (see server.js)

    if (!signature || !rawBody) {
      return next(AppError.badRequest('Missing webhook signature or body.'));
    }

    // Verify HMAC-SHA256 signature
    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      logger.warn('Razorpay webhook: invalid signature');
      return next(AppError.unauthorized('Invalid webhook signature.'));
    }

    const { event, payload } = req.body;

    // Only handle payment captured events
    if (event !== 'payment.captured') {
      return res.status(200).json({ received: true, processed: false });
    }

    const { id: transactionId, order_id: razorpayOrderId } = payload.payment.entity;

    const booking = await Booking.findOne({ razorpayOrderId });
    if (!booking) {
      logger.warn(`Webhook: no booking found for order ${razorpayOrderId}`);
      return res.status(200).json({ received: true, processed: false });
    }

    if (booking.status !== 'Pending') {
      // Already processed (idempotency guard)
      return res.status(200).json({ received: true, processed: false, reason: 'Already processed' });
    }

    booking.status = 'Paid';
    booking.transactionId = transactionId;
    booking.expiresAt = null; // Confirmed — no longer expires
    await booking.save();

    // Bust slot cache
    const dateStr = booking.date.toISOString().slice(0, 10);
    await cache.del(cache.keys.turfSlots(booking.turfId, dateStr));

    logger.info(`Booking ${booking._id} confirmed — txn: ${transactionId}`);
    res.status(200).json({ received: true, processed: true });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/bookings/my ─────────────────────────────────────────────────────
exports.getMyBookings = async (req, res, next) => {
  try {
    const { status, page, limit } = req.query;
    const filter = { playerId: req.user._id };
    if (status) filter.status = status;

    const skip = (page - 1) * limit;
    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate('turfId', 'name slug city images pricePerHour')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Booking.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: { bookings, total, page, pages: Math.ceil(total / limit) },
    });
  } catch (err) { next(err); }
};

// ─── GET /api/bookings/turf/:turfId ──────────────────────────────────────────
exports.getTurfBookings = async (req, res, next) => {
  try {
    const { date, status, page, limit } = req.query;
    const filter = { turfId: req.params.turfId };
    if (date) filter.date = new Date(date);
    if (status) filter.status = status;

    const skip = (page - 1) * limit;
    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate('playerId', 'name email phone')
        .sort({ date: 1, startTime: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Booking.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: { bookings, total, page, pages: Math.ceil(total / limit) },
    });
  } catch (err) { next(err); }
};

// ─── PATCH /api/bookings/:id/cancel ──────────────────────────────────────────
exports.cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return next(AppError.notFound('Booking not found.'));

    // Only the player who made it or an Admin can cancel
    const isOwner = String(booking.playerId) === String(req.user._id);
    const isAdmin = req.user.role === 'Admin';
    if (!isOwner && !isAdmin) return next(AppError.forbidden('You cannot cancel this booking.'));

    if (!['Pending', 'Paid'].includes(booking.status)) {
      return next(AppError.badRequest(`Cannot cancel a booking with status "${booking.status}".`));
    }

    booking.status = 'Cancelled';
    booking.cancellationReason = req.body.reason || null;
    await booking.save();

    // Release slot cache
    const dateStr = booking.date.toISOString().slice(0, 10);
    await cache.del(cache.keys.turfSlots(booking.turfId, dateStr));

    res.status(200).json({ success: true, data: { booking } });
  } catch (err) { next(err); }
};

// ─── GET /api/bookings/revenue (Owner dashboard) ─────────────────────────────
exports.getOwnerRevenue = async (req, res, next) => {
  try {
    // Get all turfs owned by this user
    const ownerTurfIds = await Turf.find({ ownerId: req.user._id, isActive: true }).distinct('_id');

    const [summary] = await Booking.aggregate([
      { $match: { turfId: { $in: ownerTurfIds }, status: { $in: ['Paid', 'Completed'] } } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$basePrice' },
          totalCommission: { $sum: '$commissionAmount' },
          totalOwnerPayout: { $sum: '$ownerPayout' },
          totalBookings: { $count: {} },
        },
      },
    ]);

    const monthly = await Booking.aggregate([
      { $match: { turfId: { $in: ownerTurfIds }, status: { $in: ['Paid', 'Completed'] } } },
      {
        $group: {
          _id: { year: { $year: '$date' }, month: { $month: '$date' } },
          revenue: { $sum: '$basePrice' },
          bookings: { $count: {} },
        },
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 },
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: summary || { totalRevenue: 0, totalCommission: 0, totalOwnerPayout: 0, totalBookings: 0 },
        monthly,
      },
    });
  } catch (err) { next(err); }
};
