// @ts-check

import assert from 'node:assert/strict';
import test, { before, after } from 'node:test';

/*
 * config.js validates its environment at import time, so the values are set
 * before server.js is pulled in. dotenv never overwrites variables that are
 * already present, so a developer's real .env cannot interfere.
 */
process.env.MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/test';
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? 'test-client-id.apps.googleusercontent.com';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

const { app } = await import('../server.js');

const realWarn = console.warn;
const realError = console.error;
const realLog = console.log;

let baseUrl = '';
let server = null;

/** @type {import('node:http').Server} */
let httpServer;

before(async () => {
  console.warn = () => {};
  console.error = () => {};
  console.log = () => {};

  httpServer = app.listen(0);
  await new Promise((resolve) => httpServer.once('listening', resolve));

  const address = httpServer.address();
  assert.ok(address && typeof address === 'object');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  console.warn = realWarn;
  console.error = realError;
  console.log = realLog;

  if (httpServer) {
    await new Promise((resolve) => httpServer.close(resolve));
  }
});

test('the login page substitutes the CSP nonce and the OAuth client ID', async () => {
  const response = await fetch(`${baseUrl}/`);
  const page = await response.text();

  assert.equal(response.status, 200);
  assert.ok(!page.includes('__CSP_NONCE__'), 'nonce placeholder should be gone');
  assert.ok(
    !page.includes('__GOOGLE_CLIENT_ID__'),
    'client ID placeholder should be gone'
  );
  assert.match(page, /nonce="[A-Za-z0-9+/=]+"/);
  assert.ok(page.includes(CLIENT_ID));
});

test('the page nonce matches the one advertised in the CSP header', async () => {
  const response = await fetch(`${baseUrl}/`);
  const page = await response.text();
  const csp = response.headers.get('content-security-policy');

  assert.ok(csp, 'a CSP header should be present');

  const fromPage = /nonce="([A-Za-z0-9+/=]+)"/.exec(page)?.[1];
  const fromHeader = /'nonce-([A-Za-z0-9+/=]+)'/.exec(csp ?? '')?.[1];

  assert.ok(fromPage, 'page should carry a nonce');
  assert.equal(fromPage, fromHeader);
});

test('regression: CSP no longer allows unsafe-inline scripts', async () => {
  const response = await fetch(`${baseUrl}/`);
  const csp = response.headers.get('content-security-policy') ?? '';
  const scriptSrc = /script-src([^;]*)/.exec(csp)?.[1] ?? '';

  assert.ok(!scriptSrc.includes("'unsafe-inline'"), 'script-src must not allow unsafe-inline');
  assert.ok(scriptSrc.includes("'nonce-"), 'script-src should require a nonce');
});

test('each request gets a fresh nonce', async () => {
  const first = await (await fetch(`${baseUrl}/`)).text();
  const second = await (await fetch(`${baseUrl}/`)).text();

  const nonceOf = (/** @type {string} */ html) => /nonce="([A-Za-z0-9+/=]+)"/.exec(html)?.[1];

  assert.ok(nonceOf(first) && nonceOf(second));
  assert.notEqual(nonceOf(first), nonceOf(second));
});

test('the page carries a visible sign-in status fallback', async () => {
  // The status text lives in the markup on purpose: if the inline script is
  // blocked, nothing can update it, and the page must not look simply empty.
  const page = await (await fetch(`${baseUrl}/`)).text();

  assert.match(page, /id="signin-status"/);
  assert.match(page, /Loading Google Sign-In/);
});

test('the raw template is not served directly', async () => {
  const response = await fetch(`${baseUrl}/index.html`, { redirect: 'manual' });

  assert.equal(response.status, 301);
  assert.equal(response.headers.get('location'), '/');
});

test('regression: malformed JSON to /auth/google is a 400, not a 500', async () => {
  const response = await fetch(`${baseUrl}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{not json'
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Bad request' });
});

test('a missing credential is rejected with 400 before any Google call', async () => {
  const response = await fetch(`${baseUrl}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}'
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: 'A valid Google credential is required'
  });
});

test('a non-boolean rotate flag is rejected with 400', async () => {
  const response = await fetch(`${baseUrl}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential: 'not-a-real-token', rotate: 'yes' })
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'rotate must be a boolean' });
});

test('API routes require an API key', async () => {
  const response = await fetch(`${baseUrl}/api/me`);

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'Invalid or missing API key' });
});

test('a malformed API key is rejected without a database hit', async () => {
  const response = await fetch(`${baseUrl}/api/me`, {
    headers: { 'x-api-key': 'not-a-kiit-key!' }
  });

  assert.equal(response.status, 401);
});

test('the health check reports degraded while MongoDB is down', async () => {
  const response = await fetch(`${baseUrl}/healthz`);

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    status: 'degraded',
    database: 'disconnected'
  });
});

test('unknown routes return a 404 JSON body', async () => {
  const response = await fetch(`${baseUrl}/does-not-exist`);

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: 'Route not found' });
});

test('standard security headers are present', async () => {
  const response = await fetch(`${baseUrl}/`);

  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('x-frame-options'), 'SAMEORIGIN');
  assert.ok(response.headers.get('content-security-policy'));
  assert.equal(
    response.headers.get('cross-origin-opener-policy'),
    'same-origin-allow-popups'
  );
  assert.equal(
    response.headers.get('referrer-policy'),
    'strict-origin-when-cross-origin'
  );
});
