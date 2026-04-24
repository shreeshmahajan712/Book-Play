const mongoose = require('mongoose');
const slugify = require('slug');

/**
 * Turf Schema
 * Represents a sports turf/court listing in the marketplace.
 * - GeoJSON Point for location-based ($near, $geoWithin) queries.
 * - Dual pricing: base price + optional weekend premium.
 * - 2dsphere index enables efficient geospatial searches.
 */
const turfSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Turf name is required'],
      trim: true,
      minlength: [3, 'Turf name must be at least 3 characters'],
      maxlength: [100, 'Turf name cannot exceed 100 characters'],
    },

    // URL-friendly identifier — auto-generated from name + random suffix for uniqueness
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
      default: '',
    },

    // ─── Location (GeoJSON) ─────────────────────────────────────────────────
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude] — GeoJSON order
        required: [true, 'Coordinates [lng, lat] are required'],
        validate: {
          validator: (coords) =>
            Array.isArray(coords) &&
            coords.length === 2 &&
            coords[0] >= -180 && coords[0] <= 180 && // longitude
            coords[1] >= -90  && coords[1] <= 90,    // latitude
          message: 'Coordinates must be [longitude, latitude] within valid ranges',
        },
      },
    },

    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      lowercase: true,
      index: true, // Frequently queried — "Turfs in City"
    },

    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
      maxlength: [300, 'Address cannot exceed 300 characters'],
    },

    // ─── Media ──────────────────────────────────────────────────────────────
    // All URLs must point to Cloudinary (enforced by Zod validator on input)
    images: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 10,
        message: 'A turf listing can have at most 10 images',
      },
    },

    // ─── Pricing ────────────────────────────────────────────────────────────
    pricePerHour: {
      type: Number,
      required: [true, 'Price per hour is required'],
      min: [100, 'Minimum price is ₹100/hr'],
      max: [50000, 'Maximum price is ₹50,000/hr'],
    },

    // Optional weekend/peak-hour premium price
    weekendPricePerHour: {
      type: Number,
      default: null,
      min: [100, 'Weekend price minimum is ₹100/hr'],
    },

    // ─── Availability ────────────────────────────────────────────────────────
    // Stored as "HH:MM" 24-hour strings (e.g. "06:00", "23:00")
    openingTime: {
      type: String,
      required: [true, 'Opening time is required'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Opening time must be in HH:MM (24h) format'],
    },

    closingTime: {
      type: String,
      required: [true, 'Closing time is required'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Closing time must be in HH:MM (24h) format'],
    },

    // Slot duration in minutes (30 or 60) — configurable per turf
    slotDurationMinutes: {
      type: Number,
      enum: [30, 60],
      default: 60,
    },

    // ─── Classification ──────────────────────────────────────────────────────
    sport: {
      type: String,
      enum: {
        values: ['Football', 'Cricket', 'Basketball', 'Badminton', 'Tennis', 'Multi-Sport'],
        message: 'Sport must be one of the listed options',
      },
      required: [true, 'Sport type is required'],
    },

    amenities: {
      type: [String],
      default: [],
      // Normalise entries — trim whitespace
      set: (arr) => arr.map((a) => a.trim()),
    },

    // ─── Relations ───────────────────────────────────────────────────────────
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner reference is required'],
      index: true,
    },

    // ─── Status & Ratings ────────────────────────────────────────────────────
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
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
// 2dsphere enables $near, $geoWithin, and $geoIntersects queries
turfSchema.index({ location: '2dsphere' });
turfSchema.index({ city: 1, isActive: 1 });
// Note: slug index is created automatically via `unique: true` in the field definition
turfSchema.index({ ownerId: 1, isActive: 1 });

// ─── Pre-validate Hook: Auto-generate unique slug ─────────────────────────────
turfSchema.pre('validate', async function (next) {
  if (this.isNew && !this.slug) {
    const base = slugify(this.name, { lower: true });
    const suffix = Math.random().toString(36).slice(2, 7); // 5-char random
    this.slug = `${base}-${suffix}`;
  }
  next();
});

// ─── Virtual: Effective price (returns weekend price on Sat/Sun if set) ────────
turfSchema.virtual('effectivePrice').get(function () {
  const day = new Date().getDay(); // 0 = Sunday, 6 = Saturday
  const isWeekend = day === 0 || day === 6;
  return isWeekend && this.weekendPricePerHour
    ? this.weekendPricePerHour
    : this.pricePerHour;
});

// ─── Instance method: generate all available slot labels ─────────────────────
/**
 * Returns an array of "HH:MM" start times for all possible slots today.
 * Does NOT filter booked slots — that is done at the booking controller level.
 */
turfSchema.methods.generateSlots = function () {
  const slots = [];
  const [openH, openM] = this.openingTime.split(':').map(Number);
  const [closeH, closeM] = this.closingTime.split(':').map(Number);
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  for (let m = openMinutes; m + this.slotDurationMinutes <= closeMinutes; m += this.slotDurationMinutes) {
    const hh = String(Math.floor(m / 60)).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    slots.push(`${hh}:${mm}`);
  }

  return slots;
};

const Turf = mongoose.model('Turf', turfSchema);

module.exports = Turf;
