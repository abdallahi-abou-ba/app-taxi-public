const prisma = require('../lib/prisma');

async function createNotification(userId, { type, title, body, data }) {
  if (!userId) return null;
  return prisma.notification.create({
    data: { userId, type, title, body, data: data || undefined },
  });
}

async function listMyNotifications(userId, { page, pageSize } = {}) {
  const pageNum = page || 1;
  const pageSizeNum = pageSize || 20;

  const [total, unreadCount, notifications] = await Promise.all([
    prisma.notification.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, read: false } }),
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * pageSizeNum,
      take: pageSizeNum,
    }),
  ]);

  return { notifications, total, unreadCount, page: pageNum, pageSize: pageSizeNum, totalPages: Math.ceil(total / pageSizeNum) };
}

async function markAllAsRead(userId) {
  await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
}

module.exports = { createNotification, listMyNotifications, markAllAsRead };
