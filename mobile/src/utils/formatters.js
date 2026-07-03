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

export function formatDateTime(isoString, locale) {
  if (!isoString) return '-';
  const date = new Date(isoString);
  return date.toLocaleString(locale);
}

// t = the i18next `t` function from useTranslation(), so the label follows
// whichever language is currently active.
export function formatPaymentMethod(paymentMethod, t) {
  return t(paymentMethod === 'CARD' ? 'payment.card' : 'payment.cash');
}
