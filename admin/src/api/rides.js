import { api } from './client';

export function listRides(filters = {}) {
  return api.get('/api/admin/rides', { query: filters });
}

export function getRide(id) {
  return api.get(`/api/admin/rides/${id}`);
}
