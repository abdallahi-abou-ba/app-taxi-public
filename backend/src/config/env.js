const { z } = require('zod');
require('dotenv').config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().min(1, 'DIRECT_URL is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  // Not consumed anywhere - routing uses OSRM (below), not Google. Kept optional
  // in case a future feature (address autocomplete, etc.) wants it.
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  // Public demo server by default - fine for dev, but has no uptime guarantee
  // and isn't meant for production load. Point this at a self-hosted OSRM
  // instance for anything beyond MVP testing.
  OSRM_BASE_URL: z.string().default('https://router.project-osrm.org'),
  SEARCH_RADIUS_KM: z.coerce.number().positive().default(5),
  BASE_FARE: z.coerce.number().nonnegative().default(2.5),
  RATE_PER_KM: z.coerce.number().nonnegative().default(1.2),
  RATE_PER_MIN: z.coerce.number().nonnegative().default(0.2),
  CORS_ORIGIN: z.string().default('*'),
  // Ride reminder job (src/jobs/reminder.job.js) tuning.
  REMINDER_CHECK_INTERVAL_MIN: z.coerce.number().positive().default(5),
  SEARCH_REMINDER_AFTER_MIN: z.coerce.number().positive().default(5),
  RATING_REMINDER_AFTER_HOURS: z.coerce.number().positive().default(2),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  console.error('\nCheck backend/.env against backend/.env.example');
  process.exit(1);
}

module.exports = parsed.data;
