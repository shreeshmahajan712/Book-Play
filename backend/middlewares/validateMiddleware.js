const AppError = require('../utils/AppError');

/**
 * validate — Zod schema validation middleware factory.
 *
 * Validates request body, query, or params against a Zod schema.
 * On failure → passes a 422 AppError to the global error handler.
 * On success → replaces the validated property with the parsed (coerced) data.
 *
 * @param {ZodSchema} schema  - Zod schema to validate against
 * @param {'body'|'query'|'params'} [source='body'] - Part of the request to validate
 *
 * Usage:
 *   router.post('/register', validate(registerSchema), authController.register);
 *   router.get('/',          validate(listTurfsQuerySchema, 'query'), turfController.list);
 */
const validate = (schema, source = 'body') => {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      // Format Zod errors into a readable flat object: { fieldName: 'error message' }
      const formatted = result.error.errors.reduce((acc, issue) => {
        const field = issue.path.join('.') || 'general';
        acc[field] = issue.message;
        return acc;
      }, {});

      return next(
        new AppError(
          `Validation failed: ${result.error.errors[0]?.message || 'Invalid input'}`,
          422,
          { validationErrors: formatted }
        )
      );
    }

    // Replace the original data with the Zod-parsed/coerced version
    req[source] = result.data;
    next();
  };
};

module.exports = { validate };
