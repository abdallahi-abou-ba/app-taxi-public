function sendSuccess(res, { data = null, meta = undefined, status = 200 } = {}) {
  const body = { success: true, data };
  if (meta !== undefined) body.meta = meta;
  return res.status(status).json(body);
}

function sendError(res, { message = 'Internal server error', code = 'INTERNAL_ERROR', status = 500, details = undefined } = {}) {
  const body = { success: false, error: { message, code } };
  if (details !== undefined) body.error.details = details;
  return res.status(status).json(body);
}

module.exports = { sendSuccess, sendError };
