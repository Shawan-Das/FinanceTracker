import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateBody, validateQuery } from '../middleware/validation';

// We need to set JWT_SECRET before importing auth middleware
process.env.JWT_SECRET = 'test-secret-for-unit-tests';

import { requireAuth, getUserId } from '../middleware/auth';

// Mock the token module
vi.mock('../shared/token', () => ({
  verifyToken: vi.fn((token: string) => {
    if (token === 'valid-token') {
      return { userId: 'usr_test123' };
    }
    return null;
  }),
  getTokenFromCookie: vi.fn((cookieHeader: string | undefined) => {
    if (!cookieHeader) return null;
    const match = cookieHeader.match(/token=([^;]+)/);
    return match ? match[1] : null;
  }),
}));

// =============================================================================
// validateBody middleware
// =============================================================================

describe('validateBody middleware', () => {
  function makeReqRes(body: any) {
    const req = { body } as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;
    const next = vi.fn() as NextFunction;
    return { req, res, next };
  }

  it('passes validation and calls next with parsed body', () => {
    const schema = z.object({
      name: z.string().min(1),
      amount: z.coerce.number().positive(),
    });

    const { req, res, next } = makeReqRes({ name: 'Test', amount: '50' });
    validateBody(schema)(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body).toEqual({ name: 'Test', amount: 50 }); // amount coerced to number
  });

  it('strips unknown fields', () => {
    const schema = z.object({
      name: z.string(),
    });

    const { req, res, next } = makeReqRes({ name: 'Test', unknown: 'field' });
    validateBody(schema)(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body).toEqual({ name: 'Test' });
  });

  it('returns 400 for invalid body', () => {
    const schema = z.object({
      name: z.string().min(1, 'Name is required'),
    });

    const { req, res, next } = makeReqRes({ name: '' });
    validateBody(schema)(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
        }),
      })
    );
  });

  it('returns 400 for missing required fields', () => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
    });

    const { req, res, next } = makeReqRes({});
    validateBody(schema)(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// =============================================================================
// validateQuery middleware
// =============================================================================

describe('validateQuery middleware', () => {
  function makeReqRes(query: any) {
    const req = { query } as unknown as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;
    const next = vi.fn() as NextFunction;
    return { req, res, next };
  }

  it('passes validation and calls next with parsed query', () => {
    const schema = z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(30),
    });

    const { req, res, next } = makeReqRes({ page: '2', limit: '50' });
    validateQuery(schema)(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.query).toEqual({ page: 2, limit: 50 });
  });

  it('applies defaults for missing query params', () => {
    const schema = z.object({
      page: z.coerce.number().int().min(1).default(1),
      sort: z.enum(['asc', 'desc']).default('asc'),
    });

    const { req, res, next } = makeReqRes({});
    validateQuery(schema)(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.query).toEqual({ page: 1, sort: 'asc' });
  });

  it('returns 400 for invalid query params', () => {
    const schema = z.object({
      page: z.coerce.number().int().min(1),
    });

    const { req, res, next } = makeReqRes({ page: '-5' });
    validateQuery(schema)(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// =============================================================================
// requireAuth middleware
// =============================================================================

describe('requireAuth middleware', () => {
  function makeReqRes(cookie?: string) {
    const req = {
      headers: { cookie: cookie || undefined },
    } as unknown as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;
    const next = vi.fn() as NextFunction;
    return { req, res, next };
  }

  it('calls next() for valid token', () => {
    const { req, res, next } = makeReqRes('token=valid-token');
    requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('attaches userId to the request', () => {
    const { req, res, next } = makeReqRes('token=valid-token');
    requireAuth(req, res, next);

    expect((req as any).userId).toBe('usr_test123');
  });

  it('returns 401 when no cookie header', () => {
    const { req, res, next } = makeReqRes(undefined);
    requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'UNAUTHORIZED',
        }),
      })
    );
  });

  it('returns 401 for invalid token', () => {
    const { req, res, next } = makeReqRes('token=invalid-token');
    requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 401 when cookie header has no token', () => {
    const { req, res, next } = makeReqRes('other=value');
    requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

// =============================================================================
// getUserId helper
// =============================================================================

describe('getUserId helper', () => {
  it('returns userId when set on request', () => {
    const req = { userId: 'usr_abc123' } as any;
    expect(getUserId(req)).toBe('usr_abc123');
  });

  it('throws when userId is not set', () => {
    const req = {} as any;
    expect(() => getUserId(req)).toThrow('Not authenticated');
  });

  it('throws when userId is undefined', () => {
    const req = { userId: undefined } as any;
    expect(() => getUserId(req)).toThrow('Not authenticated');
  });

  it('throws when userId is null', () => {
    const req = { userId: null } as any;
    expect(() => getUserId(req)).toThrow('Not authenticated');
  });
});
