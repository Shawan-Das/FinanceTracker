import { Request, Response, NextFunction } from 'express';

/**
 * Middleware that ensures the user is authenticated.
 * Returns 401 if no userId is in the session.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.userId) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to access this resource',
      },
    });
    return;
  }
  next();
}

/**
 * Helper to get the authenticated user's ID from the session.
 * Throws if called without checking auth first.
 */
export function getUserId(req: Request): string {
  if (!req.session.userId) {
    throw new Error('Not authenticated');
  }
  return req.session.userId;
}
