// @ts-check

import {
  createHash,
  randomBytes
} from 'node:crypto';

/**
 * Every issued key starts with this marker, so an obvious non-KIIT value can
 * be rejected without touching the database.
 */
export const API_KEY_PREFIX = 'kiit_';

/**
 * Number of leading characters kept as a human-recognisable prefix.
 * "kiit_" plus four characters of the random part.
 */
export const API_KEY_PREFIX_LENGTH = 9;

/**
 * Generate a new API key.
 *
 * The key is high-entropy random material, so SHA-256 is an appropriate
 * one-way digest here: the plaintext is never recoverable from the stored
 * hash, and there is no password stretching to do.
 *
 * @param {number} bytes
 * @returns {{ raw: string, hash: string, prefix: string }}
 */
export function generateApiKey(bytes) {
  const randomPart = randomBytes(bytes).toString('base64url');
  const raw = `${API_KEY_PREFIX}${randomPart}`;

  return {
    raw,
    hash: hashApiKey(raw),
    prefix: raw.slice(0, API_KEY_PREFIX_LENGTH)
  };
}

/**
 * Hash an API key using SHA-256.
 *
 * @param {string} raw
 * @returns {string}
 */
export function hashApiKey(raw) {
  return createHash('sha256')
    .update(raw, 'utf8')
    .digest('hex');
}
