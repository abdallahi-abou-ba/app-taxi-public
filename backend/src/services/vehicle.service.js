const prisma = require('../lib/prisma');
const AppError = require('../utils/appError');

const VEHICLE_INCLUDE = {
  currentDriver: { select: { id: true, fullName: true, phone: true } },
};

async function assertPlateAvailable(plate, excludeId) {
  const existing = await prisma.vehicle.findUnique({ where: { plate } });
  if (existing && existing.id !== excludeId) {
    throw new AppError('A vehicle with this plate already exists', 409, 'CONFLICT');
  }
}

async function findVehicleOrThrow(vehicleId) {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId }, include: VEHICLE_INCLUDE });
  if (!vehicle) {
    throw new AppError('Vehicle not found', 404, 'NOT_FOUND');
  }
  return vehicle;
}

async function listVehicles({ status, driverId }) {
  return prisma.vehicle.findMany({
    where: { ...(status && { status }), ...(driverId && { currentDriverId: driverId }) },
    include: VEHICLE_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });
}

async function getVehicleById(vehicleId) {
  const vehicle = await findVehicleOrThrow(vehicleId);
  const assignments = await prisma.vehicleAssignment.findMany({
    where: { vehicleId },
    orderBy: { startDate: 'desc' },
    include: { driver: { select: { id: true, fullName: true } } },
  });
  return { ...vehicle, assignments };
}

async function createVehicle(input) {
  await assertPlateAvailable(input.plate);
  const vehicle = await prisma.vehicle.create({ data: input, include: VEHICLE_INCLUDE });
  return vehicle;
}

async function updateVehicle(vehicleId, updates) {
  await findVehicleOrThrow(vehicleId);
  if (updates.plate) {
    await assertPlateAvailable(updates.plate, vehicleId);
  }
  return prisma.vehicle.update({ where: { id: vehicleId }, data: updates, include: VEHICLE_INCLUDE });
}

// Archive: closes any open assignment and clears the current-driver pointer,
// then marks the vehicle ARCHIVED (its soft-delete signal - no separate
// deletedAt field, see schema comment).
async function archiveVehicle(vehicleId) {
  await findVehicleOrThrow(vehicleId);

  await prisma.$transaction([
    prisma.vehicleAssignment.updateMany({ where: { vehicleId, endDate: null }, data: { endDate: new Date() } }),
    prisma.vehicle.update({ where: { id: vehicleId }, data: { currentDriverId: null, status: 'ARCHIVED' } }),
  ]);
}

// Closes any open assignment for this vehicle, then opens a new one for the
// given driver - transactional so the vehicle's currentDriverId pointer and
// the VehicleAssignment history table never disagree.
async function assignVehicle(vehicleId, driverId) {
  const vehicle = await findVehicleOrThrow(vehicleId);
  // Spec rule 19.2: a non-ACTIVE vehicle (suspended, in maintenance,
  // unavailable, archived) must not be put into service on a ride.
  if (vehicle.status !== 'ACTIVE') {
    throw new AppError(`Cannot assign a vehicle with status ${vehicle.status}`, 409, 'CONFLICT');
  }

  const driver = await prisma.user.findUnique({ where: { id: driverId } });
  if (!driver || driver.role !== 'DRIVER') {
    throw new AppError('Driver not found', 404, 'NOT_FOUND');
  }

  await prisma.$transaction([
    prisma.vehicleAssignment.updateMany({ where: { vehicleId, endDate: null }, data: { endDate: new Date() } }),
    prisma.vehicleAssignment.create({ data: { vehicleId, driverId } }),
    prisma.vehicle.update({ where: { id: vehicleId }, data: { currentDriverId: driverId } }),
  ]);

  return getVehicleById(vehicleId);
}

async function unassignVehicle(vehicleId) {
  await findVehicleOrThrow(vehicleId);

  await prisma.$transaction([
    prisma.vehicleAssignment.updateMany({ where: { vehicleId, endDate: null }, data: { endDate: new Date() } }),
    prisma.vehicle.update({ where: { id: vehicleId }, data: { currentDriverId: null } }),
  ]);

  return getVehicleById(vehicleId);
}

module.exports = {
  listVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  archiveVehicle,
  assignVehicle,
  unassignVehicle,
};
