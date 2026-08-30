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
// GET /api/people — List all people with balance summaries
// =============================================================================
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const result = await db.query(
      `SELECT p.*,
              COALESCE(pb.amount_they_owe_you, 0) AS amount_they_owe_you,
              COALESCE(pb.amount_you_owe_them, 0) AS amount_you_owe_them
       FROM ${SCHEMA}.people p
       LEFT JOIN ${SCHEMA}.v_person_balances pb ON pb.user_id = p.user_id AND pb.person_id = p.id
       WHERE p.user_id = $1 AND p.is_active = TRUE
       ORDER BY p.name`,
      [userId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('List people error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to load people' },
    });
  }
});

// =============================================================================
// GET /api/people/:id/summary — Person summary with balance and transaction counts
// (Must be defined BEFORE /:id so Express doesn't treat 'summary' as an ID)
// =============================================================================
router.get('/:id/summary', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const personId = req.params.id;

    const personResult = await db.query(
      `SELECT p.*,
              COALESCE(pb.amount_they_owe_you, 0) AS amount_they_owe_you,
              COALESCE(pb.amount_you_owe_them, 0) AS amount_you_owe_them,
              COALESCE(pb.total_lent, 0) AS total_lent,
              COALESCE(pb.total_lent_repaid, 0) AS total_lent_repaid,
              COALESCE(pb.total_borrowed, 0) AS total_borrowed,
              COALESCE(pb.total_borrow_repaid, 0) AS total_borrow_repaid
       FROM ${SCHEMA}.people p
       LEFT JOIN ${SCHEMA}.v_person_balances pb ON pb.user_id = p.user_id AND pb.person_id = p.id
       WHERE p.user_id = $1 AND p.id = $2`,
      [userId, personId]
    );

    if (personResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Person not found' },
      });
      return;
    }

    const txCount = await db.query(
      `SELECT COUNT(*) as total FROM ${SCHEMA}.transactions
       WHERE user_id = $1 AND person_id = $2 AND deleted_at IS NULL`,
      [userId, personId]
    );

    const loanCount = await db.query(
      `SELECT COUNT(*) as total FROM ${SCHEMA}.loans
       WHERE user_id = $1 AND person_id = $2`,
      [userId, personId]
    );

    res.json({
      success: true,
      data: {
        ...personResult.rows[0],
        transaction_count: parseInt(txCount.rows[0].total),
        loan_count: parseInt(loanCount.rows[0].total),
      },
    });
  } catch (error) {
    console.error('Person summary error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to load person summary' },
    });
  }
});

// =============================================================================
// GET /api/people/:id — Get a single person
// =============================================================================
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const personId = req.params.id;

    const result = await db.query(
      `SELECT p.*,
              COALESCE(pb.amount_they_owe_you, 0) AS amount_they_owe_you,
              COALESCE(pb.amount_you_owe_them, 0) AS amount_you_owe_them,
              COALESCE(pb.total_lent, 0) AS total_lent,
              COALESCE(pb.total_lent_repaid, 0) AS total_lent_repaid,
              COALESCE(pb.total_borrowed, 0) AS total_borrowed,
              COALESCE(pb.total_borrow_repaid, 0) AS total_borrow_repaid
       FROM ${SCHEMA}.people p
       LEFT JOIN ${SCHEMA}.v_person_balances pb ON pb.user_id = p.user_id AND pb.person_id = p.id
       WHERE p.user_id = $1 AND p.id = $2`,
      [userId, personId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Person not found' },
      });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get person error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to load person' },
    });
  }
});

// =============================================================================
// POST /api/people — Create a new person
// =============================================================================
const createPersonSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  phone: z.string().max(50).optional(),
  email: z.string().email().optional().or(z.literal('')),
  notes: z.string().optional(),
});

router.post('/', validateBody(createPersonSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { name, phone, email, notes } = req.body;
    const id = generateId('people');

    const result = await db.query(
      `INSERT INTO ${SCHEMA}.people (id, user_id, name, phone, email, notes)
       VALUES ($1, $2, $3, NULLIF($4, ''), $5, $6)
       RETURNING *`,
      [id, userId, name, phone || null, email || null, notes || null]
    );

    res.status(201).json({
      success: true,
      data: { ...result.rows[0], amount_they_owe_you: 0, amount_you_owe_them: 0 },
    });
  } catch (error) {
    console.error('Create person error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to create person' },
    });
  }
});

// =============================================================================
// PATCH /api/people/:id — Update a person
// =============================================================================
const updatePersonSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  phone: z.string().max(50).optional().nullable(),
  email: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
});

router.patch('/:id', validateBody(updatePersonSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const personId = req.params.id;
    const updates = req.body;

    const ALLOWED_FIELDS = ['name', 'phone', 'email', 'notes', 'is_active'];
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
    values.push(userId, personId);

    const result = await db.query(
      `UPDATE ${SCHEMA}.people
       SET ${fields.join(', ')}
       WHERE user_id = $${paramIndex} AND id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Person not found' },
      });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update person error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to update person' },
    });
  }
});

// =============================================================================
// DELETE /api/people/:id — Delete a person
// =============================================================================
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const personId = req.params.id;

    const balanceResult = await db.query(
      `SELECT * FROM ${SCHEMA}.v_person_balances
       WHERE user_id = $1 AND person_id = $2`,
      [userId, personId]
    );

    if (balanceResult.rows.length > 0) {
      const b = balanceResult.rows[0];
      if (parseFloat(b.amount_they_owe_you) > 0 || parseFloat(b.amount_you_owe_them) > 0) {
        res.status(409).json({
          success: false,
          error: {
            code: 'OUTSTANDING_BALANCE',
            message: 'Cannot delete a person with outstanding balances. Set them inactive instead.',
          },
        });
        return;
      }
    }

    const result = await db.query(
      `UPDATE ${SCHEMA}.people SET is_active = FALSE, updated_at = NOW()
       WHERE user_id = $1 AND id = $2
       RETURNING id`,
      [userId, personId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Person not found' },
      });
      return;
    }

    res.json({ success: true, data: { id: result.rows[0].id } });
  } catch (error) {
    console.error('Delete person error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to delete person' },
    });
  }
});

// =============================================================================
// GET /api/people/:id/transactions — Transaction history with a person
// =============================================================================
router.get('/:id/transactions', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const personId = req.params.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 30;
    const offset = (page - 1) * limit;

    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM ${SCHEMA}.transactions
       WHERE user_id = $1 AND person_id = $2 AND deleted_at IS NULL`,
      [userId, personId]
    );

    const result = await db.query(
      `SELECT t.*, a.name as account_name, c.name as category_name
       FROM ${SCHEMA}.transactions t
       LEFT JOIN ${SCHEMA}.accounts a ON a.id = t.account_id
       LEFT JOIN ${SCHEMA}.categories c ON c.id = t.category_id
       WHERE t.user_id = $1 AND t.person_id = $2 AND t.deleted_at IS NULL
       ORDER BY t.transaction_date DESC, t.id DESC
       LIMIT $3 OFFSET $4`,
      [userId, personId, limit, offset]
    );

    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Get person transactions error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to load transactions' },
    });
  }
});

export default router;
