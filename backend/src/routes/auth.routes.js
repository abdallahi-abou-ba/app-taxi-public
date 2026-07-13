const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const validate = require('../middleware/validate.middleware');
const {
  registerSchema,
  loginSchema,
  refreshSchema,
  requestOtpSchema,
  verifyOtpSchema,
  completeRegistrationSchema,
} = require('../validators/auth.validators');
const { authRateLimiter } = require('../middleware/rateLimit.middleware');

const router = Router();

router.use(authRateLimiter);

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshSchema), authController.refresh);
router.post('/logout', validate(refreshSchema), authController.logout);
router.post('/request-otp', validate(requestOtpSchema), authController.requestOtp);
router.post('/verify-otp', validate(verifyOtpSchema), authController.verifyOtp);
router.post('/complete-registration', validate(completeRegistrationSchema), authController.completeRegistration);

module.exports = router;
