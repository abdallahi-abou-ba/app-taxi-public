import { api } from './client';

export function listExpenses(query) {
  return api.get('/api/admin/expenses', { query });
}

export function getExpense(id) {
  return api.get(`/api/admin/expenses/${id}`);
}

export function getExpenseSummary(query) {
  return api.get('/api/admin/expenses/summary', { query });
}

export function createExpense(payload) {
  return api.post('/api/admin/expenses', payload);
}

export function updateExpense(id, payload) {
  return api.patch(`/api/admin/expenses/${id}`, payload);
}

export function deleteExpense(id) {
  return api.delete(`/api/admin/expenses/${id}`);
}
