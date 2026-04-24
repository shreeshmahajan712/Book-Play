const Turf = require('../models/Turf');
const Booking = require('../models/Booking');
const AppError = require('../utils/AppError');
const cache = require('../utils/cache');

// GET /api/turfs
exports.listTurfs = async (req, res, next) => {
  try {
    const { city, sport, minPrice, maxPrice, page, limit } = req.query;
    const cacheKey = cache.keys.turfList(city, sport, page);
    const cached = await cache.get(cacheKey);
    if (cached) return res.status(200).json({ success: true, fromCache: true, ...cached });

    const filter = { isActive: true };
    if (city) filter.city = city.toLowerCase();
    if (sport) filter.sport = sport;
    if (minPrice || maxPrice) {
      filter.pricePerHour = {};
      if (minPrice) filter.pricePerHour.$gte = Number(minPrice);
      if (maxPrice) filter.pricePerHour.$lte = Number(maxPrice);
    }

    const skip = (page - 1) * limit;
    const [turfs, total] = await Promise.all([
      Turf.find(filter).select('-__v').sort({ averageRating: -1 }).skip(skip).limit(limit).lean(),
      Turf.countDocuments(filter),
    ]);

    const payload = { data: { turfs, total, page, pages: Math.ceil(total / limit) } };
    await cache.set(cacheKey, payload, 600);
    res.status(200).json({ success: true, fromCache: false, ...payload });
  } catch (err) { next(err); }
};

// GET /api/turfs/nearby
exports.nearbyTurfs = async (req, res, next) => {
  try {
    const { lng, lat, radiusKm, sport } = req.query;
    const filter = {
      isActive: true,
      location: { $near: { $geometry: { type: 'Point', coordinates: [lng, lat] }, $maxDistance: radiusKm * 1000 } },
    };
    if (sport) filter.sport = sport;
    const turfs = await Turf.find(filter).limit(20).lean();
    res.status(200).json({ success: true, data: { turfs, count: turfs.length } });
  } catch (err) { next(err); }
};

// GET /api/turfs/my
exports.getMyTurfs = async (req, res, next) => {
  try {
    const turfs = await Turf.find({ ownerId: req.user._id }).sort({ createdAt: -1 }).lean();
    res.status(200).json({ success: true, data: { turfs, count: turfs.length } });
  } catch (err) { next(err); }
};

// GET /api/turfs/:slug
exports.getTurfBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const cacheKey = cache.keys.turfBySlug(slug);
    const cached = await cache.get(cacheKey);
    if (cached) return res.status(200).json({ success: true, fromCache: true, data: { turf: cached } });

    const turf = await Turf.findOne({ slug, isActive: true }).populate('ownerId', 'name email phone').lean();
    if (!turf) return next(AppError.notFound(`No turf found with slug "${slug}".`));

    await cache.set(cacheKey, turf, 300);
    res.status(200).json({ success: true, fromCache: false, data: { turf } });
  } catch (err) { next(err); }
};

// GET /api/turfs/:slug/slots?date=YYYY-MM-DD
exports.getAvailableSlots = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { date } = req.query;

    const turf = await Turf.findOne({ slug, isActive: true });
    if (!turf) return next(AppError.notFound(`No turf found with slug "${slug}".`));

    const cacheKey = cache.keys.turfSlots(turf._id, date);
    const cached = await cache.get(cacheKey);
    if (cached) return res.status(200).json({ success: true, fromCache: true, data: cached });

    const allSlots = turf.generateSlots();
    const bookedSlots = await Booking.find({
      turfId: turf._id,
      date: new Date(date),
      status: { $in: ['Pending', 'Paid'] },
    }).select('startTime status');

    const bookedMap = {};
    bookedSlots.forEach((b) => { bookedMap[b.startTime] = b.status; });

    const day = new Date(date).getDay();
    const isWeekend = day === 0 || day === 6;
    const pricePerSlot = isWeekend && turf.weekendPricePerHour ? turf.weekendPricePerHour : turf.pricePerHour;

    const slots = allSlots.map((startTime) => {
      const [sh, sm] = startTime.split(':').map(Number);
      const endMinutes = sh * 60 + sm + turf.slotDurationMinutes;
      const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;
      const bookedStatus = bookedMap[startTime];
      return { startTime, endTime, price: (pricePerSlot * turf.slotDurationMinutes) / 60, status: bookedStatus || 'Available', isAvailable: !bookedStatus };
    });

    const payload = { slots, date, turfId: turf._id, slotDurationMinutes: turf.slotDurationMinutes };
    await cache.set(cacheKey, payload, 120);
    res.status(200).json({ success: true, fromCache: false, data: payload });
  } catch (err) { next(err); }
};

// POST /api/turfs
exports.createTurf = async (req, res, next) => {
  try {
    const { coordinates, ...rest } = req.body;
    const turf = await Turf.create({ ...rest, location: { type: 'Point', coordinates }, ownerId: req.user._id });
    await cache.delByPattern(`turfs:${rest.city}:*`);
    res.status(201).json({ success: true, data: { turf } });
  } catch (err) { next(err); }
};

// PUT /api/turfs/:id
exports.updateTurf = async (req, res, next) => {
  try {
    const turf = await Turf.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!turf) return next(AppError.notFound('Turf not found.'));
    await Promise.all([cache.delByPattern(`turfs:${turf.city}:*`), cache.del(cache.keys.turfBySlug(turf.slug))]);
    res.status(200).json({ success: true, data: { turf } });
  } catch (err) { next(err); }
};

// DELETE /api/turfs/:id (soft delete)
exports.deleteTurf = async (req, res, next) => {
  try {
    const turf = await Turf.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!turf) return next(AppError.notFound('Turf not found.'));
    await Promise.all([cache.delByPattern(`turfs:${turf.city}:*`), cache.del(cache.keys.turfBySlug(turf.slug))]);
    res.status(200).json({ success: true, message: 'Turf listing deactivated.' });
  } catch (err) { next(err); }
};
