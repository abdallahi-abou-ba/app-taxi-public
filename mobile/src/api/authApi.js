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

// Primary mobile auth as of the phone+password rollout.
export function registerByPhone({ nom, prenom, phone, password, role, vehiclePlate, vehicleModel }) {
  return api.post(
    '/api/auth/register-phone',
    { nom, prenom, phone, password, role, vehiclePlate, vehicleModel },
    { skipAuth: true }
  );
}

export function loginByPhone(phone, password) {
  return api.post('/api/auth/login-phone', { phone, password }, { skipAuth: true });
}

export function refresh(refreshToken) {
  return api.post('/api/auth/refresh', { refreshToken }, { skipAuth: true });
}

export function logout(refreshToken) {
  return api.post('/api/auth/logout', { refreshToken }, { skipAuth: true });
}
