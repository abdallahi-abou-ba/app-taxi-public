export const ROLE = {
  CLIENT: 'CLIENT',
  DRIVER: 'DRIVER',
};

export const RIDE_STATUS = {
  REQUESTED: 'REQUESTED',
  ACCEPTED: 'ACCEPTED',
  ARRIVED: 'ARRIVED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

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
};

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
