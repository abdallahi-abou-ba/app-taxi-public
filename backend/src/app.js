// test: verifying Vercel auto-deploy on git push
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./config/env');
const logger = require('./config/logger');
const routes = require('./routes');
const paymentController = require('./controllers/payment.controller');
const notFoundMiddleware = require('./middleware/notFound.middleware');
const errorMiddleware = require('./middleware/error.middleware');

const app = express();

// Railway (and most PaaS) put exactly one reverse proxy in front of this app -
// trust that one hop so req.ip / express-rate-limit read the real client IP
// from X-Forwarded-For instead of rejecting the header as unexpected.
app.set('trust proxy', 1);

// HSTS tells the browser to remember "always use HTTPS for this host" for a
// year - correct in production (Railway terminates real TLS), but actively
// breaks local dev: the plain-HTTP admin page at /admin would get silently
// upgraded to a https:// URL that doesn't exist here on any visit after the
// first, with every fetch() failing with no visible error. Only enable it
// where the site is actually served over HTTPS.
app.use(helmet({ hsts: env.NODE_ENV === 'production' }));
// CORS_ORIGIN is a single string ('*' or one origin) or a comma-separated
// list - needed now that the admin SPA is a separate Vercel project instead
// of being served same-origin (see the removed /admin static mount below).
const corsOrigins = env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN.split(',').map((origin) => origin.trim());
app.use(cors({ origin: corsOrigins }));

// Stripe needs the exact raw request body to verify the webhook signature,
// so this is registered before the global express.json() below (which would
// otherwise parse-and-reserialize it, breaking the signature check).
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), paymentController.handleStripeWebhook);

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
