import { api } from './client';

export function getMe() {
  return api.get('/api/users/me');
}

export function updateMe(payload) {
  return api.patch('/api/users/me', payload);
}

export function updateAvailability(payload) {
  return api.patch('/api/users/me/availability', payload);
}

export function updatePushToken(pushToken) {
  return api.patch('/api/users/me/push-token', { pushToken });
}

export function deleteAccount(password) {
  return api.delete('/api/users/me', { password });
}
