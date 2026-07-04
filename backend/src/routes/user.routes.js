const { Router } = require('express');
const userController = require('../controllers/user.controller');
const validate = require('../middleware/validate.middleware');
const { updateProfileSchema, updateAvailabilitySchema, updatePushTokenSchema, deleteAccountSchema } = require('../validators/user.validators');
const { requireAuth } = require('../middleware/auth.middleware');

const router = Router();

router.use(requireAuth);

router.get('/me', userController.getMe);
router.patch('/me', validate(updateProfileSchema), userController.updateMe);
router.delete('/me', validate(deleteAccountSchema), userController.deleteMe);
router.patch('/me/availability', validate(updateAvailabilitySchema), userController.updateAvailability);
router.patch('/me/push-token', validate(updatePushTokenSchema), userController.updatePushToken);
router.get('/me/referrals', userController.getReferralInfo);

module.exports = router;
