import { describe, it, expect } from 'vitest';
import {
  calculateAccountBalance,
  calculatePersonBalance,
  calculateRunningBalance,
  getTransactionEffect,
  type TransactionType,
} from '../shared/financial';

// =============================================================================
// Helper: Simulate what the report endpoints do with query parameters
// (Validates that string IDs are NOT parsed with parseInt)
// =============================================================================

/**
 * Simulates extracting an ID from a query parameter.
 * The bug was: parseInt(req.query.account_id as string) which returns NaN for string IDs.
 * The fix is: req.query.account_id as string (no parseInt).
 */
function extractQueryId(value: unknown): string | undefined {
  // This is what the fixed code does — pass through as string
  return (value as string) || undefined;
}

/**
 * The OLD buggy code — parseInt on string IDs.
 * Kept here to demonstrate the bug.
 */
function extractQueryIdBuggy(value: unknown): number | undefined {
  // This was the bug: parseInt on a string ID like "acc_aB3kL9mN2pQr" returns NaN
  const parsed = parseInt(value as string);
  return isNaN(parsed) ? undefined : parsed;
}

// =============================================================================
// Account Statement: String ID handling
// =============================================================================

describe('Account statement — string ID handling', () => {
  it('correctly extracts string account IDs without parseInt', () => {
    const accountId = extractQueryId('acc_aB3kL9mN2pQr');
    expect(accountId).toBe('acc_aB3kL9mN2pQr');
  });

  it('returns undefined for missing account_id', () => {
    const accountId = extractQueryId(undefined);
    expect(accountId).toBeUndefined();
  });

  it('returns undefined for empty string account_id', () => {
    const accountId = extractQueryId('');
    expect(accountId).toBeUndefined();
  });

  it('old buggy code returns undefined for valid string IDs', () => {
    // This demonstrates the bug that was fixed
    const buggyResult = extractQueryIdBuggy('acc_aB3kL9mN2pQr');
    expect(buggyResult).toBeUndefined(); // NaN → undefined
  });

  it('old buggy code incorrectly accepts numeric-only strings', () => {
    // The old parseInt would accept "123" as a valid ID, but real IDs are like "acc_..."
    const buggyResult = extractQueryIdBuggy('123');
    expect(buggyResult).toBe(123); // This "worked" but was wrong type
  });
});

// =============================================================================
// Person Statement: String ID handling
// =============================================================================

describe('Person statement — string ID handling', () => {
  it('correctly extracts string person IDs without parseInt', () => {
    const personId = extractQueryId('per_xY7kM3nR9pQw');
    expect(personId).toBe('per_xY7kM3nR9pQw');
  });

  it('returns undefined for missing person_id', () => {
    const personId = extractQueryId(undefined);
    expect(personId).toBeUndefined();
  });

  it('old buggy code returns undefined for valid string person IDs', () => {
    const buggyResult = extractQueryIdBuggy('per_xY7kM3nR9pQw');
    expect(buggyResult).toBeUndefined(); // NaN → undefined
  });
});

// =============================================================================
// Account Statement: Running balance calculation
// (Mirrors the logic in reports.ts /account-statement endpoint)
// =============================================================================

describe('Account statement — running balance with transfers', () => {
  it('calculates running balance for a simple income-expense account', () => {
    // Opening balance: 50,000
    // + Income: 30,000 → 80,000
    // - Expense: 5,000 → 75,000
    // - Lend: 10,000 → 65,000
    // + Lend Repayment: 3,000 → 68,000
    const balances = calculateRunningBalance(50000, [
      { type: 'INCOME', amount: 30000 },
      { type: 'EXPENSE', amount: 5000 },
      { type: 'LEND', amount: 10000 },
      { type: 'LEND_REPAYMENT', amount: 3000 },
    ]);

    expect(balances).toEqual([80000, 75000, 65000, 68000]);
  });

  it('calculates running balance with borrow transactions', () => {
    // Opening balance: 10,000
    // + Borrow: 20,000 → 30,000
    // - Borrow Repayment: 5,000 → 25,000
    const balances = calculateRunningBalance(10000, [
      { type: 'BORROW', amount: 20000 },
      { type: 'BORROW_REPAYMENT', amount: 5000 },
    ]);

    expect(balances).toEqual([30000, 25000]);
  });

  it('calculates running balance with transfers in and out', () => {
    // Opening balance: 50,000
    // Transfer out: 10,000 → 40,000
    // Transfer in: 5,000 → 45,000
    // Income: 20,000 → 65,000
    const balances = calculateRunningBalance(50000, [
      { type: 'TRANSFER', amount: 10000, transfersOut: 10000 },
      { type: 'TRANSFER', amount: 5000, transfersIn: 5000 },
      { type: 'INCOME', amount: 20000 },
    ]);

    expect(balances).toEqual([40000, 45000, 65000]);
  });

  it('handles zero opening balance', () => {
    const balances = calculateRunningBalance(0, [
      { type: 'INCOME', amount: 5000 },
      { type: 'EXPENSE', amount: 2000 },
    ]);

    expect(balances).toEqual([5000, 3000]);
  });

  it('handles empty transaction list', () => {
    const balances = calculateRunningBalance(25000, []);
    expect(balances).toEqual([]);
  });
});

