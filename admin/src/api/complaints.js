import { api } from './client';

export function listComplaints(query) {
  return api.get('/api/admin/complaints', { query });
}

export function getComplaint(id) {
  return api.get(`/api/admin/complaints/${id}`);
}

export function updateComplaint(id, payload) {
  return api.patch(`/api/admin/complaints/${id}`, payload);
}
