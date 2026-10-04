// @ts-check

import { hashApiKey, API_KEY_PREFIX } from '../lib/apiKey.js';
import User from '../models/User.js';

/**
 * Require a valid KIIT API key.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function requireApiKey(req, res, next) {
  try {
    const header = req.get('x-api-key');

    if (!header) {
      return res.status(401).json({
        error: 'Invalid or missing API key'
      });
    }

    // Tolerate copy/paste whitespace, then reject anything malformed early.
    const apiKey = header.trim();

    if (
      apiKey.length === 0 ||
      apiKey.length > 500 ||
      !apiKey.startsWith(API_KEY_PREFIX) ||
      // base64url alphabet only; anything else can never be a key we issued.
      !/^[A-Za-z0-9_-]+$/.test(apiKey)
    ) {
      return res.status(401).json({
        error: 'Invalid or missing API key'
      });
    }

    /*
     * Lookup by exact SHA-256 digest against a unique index: this is an
     * indexed equality match rather than a scan-and-compare, so it leaks no
     * timing signal about stored keys and needs no constant-time compare.
     */
    const user = await User.findOne({ apiKeyHash: hashApiKey(apiKey) });

    if (!user) {
      return res.status(401).json({
        error: 'Invalid or missing API key'
      });
    }

    res.locals.user = user;

    next();
  } catch (error) {
    next(error);
  }
}