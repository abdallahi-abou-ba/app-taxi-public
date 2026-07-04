const prisma = require('../lib/prisma');
const AppError = require('../utils/appError');
const { getIO } = require('../lib/socket');
const { sendPushToUser } = require('../utils/push.util');

const MESSAGE_INCLUDE = {
  sender: { select: { id: true, fullName: true } },
};

const PUSH_BODY_MAX_LENGTH = 120;

function emitToUser(userId, event, payload) {
  const io = getIO();
  if (io && userId) io.to(`user:${userId}`).emit(event, payload);
}

async function assertParticipant(userId, rideId) {
  const ride = await prisma.ride.findUnique({ where: { id: rideId } });
  if (!ride) {
    throw new AppError('Ride not found', 404, 'NOT_FOUND');
  }
  if (ride.clientId !== userId && ride.driverId !== userId) {
    throw new AppError('You are not part of this ride', 403, 'FORBIDDEN');
  }
  return ride;
}

async function listMessages(userId, rideId) {
  const ride = await assertParticipant(userId, rideId);
  return prisma.message.findMany({
    where: { rideId: ride.id },
    orderBy: { createdAt: 'asc' },
    take: 200,
    include: MESSAGE_INCLUDE,
  });
}

async function sendMessage(userId, rideId, body) {
  const ride = await assertParticipant(userId, rideId);

  const message = await prisma.message.create({
    data: { rideId: ride.id, senderId: userId, body },
    include: MESSAGE_INCLUDE,
  });

  // Both participants get the live event, including the sender - the mobile
  // client relies on this echo rather than an optimistic local append, so
  // there's a single source of truth for what's actually in the thread.
  emitToUser(ride.clientId, 'chat:message', message);
  emitToUser(ride.driverId, 'chat:message', message);

  const recipientId = ride.clientId === userId ? ride.driverId : ride.clientId;
  const pushBody = body.length > PUSH_BODY_MAX_LENGTH ? `${body.slice(0, PUSH_BODY_MAX_LENGTH - 3)}...` : body;
  sendPushToUser(recipientId, {
    title: message.sender.fullName,
    body: pushBody,
    data: { rideId: ride.id, type: 'chat:message' },
  });

  return message;
}

module.exports = { listMessages, sendMessage };