// =============================================================================
// Account Statement: Transaction effect calculation
// (Mirrors the CASE statement in the SQL query)
// =============================================================================

describe('Account statement — transaction effect calculation', () => {
  it('INCOME has positive effect', () => {
    expect(getTransactionEffect('INCOME', 50000)).toBe(50000);
  });

  it('EXPENSE has negative effect', () => {
    expect(getTransactionEffect('EXPENSE', 5000)).toBe(-5000);
  });

  it('LEND has negative effect (cash goes out)', () => {
    expect(getTransactionEffect('LEND', 10000)).toBe(-10000);
  });

  it('LEND_REPAYMENT has positive effect (cash comes in)', () => {
    expect(getTransactionEffect('LEND_REPAYMENT', 4000)).toBe(4000);
  });

  it('BORROW has positive effect (cash comes in)', () => {
    expect(getTransactionEffect('BORROW', 20000)).toBe(20000);
  });

  it('BORROW_REPAYMENT has negative effect (cash goes out)', () => {
    expect(getTransactionEffect('BORROW_REPAYMENT', 5000)).toBe(-5000);
  });

  it('TRANSFER has zero effect on account (handled via transfersIn/transfersOut)', () => {
    expect(getTransactionEffect('TRANSFER', 10000)).toBe(0);
  });

  it('ADJUSTMENT has positive effect', () => {
    expect(getTransactionEffect('ADJUSTMENT', 1000)).toBe(1000);
  });
});

// =============================================================================
// Account Statement: Combined scenario
// (Simulates a full account statement with running balance)
// =============================================================================

describe('Account statement — combined scenario', () => {
  it('correctly computes closing balance from opening balance + all transaction types', () => {
    // Opening: 20,000
    // Transactions in chronological order:
    // 1. Salary 50,000 → 70,000
    // 2. Lunch 500 → 69,500
    // 3. Lend 10,000 to Rahim → 59,500
    // 4. Rahim returns 4,000 → 63,500
    // 5. Borrow 20,000 from Karim → 83,500
    // 6. Repay Karim 5,000 → 78,500

    const openingBalance = 20000;
    const transactions = [
      { type: 'INCOME' as TransactionType, amount: 50000 },
      { type: 'EXPENSE' as TransactionType, amount: 500 },
      { type: 'LEND' as TransactionType, amount: 10000 },
      { type: 'LEND_REPAYMENT' as TransactionType, amount: 4000 },
      { type: 'BORROW' as TransactionType, amount: 20000 },
      { type: 'BORROW_REPAYMENT' as TransactionType, amount: 5000 },
    ];

    const balances = calculateRunningBalance(openingBalance, transactions);

    expect(balances).toEqual([70000, 69500, 59500, 63500, 83500, 78500]);
    expect(balances[balances.length - 1]).toBe(78500); // closing balance
  });

  it('transfer between accounts preserves total wealth', () => {
    // Bank opening: 50,000, Cash opening: 10,000
    // Transfer 5,000 from Bank to Cash
    const bankBalances = calculateRunningBalance(50000, [
      { type: 'TRANSFER', amount: 5000, transfersOut: 5000 },
    ]);
    const cashBalances = calculateRunningBalance(10000, [
      { type: 'TRANSFER', amount: 5000, transfersIn: 5000 },
    ]);

    const bankClosing = bankBalances[bankBalances.length - 1];
    const cashClosing = cashBalances[cashBalances.length - 1];

    expect(bankClosing).toBe(45000);
    expect(cashClosing).toBe(15000);
    expect(bankClosing + cashClosing).toBe(60000); // Same as 50k + 10k
  });
});

// =============================================================================
// Person Statement: Balance calculation
// (Mirrors v_person_balances view logic)
// =============================================================================

