const prisma = require('../lib/prisma');
const AppError = require('../utils/appError');

async function upsertDocument(requester, type, file) {
  if (requester.role !== 'DRIVER') {
    throw new AppError('Only drivers can upload verification documents', 403, 'FORBIDDEN');
  }
  if (!file) {
    throw new AppError('No file uploaded', 400, 'BAD_REQUEST');
  }

  return prisma.driverDocument.upsert({
    where: { userId_type: { userId: requester.id, type } },
    create: { userId: requester.id, type, data: file.buffer, mimeType: file.mimetype },
    update: { data: file.buffer, mimeType: file.mimetype, uploadedAt: new Date() },
    select: { type: true, mimeType: true, uploadedAt: true },
  });
}

async function listDocumentStatus(userId) {
  return prisma.driverDocument.findMany({
    where: { userId },
    select: { type: true, mimeType: true, uploadedAt: true },
  });
}

async function getDocumentFile(userId, type) {
  const doc = await prisma.driverDocument.findUnique({
    where: { userId_type: { userId, type } },
    select: { data: true, mimeType: true },
  });
  if (!doc) {
    throw new AppError('Document not found', 404, 'NOT_FOUND');
  }
  return doc;
}

module.exports = { upsertDocument, listDocumentStatus, getDocumentFile };
