const mongoose = require('mongoose');

const COMMISSION_RATE = parseFloat(process.env.COMMISSION_RATE || '0.10');
const PENDING_EXPIRY_MINUTES = 10;

/**
 * Booking Schema
 * 
 * Financial breakdown per booking:
 *   basePrice        = pricePerHour × durationHours
 *   commissionAmount = basePrice × COMMISSION_RATE (default 10%)
 *   totalPrice       = basePrice  (player pays full; commission deducted at settlement)
 *
 * Double-booking prevention:
 *   A sparse compound index on [turfId, date, startTime] for active statuses
 *   (Pending, Paid) ensures no two bookings occupy the same slot.
 *   This is the DB-level safety net — the application layer uses MongoDB
 *   Sessions/Transactions as the primary guard.
 *
 * Pending expiry:
 *   expiresAt = createdAt + 10 minutes.
 *   The cron job (jobs/releaseExpiredBookings.js) sweeps every 10 min and
 *   cancels bookings where status === 'Pending' AND expiresAt < now.
 */
const bookingSchema = new mongoose.Schema(
  {
    turfId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Turf',
      required: [true, 'Turf reference is required'],
      index: true,
    },

    playerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Player reference is required'],
      index: true,
    },

    // Date of the booking (stored at midnight UTC for the given date)
    date: {
      type: Date,
      required: [true, 'Booking date is required'],
    },

    // Stored as "HH:MM" 24-hour strings matching turf slot labels
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Start time must be HH:MM (24h) format'],
    },

    endTime: {
      type: String,
      required: [true, 'End time is required'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'End time must be HH:MM (24h) format'],
    },

    // ─── Financial Fields ───────────────────────────────────────────────────
    basePrice: {
      type: Number,
      required: [true, 'Base price is required'],
      min: [0, 'Base price cannot be negative'],
    },

    // Computed: basePrice × COMMISSION_RATE
    commissionAmount: {
      type: Number,
      required: true,
      min: [0, 'Commission amount cannot be negative'],
    },

    // What the owner receives: basePrice - commissionAmount
    ownerPayout: {
      type: Number,
      required: true,
      min: [0, 'Owner payout cannot be negative'],
    },

    // Total charged to the player (basePrice; commission deducted at settlement)
    totalPrice: {
      type: Number,
      required: [true, 'Total price is required'],
      min: [0, 'Total price cannot be negative'],
    },

    // ─── Status ──────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: {
        values: ['Pending', 'Paid', 'Completed', 'Cancelled'],
        message: 'Status must be Pending, Paid, Completed, or Cancelled',
      },
      default: 'Pending',
      index: true,
    },

    // ─── Payment ─────────────────────────────────────────────────────────────
    // Set by webhook handler when payment.captured event is received
    transactionId: {
      type: String,
      default: null,
      sparse: true, // Indexed but allows multiple null values
    },

    // Razorpay order ID created at booking time; used for payment reconciliation
    razorpayOrderId: {
      type: String,
      default: null,
      sparse: true,
    },

    // ─── Expiry ──────────────────────────────────────────────────────────────
    // Set at creation: createdAt + PENDING_EXPIRY_MINUTES
    // The cron job releases slots where Pending and now > expiresAt
    expiresAt: {
      type: Date,
      default: null,
      index: true, // Needed for efficient cron query
    },

    // ─── Optional: Cancellation reason ───────────────────────────────────────
    cancellationReason: {
      type: String,
      default: null,
      maxlength: [500, 'Cancellation reason cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

/**
 * Partial (sparse) compound index for active bookings only.
 * This is the DB-level double-booking guard:
 * Two bookings with identical (turfId, date, startTime) cannot both have
 * status of Pending or Paid simultaneously.
 *
 * NOTE: MongoDB does NOT support partial index with $in directly in the
 * partialFilterExpression — we use two separate indexes for 'Pending' and 'Paid'.
 */
bookingSchema.index(
  { turfId: 1, date: 1, startTime: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'Pending' },
    name: 'unique_slot_pending',
  }
);

bookingSchema.index(
  { turfId: 1, date: 1, startTime: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'Paid' },
    name: 'unique_slot_paid',
  }
);

// Additional query indexes
bookingSchema.index({ playerId: 1, status: 1 });
bookingSchema.index({ turfId: 1, date: 1, status: 1 });
bookingSchema.index({ expiresAt: 1, status: 1 }); // Cron job query

// ─── Pre-save Hook: Auto-compute financial fields ─────────────────────────────
bookingSchema.pre('save', function (next) {
  if (this.isNew || this.isModified('basePrice')) {
    this.commissionAmount = parseFloat((this.basePrice * COMMISSION_RATE).toFixed(2));
    this.ownerPayout = parseFloat((this.basePrice - this.commissionAmount).toFixed(2));
    this.totalPrice = this.basePrice; // Player pays basePrice; commission is internal
  }

  // Set expiry only for new Pending bookings
  if (this.isNew && this.status === 'Pending') {
    this.expiresAt = new Date(Date.now() + PENDING_EXPIRY_MINUTES * 60 * 1000);
  }

  // Clear expiry once paid (slot is confirmed, no longer auto-cancellable)
  if (this.isModified('status') && this.status === 'Paid') {
    this.expiresAt = null;
  }

  next();
});

// ─── Virtual: Duration in hours ───────────────────────────────────────────────
bookingSchema.virtual('durationHours').get(function () {
  const [startH, startM] = this.startTime.split(':').map(Number);
  const [endH, endM] = this.endTime.split(':').map(Number);
  return ((endH * 60 + endM) - (startH * 60 + startM)) / 60;
});

// ─── Static: Check if a slot is available (outside transaction) ───────────────
/**
 * Returns true if the given slot is free (no Pending or Paid booking).
 * For atomicity, the actual booking creation uses a Mongoose session/transaction.
 * @param {ObjectId} turfId
 * @param {Date}     date
 * @param {string}   startTime  - "HH:MM"
 */
bookingSchema.statics.isSlotAvailable = async function (turfId, date, startTime) {
  const conflict = await this.findOne({
    turfId,
    date,
    startTime,
    status: { $in: ['Pending', 'Paid'] },
  });
  return conflict === null;
};

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
