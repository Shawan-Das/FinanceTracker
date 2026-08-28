import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../database/connection';
import { requireAuth, getUserId } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validation';

const router = Router();
const SCHEMA = 'finance_tracker';

router.use(requireAuth);

// =============================================================================
// GET /api/transactions — List transactions with filtering and pagination
// =============================================================================
const listTransactionsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  from: z.string().optional(),
  to: z.string().optional(),
  account_id: z.coerce.number().int().optional(),
  person_id: z.coerce.number().int().optional(),
  type: z.string().optional(),
  category_id: z.coerce.number().int().optional(),
  search: z.string().optional(),
  sort: z.enum(['date_asc', 'date_desc']).default('date_desc'),
});

router.get('/', validateQuery(listTransactionsQuery), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { page, limit, from, to, account_id, person_id, type, category_id, search, sort } = req.query as any;
    const offset = (page - 1) * limit;

    // Build dynamic WHERE clause
    const conditions: string[] = ['t.user_id = $1', 't.deleted_at IS NULL'];
    const values: any[] = [userId];
    let paramIndex = 2;

    if (from) {
      conditions.push(`t.transaction_date >= $${paramIndex}`);
      values.push(from);
      paramIndex++;
    }
    if (to) {
      conditions.push(`t.transaction_date <= $${paramIndex}`);
      values.push(to);
      paramIndex++;
    }
    if (account_id) {
      conditions.push(`t.account_id = $${paramIndex}`);
      values.push(account_id);
      paramIndex++;
    }
    if (person_id) {
      conditions.push(`t.person_id = $${paramIndex}`);
      values.push(person_id);
      paramIndex++;
    }
    if (type) {
      conditions.push(`t.transaction_type = $${paramIndex}`);
      values.push(type);
      paramIndex++;
    }
    if (category_id) {
      conditions.push(`t.category_id = $${paramIndex}`);
      values.push(category_id);
      paramIndex++;
    }
    if (search) {
      conditions.push(`(t.description ILIKE $${paramIndex} OR t.reference ILIKE $${paramIndex})`);
      values.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');
    const orderClause = sort === 'date_asc'
      ? 't.transaction_date ASC, t.id ASC'
      : 't.transaction_date DESC, t.id DESC';

    // Count total
    const countResult = await db.query(
      `SELECT COUNT(*) as total
       FROM ${SCHEMA}.transactions t
       WHERE ${whereClause}`,
      values
    );

    // Fetch data
    const dataValues = [...values, limit, offset];
    const result = await db.query(
      `SELECT t.*,
              a.name as account_name,
              p.name as person_name,
              c.name as category_name
       FROM ${SCHEMA}.transactions t
       LEFT JOIN ${SCHEMA}.accounts a ON a.id = t.account_id
       LEFT JOIN ${SCHEMA}.people p ON p.id = t.person_id
       LEFT JOIN ${SCHEMA}.categories c ON c.id = t.category_id
       WHERE ${whereClause}
       ORDER BY ${orderClause}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      dataValues
    );

    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('List transactions error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to load transactions' },
    });
  }
});

// =============================================================================
// GET /api/transactions/:id
// =============================================================================
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const txId = parseInt(req.params.id);

    const result = await db.query(
      `SELECT t.*,
              a.name as account_name,
              p.name as person_name,
              c.name as category_name
       FROM ${SCHEMA}.transactions t
       LEFT JOIN ${SCHEMA}.accounts a ON a.id = t.account_id
       LEFT JOIN ${SCHEMA}.people p ON p.id = t.person_id
       LEFT JOIN ${SCHEMA}.categories c ON c.id = t.category_id
       WHERE t.id = $1 AND t.user_id = $2 AND t.deleted_at IS NULL`,
      [txId, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Transaction not found' },
      });
      return;
    }

    // If it's a transfer, also fetch transfer details
    let transfer = null;
    if (result.rows[0].transaction_type === 'TRANSFER') {
      const transferResult = await db.query(
        `SELECT tt.*,
                fa.name as from_account_name,
                ta.name as to_account_name
         FROM ${SCHEMA}.transaction_transfers tt
         JOIN ${SCHEMA}.accounts fa ON fa.id = tt.from_account_id
         JOIN ${SCHEMA}.accounts ta ON ta.id = tt.to_account_id
         WHERE tt.transaction_id = $1`,
        [txId]
      );
      transfer = transferResult.rows[0] || null;
    }

    res.json({
      success: true,
      data: { ...result.rows[0], transfer },
    });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to load transaction' },
    });
  }
});

// =============================================================================
// POST /api/transactions — Create a new transaction
// =============================================================================
const createTransactionSchema = z.object({
  transaction_type: z.enum([
    'INCOME', 'EXPENSE', 'TRANSFER',
    'LEND', 'LEND_REPAYMENT', 'BORROW', 'BORROW_REPAYMENT',
    'ADJUSTMENT',
  ]),
  transaction_date: z.string().min(1, 'Date is required'),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  account_id: z.coerce.number().int().optional(),
  person_id: z.coerce.number().int().optional(),
  category_id: z.coerce.number().int().optional(),
  loan_id: z.coerce.number().int().optional(),
  description: z.string().optional(),
  reference: z.string().optional(),
  // Transfer-specific fields
  to_account_id: z.coerce.number().int().optional(),
});

router.post('/', validateBody(createTransactionSchema), async (req: Request, res: Response) => {
  const client = await db.getClient();
  try {
    const userId = getUserId(req);
    const {
      transaction_type,
      transaction_date,
      amount,
      account_id,
      person_id,
      category_id,
      loan_id,
      description,
      reference,
      to_account_id,
    } = req.body;

    // Validate required fields based on transaction type
    const validationErrors: string[] = [];

    if (transaction_type !== 'ADJUSTMENT' && !account_id) {
      validationErrors.push('Account is required');
    }
    if (['LEND', 'LEND_REPAYMENT', 'BORROW', 'BORROW_REPAYMENT'].includes(transaction_type) && !person_id) {
      validationErrors.push('Person is required for lending/borrowing transactions');
    }
    if (transaction_type === 'TRANSFER' && !to_account_id) {
      validationErrors.push('Destination account is required for transfers');
    }
    if (transaction_type === 'TRANSFER' && account_id && to_account_id && account_id === to_account_id) {
      validationErrors.push('Source and destination accounts cannot be the same');
    }

    if (validationErrors.length > 0) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: validationErrors.join('; ') },
      });
      return;
    }

    // Verify ownership of referenced entities
    if (account_id) {
      const acc = await client.query(
        `SELECT id FROM ${SCHEMA}.accounts WHERE id = $1 AND user_id = $2`,
        [account_id, userId]
      );
      if (acc.rows.length === 0) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_ACCOUNT', message: 'Account not found' },
        });
        return;
      }
    }
    if (to_account_id) {
      const acc = await client.query(
        `SELECT id FROM ${SCHEMA}.accounts WHERE id = $1 AND user_id = $2`,
        [to_account_id, userId]
      );
      if (acc.rows.length === 0) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_ACCOUNT', message: 'Destination account not found' },
        });
        return;
      }
    }
    if (person_id) {
      const p = await client.query(
        `SELECT id FROM ${SCHEMA}.people WHERE id = $1 AND user_id = $2 AND is_active = TRUE`,
        [person_id, userId]
      );
      if (p.rows.length === 0) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_PERSON', message: 'Person not found' },
        });
        return;
      }
    }

    // Start transaction
    await client.query('BEGIN');

    // Create main transaction record
    const txResult = await client.query(
      `INSERT INTO ${SCHEMA}.transactions
       (user_id, transaction_type, transaction_date, amount, account_id, person_id, category_id, loan_id, description, reference)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [userId, transaction_type, transaction_date, amount, account_id || null, person_id || null, category_id || null, loan_id || null, description || null, reference || null]
    );
    const tx = txResult.rows[0];

    // Handle TRANSFER: create transfer record and update both accounts
    if (transaction_type === 'TRANSFER' && account_id && to_account_id) {
      await client.query(
        `INSERT INTO ${SCHEMA}.transaction_transfers (transaction_id, from_account_id, to_account_id, amount)
         VALUES ($1, $2, $3, $4)`,
        [tx.id, account_id, to_account_id, amount]
      );
    }

    // Handle LOAN_REPAYMENT: record repayment against the loan
    if (transaction_type === 'LEND_REPAYMENT' || transaction_type === 'BORROW_REPAYMENT') {
      if (loan_id) {
        await client.query(
          `INSERT INTO ${SCHEMA}.loan_repayments (loan_id, transaction_id, amount, repayment_date, notes)
           VALUES ($1, $2, $3, $4, $5)`,
          [loan_id, tx.id, amount, transaction_date, description || null]
        );
      }
    }

    await client.query('COMMIT');

    res.status(201).json({ success: true, data: tx });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create transaction error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to create transaction' },
    });
  } finally {
    client.release();
  }
});

