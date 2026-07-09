const { z } = require('zod');

const DOCUMENT_TYPE_VALUES = ['PHOTO', 'ID_CARD', 'LICENSE'];

const documentTypeParamSchema = z.object({
  type: z.enum(DOCUMENT_TYPE_VALUES),
});

const driverDocumentTypeParamSchema = z.object({
  id: z.string().uuid('Invalid driver id'),
  type: z.enum(DOCUMENT_TYPE_VALUES),
});

module.exports = { DOCUMENT_TYPE_VALUES, documentTypeParamSchema, driverDocumentTypeParamSchema };
