import { Router, Request, Response } from 'express';
import { db } from '../database/connection';
import { requireAuth, getUserId } from '../middleware/auth';

const router = Router();
const SCHEMA = 'finance_tracker';

router.use(requireAuth);

// =============================================================================
// GET /api/reports/income — Income report
// =============================================================================
router.get('/income', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    let dateCondition = '';
    const values: any[] = [userId];
    let paramIndex = 2;

    if (from) {
      dateCondition += ` AND t.transaction_date >= $${paramIndex}`;
      values.push(from);
      paramIndex++;
    }
    if (to) {
      dateCondition += ` AND t.transaction_date <= $${paramIndex}`;
      values.push(to);
      paramIndex++;
    }

    // By category
    const byCategory = await db.query(
      `SELECT c.name AS category_name, SUM(t.amount) AS total
       FROM ${SCHEMA}.transactions t
       LEFT JOIN ${SCHEMA}.categories c ON c.id = t.category_id
       WHERE t.user_id = $1 AND t.transaction_type = 'INCOME' AND t.deleted_at IS NULL ${dateCondition}
       GROUP BY c.name ORDER BY total DESC`,
      values
    );

    // By month
    const byMonth = await db.query(
      `SELECT TO_CHAR(t.transaction_date, 'YYYY-MM') AS month, SUM(t.amount) AS total
       FROM ${SCHEMA}.transactions t
       WHERE t.user_id = $1 AND t.transaction_type = 'INCOME' AND t.deleted_at IS NULL ${dateCondition}
       GROUP BY month ORDER BY month ASC`,
      values
    );

    // Total
    const totalResult = await db.query(
      `SELECT COALESCE(SUM(t.amount), 0) AS total
       FROM ${SCHEMA}.transactions t
       WHERE t.user_id = $1 AND t.transaction_type = 'INCOME' AND t.deleted_at IS NULL ${dateCondition}`,
      values
    );

    res.json({
      success: true,
      data: {
        total: parseFloat(totalResult.rows[0].total),
        byCategory: byCategory.rows,
        byMonth: byMonth.rows,
      },
    });
  } catch (error) {
    console.error('Income report error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to generate income report' },
    });
  }
});

// =============================================================================
// GET /api/reports/expense — Expense report
// =============================================================================
router.get('/expense', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    let dateCondition = '';
    const values: any[] = [userId];
    let paramIndex = 2;

    if (from) {
      dateCondition += ` AND t.transaction_date >= $${paramIndex}`;
      values.push(from);
      paramIndex++;
    }
    if (to) {
      dateCondition += ` AND t.transaction_date <= $${paramIndex}`;
      values.push(to);
      paramIndex++;
    }

    // By category
    const byCategory = await db.query(
      `SELECT c.name AS category_name, c.color, SUM(t.amount) AS total
       FROM ${SCHEMA}.transactions t
       LEFT JOIN ${SCHEMA}.categories c ON c.id = t.category_id
       WHERE t.user_id = $1 AND t.transaction_type = 'EXPENSE' AND t.deleted_at IS NULL ${dateCondition}
       GROUP BY c.name, c.color ORDER BY total DESC`,
      values
    );

    // By account
    const byAccount = await db.query(
      `SELECT a.name AS account_name, SUM(t.amount) AS total
       FROM ${SCHEMA}.transactions t
       LEFT JOIN ${SCHEMA}.accounts a ON a.id = t.account_id
       WHERE t.user_id = $1 AND t.transaction_type = 'EXPENSE' AND t.deleted_at IS NULL ${dateCondition}
       GROUP BY a.name ORDER BY total DESC`,
      values
    );

    // By month
    const byMonth = await db.query(
      `SELECT TO_CHAR(t.transaction_date, 'YYYY-MM') AS month, SUM(t.amount) AS total
       FROM ${SCHEMA}.transactions t
       WHERE t.user_id = $1 AND t.transaction_type = 'EXPENSE' AND t.deleted_at IS NULL ${dateCondition}
       GROUP BY month ORDER BY month ASC`,
      values
    );

    // Total
    const totalResult = await db.query(
      `SELECT COALESCE(SUM(t.amount), 0) AS total
       FROM ${SCHEMA}.transactions t
       WHERE t.user_id = $1 AND t.transaction_type = 'EXPENSE' AND t.deleted_at IS NULL ${dateCondition}`,
      values
    );

    res.json({
      success: true,
      data: {
        total: parseFloat(totalResult.rows[0].total),
        byCategory: byCategory.rows,
        byAccount: byAccount.rows,
        byMonth: byMonth.rows,
      },
    });
  } catch (error) {
    console.error('Expense report error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to generate expense report' },
    });
  }
});

