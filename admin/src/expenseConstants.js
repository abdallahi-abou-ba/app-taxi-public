// Mirrors backend/src/utils/expense.constants.js - grouped for the category
// <select>'s optgroups, matching spec 8.2's 3 expense groups.
export const EXPENSE_CATEGORY_GROUPS = {
  DRIVER: {
    label: 'Chauffeur',
    categories: ['DRIVER_ADVANCE', 'PENALTY', 'UNIFORM', 'TRAINING', 'DOCUMENT_FEE', 'COMMUNICATION'],
  },
  VEHICLE: {
    label: 'Véhicule',
    categories: [
      'FUEL',
      'OIL_CHANGE',
      'REPAIR',
      'CAR_WASH',
      'INSURANCE',
      'TECHNICAL_INSPECTION',
      'TIRES',
      'MAINTENANCE',
      'SPARE_PARTS',
    ],
  },
  PLATFORM: {
    label: 'Plateforme',
    categories: [
      'SERVER_HOSTING',
      'SMS',
      'INTERNET',
      'ADVERTISING',
      'CUSTOMER_SUPPORT',
      'PAYMENT_PROCESSING_FEE',
      'ADMIN_FEE',
    ],
  },
  OTHER: { label: 'Autre', categories: ['OTHER'] },
};

export const EXPENSE_BEARER_OPTIONS = ['COMPANY', 'DRIVER', 'SHARED'];
