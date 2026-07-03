// Runs before the test framework and before any test file requires app
// code, so these env vars are in place before src/config/env.js first reads
// process.env (config/env.js's own dotenv.config() call won't override
// values already set here - that's dotenv's default behavior).
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.test') });
