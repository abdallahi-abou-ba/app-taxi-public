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
  return prisma.user.findMany({ where: { role: 'ADMIN' }, select: ADMIN_SELECT, orderBy: { createdAt: 'desc' } });
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

module.exports = { listAdmins, createAdminUser, updateAdminRole };
