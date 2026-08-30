import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../database/connection';
import { requireAuth, getUserId } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { generateId } from '../shared/id';

const router = Router();
const SCHEMA = 'finance_tracker';

router.use(requireAuth);

// =============================================================================
// GET /api/loans — List all loans with repayment summary
// =============================================================================
router.get('/', async (req: Request, res: Response) => {
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
         SELECT lr2.loan_id, SUM(lr2.amount) as total_repaid
         FROM ${SCHEMA}.loan_repayments lr2
         INNER JOIN ${SCHEMA}.transactions t ON t.id = lr2.transaction_id AND t.deleted_at IS NULL
         GROUP BY lr2.loan_id
       ) lr ON lr.loan_id = l.id
       WHERE l.user_id = $1
       ORDER BY l.status = 'ACTIVE' DESC, l.start_date DESC`,
      [userId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('List loans error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to load loans' },
    });
  }
});

// =============================================================================
// GET /api/loans/orphaned — Find loans missing corresponding transactions
// (Must be defined BEFORE /:id so Express doesn't treat 'orphaned' as an ID)
// =============================================================================
router.get('/orphaned', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);

    const result = await db.query(
      `SELECT l.id, l.direction, l.principal_amount, l.interest_amount,
              l.start_date, l.status, l.description,
              p.name AS person_name
       FROM ${SCHEMA}.loans l
       LEFT JOIN ${SCHEMA}.people p ON p.id = l.person_id
       WHERE l.user_id = $1
         AND NOT EXISTS (
           SELECT 1 FROM ${SCHEMA}.transactions t
           WHERE t.loan_id = l.id
             AND t.transaction_type IN ('LEND', 'BORROW')
             AND t.deleted_at IS NULL
         )
       ORDER BY l.start_date ASC`,
      [userId]
    );

    res.json({
      success: true,
      data: {
        count: result.rows.length,
        loans: result.rows,
      },
    });
  } catch (error) {
    console.error('Find orphaned loans error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to find orphaned loans' },
    });
  }
});

// =============================================================================
// POST /api/loans/fix-orphaned — Create missing transactions for orphaned loans
// (Must be defined BEFORE /:id so Express doesn't treat 'fix-orphaned' as an ID)
// =============================================================================
router.post('/fix-orphaned', async (req: Request, res: Response) => {
  const client = await db.getClient();
  try {
    const userId = getUserId(req);
    const { account_id } = req.body;

    if (!account_id) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'account_id is required to create missing transactions' },
      });
      return;
    }

    // Verify account ownership
    const accCheck = await client.query(
      `SELECT id FROM ${SCHEMA}.accounts WHERE id = $1 AND user_id = $2`,
      [account_id, userId]
    );
    if (accCheck.rows.length === 0) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_ACCOUNT', message: 'Account not found' },
      });
      return;
    }

    await client.query('BEGIN');

    // Find orphaned loans
    const orphans = await client.query(
      `SELECT l.id, l.direction, l.principal_amount, l.start_date, l.description, l.person_id
       FROM ${SCHEMA}.loans l
       WHERE l.user_id = $1
         AND NOT EXISTS (
           SELECT 1 FROM ${SCHEMA}.transactions t
           WHERE t.loan_id = l.id
             AND t.transaction_type IN ('LEND', 'BORROW')
             AND t.deleted_at IS NULL
         )
       ORDER BY l.start_date ASC`,
      [userId]
    );

    const fixed: string[] = [];

    for (const loan of orphans.rows) {
      const txType = loan.direction === 'LENT' ? 'LEND' : 'BORROW';
      const txId = generateId('transactions');

      await client.query(
        `INSERT INTO ${SCHEMA}.transactions
         (id, user_id, transaction_type, transaction_date, amount, account_id, person_id, loan_id, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [txId, userId, txType, loan.start_date, loan.principal_amount, account_id, loan.person_id, loan.id, loan.description || 'Backfilled from loan']
      );

      fixed.push(loan.id);
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      data: {
        fixed_count: fixed.length,
        fixed_loan_ids: fixed,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Fix orphaned loans error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fix orphaned loans' },
    });
  } finally {
    client.release();
  }
});

