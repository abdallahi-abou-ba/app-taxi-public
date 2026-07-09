import { downloadFile } from './client';

export function exportRides(query) {
  return downloadFile('/api/admin/reports/rides.csv', { query, filename: 'courses.csv' });
}

export function exportRevenue(query) {
  return downloadFile('/api/admin/reports/revenue.csv', { query, filename: 'recettes.csv' });
}

export function exportExpenses(query) {
  return downloadFile('/api/admin/reports/expenses.csv', { query, filename: 'depenses.csv' });
}
