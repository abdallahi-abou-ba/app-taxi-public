import { api } from './client';

export function listActivityLog(query) {
  return api.get('/api/admin/activity-log', { query });
}
