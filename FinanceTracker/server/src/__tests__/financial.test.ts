import { describe, it, expect } from 'vitest';
import {
  calculateAccountBalance,
  getTransactionEffect,
  calculateTransferEffect,
  validateTransfer,
  calculateRunningBalance,
  type TransactionType,
} from '../shared/financial';

// =============================================================================
// Rule 1 — Income increases available money
// =============================================================================
describe('Income increases account balance', () => {
  it('adds income to account balance', () => {
    const balance = calculateAccountBalance(0, [
      { type: 'INCOME', amount: 50000 },
    ]);
    expect(balance).toBe(50000);
  });

  it('adds multiple income transactions', () => {
    const balance = calculateAccountBalance(0, [
      { type: 'INCOME', amount: 50000 },
      { type: 'INCOME', amount: 10000 },
    ]);
    expect(balance).toBe(60000);
  });

  it('adds income to existing balance', () => {
    const balance = calculateAccountBalance(20000, [
      { type: 'INCOME', amount: 50000 },
    ]);
    expect(balance).toBe(70000);
  });
});

// =============================================================================
// Rule 2 — Expense decreases available money
// =============================================================================
describe('Expense decreases account balance', () => {
  it('subtracts expense from account balance', () => {
    const balance = calculateAccountBalance(10000, [
      { type: 'EXPENSE', amount: 500 },
    ]);
    expect(balance).toBe(9500);
  });

  it('subtracts multiple expenses', () => {
    const balance = calculateAccountBalance(10000, [
      { type: 'EXPENSE', amount: 500 },
      { type: 'EXPENSE', amount: 1000 },
    ]);
    expect(balance).toBe(8500);
  });

  it('can result in negative balance', () => {
    const balance = calculateAccountBalance(1000, [
      { type: 'EXPENSE', amount: 5000 },
    ]);
    expect(balance).toBe(-4000);
  });
});

// =============================================================================
// Rule 3 — Transfer between own accounts does NOT change total wealth
// =============================================================================
describe('Transfers preserve total wealth', () => {
  it('transfer does not change total wealth', () => {
    const fromBalance = 50000;
    const toBalance = 10000;
    const transferAmount = 5000;

    const result = calculateTransferEffect(fromBalance, toBalance, transferAmount);

    expect(result.newFromBalance).toBe(45000);
    expect(result.newToBalance).toBe(15000);
    expect(result.totalWealthChange).toBe(0);
  });

  it('transfer correctly updates both account balances', () => {
    const result = calculateTransferEffect(50000, 10000, 5000);
    expect(result.newFromBalance).toBe(45000);
    expect(result.newToBalance).toBe(15000);
  });

  it('total money remains unchanged for any transfer amount', () => {
    const amounts = [1, 100, 5000, 100000];
    for (const amount of amounts) {
      const result = calculateTransferEffect(100000, 50000, amount);
      expect(result.totalWealthChange).toBe(0);
    }
  });

  it('transfer amount cannot equal zero or be negative', () => {
    const result1 = validateTransfer(1, 2, 0);
    expect(result1.valid).toBe(false);

    const result2 = validateTransfer(1, 2, -100);
    expect(result2.valid).toBe(false);
  });

  it('source and destination accounts cannot be the same', () => {
    const result = validateTransfer(1, 1, 5000);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('cannot be the same');
  });

  it('valid transfer passes validation', () => {
    const result = validateTransfer(1, 2, 5000);
    expect(result.valid).toBe(true);
  });
});

// =============================================================================
// Rule 4 — Lending is NOT an expense (creates receivable)
// =============================================================================
describe('Lending creates receivable, not expense', () => {
  it('lending decreases account balance', () => {
    const balance = calculateAccountBalance(10000, [
      { type: 'LEND', amount: 5000 },
    ]);
    expect(balance).toBe(5000);
  });

  it('lending effect is negative on account', () => {
    const effect = getTransactionEffect('LEND', 5000);
    expect(effect).toBe(-5000);
  });

  it('lending does NOT affect total wealth when considering receivable', () => {
    // Starting: Cash = 10,000, Receivable = 0 → Net = 10,000
    // After lending 3,000: Cash = 7,000, Receivable = 3,000 → Net = 10,000
    const cashAfterLending = calculateAccountBalance(10000, [
      { type: 'LEND', amount: 3000 },
    ]);
    const receivable = 3000;
    const netPosition = cashAfterLending + receivable;

    expect(cashAfterLending).toBe(7000);
    expect(netPosition).toBe(10000);
  });
});

// =============================================================================
// Rule 5 — Borrowing is NOT income (creates payable)
// =============================================================================
describe('Borrowing creates payable, not income', () => {
  it('borrowing increases account balance', () => {
    const balance = calculateAccountBalance(10000, [
      { type: 'BORROW', amount: 20000 },
    ]);
    expect(balance).toBe(30000);
  });

  it('borrowing effect is positive on account', () => {
    const effect = getTransactionEffect('BORROW', 20000);
    expect(effect).toBe(20000);
  });

  it('borrowing does NOT increase net position when considering payable', () => {
    // Starting: Cash = 10,000, Payable = 0 → Net = 10,000
    // After borrowing 20,000: Cash = 30,000, Payable = 20,000 → Net = 10,000
    const cashAfterBorrowing = calculateAccountBalance(10000, [
      { type: 'BORROW', amount: 20000 },
    ]);
    const payable = 20000;
    const netPosition = cashAfterBorrowing - payable;

    expect(cashAfterBorrowing).toBe(30000);
    expect(netPosition).toBe(10000);
  });
});

