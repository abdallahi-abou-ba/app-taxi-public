// Spec 8.2's 3 expense groups, keyed by category so group and category can
// never drift out of sync (there's no separate `group` column on Expense -
// see schema.prisma's ExpenseCategory comment). OTHER is intentionally
// absent - it doesn't belong to any of the 3 groups.
const EXPENSE_CATEGORY_GROUPS = {
  DRIVER_ADVANCE: 'DRIVER',
  PENALTY: 'DRIVER',
  UNIFORM: 'DRIVER',
  TRAINING: 'DRIVER',
  DOCUMENT_FEE: 'DRIVER',
  COMMUNICATION: 'DRIVER',
  FUEL: 'VEHICLE',
  OIL_CHANGE: 'VEHICLE',
  REPAIR: 'VEHICLE',
  CAR_WASH: 'VEHICLE',
  INSURANCE: 'VEHICLE',
  TECHNICAL_INSPECTION: 'VEHICLE',
  TIRES: 'VEHICLE',
  MAINTENANCE: 'VEHICLE',
  SPARE_PARTS: 'VEHICLE',
  SERVER_HOSTING: 'PLATFORM',
  SMS: 'PLATFORM',
  INTERNET: 'PLATFORM',
  ADVERTISING: 'PLATFORM',
  CUSTOMER_SUPPORT: 'PLATFORM',
  PAYMENT_PROCESSING_FEE: 'PLATFORM',
  ADMIN_FEE: 'PLATFORM',
};

const EXPENSE_CATEGORY_VALUES = [...Object.keys(EXPENSE_CATEGORY_GROUPS), 'OTHER'];

// Spec 10.4/19.5: how much of this expense reduces the driver's balance -
// the full amount when they bear it alone, their agreed share when it's
// split with the company, nothing when the company bears it alone.
function getDriverBorneAmount(expense) {
  if (expense.bearer === 'DRIVER') return expense.amount;
  if (expense.bearer === 'SHARED') return expense.driverShareAmount || 0;
  return 0;
}

module.exports = { EXPENSE_CATEGORY_GROUPS, EXPENSE_CATEGORY_VALUES, getDriverBorneAmount };
