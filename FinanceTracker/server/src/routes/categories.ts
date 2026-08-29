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
// GET /api/categories
// =============================================================================
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const result = await db.query(
      `SELECT * FROM ${SCHEMA}.categories
       WHERE user_id = $1 AND is_active = TRUE
       ORDER BY type, name`,
      [userId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('List categories error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to load categories' },
    });
  }
});

// =============================================================================
// POST /api/categories
// =============================================================================
const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  type: z.enum(['INCOME', 'EXPENSE']),
  icon: z.string().max(50).optional(),
  color: z.string().max(7).optional(),
});

router.post('/', validateBody(createCategorySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { name, type, icon, color } = req.body;
    const id = generateId('categories');

    const result = await db.query(
      `INSERT INTO ${SCHEMA}.categories (id, user_id, name, type, icon, color)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, userId, name, type, icon || null, color || null]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    if (error.code === '23505') {
      res.status(409).json({
        success: false,
        error: { code: 'DUPLICATE', message: 'A category with this name and type already exists' },
      });
      return;
    }
    console.error('Create category error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to create category' },
    });
  }
});

// =============================================================================
// PATCH /api/categories/:id
// =============================================================================
const updateCategorySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  icon: z.string().max(50).optional().nullable(),
  color: z.string().max(7).optional().nullable(),
  is_active: z.boolean().optional(),
});

router.patch('/:id', validateBody(updateCategorySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const categoryId = req.params.id;
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
    values.push(userId, categoryId);

    const result = await db.query(
      `UPDATE ${SCHEMA}.categories
       SET ${fields.join(', ')}
       WHERE user_id = $${paramIndex} AND id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Category not found' },
      });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to update category' },
    });
  }
});

// =============================================================================
// DELETE /api/categories/:id
// =============================================================================
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const categoryId = req.params.id;

    const result = await db.query(
      `UPDATE ${SCHEMA}.categories SET is_active = FALSE, updated_at = NOW()
       WHERE user_id = $1 AND id = $2
       RETURNING id`,
      [userId, categoryId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Category not found' },
      });
      return;
    }

    res.json({ success: true, data: { id: result.rows[0].id } });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to delete category' },
    });
  }
});

export default router;
