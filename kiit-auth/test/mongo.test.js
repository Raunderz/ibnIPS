// @ts-check

import assert from 'node:assert/strict';
import test from 'node:test';

import { isTransientConnectError } from '../lib/mongo.js';

/**
 * @param {string} name
 * @returns {Error}
 */
function driverError(name) {
  const error = new Error('simulated');
  error.name = name;
  return error;
}

test('network-level failures are treated as transient', () => {
  for (const name of [
    'MongoNetworkError',
    'MongoNetworkTimeoutError',
    'MongoTopologyClosedError'
  ]) {
    assert.equal(isTransientConnectError(driverError(name)), true, name);
  }
});

test('structural and credential failures are not retried', () => {
  // Retrying these only delays the real diagnosis.
  for (const name of [
    'MongoParseError',
    'MongoServerSelectionError',
    'MongooseServerSelectionError',
    'MongoInvalidCredentialsError',
    'MongoNotConnectedError',
    'TypeError'
  ]) {
    assert.equal(isTransientConnectError(driverError(name)), false, name);
  }
});

test('non-error values are rejected without throwing', () => {
  for (const value of [null, undefined, 0, '', 'string', 42, true]) {
    assert.equal(isTransientConnectError(value), false, String(value));
  }
});

test('a real tlsv1 alert error is recognised as transient', () => {
  // This is the exact shape thrown by the Atlas cluster:
  // "MongoNetworkError: ... tlsv1 alert internal error ... SSL alert number 80"
  const error = driverError('MongoNetworkError');
  error.message =
    "807F0000:error:0A000438:SSL routines:ssl3_read_bytes:tlsv1 alert internal error:SSL alert number 80";

  assert.equal(isTransientConnectError(error), true);
});
