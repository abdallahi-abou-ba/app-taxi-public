import { api } from './client';

export function listAdmins() {
  return api.get('/api/admin/admins');
}

export function createAdminUser(payload) {
  return api.post('/api/admin/admins', payload);
}

export function updateAdminRole(id, adminRole) {
  return api.patch(`/api/admin/admins/${id}/role`, { adminRole });
}
