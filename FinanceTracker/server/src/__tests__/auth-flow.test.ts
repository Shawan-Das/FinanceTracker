/**
 * End-to-end integration tests for the registration and login flows.
 *
 * These tests mock the database and email services to run without external
 * dependencies, then exercise the full HTTP path through Express route
 * handlers so we validate request parsing, session management, error
 * handling, and response shapes end-to-end.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import http from 'http';

// ── In-memory stores that simulate the database tables ──────────────────────

interface UserRow {
  id: string;
  full_name: string;
  email: string;
  password_hash: string;
  is_verified: boolean;
  is_locked: boolean;
  locked_until: string | null;
  failed_login_attempts: number;
  default_currency: string;
  created_at: string;
  updated_at: string;
}

interface VerificationRow {
  id: string;
  user_id: string;
  code: string;
  purpose: string;
  expires_at: string;
  used: boolean;
  created_at: string;
}

interface LoginAttemptRow {
  id: string;
  email: string;
  ip_address: string | null;
  success: boolean;
  attempted_at: string;
}

const users: UserRow[] = [];
const verifications: VerificationRow[] = [];
const loginAttempts: LoginAttemptRow[] = [];

function resetDb() {
  users.length = 0;
  verifications.length = 0;
  loginAttempts.length = 0;
}

// ── Mock the database module ────────────────────────────────────────────────

vi.mock('../database/connection', () => ({
  db: {
    query: async (sql: string, params: any[] = []) => {
      // ── SELECT users by email ──
      if (sql.includes('SELECT') && sql.includes('users') && sql.includes('WHERE email = $1')) {
        const email = params[0];
        const user = users.find((u) => u.email === email);
        return { rows: user ? [user] : [] };
      }

      // ── SELECT user by id ──
      if (sql.includes('SELECT') && sql.includes('users') && sql.includes('WHERE id = $1')) {
        const id = params[0];
        const user = users.find((u) => u.id === id);
        return { rows: user ? [user] : [] };
      }

      // ── INSERT user ──
      if (sql.includes('INSERT INTO') && sql.includes('users')) {
        const user: UserRow = {
          id: params[0],
          full_name: params[1],
          email: params[2],
          password_hash: params[3],
          is_verified: false,
          is_locked: false,
          locked_until: null,
          failed_login_attempts: 0,
          default_currency: 'BDT',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        users.push(user);
        return { rows: [{ id: user.id, full_name: user.full_name, email: user.email }] };
      }

      // ── UPDATE user set is_verified ──
      if (sql.includes('UPDATE') && sql.includes('users') && sql.includes('is_verified')) {
        const id = params[params.length - 1] ?? params[0];
        const user = users.find((u) => u.id === id);
        if (user) user.is_verified = true;
        return { rows: [] };
      }

      // ── UPDATE users set password_hash ──
      if (sql.includes('UPDATE') && sql.includes('users') && sql.includes('password_hash')) {
        const passwordHash = params[0];
        const id = params[1];
        const user = users.find((u) => u.id === id);
        if (user) {
          user.password_hash = passwordHash;
          user.is_locked = false;
          user.locked_until = null;
          user.failed_login_attempts = 0;
        }
        return { rows: [] };
      }

      // ── UPDATE users set failed_login_attempts ──
      if (sql.includes('UPDATE') && sql.includes('users') && sql.includes('failed_login_attempts = failed_login_attempts + 1')) {
        const email = params[0];
        const user = users.find((u) => u.email === email);
        if (user) {
          user.failed_login_attempts += 1;
          user.updated_at = new Date().toISOString();
        }
        return { rows: user ? [{ failed_login_attempts: user.failed_login_attempts }] : [] };
      }

      // ── UPDATE users set is_locked ──
      if (sql.includes('UPDATE') && sql.includes('users') && sql.includes('is_locked = TRUE')) {
        const lockUntil = params[0];
        const email = params[1];
        const user = users.find((u) => u.email === email);
        if (user) {
          user.is_locked = true;
          user.locked_until = lockUntil;
        }
        return { rows: [] };
      }

      // ── UPDATE users reset failed logins ──
      if (sql.includes('UPDATE') && sql.includes('users') && sql.includes('failed_login_attempts = 0') && sql.includes('is_locked = FALSE')) {
        const email = params[0];
        const user = users.find((u) => u.email === email);
        if (user) {
          user.failed_login_attempts = 0;
          user.is_locked = false;
          user.locked_until = null;
        }
        return { rows: [] };
      }

      // ── SELECT is_locked from users ──
      if (sql.includes('SELECT') && sql.includes('is_locked') && sql.includes('locked_until')) {
        const email = params[0];
        const user = users.find((u) => u.email === email);
        return { rows: user ? [{ is_locked: user.is_locked, locked_until: user.locked_until }] : [] };
      }

      // ── INSERT email_verifications ──
      if (sql.includes('INSERT INTO') && sql.includes('email_verifications')) {
        const v: VerificationRow = {
          id: params[0],
          user_id: params[1],
          code: params[2],
          purpose: params[3],
          expires_at: params[4],
          used: false,
          created_at: new Date().toISOString(),
        };
        verifications.push(v);
        return { rows: [] };
      }

      // ── UPDATE email_verifications SET used = TRUE (invalidate existing) ──
      if (sql.includes('UPDATE') && sql.includes('email_verifications') && sql.includes('SET used = TRUE') && sql.includes('purpose = $2')) {
        const userId = params[0];
        const purpose = params[1];
        verifications.forEach((v) => {
          if (v.user_id === userId && v.purpose === purpose && !v.used) v.used = true;
        });
        return { rows: [] };
      }

      // ── UPDATE email_verifications SET used = TRUE by id ──
      if (sql.includes('UPDATE') && sql.includes('email_verifications') && sql.includes('SET used = TRUE') && params.length === 1 && !sql.includes('purpose')) {
        const id = params[0];
        const v = verifications.find((v) => v.id === id);
        if (v) v.used = true;
        return { rows: [] };
      }

      // ── SELECT valid verification code ──
      if (sql.includes('SELECT id FROM') && sql.includes('email_verifications') && sql.includes('code = $2')) {
        const userId = params[0];
        const code = params[1];
        const v = verifications.find(
          (v) => v.user_id === userId && v.code === code && !v.used && new Date(v.expires_at) > new Date()
        );
        return { rows: v ? [{ id: v.id }] : [] };
      }

      // ── INSERT login_attempts ──
      if (sql.includes('INSERT INTO') && sql.includes('login_attempts')) {
        const a: LoginAttemptRow = {
          id: params[0],
          email: params[1],
          ip_address: params[2] ?? null,
          success: params[2] === undefined ? !!params[3] : false,
          attempted_at: new Date().toISOString(),
        };
        // Re-derive success from the SQL itself
        a.success = sql.includes('TRUE');
        loginAttempts.push(a);
        return { rows: [] };
      }

      // ── Fallback ──
      return { rows: [] };
    },
    getClient: async () => {
      // For transaction tests — not used in auth flows, return a no-op client
      return {
        query: async () => ({ rows: [] }),
        release: () => {},
      };
    },
  },
}));

// ── Mock email service ──────────────────────────────────────────────────────

let lastSentCode: string | null = null;
let lastSentEmail: string | null = null;

vi.mock('../services/email', () => ({
  sendVerificationCode: vi.fn(async (email: string, code: string, _purpose: string) => {
    lastSentCode = code;
    lastSentEmail = email;
    return true;
  }),
  generateVerificationCode: vi.fn(() => '123456'),
}));

// ── Mock seed service (called after verification) ──────────────────────────

vi.mock('../database/seed', () => ({
  seedDefaultCategories: vi.fn(async () => {}),
}));

// ── Mock lockout service (uses db directly, so it works with our mock) ─────

// We DON'T mock lockout — it uses db.query which is already mocked above.

// ── Mock rate limiter (pass-through) ────────────────────────────────────────

vi.mock('../middleware/rateLimit', () => ({
  apiLimiter: (_req: any, _res: any, next: any) => next(),
  authLimiter: (_req: any, _res: any, next: any) => next(),
  sensitiveLimiter: (_req: any, _res: any, next: any) => next(),
}));

// ── Build a test Express app (mirrors app.ts without listen) ────────────────

function buildTestApp(authRoutes: any) {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(
    session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false, httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 },
    }),
  );

  app.use('/api/auth', authRoutes);

  return app;
}

// ── HTTP helper ─────────────────────────────────────────────────────────────

interface HttpResult {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: any;
  setCookie?: string[];
}

function makeRequest(
  server: http.Server,
  method: string,
  path: string,
  body?: any,
  cookie?: string,
): Promise<HttpResult> {
  return new Promise((resolve, reject) => {
    const addr = server.address() as any;
    const headers: http.OutgoingHttpHeaders = {
      'Content-Type': 'application/json',
    };
    if (cookie) headers.Cookie = cookie;

    const options: http.RequestOptions = {
      hostname: '127.0.0.1',
      port: addr.port,
      path,
      method,
      headers,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        const setCookie = res.headers['set-cookie'];
        resolve({
          status: res.statusCode!,
          headers: res.headers,
          body: data ? JSON.parse(data) : null,
          setCookie,
        });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function extractSessionCookie(setCookie?: string[]): string | undefined {
  if (!setCookie) return undefined;
  const sc = setCookie.find((c) => c.startsWith('connect.sid='));
  if (!sc) return undefined;
  return sc.split(';')[0];
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('Auth flow — end-to-end', () => {
  let server: http.Server;
  const BASE = '/api/auth';
  const TEST_EMAIL = 'test@example.com';
  const TEST_PASSWORD = 'SecurePass123';
  const TEST_NAME = 'Test User';

  beforeAll(async () => {
    const authRoutes = (await import('../routes/auth')).default;
    const app = buildTestApp(authRoutes);
    await new Promise<void>((resolve) => {
      server = app.listen(0, resolve);
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  beforeEach(() => {
    resetDb();
    lastSentCode = null;
    lastSentEmail = null;
    vi.clearAllMocks();
  });

  // ══════════════════════════════════════════════════════════════════════════
  // REGISTRATION
  // ══════════════════════════════════════════════════════════════════════════

  describe('POST /api/auth/register', () => {
    it('creates a new account and sends verification code', async () => {
      const res = await makeRequest(server, 'POST', `${BASE}/register`, {
        full_name: TEST_NAME,
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        confirm_password: TEST_PASSWORD,
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user_id).toBeDefined();
      expect(res.body.data.email).toBe(TEST_EMAIL);

      // Verify code was "sent"
      expect(lastSentCode).toBe('123456');
      expect(lastSentEmail).toBe(TEST_EMAIL);
    });

    it('returns 400 for invalid email', async () => {
      const res = await makeRequest(server, 'POST', `${BASE}/register`, {
        full_name: TEST_NAME,
        email: 'not-an-email',
        password: TEST_PASSWORD,
        confirm_password: TEST_PASSWORD,
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for weak password (no uppercase)', async () => {
      const res = await makeRequest(server, 'POST', `${BASE}/register`, {
        full_name: TEST_NAME,
        email: TEST_EMAIL,
        password: 'lowercase123',
        confirm_password: 'lowercase123',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for short password', async () => {
      const res = await makeRequest(server, 'POST', `${BASE}/register`, {
        full_name: TEST_NAME,
        email: TEST_EMAIL,
        password: 'Ab1',
        confirm_password: 'Ab1',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('8 characters');
    });

    it('returns 400 when passwords do not match', async () => {
      const res = await makeRequest(server, 'POST', `${BASE}/register`, {
        full_name: TEST_NAME,
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        confirm_password: 'DifferentPass123',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('do not match');
    });

    it('returns 409 for already-verified email', async () => {
      // Register first
      await makeRequest(server, 'POST', `${BASE}/register`, {
        full_name: TEST_NAME,
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        confirm_password: TEST_PASSWORD,
      });

      // Mark as verified in mock DB
      const user = users.find((u) => u.email === TEST_EMAIL)!;
      user.is_verified = true;

      // Try to register again
      const res = await makeRequest(server, 'POST', `${BASE}/register`, {
        full_name: TEST_NAME,
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        confirm_password: TEST_PASSWORD,
      });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('EMAIL_EXISTS');
    });

    it('resends verification code for unverified duplicate email', async () => {
      // Register first
      await makeRequest(server, 'POST', `${BASE}/register`, {
        full_name: TEST_NAME,
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        confirm_password: TEST_PASSWORD,
      });

      lastSentCode = null;

      // Register again with same email
      const res = await makeRequest(server, 'POST', `${BASE}/register`, {
        full_name: TEST_NAME,
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        confirm_password: TEST_PASSWORD,
      });

      expect(res.status).toBe(200);
      expect(res.body.data.message).toContain('pending verification');
      expect(lastSentCode).toBe('123456');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // EMAIL VERIFICATION
  // ══════════════════════════════════════════════════════════════════════════

  describe('POST /api/auth/verify-email', () => {
    it('verifies email with correct code and sets session', async () => {
      // Register
      await makeRequest(server, 'POST', `${BASE}/register`, {
        full_name: TEST_NAME,
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        confirm_password: TEST_PASSWORD,
      });

      // Verify
      const res = await makeRequest(server, 'POST', `${BASE}/verify-email`, {
        email: TEST_EMAIL,
        code: '123456',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toContain('verified');

      // Session should be set
      const cookie = extractSessionCookie(res.setCookie);
      expect(cookie).toBeDefined();

      // User should now be verified in mock DB
      const user = users.find((u) => u.email === TEST_EMAIL)!;
      expect(user.is_verified).toBe(true);
    });

    it('returns 400 for invalid code', async () => {
      await makeRequest(server, 'POST', `${BASE}/register`, {
        full_name: TEST_NAME,
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        confirm_password: TEST_PASSWORD,
      });

      const res = await makeRequest(server, 'POST', `${BASE}/verify-email`, {
        email: TEST_EMAIL,
        code: '999999',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_CODE');
    });

    it('returns 400 for non-existent email', async () => {
      const res = await makeRequest(server, 'POST', `${BASE}/verify-email`, {
        email: 'nobody@example.com',
        code: '123456',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_CODE');
    });

    it('returns 200 for already-verified email (idempotent)', async () => {
      await makeRequest(server, 'POST', `${BASE}/register`, {
        full_name: TEST_NAME,
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        confirm_password: TEST_PASSWORD,
      });

      // Verify once
      await makeRequest(server, 'POST', `${BASE}/verify-email`, {
        email: TEST_EMAIL,
        code: '123456',
      });

      // Verify again
      const res = await makeRequest(server, 'POST', `${BASE}/verify-email`, {
        email: TEST_EMAIL,
        code: '123456',
      });

      expect(res.status).toBe(200);
      expect(res.body.data.message).toContain('already verified');
    });

    it('returns 400 for code with wrong length', async () => {
      const res = await makeRequest(server, 'POST', `${BASE}/verify-email`, {
        email: TEST_EMAIL,
        code: '123',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // RESEND VERIFICATION
  // ══════════════════════════════════════════════════════════════════════════

  describe('POST /api/auth/resend-verification', () => {
    it('resends verification code for unverified account', async () => {
      await makeRequest(server, 'POST', `${BASE}/register`, {
        full_name: TEST_NAME,
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        confirm_password: TEST_PASSWORD,
      });

      lastSentCode = null;
      const res = await makeRequest(server, 'POST', `${BASE}/resend-verification`, {
        email: TEST_EMAIL,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(lastSentCode).toBe('123456');
    });

    it('returns success even for non-existent email (prevents enumeration)', async () => {
      const res = await makeRequest(server, 'POST', `${BASE}/resend-verification`, {
        email: 'ghost@example.com',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('says already verified for verified accounts', async () => {
      await makeRequest(server, 'POST', `${BASE}/register`, {
        full_name: TEST_NAME,
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        confirm_password: TEST_PASSWORD,
      });

      const user = users.find((u) => u.email === TEST_EMAIL)!;
      user.is_verified = true;

      const res = await makeRequest(server, 'POST', `${BASE}/resend-verification`, {
        email: TEST_EMAIL,
      });

      expect(res.status).toBe(200);
      expect(res.body.data.message).toContain('already verified');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // LOGIN
  // ══════════════════════════════════════════════════════════════════════════

  describe('POST /api/auth/login', () => {
    async function registerAndVerify() {
      await makeRequest(server, 'POST', `${BASE}/register`, {
        full_name: TEST_NAME,
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        confirm_password: TEST_PASSWORD,
      });
      const user = users.find((u) => u.email === TEST_EMAIL)!;
      user.is_verified = true;
    }

    it('logs in with valid credentials and returns user data', async () => {
      await registerAndVerify();

      const res = await makeRequest(server, 'POST', `${BASE}/login`, {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(TEST_EMAIL);
      expect(res.body.data.full_name).toBe(TEST_NAME);

      // Session cookie should be set
      const cookie = extractSessionCookie(res.setCookie);
      expect(cookie).toBeDefined();
    });

    it('returns 401 for wrong password', async () => {
      await registerAndVerify();

      const res = await makeRequest(server, 'POST', `${BASE}/login`, {
        email: TEST_EMAIL,
        password: 'WrongPassword123',
      });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(res.body.error.attemptsRemaining).toBeDefined();
    });

    it('returns 401 for non-existent email', async () => {
      const res = await makeRequest(server, 'POST', `${BASE}/login`, {
        email: 'nobody@example.com',
        password: TEST_PASSWORD,
      });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('returns 403 for unverified email', async () => {
      await makeRequest(server, 'POST', `${BASE}/register`, {
        full_name: TEST_NAME,
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        confirm_password: TEST_PASSWORD,
      });

      const res = await makeRequest(server, 'POST', `${BASE}/login`, {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('EMAIL_NOT_VERIFIED');
    });

    it('returns 400 for missing fields', async () => {
      const res = await makeRequest(server, 'POST', `${BASE}/login`, {
        email: TEST_EMAIL,
        // password missing
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for invalid email format', async () => {
      const res = await makeRequest(server, 'POST', `${BASE}/login`, {
        email: 'not-valid',
        password: TEST_PASSWORD,
      });

      expect(res.status).toBe(400);
    });

    it('session persists and /me returns user data', async () => {
      await registerAndVerify();

      const loginRes = await makeRequest(server, 'POST', `${BASE}/login`, {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });

      const cookie = extractSessionCookie(loginRes.setCookie)!;

      const meRes = await makeRequest(server, 'GET', `${BASE}/me`, undefined, cookie);
      expect(meRes.status).toBe(200);
      expect(meRes.body.data.email).toBe(TEST_EMAIL);
    });

    it('returns 401 for /me without session', async () => {
      const res = await makeRequest(server, 'GET', `${BASE}/me`);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // ACCOUNT LOCKOUT
  // ══════════════════════════════════════════════════════════════════════════

  describe('Account lockout', () => {
    async function registerVerified() {
      await makeRequest(server, 'POST', `${BASE}/register`, {
        full_name: TEST_NAME,
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        confirm_password: TEST_PASSWORD,
      });
      const user = users.find((u) => u.email === TEST_EMAIL)!;
      user.is_verified = true;
    }

    it('locks account after 5 failed attempts', async () => {
      await registerVerified();

      // Attempt 5 wrong passwords
      for (let i = 0; i < 5; i++) {
        await makeRequest(server, 'POST', `${BASE}/login`, {
          email: TEST_EMAIL,
          password: 'WrongPassword1',
        });
      }

      // 6th attempt should return locked
      const res = await makeRequest(server, 'POST', `${BASE}/login`, {
        email: TEST_EMAIL,
        password: 'WrongPassword1',
      });

      expect(res.status).toBe(423);
      expect(res.body.error.code).toBe('ACCOUNT_LOCKED');
    });

    it('reports attempts remaining on failed login', async () => {
      await registerVerified();

      const res = await makeRequest(server, 'POST', `${BASE}/login`, {
        email: TEST_EMAIL,
        password: 'WrongPassword1',
      });

      expect(res.status).toBe(401);
      expect(res.body.error.attemptsRemaining).toBe(4);
    });

    it('resets attempts on successful login', async () => {
      await registerVerified();

      // Fail twice
      await makeRequest(server, 'POST', `${BASE}/login`, {
        email: TEST_EMAIL,
        password: 'Wrong1',
      });
      await makeRequest(server, 'POST', `${BASE}/login`, {
        email: TEST_EMAIL,
        password: 'Wrong2',
      });

      // Succeed
      await makeRequest(server, 'POST', `${BASE}/login`, {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });

      // Fail once — should have 4 remaining again (reset happened)
      const res = await makeRequest(server, 'POST', `${BASE}/login`, {
        email: TEST_EMAIL,
        password: 'WrongAgain1',
      });

      expect(res.status).toBe(401);
      expect(res.body.error.attemptsRemaining).toBe(4);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PASSWORD RESET
  // ══════════════════════════════════════════════════════════════════════════

  describe('Password reset flow', () => {
    async function registerVerified() {
      await makeRequest(server, 'POST', `${BASE}/register`, {
        full_name: TEST_NAME,
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        confirm_password: TEST_PASSWORD,
      });
      const user = users.find((u) => u.email === TEST_EMAIL)!;
      user.is_verified = true;
    }

    it('forgot-password always returns success (prevents enumeration)', async () => {
      const res = await makeRequest(server, 'POST', `${BASE}/forgot-password`, {
        email: 'ghost@example.com',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('sends reset code for verified user', async () => {
      await registerVerified();
      lastSentCode = null;

      const res = await makeRequest(server, 'POST', `${BASE}/forgot-password`, {
        email: TEST_EMAIL,
      });

      expect(res.status).toBe(200);
      expect(lastSentCode).toBe('123456');
    });

    it('resets password with valid code', async () => {
      await registerVerified();

      // Request reset
      await makeRequest(server, 'POST', `${BASE}/forgot-password`, {
        email: TEST_EMAIL,
      });

      // Reset password
      const res = await makeRequest(server, 'POST', `${BASE}/reset-password`, {
        email: TEST_EMAIL,
        code: '123456',
        password: 'NewSecure456',
        confirm_password: 'NewSecure456',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Login with new password should work
      const loginRes = await makeRequest(server, 'POST', `${BASE}/login`, {
        email: TEST_EMAIL,
        password: 'NewSecure456',
      });
      expect(loginRes.status).toBe(200);
    });

    it('old password no longer works after reset', async () => {
      await registerVerified();

      await makeRequest(server, 'POST', `${BASE}/forgot-password`, {
        email: TEST_EMAIL,
      });

      await makeRequest(server, 'POST', `${BASE}/reset-password`, {
        email: TEST_EMAIL,
        code: '123456',
        password: 'NewSecure456',
        confirm_password: 'NewSecure456',
      });

      const loginRes = await makeRequest(server, 'POST', `${BASE}/login`, {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });

      expect(loginRes.status).toBe(401);
    });

    it('returns 400 for invalid reset code', async () => {
      await registerVerified();

      await makeRequest(server, 'POST', `${BASE}/forgot-password`, {
        email: TEST_EMAIL,
      });

      const res = await makeRequest(server, 'POST', `${BASE}/reset-password`, {
        email: TEST_EMAIL,
        code: '999999',
        password: 'NewSecure456',
        confirm_password: 'NewSecure456',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_CODE');
    });

    it('returns 400 for non-existent email', async () => {
      const res = await makeRequest(server, 'POST', `${BASE}/reset-password`, {
        email: 'ghost@example.com',
        code: '123456',
        password: 'NewSecure456',
        confirm_password: 'NewSecure456',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_CODE');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // LOGOUT
  // ══════════════════════════════════════════════════════════════════════════

  describe('POST /api/auth/logout', () => {
    it('destroys session and clears cookie', async () => {
      // Register and verify
      await makeRequest(server, 'POST', `${BASE}/register`, {
        full_name: TEST_NAME,
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        confirm_password: TEST_PASSWORD,
      });
      const user = users.find((u) => u.email === TEST_EMAIL)!;
      user.is_verified = true;

      // Login
      const loginRes = await makeRequest(server, 'POST', `${BASE}/login`, {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });
      const cookie = extractSessionCookie(loginRes.setCookie)!;

      // Verify session works
      const meBefore = await makeRequest(server, 'GET', `${BASE}/me`, undefined, cookie);
      expect(meBefore.status).toBe(200);

      // Logout
      const logoutRes = await makeRequest(server, 'POST', `${BASE}/logout`, undefined, cookie);
      expect(logoutRes.status).toBe(200);

      // Verify session is gone
      const meAfter = await makeRequest(server, 'GET', `${BASE}/me`, undefined, cookie);
      expect(meAfter.status).toBe(401);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // FULL FLOW: Register → Verify → Login → Access Protected → Logout
  // ══════════════════════════════════════════════════════════════════════════

  describe('Full registration → login flow', () => {
    it('completes the entire user journey', async () => {
      // Step 1: Register
      const regRes = await makeRequest(server, 'POST', `${BASE}/register`, {
        full_name: 'Flow Test',
        email: 'flow@test.com',
        password: 'FlowPass123',
        confirm_password: 'FlowPass123',
      });
      expect(regRes.status).toBe(201);
      expect(regRes.body.data.user_id).toBeDefined();

      // Step 2: Verify email
      const verifyRes = await makeRequest(server, 'POST', `${BASE}/verify-email`, {
        email: 'flow@test.com',
        code: '123456',
      });
      expect(verifyRes.status).toBe(200);
      const cookie = extractSessionCookie(verifyRes.setCookie)!;

      // Step 3: Access protected resource (auto-logged in after verify)
      const meRes = await makeRequest(server, 'GET', `${BASE}/me`, undefined, cookie);
      expect(meRes.status).toBe(200);
      expect(meRes.body.data.email).toBe('flow@test.com');
      expect(meRes.body.data.full_name).toBe('Flow Test');

      // Step 4: Logout
      const logoutRes = await makeRequest(server, 'POST', `${BASE}/logout`, undefined, cookie);
      expect(logoutRes.status).toBe(200);

      // Step 5: Verify logged out
      const meAfterLogout = await makeRequest(server, 'GET', `${BASE}/me`, undefined, cookie);
      expect(meAfterLogout.status).toBe(401);

      // Step 6: Login again
      const loginRes = await makeRequest(server, 'POST', `${BASE}/login`, {
        email: 'flow@test.com',
        password: 'FlowPass123',
      });
      expect(loginRes.status).toBe(200);
      const newCookie = extractSessionCookie(loginRes.setCookie)!;

      // Step 7: Access protected resource with new session
      const meAgain = await makeRequest(server, 'GET', `${BASE}/me`, undefined, newCookie);
      expect(meAgain.status).toBe(200);
      expect(meAgain.body.data.email).toBe('flow@test.com');
    });
  });
});
