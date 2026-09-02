/**
 * Standardized API response format helpers
 */

/**
 * Sends a successful JSON response
 * @param {import('express').Response} res
 * @param {*} data - Response payload
 * @param {string} message - Human-readable success message
 * @param {number} statusCode - HTTP status code (default: 200)
 * @param {Object} [meta] - Optional pagination or metadata
 */
export const successResponse = (res, data = null, message = 'Success', statusCode = 200, meta = undefined) => {
  const responseBody = {
    success: true,
    message,
    data,
  };

  if (meta !== undefined) {
    responseBody.meta = meta;
  }

  return res.status(statusCode).json(responseBody);
};

/**
 * Sends a 201 Created JSON response
 * @param {import('express').Response} res
 * @param {*} data - Newly created resource data
 * @param {string} message - Human-readable success message
 */
export const createdResponse = (res, data, message = 'Resource created successfully') => {
  return successResponse(res, data, message, 201);
};
