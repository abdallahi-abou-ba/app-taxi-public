const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const messageService = require('../services/message.service');

const listMessages = asyncHandler(async (req, res) => {
  const messages = await messageService.listMessages(req.user.id, req.params.id);
  sendSuccess(res, { data: messages });
});

const sendMessage = asyncHandler(async (req, res) => {
  const message = await messageService.sendMessage(req.user.id, req.params.id, req.body.body);
  sendSuccess(res, { data: message, status: 201 });
});

module.exports = { listMessages, sendMessage };
