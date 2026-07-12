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

// Shown in the client's payment picker, in this order. WALLET/COMPANY exist
// in the backend enum but aren't user-selectable here.
export const CLIENT_PAYMENT_METHODS = [
  PAYMENT_METHOD.CASH,
  PAYMENT_METHOD.CARD,
  PAYMENT_METHOD.BANKILY,
  PAYMENT_METHOD.SEDAD,
  PAYMENT_METHOD.MASRIVI,
  PAYMENT_METHOD.CLICK,
  PAYMENT_METHOD.BIMBANK,
];

export const MAP_DEFAULTS = {
  // Casablanca - just a sane fallback center before a real GPS fix arrives.
  latitude: 33.5731,
  longitude: -7.5898,
  zoom: 14,
};

export const LOCATION_TRACKING_OPTIONS = {
  timeInterval: 4000,
  distanceInterval: 25,
};

export const RIDE_POLL_INTERVAL_MS = 6000;

// Refresh the access token a bit before its real 15-minute expiry so an
// idle-but-connected socket doesn't sit on a token that would fail to
// reconnect after a network blip.
export const PROACTIVE_TOKEN_REFRESH_MS = 14 * 60 * 1000;
