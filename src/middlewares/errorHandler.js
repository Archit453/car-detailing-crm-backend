import { ApiError } from '../utils/apiError.js';
import { config } from '../config/env.js';

/**
 * Global Error Handler Middleware
 */
export const errorHandler = (err, req, res, next) => {
  let error = err;

  // Handle JSON parsing syntax error
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    error = new ApiError(400, 'Malformed JSON payload in request body');
  }

  // Handle Supabase / PostgREST specific errors
  if (err.code && typeof err.code === 'string') {
    switch (err.code) {
      case '22P02': // Invalid text representation (e.g., bad UUID syntax in Postgres)
        error = new ApiError(400, 'Invalid format for UUID identifier', err.message);
        break;
      case '23505': // Unique constraint violation
        error = new ApiError(409, 'A record with these details already exists', err.details || err.message);
        break;
      case '42P01': // Undefined table
        error = new ApiError(
          500,
          'Database table does not exist. Please ensure you have run supabase/schema.sql.',
          err.message
        );
        break;
      case 'PGRST116': // 0 rows returned for single row query
        error = new ApiError(404, 'Requested record was not found');
        break;
      default:
        if (err.message && err.message.includes('FetchError')) {
          error = new ApiError(503, 'Failed to connect to Supabase database. Please check your internet or SUPABASE_URL.', err.message);
        }
        break;
    }
  }

  const statusCode = error.statusCode || (error.status ? Number(error.status) : 500);
  const message = error.message || 'Internal Server Error';
  const isOperational = error.isOperational !== undefined ? error.isOperational : false;

  // Log non-operational (unexpected) errors in development/testing
  if (config.nodeEnv !== 'test' && (!isOperational || statusCode >= 500)) {
    console.error(`[Error] ${req.method} ${req.originalUrl}:`, err);
  }

  const response = {
    success: false,
    error: {
      code: error.code || (statusCode === 404 ? 'NOT_FOUND' : statusCode === 400 ? 'BAD_REQUEST' : 'INTERNAL_SERVER_ERROR'),
      message,
      ...(error.details ? { details: error.details } : {}),
      ...(config.nodeEnv === 'development' ? { stack: err.stack } : {}),
    },
  };

  res.status(statusCode).json(response);
};
