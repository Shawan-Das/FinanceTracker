/**
 * Integration tests for Trash and Restore functionality.
 * Validates viewing deleted transactions, categories, accounts, and people,
 * individual restoration, bulk restoration, and trash counts.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import http from 'http';

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

  store.users.push({
    id: 'usr_test',
    full_name: 'Test User',
    email: 'test@example.com',
    password_hash: 'hashed',
    is_verified: true,
    is_locked: false,
    default_currency: 'BDT',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  store.accounts.push({
    id: 'acc_1',
    user_id: 'usr_test',
    name: 'Main Bank',
    account_type: 'BANK',
    currency: 'BDT',
    opening_balance: 1000,
    opening_balance_date: '2026-01-01',
    is_active: true,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  store.categories.push({
    id: 'cat_1',
    user_id: 'usr_test',
    name: 'Food',
    type: 'EXPENSE',
    icon: null,
    color: '#ff0000',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  store.people.push({
    id: 'ppl_1',
    user_id: 'usr_test',
    name: 'John Doe',
    phone: '01700000000',
    email: null,
    notes: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

// ── Mock the database ─────────────────────────────────────────────────────────

vi.mock('../database/connection', () => {
  const mockQuery = vi.fn(async (sql: string, params: any[] = []) => {
    // TRASH COUNTS
    if (sql.includes('SELECT COUNT(*)::int as count FROM finance_tracker.transactions WHERE user_id = $1 AND deleted_at IS NOT NULL')) {
      const count = store.transactions.filter((t) => t.user_id === params[0] && t.deleted_at !== null).length;
      return { rows: [{ count }] };
    }
    if (sql.includes('SELECT COUNT(*)::int as count FROM finance_tracker.categories WHERE user_id = $1 AND is_active = FALSE')) {
      const count = store.categories.filter((c) => c.user_id === params[0] && !c.is_active).length;
      return { rows: [{ count }] };
    }
    if (sql.includes('SELECT COUNT(*)::int as count FROM finance_tracker.accounts WHERE user_id = $1 AND is_active = FALSE')) {
      const count = store.accounts.filter((a) => a.user_id === params[0] && !a.is_active).length;
      return { rows: [{ count }] };
    }
    if (sql.includes('SELECT COUNT(*)::int as count FROM finance_tracker.people WHERE user_id = $1 AND is_active = FALSE')) {
      const count = store.people.filter((p) => p.user_id === params[0] && !p.is_active).length;
      return { rows: [{ count }] };
    }

    // LIST DELETED TRANSACTIONS
    if (sql.includes('FROM finance_tracker.transactions t') && sql.includes('t.deleted_at IS NOT NULL')) {
      const rows = store.transactions
        .filter((t) => t.user_id === params[0] && t.deleted_at !== null)
        .map((t) => ({
          ...t,
          account_name: store.accounts.find((a) => a.id === t.account_id)?.name || null,
          person_name: store.people.find((p) => p.id === t.person_id)?.name || null,
          category_name: store.categories.find((c) => c.id === t.category_id)?.name || null,
        }));
      return { rows };
    }

    // LIST DELETED CATEGORIES
    if (sql.includes('FROM finance_tracker.categories c') && sql.includes('c.is_active = FALSE')) {
      const rows = store.categories
        .filter((c) => c.user_id === params[0] && !c.is_active)
        .map((c) => ({ ...c, usage_count: 0 }));
      return { rows };
    }

    // LIST DELETED ACCOUNTS
    if (sql.includes('FROM finance_tracker.v_account_balances') && sql.includes('is_active = FALSE')) {
      const rows = store.accounts
        .filter((a) => a.user_id === params[0] && !a.is_active)
        .map((a) => ({ ...a, account_id: a.id, account_name: a.name, current_balance: a.opening_balance }));
      return { rows };
    }

    // LIST DELETED PEOPLE
    if (sql.includes('FROM finance_tracker.people p') && sql.includes('p.is_active = FALSE')) {
      const rows = store.people
        .filter((p) => p.user_id === params[0] && !p.is_active)
        .map((p) => ({ ...p, amount_they_owe_you: 0, amount_you_owe_them: 0 }));
      return { rows };
    }

    // RESTORE TRANSACTION
    if (sql.includes('SELECT * FROM finance_tracker.transactions') && sql.includes('deleted_at IS NOT NULL')) {
      const tx = store.transactions.find((t) => t.id === params[0] && t.user_id === params[1] && t.deleted_at !== null);
      return { rows: tx ? [tx] : [] };
    }
    if (sql.includes('UPDATE finance_tracker.transactions') && sql.includes('SET deleted_at = NULL')) {
      if (sql.includes('WHERE user_id = $1 AND deleted_at IS NOT NULL')) {
        // Bulk
        let count = 0;
        for (const t of store.transactions) {
          if (t.user_id === params[0] && t.deleted_at !== null) {
            t.deleted_at = null;
            count++;
          }
        }
        return { rowCount: count };
      }
      const tx = store.transactions.find((t) => t.id === params[0]);
      if (tx) tx.deleted_at = null;
      return { rows: tx ? [tx] : [], rowCount: 1 };
    }

    // RESTORE CATEGORY
    if (sql.includes('SELECT * FROM finance_tracker.categories WHERE id = $1 AND user_id = $2 AND is_active = FALSE')) {
      const cat = store.categories.find((c) => c.id === params[0] && c.user_id === params[1] && !c.is_active);
      return { rows: cat ? [cat] : [] };
    }
    if (sql.includes('SELECT id FROM finance_tracker.categories') && sql.includes('is_active = TRUE')) {
      const dup = store.categories.find((c) => c.user_id === params[0] && c.name.toLowerCase() === params[1].toLowerCase() && c.type === params[2] && c.is_active);
      return { rows: dup ? [dup] : [] };
    }
    if (sql.includes('UPDATE finance_tracker.categories') && sql.includes('SET is_active = TRUE')) {
      if (sql.includes('WHERE c.user_id = $1')) {
        let count = 0;
        for (const c of store.categories) {
          if (c.user_id === params[0] && !c.is_active) {
            c.is_active = true;
            count++;
          }
        }
        return { rowCount: count };
      }
      const cat = store.categories.find((c) => c.id === params[0] && c.user_id === params[1]);
      if (cat) cat.is_active = true;
      return { rows: cat ? [cat] : [], rowCount: 1 };
    }

    // RESTORE ACCOUNT
    if (sql.includes('SELECT * FROM finance_tracker.accounts WHERE id = $1 AND user_id = $2 AND is_active = FALSE')) {
      const acc = store.accounts.find((a) => a.id === params[0] && a.user_id === params[1] && !a.is_active);
      return { rows: acc ? [acc] : [] };
    }
    if (sql.includes('SELECT id FROM finance_tracker.accounts WHERE user_id = $1 AND LOWER(name) = LOWER($2) AND is_active = TRUE')) {
      const dup = store.accounts.find((a) => a.user_id === params[0] && a.name.toLowerCase() === params[1].toLowerCase() && a.is_active);
      return { rows: dup ? [dup] : [] };
    }
    if (sql.includes('UPDATE finance_tracker.accounts') && sql.includes('SET is_active = TRUE')) {
      if (sql.includes('WHERE a.user_id = $1')) {
        let count = 0;
        for (const a of store.accounts) {
          if (a.user_id === params[0] && !a.is_active) {
            a.is_active = true;
            count++;
          }
        }
        return { rowCount: count };
      }
      const acc = store.accounts.find((a) => a.id === params[1] && a.user_id === params[0]);
      if (acc) acc.is_active = true;
      return { rows: acc ? [acc] : [], rowCount: 1 };
    }

    // RESTORE PERSON
    if (sql.includes('UPDATE finance_tracker.people') && sql.includes('SET is_active = TRUE')) {
      if (sql.includes('WHERE user_id = $1 AND is_active = FALSE')) {
        let count = 0;
        for (const p of store.people) {
          if (p.user_id === params[0] && !p.is_active) {
            p.is_active = true;
            count++;
          }
        }
        return { rowCount: count };
      }
      const ppl = store.people.find((p) => p.id === params[0] && p.user_id === params[1]);
      if (ppl) {
        ppl.is_active = true;
        return { rows: [ppl], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }

    return { rows: [] };
  });

  const mockClient = {
    query: mockQuery,
    release: vi.fn(),
  };

  return {
    db: {
      query: mockQuery,
      getClient: vi.fn(async () => mockClient),
      pool: { end: vi.fn() },
    },
  };
});

// Mock Auth
vi.mock('../middleware/auth', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { id: 'usr_test', email: 'test@example.com' };
    next();
  },
  getUserId: () => 'usr_test',
  generateToken: () => 'mock_token',
  generateRefreshToken: () => 'mock_refresh',
  verifyToken: () => ({ userId: 'usr_test' }),
}));

// Mock Email
vi.mock('../services/email', () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(true),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(true),
  sendTransactionReceipt: vi.fn().mockResolvedValue(true),
  sendLoanReceipt: vi.fn().mockResolvedValue(true),
}));

// Import express routers
import transactionsRouter from '../routes/transactions';
import categoriesRouter from '../routes/categories';
import accountsRouter from '../routes/accounts';
import peopleRouter from '../routes/people';
import trashRouter from '../routes/trash';

let server: http.Server;
let baseUrl = '';

beforeAll(async () => {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());

  app.use('/api/transactions', transactionsRouter);
  app.use('/api/categories', categoriesRouter);
  app.use('/api/accounts', accountsRouter);
  app.use('/api/people', peopleRouter);
  app.use('/api/trash', trashRouter);

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address() as any;
      baseUrl = `http://localhost:${addr.port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(() => {
  resetStore();
});

describe('Trash and Restore functionality', () => {
  it('GET /api/trash/counts returns 0 when no items are deleted', async () => {
    const res = await fetch(`${baseUrl}/api/trash/counts`);
    const json = await res.json() as any;
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual({
      transactions: 0,
      categories: 0,
      accounts: 0,
      people: 0,
      total: 0,
    });
  });

  it('lists deleted transactions and restores an individual transaction', async () => {
    // Add a soft-deleted transaction to store
    store.transactions.push({
      id: 'tx_deleted1',
      user_id: 'usr_test',
      transaction_type: 'EXPENSE',
      transaction_date: '2026-03-01',
      amount: 250,
      account_id: 'acc_1',
      category_id: 'cat_1',
      person_id: null,
      loan_id: null,
      description: 'Lunch',
      reference: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: new Date().toISOString(),
    });

    // Verify it appears in deleted transactions
    const listRes = await fetch(`${baseUrl}/api/transactions/deleted`);
    const listJson = await listRes.json() as any;
    expect(listRes.status).toBe(200);
    expect(listJson.data.length).toBe(1);
    expect(listJson.data[0].id).toBe('tx_deleted1');

    // Restore the transaction
    const restoreRes = await fetch(`${baseUrl}/api/transactions/tx_deleted1/restore`, {
      method: 'POST',
    });
    const restoreJson = await restoreRes.json() as any;
    expect(restoreRes.status).toBe(200);
    expect(restoreJson.success).toBe(true);
    expect(restoreJson.data.id).toBe('tx_deleted1');

    // In-memory store should have deleted_at = null
    const tx = store.transactions.find((t) => t.id === 'tx_deleted1');
    expect(tx?.deleted_at).toBeNull();
  });

  it('lists deleted categories and restores a category', async () => {
    // Add an inactive category to store
    store.categories.push({
      id: 'cat_del1',
      user_id: 'usr_test',
      name: 'Old Category',
      type: 'EXPENSE',
      icon: null,
      color: null,
      is_active: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const listRes = await fetch(`${baseUrl}/api/categories/deleted`);
    const listJson = await listRes.json() as any;
    expect(listRes.status).toBe(200);
    expect(listJson.data.some((c: any) => c.id === 'cat_del1')).toBe(true);

    // Restore it
    const restoreRes = await fetch(`${baseUrl}/api/categories/cat_del1/restore`, {
      method: 'POST',
    });
    const restoreJson = await restoreRes.json() as any;
    expect(restoreRes.status).toBe(200);
    expect(restoreJson.success).toBe(true);

    const cat = store.categories.find((c) => c.id === 'cat_del1');
    expect(cat?.is_active).toBe(true);
  });

  it('lists deleted accounts and restores an account', async () => {
    store.accounts.push({
      id: 'acc_del1',
      user_id: 'usr_test',
      name: 'Old Wallet',
      account_type: 'MOBILE_WALLET',
      currency: 'BDT',
      opening_balance: 50,
      opening_balance_date: '2026-01-01',
      is_active: false,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const listRes = await fetch(`${baseUrl}/api/accounts/deleted`);
    const listJson = await listRes.json() as any;
    expect(listRes.status).toBe(200);
    expect(listJson.data.some((a: any) => a.account_id === 'acc_del1')).toBe(true);

    // Restore it
    const restoreRes = await fetch(`${baseUrl}/api/accounts/acc_del1/restore`, {
      method: 'POST',
    });
    const restoreJson = await restoreRes.json() as any;
    expect(restoreRes.status).toBe(200);
    expect(restoreJson.success).toBe(true);

    const acc = store.accounts.find((a) => a.id === 'acc_del1');
    expect(acc?.is_active).toBe(true);
  });

  it('lists deleted people and restores a person', async () => {
    store.people.push({
      id: 'ppl_del1',
      user_id: 'usr_test',
      name: 'Old Contact',
      phone: null,
      email: null,
      notes: null,
      is_active: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const listRes = await fetch(`${baseUrl}/api/people/deleted`);
    const listJson = await listRes.json() as any;
    expect(listRes.status).toBe(200);
    expect(listJson.data.some((p: any) => p.id === 'ppl_del1')).toBe(true);

    // Restore it
    const restoreRes = await fetch(`${baseUrl}/api/people/ppl_del1/restore`, {
      method: 'POST',
    });
    const restoreJson = await restoreRes.json() as any;
    expect(restoreRes.status).toBe(200);
    expect(restoreJson.success).toBe(true);

    const ppl = store.people.find((p) => p.id === 'ppl_del1');
    expect(ppl?.is_active).toBe(true);
  });

  it('bulk restores deleted items by type via POST /api/trash/restore-all/:type', async () => {
    store.transactions.push(
      {
        id: 'tx_b1',
        user_id: 'usr_test',
        transaction_type: 'EXPENSE',
        amount: 10,
        deleted_at: new Date().toISOString(),
      },
      {
        id: 'tx_b2',
        user_id: 'usr_test',
        transaction_type: 'INCOME',
        amount: 20,
        deleted_at: new Date().toISOString(),
      }
    );

    const res = await fetch(`${baseUrl}/api/trash/restore-all/transactions`, {
      method: 'POST',
    });
    const json = await res.json() as any;
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.restoredCount).toBe(2);

    expect(store.transactions.find((t) => t.id === 'tx_b1')?.deleted_at).toBeNull();
    expect(store.transactions.find((t) => t.id === 'tx_b2')?.deleted_at).toBeNull();
  });
});
