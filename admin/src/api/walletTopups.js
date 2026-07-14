import { api } from './client';

export function listWalletTopUps(query) {
  return api.get('/api/admin/wallet-topups', { query });
}

export function confirmWalletTopUp(id) {
  return api.patch(`/api/admin/wallet-topups/${id}/confirm`);
}

export function cancelWalletTopUp(id) {
  return api.patch(`/api/admin/wallet-topups/${id}/cancel`);
}
