import { Request, Response, NextFunction } from 'express';
import { verifyToken, getTokenFromCookie } from '../shared/token';

/**
 * Middleware that ensures the user is authenticated via JWT cookie.
 * Returns 401 if no valid token is present.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = getTokenFromCookie(req.headers.cookie);
  if (!token) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to access this resource',
      },
    });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Your session has expired. Please log in again.',
      },
    });
    return;
  }

  // Attach userId to request for downstream handlers
  (req as any).userId = payload.userId;
  next();
}

/**
 * Helper to get the authenticated user's ID from the request.
 * Throws if called without checking auth first.
 */
export function getUserId(req: Request): string {
  const userId = (req as any).userId;
  if (!userId) {
    throw new Error('Not authenticated');
  }
  return userId;
}