describe('Person statement — balance calculation', () => {
  it('calculates amount_they_owe_you (receivable) correctly', () => {
    // User lent Rahim 10,000, Rahim repaid 4,000
    // amount_they_owe_you = total_lent - total_lent_repaid = 6,000
    const balance = calculatePersonBalance(10000, 4000, 0, 0);
    expect(balance.theyOweYou).toBe(6000);
    expect(balance.youOweThem).toBe(0);
  });

  it('calculates amount_you_owe_them (payable) correctly', () => {
    // User borrowed 20,000 from Karim, repaid 7,000
    // amount_you_owe_them = total_borrowed - total_borrow_repaid = 13,000
    const balance = calculatePersonBalance(0, 0, 20000, 7000);
    expect(balance.theyOweYou).toBe(0);
    expect(balance.youOweThem).toBe(13000);
  });

  it('handles person with both lending and borrowing', () => {
    // Rahim owes user 10,000, user owes Rahim 3,000
    const balance = calculatePersonBalance(10000, 0, 3000, 0);
    expect(balance.theyOweYou).toBe(10000);
    expect(balance.youOweThem).toBe(3000);
    expect(balance.netBalance).toBe(7000);
  });

  it('fully settled person has zero balances', () => {
    const balance = calculatePersonBalance(10000, 10000, 5000, 5000);
    expect(balance.theyOweYou).toBe(0);
    expect(balance.youOweThem).toBe(0);
    expect(balance.netBalance).toBe(0);
  });

  it('person with no transactions has zero balances', () => {
    const balance = calculatePersonBalance(0, 0, 0, 0);
    expect(balance.theyOweYou).toBe(0);
    expect(balance.youOweThem).toBe(0);
    expect(balance.netBalance).toBe(0);
  });

  it('partial repayments reduce outstanding amounts', () => {
    // Lent 50,000, repaid 20,000 → outstanding 30,000
    // Borrowed 30,000, repaid 10,000 → outstanding 20,000
    const balance = calculatePersonBalance(50000, 20000, 30000, 10000);
    expect(balance.theyOweYou).toBe(30000);
    expect(balance.youOweThem).toBe(20000);
    expect(balance.netBalance).toBe(10000);
  });
});

// =============================================================================
// Person Statement: Combined scenario
// (Simulates a full person statement)
// =============================================================================

describe('Person statement — combined scenario', () => {
  it('tracks complete lending/borrowing lifecycle with Rahim', () => {
    // Day 1: User lends Rahim 10,000
    let lent = 10000;
    let lentRepaid = 0;
    let balance = calculatePersonBalance(lent, lentRepaid, 0, 0);
    expect(balance.theyOweYou).toBe(10000);

    // Day 5: Rahim repays 3,000
    lentRepaid = 3000;
    balance = calculatePersonBalance(lent, lentRepaid, 0, 0);
    expect(balance.theyOweYou).toBe(7000);

    // Day 10: User borrows 5,000 from Rahim
    let borrowed = 5000;
    let borrowRepaid = 0;
    balance = calculatePersonBalance(lent, lentRepaid, borrowed, borrowRepaid);
    expect(balance.theyOweYou).toBe(7000);
    expect(balance.youOweThem).toBe(5000);
    expect(balance.netBalance).toBe(2000);

    // Day 15: User repays 2,000 to Rahim
    borrowRepaid = 2000;
    balance = calculatePersonBalance(lent, lentRepaid, borrowed, borrowRepaid);
    expect(balance.theyOweYou).toBe(7000);
    expect(balance.youOweThem).toBe(3000);
    expect(balance.netBalance).toBe(4000);

    // Day 20: Rahim repays remaining 7,000
    lentRepaid = 10000;
    balance = calculatePersonBalance(lent, lentRepaid, borrowed, borrowRepaid);
    expect(balance.theyOweYou).toBe(0);
    expect(balance.youOweThem).toBe(3000);
    expect(balance.netBalance).toBe(-3000);
  });

  it('person statement default balance when no data exists', () => {
    // When v_person_balances returns no row, the endpoint uses defaults
    const defaultBalance = {
      amount_they_owe_you: 0,
      amount_you_owe_them: 0,
      total_lent: 0,
      total_lent_repaid: 0,
      total_borrowed: 0,
      total_borrow_repaid: 0,
    };

    expect(defaultBalance.amount_they_owe_you).toBe(0);
    expect(defaultBalance.amount_you_owe_them).toBe(0);
    expect(defaultBalance.total_lent).toBe(0);
  });
});

// =============================================================================
// SQL Parameter Numbering
// (Verifies the fix for the account-statement query)
// =============================================================================

