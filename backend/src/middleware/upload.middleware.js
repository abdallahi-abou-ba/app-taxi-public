const multer = require('multer');
const env = require('../config/env');
const AppError = require('../utils/appError');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new AppError('File must be a JPEG/PNG image or a PDF', 400, 'INVALID_FILE_TYPE'));
  }
  cb(null, true);
}

// Memory storage, not disk: documents are stored as a Postgres bytea (see
// DriverDocument), never written to the filesystem.
const uploadDocument = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_DOC_SIZE_MB * 1024 * 1024 },
  fileFilter,
}).single('file');

module.exports = { uploadDocument, ALLOWED_MIME_TYPES };
