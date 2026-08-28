import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../database/connection';
import { requireAuth, getUserId } from '../middleware/auth';
import { validateBody } from '../middleware/validation';

const router = Router();
const SCHEMA = 'finance_tracker';

router.use(requireAuth);

// =============================================================================
// GET /api/accounts — List all accounts with current balance
// =============================================================================
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const result = await db.query(
      `SELECT * FROM ${SCHEMA}.v_account_balances
       WHERE user_id = $1
       ORDER BY account_type, name`,
      [userId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('List accounts error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to load accounts' },
    });
  }
});

// =============================================================================
// GET /api/accounts/:id — Get a single account
// =============================================================================
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const accountId = parseInt(req.params.id);

    const result = await db.query(
      `SELECT * FROM ${SCHEMA}.v_account_balances
       WHERE user_id = $1 AND account_id = $2`,
      [userId, accountId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Account not found' },
      });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get account error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to load account' },
    });
  }
});

// =============================================================================
// POST /api/accounts — Create a new account
// =============================================================================
const createAccountSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  account_type: z.enum(['BANK', 'CASH', 'MOBILE_WALLET', 'OTHER']),
  currency: z.string().min(2).max(3).default('BDT'),
  opening_balance: z.coerce.number().default(0),
  opening_balance_date: z.string().optional(),
  notes: z.string().optional(),
});

router.post('/', validateBody(createAccountSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { name, account_type, currency, opening_balance, opening_balance_date, notes } = req.body;

    const result = await db.query(
      `INSERT INTO ${SCHEMA}.accounts (user_id, name, account_type, currency, opening_balance, opening_balance_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, name, account_type, currency, opening_balance, opening_balance_date || new Date().toISOString().split('T')[0], notes]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    if (error.code === '23505') {
      res.status(409).json({
        success: false,
        error: { code: 'DUPLICATE', message: 'An account with this name already exists' },
      });
      return;
    }
    console.error('Create account error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to create account' },
    });
  }
});

// =============================================================================
// PATCH /api/accounts/:id — Update an account
// =============================================================================
const updateAccountSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  account_type: z.enum(['BANK', 'CASH', 'MOBILE_WALLET', 'OTHER']).optional(),
  opening_balance: z.coerce.number().optional(),
  opening_balance_date: z.string().optional(),
  is_active: z.boolean().optional(),
  notes: z.string().optional(),
});

router.patch('/:id', validateBody(updateAccountSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const accountId = parseInt(req.params.id);
    const updates = req.body;

    // Build dynamic SET clause
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
    values.push(userId, accountId);

    const result = await db.query(
      `UPDATE ${SCHEMA}.accounts
       SET ${fields.join(', ')}
       WHERE user_id = $${paramIndex} AND id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Account not found' },
      });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update account error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to update account' },
    });
  }
});

// =============================================================================
// DELETE /api/accounts/:id — Soft delete an account
// =============================================================================
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const accountId = parseInt(req.params.id);

    // Check if account has transactions
    const txResult = await db.query(
      `SELECT COUNT(*) as count FROM ${SCHEMA}.transactions
       WHERE user_id = $1 AND account_id = $2 AND deleted_at IS NULL`,
      [userId, accountId]
    );

    if (parseInt(txResult.rows[0].count) > 0) {
      res.status(409).json({
        success: false,
        error: {
          code: 'ACCOUNT_HAS_TRANSACTIONS',
          message: 'Cannot delete an account with existing transactions. Deactivate it instead.',
        },
      });
      return;
    }

    const result = await db.query(
      `DELETE FROM ${SCHEMA}.accounts
       WHERE user_id = $1 AND id = $2
       RETURNING id`,
      [userId, accountId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Account not found' },
      });
      return;
    }

    res.json({ success: true, data: { id: result.rows[0].id } });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to delete account' },
    });
  }
});

// =============================================================================
// GET /api/accounts/:id/transactions — Account transaction history
// =============================================================================
router.get('/:id/transactions', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const accountId = parseInt(req.params.id);

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 30;
    const offset = (page - 1) * limit;

    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM ${SCHEMA}.transactions
       WHERE user_id = $1 AND account_id = $2 AND deleted_at IS NULL`,
      [userId, accountId]
    );

    const result = await db.query(
      `SELECT t.*, p.name as person_name, c.name as category_name
       FROM ${SCHEMA}.transactions t
       LEFT JOIN ${SCHEMA}.people p ON p.id = t.person_id
       LEFT JOIN ${SCHEMA}.categories c ON c.id = t.category_id
       WHERE t.user_id = $1 AND t.account_id = $2 AND t.deleted_at IS NULL
       ORDER BY t.transaction_date DESC, t.id DESC
       LIMIT $3 OFFSET $4`,
      [userId, accountId, limit, offset]
    );

    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get account transactions error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to load transactions' },
    });
  }
});

export default router;
