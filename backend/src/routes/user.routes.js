const { Router } = require('express');
const userController = require('../controllers/user.controller');
const validate = require('../middleware/validate.middleware');
const {
  updateProfileSchema,
  updateAvailabilitySchema,
  updatePushTokenSchema,
  deleteAccountSchema,
  requestPhoneOtpSchema,
  verifyPhoneOtpSchema,
} = require('../validators/user.validators');
const { documentTypeParamSchema } = require('../validators/driverDocument.validators');
const { settlementIdParamSchema, declareSettlementPaidSchema } = require('../validators/settlement.validators');
const { createTopUpSchema } = require('../validators/wallet.validators');
const { listNotificationsQuerySchema } = require('../validators/notification.validators');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const { uploadDocument, uploadAvatar } = require('../middleware/upload.middleware');

const router = Router();

router.use(requireAuth);

router.get('/me', userController.getMe);
router.patch('/me', validate(updateProfileSchema), userController.updateMe);
router.delete('/me', validate(deleteAccountSchema), userController.deleteMe);
router.patch('/me/availability', validate(updateAvailabilitySchema), userController.updateAvailability);
router.patch('/me/push-token', validate(updatePushTokenSchema), userController.updatePushToken);
router.post('/me/phone/request-otp', validate(requestPhoneOtpSchema), userController.requestPhoneOtp);
router.post('/me/phone/verify-otp', validate(verifyPhoneOtpSchema), userController.verifyPhoneOtp);
router.get('/me/referrals', userController.getReferralInfo);
router.get('/me/documents', userController.getMyDocuments);
router.post(
  '/me/documents/:type',
  validate(documentTypeParamSchema, 'params'),
  uploadDocument,
  userController.uploadMyDocument
);
router.get('/me/avatar', userController.getMyAvatarFile);
router.post('/me/avatar', uploadAvatar, userController.uploadMyAvatar);
router.delete('/me/avatar', userController.deleteMyAvatar);
router.get('/me/settlements', userController.getMySettlements);
router.patch(
  '/me/settlements/:id/declare-paid',
  validate(settlementIdParamSchema, 'params'),
  validate(declareSettlementPaidSchema, 'body'),
  userController.declareMySettlementPaid
);
router.get('/me/wallet/topup-info', requireRole('DRIVER'), userController.getWalletTopUpInfo);
router.get('/me/wallet/topups', requireRole('DRIVER'), userController.getMyWalletTopUps);
router.post('/me/wallet/topups', requireRole('DRIVER'), validate(createTopUpSchema), userController.createMyWalletTopUp);
router.get('/me/notifications', validate(listNotificationsQuerySchema, 'query'), userController.getMyNotifications);
router.patch('/me/notifications/read-all', userController.markMyNotificationsRead);

module.exports = router;
