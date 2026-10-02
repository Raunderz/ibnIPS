// @ts-check

import { OAuth2Client } from 'google-auth-library';
import { config } from '../config.js';
import { isAllowedEmail, isHostedDomainAllowed } from './domain.js';

const client = new OAuth2Client(config.googleClientId);

/**
 * @typedef {import('../types.js').GoogleUser} GoogleUser
 */

/**
 * Verify a Google ID token and return the authenticated KIIT user.
 *
 * @param {string} idToken
 * @returns {Promise<GoogleUser>}
 */
export async function verifyGoogleIdToken(idToken) {
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: config.googleClientId
    });

    const payload = ticket.getPayload();

    if (!payload) {
      throw new GoogleAuthError('Google token has no payload');
    }

    if (!payload.sub) {
      throw new GoogleAuthError('Google token has no subject');
    }

    if (!payload.email) {
      throw new GoogleAuthError('Google account has no email');
    }

    if (payload.email_verified !== true) {
      throw new GoogleAuthError('Google email is not verified');
    }

    const email = payload.email.toLowerCase();

    if (!isAllowedEmail(email, config.allowedDomain)) {
      throw new GoogleDomainError(
        `Only @${config.allowedDomain} accounts are allowed`
      );
    }

    if (!isHostedDomainAllowed(payload.hd, config.allowedDomain)) {
      throw new GoogleDomainError(
        `Google Workspace domain is not ${config.allowedDomain}`
      );
    }

    return {
      sub: payload.sub,
      email,
      emailVerified: true,
      ...(payload.name ? { name: payload.name } : {}),
      ...(payload.picture ? { picture: payload.picture } : {})
    };
  } catch (error) {
    if (error instanceof GoogleDomainError) {
      throw error;
    }

    if (error instanceof GoogleAuthError) {
      throw error;
    }

    throw new GoogleAuthError('Invalid or expired Google ID token');
  }
}

export class GoogleAuthError extends Error {
  /**
   * @param {string} message
   */
  constructor(message) {
    super(message);
    this.name = 'GoogleAuthError';
  }
}

export class GoogleDomainError extends Error {
  /**
   * @param {string} message
   */
  constructor(message) {
    super(message);
    this.name = 'GoogleDomainError';
  }
}