import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../database/connection';
import { requireAuth, getUserId } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { generateId } from '../shared/id';
import { sendTransactionReceipt } from '../services/email';

const router = Router();
const SCHEMA = 'finance_tracker';

router.use(requireAuth);

// =============================================================================
// Auto-detect overdue loans: mark ACTIVE loans past due_date as OVERDUE
// =============================================================================
async function markOverdueLoans(userId: string): Promise<void> {
  await db.query(
    `UPDATE ${SCHEMA}.loans
     SET status = 'OVERDUE', updated_at = NOW()
     WHERE user_id = $1 AND status = 'ACTIVE'
       AND due_date IS NOT NULL AND due_date < CURRENT_DATE`,
    [userId]
  );
}

// =============================================================================
// GET /api/loans — List all loans with repayment summary
// =============================================================================
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    // Auto-detect overdue loans before listing
    await markOverdueLoans(userId);
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
// POST /api/loans/:id/add-funds — Add more principal to an existing active loan
// (Must be defined BEFORE /:id so Express doesn't treat 'add-funds' as an ID)
// =============================================================================
const addFundsSchema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  account_id: z.string().min(1, 'Account is required'),
  date: z.string().optional(),
  description: z.string().optional(),
});

router.post('/:id/add-funds', validateBody(addFundsSchema), async (req: Request, res: Response) => {
  const client = await db.getClient();
  try {
    const userId = getUserId(req);
    const loanId = req.params.id;
    const { amount, account_id, date, description } = req.body;
    const txDate = date || new Date().toISOString().split('T')[0];

    // Verify loan exists, is active, and belongs to user
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
        error: { code: 'LOAN_NOT_ACTIVE', message: `Cannot add funds to a loan with status '${loan.status}'` },
      });
      return;
    }

    // Verify account belongs to user
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

    // 1. Increase the loan's principal_amount
    await client.query(
      `UPDATE ${SCHEMA}.loans
       SET principal_amount = principal_amount + $1, updated_at = NOW()
       WHERE id = $2`,
      [amount, loanId]
    );

    // 2. Create the corresponding LEND/BORROW transaction
    const txType = loan.direction === 'LENT' ? 'LEND' : 'BORROW';
    const txId = generateId('transactions');
    await client.query(
      `INSERT INTO ${SCHEMA}.transactions
       (id, user_id, transaction_type, transaction_date, amount, account_id, person_id, loan_id, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [txId, userId, txType, txDate, amount, account_id, loan.person_id, loanId, description || `Additional funds for loan`]
    );

    await client.query('COMMIT');

    // Fetch updated loan
    const updated = await db.query(
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
       WHERE l.id = $1`,
      [loanId]
    );

    res.status(201).json({ success: true, data: updated.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Add funds error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to add funds to loan' },
    });
  } finally {
    client.release();
  }
});

