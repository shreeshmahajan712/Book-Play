const { z } = require('zod');

// ─── Shared Helpers ───────────────────────────────────────────────────────────

/** Validates "HH:MM" 24-hour time strings */
const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:MM 24-hour format (e.g. "09:00")');

/** Validates MongoDB ObjectId format (24 hex chars) */
const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Must be a valid MongoDB ObjectId');

// ─── Create Booking Schema ────────────────────────────────────────────────────
/**
 * Used on: POST /api/bookings
 * The player selects a turfId, a date, and a start time.
 * End time is computed on the backend from slotDurationMinutes.
 */
const createBookingSchema = z
  .object({
    turfId: objectIdSchema.describe('MongoDB ObjectId of the turf'),

    // ISO 8601 date string (e.g. "2025-06-15") — time component ignored
    date: z
      .string({ required_error: 'Booking date is required' })
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
      .refine(
        (d) => {
          const date = new Date(d);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return date >= today;
        },
        { message: 'Booking date cannot be in the past' }
      )
      .refine(
        (d) => {
          const date = new Date(d);
          const maxDate = new Date();
          maxDate.setDate(maxDate.getDate() + 30);
          return date <= maxDate;
        },
        { message: 'Cannot book more than 30 days in advance' }
      ),

    startTime: timeString.describe('Slot start time (HH:MM)'),
  })
  .strict();

// ─── Cancel Booking Schema ────────────────────────────────────────────────────
/**
 * Used on: PATCH /api/bookings/:id/cancel
 */
const cancelBookingSchema = z.object({
  reason: z
    .string()
    .max(500, 'Cancellation reason cannot exceed 500 characters')
    .trim()
    .optional(),
});

// ─── Razorpay Webhook Payload Schema ─────────────────────────────────────────
/**
 * Used on: POST /api/bookings/webhook/razorpay
 * Validates the shape of Razorpay webhook payloads for payment.captured events.
 * HMAC signature verification is done in middleware BEFORE this schema runs.
 */
const razorpayWebhookSchema = z.object({
  event: z.string(),
  payload: z.object({
    payment: z.object({
      entity: z.object({
        id: z.string().describe('Razorpay payment ID (pay_xxx)'),
        order_id: z.string().describe('Razorpay order ID (order_xxx)'),
        amount: z.number().describe('Amount in paise (smallest currency unit)'),
        currency: z.literal('INR'),
        status: z.enum(['captured', 'authorized', 'failed', 'refunded']),
      }),
    }),
  }),
});

// ─── Get Bookings Query Schema ────────────────────────────────────────────────
/**
 * Used on: GET /api/bookings/my?status=&page=&limit=
 * Used on: GET /api/bookings/turf/:turfId?date=&status=
 */
const getBookingsQuerySchema = z.object({
  status: z
    .enum(['Pending', 'Paid', 'Completed', 'Cancelled'])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
    .optional(),
});

// ─── Available Slots Query Schema ─────────────────────────────────────────────
/**
 * Used on: GET /api/turfs/:slug/slots?date=YYYY-MM-DD
 */
const availableSlotsQuerySchema = z.object({
  date: z
    .string({ required_error: 'date query param is required' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .refine(
      (d) => {
        const date = new Date(d);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date >= today;
      },
      { message: 'Date cannot be in the past' }
    ),
});

// ─── Exports ──────────────────────────────────────────────────────────────────
module.exports = {
  createBookingSchema,
  cancelBookingSchema,
  razorpayWebhookSchema,
  getBookingsQuerySchema,
  availableSlotsQuerySchema,
};
