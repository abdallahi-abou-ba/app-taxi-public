const { z } = require('zod');

const VEHICLE_STATUS_VALUES = ['ACTIVE', 'MAINTENANCE', 'SUSPENDED', 'UNAVAILABLE', 'ARCHIVED'];

const vehicleIdParamSchema = z.object({
  id: z.string().uuid('Invalid vehicle id'),
});

const listVehiclesQuerySchema = z.object({
  status: z.enum(VEHICLE_STATUS_VALUES).optional(),
  driverId: z.string().uuid().optional(),
});

const createVehicleSchema = z.object({
  brand: z.string().trim().min(1),
  model: z.string().trim().min(1),
  plate: z.string().trim().min(1),
  color: z.string().trim().optional(),
  year: z.coerce.number().int().min(1950).max(2100).optional(),
  type: z.string().trim().optional(),
  seatCount: z.coerce.number().int().positive().optional(),
  insuranceProvider: z.string().trim().optional(),
  insuranceNumber: z.string().trim().optional(),
  insuranceExpiresAt: z.coerce.date().optional(),
  carteGriseNumber: z.string().trim().optional(),
  technicalInspectionExpiresAt: z.coerce.date().optional(),
  ownerName: z.string().trim().optional(),
});

const updateVehicleSchema = z
  .object({
    brand: z.string().trim().min(1),
    model: z.string().trim().min(1),
    plate: z.string().trim().min(1),
    color: z.string().trim(),
    year: z.coerce.number().int().min(1950).max(2100),
    type: z.string().trim(),
    seatCount: z.coerce.number().int().positive(),
    insuranceProvider: z.string().trim(),
    insuranceNumber: z.string().trim(),
    insuranceExpiresAt: z.coerce.date(),
    carteGriseNumber: z.string().trim(),
    technicalInspectionExpiresAt: z.coerce.date(),
    ownerName: z.string().trim(),
    status: z.enum(VEHICLE_STATUS_VALUES),
  })
  .partial();

const assignVehicleSchema = z.object({
  driverId: z.string().uuid(),
});

module.exports = {
  VEHICLE_STATUS_VALUES,
  vehicleIdParamSchema,
  listVehiclesQuerySchema,
  createVehicleSchema,
  updateVehicleSchema,
  assignVehicleSchema,
};
