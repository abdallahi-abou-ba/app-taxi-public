import { api } from './client';

export function getRevenue(query) {
  return api.get('/api/admin/revenue', { query });
}
