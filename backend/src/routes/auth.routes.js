const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const validate = require('../middleware/validate.middleware');
const { registerSchema, loginSchema, refreshSchema } = require('../validators/auth.validators');
const { authRateLimiter } = require('../middleware/rateLimit.middleware');

const router = Router();

router.use(authRateLimiter);

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshSchema), authController.refresh);
router.post('/logout', validate(refreshSchema), authController.logout);

module.exports = router;
