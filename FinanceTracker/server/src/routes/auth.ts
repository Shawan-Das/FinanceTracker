import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { db } from '../database/connection';
import { seedDefaultCategories } from '../database/seed';
import { requireAuth, getUserId } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { authLimiter, sensitiveLimiter } from '../middleware/rateLimit';
import { isAccountLocked, recordFailedLogin, resetFailedLogins } from '../services/lockout';
import { sendVerificationCode, generateVerificationCode } from '../services/email';
import { generateId } from '../shared/id';
import { signToken, setTokenCookie, clearTokenCookie } from '../shared/token';

const router = Router();
const SCHEMA = 'finance_tracker';

const CODE_EXPIRY_MINUTES = parseInt(process.env.VERIFICATION_CODE_EXPIRY_MINUTES || '15', 10);

// =============================================================================
// Helper: Generate and store verification code
// =============================================================================
async function createVerificationCode(
  userId: string,
  purpose: 'registration' | 'password_reset',
): Promise<string> {
  // Invalidate any existing codes for this purpose
  await db.query(
    `UPDATE ${SCHEMA}.email_verifications
     SET used = TRUE
     WHERE user_id = $1 AND purpose = $2 AND used = FALSE`,
    [userId, purpose]
  );

  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);
  const id = generateId('email_verifications');
  await db.query(
    `INSERT INTO ${SCHEMA}.email_verifications (id, user_id, code, purpose, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, userId, code, purpose, expiresAt]
  );

  return code;
}

// =============================================================================
// POST /api/auth/register — Step 1: Create account (unverified)
// =============================================================================
const registerSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(255),
  email: z.string().email('Invalid email address').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirm_password: z.string(),
}).refine((data) => data.password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
});

router.post('/register', authLimiter, validateBody(registerSchema), async (req: Request, res: Response) => {
  try {
    const { full_name, email, password } = req.body;

    // Check if email already exists
    const existing = await db.query(
      `SELECT id, is_verified FROM ${SCHEMA}.users WHERE email = $1`,
      [email]
    );

    if (existing.rows.length > 0) {
      const user = existing.rows[0];
      if (user.is_verified) {
        res.status(409).json({
          success: false,
          error: { code: 'EMAIL_EXISTS', message: 'An account with this email already exists' },
        });
        return;
      }
      // Unverified account exists — resend verification code
      const code = await createVerificationCode(user.id, 'registration');
      await sendVerificationCode(email, code, 'registration');

      res.status(200).json({
        success: true,
        data: {
          message: 'Account already pending verification. A new code has been sent.',
          user_id: user.id,
          email,
        },
      });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Insert user (unverified)
    const userId = generateId('users');
    const result = await db.query(
      `INSERT INTO ${SCHEMA}.users (id, full_name, email, password_hash, is_verified)
       VALUES ($1, $2, $3, $4, FALSE)
       RETURNING id, full_name, email`,
      [userId, full_name, email, passwordHash]
    );

    const user = result.rows[0];

    // Generate and send verification code
    const code = await createVerificationCode(user.id, 'registration');
    await sendVerificationCode(email, code, 'registration');

    res.status(201).json({
      success: true,
      data: {
        message: 'Account created. Please check your email for a verification code.',
        user_id: user.id,
        email,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'An unexpected error occurred' },
    });
  }
});

// =============================================================================
// POST /api/auth/verify-email — Step 2: Verify email with code
// =============================================================================
const verifyEmailSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6, 'Code must be 6 digits'),
});

router.post('/verify-email', sensitiveLimiter, validateBody(verifyEmailSchema), async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;

    // Find user
    const userResult = await db.query(
      `SELECT id, is_verified FROM ${SCHEMA}.users WHERE email = $1`,
      [email]
    );

    if (userResult.rows.length === 0) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_CODE', message: 'Invalid verification code' },
      });
      return;
    }

    const user = userResult.rows[0];

    if (user.is_verified) {
      // Already verified — log them in
      setTokenCookie(res, signToken(user.id));
      res.status(200).json({
        success: true,
        data: { message: 'Email already verified. You are logged in.', user_id: user.id },
      });
      return;
    }

    // Find valid code
    const codeResult = await db.query(
      `SELECT id FROM ${SCHEMA}.email_verifications
       WHERE user_id = $1 AND code = $2 AND purpose = 'registration'
         AND used = FALSE AND expires_at > NOW()`,
      [user.id, code]
    );

    if (codeResult.rows.length === 0) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_CODE', message: 'Invalid or expired verification code' },
      });
      return;
    }

    // Mark user as verified
    await db.query(
      `UPDATE ${SCHEMA}.users
       SET is_verified = TRUE, updated_at = NOW()
       WHERE id = $1`,
      [user.id]
    );

    // Mark code as used
    await db.query(
      `UPDATE ${SCHEMA}.email_verifications
       SET used = TRUE
       WHERE id = $1`,
      [codeResult.rows[0].id]
    );

    // Seed default categories
    await seedDefaultCategories(user.id);

    // Auto-login after verification — set JWT cookie
    setTokenCookie(res, signToken(user.id));

    res.json({
      success: true,
      data: {
        message: 'Email verified successfully!',
        user_id: user.id,
      },
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'An unexpected error occurred' },
    });
  }
});

// =============================================================================
// POST /api/auth/resend-verification — Resend verification code
// =============================================================================
const resendVerificationSchema = z.object({
  email: z.string().email(),
});

router.post('/resend-verification', sensitiveLimiter, validateBody(resendVerificationSchema), async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const userResult = await db.query(
      `SELECT id, is_verified FROM ${SCHEMA}.users WHERE email = $1`,
      [email]
    );

    if (userResult.rows.length === 0) {
      // Don't reveal whether email exists
      res.json({
        success: true,
        data: { message: 'If an account with this email exists, a verification code has been sent.' },
      });
      return;
    }

    const user = userResult.rows[0];

    if (user.is_verified) {
      res.json({
        success: true,
        data: { message: 'Email already verified. You can log in.' },
      });
      return;
    }

    const code = await createVerificationCode(user.id, 'registration');
    await sendVerificationCode(email, code, 'registration');

    res.json({
      success: true,
      data: { message: 'A new verification code has been sent to your email.' },
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'An unexpected error occurred' },
    });
  }
});

// =============================================================================
// POST /api/auth/login — Login with lockout protection
// =============================================================================
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

router.post('/login', authLimiter, validateBody(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip;

    // Check if account is locked
    const lockStatus = await isAccountLocked(email);
    if (lockStatus.locked) {
      const minutes = Math.ceil((lockStatus.remainingSeconds || 0) / 60);
      res.status(423).json({
        success: false,
        error: {
          code: 'ACCOUNT_LOCKED',
          message: `Account is locked due to too many failed attempts. Try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.`,
          remainingSeconds: lockStatus.remainingSeconds,
        },
      });
      return;
    }

    // Find user
    const result = await db.query(
      `SELECT id, full_name, email, password_hash, is_verified, is_locked
       FROM ${SCHEMA}.users
       WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      // Record failed attempt even if user doesn't exist (to prevent user enumeration timing)
      await recordFailedLogin(email, ipAddress);
      res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
      return;
    }

    const user = result.rows[0];

    // Check email verification
    if (!user.is_verified) {
      res.status(403).json({
        success: false,
        error: {
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Please verify your email before logging in.',
        },
      });
      return;
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      const lockResult = await recordFailedLogin(email, ipAddress);

      if (lockResult.locked) {
        res.status(423).json({
          success: false,
          error: {
            code: 'ACCOUNT_LOCKED',
            message: `Account locked for ${lockResult.lockDurationMinutes} minutes due to too many failed attempts.`,
            lockDurationMinutes: lockResult.lockDurationMinutes,
          },
        });
      } else {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: `Invalid email or password. ${lockResult.attemptsRemaining} attempt${lockResult.attemptsRemaining !== 1 ? 's' : ''} remaining.`,
            attemptsRemaining: lockResult.attemptsRemaining,
          },
        });
      }
      return;
    }

    // Successful login — reset failed attempts
    await resetFailedLogins(email);

    // Set JWT cookie
    setTokenCookie(res, signToken(user.id));

    res.json({
      success: true,
      data: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'An unexpected error occurred' },
    });
  }
});

