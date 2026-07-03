export function formatDistance(distanceKm) {
  if (distanceKm == null) return '-';
  return `${distanceKm.toFixed(1)} km`;
}

export function formatDuration(durationMin) {
  if (durationMin == null) return '-';
  return `${Math.round(durationMin)} min`;
}

export function formatFare(estimatedFare) {
  if (estimatedFare == null) return '-';
  return `${estimatedFare.toFixed(2)}`;
}

export function formatDateTime(isoString) {
  if (!isoString) return '-';
  const date = new Date(isoString);
  return date.toLocaleString();
}

export function formatPaymentMethod(paymentMethod) {
  return paymentMethod === 'CARD' ? 'Card' : 'Cash';
}
