// Mirrors backend/prisma/schema.prisma's PaymentMethod enum.
export const PAYMENT_METHOD_LABELS = {
  CASH: 'Espèces',
  CARD: 'Carte',
  BANKILY: 'Bankily',
  SEDAD: 'Sedad',
  MASRIVI: 'Masrivi',
  CLICK: 'Click',
  BIMBANK: 'Bimbank',
  WALLET: 'Portefeuille',
  COMPANY: 'Compte société',
};

export function formatPaymentMethod(method) {
  return PAYMENT_METHOD_LABELS[method] || method;
}
