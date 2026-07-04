const http = require('http');
const env = require('./config/env');
const logger = require('./config/logger');
const app = require('./app');
const prisma = require('./lib/prisma');
const { initSocket } = require('./sockets');
const { startReminderJob } = require('./jobs/reminder.job');
const { startSchedulingJob } = require('./jobs/scheduling.job');

const httpServer = http.createServer(app);
initSocket(httpServer);

const server = httpServer.listen(env.PORT, '0.0.0.0', () => {
  logger.info(`Server listening on http://0.0.0.0:${env.PORT} (${env.NODE_ENV})`);
});

const reminderInterval = startReminderJob();
const schedulingInterval = startSchedulingJob();

async function shutdown(signal) {
  logger.info(`${signal} received, shutting down gracefully...`);
  clearInterval(reminderInterval);
  clearInterval(schedulingInterval);
  server.close(async () => {
    await prisma.$disconnect();
    logger.info('Shutdown complete.');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
