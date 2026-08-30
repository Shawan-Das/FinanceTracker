/**
 * Integration tests for the Loan CRUD routes (including repayments).
 *
 * Exercises the full HTTP path through Express route handlers with a mocked
 * database so we validate request parsing, auth, validation, CRUD operations,
 * repayment logic, and response shapes end-to-end.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import http from 'http';

// ── In-memory stores ────────────────────────────────────────────────────────

interface Row {
  [key: string]: any;
}

const store: Record<string, Row[]> = {
  users: [],
  accounts: [],
  people: [],
  categories: [],
  transactions: [],
  transaction_transfers: [],
  loans: [],
  loan_repayments: [],
};

let idCounter = 0;
function nextId() {
  return `test_id_${++idCounter}`;
}

function resetStore() {
  for (const key of Object.keys(store)) store[key].length = 0;
  idCounter = 0;

  // Seed a default user
  store.users.push({
    id: 'usr_test',
    full_name: 'Test User',
    email: 'test@example.com',
    password_hash: 'hashed',
    is_verified: true,
    is_locked: false,
    locked_until: null,
    failed_login_attempts: 0,
    default_currency: 'BDT',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  // Seed a default account
  store.accounts.push({
    id: 'acc_bank1',
    user_id: 'usr_test',
    name: 'Test Bank',
    account_type: 'BANK',
    currency: 'BDT',
    opening_balance: 50000,
    opening_balance_date: '2026-01-01',
    is_active: true,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  // Seed a default person
  store.people.push({
    id: 'per_rahim',
    user_id: 'usr_test',
    name: 'Rahim',
    phone: null,
    email: null,
    notes: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

// ── Mock DB ─────────────────────────────────────────────────────────────────

function queryHandler(sql: string, params: any[] = []): { rows: Row[] } {
  // ── BEGIN / COMMIT / ROLLBACK ──
  if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] };

  // ── Check account exists (used in loan create with account_id) ──
  if (sql.includes('SELECT id FROM') && sql.includes('accounts') && sql.includes('WHERE id = $1 AND user_id = $2')) {
    const acc = store.accounts.find((a) => a.id === params[0] && a.user_id === params[1]);
    return { rows: acc ? [acc] : [] };
  }

  // ── Check person exists ──
  if (sql.includes('SELECT id FROM') && sql.includes('people') && sql.includes('is_active = TRUE')) {
    const p = store.people.find((pp) => pp.id === params[0] && pp.user_id === params[1] && pp.is_active);
    return { rows: p ? [p] : [] };
  }

  // ── INSERT loan ──
  if (sql.includes('INSERT INTO') && sql.includes('loans') && sql.includes('RETURNING *')) {
    const loan: Row = {
      id: params[0],
      user_id: params[1],
      person_id: params[2],
      direction: params[3],
      principal_amount: params[4],
      interest_amount: params[5],
      start_date: params[6],
      due_date: params[7],
      description: params[8],
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    store.loans.push(loan);
    return { rows: [loan] };
  }

  // ── INSERT transaction (for loan creation with account_id) ──
  if (sql.includes('INSERT INTO') && sql.includes('transactions') && !sql.includes('RETURNING *')) {
    const tx: Row = {
      id: params[0],
      user_id: params[1],
      transaction_type: params[2],
      transaction_date: params[3],
      amount: params[4],
      account_id: params[5],
      person_id: params[6],
      loan_id: params[7],
      description: params[8],
      reference: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };
    store.transactions.push(tx);
    return { rows: [] };
  }

  // ── INSERT transaction with RETURNING * (for repayment creation) ──
  if (sql.includes('INSERT INTO') && sql.includes('transactions') && sql.includes('RETURNING *')) {
    const tx: Row = {
      id: params[0],
      user_id: params[1],
      transaction_type: params[2],
      transaction_date: params[3],
      amount: params[4],
      account_id: params[5],
      person_id: params[6],
      loan_id: params[7],
      description: params[8],
      reference: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };
    store.transactions.push(tx);
    return { rows: [tx] };
  }

  // ── INSERT loan_repayments ──
  if (sql.includes('INSERT INTO') && sql.includes('loan_repayments')) {
    const lr: Row = {
      id: params[0],
      loan_id: params[1],
      transaction_id: params[2],
      amount: params[3],
      repayment_date: params[4],
      notes: params[5],
      created_at: new Date().toISOString(),
    };
    store.loan_repayments.push(lr);
    return { rows: [] };
  }

  // ── List loans (GET /) ──
  if (sql.includes('SELECT l.*') && sql.includes('loans l') && sql.includes('WHERE l.user_id = $1') && sql.includes('remaining_amount') && !sql.includes('l.id = $1')) {
    const userLoans = store.loans.filter((l) => l.user_id === params[0]);
    const enriched = userLoans.map((l) => {
      const totalRepaid = store.loan_repayments
        .filter((lr) => lr.loan_id === l.id)
        .reduce((sum, lr) => sum + lr.amount, 0);
      return {
        ...l,
        person_name: store.people.find((p) => p.id === l.person_id)?.name || null,
        total_repaid: totalRepaid,
        remaining_amount: l.principal_amount + l.interest_amount - totalRepaid,
      };
    });
    return { rows: enriched };
  }

  // ── Get single loan with repayments (GET /:id) ──
  if (sql.includes('SELECT l.*') && sql.includes('loans l') && sql.includes('l.id = $1') && sql.includes('l.user_id = $2')) {
    const loan = store.loans.find((l) => l.id === params[0] && l.user_id === params[1]);
    if (!loan) return { rows: [] };
    const totalRepaid = store.loan_repayments
      .filter((lr) => lr.loan_id === loan.id)
      .reduce((sum, lr) => sum + lr.amount, 0);
    return {
      rows: [{
        ...loan,
        person_name: store.people.find((p) => p.id === loan.person_id)?.name || null,
        total_repaid: totalRepaid,
        remaining_amount: loan.principal_amount + loan.interest_amount - totalRepaid,
      }],
    };
  }

  // ── Get loan repayments (GET /:id/repayments) ──
  if (sql.includes('SELECT lr.*') && sql.includes('loan_repayments lr') && sql.includes('WHERE lr.loan_id = $1')) {
    const loanId = params[0];
    const repayments = store.loan_repayments
      .filter((lr) => lr.loan_id === loanId)
      .map((lr) => {
        const tx = store.transactions.find((t) => t.id === lr.transaction_id);
        return {
          ...lr,
          account_id: tx?.account_id || null,
          account_name: tx ? store.accounts.find((a) => a.id === tx.account_id)?.name || null : null,
        };
      })
      .sort((a: any, b: any) => new Date(b.repayment_date).getTime() - new Date(a.repayment_date).getTime());
    return { rows: repayments };
  }

  // ── Check loan exists for repayment (SELECT id/SELECT * FROM loans WHERE id = $1 AND user_id = $2) ──
  if ((sql.includes('SELECT * FROM') || sql.includes('SELECT id FROM')) && sql.includes('loans') && sql.includes('WHERE id = $1 AND user_id = $2') && !sql.includes('person_id')) {
    const loan = store.loans.find((l) => l.id === params[0] && l.user_id === params[1]);
    return { rows: loan ? [loan] : [] };
  }

  // ── Select total repaid for loan ──
  if (sql.includes('SELECT COALESCE(SUM(lr.amount)') && sql.includes('loan_repayments lr') && sql.includes('WHERE lr.loan_id = $1')) {
    const loanId = params[0];
    const totalRepaid = store.loan_repayments
      .filter((lr) => lr.loan_id === loanId)
      .reduce((sum, lr) => sum + lr.amount, 0);
    return { rows: [{ total_repaid: totalRepaid }] };
  }

  // ── UPDATE loan status (parameterized) ──
  if (sql.includes('UPDATE') && sql.includes('loans') && sql.includes('status =') && sql.includes('RETURNING *')) {
    // The first param is the status value (parameterized), loanId is second-to-last, userId is last
    const newStatus = params[0]; // e.g. 'OVERDUE', 'PAID', 'ACTIVE'
    const loanId = params[params.length - 2];
    const loan = store.loans.find((l) => l.id === loanId && l.user_id === params[params.length - 1]);
    if (!loan) return { rows: [] };
    loan.status = newStatus;
    loan.updated_at = new Date().toISOString();
    return { rows: [{ ...loan }] };
  }

  // ── UPDATE loan (PATCH) ──
  if (sql.includes('UPDATE') && sql.includes('loans') && sql.includes('RETURNING *')) {
    const loanId = params[params.length - 2];
    const userId = params[params.length - 1];
    const loan = store.loans.find((l) => l.id === loanId && l.user_id === userId);
    if (!loan) return { rows: [] };
    // Parse SET fields
    const setMatch = sql.match(/SET (.+?) WHERE/s);
    if (setMatch) {
      const fields = setMatch[1].split(',').map((f: string) => f.trim());
      let pi = 0;
      for (const field of fields) {
        const fieldName = field.split('=')[0].trim();
        if (fieldName === 'updated_at') continue;
        if (field.includes('NOW()')) continue;
        loan[fieldName] = params[pi];
        pi++;
      }
    }
    loan.updated_at = new Date().toISOString();
    return { rows: [{ ...loan }] };
  }

  // ── UPDATE loan status (literal, no RETURNING) ──
  if (sql.includes('UPDATE') && sql.includes('loans') && sql.includes('status =') && !sql.includes('RETURNING *')) {
    const statusMatch = sql.match(/status = '(\w+)'/);
    if (statusMatch) {
      const newStatus = statusMatch[1];
      const loanId = params[params.length - 1] ?? params[0];
      const loan = store.loans.find((l) => l.id === loanId);
      if (loan) loan.status = newStatus;
      return { rows: [] };
    }
  }

  // ── Check repayments exist for loan (for DELETE check) ──
  if (sql.includes('SELECT COUNT(*)') && sql.includes('loan_repayments') && sql.includes('WHERE loan_id = $1')) {
    const loanId = params[0];
    const count = store.loan_repayments.filter((lr) => lr.loan_id === loanId).length;
    return { rows: [{ count: String(count) }] };
  }

  // ── DELETE loan ──
  if (sql.includes('DELETE FROM') && sql.includes('loans') && sql.includes('RETURNING id')) {
    const loanId = params[0];
    const userId = params[1];
    const idx = store.loans.findIndex((l) => l.id === loanId && l.user_id === userId);
    if (idx === -1) return { rows: [] };
    store.loans.splice(idx, 1);
    return { rows: [{ id: loanId }] };
  }

  // ── Check v_account_balances (used by account validation) ──
  if (sql.includes('v_account_balances')) {
    return { rows: [] };
  }

  // ── Fallback ──
  return { rows: [] };
}

// ── Mock modules ────────────────────────────────────────────────────────────

vi.mock('../database/connection', () => ({
  db: {
    query: async (sql: string, params: any[] = []) => queryHandler(sql, params),
    getClient: async () => ({
      query: async (sql: string, params: any[] = []) => queryHandler(sql, params),
      release: () => {},
    }),
  },
}));

vi.mock('../middleware/rateLimit', () => ({
  apiLimiter: (_req: any, _res: any, next: any) => next(),
  authLimiter: (_req: any, _res: any, next: any) => next(),
  sensitiveLimiter: (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../middleware/auth', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    const cookie = req.headers?.cookie || '';
    const match = cookie.match(/token=([^;]+)/);
    if (match && match[1] === 'valid-token') {
      req.userId = 'usr_test';
      next();
    } else {
      _res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'You must be logged in' },
      });
    }
  },
  getUserId: (req: any) => {
    if (!req.userId) throw new Error('Not authenticated');
    return req.userId;
  },
}));

// ── Build test app ──────────────────────────────────────────────────────────

function buildTestApp(loansRouter: any) {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  app.use('/api/loans', loansRouter);
  return app;
}

// ── HTTP helper ─────────────────────────────────────────────────────────────

interface HttpResult {
  status: number;
  body: any;
}

function makeRequest(
  server: http.Server,
  method: string,
  path: string,
  body?: any,
  cookie = 'token=valid-token',
): Promise<HttpResult> {
  return new Promise((resolve, reject) => {
    const addr = server.address() as any;
    const headers: http.OutgoingHttpHeaders = {
      'Content-Type': 'application/json',
      Cookie: cookie,
    };

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
        resolve({
          status: res.statusCode!,
          body: data ? JSON.parse(data) : null,
        });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('Loan CRUD — end-to-end', () => {
  let server: http.Server;

  beforeAll(async () => {
    const loansRouter = (await import('../routes/loans')).default;
    const app = buildTestApp(loansRouter);
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
    resetStore();
    vi.clearAllMocks();
  });

  // ══════════════════════════════════════════════════════════════════════════
  // CREATE
  // ══════════════════════════════════════════════════════════════════════════

  describe('POST /api/loans', () => {
    it('creates a LENT loan', async () => {
      const res = await makeRequest(server, 'POST', '/api/loans', {
        person_id: 'per_rahim',
        direction: 'LENT',
        principal_amount: 100000,
        interest_amount: 10000,
        start_date: '2026-08-01',
        due_date: '2026-12-31',
        description: 'Personal loan to Rahim',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.direction).toBe('LENT');
      expect(res.body.data.principal_amount).toBe(100000);
      expect(res.body.data.interest_amount).toBe(10000);
      expect(res.body.data.total_repaid).toBe(0);
      expect(res.body.data.remaining_amount).toBe(110000);
      expect(res.body.data.status).toBe('ACTIVE');
    });

    it('creates a BORROWED loan', async () => {
      const res = await makeRequest(server, 'POST', '/api/loans', {
        person_id: 'per_rahim',
        direction: 'BORROWED',
        principal_amount: 200000,
        interest_amount: 20000,
        start_date: '2026-08-01',
        description: 'Loan from Rahim',
      });

      expect(res.status).toBe(201);
      expect(res.body.data.direction).toBe('BORROWED');
      expect(res.body.data.remaining_amount).toBe(220000);
    });

    it('creates loan with default interest of 0', async () => {
      const res = await makeRequest(server, 'POST', '/api/loans', {
        direction: 'LENT',
        principal_amount: 50000,
        start_date: '2026-08-01',
      });

      expect(res.status).toBe(201);
      expect(res.body.data.interest_amount).toBe(0);
      expect(res.body.data.remaining_amount).toBe(50000);
    });

    it('returns 400 for missing direction', async () => {
      const res = await makeRequest(server, 'POST', '/api/loans', {
        principal_amount: 50000,
        start_date: '2026-08-01',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for missing principal_amount', async () => {
      const res = await makeRequest(server, 'POST', '/api/loans', {
        direction: 'LENT',
        start_date: '2026-08-01',
      });

      expect(res.status).toBe(400);
    });

    it('returns 400 for negative principal', async () => {
      const res = await makeRequest(server, 'POST', '/api/loans', {
        direction: 'LENT',
        principal_amount: -50000,
        start_date: '2026-08-01',
      });

      expect(res.status).toBe(400);
    });

    it('returns 400 for missing start_date', async () => {
      const res = await makeRequest(server, 'POST', '/api/loans', {
        direction: 'LENT',
        principal_amount: 50000,
      });

      expect(res.status).toBe(400);
    });

    it('returns 401 without auth', async () => {
      const res = await makeRequest(server, 'POST', '/api/loans', {
        direction: 'LENT',
        principal_amount: 50000,
        start_date: '2026-08-01',
      }, 'token=invalid');

      expect(res.status).toBe(401);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // LIST
  // ══════════════════════════════════════════════════════════════════════════

  describe('GET /api/loans', () => {
    it('returns empty list initially', async () => {
      const res = await makeRequest(server, 'GET', '/api/loans');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it('returns created loans', async () => {
      await makeRequest(server, 'POST', '/api/loans', {
        person_id: 'per_rahim',
        direction: 'LENT',
        principal_amount: 100000,
        start_date: '2026-08-01',
      });

      await makeRequest(server, 'POST', '/api/loans', {
        person_id: 'per_rahim',
        direction: 'BORROWED',
        principal_amount: 50000,
        start_date: '2026-08-05',
      });

      const res = await makeRequest(server, 'GET', '/api/loans');

      expect(res.body.data.length).toBe(2);
    });

    it('enriches loans with person_name and repayment data', async () => {
      await makeRequest(server, 'POST', '/api/loans', {
        person_id: 'per_rahim',
        direction: 'LENT',
        principal_amount: 100000,
        interest_amount: 10000,
        start_date: '2026-08-01',
      });

      const res = await makeRequest(server, 'GET', '/api/loans');

      expect(res.body.data[0].person_name).toBe('Rahim');
      expect(res.body.data[0].total_repaid).toBe(0);
      expect(res.body.data[0].remaining_amount).toBe(110000);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // GET SINGLE
  // ══════════════════════════════════════════════════════════════════════════

  describe('GET /api/loans/:id', () => {
    it('returns a single loan with repayments array', async () => {
      const createRes = await makeRequest(server, 'POST', '/api/loans', {
        person_id: 'per_rahim',
        direction: 'LENT',
        principal_amount: 100000,
        start_date: '2026-08-01',
      });
      const loanId = createRes.body.data.id;

      const res = await makeRequest(server, 'GET', `/api/loans/${loanId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(loanId);
      expect(res.body.data.repayments).toEqual([]);
    });

    it('returns 404 for non-existent loan', async () => {
      const res = await makeRequest(server, 'GET', '/api/loans/ln_nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // UPDATE
  // ══════════════════════════════════════════════════════════════════════════

  describe('PATCH /api/loans/:id', () => {
    it('updates loan due_date', async () => {
      const createRes = await makeRequest(server, 'POST', '/api/loans', {
        direction: 'LENT',
        principal_amount: 100000,
        start_date: '2026-08-01',
      });
      const loanId = createRes.body.data.id;

      const res = await makeRequest(server, 'PATCH', `/api/loans/${loanId}`, {
        due_date: '2027-06-30',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.due_date).toBe('2027-06-30');
    });

    it('updates loan status', async () => {
      const createRes = await makeRequest(server, 'POST', '/api/loans', {
        direction: 'LENT',
        principal_amount: 100000,
        start_date: '2026-08-01',
      });
      const loanId = createRes.body.data.id;

      const res = await makeRequest(server, 'PATCH', `/api/loans/${loanId}`, {
        status: 'OVERDUE',
      });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('OVERDUE');
    });

    it('returns 404 for non-existent loan', async () => {
      const res = await makeRequest(server, 'PATCH', '/api/loans/ln_nonexistent', {
        due_date: '2027-01-01',
      });

      expect(res.status).toBe(404);
    });

    it('returns 400 for empty update body', async () => {
      const createRes = await makeRequest(server, 'POST', '/api/loans', {
        direction: 'LENT',
        principal_amount: 100000,
        start_date: '2026-08-01',
      });
      const loanId = createRes.body.data.id;

      const res = await makeRequest(server, 'PATCH', `/api/loans/${loanId}`, {});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('NO_UPDATES');
    });

    it('returns 400 for invalid status value', async () => {
      const createRes = await makeRequest(server, 'POST', '/api/loans', {
        direction: 'LENT',
        principal_amount: 100000,
        start_date: '2026-08-01',
      });
      const loanId = createRes.body.data.id;

      const res = await makeRequest(server, 'PATCH', `/api/loans/${loanId}`, {
        status: 'INVALID_STATUS',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // DELETE
  // ══════════════════════════════════════════════════════════════════════════

  describe('DELETE /api/loans/:id', () => {
    it('deletes a loan with no repayments', async () => {
      const createRes = await makeRequest(server, 'POST', '/api/loans', {
        direction: 'LENT',
        principal_amount: 100000,
        start_date: '2026-08-01',
      });
      const loanId = createRes.body.data.id;

      const res = await makeRequest(server, 'DELETE', `/api/loans/${loanId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(loanId);

      // Verify it's gone
      const getRes = await makeRequest(server, 'GET', `/api/loans/${loanId}`);
      expect(getRes.status).toBe(404);
    });

    it('returns 409 for loan with repayments', async () => {
      const createRes = await makeRequest(server, 'POST', '/api/loans', {
        person_id: 'per_rahim',
        direction: 'LENT',
        principal_amount: 100000,
        start_date: '2026-08-01',
      });
      const loanId = createRes.body.data.id;

      // Simulate a repayment by adding to the store
      store.loan_repayments.push({
        id: nextId(),
        loan_id: loanId,
        transaction_id: nextId(),
        amount: 30000,
        repayment_date: '2026-08-15',
        notes: null,
        created_at: new Date().toISOString(),
      });

      const res = await makeRequest(server, 'DELETE', `/api/loans/${loanId}`);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('HAS_REPAYMENTS');
    });

    it('returns 404 for non-existent loan', async () => {
      const res = await makeRequest(server, 'DELETE', '/api/loans/ln_nonexistent');

      expect(res.status).toBe(404);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // REPAYMENTS
  // ══════════════════════════════════════════════════════════════════════════

  describe('POST /api/loans/:id/repayments', () => {
    it('records a repayment successfully', async () => {
      const createRes = await makeRequest(server, 'POST', '/api/loans', {
        person_id: 'per_rahim',
        direction: 'LENT',
        principal_amount: 100000,
        start_date: '2026-08-01',
      });
      const loanId = createRes.body.data.id;

      const res = await makeRequest(server, 'POST', `/api/loans/${loanId}/repayments`, {
        amount: 30000,
        repayment_date: '2026-08-15',
        account_id: 'acc_bank1',
        notes: 'First repayment',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.amount).toBe(30000);
      expect(res.body.data.transaction_type).toContain('REPAYMENT');
    });

    it('marks loan as PAID when fully repaid', async () => {
      const createRes = await makeRequest(server, 'POST', '/api/loans', {
        person_id: 'per_rahim',
        direction: 'LENT',
        principal_amount: 50000,
        start_date: '2026-08-01',
      });
      const loanId = createRes.body.data.id;

      // Repay full amount
      await makeRequest(server, 'POST', `/api/loans/${loanId}/repayments`, {
        amount: 50000,
        repayment_date: '2026-08-15',
        account_id: 'acc_bank1',
      });

      // Check loan is now PAID
      const getRes = await makeRequest(server, 'GET', `/api/loans/${loanId}`);
      expect(getRes.body.data.status).toBe('PAID');
    });

    it('returns 400 when repayment exceeds remaining amount', async () => {
      const createRes = await makeRequest(server, 'POST', '/api/loans', {
        person_id: 'per_rahim',
        direction: 'LENT',
        principal_amount: 50000,
        start_date: '2026-08-01',
      });
      const loanId = createRes.body.data.id;

      const res = await makeRequest(server, 'POST', `/api/loans/${loanId}/repayments`, {
        amount: 60000,
        repayment_date: '2026-08-15',
        account_id: 'acc_bank1',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('AMOUNT_EXCEEDS');
    });

    it('returns 400 for zero amount', async () => {
      const createRes = await makeRequest(server, 'POST', '/api/loans', {
        direction: 'LENT',
        principal_amount: 50000,
        start_date: '2026-08-01',
      });
      const loanId = createRes.body.data.id;

      const res = await makeRequest(server, 'POST', `/api/loans/${loanId}/repayments`, {
        amount: 0,
        repayment_date: '2026-08-15',
        account_id: 'acc_bank1',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 for non-existent loan', async () => {
      const res = await makeRequest(server, 'POST', '/api/loans/ln_nonexistent/repayments', {
        amount: 30000,
        repayment_date: '2026-08-15',
        account_id: 'acc_bank1',
      });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/loans/:id/repayments', () => {
    it('lists repayments for a loan', async () => {
      const createRes = await makeRequest(server, 'POST', '/api/loans', {
        person_id: 'per_rahim',
        direction: 'LENT',
        principal_amount: 100000,
        start_date: '2026-08-01',
      });
      const loanId = createRes.body.data.id;

      // Record two repayments
      await makeRequest(server, 'POST', `/api/loans/${loanId}/repayments`, {
        amount: 30000,
        repayment_date: '2026-08-15',
        account_id: 'acc_bank1',
      });
      await makeRequest(server, 'POST', `/api/loans/${loanId}/repayments`, {
        amount: 20000,
        repayment_date: '2026-09-01',
        account_id: 'acc_bank1',
      });

      const res = await makeRequest(server, 'GET', `/api/loans/${loanId}/repayments`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].amount).toBe(20000); // most recent first
      expect(res.body.data[1].amount).toBe(30000);
    });

    it('returns 404 for non-existent loan', async () => {
      const res = await makeRequest(server, 'GET', '/api/loans/ln_nonexistent/repayments');

      expect(res.status).toBe(404);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // FULL LIFECYCLE
  // ══════════════════════════════════════════════════════════════════════════

  describe('Full loan lifecycle', () => {
    it('create → list → get → repay → verify PAID → delete', async () => {
      // Create
      const createRes = await makeRequest(server, 'POST', '/api/loans', {
        person_id: 'per_rahim',
        direction: 'LENT',
        principal_amount: 50000,
        interest_amount: 5000,
        start_date: '2026-08-01',
        due_date: '2026-12-31',
      });
      expect(createRes.status).toBe(201);
      const loanId = createRes.body.data.id;

      // List
      const listRes = await makeRequest(server, 'GET', '/api/loans');
      expect(listRes.body.data.length).toBe(1);
      expect(listRes.body.data[0].remaining_amount).toBe(55000);

      // Get
      const getRes = await makeRequest(server, 'GET', `/api/loans/${loanId}`);
      expect(getRes.body.data.status).toBe('ACTIVE');
      expect(getRes.body.data.repayments).toEqual([]);

      // Partial repayment
      await makeRequest(server, 'POST', `/api/loans/${loanId}/repayments`, {
        amount: 20000,
        repayment_date: '2026-09-01',
        account_id: 'acc_bank1',
      });

      // Verify still ACTIVE
      const midRes = await makeRequest(server, 'GET', `/api/loans/${loanId}`);
      expect(midRes.body.data.status).toBe('ACTIVE');
      expect(midRes.body.data.repayments.length).toBe(1);

      // Final repayment
      await makeRequest(server, 'POST', `/api/loans/${loanId}/repayments`, {
        amount: 35000,
        repayment_date: '2026-10-01',
        account_id: 'acc_bank1',
      });

      // Verify now PAID
      const paidRes = await makeRequest(server, 'GET', `/api/loans/${loanId}`);
      expect(paidRes.body.data.status).toBe('PAID');
      expect(paidRes.body.data.repayments.length).toBe(2);

      // Try to delete — should fail because repayments exist
      const deleteRes = await makeRequest(server, 'DELETE', `/api/loans/${loanId}`);
      expect(deleteRes.status).toBe(409);
    });
  });
});
