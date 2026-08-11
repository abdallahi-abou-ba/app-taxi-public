import { api } from './client';

export function updateLocation(lat, lng) {
  return api.post('/api/location', { lat, lng });
}
