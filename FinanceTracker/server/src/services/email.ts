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
      <h1>💰 Balqen</h1>
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
      <p>Balqen Finance &copy; ${new Date().getFullYear()}</p>
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
Balqen

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
      from: process.env.EMAIL_FROM || 'Balqen <noreply@balqen.com>',
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
    ? 'Verify Your Email - Balqen'
    : 'Reset Your Password - Balqen';

  return sendEmail({
    to: email,
    subject,
    html: verificationEmailHtml(code, purpose),
    text: verificationEmailText(code, purpose),
  });
}

// =============================================================================
// Transaction Receipt Email (with PDF attachment)
// =============================================================================

function transactionReceiptHtml(data: {
  senderName: string;
  recipientName: string;
  transactionType: string;
  amount: number;
  date: string;
  description: string | null;
  direction: 'sent' | 'received';
}): string {
  const { senderName, recipientName, transactionType, amount, date, description, direction } = data;

  const typeLabel = transactionType.replace(/_/g, ' ');
  const formattedAmount = `BDT ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const isPositive = ['INCOME', 'BORROW', 'LEND_REPAYMENT'].includes(transactionType);
  const accentColor = isPositive ? '#16a34a' : '#dc2626';
  const directionText = direction === 'received'
    ? `${senderName} recorded a payment from you:`
    : `${senderName} sent you a transaction confirmation:`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f5; margin: 0; padding: 20px; }
    .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    .header { background: #0f172a; padding: 24px 32px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; }
    .body { padding: 32px; }
    .amount-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
    .amount { font-size: 28px; font-weight: 800; color: ${accentColor}; font-family: -apple-system, sans-serif; }
    .details { border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 16px; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; border-bottom: 1px solid #f8fafc; }
    .detail-label { color: #64748b; font-weight: 500; }
    .detail-value { color: #0f172a; font-weight: 600; text-align: right; }
    .text { color: #374151; line-height: 1.6; font-size: 14px; margin: 0 0 12px; }
    .footer { padding: 16px 32px; background: #f8fafc; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #f1f5f9; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💰 Balqen</h1>
    </div>
    <div class="body">
      <p class="text">Hi ${recipientName},</p>
      <p class="text">${directionText}</p>

      <div class="amount-box">
        <div class="amount">${formattedAmount}</div>
        <div style="color: ${accentColor}; font-size: 13px; margin-top: 4px;">${typeLabel}</div>
      </div>

      <div class="details">
        <div class="detail-row">
          <span class="detail-label">Date</span>
          <span class="detail-value">${formattedDate}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">From / To</span>
          <span class="detail-value">${senderName}</span>
        </div>
        ${description ? `<div class="detail-row">
          <span class="detail-label">Description</span>
          <span class="detail-value">${description}</span>
        </div>` : ''}
      </div>

      <p class="text" style="font-size: 12px; color: #9ca3af; margin-top: 20px;">
        This receipt was generated by ${senderName} using Balqen.
      </p>
    </div>
    <div class="footer">
      <p>Balqen Finance &copy; ${new Date().getFullYear()}</p>
    </div>
  </div>
</body>
</html>`;
}

function transactionReceiptText(data: {
  senderName: string;
  recipientName: string;
  transactionType: string;
  amount: number;
  date: string;
  description: string | null;
}): string {
  const formattedAmount = `BDT ${data.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `
Transaction Receipt - Balqen

Hi ${data.recipientName},

${data.senderName} has shared a transaction record with you.

Amount: ${formattedAmount}
Type: ${data.transactionType.replace(/_/g, ' ')}
Date: ${new Date(data.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}${data.description ? `\nDescription: ${data.description}` : ''}

This notification was sent by ${data.senderName} using Balqen.
  `.trim();
}

export interface SendReceiptOptions {
  to: string;
  senderName: string;
  recipientName: string;
  transactionType: string;
  amount: number;
  date: string;
  description: string | null;
}

export async function sendTransactionReceipt(options: SendReceiptOptions): Promise<boolean> {
  const { to, senderName, recipientName, transactionType, amount, date, description } = options;

  const direction = ['INCOME', 'BORROW', 'LEND_REPAYMENT'].includes(transactionType) ? 'received' : 'sent';
  const typeLabel = transactionType.replace(/_/g, ' ').toLowerCase();

  const subject = `${typeLabel.replace(/\b\w/g, (c: string) => c.toUpperCase())} BDT ${amount.toLocaleString('en-US')} - ${senderName}`;

  const html = transactionReceiptHtml({
    senderName,
    recipientName,
    transactionType,
    amount,
    date,
    description,
    direction: direction as 'sent' | 'received',
  });

  const text = transactionReceiptText({
    senderName,
    recipientName,
    transactionType,
    amount,
    date,
    description,
  });

  try {
    if (!isEmailConfigured) {
      console.log('\n📧 ═══════════════════════════════════════');
      console.log(`   📨 TRANSACTION NOTIFICATION`);
      console.log(`   To: ${to}`);
      console.log(`   From: ${senderName}`);
      console.log(`   Subject: ${subject}`);
      console.log(`   Amount: BDT ${amount.toLocaleString('en-US')}`);
      console.log(`   Type: ${transactionType}`);
      console.log('   ═══════════════════════════════════════\n');
      return true;
    }

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || `Finance Tracker <noreply@financetracker.com>`,
      to,
      subject,
      html,
      text,
    });
    return true;
  } catch (error) {
    console.error('Failed to send transaction receipt:', error);
    return false;
  }
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
