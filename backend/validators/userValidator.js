const { z } = require('zod');

// ─── Shared sub-schemas ───────────────────────────────────────────────────────

const emailSchema = z
  .string({ required_error: 'Email is required' })
  .email('Must be a valid email address')
  .toLowerCase()
  .trim();

const passwordSchema = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password cannot exceed 128 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()\-_=+])/,
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  );

const phoneSchema = z
  .string()
  .regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number')
  .optional();

// ─── Register Schema ──────────────────────────────────────────────────────────
/**
 * Used on: POST /api/auth/register
 */
const registerSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .min(2, 'Name must be at least 2 characters')
    .max(60, 'Name cannot exceed 60 characters')
    .trim(),

  email: emailSchema,

  password: passwordSchema,

  role: z
    .enum(['Player', 'Owner'], {
      errorMap: () => ({ message: 'Role must be Player or Owner' }),
    })
    .default('Player'),

  phone: phoneSchema,
});

// ─── Login Schema ─────────────────────────────────────────────────────────────
/**
 * Used on: POST /api/auth/login
 */
const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
});

// ─── Update Profile Schema ────────────────────────────────────────────────────
/**
 * Used on: PUT /api/users/profile
 */
const updateProfileSchema = z
  .object({
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(60, 'Name cannot exceed 60 characters')
      .trim()
      .optional(),

    phone: phoneSchema,

    avatar: z
      .string()
      .url('Avatar must be a valid URL')
      .regex(/^https:\/\/res\.cloudinary\.com\//, 'Avatar must be a Cloudinary URL')
      .optional()
      .nullable(),
  })
  .strict(); // Reject any extra fields not defined above

// ─── Change Password Schema ───────────────────────────────────────────────────
const changePasswordSchema = z
  .object({
    currentPassword: z.string({ required_error: 'Current password is required' }).min(1),
    newPassword: passwordSchema,
    confirmPassword: z.string({ required_error: 'Confirm password is required' }).min(1),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// ─── Exports ──────────────────────────────────────────────────────────────────
module.exports = {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
};
