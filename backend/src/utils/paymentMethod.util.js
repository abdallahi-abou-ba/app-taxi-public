// Methods where money flows client -> driver directly (the company never
// touches it) - see PaymentMethod's own doc comment in schema.prisma.
// Grouped with CASH for commission purposes (settlement.service.js) and,
// beyond CASH, all subject to the manual "declare paid / confirm received"
// flow (ride.service.js#declareRidePaidByClient/confirmRidePaymentReceived)
// since none of these Mauritanian mobile-money apps expose a payment gateway
// API - CARD is the only method with a real automated payment flow (Stripe).
const DRIVER_COLLECTED_METHODS = ['CASH', 'BANKILY', 'SEDAD', 'MASRIVI', 'CLICK', 'BIMBANK'];
const MOBILE_MONEY_METHODS = DRIVER_COLLECTED_METHODS.filter((method) => method !== 'CASH');

module.exports = { DRIVER_COLLECTED_METHODS, MOBILE_MONEY_METHODS };