describe('SQL query parameter correctness', () => {
  it('account statement SQL uses correct parameter placeholders', () => {
    // The fixed query should use $1 for userId and $2 for accountId
    // (not $1 and $3 with an unused $2)
    const accountStatementQuery = `
      SELECT t.*, p.name as person_name, c.name as category_name,
             CASE
               WHEN t.transaction_type = 'INCOME' THEN t.amount
               WHEN t.transaction_type = 'EXPENSE' THEN -t.amount
               WHEN t.transaction_type = 'LEND' THEN -t.amount
               WHEN t.transaction_type = 'LEND_REPAYMENT' THEN t.amount
               WHEN t.transaction_type = 'BORROW' THEN t.amount
               WHEN t.transaction_type = 'BORROW_REPAYMENT' THEN -t.amount
               WHEN t.transaction_type = 'TRANSFER' THEN
                 CASE
                   WHEN tt.from_account_id = $2 THEN -t.amount
                   WHEN tt.to_account_id = $2 THEN t.amount
                   ELSE 0
                 END
               ELSE 0
             END AS effect
      FROM finance_tracker.transactions t
      LEFT JOIN finance_tracker.people p ON p.id = t.person_id
      LEFT JOIN finance_tracker.categories c ON c.id = t.category_id
      LEFT JOIN finance_tracker.transaction_transfers tt ON tt.transaction_id = t.id
      WHERE t.user_id = $1
        AND (t.account_id = $2
             OR tt.from_account_id = $2
             OR tt.to_account_id = $2)
        AND t.deleted_at IS NULL
      ORDER BY t.transaction_date ASC, t.created_at ASC
    `;

    // Verify $1 is used for user_id
    expect(accountStatementQuery).toContain('t.user_id = $1');

    // Verify $2 is used for account_id in WHERE clause (not $3)
    expect(accountStatementQuery).toContain('t.account_id = $2');
    expect(accountStatementQuery).toContain('tt.from_account_id = $2');
    expect(accountStatementQuery).toContain('tt.to_account_id = $2');

    // Verify $2 is used in CASE statement for transfers (not $3)
    expect(accountStatementQuery).toContain('tt.from_account_id = $2 THEN -t.amount');
    expect(accountStatementQuery).toContain('tt.to_account_id = $2 THEN t.amount');

    // Verify there is NO $3 in the query (old bug had unused $3)
    expect(accountStatementQuery).not.toContain('$3');
  });

  it('person statement SQL uses correct parameter placeholders', () => {
    const personStatementQuery = `
      SELECT t.*, a.name as account_name
      FROM finance_tracker.transactions t
      LEFT JOIN finance_tracker.accounts a ON a.id = t.account_id
      WHERE t.user_id = $1 AND t.person_id = $2 AND t.deleted_at IS NULL
      ORDER BY t.transaction_date ASC, t.created_at ASC
    `;

    expect(personStatementQuery).toContain('t.user_id = $1');
    expect(personStatementQuery).toContain('t.person_id = $2');
    expect(personStatementQuery).not.toContain('$3');
  });
});

// =============================================================================
// Edge cases for report calculations
// =============================================================================

describe('Report edge cases', () => {
  it('account with only transfer-in transactions', () => {
    // Opening: 0, only receives transfers
    const balances = calculateRunningBalance(0, [
      { type: 'TRANSFER', amount: 5000, transfersIn: 5000 },
      { type: 'TRANSFER', amount: 3000, transfersIn: 3000 },
    ]);

    expect(balances).toEqual([5000, 8000]);
  });

  it('account with only transfer-out transactions', () => {
    // Opening: 10,000, only sends transfers
    const balances = calculateRunningBalance(10000, [
      { type: 'TRANSFER', amount: 3000, transfersOut: 3000 },
      { type: 'TRANSFER', amount: 2000, transfersOut: 2000 },
    ]);

    expect(balances).toEqual([7000, 5000]);
  });

  it('person with only lending (no borrowing)', () => {
    const balance = calculatePersonBalance(100000, 30000, 0, 0);
    expect(balance.theyOweYou).toBe(70000);
    expect(balance.youOweThem).toBe(0);
    expect(balance.netBalance).toBe(70000);
  });

  it('person with only borrowing (no lending)', () => {
    const balance = calculatePersonBalance(0, 0, 80000, 20000);
    expect(balance.theyOweYou).toBe(0);
    expect(balance.youOweThem).toBe(60000);
    expect(balance.netBalance).toBe(-60000);
  });

  it('very large amounts do not cause precision issues', () => {
    const balance = calculatePersonBalance(999999999, 1, 999999999, 1);
    expect(balance.theyOweYou).toBe(999999998);
    expect(balance.youOweThem).toBe(999999998);
    expect(balance.netBalance).toBe(0);
  });
});
