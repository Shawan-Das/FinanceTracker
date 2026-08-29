import { db } from '../database/connection';
import { generateId } from '../shared/id';

const SCHEMA = 'finance_tracker';

const MAX_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10);
const LOCKOUT_MINUTES = parseInt(process.env.LOCKOUT_DURATION_MINUTES || '10', 10);

/**
 * Check if an account is currently locked.
 */
export async function isAccountLocked(email: string): Promise<{ locked: boolean; remainingSeconds?: number }> {
  const result = await db.query(
    `SELECT is_locked, locked_until
     FROM ${SCHEMA}.users
     WHERE email = $1`,
    [email]
  );

  if (result.rows.length === 0) {
    return { locked: false };
  }

  const user = result.rows[0];

  if (!user.is_locked || !user.locked_until) {
    return { locked: false };
  }

  const lockExpiry = new Date(user.locked_until);
  const now = new Date();

  if (now >= lockExpiry) {
    // Lock has expired — unlock the account
    await db.query(
      `UPDATE ${SCHEMA}.users
       SET is_locked = FALSE, locked_until = NULL, failed_login_attempts = 0
       WHERE email = $1`,
      [email]
    );
    return { locked: false };
  }

  const remainingSeconds = Math.ceil((lockExpiry.getTime() - now.getTime()) / 1000);
  return { locked: true, remainingSeconds };
}

/**
 * Record a failed login attempt.
 * If max attempts reached, lock the account.
 */
export async function recordFailedLogin(
  email: string,
  ipAddress?: string,
): Promise<{ locked: boolean; attemptsRemaining: number; lockDurationMinutes?: number }> {
  // Record the attempt
  const id = generateId('login_attempts');
  await db.query(
    `INSERT INTO ${SCHEMA}.login_attempts (id, email, ip_address, success)
     VALUES ($1, $2, $3, FALSE)`,
    [id, email, ipAddress || null]
  );

  // Increment failed attempts on the user
  const result = await db.query(
    `UPDATE ${SCHEMA}.users
     SET failed_login_attempts = failed_login_attempts + 1,
         last_failed_login = NOW(),
         updated_at = NOW()
     WHERE email = $1
     RETURNING failed_login_attempts`,
    [email]
  );

  if (result.rows.length === 0) {
    return { locked: false, attemptsRemaining: MAX_ATTEMPTS };
  }

  const attempts = result.rows[0].failed_login_attempts;
  const attemptsRemaining = MAX_ATTEMPTS - attempts;

  if (attempts >= MAX_ATTEMPTS) {
    // Lock the account
    const lockUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
    await db.query(
      `UPDATE ${SCHEMA}.users
       SET is_locked = TRUE, locked_until = $1, updated_at = NOW()
       WHERE email = $2`,
      [lockUntil, email]
    );
    return { locked: true, attemptsRemaining: 0, lockDurationMinutes: LOCKOUT_MINUTES };
  }

  return { locked: false, attemptsRemaining };
}

/**
 * Reset failed login attempts on successful login.
 */
export async function resetFailedLogins(email: string): Promise<void> {
  await db.query(
    `UPDATE ${SCHEMA}.users
     SET failed_login_attempts = 0,
         is_locked = FALSE,
         locked_until = NULL,
         last_failed_login = NULL,
         updated_at = NOW()
     WHERE email = $1`,
    [email]
  );

  // Record successful attempt
  const id = generateId('login_attempts');
  await db.query(
    `INSERT INTO ${SCHEMA}.login_attempts (id, email, success)
     VALUES ($1, $2, TRUE)`,
    [id, email]
  );
}
