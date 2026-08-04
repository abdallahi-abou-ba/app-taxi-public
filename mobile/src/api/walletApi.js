import { api } from './client';

export function getTopUpInfo() {
  return api.get('/api/users/me/wallet/topup-info');
}

export function getMyTopUps() {
  return api.get('/api/users/me/wallet/topups');
}

export function createTopUp({ amount, confirmationCode }) {
  return api.post('/api/users/me/wallet/topups', { amount, confirmationCode });
}
