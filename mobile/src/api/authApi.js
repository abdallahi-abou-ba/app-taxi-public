import { api } from './client';

export function register({ email, password, fullName, phone, role, referralCode, vehiclePlate, vehicleModel }) {
  return api.post(
    '/api/auth/register',
    { email, password, fullName, phone, role, referralCode, vehiclePlate, vehicleModel },
    { skipAuth: true }
  );
}

export function login({ email, password }) {
  return api.post('/api/auth/login', { email, password }, { skipAuth: true });
}

export function refresh(refreshToken) {
  return api.post('/api/auth/refresh', { refreshToken }, { skipAuth: true });
}

export function logout(refreshToken) {
  return api.post('/api/auth/logout', { refreshToken }, { skipAuth: true });
}

export function requestOtp(phone) {
  return api.post('/api/auth/request-otp', { phone }, { skipAuth: true });
}

export function verifyOtp(phone, code) {
  return api.post('/api/auth/verify-otp', { phone, code }, { skipAuth: true });
}

export function completeRegistration(payload) {
  return api.post('/api/auth/complete-registration', payload, { skipAuth: true });
}
