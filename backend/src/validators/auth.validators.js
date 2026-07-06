const { z } = require('zod');

const registerSchema = z
  .object({
    email: z.string().trim().toLowerCase().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    fullName: z.string().trim().min(2, 'Full name must be at least 2 characters'),
    phone: z.string().trim().min(6).optional(),
    role: z.enum(['CLIENT', 'DRIVER']),
    referralCode: z.string().trim().min(1).optional(),
    vehiclePlate: z.string().trim().min(1).optional(),
    vehicleModel: z.string().trim().min(1).optional(),
  })
  // Plate is required for a driver (their vehicle must be identifiable for
  // admin approval); optional/ignored for a client.
  .superRefine((data, ctx) => {
    if (data.role === 'DRIVER' && !data.vehiclePlate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['vehiclePlate'], message: 'Vehicle plate is required for drivers' });
    }
  });

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken is required'),
});

module.exports = { registerSchema, loginSchema, refreshSchema };
