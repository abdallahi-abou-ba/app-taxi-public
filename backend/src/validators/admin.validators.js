const { z } = require('zod');
const { normalizePhone } = require('../utils/phone.util');

const phoneField = z
  .string()
  .trim()
  .refine((v) => normalizePhone(v) !== null, 'Invalid phone number')
  .transform(normalizePhone);

const DRIVER_STATUS_VALUES = ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED', 'BLOCKED'];

const driverIdParamSchema = z.object({
  id: z.string().uuid('Invalid driver id'),
});

const listDriversQuerySchema = z.object({
  status: z.enum(DRIVER_STATUS_VALUES).optional(),
});

const createDriverSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().trim().min(1),
  phone: phoneField.optional(),
  whatsapp: z.string().trim().optional(),
  vehiclePlate: z.string().trim().min(1),
  vehicleModel: z.string().trim().optional(),
  address: z.string().trim().optional(),
  nationalId: z.string().trim().optional(),
  licenseNumber: z.string().trim().optional(),
  licenseExpiryAt: z.coerce.date().optional(),
  contractType: z.string().trim().optional(),
  initialBalance: z.coerce.number().nonnegative().optional(),
});

const updateDriverSchema = z
  .object({
    fullName: z.string().trim().min(1),
    phone: phoneField,
    whatsapp: z.string().trim(),
    vehiclePlate: z.string().trim().min(1),
    vehicleModel: z.string().trim(),
    address: z.string().trim(),
    nationalId: z.string().trim(),
    licenseNumber: z.string().trim(),
    licenseExpiryAt: z.coerce.date(),
    contractType: z.string().trim(),
  })
  .partial();

const driverStatusBodySchema = z.object({
  status: z.enum(DRIVER_STATUS_VALUES),
});

const commissionRateBodySchema = z.object({
  newRate: z.number().min(0).max(1),
  reason: z.string().trim().max(500).optional(),
});

const updateSettingsSchema = z
  .object({
    defaultCommissionRate: z.number().min(0).max(1).optional(),
    walletTopupMerchantCode: z.string().trim().min(2).max(50).optional(),
  })
  .refine((data) => data.defaultCommissionRate !== undefined || data.walletTopupMerchantCode !== undefined, {
    message: 'At least one setting must be provided',
  });

const RIDE_STATUS_VALUES = ['SCHEDULED', 'REQUESTED', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

const adminListRidesQuerySchema = z.object({
  driverId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  status: z.enum(RIDE_STATUS_VALUES).optional(),
  paymentMethod: z.enum(['CASH', 'CARD', 'BANKILY', 'SEDAD', 'MASRIVI', 'CLICK', 'BIMBANK', 'WALLET', 'COMPANY']).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

const revenueQuerySchema = z.object({
  groupBy: z.enum(['driver', 'day', 'week', 'month']).default('driver'),
  driverId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

const activityLogQuerySchema = z.object({
  adminUserId: z.string().uuid().optional(),
  entityType: z.string().trim().optional(),
  entityId: z.string().trim().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(200).optional(),
});

module.exports = {
  DRIVER_STATUS_VALUES,
  driverIdParamSchema,
  listDriversQuerySchema,
  createDriverSchema,
  updateDriverSchema,
  driverStatusBodySchema,
  commissionRateBodySchema,
  updateSettingsSchema,
  adminListRidesQuerySchema,
  revenueQuerySchema,
  activityLogQuerySchema,
};