// =============================================================================
// GET /api/reports/account-statement — Account statement with running balance
// =============================================================================
router.get('/account-statement', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const accountId = req.query.account_id as string;

    if (!accountId) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'account_id is required' },
      });
      return;
    }

    // Verify account ownership
    const accResult = await db.query(
      `SELECT * FROM ${SCHEMA}.accounts WHERE id = $1 AND user_id = $2`,
      [accountId, userId]
    );
    if (accResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Account not found' },
      });
      return;
    }

    const account = accResult.rows[0];

    // Get all transactions for this account
    const txResult = await db.query(
      `SELECT t.*, p.name as person_name, c.name as category_name,
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
       FROM ${SCHEMA}.transactions t
       LEFT JOIN ${SCHEMA}.people p ON p.id = t.person_id
       LEFT JOIN ${SCHEMA}.categories c ON c.id = t.category_id
       LEFT JOIN ${SCHEMA}.transaction_transfers tt ON tt.transaction_id = t.id
       WHERE t.user_id = $1
         AND (t.account_id = $2
              OR tt.from_account_id = $2
              OR tt.to_account_id = $2)
         AND t.deleted_at IS NULL
       ORDER BY t.transaction_date ASC, t.created_at ASC`,
      [userId, accountId]
    );

    // Calculate running balance
    let runningBalance = parseFloat(account.opening_balance);
    const transactions = txResult.rows.map((tx: any) => {
      runningBalance += parseFloat(tx.effect);
      return { ...tx, running_balance: runningBalance };
    });

    res.json({
      success: true,
      data: {
        account,
        openingBalance: parseFloat(account.opening_balance),
        closingBalance: runningBalance,
        transactions,
      },
    });
  } catch (error) {
    console.error('Account statement error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to generate account statement' },
    });
  }
});

// =============================================================================
// GET /api/reports/person-statement — Person statement
// =============================================================================
router.get('/person-statement', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const personId = req.query.person_id as string;

    if (!personId) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'person_id is required' },
      });
      return;
    }

    // Verify person ownership
    const pResult = await db.query(
      `SELECT * FROM ${SCHEMA}.people WHERE id = $1 AND user_id = $2`,
      [personId, userId]
    );
    if (pResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Person not found' },
      });
      return;
    }

    const person = pResult.rows[0];

    const txResult = await db.query(
      `SELECT t.*, a.name as account_name,
              CASE
                WHEN t.transaction_type = 'LEND' THEN t.amount
                WHEN t.transaction_type = 'LEND_REPAYMENT' THEN -t.amount
                WHEN t.transaction_type = 'BORROW' THEN -t.amount
                WHEN t.transaction_type = 'BORROW_REPAYMENT' THEN t.amount
                ELSE 0
              END AS effect
       FROM ${SCHEMA}.transactions t
       LEFT JOIN ${SCHEMA}.accounts a ON a.id = t.account_id
       WHERE t.user_id = $1 AND t.person_id = $2 AND t.deleted_at IS NULL
       ORDER BY t.transaction_date ASC, t.created_at ASC`,
      [userId, personId]
    );

    // Calculate running net balance for the ledger
    let runningBalance = 0;
    const transactions = txResult.rows.map((tx: any) => {
      runningBalance += parseFloat(tx.effect);
      return { ...tx, running_balance: runningBalance };
    });

    const balanceResult = await db.query(
      `SELECT * FROM ${SCHEMA}.v_person_balances
       WHERE user_id = $1 AND person_id = $2`,
      [userId, personId]
    );

    const balance = balanceResult.rows[0] || {
      amount_they_owe_you: 0,
      amount_you_owe_them: 0,
      total_lent: 0,
      total_lent_repaid: 0,
      total_borrowed: 0,
      total_borrow_repaid: 0,
    };

    // Fetch loans associated with this person
    const loansResult = await db.query(
      `SELECT l.*,
              COALESCE(lr.total_repaid, 0) AS total_repaid,
              (l.principal_amount + l.interest_amount - COALESCE(lr.total_repaid, 0)) AS remaining_amount
       FROM ${SCHEMA}.loans l
       LEFT JOIN (
         SELECT lr2.loan_id, SUM(lr2.amount) as total_repaid
         FROM ${SCHEMA}.loan_repayments lr2
         INNER JOIN ${SCHEMA}.transactions t ON t.id = lr2.transaction_id AND t.deleted_at IS NULL
         GROUP BY lr2.loan_id
       ) lr ON lr.loan_id = l.id
       WHERE l.user_id = $1 AND l.person_id = $2
       ORDER BY l.start_date DESC`,
      [userId, personId]
    );

    res.json({
      success: true,
      data: {
        person,
        balance,
        transactions,
        loans: loansResult.rows,
      },
    });
  } catch (error) {
    console.error('Person statement error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to generate person statement' },
    });
  }
});

