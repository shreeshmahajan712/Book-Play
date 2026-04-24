const { z } = require('zod');

// ─── Shared Helpers ───────────────────────────────────────────────────────────

/** Validates "HH:MM" 24-hour time strings (e.g. "06:00", "23:30") */
const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:MM 24-hour format (e.g. "09:00")');

/** Validates Cloudinary image URLs */
const cloudinaryUrl = z
  .string()
  .url('Image must be a valid URL')
  .regex(/^https:\/\/res\.cloudinary\.com\//, 'Image must be a Cloudinary URL');

// ─── Base Turf Object (plain ZodObject — supports .omit, .partial, .extend) ───
/**
 * IMPORTANT: Keep this as a raw ZodObject, NOT wrapped in .refine().
 * Calling .refine() produces a ZodEffects which does NOT expose .omit()/.partial().
 * createTurfSchema applies refinements on top; updateTurfSchema uses .omit() here.
 */
const baseTurfObject = z.object({
  name: z
    .string({ required_error: 'Turf name is required' })
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name cannot exceed 100 characters')
    .trim(),

  description: z
    .string()
    .max(2000, 'Description cannot exceed 2000 characters')
    .trim()
    .optional()
    .default(''),

  // GeoJSON: [longitude, latitude] — note GeoJSON uses lng first
  coordinates: z
    .tuple([
      z.number().min(-180).max(180, 'Longitude must be between -180 and 180'),
      z.number().min(-90).max(90, 'Latitude must be between -90 and 90'),
    ])
    .describe('[longitude, latitude]'),

  city: z
    .string({ required_error: 'City is required' })
    .min(2, 'City must be at least 2 characters')
    .max(100, 'City cannot exceed 100 characters')
    .trim()
    .toLowerCase(),

  address: z
    .string({ required_error: 'Address is required' })
    .min(5, 'Address must be at least 5 characters')
    .max(300, 'Address cannot exceed 300 characters')
    .trim(),

  images: z
    .array(cloudinaryUrl)
    .max(10, 'A listing can have at most 10 images')
    .default([]),

  pricePerHour: z
    .number({ required_error: 'Price per hour is required' })
    .min(100, 'Minimum price is ₹100/hr')
    .max(50000, 'Maximum price is ₹50,000/hr'),

  weekendPricePerHour: z
    .number()
    .min(100, 'Weekend price minimum is ₹100/hr')
    .optional()
    .nullable()
    .default(null),

  openingTime: timeString.describe('Opening time (HH:MM)'),
  closingTime: timeString.describe('Closing time (HH:MM)'),

  slotDurationMinutes: z
    .union([z.literal(30), z.literal(60)])
    .default(60)
    .describe('Duration of each bookable slot (30 or 60 minutes)'),

  sport: z.enum(
    ['Football', 'Cricket', 'Basketball', 'Badminton', 'Tennis', 'Multi-Sport'],
    { required_error: 'Sport type is required' }
  ),

  amenities: z
    .array(z.string().trim().min(1, 'Amenity cannot be empty'))
    .max(20, 'Cannot list more than 20 amenities')
    .default([]),
});

// ─── Create Turf Schema ───────────────────────────────────────────────────────
/**
 * Used on: POST /api/turfs
 * Wraps baseTurfObject with cross-field refinements (returns ZodEffects).
 */
const createTurfSchema = baseTurfObject
  .refine(
    (data) => {
      // Closing time must be strictly after opening time
      const [openH, openM] = data.openingTime.split(':').map(Number);
      const [closeH, closeM] = data.closingTime.split(':').map(Number);
      return closeH * 60 + closeM > openH * 60 + openM;
    },
    { message: 'Closing time must be after opening time', path: ['closingTime'] }
  )
  .refine(
    (data) => {
      // Weekend price must be >= weekday price if provided
      if (data.weekendPricePerHour !== null && data.weekendPricePerHour !== undefined) {
        return data.weekendPricePerHour >= data.pricePerHour;
      }
      return true;
    },
    {
      message: 'Weekend price should be equal to or greater than the weekday price',
      path: ['weekendPricePerHour'],
    }
  );

// ─── Update Turf Schema ───────────────────────────────────────────────────────
/**
 * Used on: PUT /api/turfs/:id
 * Uses baseTurfObject (ZodObject) directly — NOT createTurfSchema (ZodEffects).
 * coordinates & sport are immutable after creation.
 */
const updateTurfSchema = baseTurfObject
  .omit({ coordinates: true, sport: true })
  .partial()
  .extend({
    isActive: z.boolean().optional(),
  })
  .strict();

// ─── Geo-Search Query Schema ──────────────────────────────────────────────────
/**
 * Used on: GET /api/turfs/nearby?lng=&lat=&radiusKm=&sport=
 */
const nearbyQuerySchema = z.object({
  lng: z.coerce.number().min(-180).max(180, 'Invalid longitude'),
  lat: z.coerce.number().min(-90).max(90, 'Invalid latitude'),
  radiusKm: z.coerce.number().min(1).max(100).default(10),
  sport: z
    .enum(['Football', 'Cricket', 'Basketball', 'Badminton', 'Tennis', 'Multi-Sport'])
    .optional(),
  city: z.string().trim().toLowerCase().optional(),
});

// ─── List Turfs Query Schema ──────────────────────────────────────────────────
/**
 * Used on: GET /api/turfs?city=&sport=&minPrice=&maxPrice=&page=&limit=
 */
const listTurfsQuerySchema = z.object({
  city: z.string().trim().toLowerCase().optional(),
  sport: z
    .enum(['Football', 'Cricket', 'Basketball', 'Badminton', 'Tennis', 'Multi-Sport'])
    .optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().max(50000).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

// ─── Exports ──────────────────────────────────────────────────────────────────
module.exports = {
  baseTurfObject,       // Raw ZodObject (for .omit / .extend in tests or other schemas)
  createTurfSchema,     // ZodEffects — use for POST /api/turfs
  updateTurfSchema,     // ZodObject  — use for PUT  /api/turfs/:id
  nearbyQuerySchema,
  listTurfsQuerySchema,
};
