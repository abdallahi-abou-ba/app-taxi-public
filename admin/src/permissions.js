// Mirrors backend/src/middleware/auth.middleware.js's ADMIN_ROLE_PERMISSIONS -
// used only to hide nav items/actions the current admin can't reach, not as
// an actual security boundary (the backend enforces that on every request).
const ADMIN_ROLE_PERMISSIONS = {
  FINANCE: ['FINANCE'],
  OPERATIONS: ['DRIVERS', 'VEHICLES', 'RIDES'],
  SUPPORT: ['COMPLAINTS', 'CLIENTS', 'RIDES'],
};

export function hasPermission(user, ...sections) {
  if (!user) return false;
  if (user.adminRole === 'SUPER_ADMIN') return true;
  const granted = ADMIN_ROLE_PERMISSIONS[user.adminRole] || [];
  return sections.some((s) => granted.includes(s));
}