// =============================================================================
// GET /api/reports/loan — Loan report
// =============================================================================
router.get('/loan', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);

    const result = await db.query(
      `SELECT l.*,
              p.name as person_name,
              COALESCE(lr.total_repaid, 0) AS total_repaid,
              (l.principal_amount + l.interest_amount - COALESCE(lr.total_repaid, 0)) AS remaining_amount
       FROM ${SCHEMA}.loans l
       LEFT JOIN ${SCHEMA}.people p ON p.id = l.person_id
       LEFT JOIN (
         SELECT lr.loan_id, SUM(lr.amount) as total_repaid
         FROM ${SCHEMA}.loan_repayments lr
         INNER JOIN ${SCHEMA}.transactions t ON t.id = lr.transaction_id AND t.deleted_at IS NULL
         GROUP BY lr.loan_id
       ) lr ON lr.loan_id = l.id
       WHERE l.user_id = $1
       ORDER BY l.start_date DESC`,
      [userId]
    );

    const summary = await db.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'ACTIVE') AS active_count,
         SUM(principal_amount + interest_amount) FILTER (WHERE status = 'ACTIVE') AS total_active_principal,
         SUM(COALESCE(lr.total_repaid, 0)) FILTER (WHERE status = 'ACTIVE') AS total_active_repaid,
         COUNT(*) FILTER (WHERE status = 'OVERDUE') AS overdue_count
       FROM ${SCHEMA}.loans l
       LEFT JOIN (
         SELECT lr.loan_id, SUM(lr.amount) as total_repaid
         FROM ${SCHEMA}.loan_repayments lr
         INNER JOIN ${SCHEMA}.transactions t ON t.id = lr.transaction_id AND t.deleted_at IS NULL
         GROUP BY lr.loan_id
       ) lr ON lr.loan_id = l.id
       WHERE l.user_id = $1`,
      [userId]
    );

    res.json({
      success: true,
      data: {
        loans: result.rows,
        summary: summary.rows[0],
      },
    });
  } catch (error) {
    console.error('Loan report error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to generate loan report' },
    });
  }
});

// =============================================================================
// GET /api/reports/financial-position — Net financial position
// =============================================================================
router.get('/financial-position', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);

    // Account totals
    const accounts = await db.query(
      `SELECT SUM(current_balance) AS total FROM ${SCHEMA}.v_account_balances WHERE user_id = $1`,
      [userId]
    );

    // People balances
    const people = await db.query(
      `SELECT SUM(amount_they_owe_you) AS total_receivable, SUM(amount_you_owe_them) AS total_payable
       FROM ${SCHEMA}.v_person_balances WHERE user_id = $1`,
      [userId]
    );

    // Loan status
    const loans = await db.query(
      `SELECT
         SUM(CASE WHEN direction = 'BORROWED' AND status = 'ACTIVE' THEN principal_amount + interest_amount ELSE 0 END) AS total_borrowed,
         SUM(CASE WHEN direction = 'LENT' AND status = 'ACTIVE' THEN principal_amount + interest_amount ELSE 0 END) AS total_lent
       FROM ${SCHEMA}.loans
       WHERE user_id = $1`,
      [userId]
    );

    const totalCash = parseFloat(accounts.rows[0]?.total || '0');
    const totalReceivable = parseFloat(people.rows[0]?.total_receivable || '0');
    const totalPayable = parseFloat(people.rows[0]?.total_payable || '0');
    const totalBorrowed = parseFloat(loans.rows[0]?.total_borrowed || '0');
    const totalLent = parseFloat(loans.rows[0]?.total_lent || '0');

    const netPosition = totalCash + totalReceivable - totalPayable;

    res.json({
      success: true,
      data: {
        totalCash,
        totalReceivable,
        totalPayable,
        netPosition,
        loanSummary: {
          totalBorrowed,
          totalLent,
        },
      },
    });
  } catch (error) {
    console.error('Financial position error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to calculate financial position' },
    });
  }
});

export default router;