// =============================================================================
// GET /api/loans/:id — Get a single loan with repayments
// =============================================================================
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const loanId = req.params.id;

    const result = await db.query(
      `SELECT l.*,
              p.name as person_name,
              COALESCE(lr.total_repaid, 0) AS total_repaid,
              (l.principal_amount + l.interest_amount - COALESCE(lr.total_repaid, 0)) AS remaining_amount
       FROM ${SCHEMA}.loans l
       LEFT JOIN ${SCHEMA}.people p ON p.id = l.person_id
       LEFT JOIN (
         SELECT lr2.loan_id, SUM(lr2.amount) as total_repaid
         FROM ${SCHEMA}.loan_repayments lr2
         INNER JOIN ${SCHEMA}.transactions t ON t.id = lr2.transaction_id AND t.deleted_at IS NULL
         GROUP BY lr2.loan_id
       ) lr ON lr.loan_id = l.id
       WHERE l.id = $1 AND l.user_id = $2`,
      [loanId, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Loan not found' },
      });
      return;
    }

    const repayments = await db.query(
      `SELECT lr.*, t.transaction_date, t.account_id, a.name as account_name
       FROM ${SCHEMA}.loan_repayments lr
       INNER JOIN ${SCHEMA}.transactions t ON t.id = lr.transaction_id AND t.deleted_at IS NULL
       LEFT JOIN ${SCHEMA}.accounts a ON a.id = t.account_id
       WHERE lr.loan_id = $1
       ORDER BY lr.repayment_date DESC`,
      [loanId]
    );

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        repayments: repayments.rows,
      },
    });
  } catch (error) {
    console.error('Get loan error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to load loan' },
    });
  }
});

// =============================================================================
// POST /api/loans — Create a new loan
// =============================================================================
const createLoanSchema = z.object({
  person_id: z.string().optional(),
  direction: z.enum(['BORROWED', 'LENT']),
  principal_amount: z.coerce.number().positive('Principal must be greater than zero'),
  interest_amount: z.coerce.number().min(0).default(0),
  start_date: z.string().min(1),
  due_date: z.string().optional().nullable(),
  description: z.string().optional(),
  account_id: z.string().optional(),
});

router.post('/', validateBody(createLoanSchema), async (req: Request, res: Response) => {
  const client = await db.getClient();
  try {
    const userId = getUserId(req);
    const { person_id, direction, principal_amount, interest_amount, start_date, due_date, description, account_id } = req.body;
    const id = generateId('loans');

    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO ${SCHEMA}.loans (id, user_id, person_id, direction, principal_amount, interest_amount, start_date, due_date, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [id, userId, person_id || null, direction, principal_amount, interest_amount, start_date, due_date || null, description || null]
    );

    // Also create the corresponding transaction so v_person_balances stays accurate
    let txId: string | null = null;
    if (account_id) {
      const txType = direction === 'LENT' ? 'LEND' : 'BORROW';
      txId = generateId('transactions');
      await client.query(
        `INSERT INTO ${SCHEMA}.transactions
         (id, user_id, transaction_type, transaction_date, amount, account_id, person_id, loan_id, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [txId, userId, txType, start_date, principal_amount, account_id, person_id || null, id, description || null]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: { ...result.rows[0], total_repaid: 0, remaining_amount: principal_amount + interest_amount, transaction_id: txId },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create loan error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to create loan' },
    });
  } finally {
    client.release();
  }
});

// =============================================================================
// PATCH /api/loans/:id — Update a loan
// =============================================================================
const updateLoanSchema = z.object({
  due_date: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
  description: z.string().optional().nullable(),
});

router.patch('/:id', validateBody(updateLoanSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const loanId = req.params.id;
    const updates = req.body;

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      fields.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }

    if (fields.length === 0) {
      res.status(400).json({
        success: false,
        error: { code: 'NO_UPDATES', message: 'No fields to update' },
      });
      return;
    }

    fields.push(`updated_at = NOW()`);
    values.push(loanId, userId);

    const result = await db.query(
      `UPDATE ${SCHEMA}.loans
       SET ${fields.join(', ')}
       WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Loan not found' },
      });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update loan error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to update loan' },
    });
  }
});

// =============================================================================
// DELETE /api/loans/:id
// =============================================================================
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const loanId = req.params.id;

    const repayResult = await db.query(
      `SELECT COUNT(*) as count FROM ${SCHEMA}.loan_repayments WHERE loan_id = $1`,
      [loanId]
    );

    if (parseInt(repayResult.rows[0].count) > 0) {
      res.status(409).json({
        success: false,
        error: {
          code: 'HAS_REPAYMENTS',
          message: 'Cannot delete a loan with existing repayments. Cancel it instead.',
        },
      });
      return;
    }

    const result = await db.query(
      `DELETE FROM ${SCHEMA}.loans WHERE id = $1 AND user_id = $2 RETURNING id`,
      [loanId, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Loan not found' },
      });
      return;
    }

    res.json({ success: true, data: { id: loanId } });
  } catch (error) {
    console.error('Delete loan error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to delete loan' },
    });
  }
});

