import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../database/connection';
import { requireAuth, getUserId } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validation';
import { generateId } from '../shared/id';

import { generateVoucherBuffer, VoucherType } from '../services/voucher';
import { sendTransactionReceipt } from '../services/email';

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
  account_id: z.string().optional(),
  person_id: z.string().optional(),
  type: z.string().optional(),
  category_id: z.string().optional(),
  search: z.string().optional(),
  sort: z.enum(['date_asc', 'date_desc']).default('date_desc'),
});

router.get('/', validateQuery(listTransactionsQuery), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { page, limit, from, to, account_id, person_id, type, category_id, search, sort } = req.query as any;
    const offset = (page - 1) * limit;

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
      ? 't.transaction_date ASC, t.created_at ASC'
      : 't.transaction_date DESC, t.created_at DESC';

    const countResult = await db.query(
      `SELECT COUNT(*) as total
       FROM ${SCHEMA}.transactions t
       WHERE ${whereClause}`,
      values
    );

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
// GET /api/transactions/export — Export transactions as CSV or JSON
// (Must be defined BEFORE /:id so Express doesn't treat 'export' as an ID)
// =============================================================================
router.get('/export', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const format = (req.query.format as string) || 'json';
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const type = req.query.type as string | undefined;

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
    if (type) {
      conditions.push(`t.transaction_type = $${paramIndex}`);
      values.push(type);
      paramIndex++;
    }

    const result = await db.query(
      `SELECT t.transaction_date, t.transaction_type, t.amount,
              a.name AS account_name, p.name AS person_name,
              c.name AS category_name, t.description, t.reference,
              t.created_at
       FROM ${SCHEMA}.transactions t
       LEFT JOIN ${SCHEMA}.accounts a ON a.id = t.account_id
       LEFT JOIN ${SCHEMA}.people p ON p.id = t.person_id
       LEFT JOIN ${SCHEMA}.categories c ON c.id = t.category_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY t.transaction_date ASC, t.created_at ASC`,
      values
    );

    if (format === 'csv') {
      const headers = ['Date', 'Type', 'Amount', 'Account', 'Person', 'Category', 'Description', 'Reference'];
      const rows = result.rows.map((r: any) => [
        r.transaction_date,
        r.transaction_type,
        r.amount,
        r.account_name || '',
        r.person_name || '',
        r.category_name || '',
        r.description || '',
        r.reference || '',
      ]);

      const csv = [headers.join(','), ...rows.map((row: any[]) =>
        row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      )].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
      res.send(csv);
    } else {
      res.json({ success: true, data: result.rows });
    }
  } catch (error) {
    console.error('Export transactions error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to export transactions' },
    });
  }
});

// =============================================================================
// GET /api/transactions/:id/voucher — Generate PDF voucher for a transaction
// (Must be defined BEFORE /:id so Express doesn't treat 'voucher' as an ID)
// =============================================================================
router.get('/:id/voucher', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const txId = req.params.id;
    const voucherType: VoucherType = (req.query.type as VoucherType) || 'voucher';

    // Fetch transaction with all related data
    const txResult = await db.query(
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

    if (txResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Transaction not found' },
      });
      return;
    }

    const tx = txResult.rows[0];

    // Fetch user info
    const userResult = await db.query(
      `SELECT full_name, email FROM ${SCHEMA}.users WHERE id = $1`,
      [userId]
    );
    const user = userResult.rows[0] || { full_name: 'User', email: '' };

    // Fetch transfer details if applicable
    let fromAccountName: string | null = null;
    let toAccountName: string | null = null;
    if (tx.transaction_type === 'TRANSFER') {
      const ttResult = await db.query(
        `SELECT fa.name as from_name, ta.name as to_name
         FROM ${SCHEMA}.transaction_transfers tt
         JOIN ${SCHEMA}.accounts fa ON fa.id = tt.from_account_id
         JOIN ${SCHEMA}.accounts ta ON ta.id = tt.to_account_id
         WHERE tt.transaction_id = $1`,
        [txId]
      );
      if (ttResult.rows.length > 0) {
        fromAccountName = ttResult.rows[0].from_name;
        toAccountName = ttResult.rows[0].to_name;
      }
    }

    // Generate PDF Buffer
    const pdfBuffer = await generateVoucherBuffer(
      {
        id: tx.id,
        transaction_type: tx.transaction_type,
        transaction_date: tx.transaction_date,
        amount: parseFloat(tx.amount),
        description: tx.description,
        reference: tx.reference,
        account_name: tx.account_name,
        person_name: tx.person_name,
        category_name: tx.category_name,
        user_name: user.full_name,
        user_email: user.email,
        from_account_name: fromAccountName,
        to_account_name: toAccountName,
      },
      voucherType,
    );

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${voucherType}-${tx.id}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);
  } catch (error) {
    console.error('Generate voucher error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to generate voucher' },
    });
  }
});

