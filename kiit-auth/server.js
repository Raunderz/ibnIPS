// @ts-check

import express from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { config } from './config.js';
import { connectWithRetry } from './lib/mongo.js';
import authRouter from './routes/auth.js';
import apiRouter from './routes/api.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/*
 * Rate limiting keys on req.ip, which is only the real client address when
 * the proxy hop is trusted. Without this, every request behind a proxy
 * collapses into a single bucket.
 */
app.set('trust proxy', config.trustProxy);

/*
 * One unguessable nonce per request, so the CSP can authorise exactly our own
 * inline scripts instead of falling back to 'unsafe-inline'.
 *
 * @type {import('express').RequestHandler}
 */
app.use((req, res, next) => {
  res.locals.cspNonce = randomBytes(16).toString('base64');
  next();
});

/*
 * Security headers.
 */
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],

        scriptSrc: [
          "'self'",
          /**
           * Helmet types the callback against the raw http response, so
           * reach res.locals through the express view of it.
           *
           * @param {unknown} _req
           * @param {import('node:http').ServerResponse} res
           * @returns {string}
           */
          (_req, res) => `'nonce-${/** @type {import('express').Response} */ (res).locals.cspNonce}'`,
          "https://accounts.google.com"
        ],

        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://accounts.google.com"
        ],

        connectSrc: [
          "'self'",
          "https://accounts.google.com",
          "https://accounts.google.com/gsi/"
        ],

        frameSrc: [
          "'self'",
          "https://accounts.google.com",
          "https://accounts.google.com/gsi/"
        ],
        imgSrc: [
          "'self'",
          "data:",
          "https:"
        ],

        fontSrc: [
          "'self'",
          "https:",
          "data:"
        ],

        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"]
      }
    },
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
  })
);
/*
 * Parse JSON bodies.
 * 10 KB is more than enough for our auth requests.
 */
app.use(express.json({ limit: '10kb' }));

/*
 * Redirect the template's real path to the rendered page. This must precede
 * express.static, which would otherwise serve the raw file with its
 * unsubstituted placeholders.
 */
app.get('/index.html', (req, res) => {
  res.redirect(301, '/');
});

/*
 * Serve the frontend.
 */
app.use(
  express.static(path.join(__dirname, 'public'), {
    index: false,
    maxAge: config.nodeEnv === 'production' ? '1h' : 0
  })
);

/*
 * The page carries two per-deployment/per-request values that must not be
 * baked into the HTML file: the CSP nonce that authorises its inline script,
 * and the OAuth client ID that must match GOOGLE_CLIENT_ID on the server.
 *
 * The client ID is injected as a complete JSON literal, so a value
 * containing quotes or angle brackets cannot break out of the script context.
 */
app.get('/', async (req, res, next) => {
  try {
    const template = await readFile(
      path.join(__dirname, 'public', 'index.html'),
      'utf8'
    );

    const page = template
      .replaceAll('__CSP_NONCE__', res.locals.cspNonce)
      .replaceAll('__GOOGLE_CLIENT_ID__', JSON.stringify(config.googleClientId));

    res.type('html').send(page);
  } catch (error) {
    next(error);
  }
});

/*
 * Rate limit Google authentication requests.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts. Please try again later.'
  }
});

/*
 * Rate limit normal API requests.
 */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Please try again later.'
  }
});

/*
 * Health check. Reports `degraded` when MongoDB is not connected so a load
 * balancer can drain the instance instead of routing traffic at it.
 */
app.get('/healthz', (req, res) => {
  const connected = mongoose.connection.readyState === 1;

  res.status(connected ? 200 : 503).json({
    status: connected ? 'ok' : 'degraded',
    database: connected ? 'connected' : 'disconnected'
  });
});

/*
 * Authentication routes.
 */
app.use('/auth', authLimiter, authRouter);

/*
 * Protected API routes.
 */
app.use('/api', apiLimiter, apiRouter);

/*
 * Handle unknown routes.
 */
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found'
  });
});

/*
 * Central error handler.
 */
app.use(errorHandler);

/*
 * The configured Express app, exported so tests can drive the real middleware
 * chain without opening a database connection or binding the production port.
 */
export { app };

/**
 * Start the application.
 */
async function startServer() {
  await connectWithRetry(config.mongodbUri);

  console.log('MongoDB connected');

  const server = app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
  });

  /*
   * Stop accepting connections, then drain the MongoDB pool. Without this,
   * a redeploy leaves sockets open and in-flight requests get cut off.
   */
  let shuttingDown = false;

  for (const signal of /** @type {const} */ (['SIGINT', 'SIGTERM'])) {
    process.on(signal, () => {
      if (shuttingDown) {
        return;
      }

      shuttingDown = true;
      console.log(`${signal} received, shutting down`);

      server.close(async () => {
        await mongoose.connection.close();
        process.exit(0);
      });

      // Do not hang forever on lingering keep-alive sockets.
      setTimeout(() => process.exit(1), 10000).unref();
    });
  }
}

/*
 * Only listen when run as a program. Importing this module (tests, tooling)
 * must not bind a port or require MongoDB.
 */
const isEntryPoint =
  process.argv[1] !== undefined && path.resolve(process.argv[1]) === __filename;

if (isEntryPoint) {
  startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}
