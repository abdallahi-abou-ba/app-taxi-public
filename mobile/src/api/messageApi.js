import { api } from './client';

export function listMessages(rideId) {
  return api.get(`/api/rides/${rideId}/messages`);
}

export function sendMessage(rideId, body) {
  return api.post(`/api/rides/${rideId}/messages`, { body });
}
