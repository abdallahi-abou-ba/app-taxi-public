const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const prisma = require('../lib/prisma');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const rideRoutes = require('./ride.routes');

const router = Router();

router.get('/health', (req, res) => {
  sendSuccess(res, { data: { status: 'ok', uptime: process.uptime() } });
});

router.get(
  '/health/db',
  asyncHandler(async (req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    sendSuccess(res, { data: { status: 'ok' } });
  })
);

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/rides', rideRoutes);

module.exports = router;
