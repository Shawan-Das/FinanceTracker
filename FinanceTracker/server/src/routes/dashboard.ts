import { Router, Request, Response } from 'express';
import { db } from '../database/connection';
import { requireAuth, getUserId } from '../middleware/auth';

const router = Router();
const SCHEMA = 'finance_tracker';

router.use(requireAuth);

// =============================================================================
// GET /api/dashboard/summary — Overall financial position and account breakdown
// =============================================================================
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    // Account balances
    const accountsResult = await db.query(
      `SELECT account_id, account_name, account_type, currency, opening_balance, current_balance
       FROM ${SCHEMA}.v_account_balances
       WHERE user_id = $1
       ORDER BY account_type, account_name`,
      [userId]
    );
    const accounts = accountsResult.rows;

    // Total money in accounts
    const totalAccountBalance = accounts.reduce(
      (sum: number, a: any) => sum + parseFloat(a.current_balance), 0
    );

    // Person balances (receivable and payable)
    const peopleResult = await db.query(
      `SELECT SUM(amount_they_owe_you) AS total_receivable,
              SUM(amount_you_owe_them) AS total_payable
       FROM ${SCHEMA}.v_person_balances
       WHERE user_id = $1`,
      [userId]
    );
    const totalReceivable = parseFloat(peopleResult.rows[0]?.total_receivable || '0');
    const totalPayable = parseFloat(peopleResult.rows[0]?.total_payable || '0');

    // Income and expense for date range (or all time)
    let dateCondition = '';
    const values: any[] = [userId];
    let paramIndex = 2;

    if (from) {
      dateCondition += ` AND transaction_date >= $${paramIndex}`;
      values.push(from);
      paramIndex++;
    }
    if (to) {
      dateCondition += ` AND transaction_date <= $${paramIndex}`;
      values.push(to);
      paramIndex++;
    }

    const totalsResult = await db.query(
      `SELECT
         COALESCE(SUM(CASE WHEN transaction_type = 'INCOME' THEN amount ELSE 0 END), 0) AS total_income,
         COALESCE(SUM(CASE WHEN transaction_type = 'EXPENSE' THEN amount ELSE 0 END), 0) AS total_expense
       FROM ${SCHEMA}.transactions
       WHERE user_id = $1 AND deleted_at IS NULL ${dateCondition}`,
      values
    );

    const totalIncome = parseFloat(totalsResult.rows[0].total_income);
    const totalExpense = parseFloat(totalsResult.rows[0].total_expense);

    // Net financial position
    const netPosition = totalAccountBalance + totalReceivable - totalPayable;

    res.json({
      success: true,
      data: {
        accounts,
        totalAccountBalance,
        totalReceivable,
        totalPayable,
        totalIncome,
        totalExpense,
        netPosition,
      },
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to load dashboard summary' },
    });
  }
});

// =============================================================================
// GET /api/dashboard/recent-transactions — Latest 10 transactions
// =============================================================================
router.get('/recent-transactions', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const result = await db.query(
      `SELECT t.*,
              a.name as account_name,
              p.name as person_name,
              c.name as category_name
       FROM ${SCHEMA}.transactions t
       LEFT JOIN ${SCHEMA}.accounts a ON a.id = t.account_id
       LEFT JOIN ${SCHEMA}.people p ON p.id = t.person_id
       LEFT JOIN ${SCHEMA}.categories c ON c.id = t.category_id
       WHERE t.user_id = $1 AND t.deleted_at IS NULL
       ORDER BY t.transaction_date DESC, t.created_at DESC
       LIMIT 10`,
      [userId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Recent transactions error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to load recent transactions' },
    });
  }
});

// =============================================================================
// GET /api/dashboard/people-summary — Top people by balance
// =============================================================================
router.get('/people-summary', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const result = await db.query(
      `SELECT person_id, person_name, amount_they_owe_you, amount_you_owe_them
       FROM ${SCHEMA}.v_person_balances
       WHERE user_id = $1
       ORDER BY GREATEST(amount_they_owe_you, amount_you_owe_them) DESC
       LIMIT 10`,
      [userId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('People summary error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to load people summary' },
    });
  }
});

// =============================================================================
// GET /api/dashboard/loan-summary — Active loans summary
// =============================================================================
router.get('/loan-summary', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const result = await db.query(
      `SELECT l.id, l.direction, l.principal_amount, l.interest_amount,
              l.start_date, l.due_date, l.status, l.description,
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
       WHERE l.user_id = $1 AND l.status = 'ACTIVE'
       ORDER BY l.due_date ASC NULLS LAST, l.start_date DESC`,
      [userId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Loan summary error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to load loan summary' },
    });
  }
});

// =============================================================================
// GET /api/dashboard/monthly-chart — Income vs Expense by month (last 12 months)
// =============================================================================
router.get('/monthly-chart', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const result = await db.query(
      `SELECT
         TO_CHAR(transaction_date, 'YYYY-MM') AS month,
         COALESCE(SUM(CASE WHEN transaction_type = 'INCOME' THEN amount ELSE 0 END), 0) AS income,
         COALESCE(SUM(CASE WHEN transaction_type = 'EXPENSE' THEN amount ELSE 0 END), 0) AS expense
       FROM ${SCHEMA}.transactions
       WHERE user_id = $1
         AND deleted_at IS NULL
         AND transaction_date >= CURRENT_DATE - INTERVAL '12 months'
         AND transaction_type IN ('INCOME', 'EXPENSE')
       GROUP BY TO_CHAR(transaction_date, 'YYYY-MM')
       ORDER BY month ASC`,
      [userId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Monthly chart error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to load chart data' },
    });
  }
});

// =============================================================================
// GET /api/dashboard/expense-by-category — Expense breakdown by category
// =============================================================================
router.get('/expense-by-category', async (req: Request, res: Response) => {
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

    const result = await db.query(
      `SELECT c.name AS category_name, c.color,
              COALESCE(SUM(t.amount), 0) AS total
       FROM ${SCHEMA}.transactions t
       LEFT JOIN ${SCHEMA}.categories c ON c.id = t.category_id
       WHERE t.user_id = $1
         AND t.deleted_at IS NULL
         AND t.transaction_type = 'EXPENSE'
         ${dateCondition}
       GROUP BY c.name, c.color
       ORDER BY total DESC`,
      values
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Expense by category error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to load expense breakdown' },
    });
  }
});

export default router;
