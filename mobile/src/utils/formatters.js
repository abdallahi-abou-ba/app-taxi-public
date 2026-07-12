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
  return `${estimatedFare.toFixed(2)} MRO`;
}

export function formatDateTime(isoString, locale) {
  if (!isoString) return '-';
  const date = new Date(isoString);
  return date.toLocaleString(locale);
}

const PAYMENT_METHOD_KEYS = {
  CASH: 'payment.cash',
  CARD: 'payment.card',
  BANKILY: 'payment.bankily',
  SEDAD: 'payment.sedad',
  MASRIVI: 'payment.masrivi',
  CLICK: 'payment.click',
  BIMBANK: 'payment.bimbank',
};

// t = the i18next `t` function from useTranslation(), so the label follows
// whichever language is currently active.
export function formatPaymentMethod(paymentMethod, t) {
  return t(PAYMENT_METHOD_KEYS[paymentMethod] || 'payment.cash');
}
