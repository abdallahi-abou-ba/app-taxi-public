const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const authService = require('../services/auth.service');

const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  sendSuccess(res, { data: result, status: 201 });
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  sendSuccess(res, { data: result });
});

const refresh = asyncHandler(async (req, res) => {
  const result = await authService.refresh(req.body.refreshToken);
  sendSuccess(res, { data: result });
});

const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.body.refreshToken);
  sendSuccess(res, { data: null });
});

module.exports = { register, login, refresh, logout };
