// @ts-check

import assert from 'node:assert/strict';
import test, { before, after } from 'node:test';
import express from 'express';

import { errorHandler } from '../middleware/errorHandler.js';

// The handler logs every failure; keep that out of the test report.
const realWarn = console.warn;
const realError = console.error;

before(() => {
  console.warn = () => {};
  console.error = () => {};
});

after(() => {
  console.warn = realWarn;
  console.error = realError;
});

/**
 * Build a throwaway app that reproduces the real middleware order.
 *
 * @param {import('express').RequestHandler} [route]
 * @returns {import('express').Express}
 */
function buildApp(route) {
  const app = express();

  app.use(express.json({ limit: '10kb' }));
  app.post('/echo', route ?? ((req, res) => { res.json({ ok: true }); }));
  app.use(errorHandler);

  return app;
}

/**
 * @param {import('express').Express} app
 * @param {RequestInit & { body?: string }} init
 */
async function request(app, init) {
  const server = app.listen(0);

  try {
    const address = server.address();
    assert.ok(address && typeof address === 'object');

    const response = await fetch(`http://127.0.0.1:${address.port}/echo`, init);

    return {
      status: response.status,
      body: await response.json()
    };
  } finally {
    server.close();
  }
}

/** @type {RequestInit} */
const JSON_HEADERS = {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
};

test('regression: malformed JSON is a 400, not a 500', async () => {
  const response = await request(buildApp(), { ...JSON_HEADERS, body: '{not json' });

  assert.equal(response.status, 400);
  assert.equal(response.body.error, 'Bad request');
});

test('an empty body parses to {} rather than faulting', async () => {
  const app = buildApp((req, res) => res.json({ parsed: req.body }));

  const response = await request(app, { ...JSON_HEADERS, body: '' });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { parsed: {} });
});

test('a body over the size limit reports 413', async () => {
  const response = await request(buildApp(), {
    ...JSON_HEADERS,
    body: JSON.stringify({ pad: 'x'.repeat(20_000) })
  });

  assert.equal(response.status, 413);
  assert.equal(response.body.error, 'Payload too large');
});

test('genuine server faults still report 500 with no internals leaked', async () => {
  const app = buildApp(() => {
    throw new Error('mongodb://user:hunter2@internal-host/db exploded');
  });

  const response = await request(app, { ...JSON_HEADERS, body: '{}' });

  assert.equal(response.status, 500);
  assert.deepEqual(response.body, { error: 'Internal server error' });
  assert.ok(!JSON.stringify(response.body).includes('hunter2'));
});

test('a valid body is untouched', async () => {
  const response = await request(buildApp(), { ...JSON_HEADERS, body: '{"ok":true}' });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { ok: true });
});
