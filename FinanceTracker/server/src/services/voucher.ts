import PDFDocument from 'pdfkit';

// =============================================================================
// Types
// =============================================================================

export type VoucherType = 'receipt' | 'invoice' | 'voucher';

export interface VoucherData {
  // Transaction info
  id: string;
  transaction_type: string;
  transaction_date: string | Date;
  amount: number | string;
  description: string | null;
  reference: string | null;

  // Related entities
  account_name: string | null;
  person_name: string | null;
  category_name: string | null;

  // User info
  user_name: string;
  user_email: string;

  // Transfer details (optional)
  from_account_name?: string | null;
  to_account_name?: string | null;
}

// =============================================================================
// Helpers
// =============================================================================

const COLORS = {
  primary: '#2563eb',     // Brand blue
  success: '#16a34a',     // Green
  danger: '#dc2626',      // Red
  warning: '#d97706',     // Amber
  gray: '#6b7280',        // Slate
  lightGray: '#e2e8f0',   // Border gray
  darkGray: '#1e293b',    // Text dark
  bgLight: '#f8fafc',     // Table row background
  white: '#ffffff',
  accentDark: '#0f172a',
};

export const formatBDT = (amount: number | string | null | undefined): string => {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount || 0));
  if (isNaN(num)) return 'BDT 0.00';
  return `BDT ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Converts a number to English words for financial vouchers
 */
export function numberToWords(amount: number | string): string {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount || 0));
  if (isNaN(num) || num === 0) return 'Zero BDT Only';

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertGroup = (n: number): string => {
    let groupStr = '';
    if (n >= 100) {
      groupStr += `${units[Math.floor(n / 100)]} Hundred `;
      n %= 100;
    }
    if (n >= 20) {
      groupStr += `${tens[Math.floor(n / 10)]} `;
      n %= 10;
    }
    if (n > 0) {
      groupStr += `${units[n]} `;
    }
    return groupStr.trim();
  };

  const integerPart = Math.floor(Math.abs(num));
  const decimalPart = Math.round((Math.abs(num) - integerPart) * 100);

  if (integerPart === 0 && decimalPart === 0) return 'Zero BDT Only';

  let result = '';
  let current = integerPart;

  const crore = Math.floor(current / 10000000);
  current %= 10000000;
  const lakh = Math.floor(current / 100000);
  current %= 100000;
  const thousand = Math.floor(current / 1000);
  current %= 1000;
  const remainder = current;

  if (crore > 0) result += `${convertGroup(crore)} Crore `;
  if (lakh > 0) result += `${convertGroup(lakh)} Lakh `;
  if (thousand > 0) result += `${convertGroup(thousand)} Thousand `;
  if (remainder > 0) result += `${convertGroup(remainder)} `;

  result = result.trim() + ' BDT';

  if (decimalPart > 0) {
    result += ` and ${convertGroup(decimalPart)} Paisa`;
  }

  return `${result} Only`;
}

const TYPE_TITLES: Record<string, Record<VoucherType, string>> = {
  INCOME: {
    receipt: 'MONEY RECEIPT',
    invoice: 'INCOME INVOICE',
    voucher: 'CREDIT VOUCHER',
  },
  EXPENSE: {
    receipt: 'PAYMENT RECEIPT',
    invoice: 'EXPENSE INVOICE',
    voucher: 'DEBIT VOUCHER',
  },
  TRANSFER: {
    receipt: 'TRANSFER RECEIPT',
    invoice: 'TRANSFER STATEMENT',
    voucher: 'TRANSFER VOUCHER',
  },
  LEND: {
    receipt: 'LENDING RECEIPT',
    invoice: 'LOAN DISBURSEMENT INVOICE',
    voucher: 'LENDING VOUCHER',
  },
  LEND_REPAYMENT: {
    receipt: 'LOAN REPAYMENT RECEIPT',
    invoice: 'REPAYMENT SETTLEMENT',
    voucher: 'REPAYMENT VOUCHER',
  },
  BORROW: {
    receipt: 'BORROWING RECEIPT',
    invoice: 'BORROWING INVOICE',
    voucher: 'CREDIT VOUCHER',
  },
  BORROW_REPAYMENT: {
    receipt: 'REPAYMENT RECEIPT',
    invoice: 'DEBT SETTLEMENT INVOICE',
    voucher: 'DEBT REPAYMENT VOUCHER',
  },
  ADJUSTMENT: {
    receipt: 'ADJUSTMENT RECEIPT',
    invoice: 'ADJUSTMENT STATEMENT',
    voucher: 'JOURNAL VOUCHER',
  },
};

const TYPE_COLORS: Record<string, string> = {
  INCOME: COLORS.success,
  EXPENSE: COLORS.danger,
  TRANSFER: COLORS.primary,
  LEND: COLORS.warning,
  LEND_REPAYMENT: COLORS.success,
  BORROW: COLORS.primary,
  BORROW_REPAYMENT: COLORS.warning,
  ADJUSTMENT: COLORS.gray,
};

// =============================================================================
// PDF Generation
// =============================================================================

export function generateVoucherPDF(
  data: VoucherData,
  voucherType: VoucherType = 'voucher',
): PDFKit.PDFDocument {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 0,
    bufferPages: true,
    autoFirstPage: true,
    info: {
      Title: `${data.id.toUpperCase()} - ${voucherType.toUpperCase()}`,
      Author: data.user_name || 'Balqen',
      Subject: `Balqen Financial Document`,
      Creator: 'Balqen',
    },
  });

  const numAmount = typeof data.amount === 'number' ? data.amount : parseFloat(String(data.amount || 0));
  const typeColor = TYPE_COLORS[data.transaction_type] || COLORS.primary;
  const docTitle = (TYPE_TITLES[data.transaction_type] && TYPE_TITLES[data.transaction_type][voucherType])
    || `${data.transaction_type.replace('_', ' ')} ${voucherType.toUpperCase()}`;

  const formattedAmount = formatBDT(numAmount);
  const wordsAmount = numberToWords(numAmount);

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const contentWidth = pageWidth - 90;

  // -------------------------------------------------------------------------
  // 1. Top Decorative Brand Bar
  // -------------------------------------------------------------------------
  doc.rect(0, 0, pageWidth, 8).fill(typeColor);

  // -------------------------------------------------------------------------
  // 2. Header Section
  // -------------------------------------------------------------------------
  // App branding (left)
  doc
    .font('Helvetica-Bold')
    .fontSize(18)
    .fillColor(COLORS.darkGray)
    .text('BALQEN', 45, 28);

  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor(COLORS.gray)
    .text('Personal & Business Financial Ledger', 45, 48);

  // Document Title & Type Badge (right)
  doc
    .font('Helvetica-Bold')
    .fontSize(16)
    .fillColor(typeColor)
    .text(docTitle, 45, 30, { align: 'right', width: contentWidth });

  const badgeText = voucherType.toUpperCase();
  const badgeWidth = 70;
  const badgeHeight = 18;
  const badgeX = pageWidth - 45 - badgeWidth;
  const badgeY = 50;

  doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 3).fill(typeColor);
  doc
    .font('Helvetica-Bold')
    .fontSize(8)
    .fillColor(COLORS.white)
    .text(badgeText, badgeX, badgeY + 5, { width: badgeWidth, align: 'center' });

  // Divider
  doc
    .moveTo(45, 78)
    .lineTo(pageWidth - 45, 78)
    .strokeColor(COLORS.lightGray)
    .lineWidth(1)
    .stroke();

  // -------------------------------------------------------------------------
  // 3. Metadata Bar (Document No, Date, Issuer)
  // -------------------------------------------------------------------------
  const metaY = 90;
  const colW = contentWidth / 3;

  // Col 1: Voucher/Doc No
  doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.gray).text('DOCUMENT NO', 45, metaY);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.darkGray).text(data.id.toUpperCase(), 45, metaY + 12);

  // Col 2: Date
  const rawDate = data.transaction_date instanceof Date ? data.transaction_date : new Date(data.transaction_date || Date.now());
  const validDate = isNaN(rawDate.getTime()) ? new Date() : rawDate;
  const dateFormatted = validDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.gray).text('TRANSACTION DATE', 45 + colW, metaY);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.darkGray).text(dateFormatted, 45 + colW, metaY + 12);

  // Col 3: Issued By
  doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.gray).text('ACCOUNT HOLDER', 45 + colW * 2, metaY);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.darkGray).text(data.user_name || 'Authorized User', 45 + colW * 2, metaY + 12);

  // -------------------------------------------------------------------------
  // 4. Prominent Amount Display Card
  // -------------------------------------------------------------------------
  const cardY = 130;
  const cardH = 72;

  // Background Card
  doc.roundedRect(45, cardY, contentWidth, cardH, 6).fillAndStroke(COLORS.bgLight, COLORS.lightGray);

  // Amount Label
  doc
    .font('Helvetica-Bold')
    .fontSize(9)
    .fillColor(COLORS.gray)
    .text('TOTAL TRANSACTION AMOUNT', 60, cardY + 12);

  // Amount Value
  doc
    .font('Helvetica-Bold')
    .fontSize(22)
    .fillColor(typeColor)
    .text(formattedAmount, 60, cardY + 26);

  // In Words
  doc
    .font('Helvetica-Oblique')
    .fontSize(9)
    .fillColor(COLORS.darkGray)
    .text(`In Words: ${wordsAmount}`, 60, cardY + 53, { width: contentWidth - 30 });

  // -------------------------------------------------------------------------
  // 5. Transfer Diagram (If Transfer)
  // -------------------------------------------------------------------------
  let currentY = cardY + cardH + 18;

  if (data.transaction_type === 'TRANSFER' && (data.from_account_name || data.to_account_name)) {
    doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.darkGray).text('Transfer Flow', 45, currentY);
    currentY += 16;

    const flowBoxW = (contentWidth - 60) / 2;
    const flowBoxH = 40;

    // From Box
    doc.roundedRect(45, currentY, flowBoxW, flowBoxH, 4).fillAndStroke(COLORS.bgLight, COLORS.lightGray);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.gray).text('SOURCE (FROM)', 55, currentY + 7);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.darkGray).text(data.from_account_name || 'Source Account', 55, currentY + 20);

    // Arrow in center
    const arrowCenterX = 45 + flowBoxW + 30;
    const arrowY = currentY + flowBoxH / 2;
    doc.moveTo(arrowCenterX - 18, arrowY).lineTo(arrowCenterX + 18, arrowY).strokeColor(typeColor).lineWidth(2).stroke();
    doc.moveTo(arrowCenterX + 12, arrowY - 4).lineTo(arrowCenterX + 18, arrowY).lineTo(arrowCenterX + 12, arrowY + 4).stroke();

    // To Box
    const toX = 45 + flowBoxW + 60;
    doc.roundedRect(toX, currentY, flowBoxW, flowBoxH, 4).fillAndStroke(COLORS.bgLight, COLORS.lightGray);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.gray).text('DESTINATION (TO)', toX + 10, currentY + 7);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.darkGray).text(data.to_account_name || 'Destination Account', toX + 10, currentY + 20);

    currentY += flowBoxH + 18;
  }

  // -------------------------------------------------------------------------
  // 6. Details Table
  // -------------------------------------------------------------------------
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.darkGray).text('Transaction Summary', 45, currentY);
  currentY += 16;

  const tableRows: Array<{ label: string; value: string }> = [
    { label: 'Transaction ID', value: data.id },
    { label: 'Transaction Type', value: data.transaction_type.replace(/_/g, ' ') },
    { label: 'Category', value: data.category_name || 'General / Uncategorized' },
    { label: 'Account', value: data.account_name || (data.from_account_name ? `${data.from_account_name} -> ${data.to_account_name}` : '-') },
  ];

  if (data.person_name) {
    const roleLabel = ['LEND', 'LEND_REPAYMENT'].includes(data.transaction_type)
      ? 'Associated Person (Borrower/Lender)'
      : 'Associated Person (Lender/Borrower)';
    tableRows.push({ label: roleLabel, value: data.person_name });
  }

  if (data.reference) {
    tableRows.push({ label: 'Reference / Invoice #', value: data.reference });
  }

  if (data.description) {
    tableRows.push({ label: 'Notes / Description', value: data.description });
  }

  const rowHeight = 24;
  tableRows.forEach((row, index) => {
    const isEven = index % 2 === 0;
    if (isEven) {
      doc.rect(45, currentY, contentWidth, rowHeight).fill(COLORS.bgLight);
    }

    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(COLORS.gray)
      .text(row.label, 55, currentY + 7, { width: 170 });

    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(COLORS.darkGray)
      .text(row.value || '-', 230, currentY + 7, { width: contentWidth - 195 });

    currentY += rowHeight;
  });

  // Table bottom border
  doc
    .moveTo(45, currentY)
    .lineTo(pageWidth - 45, currentY)
    .strokeColor(COLORS.lightGray)
    .lineWidth(1)
    .stroke();

  // -------------------------------------------------------------------------
  // 7. Signatures & Verification Area
  // -------------------------------------------------------------------------
  const sigY = pageHeight - 140;

  // Signature lines
  const sigBoxW = 160;
  const leftSigX = 55;
  const rightSigX = pageWidth - 45 - sigBoxW;

  // Left: Prepared By
  doc.moveTo(leftSigX, sigY + 35).lineTo(leftSigX + sigBoxW, sigY + 35).strokeColor(COLORS.lightGray).lineWidth(1).stroke();
  doc.font('Helvetica').fontSize(8).fillColor(COLORS.gray).text('Prepared By / Account Owner', leftSigX, sigY + 40, { width: sigBoxW, align: 'center' });
  doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.darkGray).text(data.user_name || 'Authorized User', leftSigX, sigY + 20, { width: sigBoxW, align: 'center' });

  // Right: Verified / Authorized
  doc.moveTo(rightSigX, sigY + 35).lineTo(rightSigX + sigBoxW, sigY + 35).strokeColor(COLORS.lightGray).lineWidth(1).stroke();
  doc.font('Helvetica').fontSize(8).fillColor(COLORS.gray).text('Authorized Signature / Seal', rightSigX, sigY + 40, { width: sigBoxW, align: 'center' });

  // -------------------------------------------------------------------------
  // 8. Footer
  // -------------------------------------------------------------------------
  const footerY = pageHeight - 65;

  doc.moveTo(45, footerY).lineTo(pageWidth - 45, footerY).strokeColor(COLORS.lightGray).lineWidth(1).stroke();

  const generatedDate = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor(COLORS.gray)
    .text(
      `Generated by Balqen on ${generatedDate} | Document ID: ${data.id.toUpperCase()}`,
      45,
      footerY + 10,
      { width: contentWidth, align: 'center' }
    );

  doc
    .font('Helvetica')
    .fontSize(7)
    .fillColor(COLORS.gray)
    .text(
      'This is a verified computer-generated document and is valid without physical seal.',
      45,
      footerY + 22,
      { width: contentWidth, align: 'center' }
    );

  // Bottom Accent Bar
  doc.rect(0, pageHeight - 6, pageWidth, 6).fill(typeColor);

  return doc;
}

/**
 * Helper to generate PDF as a Buffer for 100% reliable delivery in Node & Serverless
 */
export async function generateVoucherBuffer(
  data: VoucherData,
  voucherType: VoucherType = 'voucher',
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = generateVoucherPDF(data, voucherType);
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
