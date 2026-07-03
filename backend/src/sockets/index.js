const { Server } = require('socket.io');
const env = require('../config/env');
const logger = require('../config/logger');
const prisma = require('../lib/prisma');
const { verifyToken } = require('../services/auth.service');
const { setIO } = require('../lib/socket');
const rideTracker = require('./rideTracker');

/** Authenticates the handshake using the same JWT issued by /auth/login. */
async function authenticate(socket, next) {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Missing auth token'));
    }

    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      return next(new Error('User no longer exists'));
    }

    socket.user = user;
    next();
  } catch (err) {
    next(new Error('Invalid or expired token'));
  }
}

function initSocket(httpServer) {
  const io = new Server(httpServer, { cors: { origin: env.CORS_ORIGIN } });

  io.use(authenticate);

  io.on('connection', (socket) => {
    socket.join(`user:${socket.user.id}`);
    logger.debug(`Socket connected: user ${socket.user.id}`);

    socket.on('location:update', async ({ lat, lng } = {}) => {
      if (socket.user.role !== 'DRIVER' || typeof lat !== 'number' || typeof lng !== 'number') {
        return;
      }

      try {
        await prisma.user.update({
          where: { id: socket.user.id },
          data: { currentLat: lat, currentLng: lng, lastLocationUpdatedAt: new Date() },
        });

        const activeRide = rideTracker.getActiveRide(socket.user.id);
        if (activeRide) {
          io.to(`user:${activeRide.clientId}`).emit('driver:location', { rideId: activeRide.rideId, lat, lng });
        }
      } catch (err) {
        logger.error('Failed to process location:update:', err);
      }
    });

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: user ${socket.user.id}`);
    });
  });

  setIO(io);
  return io;
}

module.exports = { initSocket };