// =============================================================================
// GET /api/loans/:id/voucher — Generate PDF voucher for a loan
// (Must be defined BEFORE /:id so Express doesn't treat 'voucher' as an ID)
// =============================================================================
router.get('/:id/voucher', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const loanId = req.params.id;

    const loanResult = await db.query(
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

    if (loanResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Loan not found' },
      });
      return;
    }

    const loan = loanResult.rows[0];

    // Fetch user info
    const userResult = await db.query(
      `SELECT full_name, email FROM ${SCHEMA}.users WHERE id = $1`,
      [userId]
    );
    const user = userResult.rows[0] || { full_name: 'User', email: '' };

    // Build a synthetic voucher report data from loan
    const direction = loan.direction === 'LENT' ? 'Lend' : 'Borrow';
    const label = loan.direction === 'LENT'
      ? `Loan ${direction} to ${loan.person_name || 'Unknown'}`
      : `Loan ${direction} from ${loan.person_name || 'Unknown'}`;

    const voucherData = {
      id: loan.id,
      transaction_type: loan.direction === 'LENT' ? 'LEND' : 'BORROW',
      transaction_date: loan.start_date,
      amount: parseFloat(loan.principal_amount),
      description: loan.description || label,
      reference: `Interest: BDT ${parseFloat(loan.interest_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} | Repaid: BDT ${parseFloat(loan.total_repaid).toLocaleString('en-US', { minimumFractionDigits: 2 })} | Remaining: BDT ${parseFloat(loan.remaining_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      account_name: null,
      person_name: loan.person_name,
      category_name: `Loan (${loan.status})`,
      user_name: user.full_name,
      user_email: user.email,
    };

    res.json({
      success: true,
      data: voucherData,
    });
  } catch (error) {
    console.error('Generate loan voucher error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to generate loan voucher report' },
    });
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

    // Full transaction history for this loan (fund additions + repayments)
    const txHistory = await db.query(
      `SELECT t.id, t.transaction_type, t.transaction_date, t.amount, t.description,
              a.name as account_name
       FROM ${SCHEMA}.transactions t
       LEFT JOIN ${SCHEMA}.accounts a ON a.id = t.account_id
       WHERE t.loan_id = $1 AND t.deleted_at IS NULL
       ORDER BY t.transaction_date ASC, t.created_at ASC`,
      [loanId]
    );

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        repayments: repayments.rows,
        transactions: txHistory.rows,
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
  send_receipt: z.boolean().optional().default(false),
});

router.post('/', validateBody(createLoanSchema), async (req: Request, res: Response) => {
  const client = await db.getClient();
  try {
    const userId = getUserId(req);
    const { person_id, direction, principal_amount, interest_amount, start_date, due_date, description, account_id, send_receipt } = req.body;
    const id = generateId('loans');

    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO ${SCHEMA}.loans (id, user_id, person_id, direction, principal_amount, interest_amount, start_date, due_date, description, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'MANUAL')
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

    // ── Fire-and-forget: send receipt to the other party ──
    if (send_receipt && person_id) {
      (async () => {
        try {
          const personResult = await db.query(
            `SELECT name, email FROM ${SCHEMA}.people WHERE id = $1 AND user_id = $2`,
            [person_id, userId]
          );
          const person = personResult.rows[0];
          if (!person || !person.email) return;

          const userResult = await db.query(
            `SELECT full_name FROM ${SCHEMA}.users WHERE id = $1`,
            [userId]
          );
          const userName = userResult.rows[0]?.full_name || 'User';

          const txType = direction === 'LENT' ? 'LEND' : 'BORROW';
          await sendTransactionReceipt({
            to: person.email,
            senderName: userName,
            recipientName: person.name,
            transactionType: txType,
            amount: principal_amount,
            date: start_date,
            description: description || null,
          });
        } catch (err) {
          console.error('Failed to send loan receipt:', err);
        }
      })();
    }
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

    // Validate status transitions
    if (updates.status) {
      const loanResult = await db.query(
        `SELECT l.*, COALESCE(lr.total_repaid, 0) AS total_repaid
         FROM ${SCHEMA}.loans l
         LEFT JOIN (
           SELECT lr2.loan_id, SUM(lr2.amount) as total_repaid
           FROM ${SCHEMA}.loan_repayments lr2
           INNER JOIN ${SCHEMA}.transactions t ON t.id = lr2.transaction_id AND t.deleted_at IS NULL
           GROUP BY lr2.loan_id
         ) lr ON lr.loan_id = l.id
         WHERE l.id = $1 AND l.user_id = $2`,
        [loanId, userId]
      );

      if (loanResult.rows.length > 0) {
        const loan = loanResult.rows[0];
        const totalDue = parseFloat(loan.principal_amount) + parseFloat(loan.interest_amount);
        const totalRepaid = parseFloat(loan.total_repaid || '0');
        const remaining = totalDue - totalRepaid;

        // Prevent marking as PAID if there is still outstanding balance
        if (updates.status === 'PAID' && remaining > 0) {
          res.status(400).json({
            success: false,
            error: {
              code: 'LOAN_HAS_OUTSTANDING_BALANCE',
              message: `Cannot mark this loan as PAID. Outstanding balance is ৳${remaining.toLocaleString('en-BD', { minimumFractionDigits: 2 })}. Record the remaining repayment first.`,
            },
          });
          return;
        }

        // Prevent marking as ACTIVE if it is already PAID (unless reverting)
        if (updates.status === 'ACTIVE' && loan.status === 'PAID') {
          res.status(400).json({
            success: false,
            error: {
              code: 'CANNOT_REOPEN_PAID_LOAN',
              message: 'Cannot reopen a fully paid loan. Create a new loan record instead.',
            },
          });
          return;
        }
      }
    }

    const ALLOWED_FIELDS = ['due_date', 'status', 'description'];
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (!ALLOWED_FIELDS.includes(key)) continue;
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
  const client = await db.getClient();
  try {
    const userId = getUserId(req);
    const loanId = req.params.id;

    // Verify loan exists and belongs to user
    const loanCheck = await client.query(
      `SELECT id, direction, status FROM ${SCHEMA}.loans WHERE id = $1 AND user_id = $2`,
      [loanId, userId]
    );
    if (loanCheck.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Loan not found' },
      });
      return;
    }

    // Check for existing repayments
    const repaymentCheck = await client.query(
      `SELECT COUNT(*) as count FROM ${SCHEMA}.loan_repayments WHERE loan_id = $1`,
      [loanId]
    );

    if (parseInt(repaymentCheck.rows[0].count) > 0) {
      res.status(409).json({
        success: false,
        error: {
          code: 'LOAN_HAS_REPAYMENTS',
          message: 'Cannot delete a loan with existing repayments. Set its status to CANCELLED instead.',
        },
      });
      return;
    }

    // Check for linked transactions
    const txCheck = await client.query(
      `SELECT COUNT(*) as count FROM ${SCHEMA}.transactions
       WHERE loan_id = $1 AND deleted_at IS NULL`,
      [loanId]
    );

    if (parseInt(txCheck.rows[0].count) > 0) {
      res.status(409).json({
        success: false,
        error: {
          code: 'LOAN_HAS_TRANSACTIONS',
          message: 'Cannot delete a loan with linked transactions. Set its status to CANCELLED instead.',
        },
      });
      return;
    }

    await client.query('BEGIN');

    // 1. Find and soft-delete all repayment transactions linked to this loan
    const repayTxs = await client.query(
      `SELECT id FROM ${SCHEMA}.transactions
       WHERE loan_id = $1 AND transaction_type IN ('LEND_REPAYMENT', 'BORROW_REPAYMENT')
         AND deleted_at IS NULL`,
      [loanId]
    );
    for (const tx of repayTxs.rows) {
      await client.query(
        `UPDATE ${SCHEMA}.transactions SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [tx.id]
      );
    }

    // 2. Delete loan_repayments records
    await client.query(
      `DELETE FROM ${SCHEMA}.loan_repayments WHERE loan_id = $1`,
      [loanId]
    );

    // 3. Soft-delete the associated LEND/BORROW transaction
    await client.query(
      `UPDATE ${SCHEMA}.transactions
       SET deleted_at = NOW(), updated_at = NOW()
       WHERE loan_id = $1 AND transaction_type IN ('LEND', 'BORROW')
         AND deleted_at IS NULL`,
      [loanId]
    );

    // 4. Hard delete the loan record
    await client.query(
      `DELETE FROM ${SCHEMA}.loans WHERE id = $1 AND user_id = $2`,
      [loanId, userId]
    );

    await client.query('COMMIT');

    res.json({ success: true, data: { id: loanId } });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete loan error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to delete loan' },
    });
  } finally {
    client.release();
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
  send_receipt: z.boolean().optional().default(false),
});

