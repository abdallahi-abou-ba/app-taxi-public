const { Router } = require('express');
const controller = require('../controllers/report.controller');
const validate = require('../middleware/validate.middleware');
const {
  ridesReportQuerySchema,
  revenueReportQuerySchema,
  expensesReportQuerySchema,
} = require('../validators/report.validators');

// Mounted under /api/admin/reports by admin.routes.js, which already applies
// requireAuth + requireRole('ADMIN') + requirePermission('REPORTS'). CSV
// exports (spec 10) - no PDF/Excel generation library added for this MVP
// pass, CSV covers the same underlying need (opens directly in Excel/Sheets).
const router = Router();

router.get('/rides.csv', validate(ridesReportQuerySchema, 'query'), controller.exportRides);
router.get('/revenue.csv', validate(revenueReportQuerySchema, 'query'), controller.exportRevenue);
router.get('/expenses.csv', validate(expensesReportQuerySchema, 'query'), controller.exportExpenses);

module.exports = router;
