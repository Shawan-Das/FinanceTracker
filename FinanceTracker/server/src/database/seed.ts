import { db } from './connection';
import { generateId } from '../shared/id';

const SCHEMA = 'finance_tracker';

// =============================================================================
// Default categories seeded on user registration
// =============================================================================
const DEFAULT_INCOME_CATEGORIES = [
  'Salary',
  'Bonus',
  'Freelance',
  'Business Income',
  'Gift Received',
  'Interest',
  'Other Income',
];

const DEFAULT_EXPENSE_CATEGORIES = [
  'Food',
  'Transport',
  'Rent',
  'Shopping',
  'Utilities',
  'Entertainment',
  'Education',
  'Medical',
  'Other Expense',
];

/**
 * Seed default categories for a newly registered user.
 * Uses INSERT ... ON CONFLICT DO NOTHING to be idempotent.
 */
export async function seedDefaultCategories(userId: string): Promise<void> {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    for (const name of DEFAULT_INCOME_CATEGORIES) {
      const id = generateId('categories');
      await client.query(
        `INSERT INTO ${SCHEMA}.categories (id, user_id, name, type)
         VALUES ($1, $2, $3, 'INCOME')
         ON CONFLICT (user_id, name, type) DO NOTHING`,
        [id, userId, name]
      );
    }

    for (const name of DEFAULT_EXPENSE_CATEGORIES) {
      const id = generateId('categories');
      await client.query(
        `INSERT INTO ${SCHEMA}.categories (id, user_id, name, type)
         VALUES ($1, $2, $3, 'EXPENSE')
         ON CONFLICT (user_id, name, type) DO NOTHING`,
        [id, userId, name]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
