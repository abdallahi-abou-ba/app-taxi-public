const { sendError } = require('../utils/apiResponse');

function notFoundMiddleware(req, res) {
  sendError(res, { message: `Route not found: ${req.method} ${req.originalUrl}`, code: 'NOT_FOUND', status: 404 });
}

module.exports = notFoundMiddleware;
