const router = require('express').Router();
const turfController = require('../controllers/turfController');
const { protect } = require('../middlewares/authMiddleware');
const { restrictTo, isOwnerOf } = require('../middlewares/rbacMiddleware');
const { validate } = require('../middlewares/validateMiddleware');
const { apiLimiter } = require('../middlewares/rateLimiter');
const { createTurfSchema, updateTurfSchema, nearbyQuerySchema, listTurfsQuerySchema } = require('../validators/turfValidator');
const { availableSlotsQuerySchema } = require('../validators/bookingValidator');
const Turf = require('../models/Turf');

// Apply general rate limiter to all turf routes
router.use(apiLimiter);

// ── Public routes ─────────────────────────────────────────────────────────────
router.get('/',        validate(listTurfsQuerySchema, 'query'), turfController.listTurfs);
router.get('/nearby',  validate(nearbyQuerySchema, 'query'),    turfController.nearbyTurfs);

// IMPORTANT: /my must be declared before /:slug to avoid "my" being treated as a slug
router.get('/my',      protect, restrictTo('Owner', 'Admin'),   turfController.getMyTurfs);

router.get('/:slug',   turfController.getTurfBySlug);
router.get('/:slug/slots', validate(availableSlotsQuerySchema, 'query'), turfController.getAvailableSlots);

// ── Protected: Owner/Admin only ───────────────────────────────────────────────
router.post(
  '/',
  protect,
  restrictTo('Owner', 'Admin'),
  validate(createTurfSchema),
  turfController.createTurf
);

router.put(
  '/:id',
  protect,
  restrictTo('Owner', 'Admin'),
  isOwnerOf(async (req) => {
    const turf = await Turf.findById(req.params.id).select('ownerId');
    return turf?.ownerId;
  }),
  validate(updateTurfSchema),
  turfController.updateTurf
);

router.delete(
  '/:id',
  protect,
  restrictTo('Owner', 'Admin'),
  isOwnerOf(async (req) => {
    const turf = await Turf.findById(req.params.id).select('ownerId');
    return turf?.ownerId;
  }),
  turfController.deleteTurf
);

module.exports = router;
