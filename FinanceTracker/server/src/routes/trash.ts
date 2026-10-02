import { Router, Request, Response } from 'express';
import { db } from '../database/connection';
import { requireAuth, getUserId } from '../middleware/auth';

const router = Router();
const SCHEMA = 'finance_tracker';

router.use(requireAuth);

// =============================================================================
// GET /api/trash/counts — Get total and per-entity count of deleted items
// =============================================================================
router.get('/counts', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);

    const [txCount, catCount, accCount, pplCount] = await Promise.all([
      db.query(
        `SELECT COUNT(*)::int as count FROM ${SCHEMA}.transactions
         WHERE user_id = $1 AND deleted_at IS NOT NULL`,
        [userId]
      ),
      db.query(
        `SELECT COUNT(*)::int as count FROM ${SCHEMA}.categories
         WHERE user_id = $1 AND is_active = FALSE`,
        [userId]
      ),
      db.query(
        `SELECT COUNT(*)::int as count FROM ${SCHEMA}.accounts
         WHERE user_id = $1 AND is_active = FALSE`,
        [userId]
      ),
      db.query(
        `SELECT COUNT(*)::int as count FROM ${SCHEMA}.people
         WHERE user_id = $1 AND is_active = FALSE`,
        [userId]
      ),
    ]);

    const transactions = txCount.rows[0]?.count || 0;
    const categories = catCount.rows[0]?.count || 0;
    const accounts = accCount.rows[0]?.count || 0;
    const people = pplCount.rows[0]?.count || 0;
    const total = transactions + categories + accounts + people;

    res.json({
      success: true,
      data: {
        transactions,
        categories,
        accounts,
        people,
        total,
      },
    });
  } catch (error) {
    console.error('Get trash counts error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to load recycle bin counts' },
    });
  }
});

// =============================================================================
// POST /api/trash/restore-all/:type — Restore all deleted items of a specific type
// =============================================================================
router.post('/restore-all/:type', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { type } = req.params;

    if (!['transactions', 'categories', 'accounts', 'people'].includes(type)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_TYPE', message: 'Invalid entity type' },
      });
      return;
    }

    let restoredCount = 0;

    if (type === 'transactions') {
      const result = await db.query(
        `UPDATE ${SCHEMA}.transactions
         SET deleted_at = NULL, updated_at = NOW()
         WHERE user_id = $1 AND deleted_at IS NOT NULL
         RETURNING id`,
        [userId]
      );
      restoredCount = result.rowCount || 0;
    } else if (type === 'categories') {
      const result = await db.query(
        `UPDATE ${SCHEMA}.categories c
         SET is_active = TRUE, updated_at = NOW()
         WHERE c.user_id = $1 AND c.is_active = FALSE
           AND NOT EXISTS (
             SELECT 1 FROM ${SCHEMA}.categories active
             WHERE active.user_id = c.user_id
               AND LOWER(active.name) = LOWER(c.name)
               AND active.type = c.type
               AND active.is_active = TRUE
           )
         RETURNING id`,
        [userId]
      );
      restoredCount = result.rowCount || 0;
    } else if (type === 'accounts') {
      const result = await db.query(
        `UPDATE ${SCHEMA}.accounts a
         SET is_active = TRUE, updated_at = NOW()
         WHERE a.user_id = $1 AND a.is_active = FALSE
           AND NOT EXISTS (
             SELECT 1 FROM ${SCHEMA}.accounts active
             WHERE active.user_id = a.user_id
               AND LOWER(active.name) = LOWER(a.name)
               AND active.is_active = TRUE
           )
         RETURNING id`,
        [userId]
      );
      restoredCount = result.rowCount || 0;
    } else if (type === 'people') {
      const result = await db.query(
        `UPDATE ${SCHEMA}.people
         SET is_active = TRUE, updated_at = NOW()
         WHERE user_id = $1 AND is_active = FALSE
         RETURNING id`,
        [userId]
      );
      restoredCount = result.rowCount || 0;
    }

    res.json({
      success: true,
      data: { type, restoredCount },
    });
  } catch (error) {
    console.error('Restore all error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to restore items' },
    });
  }
});

export default router;
