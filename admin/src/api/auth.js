import { api } from './client';

export function login({ email, password }) {
  return api.post('/api/auth/login', { email, password }, { skipAuth: true });
}

export function refresh(refreshToken) {
  return api.post('/api/auth/refresh', { refreshToken }, { skipAuth: true });
}

export function logout(refreshToken) {
  return api.post('/api/auth/logout', { refreshToken }, { skipAuth: true });
}
