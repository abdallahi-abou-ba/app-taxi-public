import { api } from './client';

export function listSettlements(query) {
  return api.get('/api/admin/settlements', { query });
}

export function getSettlement(id) {
  return api.get(`/api/admin/settlements/${id}`);
}

export function generateSettlement(payload) {
  return api.post('/api/admin/settlements', payload);
}

export function markSettlementPaid(id) {
  return api.patch(`/api/admin/settlements/${id}/pay`);
}

export function cancelSettlement(id) {
  return api.patch(`/api/admin/settlements/${id}/cancel`);
}
