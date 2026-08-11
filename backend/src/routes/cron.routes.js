const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const { requireCronSecret } = require('../middleware/cronAuth.middleware');
const { runReminderChecks } = require('../jobs/reminder.job');
const { runSchedulingCheck } = require('../jobs/scheduling.job');

const router = Router();

router.use(requireCronSecret);

router.get(
  '/reminders',
  asyncHandler(async (req, res) => {
    await runReminderChecks();
    sendSuccess(res, { data: { ok: true } });
  })
);

router.get(
  '/scheduling',
  asyncHandler(async (req, res) => {
    await runSchedulingCheck();
    sendSuccess(res, { data: { ok: true } });
  })
);

module.exports = router;
