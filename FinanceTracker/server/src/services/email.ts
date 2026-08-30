import nodemailer from 'nodemailer';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Verify connection on startup (non-blocking)
transporter.verify().then(() => {
  console.log('✅ Email server connected');
}).catch((err) => {
  console.warn('⚠️  Email server not available:', err.message);
  console.warn('   Emails will be logged to console instead.');
});

// Whether to actually send emails or just log them
const isEmailConfigured = !!process.env.SMTP_USER && process.env.SMTP_USER !== 'your-ethereal-user@ethereal.email';

// =============================================================================
// Email Templates
// =============================================================================

function verificationEmailHtml(code: string, purpose: 'registration' | 'password_reset'): string {
  const title = purpose === 'registration' ? 'Verify Your Email' : 'Reset Your Password';
  const body = purpose === 'registration'
    ? 'Thank you for signing up! Use the code below to verify your email address.'
    : 'You requested a password reset. Use the code below to set a new password.';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 500px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: #0284c7; padding: 32px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; }
    .body { padding: 32px; }
    .code { background: #f0f9ff; border: 2px dashed #0ea5e9; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0; }
    .code span { font-size: 32px; font-weight: bold; color: #0c4a6e; letter-spacing: 8px; font-family: 'Courier New', monospace; }
    .text { color: #374151; line-height: 1.6; font-size: 14px; }
    .footer { padding: 16px 32px; background: #f9fafb; text-align: center; color: #9ca3af; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💰 Finance Tracker</h1>
    </div>
    <div class="body">
      <h2 style="color: #111827; margin-top: 0;">${title}</h2>
      <p class="text">${body}</p>
      <div class="code">
        <span>${code}</span>
      </div>
      <p class="text">This code expires in <strong>15 minutes</strong>.</p>
      <p class="text">If you didn't request this, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      <p>Personal Finance Tracker &copy; ${new Date().getFullYear()}</p>
    </div>
  </div>
</body>
</html>`;
}

function verificationEmailText(code: string, purpose: 'registration' | 'password_reset'): string {
  const title = purpose === 'registration' ? 'Verify Your Email' : 'Reset Your Password';
  const body = purpose === 'registration'
    ? 'Thank you for signing up! Use the code below to verify your email address.'
    : 'You requested a password reset. Use the code below to set a new password.';

  return `
${title}
Finance Tracker

${body}

Your verification code: ${code}

This code expires in 15 minutes.

If you didn't request this, you can safely ignore this email.
  `.trim();
}

// =============================================================================
// Send Functions
// =============================================================================

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  try {
    if (!isEmailConfigured) {
      // Development mode: log to console
      console.log('\n📧 ═══════════════════════════════════════');
      console.log(`   To: ${options.to}`);
      console.log(`   Subject: ${options.subject}`);
      console.log('   ─────────────────────────────────────');
      // Extract the code from the text
      const codeMatch = options.text.match(/code:\s*(\w+)/i);
      if (codeMatch) {
        console.log(`   🔑 Verification Code: ${codeMatch[1]}`);
      }
      console.log('   ═══════════════════════════════════════\n');
      return true;
    }

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'Finance Tracker <noreply@financetracker.com>',
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

export async function sendVerificationCode(
  email: string,
  code: string,
  purpose: 'registration' | 'password_reset',
): Promise<boolean> {
  const subject = purpose === 'registration'
    ? 'Verify Your Email - Finance Tracker'
    : 'Reset Your Password - Finance Tracker';

  return sendEmail({
    to: email,
    subject,
    html: verificationEmailHtml(code, purpose),
    text: verificationEmailText(code, purpose),
  });
}

// =============================================================================
// Code Generation
// =============================================================================

/**
 * Generate a 6-digit numeric verification code using a CSPRNG.
 */
export function generateVerificationCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}
