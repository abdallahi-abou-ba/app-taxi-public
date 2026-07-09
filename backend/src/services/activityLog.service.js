const prisma = require('../lib/prisma');

// Fire-and-forget from the caller's perspective (always awaited, but never
// wrapped in the caller's own transaction) - a logging failure must never
// roll back or block the actual admin action it's describing.
async function logActivity({ adminUserId, action, entityType, entityId, details }) {
  return prisma.adminActivityLog.create({
    data: { adminUserId, action, entityType, entityId, details },
  });
}

async function listActivityLog({ adminUserId, entityType, entityId, page, pageSize } = {}) {
  const pageNum = page || 1;
  const pageSizeNum = pageSize || 50;
  const where = {
    ...(adminUserId && { adminUserId }),
    ...(entityType && { entityType }),
    ...(entityId && { entityId }),
  };

  const [total, logs] = await Promise.all([
    prisma.adminActivityLog.count({ where }),
    prisma.adminActivityLog.findMany({
      where,
      include: { adminUser: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * pageSizeNum,
      take: pageSizeNum,
    }),
  ]);

  return { logs, total, page: pageNum, pageSize: pageSizeNum, totalPages: Math.ceil(total / pageSizeNum) };
}

module.exports = { logActivity, listActivityLog };
