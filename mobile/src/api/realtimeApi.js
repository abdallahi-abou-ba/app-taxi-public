import { api } from './client';

export function getRealtimeToken() {
  return api.get('/api/realtime/token');
}
