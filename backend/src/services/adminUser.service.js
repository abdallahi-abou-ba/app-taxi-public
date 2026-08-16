const crypto = require('crypto');
const prisma = require('../lib/prisma');
const AppError = require('../utils/appError');
const { hashPassword } = require('../utils/password.util');

const ADMIN_SELECT = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  adminRole: true,
  createdAt: true,
  deletedAt: true,
};

async function listAdmins() {
  return prisma.user.findMany({
    where: { role: 'ADMIN', deletedAt: null },
    select: ADMIN_SELECT,
    orderBy: { createdAt: 'desc' },
  });
}

async function createAdminUser({ email, password, fullName, phone, adminRole }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError('An account with this email already exists', 409, 'CONFLICT');
  }

  const passwordHash = await hashPassword(password);
  return prisma.user.create({
    data: { email, passwordHash, fullName, phone, role: 'ADMIN', adminRole },
    select: ADMIN_SELECT,
  });
}

// Self-role-change is blocked so a SUPER_ADMIN can never accidentally lock
// themselves out of the ADMINS section (there's no recovery path for that
// short of direct DB access) - they have to have another SUPER_ADMIN do it.
async function updateAdminRole(targetAdminId, newRole, actingAdminId) {
  if (targetAdminId === actingAdminId) {
    throw new AppError('You cannot change your own admin role', 409, 'CONFLICT');
  }

  const target = await prisma.user.findUnique({ where: { id: targetAdminId } });
  if (!target || target.role !== 'ADMIN') {
    throw new AppError('Admin not found', 404, 'NOT_FOUND');
  }

  return prisma.user.update({ where: { id: targetAdminId }, data: { adminRole: newRole }, select: ADMIN_SELECT });
}

// Anonymizes rather than hard-deletes, same pattern as user.service.js's
// deleteAccount - so any activity log / adminActivityLog row that references
// this admin as actor still resolves instead of hitting a dangling FK.
// Self-delete and deleting the last SUPER_ADMIN are both blocked, same
// rationale as updateAdminRole's self-role-change block: there is no
// recovery path (short of direct DB access) for locking every admin out of
// the ADMINS section.
async function deleteAdmin(targetAdminId, actingAdminId) {
  if (targetAdminId === actingAdminId) {
    throw new AppError('You cannot delete your own admin account', 409, 'CONFLICT');
  }

  const target = await prisma.user.findUnique({ where: { id: targetAdminId } });
  if (!target || target.role !== 'ADMIN' || target.deletedAt) {
    throw new AppError('Admin not found', 404, 'NOT_FOUND');
  }

  if (target.adminRole === 'SUPER_ADMIN') {
    const otherSuperAdmins = await prisma.user.count({
      where: { role: 'ADMIN', adminRole: 'SUPER_ADMIN', deletedAt: null, id: { not: targetAdminId } },
    });
    if (otherSuperAdmins === 0) {
      throw new AppError('You cannot delete the last SUPER_ADMIN', 409, 'CONFLICT');
    }
  }

  const unusablePasswordHash = await hashPassword(crypto.randomBytes(32).toString('hex'));

  await prisma.$transaction([
    prisma.user.update({
      where: { id: targetAdminId },
      data: {
        email: `deleted-${targetAdminId}@deleted.local`,
        passwordHash: unusablePasswordHash,
        fullName: 'Deleted admin',
        phone: null,
        deletedAt: new Date(),
      },
    }),
    prisma.refreshToken.updateMany({ where: { userId: targetAdminId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
}

module.exports = { listAdmins, createAdminUser, updateAdminRole, deleteAdmin };