// =============================================================================
// GET /api/transactions/:id
// =============================================================================
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const txId = req.params.id;

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
  account_id: z.string().optional(),
  person_id: z.string().optional(),
  category_id: z.string().optional(),
  loan_id: z.string().optional(),
  description: z.string().optional(),
  reference: z.string().optional(),
  to_account_id: z.string().optional(),
  send_receipt: z.boolean().optional().default(false),
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
      send_receipt,
    } = req.body;

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
    if (category_id) {
      const expectedType = transaction_type === 'INCOME' ? 'INCOME' : 'EXPENSE';
      const c = await client.query(
        `SELECT id, type FROM ${SCHEMA}.categories WHERE id = $1 AND user_id = $2 AND is_active = TRUE`,
        [category_id, userId]
      );
      if (c.rows.length === 0) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_CATEGORY', message: 'Category not found' },
        });
        return;
      }
      if (['INCOME', 'EXPENSE'].includes(transaction_type) && c.rows[0].type !== expectedType) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_CATEGORY', message: `Category type '${c.rows[0].type}' does not match transaction type '${transaction_type}'` },
        });
        return;
      }
    }

    await client.query('BEGIN');

    const txId = generateId('transactions');
    const txResult = await client.query(
      `INSERT INTO ${SCHEMA}.transactions
       (id, user_id, transaction_type, transaction_date, amount, account_id, person_id, category_id, loan_id, description, reference)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [txId, userId, transaction_type, transaction_date, amount, account_id || null, person_id || null, category_id || null, loan_id || null, description || null, reference || null]
    );
    const tx = txResult.rows[0];

    if (transaction_type === 'TRANSFER' && account_id && to_account_id) {
      const tfrId = generateId('transaction_transfers');
      await client.query(
        `INSERT INTO ${SCHEMA}.transaction_transfers (id, transaction_id, from_account_id, to_account_id, amount)
         VALUES ($1, $2, $3, $4, $5)`,
        [tfrId, tx.id, account_id, to_account_id, amount]
      );
    }

    if (transaction_type === 'LEND_REPAYMENT' || transaction_type === 'BORROW_REPAYMENT') {
      if (loan_id) {
        const lreId = generateId('loan_repayments');
        await client.query(
          `INSERT INTO ${SCHEMA}.loan_repayments (id, loan_id, transaction_id, amount, repayment_date, notes)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [lreId, loan_id, tx.id, amount, transaction_date, description || null]
        );
      }
    }

    await client.query('COMMIT');

    res.status(201).json({ success: true, data: tx });

    // ── Fire-and-forget: send receipt to the other party ──
    if (send_receipt && person_id && ['LEND', 'BORROW', 'LEND_REPAYMENT', 'BORROW_REPAYMENT'].includes(transaction_type)) {
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

          await sendTransactionReceipt({
            to: person.email,
            senderName: userName,
            recipientName: person.name,
            transactionType: tx.transaction_type,
            amount: parseFloat(tx.amount),
            date: tx.transaction_date,
            description: tx.description,
          });
        } catch (err) {
          console.error('Failed to send transaction receipt:', err);
        }
      })();
    }
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
  account_id: z.string().optional().nullable(),
  person_id: z.string().optional().nullable(),
  category_id: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  reference: z.string().optional().nullable(),
});

