import { ApiError } from '../utils/apiError.js';

/**
 * 404 Route Not Found Middleware
 */
export const notFound = (req, res, next) => {
  next(new ApiError(404, `Route '${req.method} ${req.originalUrl}' not found on this server`));
};
