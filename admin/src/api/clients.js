import { api } from './client';

export function listClients() {
  return api.get('/api/admin/clients');
}
