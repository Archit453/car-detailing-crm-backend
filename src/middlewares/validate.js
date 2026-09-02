import { ZodError } from 'zod';
import { ApiError } from '../utils/apiError.js';

/**
 * Middleware generator for request validation using Zod schemas.
 * Validates body, query, and params independently or together.
 *
 * @param {Object} schemas
 * @param {import('zod').ZodSchema} [schemas.body]
 * @param {import('zod').ZodSchema} [schemas.query]
 * @param {import('zod').ZodSchema} [schemas.params]
 */
export const validate = (schemas) => async (req, res, next) => {
  try {
    if (schemas.params) {
      req.params = await schemas.params.parseAsync(req.params);
    }
    if (schemas.query) {
      req.query = await schemas.query.parseAsync(req.query);
    }
    if (schemas.body) {
      req.body = await schemas.body.parseAsync(req.body);
    }
    return next();
  } catch (error) {
    if (error instanceof ZodError) {
      const formattedErrors = error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
      }));

      return next(
        new ApiError(400, 'Validation Error: Invalid request payload or parameters', formattedErrors)
      );
    }

    return next(error);
  }
};
