const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const vehicleService = require('../services/vehicle.service');

const listVehicles = asyncHandler(async (req, res) => {
  const vehicles = await vehicleService.listVehicles(req.query);
  sendSuccess(res, { data: vehicles });
});

const getVehicle = asyncHandler(async (req, res) => {
  const vehicle = await vehicleService.getVehicleById(req.params.id);
  sendSuccess(res, { data: vehicle });
});

const createVehicle = asyncHandler(async (req, res) => {
  const vehicle = await vehicleService.createVehicle(req.body);
  sendSuccess(res, { data: vehicle, status: 201 });
});

const updateVehicle = asyncHandler(async (req, res) => {
  const vehicle = await vehicleService.updateVehicle(req.params.id, req.body);
  sendSuccess(res, { data: vehicle });
});

const archiveVehicle = asyncHandler(async (req, res) => {
  await vehicleService.archiveVehicle(req.params.id);
  sendSuccess(res, { data: { id: req.params.id } });
});

const assignVehicle = asyncHandler(async (req, res) => {
  const vehicle = await vehicleService.assignVehicle(req.params.id, req.body.driverId);
  sendSuccess(res, { data: vehicle });
});

const unassignVehicle = asyncHandler(async (req, res) => {
  const vehicle = await vehicleService.unassignVehicle(req.params.id);
  sendSuccess(res, { data: vehicle });
});

module.exports = { listVehicles, getVehicle, createVehicle, updateVehicle, archiveVehicle, assignVehicle, unassignVehicle };
