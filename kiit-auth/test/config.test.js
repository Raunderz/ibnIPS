// @ts-check

import assert from 'node:assert/strict';
import test from 'node:test';
import { execFile } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(here, '..');
const configUrl = pathToFileURL(path.join(projectRoot, 'config.js')).href;

/** Env that makes config.js importable, with room for per-test overrides. */
/** @type {Record<string, string>} */
const BASE_ENV = {
  MONGODB_URI: 'mongodb://127.0.0.1:27017/test',
  GOOGLE_CLIENT_ID: 'test-client-id'
};

/**
 * Import config.js in a child process with the given env overrides, so one
 * bad value cannot poison the config module for the rest of the suite.
 *
 * @param {Record<string, string | undefined>} overrides
 * @returns {Promise<{ code: number, stdout: string, stderr: string }>}
 */
async function loadConfig(overrides) {
  /*
   * Inherit the parent environment so the child has what Node itself needs on
   * this platform, then apply overrides last.
   *
   * The child runs from a directory with no .env, because config.js imports
   * dotenv/config and dotenv resolves .env relative to cwd. Running from the
   * project root would silently re-supply MONGODB_URI and friends, making
   * "these are required" untestable.
   *
   * @type {Record<string, string>}
   */
  const env = { ...process.env, ...BASE_ENV };

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete env[key];
    } else {
      env[key] = value;
    }
  }

  try {
    const { stdout, stderr } = await run(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `const { config } = await import(${JSON.stringify(configUrl)});` +
          'console.log(JSON.stringify(config));'
      ],
      { env, cwd: os.tmpdir() }
    );

    return { code: 0, stdout, stderr };
  } catch (error) {
    const failure = /** @type {{ code?: number, stdout?: string, stderr?: string }} */ (
      error
    );

    return {
      code: failure.code ?? 1,
      stdout: failure.stdout ?? '',
      stderr: failure.stderr ?? ''
    };
  }
}

test('a valid environment produces a usable config', async () => {
  const { code, stdout } = await loadConfig({
    ALLOWED_DOMAIN: 'KIIT.ac.in',
    PORT: '8080',
    API_KEY_BYTES: '48',
    TRUST_PROXY: '2'
  });

  assert.equal(code, 0);

  const config = JSON.parse(stdout);

  assert.equal(config.port, 8080);
  assert.equal(config.allowedDomain, 'kiit.ac.in');
  assert.equal(config.apiKeyBytes, 48);
  assert.equal(config.trustProxy, 2);
});

test('required secrets are enforced', async () => {
  for (const key of /** @type {const} */ (['MONGODB_URI', 'GOOGLE_CLIENT_ID'])) {
    const { code, stderr } = await loadConfig({ [key]: undefined });

    assert.notEqual(code, 0, `${key} should be required`);
    assert.match(stderr, new RegExp(key));
  }
});

test('ALLOWED_DOMAIN rejects values that are not a bare domain name', async () => {
  const rejected = [
    '',                    // empty
    'kiit.ac.in.',         // trailing dot
    '@kiit.ac.in',         // leading @
    'https://kiit.ac.in',  // scheme
    'kiit ac in',          // whitespace
    'kiit.ac.in/../evil',  // path traversal shape
    'kiit.ac.in:27017',    // port
    'localhost',
    '1.2.3.4'
  ];

  for (const value of rejected) {
    const { code, stderr } = await loadConfig({ ALLOWED_DOMAIN: value });

    assert.notEqual(code, 0, `"${value}" should be rejected`);
    assert.match(stderr, /ALLOWED_DOMAIN/);
  }
});

test('PORT is range checked', async () => {
  for (const value of ['0', '-1', '70000', 'abc', '80.5']) {
    const { code } = await loadConfig({ PORT: value });

    assert.notEqual(code, 0, `PORT=${value} should be rejected`);
  }
});

test('API_KEY_BYTES has a floor', async () => {
  for (const value of ['8', '15', '-32', 'nope']) {
    const { code } = await loadConfig({ API_KEY_BYTES: value });

    assert.notEqual(code, 0, `API_KEY_BYTES=${value} should be rejected`);
  }
});

test('TRUST_PROXY is a sane hop count', async () => {
  for (const value of ['-1', '99', 'true', 'x']) {
    const { code, stderr } = await loadConfig({ TRUST_PROXY: value });

    assert.notEqual(code, 0, `TRUST_PROXY=${value} should be rejected`);
    assert.match(stderr, /TRUST_PROXY/);
  }

  // 0 (no proxy) is the safe default and must stay allowed.
  assert.equal((await loadConfig({ TRUST_PROXY: '0' })).code, 0);
});
