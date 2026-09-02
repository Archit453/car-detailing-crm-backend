import crypto from 'crypto';
import { config } from '../config/env.js';

const SESSION_COOKIE_NAME = 'crm_session';
const DEFAULT_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

/**
 * Creates a cryptographically signed HMAC-SHA256 session token
 * Token format: Base64Url(Payload).Base64Url(Signature)
 */
export function createSessionToken(username, maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS) {
  const secret = config.auth.sessionSecret;
  const expiresAt = Date.now() + maxAgeSeconds * 1000;

  const payload = Buffer.from(
    JSON.stringify({
      user: username,
      exp: expiresAt,
      iat: Date.now(),
    }),
    'utf8'
  ).toString('base64url');

  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');

  return `${payload}.${signature}`;
}

/**
 * Verifies a signed session token. Returns null if invalid or expired.
 */
export function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadBase64, providedSignature] = parts;
  const secret = config.auth.sessionSecret;

  // Compute expected signature
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payloadBase64)
    .digest('base64url');

  // Timing-safe comparison to prevent timing attacks
  const providedBuffer = Buffer.from(providedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null;
  }

  // Parse and check expiration
  try {
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'));
    if (!payload.exp || Date.now() > payload.exp) {
      return null; // Expired
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Parses HTTP Cookie header into a key-value dictionary
 */
export function parseCookies(cookieHeader) {
  if (!cookieHeader || typeof cookieHeader !== 'string') return {};

  return cookieHeader.split(';').reduce((acc, cookieStr) => {
    const [rawKey, ...rawValParts] = cookieStr.trim().split('=');
    if (!rawKey) return acc;
    const rawVal = rawValParts.join('=');
    try {
      acc[decodeURIComponent(rawKey)] = decodeURIComponent(rawVal || '');
    } catch {
      acc[rawKey] = rawVal || '';
    }
    return acc;
  }, {});
}

export { SESSION_COOKIE_NAME, DEFAULT_MAX_AGE_SECONDS };

