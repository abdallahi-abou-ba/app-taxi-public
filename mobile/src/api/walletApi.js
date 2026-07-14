import { api } from './client';

export function getTopUpInfo() {
  return api.get('/api/users/me/wallet/topup-info');
}

export function getMyTopUps() {
  return api.get('/api/users/me/wallet/topups');
}

export function createTopUp({ amount, method, payerPhone }) {
  return api.post('/api/users/me/wallet/topups', { amount, method, payerPhone });
}
