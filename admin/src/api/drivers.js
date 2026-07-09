import { api } from './client';

export function listDrivers(status) {
  return api.get('/api/admin/drivers', { query: { status } });
}

export function getDriver(id) {
  return api.get(`/api/admin/drivers/${id}`);
}

export function createDriver(payload) {
  return api.post('/api/admin/drivers', payload);
}

export function updateDriver(id, payload) {
  return api.patch(`/api/admin/drivers/${id}`, payload);
}

export function setDriverStatus(id, status) {
  return api.patch(`/api/admin/drivers/${id}/status`, { status });
}

export function archiveDriver(id) {
  return api.delete(`/api/admin/drivers/${id}`);
}

export function setCommissionRate(id, newRate, reason) {
  return api.patch(`/api/admin/drivers/${id}/commission-rate`, { newRate, reason });
}

export function getCommissionHistory(id) {
  return api.get(`/api/admin/drivers/${id}/commission-history`);
}
