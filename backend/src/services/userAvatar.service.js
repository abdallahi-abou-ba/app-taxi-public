const prisma = require('../lib/prisma');
const AppError = require('../utils/appError');

async function upsertAvatar(userId, file) {
  if (!file) {
    throw new AppError('No file uploaded', 400, 'BAD_REQUEST');
  }

  return prisma.userAvatar.upsert({
    where: { userId },
    create: { userId, data: file.buffer, mimeType: file.mimetype },
    update: { data: file.buffer, mimeType: file.mimetype, uploadedAt: new Date() },
    select: { mimeType: true, uploadedAt: true },
  });
}

async function getAvatarFile(userId) {
  const avatar = await prisma.userAvatar.findUnique({
    where: { userId },
    select: { data: true, mimeType: true },
  });
  if (!avatar) {
    throw new AppError('Avatar not found', 404, 'NOT_FOUND');
  }
  return avatar;
}

async function deleteAvatar(userId) {
  await prisma.userAvatar.deleteMany({ where: { userId } });
}

module.exports = { upsertAvatar, getAvatarFile, deleteAvatar };
