import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

/**
 * Factory that returns middleware to validate request body against a Zod schema.
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const firstError = result.error.errors[0];
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: firstError?.message || 'Invalid input',
        },
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

/**
 * Factory that returns middleware to validate request query params against a Zod schema.
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const firstError = result.error.errors[0];
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: firstError?.message || 'Invalid query parameters',
        },
      });
      return;
    }
    req.query = result.data as any;
    next();
  };
}