// =============================================================================
// POST /api/loans/:id/repayments — Record a repayment
// =============================================================================
const createRepaymentSchema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  repayment_date: z.string().min(1),
  account_id: z.string(),
  notes: z.string().optional(),
});

router.post('/:id/repayments', validateBody(createRepaymentSchema), async (req: Request, res: Response) => {
  const client = await db.getClient();
  try {
    const userId = getUserId(req);
    const loanId = req.params.id;
    const { amount, repayment_date, account_id, notes } = req.body;

    const loanResult = await client.query(
      `SELECT * FROM ${SCHEMA}.loans WHERE id = $1 AND user_id = $2`,
      [loanId, userId]
    );

    if (loanResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Loan not found' },
      });
      return;
    }

    const loan = loanResult.rows[0];

    if (loan.status !== 'ACTIVE') {
      res.status(400).json({
        success: false,
        error: { code: 'LOAN_NOT_ACTIVE', message: `Cannot record repayment for a loan with status '${loan.status}'` },
      });
      return;
    }

    const repaidResult = await client.query(
      `SELECT COALESCE(SUM(lr.amount), 0) as total_repaid
       FROM ${SCHEMA}.loan_repayments lr
       INNER JOIN ${SCHEMA}.transactions t ON t.id = lr.transaction_id AND t.deleted_at IS NULL
       WHERE lr.loan_id = $1`,
      [loanId]
    );
    const totalRepaid = parseFloat(repaidResult.rows[0].total_repaid);
    const remaining = parseFloat(loan.principal_amount) + parseFloat(loan.interest_amount) - totalRepaid;

    if (amount > remaining) {
      res.status(400).json({
        success: false,
        error: {
          code: 'AMOUNT_EXCEEDS',
          message: `Repayment amount (৳${amount}) exceeds remaining balance (৳${remaining})`,
        },
      });
      return;
    }

    await client.query('BEGIN');

    const txType = loan.direction === 'LENT' ? 'LEND_REPAYMENT' : 'BORROW_REPAYMENT';
    const txId = generateId('transactions');

    const txResult = await client.query(
      `INSERT INTO ${SCHEMA}.transactions
       (id, user_id, transaction_type, transaction_date, amount, account_id, person_id, loan_id, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [txId, userId, txType, repayment_date, amount, account_id, loan.person_id, loanId, notes || null]
    );
    const tx = txResult.rows[0];

    const lreId = generateId('loan_repayments');
    await client.query(
      `INSERT INTO ${SCHEMA}.loan_repayments (id, loan_id, transaction_id, amount, repayment_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [lreId, loanId, tx.id, amount, repayment_date, notes || null]
    );

    const newTotalRepaid = totalRepaid + amount;
    const totalDue = parseFloat(loan.principal_amount) + parseFloat(loan.interest_amount);
    if (newTotalRepaid >= totalDue) {
      await client.query(
        `UPDATE ${SCHEMA}.loans SET status = 'PAID', updated_at = NOW() WHERE id = $1`,
        [loanId]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({ success: true, data: tx });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create repayment error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to record repayment' },
    });
  } finally {
    client.release();
  }
});

// =============================================================================
// GET /api/loans/:id/repayments — List repayments for a loan
// =============================================================================
router.get('/:id/repayments', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const loanId = req.params.id;

    const loanCheck = await db.query(
      `SELECT id FROM ${SCHEMA}.loans WHERE id = $1 AND user_id = $2`,
      [loanId, userId]
    );
    if (loanCheck.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Loan not found' },
      });
      return;
    }

    const result = await db.query(
      `SELECT lr.*, t.account_id, a.name as account_name
       FROM ${SCHEMA}.loan_repayments lr
       INNER JOIN ${SCHEMA}.transactions t ON t.id = lr.transaction_id AND t.deleted_at IS NULL
       LEFT JOIN ${SCHEMA}.accounts a ON a.id = t.account_id
       WHERE lr.loan_id = $1
       ORDER BY lr.repayment_date DESC`,
      [loanId]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('List repayments error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to load repayments' },
    });
  }
});

export default router;
