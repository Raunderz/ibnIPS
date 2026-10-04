// @ts-check

import mongoose from 'mongoose';

/**
 * @typedef {Object} ConnectOptions
 * @property {number} [attempts] Total attempts, including the first.
 * @property {number} [baseDelayMs] First backoff delay; doubles each attempt.
 * @property {number} [maxDelayMs] Ceiling for the backoff delay.
 * @property {number} [serverSelectionTimeoutMs] Per-attempt budget.
 */

/**
 * Whether a failed connection is worth retrying.
 *
 * A TLS handshake the server aborts (`tlsv1 alert internal error`) or a
 * refused/reset socket is transient by nature: the same URI succeeds moments
 * later against the same cluster. Everything else is structural, and retrying
 * only delays the real diagnosis:
 *
 * - `MongoParseError` means the URI or an option is malformed.
 * - A server-selection error means no host could be reached, which for this
 *   connection profile means a wrong host/port or an unrusable address family.
 * - An authentication failure will never succeed on retry.
 *
 * @param {unknown} error
 * @returns {boolean}
 */
export function isTransientConnectError(error) {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const name = /** @type {{ name?: unknown }} */ (error).name;

  return (
    name === 'MongoNetworkError' ||
    name === 'MongoNetworkTimeoutError' ||
    name === 'MongoTopologyClosedError'
  );
}

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Open the MongoDB connection, retrying transient network failures.
 *
 * Managed clusters intermittently abort the TLS handshake, and the driver
 * surfaces that as a terminal MongoNetworkError rather than moving on to the
 * next host. Without an outer retry a healthy cluster can fail to boot, so
 * backoff is applied here rather than trusting a single connect.
 *
 * @param {string} uri
 * @param {ConnectOptions} [options]
 * @returns {Promise<typeof mongoose>}
 */
export async function connectWithRetry(uri, options = {}) {
  const attempts = options.attempts ?? 5;
  const baseDelayMs = options.baseDelayMs ?? 500;
  const maxDelayMs = options.maxDelayMs ?? 8000;
  const serverSelectionTimeoutMS = options.serverSelectionTimeoutMs ?? 10000;

  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await mongoose.connect(uri, {
        // Force IPv4: the cluster's AAAA records are not routable from every
        // network, and family:6 fails outright with a selection timeout.
        family: 4,
        serverSelectionTimeoutMS
      });
    } catch (error) {
      lastError = error;

      const retryable = isTransientConnectError(error);

      if (!retryable || attempt === attempts) {
        break;
      }

      // Full jitter avoids a thundering herd when several instances boot at
      // once against the same cluster.
      const ceiling = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      const delay = Math.round(Math.random() * ceiling);

      console.warn(
        `MongoDB connection attempt ${attempt}/${attempts} failed ` +
          `(${/** @type {{ name?: string }} */ (error).name}: ` +
          `${/** @type {{ message?: string }} */ (error).message}). ` +
          `Retrying in ${delay}ms.`
      );

      await sleep(delay);
    }
  }

  const wrapped = new Error(
    `Could not connect to MongoDB after ${attempts} attempt(s): ` +
      `${/** @type {{ message?: string }} */ (lastError).message}`
  );

  wrapped.cause = lastError;

  throw wrapped;
}
