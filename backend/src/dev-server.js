// Local-only entry point. Production runs as a stateless Vercel function
// (see api/index.js) with no .listen() call and no persistent process - this
// file exists purely so `npm run dev` still has something to bind a port to.
const env = require('./config/env');
const logger = require('./config/logger');
const app = require('./app');

app.listen(env.PORT, '0.0.0.0', () => {
  logger.info(`Dev server listening on http://0.0.0.0:${env.PORT} (${env.NODE_ENV})`);
});
