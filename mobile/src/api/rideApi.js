import { api } from './client';

export function requestRide(payload) {
  return api.post('/api/rides', payload);
}

export function scheduleRide(payload) {
  return api.post('/api/rides/scheduled', payload);
}

export function getScheduledRides() {
  return api.get('/api/rides/scheduled');
}

export function listRides() {
  return api.get('/api/rides');
}

export function getActiveRide() {
  return api.get('/api/rides/active');
}

export function getRide(id) {
  return api.get(`/api/rides/${id}`);
}

export function acceptRide(id) {
  return api.patch(`/api/rides/${id}/accept`);
}

export function arriveRide(id) {
  return api.patch(`/api/rides/${id}/arrive`);
}

export function startRide(id) {
  return api.patch(`/api/rides/${id}/start`);
}

export function completeRide(id) {
  return api.patch(`/api/rides/${id}/complete`);
}

export function cancelRide(id, reason) {
  return api.patch(`/api/rides/${id}/cancel`, { reason });
}

export function rateRide(id, rating, comment) {
  return api.post(`/api/rides/${id}/rate`, { rating, comment });
}

export function markRidePaid(id) {
  return api.patch(`/api/rides/${id}/mark-paid`);
}

export function createCheckoutSession(id, { successUrl, cancelUrl }) {
  return api.post(`/api/rides/${id}/checkout-session`, { successUrl, cancelUrl });
}

export function hideRideFromHistory(id) {
  return api.delete(`/api/rides/${id}/history`);
}

export function getRideStats() {
  return api.get('/api/rides/stats');
}
