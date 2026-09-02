/**
 * Custom Error class for operational API errors with HTTP status codes and structured details.
 */
export class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code (e.g. 400, 404, 500)
   * @param {string} message - User-friendly error message
   * @param {Array|Object|null} details - Optional array or object with specific validation/field errors
   * @param {boolean} isOperational - Indicates whether the error is expected and operational
   */
  constructor(statusCode, message, details = null, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad Request', details = null) {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }

  static conflict(message = 'Resource conflict') {
    return new ApiError(409, message);
  }

  static unprocessableEntity(message = 'Unprocessable Entity', details = null) {
    return new ApiError(422, message, details);
  }

  static internal(message = 'Internal Server Error') {
    return new ApiError(500, message, null, false);
  }
}
