const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./config/env');
const logger = require('./config/logger');
const routes = require('./routes');
const notFoundMiddleware = require('./middleware/notFound.middleware');
const errorMiddleware = require('./middleware/error.middleware');

const app = express();

// Railway (and most PaaS) put exactly one reverse proxy in front of this app -
// trust that one hop so req.ip / express-rate-limit read the real client IP
// from X-Forwarded-For instead of rejecting the header as unexpected.
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());
app.use(
  morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined', {
    stream: { write: (message) => logger.info(message.trim()) },
  })
);

app.use('/api', routes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
