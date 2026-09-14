const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const rideService = require('../services/ride.service');

const updateLocation = asyncHandler(async (req, res) => {
  const { lat, lng } = req.body;
  if (req.user.role === 'DRIVER') {
    await rideService.updateDriverLocation(req.user.id, lat, lng);
  } else {
    await rideService.updateClientLocation(req.user.id, lat, lng);
  }
  sendSuccess(res, { data: { ok: true } });
});

module.exports = { updateLocation };
