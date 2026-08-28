/**
 * Pure financial calculation functions.
 *
 * These are the core calculation rules for the Personal Finance Tracker.
 * They are kept separate from database logic so they can be tested in isolation.
 *
 * Rules from the requirements:
 *   1. Income increases available money
 *   2. Expense decreases available money
 *   3. Transfer between own accounts does NOT change total wealth
 *   4. Lending is NOT an expense — it creates a receivable
 *   5. Borrowing is NOT income — it creates a payable
 *   6. Repaying a loan decreases cash and decreases payable
 *   7. Receiving lent-back money increases cash and decreases receivable
 *   8. Historical records must remain mathematically consistent
 */

// =============================================================================
// Types
// =============================================================================

export type TransactionType =
  | 'INCOME'
  | 'EXPENSE'
  | 'TRANSFER'
  | 'LEND'
  | 'LEND_REPAYMENT'
  | 'BORROW'
  | 'BORROW_REPAYMENT'
  | 'ADJUSTMENT';

export interface AccountBalance {
  accountId: number;
  openingBalance: number;
  currentBalance: number;
}

export interface PersonBalance {
  personId: number;
  totalLent: number;
  totalLentRepaid: number;
  totalBorrowed: number;
  totalBorrowRepaid: number;
  theyOweYou: number;    // receivable
  youOweThem: number;    // payable
  netBalance: number;    // theyOweYou - youOweThem
}

export interface LoanBalance {
  loanId: number;
  principalAmount: number;
  interestAmount: number;
  totalRepaid: number;
  remainingAmount: number;
  isFullyRepaid: boolean;
}

export interface FinancialPosition {
  totalCashInAccounts: number;
  totalReceivable: number;
  totalPayable: number;
  netPosition: number;
}

// =============================================================================
// Account Balance Calculations
// =============================================================================

/**
 * Calculate the current balance of an account from its opening balance
 * and a list of transactions affecting that account.
 *
 * Formula:
 *   Opening Balance
 *   + Income
 *   - Expense
 *   - Lend (cash goes out to person)
 *   + Lend Repayment (person returns cash)
 *   + Borrow (cash comes in from person)
 *   - Borrow Repayment (you pay back cash)
 *   + Transfers In (from other accounts)
 *   - Transfers Out (to other accounts)
 */
export function calculateAccountBalance(
  openingBalance: number,
  transactions: Array<{ type: TransactionType; amount: number }>,
  transfersIn: number = 0,
  transfersOut: number = 0,
): number {
  let balance = openingBalance;

  for (const tx of transactions) {
    switch (tx.type) {
      case 'INCOME':
        balance += tx.amount;
        break;
      case 'EXPENSE':
        balance -= tx.amount;
        break;
      case 'LEND':
        balance -= tx.amount;
        break;
      case 'LEND_REPAYMENT':
        balance += tx.amount;
        break;
      case 'BORROW':
        balance += tx.amount;
        break;
      case 'BORROW_REPAYMENT':
        balance -= tx.amount;
        break;
      case 'ADJUSTMENT':
        // Adjustments can go either way; for now treated as adding
        balance += tx.amount;
        break;
      // TRANSFER is handled separately via transfersIn/transfersOut
    }
  }

  balance += transfersIn;
  balance -= transfersOut;

  return balance;
}

/**
 * Calculate the effect of a single transaction on an account balance.
 * Returns the delta (positive = increase, negative = decrease).
 */
export function getTransactionEffect(type: TransactionType, amount: number): number {
  switch (type) {
    case 'INCOME':
      return amount;
    case 'EXPENSE':
      return -amount;
    case 'LEND':
      return -amount;
    case 'LEND_REPAYMENT':
      return +amount;
    case 'BORROW':
      return +amount;
    case 'BORROW_REPAYMENT':
      return -amount;
    case 'ADJUSTMENT':
      return amount;
    case 'TRANSFER':
      return 0; // Transfers are handled separately
  }
}

// =============================================================================
// Person Balance Calculations
// =============================================================================

/**
 * Calculate a person's balance from their lending/borrowing transactions.
 */
