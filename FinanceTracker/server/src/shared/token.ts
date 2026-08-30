import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import type { Response } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRY = '7d';
const COOKIE_NAME = 'token';

export interface JwtPayload {
  userId: string;
}

/**
 * Sign a JWT token for the given user ID.
 */
export function signToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

/**
 * Verify a JWT token and return the payload.
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Set the JWT token as an httpOnly cookie on the response.
 */
export function setTokenCookie(res: Response, token: string): void {
  const isProduction = process.env.NODE_ENV === 'production';

  const cookieStr = cookie.serialize(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    path: '/',
  });

  res.setHeader('Set-Cookie', cookieStr);
}

/**
 * Clear the JWT token cookie from the response.
 */
export function clearTokenCookie(res: Response): void {
  const isProduction = process.env.NODE_ENV === 'production';

  const cookieStr = cookie.serialize(COOKIE_NAME, '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 0,
    path: '/',
  });

  res.setHeader('Set-Cookie', cookieStr);
}

/**
 * Extract the JWT token from the raw Cookie header string.
 */
export function getTokenFromCookie(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  const parsed = cookie.parse(cookieHeader);
  return parsed[COOKIE_NAME] || null;
}
