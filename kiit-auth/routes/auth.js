// @ts-check

import express from 'express';
import { config } from '../config.js';
import User from '../models/User.js';
import {
  verifyGoogleIdToken,
  GoogleAuthError,
  GoogleDomainError
} from '../lib/google.js';
import { generateApiKey } from '../lib/apiKey.js';
import { rotateApiKeyForUser } from '../lib/rotateKey.js';

const router = express.Router();

/**
 * MongoDB reports unique-index violations with code 11000. Conflicting
 * concurrent sign-ins are expected and recoverable; anything else is not.
 *
 * @param {unknown} error
 * @returns {boolean}
 */
function isDuplicateKeyError(error) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 11000
  );
}

/**
 * POST /auth/google
 *
 * Body:
 * {
 *   "credential": "GOOGLE_ID_TOKEN",
 *   "rotate": false
 * }
 */
router.post('/google', async (req, res, next) => {
  try {
    const { credential, rotate = false } = req.body ?? {};

    if (
      typeof credential !== 'string' ||
      credential.length === 0 ||
      credential.length > 10000
    ) {
      return res.status(400).json({
        error: 'A valid Google credential is required'
      });
    }

    if (typeof rotate !== 'boolean') {
      return res.status(400).json({
        error: 'rotate must be a boolean'
      });
    }

    let googleUser;

    try {
      googleUser = await verifyGoogleIdToken(credential);
    } catch (error) {
      if (error instanceof GoogleDomainError) {
        return res.status(403).json({
          error: `Only @${config.allowedDomain} accounts are allowed`
        });
      }

      if (error instanceof GoogleAuthError) {
        return res.status(401).json({
          error: 'Invalid or expired Google credential'
        });
      }

      throw error;
    }

    const now = new Date();

    let user = await User.findOne({
      googleSub: googleUser.sub
    });

    let rawApiKey = null;
    let isNewKey = false;
    let keyRotated = false;
    let keyRotatedCount = user?.keyRotatedCount ?? 0;
    let apiKeyPrefix = user?.apiKeyPrefix ?? '';
    let keyCreatedAt = user?.keyCreatedAt ?? now;

    if (!user) {
      const generated = generateApiKey(config.apiKeyBytes);

      try {
        user = await User.create({
          googleSub: googleUser.sub,
          email: googleUser.email,
          name: googleUser.name ?? '',
          picture: googleUser.picture ?? '',
          apiKeyHash: generated.hash,
          apiKeyPrefix: generated.prefix,
          keyCreatedAt: now,
          keyRotatedCount: 0,
          lastLoginAt: now
        });

        rawApiKey = generated.raw;
        isNewKey = true;
      } catch (error) {
        // Another request may have created this user at the same time.
        if (isDuplicateKeyError(error)) {
          user = await User.findOne({
            googleSub: googleUser.sub
          });

          if (!user) {
            throw error;
          }
        } else {
          throw error;
        }
      }
    }

    if (!user) {
      throw new Error('User could not be loaded');
    }

    user.email = googleUser.email;
    user.name = googleUser.name ?? '';
    user.picture = googleUser.picture ?? '';
    user.lastLoginAt = now;

    await user.save();

    if (rotate && !isNewKey) {
      const rotated = await rotateApiKeyForUser(user, config.apiKeyBytes);

      rawApiKey = rotated.raw;
      keyRotated = true;
      keyRotatedCount = rotated.rotatedCount;
      apiKeyPrefix = rotated.prefix;
      keyCreatedAt = rotated.createdAt;
    }

    return res.status(200).json({
      user: {
        email: googleUser.email,
        name: user.name,
        picture: user.picture
      },
      apiKey: rawApiKey,
      apiKeyPrefix,
      keyCreatedAt,
      keyRotatedCount,
      keyRotated
    });
  } catch (error) {
    next(error);
  }
});

export default router;