// =============================================================================
// PATCH /api/transactions/:id — Edit a transaction
// =============================================================================
const updateTransactionSchema = z.object({
  transaction_date: z.string().optional(),
  amount: z.coerce.number().positive().optional(),
  account_id: z.coerce.number().int().optional().nullable(),
  person_id: z.coerce.number().int().optional().nullable(),
  category_id: z.coerce.number().int().optional().nullable(),
  description: z.string().optional().nullable(),
  reference: z.string().optional().nullable(),
});

router.patch('/:id', validateBody(updateTransactionSchema), async (req: Request, res: Response) => {
  const client = await db.getClient();
  try {
    const userId = getUserId(req);
    const txId = parseInt(req.params.id);

    // Fetch existing transaction
    const existing = await client.query(
      `SELECT * FROM ${SCHEMA}.transactions
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
      [txId, userId]
    );

    if (existing.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Transaction not found' },
      });
      return;
    }

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
    values.push(txId, userId);

    const result = await client.query(
      `UPDATE ${SCHEMA}.transactions
       SET ${fields.join(', ')}
       WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    await client.query('COMMIT');

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update transaction error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to update transaction' },
    });
  } finally {
    client.release();
  }
});

// =============================================================================
// DELETE /api/transactions/:id — Soft delete a transaction
// =============================================================================
router.delete('/:id', async (req: Request, res: Response) => {
  const client = await db.getClient();
  try {
    const userId = getUserId(req);
    const txId = parseInt(req.params.id);

    // Verify the transaction exists and belongs to user
    const existing = await client.query(
      `SELECT * FROM ${SCHEMA}.transactions
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
      [txId, userId]
    );

    if (existing.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Transaction not found' },
      });
      return;
    }

    await client.query('BEGIN');

    // Soft-delete the transaction
    await client.query(
      `UPDATE ${SCHEMA}.transactions SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [txId]
    );

    // If it was a loan repayment, also clean up the repayment record
    const tx = existing.rows[0];
    if (tx.transaction_type === 'LEND_REPAYMENT' || tx.transaction_type === 'BORROW_REPAYMENT') {
      await client.query(
        `UPDATE ${SCHEMA}.loan_repayments SET transaction_id = NULL
         WHERE transaction_id = $1`,
        [txId]
      );
    }

    await client.query('COMMIT');

    res.json({ success: true, data: { id: txId } });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete transaction error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to delete transaction' },
    });
  } finally {
    client.release();
  }
});

export default router;
