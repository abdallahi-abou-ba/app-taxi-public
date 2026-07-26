// Methods where money flows client -> driver directly (the company never
// touches it) - see PaymentMethod's own doc comment in schema.prisma.
// Grouped with CASH for commission purposes (settlement.service.js) - kept
// as-is (including the retired Click/Bimbank) purely so historical rides
// already using them still group/aggregate correctly; nothing new can be
// created with those two anymore, see SUPPORTED_MOBILE_MONEY_METHODS below.
const DRIVER_COLLECTED_METHODS = ['CASH', 'BANKILY', 'SEDAD', 'MASRIVI', 'CLICK', 'BIMBANK'];
const MOBILE_MONEY_METHODS = DRIVER_COLLECTED_METHODS.filter((method) => method !== 'CASH');

// The only mobile-money apps a user can newly select today - for a driver's
// own wallet top-up (wallet.service.js), a client's ride payment method, or a
// driver declaring a settlement paid. Narrower than MOBILE_MONEY_METHODS
// above (retired Click/Bimbank still recognized on old rides, just no longer
// choosable) - these three are the ones the company has a working transfer
// number/account for.
const SUPPORTED_MOBILE_MONEY_METHODS = ['BANKILY', 'SEDAD', 'MASRIVI'];

module.exports = { DRIVER_COLLECTED_METHODS, MOBILE_MONEY_METHODS, SUPPORTED_MOBILE_MONEY_METHODS };
