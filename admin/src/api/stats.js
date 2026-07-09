import { api } from './client';

export function getStats() {
  return api.get('/api/admin/stats');
}
