const { ZodError } = require('zod');
const { Prisma } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const AppError = require('../utils/appError');
const { sendError } = require('../utils/apiResponse');
const logger = require('../config/logger');
const env = require('../config/env');

function errorMiddleware(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err instanceof AppError) {
    return sendError(res, { message: err.message, code: err.code, status: err.status, details: err.details });
  }

  if (err instanceof ZodError) {
    return sendError(res, {
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      status: 400,
      details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return sendError(res, { message: `A record with this ${err.meta?.target || 'value'} already exists`, code: 'CONFLICT', status: 409 });
    }
    if (err.code === 'P2025') {
      return sendError(res, { message: 'Record not found', code: 'NOT_FOUND', status: 404 });
    }
  }

  if (err instanceof jwt.JsonWebTokenError || err instanceof jwt.TokenExpiredError) {
    return sendError(res, { message: 'Invalid or expired token', code: 'UNAUTHORIZED', status: 401 });
  }

  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large' : 'Invalid file upload';
    return sendError(res, { message, code: err.code, status: 400 });
  }

  logger.error('Unhandled error:', err);
  return sendError(res, {
    message: env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    code: 'INTERNAL_ERROR',
    status: 500,
  });
}

module.exports = errorMiddleware;
