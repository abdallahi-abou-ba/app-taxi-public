module.exports = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/tests/setup.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setupAfterEnv.js'],
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  // Serial: tests share one Postgres database and reset it between each
  // test, so parallel workers would race on the same tables.
  maxWorkers: 1,
};