// =============================================================================
// Rule 6 — Borrow Repayment decreases cash and decreases payable
// =============================================================================
describe('Borrow repayment', () => {
  it('borrow repayment decreases account balance', () => {
    const balance = calculateAccountBalance(30000, [
      { type: 'BORROW_REPAYMENT', amount: 5000 },
    ]);
    expect(balance).toBe(25000);
  });

  it('borrow repayment effect is negative on account', () => {
    const effect = getTransactionEffect('BORROW_REPAYMENT', 5000);
    expect(effect).toBe(-5000);
  });
});

// =============================================================================
// Rule 7 — Lend Repayment increases cash and decreases receivable
// =============================================================================
describe('Lend repayment', () => {
  it('lend repayment increases account balance', () => {
    const balance = calculateAccountBalance(5000, [
      { type: 'LEND_REPAYMENT', amount: 2000 },
    ]);
    expect(balance).toBe(7000);
  });

  it('lend repayment effect is positive on account', () => {
    const effect = getTransactionEffect('LEND_REPAYMENT', 2000);
    expect(effect).toBe(2000);
  });
});

// =============================================================================
// End-to-end scenario from requirements (Section 42)
// =============================================================================
describe('End-to-end scenario', () => {
  it('correctly tracks the full scenario from requirements', () => {
    // Starting: Bank = 20,000, Cash = 5,000
    let bankBalance = 20000;
    let cashBalance = 5000;

    // Event 1: Salary 50,000 into Bank
    bankBalance = calculateAccountBalance(bankBalance, [{ type: 'INCOME', amount: 50000 }]);
    expect(bankBalance).toBe(70000);

    // Event 2: Lunch 500 Cash
    cashBalance = calculateAccountBalance(cashBalance, [{ type: 'EXPENSE', amount: 500 }]);
    expect(cashBalance).toBe(4500);

    // Event 3: Lend 10,000 Cash to Rahim
    cashBalance = calculateAccountBalance(cashBalance, [{ type: 'LEND', amount: 10000 }]);
    expect(cashBalance).toBe(-5500);

    // Receivable from Rahim = 10,000
    const receivable = 10000;

    // Available cash/accounts = 70,000 + (-5,500) = 64,500
    const totalCash = bankBalance + cashBalance;
    expect(totalCash).toBe(64500);

    // Net position = 64,500 + 10,000 = 74,500
    expect(totalCash + receivable).toBe(74500);

    // Event 4: Rahim returns 4,000
    cashBalance = calculateAccountBalance(cashBalance, [{ type: 'LEND_REPAYMENT', amount: 4000 }]);
    expect(cashBalance).toBe(-1500);

    // Rahim's outstanding = 10,000 - 4,000 = 6,000
    const updatedReceivable = receivable - 4000;
    expect(updatedReceivable).toBe(6000);

    // Event 5: Borrow 20,000 from Karim
    cashBalance = calculateAccountBalance(cashBalance, [{ type: 'BORROW', amount: 20000 }]);
    expect(cashBalance).toBe(18500);

    // Payable to Karim = 20,000
    const payable = 20000;

    // Final total cash = 70,000 + 18,500 = 88,500
    const finalCash = bankBalance + cashBalance;
    expect(finalCash).toBe(88500);

    // Net position = 88,500 + 6,000 - 20,000 = 74,500
    const finalNet = finalCash + updatedReceivable - payable;
    expect(finalNet).toBe(74500);
  });
});

// =============================================================================
// Running Balance
// =============================================================================
describe('Running balance', () => {
  it('calculates running balance for a series of transactions', () => {
    const balances = calculateRunningBalance(10000, [
      { type: 'INCOME', amount: 50000 },    // 60,000
      { type: 'EXPENSE', amount: 500 },      // 59,500
      { type: 'LEND', amount: 3000 },        // 56,500
      { type: 'LEND_REPAYMENT', amount: 1000 }, // 57,500
    ]);

    expect(balances).toEqual([60000, 59500, 56500, 57500]);
  });

  it('running balance starts from opening balance', () => {
    const balances = calculateRunningBalance(50000, [
      { type: 'EXPENSE', amount: 10000 },
    ]);
    expect(balances).toEqual([40000]);
  });

  it('running balance with transfers', () => {
    const balances = calculateRunningBalance(50000, [
      { type: 'TRANSFER', amount: 5000, transfersOut: 5000 },
      { type: 'INCOME', amount: 10000 },
    ]);
    // After transfer out: 50000 - 5000 = 45000
    // After income: 45000 + 10000 = 55000
    expect(balances).toEqual([45000, 55000]);
  });
});

// =============================================================================
// Edge cases
// =============================================================================
describe('Edge cases', () => {
  it('zero-amount transactions are handled', () => {
    const balance = calculateAccountBalance(10000, [
      { type: 'INCOME', amount: 0 },
    ]);
    expect(balance).toBe(10000);
  });

  it('empty transaction list returns opening balance', () => {
    const balance = calculateAccountBalance(50000, []);
    expect(balance).toBe(50000);
  });

  it('complex multi-transaction scenario', () => {
    // Starting with 100,000
    // +50,000 income
    // -15,000 expense
    // -10,000 lend
    // +3,000 lend repayment
    // +20,000 borrow
    // -5,000 borrow repayment
    const balance = calculateAccountBalance(100000, [
      { type: 'INCOME', amount: 50000 },
      { type: 'EXPENSE', amount: 15000 },
      { type: 'LEND', amount: 10000 },
      { type: 'LEND_REPAYMENT', amount: 3000 },
      { type: 'BORROW', amount: 20000 },
      { type: 'BORROW_REPAYMENT', amount: 5000 },
    ]);
    // 100000 + 50000 - 15000 - 10000 + 3000 + 20000 - 5000 = 143000
    expect(balance).toBe(143000);
  });
});
