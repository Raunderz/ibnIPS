// @ts-check

import 'dotenv/config';

/**
 * @param {string} name
 * @returns {string}
 */
function required(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

const port = Number(process.env.PORT ?? 3000);

if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  throw new Error('PORT must be a valid TCP port number');
}

const apiKeyBytes = Number(process.env.API_KEY_BYTES ?? 32);

if (!Number.isInteger(apiKeyBytes) || apiKeyBytes < 16) {
  throw new Error('API_KEY_BYTES must be an integer >= 16');
}

const allowedDomain = (process.env.ALLOWED_DOMAIN ?? 'kiit.ac.in')
  .trim()
  .toLowerCase();

/*
 * The domain gates who may authenticate, so a malformed or over-broad value
 * (e.g. "ac.in" or "kiit.ac.in.evil.test") must fail at boot rather than
 * silently widen or break the check at runtime.
 */
if (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(allowedDomain)) {
  throw new Error(
    `ALLOWED_DOMAIN must be a bare domain name such as "kiit.ac.in" (got "${allowedDomain}")`
  );
}

/*
 * Number of trusted reverse proxies in front of the app (0 = none, 1 = one
 * proxy such as nginx or a cloud load balancer). Rate limiting keys on
 * req.ip, so this must match the real topology or every user shares one
 * bucket. Setting it too high lets clients spoof X-Forwarded-For and bypass
 * limits, which is why it is opt-in rather than defaulted to `true`.
 */
const trustProxy = Number(process.env.TRUST_PROXY ?? 0);

if (!Number.isInteger(trustProxy) || trustProxy < 0 || trustProxy > 10) {
  throw new Error('TRUST_PROXY must be an integer between 0 and 10');
}

export const config = {
  port,
  mongodbUri: required('MONGODB_URI'),
  googleClientId: required('GOOGLE_CLIENT_ID'),
  allowedDomain,
  apiKeyBytes,
  trustProxy,
  nodeEnv: process.env.NODE_ENV ?? 'development'
};