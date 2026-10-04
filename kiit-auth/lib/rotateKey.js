// @ts-check

import { generateApiKey } from './apiKey.js';
import User from '../models/User.js';

/**
 * Atomically rotate the API key of an already-authenticated user.
 *
 * The update is pinned to the hash the caller observed, so two concurrent
 * rotations cannot silently overwrite each other: the loser matches zero
 * documents, reloads, and retries against the current hash. This keeps
 * `keyRotatedCount` accurate (a server-side `$inc`, not a read-modify-write)
 * and guarantees the raw key we hand back is the one that is actually stored.
 *
 * @param {import('mongoose').HydratedDocument<Record<string, any>>} user
 * @param {number} keyBytes
 * @param {number} [maxAttempts]
 * @returns {Promise<{ raw: string, prefix: string, createdAt: Date, rotatedCount: number }>}
 */
export async function rotateApiKeyForUser(user, keyBytes, maxAttempts = 3) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const generated = generateApiKey(keyBytes);
    const now = new Date();

    const rotated = await User.findOneAndUpdate(
      { _id: user._id, apiKeyHash: user.apiKeyHash },
      {
        $set: {
          apiKeyHash: generated.hash,
          apiKeyPrefix: generated.prefix,
          keyCreatedAt: now
        },
        $inc: { keyRotatedCount: 1 }
      },
      { new: true }
    );

    if (rotated) {
      return {
        raw: generated.raw,
        prefix: generated.prefix,
        createdAt: now,
        rotatedCount: rotated.keyRotatedCount
      };
    }

    const current = await User.findById(user._id);

    if (!current) {
      throw new Error('User disappeared during key rotation');
    }

    user = current;
  }

  throw new Error('Could not rotate API key: too many concurrent rotations');
}
