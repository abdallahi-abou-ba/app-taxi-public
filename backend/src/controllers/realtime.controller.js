const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const { getAbly } = require('../lib/realtime');

// Mobile clients never publish directly - every event is server-originated
// (see lib/realtime.js#publishToUser) - so the token this issues only ever
// grants 'subscribe' on the caller's own channel, never 'publish'.
const createToken = asyncHandler(async (req, res) => {
  const tokenRequest = await getAbly().auth.createTokenRequest({
    clientId: req.user.id,
    capability: JSON.stringify({ [`user:${req.user.id}`]: ['subscribe'] }),
  });
  sendSuccess(res, { data: tokenRequest });
});

module.exports = { createToken };