router.post('/:id/repayments', validateBody(createRepaymentSchema), async (req: Request, res: Response) => {
  const client = await db.getClient();
  try {
    const userId = getUserId(req);
    const loanId = req.params.id;
    const { amount, repayment_date, account_id, notes, send_receipt } = req.body;

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

    // Verify account belongs to user
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

    // ── Fire-and-forget: send receipt to the other party ──
    if (send_receipt && loan.person_id) {
      (async () => {
        try {
          const personResult = await db.query(
            `SELECT name, email FROM ${SCHEMA}.people WHERE id = $1 AND user_id = $2`,
            [loan.person_id, userId]
          );
          const person = personResult.rows[0];
          if (!person || !person.email) return;

          const userResult = await db.query(
            `SELECT full_name FROM ${SCHEMA}.users WHERE id = $1`,
            [userId]
          );
          const userName = userResult.rows[0]?.full_name || 'User';

          const repayTxType = loan.direction === 'LENT' ? 'LEND_REPAYMENT' : 'BORROW_REPAYMENT';
          await sendTransactionReceipt({
            to: person.email,
            senderName: userName,
            recipientName: person.name,
            transactionType: repayTxType,
            amount: amount,
            date: repayment_date,
            description: notes || null,
          });
        } catch (err) {
          console.error('Failed to send repayment receipt:', err);
        }
      })();
    }
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
