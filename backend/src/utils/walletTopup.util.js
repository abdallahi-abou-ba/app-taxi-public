// Fixed set of amounts a driver can pick for a wallet top-up - not
// admin-configurable (unlike the merchant code), so mirrored as a plain
// constant here and in mobile/src/config/constants.js.
const WALLET_TOPUP_PRESET_AMOUNTS = [500, 1000, 2000, 5000];

module.exports = { WALLET_TOPUP_PRESET_AMOUNTS };
