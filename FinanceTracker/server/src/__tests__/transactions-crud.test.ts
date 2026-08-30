/**
 * Integration tests for the Transaction CRUD routes.
 *
 * Exercises the full HTTP path through Express route handlers with a mocked
 * database so we validate request parsing, auth, validation, CRUD operations,
 * and response shapes end-to-end.
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

  store.accounts.push({
    id: 'acc_cash1',
    user_id: 'usr_test',
    name: 'Cash Wallet',
    account_type: 'CASH',
    currency: 'BDT',
    opening_balance: 10000,
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

  // Seed a default category
  store.categories.push({
    id: 'cat_salary',
    user_id: 'usr_test',
    name: 'Salary',
    type: 'INCOME',
    icon: null,
    color: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  store.categories.push({
    id: 'cat_food',
    user_id: 'usr_test',
    name: 'Food',
    type: 'EXPENSE',
    icon: null,
    color: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

// ── Mock DB ─────────────────────────────────────────────────────────────────

function matchesWhere(sql: string, conditions: string[], params: any[]): boolean {
  return conditions.every((c) => sql.includes(c));
}

function parseOffsetLimit(sql: string, params: any[]): { offset?: number; limit?: number } {
  const limIdx = sql.indexOf('LIMIT $');
  const offIdx = sql.indexOf('OFFSET $');
  const result: { offset?: number; limit?: number } = {};
  if (limIdx !== -1) {
    const match = sql.substring(limIdx).match(/LIMIT \$(\d+)/);
    if (match) result.limit = params[parseInt(match[1]) - 1];
  }
  if (offIdx !== -1) {
    const match = sql.substring(offIdx).match(/OFFSET \$(\d+)/);
    if (match) result.offset = params[parseInt(match[1]) - 1];
  }
  return result;
}

function queryHandler(sql: string, params: any[] = []): { rows: Row[] } {
  // ── Transactions LIST ──
  if (sql.includes('SELECT') && sql.includes('transactions') && sql.includes('COUNT(*)') && sql.includes('deleted_at IS NULL') && !sql.includes('person_id = $2')) {
    let rows = store.transactions.filter((t) => t.user_id === params[0] && !t.deleted_at);
    const total = rows.length;
    return { rows: [{ total: String(total) }] };
  }

  // ── Transactions LIST with JOINs (data query) ──
  if (sql.includes('SELECT t.*') && sql.includes('transactions t') && sql.includes('LEFT JOIN') && sql.includes('LIMIT')) {
    let rows = store.transactions.filter((t) => t.user_id === params[0] && !t.deleted_at);
    // Enrich with account_name, person_name, category_name
    rows = rows.map((t) => ({
      ...t,
      account_name: store.accounts.find((a) => a.id === t.account_id)?.name || null,
      person_name: store.people.find((p) => p.id === t.person_id)?.name || null,
      category_name: store.categories.find((c) => c.id === t.category_id)?.name || null,
    }));
    // Apply limit/offset
    const { limit = 30, offset = 0 } = parseOffsetLimit(sql, params);
    return { rows: rows.slice(offset, offset + limit) };
  }

  // ── Single transaction GET ──
  if (sql.includes('SELECT t.*') && sql.includes('transactions t') && sql.includes('t.id = $1') && sql.includes('t.user_id = $2')) {
    const tx = store.transactions.find((t) => t.id === params[0] && t.user_id === params[1] && !t.deleted_at);
    if (!tx) return { rows: [] };
    return {
      rows: [{
        ...tx,
        account_name: store.accounts.find((a) => a.id === tx.account_id)?.name || null,
        person_name: store.people.find((p) => p.id === tx.person_id)?.name || null,
        category_name: store.categories.find((c) => c.id === tx.category_id)?.name || null,
      }],
    };
  }

  // ── Transaction transfers for single tx ──
  if (sql.includes('transaction_transfers tt') && sql.includes('tt.transaction_id = $1')) {
    const transfers = store.transaction_transfers.filter((tt) => tt.transaction_id === params[0]);
    return {
      rows: transfers.map((tt) => ({
        ...tt,
        from_account_name: store.accounts.find((a) => a.id === tt.from_account_id)?.name || null,
        to_account_name: store.accounts.find((a) => a.id === tt.to_account_id)?.name || null,
      })),
    };
  }

  // ── Check account exists ──
  if (sql.includes('SELECT id FROM') && sql.includes('accounts') && sql.includes('WHERE id = $1 AND user_id = $2') && !sql.includes('is_active')) {
    const acc = store.accounts.find((a) => a.id === params[0] && a.user_id === params[1]);
    return { rows: acc ? [acc] : [] };
  }

  // ── Check person exists ──
  if (sql.includes('SELECT id FROM') && sql.includes('people') && sql.includes('is_active = TRUE')) {
    const p = store.people.find((pp) => pp.id === params[0] && pp.user_id === params[1] && pp.is_active);
    return { rows: p ? [p] : [] };
  }

  // ── Check category exists ──
  if (sql.includes('SELECT id, type FROM') && sql.includes('categories')) {
    const c = store.categories.find((cc) => cc.id === params[0] && cc.user_id === params[1] && cc.is_active);
    return { rows: c ? [c] : [] };
  }

  // ── INSERT transaction ──
  if (sql.includes('INSERT INTO') && sql.includes('transactions') && sql.includes('RETURNING *')) {
    const tx: Row = {
      id: params[0],
      user_id: params[1],
      transaction_type: params[2],
      transaction_date: params[3],
      amount: params[4],
      account_id: params[5],
      person_id: params[6],
      category_id: params[7],
      loan_id: params[8],
      description: params[9],
      reference: params[10],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };
    store.transactions.push(tx);
    return { rows: [tx] };
  }

  // ── INSERT transaction_transfers ──
  if (sql.includes('INSERT INTO') && sql.includes('transaction_transfers')) {
    const tt: Row = {
      id: params[0],
      transaction_id: params[1],
      from_account_id: params[2],
      to_account_id: params[3],
      amount: params[4],
      created_at: new Date().toISOString(),
    };
    store.transaction_transfers.push(tt);
    return { rows: [] };
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

  // ── SELECT existing transaction (for UPDATE/DELETE) ──
  if (sql.includes('SELECT *') && sql.includes('transactions') && sql.includes('WHERE id = $1') && sql.includes('user_id = $2') && sql.includes('deleted_at IS NULL') && !sql.includes('transaction_transfers')) {
    const tx = store.transactions.find((t) => t.id === params[0] && t.user_id === params[1] && !t.deleted_at);
    return { rows: tx ? [tx] : [] };
  }

  // ── UPDATE transaction ──
  if (sql.includes('UPDATE') && sql.includes('transactions') && sql.includes('RETURNING *') && sql.includes('WHERE id = $')) {
    const txId = params[params.length - 2];
    const userId = params[params.length - 1];
    const tx = store.transactions.find((t) => t.id === txId && t.user_id === userId && !t.deleted_at);
    if (!tx) return { rows: [] };
    // Parse SET fields from SQL
    const setMatch = sql.match(/SET (.+?) WHERE/s);
    if (setMatch) {
      const fields = setMatch[1].split(',').map((f: string) => f.trim());
      let pi = 0;
      for (const field of fields) {
        const fieldName = field.split('=')[0].trim();
        if (fieldName === 'updated_at') continue;
        if (field.includes('NOW()')) continue;
        tx[fieldName] = params[pi];
        pi++;
      }
    }
    return { rows: [{ ...tx }] };
  }

  // ── Soft delete transaction ──
  if (sql.includes('UPDATE') && sql.includes('transactions') && sql.includes('deleted_at = NOW()')) {
    const txId = params[0];
    const tx = store.transactions.find((t) => t.id === txId);
    if (tx) {
      tx.deleted_at = new Date().toISOString();
      tx.updated_at = new Date().toISOString();
    }
    return { rows: [] };
  }

  // ── UPDATE loan_repayments ──
  if (sql.includes('UPDATE') && sql.includes('loan_repayments') && sql.includes('SET amount')) {
    const amount = params[0];
    const txId = params[1];
    const lr = store.loan_repayments.find((l) => l.transaction_id === txId);
    if (lr) lr.amount = amount;
    return { rows: [] };
  }

  // ── DELETE loan_repayments ──
  if (sql.includes('DELETE FROM') && sql.includes('loan_repayments')) {
    const txId = params[0];
    store.loan_repayments = store.loan_repayments.filter((lr) => lr.transaction_id !== txId);
    return { rows: [] };
  }

  // ── Loan repayment summary for loan status check ──
  if (sql.includes('COALESCE(lr.total_repaid') && sql.includes('loans l') && sql.includes('WHERE l.id = $1') && !sql.includes('user_id')) {
    const loanId = params[0];
    const loan = store.loans.find((l) => l.id === loanId);
    if (!loan) return { rows: [] };
    const totalRepaid = store.loan_repayments
      .filter((lr) => lr.loan_id === loanId)
      .reduce((sum, lr) => sum + lr.amount, 0);
    return { rows: [{ ...loan, total_repaid: totalRepaid }] };
  }

  // ── SELECT loan by id and user_id (for repayment creation) ──
  if (sql.includes('SELECT * FROM') && sql.includes('loans') && sql.includes('WHERE id = $1 AND user_id = $2')) {
    const loan = store.loans.find((l) => l.id === params[0] && l.user_id === params[1]);
    return { rows: loan ? [loan] : [] };
  }

  // ── SELECT total repaid for loan ──
  if (sql.includes('SELECT COALESCE(SUM(lr.amount)') && sql.includes('loan_repayments lr') && sql.includes('WHERE lr.loan_id = $1')) {
    const loanId = params[0];
    const totalRepaid = store.loan_repayments
      .filter((lr) => lr.loan_id === loanId)
      .reduce((sum, lr) => sum + lr.amount, 0);
    return { rows: [{ total_repaid: totalRepaid }] };
  }

  // ── UPDATE loan status to PAID ──
  if (sql.includes('UPDATE') && sql.includes('loans') && sql.includes("status = 'PAID'")) {
    const loanId = params[params.length - 1] ?? params[0];
    const loan = store.loans.find((l) => l.id === loanId);
    if (loan) loan.status = 'PAID';
    return { rows: [] };
  }

  // ── UPDATE loan status to ACTIVE ──
  if (sql.includes('UPDATE') && sql.includes('loans') && sql.includes("status = 'ACTIVE'")) {
    const loanId = params[params.length - 1] ?? params[0];
    const loan = store.loans.find((l) => l.id === loanId);
    if (loan) loan.status = 'ACTIVE';
    return { rows: [] };
  }

  // ── Fallback ──
  return { rows: [] };
}

function getClient() {
  return {
    query: async (sql: string, params: any[] = []) => {
      // Handle BEGIN/COMMIT/ROLLBACK
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] };
      return queryHandler(sql, params);
    },
    release: () => {},
  };
}

// ── Mock modules ────────────────────────────────────────────────────────────

vi.mock('../database/connection', () => ({
  db: {
    query: async (sql: string, params: any[] = []) => queryHandler(sql, params),
    getClient: async () => getClient(),
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

function buildTestApp(transactionsRouter: any) {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  app.use('/api/transactions', transactionsRouter);
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

describe('Transaction CRUD — end-to-end', () => {
  let server: http.Server;

  beforeAll(async () => {
    const transactionsRouter = (await import('../routes/transactions')).default;
    const app = buildTestApp(transactionsRouter);
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

  describe('POST /api/transactions', () => {
    it('creates an INCOME transaction', async () => {
      const res = await makeRequest(server, 'POST', '/api/transactions', {
        transaction_type: 'INCOME',
        transaction_date: '2026-08-15',
        amount: 50000,
        account_id: 'acc_bank1',
        category_id: 'cat_salary',
        description: 'August salary',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.transaction_type).toBe('INCOME');
      expect(res.body.data.amount).toBe(50000);
      expect(res.body.data.account_id).toBe('acc_bank1');
      expect(res.body.data.description).toBe('August salary');
    });

    it('creates an EXPENSE transaction', async () => {
      const res = await makeRequest(server, 'POST', '/api/transactions', {
        transaction_type: 'EXPENSE',
        transaction_date: '2026-08-16',
        amount: 500,
        account_id: 'acc_cash1',
        category_id: 'cat_food',
        description: 'Lunch',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.transaction_type).toBe('EXPENSE');
      expect(res.body.data.amount).toBe(500);
    });

    it('creates a TRANSFER transaction', async () => {
      const res = await makeRequest(server, 'POST', '/api/transactions', {
        transaction_type: 'TRANSFER',
        transaction_date: '2026-08-17',
        amount: 10000,
        account_id: 'acc_bank1',
        to_account_id: 'acc_cash1',
        description: 'Transfer to cash',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.transaction_type).toBe('TRANSFER');
    });

    it('creates a LEND transaction', async () => {
      const res = await makeRequest(server, 'POST', '/api/transactions', {
        transaction_type: 'LEND',
        transaction_date: '2026-08-18',
        amount: 5000,
        account_id: 'acc_cash1',
        person_id: 'per_rahim',
        description: 'Lent to Rahim',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.transaction_type).toBe('LEND');
      expect(res.body.data.person_id).toBe('per_rahim');
    });

    it('creates a BORROW transaction', async () => {
      const res = await makeRequest(server, 'POST', '/api/transactions', {
        transaction_type: 'BORROW',
        transaction_date: '2026-08-19',
        amount: 20000,
        account_id: 'acc_bank1',
        person_id: 'per_rahim',
        description: 'Borrowed from Rahim',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.transaction_type).toBe('BORROW');
    });

    it('returns 400 when account is required but missing', async () => {
      const res = await makeRequest(server, 'POST', '/api/transactions', {
        transaction_type: 'INCOME',
        transaction_date: '2026-08-15',
        amount: 50000,
        // no account_id
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toContain('Account is required');
    });

    it('returns 400 when person is required for LEND but missing', async () => {
      const res = await makeRequest(server, 'POST', '/api/transactions', {
        transaction_type: 'LEND',
        transaction_date: '2026-08-15',
        amount: 5000,
        account_id: 'acc_cash1',
        // no person_id
      });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Person is required');
    });

    it('returns 400 when to_account_id missing for TRANSFER', async () => {
      const res = await makeRequest(server, 'POST', '/api/transactions', {
        transaction_type: 'TRANSFER',
        transaction_date: '2026-08-15',
        amount: 5000,
        account_id: 'acc_bank1',
        // no to_account_id
      });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Destination account');
    });

    it('returns 400 when source and destination are the same account', async () => {
      const res = await makeRequest(server, 'POST', '/api/transactions', {
        transaction_type: 'TRANSFER',
        transaction_date: '2026-08-15',
        amount: 5000,
        account_id: 'acc_bank1',
        to_account_id: 'acc_bank1',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('cannot be the same');
    });

    it('returns 400 for invalid account_id', async () => {
      const res = await makeRequest(server, 'POST', '/api/transactions', {
        transaction_type: 'INCOME',
        transaction_date: '2026-08-15',
        amount: 50000,
        account_id: 'acc_nonexistent',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_ACCOUNT');
    });

    it('returns 400 for invalid person_id', async () => {
      const res = await makeRequest(server, 'POST', '/api/transactions', {
        transaction_type: 'LEND',
        transaction_date: '2026-08-15',
        amount: 5000,
        account_id: 'acc_cash1',
        person_id: 'per_nonexistent',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_PERSON');
    });

    it('returns 400 for negative amount', async () => {
      const res = await makeRequest(server, 'POST', '/api/transactions', {
        transaction_type: 'EXPENSE',
        transaction_date: '2026-08-15',
        amount: -100,
        account_id: 'acc_cash1',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for missing date', async () => {
      const res = await makeRequest(server, 'POST', '/api/transactions', {
        transaction_type: 'EXPENSE',
        amount: 100,
        account_id: 'acc_cash1',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 401 without auth token', async () => {
      const res = await makeRequest(server, 'POST', '/api/transactions', {
        transaction_type: 'EXPENSE',
        transaction_date: '2026-08-15',
        amount: 100,
        account_id: 'acc_cash1',
      }, 'token=invalid');

      // The requireAuth middleware should reject this
      expect(res.status).toBe(401);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // LIST
  // ══════════════════════════════════════════════════════════════════════════

  describe('GET /api/transactions', () => {
    it('returns empty list initially', async () => {
      const res = await makeRequest(server, 'GET', '/api/transactions');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
      expect(res.body.pagination.total).toBe(0);
    });

    it('returns created transactions', async () => {
      // Create some transactions
      await makeRequest(server, 'POST', '/api/transactions', {
        transaction_type: 'INCOME',
        transaction_date: '2026-08-15',
        amount: 50000,
        account_id: 'acc_bank1',
      });
      await makeRequest(server, 'POST', '/api/transactions', {
        transaction_type: 'EXPENSE',
        transaction_date: '2026-08-16',
        amount: 500,
        account_id: 'acc_cash1',
      });

      const res = await makeRequest(server, 'GET', '/api/transactions');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.pagination.total).toBe(2);
    });

    it('applies default pagination', async () => {
      const res = await makeRequest(server, 'GET', '/api/transactions');

      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(30);
    });

    it('enriches transactions with account and person names', async () => {
      await makeRequest(server, 'POST', '/api/transactions', {
        transaction_type: 'LEND',
        transaction_date: '2026-08-15',
        amount: 5000,
        account_id: 'acc_cash1',
        person_id: 'per_rahim',
      });

      const res = await makeRequest(server, 'GET', '/api/transactions');

      expect(res.body.data[0].account_name).toBe('Cash Wallet');
      expect(res.body.data[0].person_name).toBe('Rahim');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // GET SINGLE
  // ══════════════════════════════════════════════════════════════════════════

  describe('GET /api/transactions/:id', () => {
    it('returns a single transaction by ID', async () => {
      const createRes = await makeRequest(server, 'POST', '/api/transactions', {
        transaction_type: 'INCOME',
        transaction_date: '2026-08-15',
        amount: 50000,
        account_id: 'acc_bank1',
        description: 'Salary',
      });
      const txId = createRes.body.data.id;

      const res = await makeRequest(server, 'GET', `/api/transactions/${txId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(txId);
      expect(res.body.data.description).toBe('Salary');
    });

    it('returns 404 for non-existent transaction', async () => {
      const res = await makeRequest(server, 'GET', '/api/transactions/txn_nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // UPDATE
  // ══════════════════════════════════════════════════════════════════════════

  describe('PATCH /api/transactions/:id', () => {
    it('updates transaction description', async () => {
      const createRes = await makeRequest(server, 'POST', '/api/transactions', {
        transaction_type: 'EXPENSE',
        transaction_date: '2026-08-15',
        amount: 500,
        account_id: 'acc_cash1',
        description: 'Old desc',
      });
      const txId = createRes.body.data.id;

      const res = await makeRequest(server, 'PATCH', `/api/transactions/${txId}`, {
        description: 'Updated desc',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.description).toBe('Updated desc');
    });

    it('updates transaction amount', async () => {
      const createRes = await makeRequest(server, 'POST', '/api/transactions', {
        transaction_type: 'EXPENSE',
        transaction_date: '2026-08-15',
        amount: 500,
        account_id: 'acc_cash1',
      });
      const txId = createRes.body.data.id;

      const res = await makeRequest(server, 'PATCH', `/api/transactions/${txId}`, {
        amount: 750,
      });

      expect(res.status).toBe(200);
      expect(res.body.data.amount).toBe(750);
    });

    it('returns 404 for non-existent transaction', async () => {
      const res = await makeRequest(server, 'PATCH', '/api/transactions/txn_nonexistent', {
        description: 'test',
      });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 400 for empty update body', async () => {
      const createRes = await makeRequest(server, 'POST', '/api/transactions', {
        transaction_type: 'EXPENSE',
        transaction_date: '2026-08-15',
        amount: 500,
        account_id: 'acc_cash1',
      });
      const txId = createRes.body.data.id;

      const res = await makeRequest(server, 'PATCH', `/api/transactions/${txId}`, {});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('NO_UPDATES');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // DELETE
  // ══════════════════════════════════════════════════════════════════════════

  describe('DELETE /api/transactions/:id', () => {
    it('soft-deletes a transaction', async () => {
      const createRes = await makeRequest(server, 'POST', '/api/transactions', {
        transaction_type: 'EXPENSE',
        transaction_date: '2026-08-15',
        amount: 500,
        account_id: 'acc_cash1',
      });
      const txId = createRes.body.data.id;

      const res = await makeRequest(server, 'DELETE', `/api/transactions/${txId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(txId);

      // Verify it's gone from GET
      const getRes = await makeRequest(server, 'GET', `/api/transactions/${txId}`);
      expect(getRes.status).toBe(404);
    });

    it('returns 404 for non-existent transaction', async () => {
      const res = await makeRequest(server, 'DELETE', '/api/transactions/txn_nonexistent');

      expect(res.status).toBe(404);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // FULL LIFECYCLE
  // ══════════════════════════════════════════════════════════════════════════

  describe('Full transaction lifecycle', () => {
    it('create → list → get → update → delete', async () => {
      // Create
      const createRes = await makeRequest(server, 'POST', '/api/transactions', {
        transaction_type: 'INCOME',
        transaction_date: '2026-08-15',
        amount: 50000,
        account_id: 'acc_bank1',
        description: 'Salary',
      });
      expect(createRes.status).toBe(201);
      const txId = createRes.body.data.id;

      // List — should have 1 transaction
      const listRes = await makeRequest(server, 'GET', '/api/transactions');
      expect(listRes.body.data.length).toBe(1);

      // Get
      const getRes = await makeRequest(server, 'GET', `/api/transactions/${txId}`);
      expect(getRes.body.data.description).toBe('Salary');

      // Update
      const updateRes = await makeRequest(server, 'PATCH', `/api/transactions/${txId}`, {
        description: 'August Salary',
        amount: 55000,
      });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.description).toBe('August Salary');
      expect(updateRes.body.data.amount).toBe(55000);

      // Delete
      const deleteRes = await makeRequest(server, 'DELETE', `/api/transactions/${txId}`);
      expect(deleteRes.status).toBe(200);

      // List — should be empty
      const listAfterDelete = await makeRequest(server, 'GET', '/api/transactions');
      expect(listAfterDelete.body.data.length).toBe(0);
    });
  });
});