router.patch('/:id', validateBody(updateTransactionSchema), async (req: Request, res: Response) => {
  const client = await db.getClient();
  try {
    const userId = getUserId(req);
    const txId = req.params.id;

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

    // Validate that referenced entities belong to the user
    if (updates.account_id) {
      const acc = await client.query(
        `SELECT id FROM ${SCHEMA}.accounts WHERE id = $1 AND user_id = $2`,
        [updates.account_id, userId]
      );
      if (acc.rows.length === 0) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_ACCOUNT', message: 'Account not found' },
        });
        return;
      }
    }
    if (updates.person_id) {
      const p = await client.query(
        `SELECT id FROM ${SCHEMA}.people WHERE id = $1 AND user_id = $2 AND is_active = TRUE`,
        [updates.person_id, userId]
      );
      if (p.rows.length === 0) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_PERSON', message: 'Person not found' },
        });
        return;
      }
    }
    if (updates.category_id) {
      const c = await client.query(
        `SELECT id FROM ${SCHEMA}.categories WHERE id = $1 AND user_id = $2 AND is_active = TRUE`,
        [updates.category_id, userId]
      );
      if (c.rows.length === 0) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_CATEGORY', message: 'Category not found' },
        });
        return;
      }
    }

    const ALLOWED_FIELDS = ['transaction_date', 'amount', 'account_id', 'person_id', 'category_id', 'description', 'reference'];
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
    values.push(txId, userId);

    const result = await client.query(
      `UPDATE ${SCHEMA}.transactions
       SET ${fields.join(', ')}
       WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    // If this is a loan repayment and amount was changed, sync loan_repayments
    const tx = existing.rows[0];
    if ((tx.transaction_type === 'LEND_REPAYMENT' || tx.transaction_type === 'BORROW_REPAYMENT') && req.body.amount !== undefined) {
      const newAmount = parseFloat(req.body.amount);
      const oldAmount = parseFloat(tx.amount);

      if (newAmount !== oldAmount) {
        await client.query(
          `UPDATE ${SCHEMA}.loan_repayments SET amount = $1 WHERE transaction_id = $2`,
          [newAmount, txId]
        );

        if (tx.loan_id) {
          const loanResult = await client.query(
            `SELECT l.*,
                    COALESCE(lr.total_repaid, 0) AS total_repaid
             FROM ${SCHEMA}.loans l
             LEFT JOIN (
               SELECT lr2.loan_id, SUM(lr2.amount) as total_repaid
               FROM ${SCHEMA}.loan_repayments lr2
               INNER JOIN ${SCHEMA}.transactions t ON t.id = lr2.transaction_id AND t.deleted_at IS NULL
               GROUP BY lr2.loan_id
             ) lr ON lr.loan_id = l.id
             WHERE l.id = $1`,
            [tx.loan_id]
          );
          if (loanResult.rows.length > 0) {
            const loan = loanResult.rows[0];
            const totalDue = parseFloat(loan.principal_amount) + parseFloat(loan.interest_amount);
            const totalRepaid = parseFloat(loan.total_repaid || '0');
            if (loan.status === 'PAID' && totalRepaid < totalDue) {
              await client.query(
                `UPDATE ${SCHEMA}.loans SET status = 'ACTIVE', updated_at = NOW() WHERE id = $1`,
                [tx.loan_id]
              );
            }
            if (loan.status === 'ACTIVE' && totalRepaid >= totalDue) {
              await client.query(
                `UPDATE ${SCHEMA}.loans SET status = 'PAID', updated_at = NOW() WHERE id = $1`,
                [tx.loan_id]
              );
            }
          }
        }
      }
    }

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
    const txId = req.params.id;

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

    await client.query(
      `UPDATE ${SCHEMA}.transactions SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [txId]
    );

    const tx = existing.rows[0];
    if (tx.transaction_type === 'LEND_REPAYMENT' || tx.transaction_type === 'BORROW_REPAYMENT') {
      await client.query(
        `DELETE FROM ${SCHEMA}.loan_repayments WHERE transaction_id = $1`,
        [txId]
      );

      if (tx.loan_id) {
        const loanResult = await client.query(
          `SELECT l.*,
                  COALESCE(lr.total_repaid, 0) AS total_repaid
           FROM ${SCHEMA}.loans l
           LEFT JOIN (
             SELECT lr2.loan_id, SUM(lr2.amount) as total_repaid
             FROM ${SCHEMA}.loan_repayments lr2
             INNER JOIN ${SCHEMA}.transactions t ON t.id = lr2.transaction_id AND t.deleted_at IS NULL
             WHERE lr2.loan_id = $1
             GROUP BY lr2.loan_id
           ) lr ON lr.loan_id = l.id
           WHERE l.id = $1`,
          [tx.loan_id]
        );
        if (loanResult.rows.length > 0) {
          const loan = loanResult.rows[0];
          const totalDue = parseFloat(loan.principal_amount) + parseFloat(loan.interest_amount);
          const totalRepaid = parseFloat(loan.total_repaid || '0');
          if (loan.status === 'PAID' && totalRepaid < totalDue) {
            await client.query(
              `UPDATE ${SCHEMA}.loans SET status = 'ACTIVE', updated_at = NOW() WHERE id = $1`,
              [tx.loan_id]
            );
          }
        }
      }
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
