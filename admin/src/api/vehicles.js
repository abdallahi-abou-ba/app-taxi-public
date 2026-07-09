import { api } from './client';

export function listVehicles(filters = {}) {
  return api.get('/api/admin/vehicles', { query: filters });
}

export function getVehicle(id) {
  return api.get(`/api/admin/vehicles/${id}`);
}

export function createVehicle(payload) {
  return api.post('/api/admin/vehicles', payload);
}

export function updateVehicle(id, payload) {
  return api.patch(`/api/admin/vehicles/${id}`, payload);
}

export function archiveVehicle(id) {
  return api.delete(`/api/admin/vehicles/${id}`);
}

export function assignVehicle(id, driverId) {
  return api.patch(`/api/admin/vehicles/${id}/assign`, { driverId });
}

export function unassignVehicle(id) {
  return api.patch(`/api/admin/vehicles/${id}/unassign`);
}
