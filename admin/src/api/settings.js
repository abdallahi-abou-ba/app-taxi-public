import { api } from './client';

export function getSettings() {
  return api.get('/api/admin/settings');
}

export function updateSettings(payload) {
  return api.patch('/api/admin/settings', payload);
}
