// @ts-check

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  generateApiKey,
  hashApiKey,
  API_KEY_PREFIX,
  API_KEY_PREFIX_LENGTH
} from '../lib/apiKey.js';

test('generated keys carry the kiit_ marker and a stable-length prefix', () => {
  const key = generateApiKey(32);

  assert.ok(key.raw.startsWith(API_KEY_PREFIX));
  assert.equal(key.prefix, key.raw.slice(0, API_KEY_PREFIX_LENGTH));
  assert.equal(key.prefix.length, 9);
  assert.ok(key.prefix.startsWith(API_KEY_PREFIX));
});

test('the random body only uses the base64url alphabet', () => {
  for (let i = 0; i < 50; i += 1) {
    const key = generateApiKey(32);
    const body = key.raw.slice(API_KEY_PREFIX.length);

    assert.match(body, /^[A-Za-z0-9_-]+$/);
  }
});

test('key length scales with the requested entropy', () => {
  // base64url: 4 characters per 3 bytes, rounded up.
  assert.equal(generateApiKey(16).raw.length, API_KEY_PREFIX.length + 22);
  assert.equal(generateApiKey(32).raw.length, API_KEY_PREFIX.length + 43);
  assert.equal(generateApiKey(64).raw.length, API_KEY_PREFIX.length + 86);
});

test('keys do not repeat', () => {
  const seen = new Set();

  for (let i = 0; i < 500; i += 1) {
    seen.add(generateApiKey(32).raw);
  }

  assert.equal(seen.size, 500);
});

test('hashing is deterministic and 64 lowercase hex chars', () => {
  const key = generateApiKey(32);

  assert.equal(hashApiKey(key.raw), key.hash);
  assert.equal(hashApiKey(key.raw), hashApiKey(key.raw));
  assert.match(key.hash, /^[0-9a-f]{64}$/);
});

test('the hash does not leak the plaintext key', () => {
  const key = generateApiKey(32);

  assert.ok(!key.hash.includes(key.raw));
  assert.ok(!key.raw.includes(key.hash));
});

test('distinct keys hash differently', () => {
  assert.notEqual(hashApiKey(generateApiKey(32).raw), hashApiKey(generateApiKey(32).raw));
});

test('hashing is stable across unicode input without throwing', () => {
  assert.match(hashApiKey('kiit_\u00e9\u4e2d'), /^[0-9a-f]{64}$/);
});
