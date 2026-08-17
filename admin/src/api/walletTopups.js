import { api } from './client';

export function listWalletTopUps(query) {
  return api.get('/api/admin/wallet-topups', { query });
}

export function createWalletTopUp(driverId, amount) {
  return api.post('/api/admin/wallet-topups', { driverId, amount });
}

export function confirmWalletTopUp(id) {
  return api.patch(`/api/admin/wallet-topups/${id}/confirm`);
}

export function cancelWalletTopUp(id) {
  return api.patch(`/api/admin/wallet-topups/${id}/cancel`);
}
