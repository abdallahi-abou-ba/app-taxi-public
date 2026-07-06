const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const userService = require('../services/user.service');
const { toPublicUser } = require('../services/auth.service');

const getMe = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: toPublicUser(req.user) });
});

const updateMe = asyncHandler(async (req, res) => {
  const user = await userService.updateProfile(req.user.id, req.body);
  sendSuccess(res, { data: user });
});

const updateAvailability = asyncHandler(async (req, res) => {
  const user = await userService.updateAvailability(req.user, req.body);
  sendSuccess(res, { data: user });
});

const updatePushToken = asyncHandler(async (req, res) => {
  const user = await userService.updatePushToken(req.user.id, req.body.pushToken);
  sendSuccess(res, { data: user });
});

const deleteMe = asyncHandler(async (req, res) => {
  await userService.deleteAccount(req.user.id, req.body.password);
  sendSuccess(res, { data: null });
});

const getReferralInfo = asyncHandler(async (req, res) => {
  const info = await userService.getReferralInfo(req.user.id);
  sendSuccess(res, { data: info });
});

module.exports = { getMe, updateMe, updateAvailability, updatePushToken, deleteMe, getReferralInfo };
