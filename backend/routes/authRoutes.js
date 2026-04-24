const router = require('express').Router();
const authController = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validateMiddleware');
const { authLimiter } = require('../middlewares/rateLimiter');
const { registerSchema, loginSchema, updateProfileSchema, changePasswordSchema } = require('../validators/userValidator');

// Public
router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login',    authLimiter, validate(loginSchema),    authController.login);
router.post('/logout',   authController.logout);

// Protected
router.get('/me',                    protect, authController.getMe);
router.put('/profile',               protect, validate(updateProfileSchema), authController.updateProfile);
router.patch('/change-password',     protect, validate(changePasswordSchema), authController.changePassword);

module.exports = router;
