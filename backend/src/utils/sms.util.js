const env = require('../config/env');
const logger = require('../config/logger');
const AppError = require('./appError');

// Only a stub provider exists today (see env.js's SMS_PROVIDER doc comment) -
// the code is logged instead of sent, and phoneOtp.service.js surfaces it
// back in the API response (devCode) so the app can still be used end-to-end
// without a paid SMS account. Add a real provider by adding one more
// `else if (env.SMS_PROVIDER === '...')` branch here.
async function sendOtpSms(phone, code) {
  if (env.SMS_PROVIDER === 'stub') {
    logger.info(`[stub SMS] OTP for ${phone}: ${code}`);
    return { delivered: false, stub: true };
  }
  throw new AppError(`Unsupported SMS_PROVIDER: ${env.SMS_PROVIDER}`, 500, 'CONFIGURATION_ERROR');
}

module.exports = { sendOtpSms };
