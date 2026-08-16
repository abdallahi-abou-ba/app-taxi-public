export const ROLE = {
  CLIENT: 'CLIENT',
  DRIVER: 'DRIVER',
};

export const RIDE_STATUS = {
  SCHEDULED: 'SCHEDULED',
  REQUESTED: 'REQUESTED',
  ACCEPTED: 'ACCEPTED',
  ARRIVED: 'ARRIVED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

// Mirrors the backend's default SCHEDULED_RIDE_MIN_LEAD_MIN - just a sane
// client-side floor for the date/time picker; the backend is the real source
// of truth and still validates this itself.
export const MIN_SCHEDULE_LEAD_MIN = 30;
export const MAX_SCHEDULE_LEAD_DAYS = 7;

export const ACTIVE_RIDE_STATUSES = [
  RIDE_STATUS.REQUESTED,
  RIDE_STATUS.ACCEPTED,
  RIDE_STATUS.ARRIVED,
  RIDE_STATUS.IN_PROGRESS,
];

// Rides in these statuses are done - safe to remove from a user's own history.
export const TERMINAL_RIDE_STATUSES = [RIDE_STATUS.COMPLETED, RIDE_STATUS.CANCELLED];

export const PAYMENT_METHOD = {
  CASH: 'CASH',
  CARD: 'CARD',
  BANKILY: 'BANKILY',
  SEDAD: 'SEDAD',
  MASRIVI: 'MASRIVI',
  CLICK: 'CLICK',
  BIMBANK: 'BIMBANK',
};

// No gateway API for these Mauritanian mobile-money apps (mirrors
// backend/src/utils/paymentMethod.util.js) - kept as-is (including the
// retired Click/Bimbank) only so any old ride still using them keeps
// rendering as mobile money. See PaymentStatus.js's isMobileMoney check -
// nothing new can be created with Click/Bimbank anymore, see
// SUPPORTED_MOBILE_MONEY_METHODS below for what's actually selectable today.
export const MOBILE_MONEY_METHODS = [
  PAYMENT_METHOD.BANKILY,
  PAYMENT_METHOD.SEDAD,
  PAYMENT_METHOD.MASRIVI,
  PAYMENT_METHOD.CLICK,
  PAYMENT_METHOD.BIMBANK,
];

// The only mobile-money apps a user can newly select today (mirrors
// backend's paymentMethod.util.js#SUPPORTED_MOBILE_MONEY_METHODS) - a
// driver's own wallet top-up, a driver declaring a settlement paid, or a
// client's ride payment method.
export const SUPPORTED_MOBILE_MONEY_METHODS = [PAYMENT_METHOD.BANKILY, PAYMENT_METHOD.SEDAD, PAYMENT_METHOD.MASRIVI];

// Shown in the client's payment picker, in this order. CARD (Stripe), Click
// and Bimbank are retired from selection; WALLET/COMPANY exist in the
// backend enum but were never user-selectable here.
export const CLIENT_PAYMENT_METHODS = [PAYMENT_METHOD.CASH, ...SUPPORTED_MOBILE_MONEY_METHODS];

// Store listing IDs for each app, used to send a driver straight to its
// App Store/Play Store page after declaring a wallet top-up (RechargeScreen)
// - none of these publish a documented custom URL scheme (tried and
// confirmed unreliable), but the store listing itself shows an "Open" button
// when the app's already installed, or "Get/Install" otherwise - a real app
// launch either way, just one tap further than a direct deep link.
export const PAYMENT_APP_STORE_IDS = {
  [PAYMENT_METHOD.BANKILY]: { ios: '1460115201', android: 'mr.bpm.digitalbanking.consumer' },
  [PAYMENT_METHOD.SEDAD]: { ios: '1613951511', android: 'mr.digi.sedad' },
  [PAYMENT_METHOD.MASRIVI]: { ios: '1540766096', android: 'com.tagpay.mwallet.masrvi' },
};

export const MAP_DEFAULTS = {
  // Casablanca - just a sane fallback center before a real GPS fix arrives.
  latitude: 33.5731,
  longitude: -7.5898,
  zoom: 14,
};

export const LOCATION_TRACKING_OPTIONS = {
  timeInterval: 3000,
  distanceInterval: 10,
};

export const RIDE_POLL_INTERVAL_MS = 6000;
