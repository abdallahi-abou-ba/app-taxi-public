const asyncHandler = require('../utils/asyncHandler');
const reportsService = require('../services/reports.service');
const { toCsv } = require('../utils/csv.util');

function sendCsv(res, filename, csv) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}

const RIDE_COLUMNS = [
  { label: 'ID', value: (r) => r.id },
  { label: 'Statut', value: (r) => r.status },
  { label: 'Client', value: (r) => r.client?.fullName || '' },
  { label: 'Chauffeur', value: (r) => r.driver?.fullName || '' },
  { label: 'Paiement', value: (r) => r.paymentMethod },
  { label: 'Tarif estimé', value: (r) => r.estimatedFare },
  { label: 'Commission', value: (r) => r.commissionAmount ?? '' },
  { label: 'Net chauffeur', value: (r) => r.driverNetAmount ?? '' },
  { label: 'Demandée le', value: (r) => r.requestedAt?.toISOString() || '' },
  { label: 'Terminée le', value: (r) => r.completedAt?.toISOString() || '' },
];

const exportRides = asyncHandler(async (req, res) => {
  const rides = await reportsService.getRidesForExport(req.query);
  sendCsv(res, 'courses.csv', toCsv(rides, RIDE_COLUMNS));
});

const REVENUE_BY_DRIVER_COLUMNS = [
  { label: 'Chauffeur', value: (r) => r.driverName || '' },
  { label: 'Nombre de courses', value: (r) => r.rideCount },
  { label: 'Recette brute', value: (r) => r.grossRevenue },
  { label: 'Commission', value: (r) => r.commission },
  { label: 'Net chauffeur', value: (r) => r.driverNet },
];

const REVENUE_BY_PERIOD_COLUMNS = [
  { label: 'Période', value: (r) => (r.bucket instanceof Date ? r.bucket.toISOString() : r.bucket) },
  { label: 'Nombre de courses', value: (r) => r.rideCount },
  { label: 'Recette brute', value: (r) => r.grossRevenue },
  { label: 'Commission', value: (r) => r.commission },
  { label: 'Net chauffeur', value: (r) => r.driverNet },
];

const exportRevenue = asyncHandler(async (req, res) => {
  const rows = await reportsService.getRevenueForExport(req.query);
  const columns = (req.query.groupBy || 'driver') === 'driver' ? REVENUE_BY_DRIVER_COLUMNS : REVENUE_BY_PERIOD_COLUMNS;
  sendCsv(res, 'recettes.csv', toCsv(rows, columns));
});

const EXPENSE_COLUMNS = [
  { label: 'ID', value: (e) => e.id },
  { label: 'Catégorie', value: (e) => e.category },
  { label: 'Montant', value: (e) => e.amount },
  { label: 'Description', value: (e) => e.description || '' },
  { label: 'Véhicule', value: (e) => e.vehicle?.plate || '' },
  { label: 'Chauffeur', value: (e) => e.driver?.fullName || '' },
  { label: 'Date', value: (e) => e.expenseDate?.toISOString() || '' },
];

const exportExpenses = asyncHandler(async (req, res) => {
  const expenses = await reportsService.getExpensesForExport(req.query);
  sendCsv(res, 'depenses.csv', toCsv(expenses, EXPENSE_COLUMNS));
});

module.exports = { exportRides, exportRevenue, exportExpenses };
