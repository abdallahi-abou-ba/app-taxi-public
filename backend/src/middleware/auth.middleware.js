const AppError = require('../utils/appError');
const asyncHandler = require('../utils/asyncHandler');
const prisma = require('../lib/prisma');
const { verifyToken } = require('../services/auth.service');

/** Verifies the Bearer JWT and attaches the authenticated user to req.user. */
const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new AppError('Missing or malformed Authorization header', 401, 'UNAUTHORIZED');
  }

  const payload = verifyToken(token);

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || user.deletedAt) {
    throw new AppError('User no longer exists', 401, 'UNAUTHORIZED');
  }
  // A driver blocked mid-session loses access immediately, not just on their
  // next login - requireAuth re-reads the user on every request, so this
  // catches an already-issued access token too (no need to wait for it to
  // expire naturally).
  if (user.approvalStatus === 'BLOCKED') {
    throw new AppError('Your account has been blocked. Contact support.', 403, 'FORBIDDEN');
  }

  req.user = user;
  next();
});

/** Restricts a route to one or more roles. Must run after requireAuth. */
function requireRole(...roles) {
  return function requireRoleMiddleware(req, res, next) {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError(`This action requires role: ${roles.join(' or ')}`, 403, 'FORBIDDEN'));
    }
    next();
  };
}

// Back-office sections an AdminRole (spec 16's role table) can reach.
// SUPER_ADMIN is deliberately absent as a key here - requirePermission below
// grants it everything unconditionally instead of listing every section
// twice. Mirrors the spec's 4 admin-facing roles: OPERATIONS is
// "Administrateur" (chauffeurs/courses/recettes - REVENUE is view-only in
// spirit but not enforced as such here), FINANCE is "Comptable" (recettes,
// frais, règlements, rapports - a superset of OPERATIONS's REVENUE access
// plus the finance-only sections), SUPPORT is "Support client".
const ADMIN_ROLE_PERMISSIONS = {
  FINANCE: ['REVENUE', 'EXPENSES', 'SETTLEMENTS', 'REPORTS'],
  OPERATIONS: ['DRIVERS', 'VEHICLES', 'RIDES', 'REVENUE'],
  SUPPORT: ['COMPLAINTS', 'CLIENTS', 'RIDES'],
};

/**
 * Restricts a route to admins whose adminRole grants at least one of the
 * given sections. Must run after requireAuth + requireRole('ADMIN'). A null
 * adminRole (should not happen for any admin created after the backfill
 * migration, but fails closed rather than open if it ever does) gets no
 * sections at all.
 */
function requirePermission(...sections) {
  return function requirePermissionMiddleware(req, res, next) {
    const adminRole = req.user?.adminRole;
    const granted = ADMIN_ROLE_PERMISSIONS[adminRole] || [];
    if (adminRole === 'SUPER_ADMIN' || sections.some((section) => granted.includes(section))) {
      return next();
    }
    return next(new AppError(`This action requires access to: ${sections.join(' or ')}`, 403, 'FORBIDDEN'));
  };
}

module.exports = { requireAuth, requireRole, requirePermission };
