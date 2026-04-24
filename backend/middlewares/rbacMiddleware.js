const AppError = require('../utils/AppError');

/**
 * restrictTo — Role-Based Access Control (RBAC) middleware factory.
 *
 * Usage (chain after `protect`):
 *   router.post('/', protect, restrictTo('Owner', 'Admin'), createTurf);
 *
 * @param  {...string} roles - Allowed roles (e.g. 'Owner', 'Admin')
 * @returns Express middleware
 */
const restrictTo = (...roles) => {
  return (req, _res, next) => {
    // req.user is set by the protect middleware
    if (!req.user) {
      return next(AppError.unauthorized('You must be logged in.'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        AppError.forbidden(
          `Access denied. This action requires one of the following roles: ${roles.join(', ')}.`
        )
      );
    }

    next();
  };
};

/**
 * isOwnerOf — Resource-level ownership check.
 * Ensures the authenticated user owns a resource (or is Admin).
 *
 * @param {Function} getOwnerId - Async function that receives (req) and returns the owner's ObjectId
 *
 * Usage:
 *   router.put('/:id', protect, isOwnerOf(async (req) => {
 *     const turf = await Turf.findById(req.params.id);
 *     return turf?.ownerId;
 *   }), updateTurf);
 */
const isOwnerOf = (getOwnerId) => {
  return async (req, _res, next) => {
    try {
      if (!req.user) return next(AppError.unauthorized('You must be logged in.'));

      // Admins bypass ownership checks
      if (req.user.role === 'Admin') return next();

      const ownerId = await getOwnerId(req);

      if (!ownerId) {
        return next(AppError.notFound('Resource not found.'));
      }

      if (String(ownerId) !== String(req.user._id)) {
        return next(AppError.forbidden('You do not have permission to modify this resource.'));
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = { restrictTo, isOwnerOf };
