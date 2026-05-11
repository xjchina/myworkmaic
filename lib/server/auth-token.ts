import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Auth token utilities
 *
 * Token format: `{userId}.{timestamp}.{hmacSignature}`
 * - HMAC-SHA256 signed with AUTH_SECRET
 * - Valid for 7 days
 * - httpOnly cookie: `openmaic_auth`
 */

const TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.ACCESS_CODE;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('AUTH_SECRET or ACCESS_CODE must be set in production');
    }
    return 'openmaic-dev-secret';
  }
  return secret;
}

/**
 * Create an HMAC-signed auth token for a given user ID
 */
export function createAuthToken(userId: string): string {
  const secret = getAuthSecret();
  const timestamp = Date.now().toString();
  const payload = `${userId}.${timestamp}`;
  const signature = createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${signature}`;
}

/**
 * Verify an auth token and return the user ID if valid
 * Returns null if the token is invalid or expired
 */
export function verifyAuthToken(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [userId, timestampStr, signature] = parts;

  // Check token expiry
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp) || Date.now() - timestamp > TOKEN_MAX_AGE_MS) {
    return null;
  }

  // Verify HMAC signature
  const secret = getAuthSecret();
  const payload = `${userId}.${timestampStr}`;
  const expected = createHmac('sha256', secret).update(payload).digest('hex');

  const sigBuf = Buffer.from(signature, 'hex');
  const expBuf = Buffer.from(expected, 'hex');
  if (sigBuf.length !== expBuf.length) return null;

  if (!timingSafeEqual(sigBuf, expBuf)) return null;

  return userId;
}

/** Cookie name for the auth token */
export const AUTH_COOKIE_NAME = 'openmaic_auth';

/** Cookie max age in seconds (7 days) */
export const AUTH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60;
