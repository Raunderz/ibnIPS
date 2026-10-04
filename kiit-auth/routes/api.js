// @ts-check

import express from 'express';
import { config } from '../config.js';
import { rotateApiKeyForUser } from '../lib/rotateKey.js';
import User from '../models/User.js';
import { requireApiKey } from '../middleware/requireApiKey.js';

const router = express.Router();

/**
 * GET /api/me
 *
 * Return the currently authenticated user's information.
 */
router.get('/me', requireApiKey, async (req, res, next) => {
  try {
    const user = res.locals.user;

    return res.status(200).json({
      user: {
        email: user.email,
        name: user.name,
        picture: user.picture
      },
      apiKeyPrefix: user.apiKeyPrefix,
      keyCreatedAt: user.keyCreatedAt,
      keyRotatedCount: user.keyRotatedCount,
      lastLoginAt: user.lastLoginAt
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/key/rotate
 *
 * Generate a new API key and invalidate the old one.
 */
router.post('/key/rotate', requireApiKey, async (req, res, next) => {
  try {
    const user = res.locals.user;
    const rotated = await rotateApiKeyForUser(user, config.apiKeyBytes);

    return res.status(200).json({
      apiKey: rotated.raw,
      apiKeyPrefix: rotated.prefix,
      keyCreatedAt: rotated.createdAt,
      keyRotatedCount: rotated.rotatedCount
    });
  } catch (error) {
    next(error);
  }
});

export default router;