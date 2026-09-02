import crypto from 'crypto';
import { config } from '../config/env.js';
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  DEFAULT_MAX_AGE_SECONDS,
} from '../utils/session.js';
import { successResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Constant-time safe string comparison
 */
function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    // Run comparison against dummy buffer to keep constant time
    crypto.timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}

/**
 * @desc    Authenticate admin user and issue 30-day HTTP-only session cookie
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    throw new ApiError(400, 'Username and password are required');
  }

  const isUserValid = safeCompare(username.trim(), config.auth.adminUsername.trim());
  const isPassValid = safeCompare(password.trim(), config.auth.adminPassword.trim());

  if (!isUserValid || !isPassValid) {
    throw new ApiError(401, 'Invalid username or password');
  }

  // Generate 30-day cryptographically signed session token
  const token = createSessionToken(config.auth.adminUsername, DEFAULT_MAX_AGE_SECONDS);

  // Set HTTP-only, secure, 30-day cookie
  const isProd = config.nodeEnv === 'production';
  const cookieOptions = [
    `${SESSION_COOKIE_NAME}=${token}`,
    'Path=/',
    `Max-Age=${DEFAULT_MAX_AGE_SECONDS}`,
    'HttpOnly',
    'SameSite=Lax',
    ...(isProd ? ['Secure'] : []),
  ].join('; ');

  res.setHeader('Set-Cookie', cookieOptions);

  return successResponse(
    res,
    {
      user: config.auth.adminUsername,
      token, // Also returned in body for optional bearer token clients
      expiresIn: DEFAULT_MAX_AGE_SECONDS,
    },
    'Authenticated successfully'
  );
});

/**
 * @desc    Logout admin user by clearing session cookie
 * @route   POST /api/auth/logout
 * @access  Authenticated
 */
export const logout = asyncHandler(async (req, res) => {
  const isProd = config.nodeEnv === 'production';
  const cookieOptions = [
    `${SESSION_COOKIE_NAME}=`,
    'Path=/',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    'HttpOnly',
    'SameSite=Lax',
    ...(isProd ? ['Secure'] : []),
  ].join('; ');

  res.setHeader('Set-Cookie', cookieOptions);

  return successResponse(res, null, 'Logged out successfully');
});

/**
 * @desc    Check current session status
 * @route   GET /api/auth/me
 * @access  Authenticated
 */
export const getMe = asyncHandler(async (req, res) => {
  return successResponse(
    res,
    {
      authenticated: true,
      user: req.user || config.auth.adminUsername,
    },
    'Session is active'
  );
});

