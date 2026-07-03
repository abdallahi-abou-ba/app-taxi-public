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
  if (!user) {
    throw new AppError('User no longer exists', 401, 'UNAUTHORIZED');
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

module.exports = { requireAuth, requireRole };