// =============================================================================
// POST /api/auth/forgot-password — Send password reset code
// =============================================================================
const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

router.post('/forgot-password', sensitiveLimiter, validateBody(forgotPasswordSchema), async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    // Always return success to prevent email enumeration
    const userResult = await db.query(
      `SELECT id, is_verified FROM ${SCHEMA}.users WHERE email = $1`,
      [email]
    );

    if (userResult.rows.length > 0 && userResult.rows[0].is_verified) {
      const user = userResult.rows[0];
      const code = await createVerificationCode(user.id, 'password_reset');
      await sendVerificationCode(email, code, 'password_reset');
    }

    res.json({
      success: true,
      data: {
        message: 'If an account with this email exists, a password reset code has been sent.',
      },
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'An unexpected error occurred' },
    });
  }
});

// =============================================================================
// POST /api/auth/reset-password — Reset password with verification code
// =============================================================================
const resetPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6, 'Code must be 6 digits'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirm_password: z.string(),
}).refine((data) => data.password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
});

router.post('/reset-password', sensitiveLimiter, validateBody(resetPasswordSchema), async (req: Request, res: Response) => {
  try {
    const { email, code, password } = req.body;

    // Find user
    const userResult = await db.query(
      `SELECT id FROM ${SCHEMA}.users WHERE email = $1`,
      [email]
    );

    if (userResult.rows.length === 0) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_CODE', message: 'Invalid or expired reset code' },
      });
      return;
    }

    const user = userResult.rows[0];

    // Find valid code
    const codeResult = await db.query(
      `SELECT id FROM ${SCHEMA}.email_verifications
       WHERE user_id = $1 AND code = $2 AND purpose = 'password_reset'
         AND used = FALSE AND expires_at > NOW()`,
      [user.id, code]
    );

    if (codeResult.rows.length === 0) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_CODE', message: 'Invalid or expired reset code' },
      });
      return;
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 12);

    // Update password and clear lockout
    await db.query(
      `UPDATE ${SCHEMA}.users
       SET password_hash = $1,
           is_locked = FALSE,
           locked_until = NULL,
           failed_login_attempts = 0,
           updated_at = NOW()
       WHERE id = $2`,
      [passwordHash, user.id]
    );

    // Mark code as used
    await db.query(
      `UPDATE ${SCHEMA}.email_verifications SET used = TRUE WHERE id = $1`,
      [codeResult.rows[0].id]
    );

    res.json({
      success: true,
      data: { message: 'Password reset successfully. You can now log in with your new password.' },
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'An unexpected error occurred' },
    });
  }
});

// =============================================================================
// POST /api/auth/logout
// =============================================================================
router.post('/logout', (_req: Request, res: Response) => {
  clearTokenCookie(res);
  res.json({ success: true });
});

// =============================================================================
// GET /api/auth/me
// =============================================================================
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const result = await db.query(
      `SELECT id, full_name, email, is_verified, default_currency, created_at
       FROM ${SCHEMA}.users
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'An unexpected error occurred' },
    });
  }
});

export default router;
