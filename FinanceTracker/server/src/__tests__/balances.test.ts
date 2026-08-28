import { describe, it, expect } from 'vitest';
import {
  calculateAccountBalance,
  calculatePersonBalance,
  calculateReceivable,
  calculatePayable,
  calculateLoanBalance,
  validateRepaymentAmount,
  calculateNetPosition,
} from '../shared/financial';

// =============================================================================
// Person Balance Calculations
// =============================================================================
describe('Person balance calculations', () => {
  it('calculates receivable when person owes user', () => {
    // User lent Rahim 10,000, Rahim returned 4,000
    const balance = calculatePersonBalance(10000, 4000, 0, 0);
    expect(balance.theyOweYou).toBe(6000);
    expect(balance.youOweThem).toBe(0);
    expect(balance.netBalance).toBe(6000);
  });

  it('calculates payable when user owes person', () => {
    // User borrowed 20,000 from Karim, repaid 7,000
    const balance = calculatePersonBalance(0, 0, 20000, 7000);
    expect(balance.theyOweYou).toBe(0);
    expect(balance.youOweThem).toBe(13000);
    expect(balance.netBalance).toBe(-13000);
  });

  it('calculates net balance when both directions exist', () => {
    // Rahim owes user 10,000, user owes Rahim 3,000
    // Net receivable from Rahim = 7,000
    const balance = calculatePersonBalance(10000, 0, 3000, 0);
    expect(balance.theyOweYou).toBe(10000);
    expect(balance.youOweThem).toBe(3000);
    expect(balance.netBalance).toBe(7000);
  });

  it('zero balance when fully settled', () => {
    const balance = calculatePersonBalance(10000, 10000, 5000, 5000);
    expect(balance.theyOweYou).toBe(0);
    expect(balance.youOweThem).toBe(0);
    expect(balance.netBalance).toBe(0);
  });

  it('receivable helper function', () => {
    expect(calculateReceivable(10000, 4000)).toBe(6000);
    expect(calculateReceivable(5000, 5000)).toBe(0);
    expect(calculateReceivable(0, 0)).toBe(0);
  });

  it('payable helper function', () => {
    expect(calculatePayable(20000, 7000)).toBe(13000);
    expect(calculatePayable(10000, 10000)).toBe(0);
    expect(calculatePayable(0, 0)).toBe(0);
  });
});

// =============================================================================
// Loan Balance Calculations
// =============================================================================
describe('Loan balance calculations', () => {
  it('calculates loan with no repayments', () => {
    const loan = calculateLoanBalance(100000, 0, 0);
    expect(loan.remainingAmount).toBe(100000);
    expect(loan.isFullyRepaid).toBe(false);
  });

  it('calculates loan with partial repayment', () => {
    const loan = calculateLoanBalance(100000, 10000, 30000);
    expect(loan.remainingAmount).toBe(80000);
    expect(loan.isFullyRepaid).toBe(false);
  });

  it('calculates fully repaid loan', () => {
    const loan = calculateLoanBalance(100000, 0, 100000);
    expect(loan.remainingAmount).toBe(0);
    expect(loan.isFullyRepaid).toBe(true);
  });

  it('calculates loan with interest fully repaid', () => {
    const loan = calculateLoanBalance(100000, 10000, 110000);
    expect(loan.remainingAmount).toBe(0);
    expect(loan.isFullyRepaid).toBe(true);
  });

  it('over-repayment results in zero remaining (not negative)', () => {
    const loan = calculateLoanBalance(100000, 0, 120000);
    expect(loan.remainingAmount).toBe(0);
    expect(loan.isFullyRepaid).toBe(true);
  });

  it('validates repayment amount', () => {
    // Valid repayment
    const result1 = validateRepaymentAmount(100000, 50000);
    expect(result1.valid).toBe(true);

    // Zero repayment
    const result2 = validateRepaymentAmount(100000, 0);
    expect(result2.valid).toBe(false);

    // Negative repayment
    const result3 = validateRepaymentAmount(100000, -1000);
    expect(result3.valid).toBe(false);

    // Exceeds remaining
    const result4 = validateRepaymentAmount(50000, 60000);
    expect(result4.valid).toBe(false);
    expect(result4.error).toContain('exceeds');
  });

  it('exact repayment is valid', () => {
    const result = validateRepaymentAmount(50000, 50000);
    expect(result.valid).toBe(true);
  });
});