export function calculatePersonBalance(
  lent: number,
  lentRepaid: number,
  borrowed: number,
  borrowedRepaid: number,
): PersonBalance {
  return {
    personId: 0,
    totalLent: lent,
    totalLentRepaid: lentRepaid,
    totalBorrowed: borrowed,
    totalBorrowRepaid: borrowedRepaid,
    theyOweYou: lent - lentRepaid,
    youOweThem: borrowed - borrowedRepaid,
    netBalance: (lent - lentRepaid) - (borrowed - borrowedRepaid),
  };
}

/**
 * Calculate outstanding receivable (what a person owes the user).
 */
export function calculateReceivable(totalLent: number, totalLentRepaid: number): number {
  return totalLent - totalLentRepaid;
}

/**
 * Calculate outstanding payable (what the user owes a person).
 */
export function calculatePayable(totalBorrowed: number, totalBorrowRepaid: number): number {
  return totalBorrowed - totalBorrowRepaid;
}

// =============================================================================
// Loan Balance Calculations
// =============================================================================

/**
 * Calculate loan balance from principal, interest, and repayments.
 */
export function calculateLoanBalance(
  principalAmount: number,
  interestAmount: number,
  totalRepaid: number,
): LoanBalance {
  const totalDue = principalAmount + interestAmount;
  const remaining = totalDue - totalRepaid;

  return {
    loanId: 0,
    principalAmount,
    interestAmount,
    totalRepaid,
    remainingAmount: Math.max(0, remaining),
    isFullyRepaid: remaining <= 0,
  };
}

/**
 * Validate that a repayment amount does not exceed the remaining loan balance.
 */
export function validateRepaymentAmount(
  remainingAmount: number,
  repaymentAmount: number,
): { valid: boolean; error?: string } {
  if (repaymentAmount <= 0) {
    return { valid: false, error: 'Repayment amount must be greater than zero' };
  }
  if (repaymentAmount > remainingAmount) {
    return {
      valid: false,
      error: `Repayment amount (৳${repaymentAmount}) exceeds remaining balance (৳${remainingAmount})`,
    };
  }
  return { valid: true };
}

// =============================================================================
// Net Financial Position
// =============================================================================

/**
 * Calculate the user's net financial position.
 *
 * Net Position = Total Cash in Accounts + Total Receivable - Total Payable
 *
 * This does NOT double-count borrowed money, because borrowed cash increases
 * account balance but the payable liability offsets it.
 */
export function calculateNetPosition(
  accountBalances: number[],
  totalReceivable: number,
  totalPayable: number,
): FinancialPosition {
  const totalCash = accountBalances.reduce((sum, b) => sum + b, 0);

  return {
    totalCashInAccounts: totalCash,
    totalReceivable,
    totalPayable,
    netPosition: totalCash + totalReceivable - totalPayable,
  };
}

// =============================================================================
// Transfer Validation
// =============================================================================

/**
 * Validate a transfer between two accounts.
 */
export function validateTransfer(
  fromAccountId: number,
  toAccountId: number,
  amount: number,
): { valid: boolean; error?: string } {
  if (fromAccountId === toAccountId) {
    return { valid: false, error: 'Source and destination accounts cannot be the same' };
  }
  if (amount <= 0) {
    return { valid: false, error: 'Transfer amount must be greater than zero' };
  }
  return { valid: true };
}

/**
 * Calculate the effect of a transfer on two accounts.
 * Returns the changes for both accounts (total wealth should remain unchanged).
 */
export function calculateTransferEffect(
  fromBalance: number,
  toBalance: number,
  amount: number,
): { newFromBalance: number; newToBalance: number; totalWealthChange: number } {
  const newFromBalance = fromBalance - amount;
  const newToBalance = toBalance + amount;
  const totalWealthChange = (newFromBalance + newToBalance) - (fromBalance + toBalance);

  return { newFromBalance, newToBalance, totalWealthChange };
}

// =============================================================================
// Running Balance
// =============================================================================

/**
 * Calculate running balance for a series of transactions on an account.
 */
export function calculateRunningBalance(
  openingBalance: number,
  transactions: Array<{ type: TransactionType; amount: number; transfersIn?: number; transfersOut?: number }>,
): number[] {
  const balances: number[] = [];
  let balance = openingBalance;

  for (const tx of transactions) {
    balance += getTransactionEffect(tx.type, tx.amount);
    balance += tx.transfersIn || 0;
    balance -= tx.transfersOut || 0;
    balances.push(balance);
  }

  return balances;
}
