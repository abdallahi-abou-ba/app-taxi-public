const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const userService = require('../services/user.service');
const driverDocumentService = require('../services/driverDocument.service');
const userAvatarService = require('../services/userAvatar.service');
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

const getMyDocuments = asyncHandler(async (req, res) => {
  const documents = await driverDocumentService.listDocumentStatus(req.user.id);
  sendSuccess(res, { data: documents });
});

const uploadMyDocument = asyncHandler(async (req, res) => {
  const document = await driverDocumentService.upsertDocument(req.user, req.params.type, req.file);
  sendSuccess(res, { data: document });
});

const getMyAvatarFile = asyncHandler(async (req, res) => {
  const avatar = await userAvatarService.getAvatarFile(req.user.id);
  res.set('Content-Type', avatar.mimeType);
  // Prisma returns a Bytes column as a plain Uint8Array, not a real Node
  // Buffer - res.send() only streams raw bytes for Buffer.isBuffer().
  res.send(Buffer.from(avatar.data));
});

const uploadMyAvatar = asyncHandler(async (req, res) => {
  const avatar = await userAvatarService.upsertAvatar(req.user.id, req.file);
  sendSuccess(res, { data: avatar });
});

const deleteMyAvatar = asyncHandler(async (req, res) => {
  await userAvatarService.deleteAvatar(req.user.id);
  sendSuccess(res, { data: null });
});

module.exports = {
  getMe,
  updateMe,
  updateAvailability,
  updatePushToken,
  deleteMe,
  getReferralInfo,
  getMyDocuments,
  uploadMyDocument,
  getMyAvatarFile,
  uploadMyAvatar,
  deleteMyAvatar,
};
