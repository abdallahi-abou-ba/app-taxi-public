const { z } = require('zod');

const ADMIN_ROLE_VALUES = ['SUPER_ADMIN', 'FINANCE', 'OPERATIONS', 'SUPPORT'];

const adminIdParamSchema = z.object({
  id: z.string().uuid('Invalid admin id'),
});

const createAdminUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().trim().min(1),
  phone: z.string().trim().optional(),
  adminRole: z.enum(ADMIN_ROLE_VALUES),
});

const updateAdminRoleSchema = z.object({
  adminRole: z.enum(ADMIN_ROLE_VALUES),
});

module.exports = { ADMIN_ROLE_VALUES, adminIdParamSchema, createAdminUserSchema, updateAdminRoleSchema };
