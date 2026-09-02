import { parseCookies, verifySessionToken, SESSION_COOKIE_NAME } from '../utils/session.js';
import { ApiError } from '../utils/apiError.js';

/**
 * Middleware that protects routes requiring an active administrator session.
 * For browser navigation requests, redirects to /login.
 * For API requests, returns 401 Unauthorized.
 */
export const requireAuth = (req, res, next) => {
  // 1. Check Cookie
  const cookies = parseCookies(req.headers.cookie);
  const sessionToken = cookies[SESSION_COOKIE_NAME];

  // 2. Also check Authorization header or x-api-key header for API consumers
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const apiKey = req.headers['x-api-key'];

  const tokenToVerify = sessionToken || bearerToken || apiKey;

  if (tokenToVerify) {
    const session = verifySessionToken(tokenToVerify);
    if (session) {
      req.user = session.user;
      return next();
    }
  }

  // If accessing the dashboard page directly, redirect to login page
  if (
    req.originalUrl === '/dashboard' ||
    req.originalUrl.startsWith('/dashboard?') ||
    req.path === '/dashboard'
  ) {
    return res.redirect('/login');
  }

  // Return standard 401 error response for API callers
  return res.status(401).json({
    success: false,
    statusCode: 401,
    error: {
      code: 'UNAUTHORIZED',
      message: 'Authentication required. Please log in to access this dashboard resource.',
    },
  });
};
