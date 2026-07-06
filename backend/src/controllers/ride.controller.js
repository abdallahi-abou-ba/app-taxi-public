const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const rideService = require('../services/ride.service');

const requestRide = asyncHandler(async (req, res) => {
  const ride = await rideService.requestRide(req.user.id, req.body);
  sendSuccess(res, { data: ride, status: 201 });
});

const scheduleRide = asyncHandler(async (req, res) => {
  const ride = await rideService.scheduleRide(req.user.id, req.body);
  sendSuccess(res, { data: ride, status: 201 });
});

const listScheduledRides = asyncHandler(async (req, res) => {
  const rides = await rideService.listScheduledRides(req.user.id);
  sendSuccess(res, { data: rides });
});

const getRide = asyncHandler(async (req, res) => {
  const ride = await rideService.getRideById(req.user.id, req.params.id);
  sendSuccess(res, { data: ride });
});

const listRides = asyncHandler(async (req, res) => {
  const rides = await rideService.listRides(req.user.id);
  sendSuccess(res, { data: rides });
});

const getActiveRide = asyncHandler(async (req, res) => {
  const ride = await rideService.getActiveRide(req.user.id);
  sendSuccess(res, { data: ride });
});

const acceptRide = asyncHandler(async (req, res) => {
  const ride = await rideService.acceptRide(req.user.id, req.params.id);
  sendSuccess(res, { data: ride });
});

const arriveRide = asyncHandler(async (req, res) => {
  const ride = await rideService.arriveRide(req.user.id, req.params.id);
  sendSuccess(res, { data: ride });
});

const startRide = asyncHandler(async (req, res) => {
  const ride = await rideService.startRide(req.user.id, req.params.id);
  sendSuccess(res, { data: ride });
});

const completeRide = asyncHandler(async (req, res) => {
  const ride = await rideService.completeRide(req.user.id, req.params.id);
  sendSuccess(res, { data: ride });
});

const cancelRide = asyncHandler(async (req, res) => {
  const ride = await rideService.cancelRide(req.user.id, req.user.role, req.params.id, req.body.reason);
  sendSuccess(res, { data: ride });
});

const rateRide = asyncHandler(async (req, res) => {
  const ride = await rideService.rateRide(req.user.id, req.user.role, req.params.id, req.body);
  sendSuccess(res, { data: ride });
});

const markRidePaid = asyncHandler(async (req, res) => {
  const ride = await rideService.markRidePaid(req.user.id, req.params.id);
  sendSuccess(res, { data: ride });
});

const createCheckoutSession = asyncHandler(async (req, res) => {
  const url = await rideService.createCardCheckoutSession(req.user.id, req.params.id, req.body);
  sendSuccess(res, { data: { url } });
});

const hideFromHistory = asyncHandler(async (req, res) => {
  const result = await rideService.hideRideFromHistory(req.user.id, req.user.role, req.params.id);
  sendSuccess(res, { data: result });
});

const getStats = asyncHandler(async (req, res) => {
  const stats = await rideService.getStats(req.user.id, req.user.role);
  sendSuccess(res, { data: stats });
});

const estimateRide = asyncHandler(async (req, res) => {
  const { pickupLat, pickupLng, destinationLat, destinationLng } = req.query;
  const { distanceKm, durationMin, estimatedFare } = await rideService.computeRouteAndFare(
    pickupLat,
    pickupLng,
    destinationLat,
    destinationLng
  );
  sendSuccess(res, { data: { distanceKm, durationMin, estimatedFare } });
});

module.exports = {
  requestRide,
  scheduleRide,
  listScheduledRides,
  getRide,
  listRides,
  getActiveRide,
  acceptRide,
  arriveRide,
  startRide,
  completeRide,
  cancelRide,
  rateRide,
  markRidePaid,
  createCheckoutSession,
  hideFromHistory,
  getStats,
  estimateRide,
};
