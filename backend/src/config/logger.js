const env = require('./env');

const levels = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = env.NODE_ENV === 'development' ? levels.debug : levels.info;

function log(level, ...args) {
  if (levels[level] <= currentLevel) {
    const prefix = `[${new Date().toISOString()}] [${level.toUpperCase()}]`;
    (level === 'error' ? console.error : console.log)(prefix, ...args);
  }
}

module.exports = {
  error: (...args) => log('error', ...args),
  warn: (...args) => log('warn', ...args),
  info: (...args) => log('info', ...args),
  debug: (...args) => log('debug', ...args),
};