// =============================================================================
// Net Financial Position
// =============================================================================
describe('Net financial position', () => {
  it('calculates position with no receivables or payables', () => {
    const pos = calculateNetPosition([80000, 15000, 5000], 0, 0);
    expect(pos.totalCashInAccounts).toBe(100000);
    expect(pos.totalReceivable).toBe(0);
    expect(pos.totalPayable).toBe(0);
    expect(pos.netPosition).toBe(100000);
  });

  it('adds receivable to net position', () => {
    const pos = calculateNetPosition([95000], 20000, 0);
    expect(pos.netPosition).toBe(115000);
  });

  it('subtracts payable from net position', () => {
    const pos = calculateNetPosition([95000], 0, 10000);
    expect(pos.netPosition).toBe(85000);
  });

  it('combines receivable and payable correctly', () => {
    const pos = calculateNetPosition([95000], 20000, 10000);
    expect(pos.netPosition).toBe(105000);
  });

  it('borrowed money does not change net position', () => {
    // Starting: Cash = 10,000
    // After borrowing 20,000: Cash = 30,000, Payable = 20,000
    const pos = calculateNetPosition([30000], 0, 20000);
    expect(pos.netPosition).toBe(10000);
  });

  it('lent money does not change net position', () => {
    // Starting: Cash = 10,000
    // After lending 3,000: Cash = 7,000, Receivable = 3,000
    const pos = calculateNetPosition([7000], 3000, 0);
    expect(pos.netPosition).toBe(10000);
  });

  it('handles multiple accounts', () => {
    const pos = calculateNetPosition([75000, 15000, 5000], 20000, 10000);
    expect(pos.totalCashInAccounts).toBe(95000);
    expect(pos.netPosition).toBe(105000);
  });

  it('handles zero accounts', () => {
    const pos = calculateNetPosition([], 0, 0);
    expect(pos.totalCashInAccounts).toBe(0);
    expect(pos.netPosition).toBe(0);
  });

  it('negative net position is possible', () => {
    const pos = calculateNetPosition([1000], 0, 5000);
    expect(pos.netPosition).toBe(-4000);
  });
});

// =============================================================================
// Critical test cases from requirements (Section 56)
// =============================================================================
describe('Critical test cases from requirements', () => {
  it('TC1: Lending does not change net position', () => {
    // Starting Cash = 10,000
    // Lend 3,000
    // Expected: Cash = 7,000, Receivable = 3,000, Net = 10,000
    const cash = calculateAccountBalance(10000, [
      { type: 'LEND', amount: 3000 },
    ]);
    const receivable = 3000;
    const pos = calculateNetPosition([cash], receivable, 0);

    expect(cash).toBe(7000);
    expect(pos.netPosition).toBe(10000);
  });

  it('TC2: Borrowing does not change net position', () => {
    // Starting Cash = 10,000
    // Borrow 5,000
    // Expected: Cash = 15,000, Payable = 5,000, Net = 10,000
    const cash = calculateAccountBalance(10000, [
      { type: 'BORROW', amount: 5000 },
    ]);
    const payable = 5000;
    const pos = calculateNetPosition([cash], 0, payable);

    expect(cash).toBe(15000);
    expect(pos.netPosition).toBe(10000);
  });

  it('TC3: Transfer does not change total wealth', () => {
    // Bank = 50,000, Cash = 10,000 → Total = 60,000
    // Transfer 2,000 from Bank to Cash
    // Bank = 48,000, Cash = 12,000 → Total = 60,000
    const bankAfter = calculateAccountBalance(50000, [], 0, 2000);
    const cashAfter = calculateAccountBalance(10000, [], 2000, 0);

    expect(bankAfter).toBe(48000);
    expect(cashAfter).toBe(12000);
    expect(bankAfter + cashAfter).toBe(60000);
  });

  it('TC4: Combined lending and borrowing scenario', () => {
    // Start: Cash = 25,000
    const cash = calculateAccountBalance(25000, [
      { type: 'INCOME', amount: 50000 },        // +50,000 → 75,000
      { type: 'EXPENSE', amount: 500 },          // -500 → 74,500
      { type: 'LEND', amount: 10000 },           // -10,000 → 64,500
      { type: 'LEND_REPAYMENT', amount: 4000 },  // +4,000 → 68,500
      { type: 'BORROW', amount: 20000 },          // +20,000 → 88,500
    ]);

    const receivable = 10000 - 4000;  // 6,000
    const payable = 20000;

    const pos = calculateNetPosition([cash], receivable, payable);

    expect(cash).toBe(88500);
    expect(pos.netPosition).toBe(74500);
  });

  it('TC5: Repayment of borrowed money', () => {
    // Start: Cash = 30,000, Owe Karim 20,000
    // Repay 5,000 to Karim
    const cash = calculateAccountBalance(30000, [
      { type: 'BORROW_REPAYMENT', amount: 5000 },
    ]);
    const payable = 20000 - 5000;

    expect(cash).toBe(25000);
    expect(payable).toBe(15000);
    expect(cash - payable).toBe(10000);
  });

  it('TC6: Receivable repayment increases cash', () => {
    // Start: Cash = 7,000, Rahim owes 6,000
    // Rahim returns 2,000
    const cash = calculateAccountBalance(7000, [
      { type: 'LEND_REPAYMENT', amount: 2000 },
    ]);
    const receivable = 6000 - 2000;

    expect(cash).toBe(9000);
    expect(receivable).toBe(4000);
    expect(cash + receivable).toBe(13000);
  });
});
