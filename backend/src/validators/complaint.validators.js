const { z } = require('zod');

const COMPLAINT_CATEGORY_VALUES = ['DRIVER_BEHAVIOR', 'VEHICLE_CONDITION', 'PAYMENT', 'SAFETY', 'OTHER'];
const COMPLAINT_STATUS_VALUES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

const complaintIdParamSchema = z.object({
  id: z.string().uuid('Invalid complaint id'),
});

const submitComplaintSchema = z.object({
  category: z.enum(COMPLAINT_CATEGORY_VALUES),
  description: z.string().trim().min(1).max(2000),
  aboutUserId: z.string().uuid().optional(),
  rideId: z.string().uuid().optional(),
});

const listComplaintsQuerySchema = z.object({
  status: z.enum(COMPLAINT_STATUS_VALUES).optional(),
  category: z.enum(COMPLAINT_CATEGORY_VALUES).optional(),
  submittedByUserId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

const updateComplaintSchema = z.object({
  status: z.enum(COMPLAINT_STATUS_VALUES).optional(),
  adminNotes: z.string().trim().max(2000).optional(),
});

module.exports = {
  COMPLAINT_CATEGORY_VALUES,
  COMPLAINT_STATUS_VALUES,
  complaintIdParamSchema,
  submitComplaintSchema,
  listComplaintsQuerySchema,
  updateComplaintSchema,
};
