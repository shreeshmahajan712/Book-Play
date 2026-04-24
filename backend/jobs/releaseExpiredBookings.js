const cron = require('node-cron');
const Booking = require('../models/Booking');
const cache = require('../utils/cache');
const logger = require('../utils/logger');

/**
 * Release Expired Pending Bookings — Cron Job
 *
 * Runs every 10 minutes.
 * Finds all bookings where:
 *   - status === 'Pending'
 *   - expiresAt < now  (payment window elapsed)
 *
 * Marks them 'Cancelled' and busts their slot cache so the
 * time slot becomes Available again for new bookings.
 *
 * Why this matters:
 *   When a user clicks a slot and initiates payment, we create a Pending
 *   booking that blocks the slot. If they abandon the payment, the slot would
 *   remain blocked forever without this job.
 */
const startReleaseJob = () => {
  // '*/10 * * * *' = every 10 minutes
  cron.schedule('*/10 * * * *', async () => {
    logger.info('[Cron] Running expired booking cleanup...');

    try {
      const expired = await Booking.find({
        status: 'Pending',
        expiresAt: { $lt: new Date() },
      }).lean();

      if (expired.length === 0) {
        logger.info('[Cron] No expired bookings found.');
        return;
      }

      // Bulk-update to Cancelled
      const ids = expired.map((b) => b._id);
      await Booking.updateMany(
        { _id: { $in: ids } },
        { $set: { status: 'Cancelled', cancellationReason: 'Payment timeout — auto-cancelled' } }
      );

      // Bust slot cache for each released slot
      const cacheDeletes = expired.map((b) => {
        const dateStr = new Date(b.date).toISOString().slice(0, 10);
        return cache.del(cache.keys.turfSlots(b.turfId, dateStr));
      });
      await Promise.allSettled(cacheDeletes);

      logger.info(`[Cron] Released ${expired.length} expired slot(s): ${ids.join(', ')}`);
    } catch (err) {
      logger.error('[Cron] Expired booking cleanup failed:', err);
    }
  });

  logger.info('[Cron] Expired booking release job scheduled (every 10 min)');
};

module.exports = { startReleaseJob };
