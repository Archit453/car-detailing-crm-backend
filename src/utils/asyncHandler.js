/**
 * Higher-order function to wrap asynchronous express route handlers and controllers.
 * Eliminates repetitive try-catch blocks by forwarding any thrown error to next(err).
 *
 * @param {Function} fn - Async express route handler (req, res, next)
 * @returns {Function} Express middleware function
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
