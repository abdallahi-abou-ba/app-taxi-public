const { z } = require('zod');

const sendMessageSchema = z.object({
  body: z.string().trim().min(1, 'Message cannot be empty').max(1000, 'Message is too long'),
});

module.exports = { sendMessageSchema };
