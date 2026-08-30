import PDFDocument from 'pdfkit';

// =============================================================================
// Types
// =============================================================================

export type VoucherType = 'receipt' | 'invoice' | 'voucher';

export interface VoucherData {
  // Transaction info
  id: string;
  transaction_type: string;
  transaction_date: string;
  amount: number;
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
  primary: '#2563eb',
  success: '#16a34a',
  danger: '#dc2626',
  warning: '#d97706',
  gray: '#6b7280',
  lightGray: '#e5e7eb',
  darkGray: '#374151',
  white: '#ffffff',
  bg: '#f9fafb',
};

const BDT = (amount: number) =>
  `৳${amount.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const TYPE_LABELS: Record<string, string> = {
  INCOME: 'Income Receipt',
  EXPENSE: 'Expense Voucher',
  TRANSFER: 'Transfer Voucher',
  LEND: 'Lending Receipt',
  LEND_REPAYMENT: 'Repayment Received',
  BORROW: 'Borrowing Receipt',
  BORROW_REPAYMENT: 'Repayment Voucher',
  ADJUSTMENT: 'Adjustment Voucher',
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
  voucherType: VoucherType,
): PDFKit.PDFDocument {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    bufferPages: true,
    info: {
      Title: `${TYPE_LABELS[data.transaction_type] || 'Voucher'} - ${data.id}`,
      Author: data.user_name,
      Subject: `Finance Tracker Voucher`,
    },
  });

  const typeColor = TYPE_COLORS[data.transaction_type] || COLORS.primary;
  const label = TYPE_LABELS[data.transaction_type] || 'Voucher';

  // -------------------------------------------------------------------------
  // Header
  // -------------------------------------------------------------------------

  // Top accent bar
  doc.rect(0, 0, doc.page.width, 8).fill(typeColor);

  // App name
  doc.fontSize(10).fillColor(COLORS.gray).text('Finance Tracker', 50, 30);

  // Voucher title
  doc
    .fontSize(24)
    .fillColor(typeColor)
    .text(label.toUpperCase(), 50, 50, { continued: false });

  // Voucher number
  doc
    .fontSize(10)
    .fillColor(COLORS.gray)
    .text(`No: ${data.id.toUpperCase()}`, 50, 80);

  // Date on the right
  doc
    .fontSize(10)
    .fillColor(COLORS.gray)
    .text(`Date: ${new Date(data.transaction_date).toLocaleDateString('en-BD', { year: 'numeric', month: 'long', day: 'numeric' })}`, 50, 95);

  // Divider
  doc
    .moveTo(50, 115)
    .lineTo(doc.page.width - 50, 115)
    .strokeColor(COLORS.lightGray)
    .lineWidth(1)
    .stroke();

  // -------------------------------------------------------------------------
  // Status badge
  // -------------------------------------------------------------------------
  const badgeY = 130;
  doc.roundedRect(50, badgeY, 120, 24, 4).fill(typeColor);
  doc.fontSize(10).fillColor(COLORS.white).text(label, 58, badgeY + 7, { width: 104, align: 'center' });

  // -------------------------------------------------------------------------
  // Amount (prominent)
  // -------------------------------------------------------------------------
  const amountY = 170;
  doc.fontSize(12).fillColor(COLORS.gray).text('Amount', 50, amountY);

  const amountColor = ['INCOME', 'LEND_REPAYMENT', 'BORROW'].includes(data.transaction_type)
    ? COLORS.success
    : ['EXPENSE', 'LEND', 'BORROW_REPAYMENT'].includes(data.transaction_type)
    ? COLORS.danger
    : COLORS.primary;

  doc.fontSize(32).fillColor(amountColor).text(BDT(data.amount), 50, amountY + 18, { width: doc.page.width - 100 });

  // -------------------------------------------------------------------------
  // Details table
  // -------------------------------------------------------------------------
  let y = amountY + 70;

  const drawRow = (label: string, value: string, isLast = false) => {
    // Alternate row background
    if (!isLast) {
      doc.rect(50, y, doc.page.width - 100, 28).fill(COLORS.bg);
    }

    doc.fontSize(10).fillColor(COLORS.gray).text(label, 60, y + 8, { width: 180 });
    doc.fontSize(10).fillColor(COLORS.darkGray).text(value || '-', 240, y + 8, { width: doc.page.width - 300 });
    y += 28;
  };

  // Section title
  doc.fontSize(12).fillColor(COLORS.darkGray).text('Transaction Details', 50, y - 5);
  y += 20;

  drawRow('Transaction ID', data.id);
  drawRow('Type', `${data.transaction_type.replace('_', ' ')} (${label})`);
  drawRow('Date', new Date(data.transaction_date).toLocaleDateString('en-BD', { year: 'numeric', month: 'long', day: 'numeric' }));
  drawRow('Account', data.account_name || (data.from_account_name ? `${data.from_account_name} → ${data.to_account_name}` : '-'));
  drawRow('Person', data.person_name || '-');
  drawRow('Category', data.category_name || '-');
  drawRow('Description', data.description || '-');
  drawRow('Reference', data.reference || '-', true);

  // -------------------------------------------------------------------------
  // Transfer details (if applicable)
  // -------------------------------------------------------------------------
  if (data.transaction_type === 'TRANSFER' && data.from_account_name && data.to_account_name) {
    y += 15;
    doc.fontSize(12).fillColor(COLORS.darkGray).text('Transfer Details', 50, y);
    y += 20;

    // Transfer arrow diagram
    const arrowY = y;
    const boxW = 180;
    const boxH = 50;
    const fromX = 50;
    const toX = doc.page.width - 50 - boxW;

    // From box
    doc.roundedRect(fromX, arrowY, boxW, boxH, 6).fillAndStroke(COLORS.bg, COLORS.lightGray);
    doc.fontSize(9).fillColor(COLORS.gray).text('FROM', fromX + 10, arrowY + 8, { width: boxW - 20 });
    doc.fontSize(11).fillColor(COLORS.darkGray).text(data.from_account_name, fromX + 10, arrowY + 24, { width: boxW - 20 });

    // Arrow
    const arrowStartX = fromX + boxW + 10;
    const arrowEndX = toX - 10;
    const arrowMidY = arrowY + boxH / 2;
    doc.moveTo(arrowStartX, arrowMidY).lineTo(arrowEndX, arrowMidY).strokeColor(typeColor).lineWidth(2).stroke();
    // Arrowhead
    doc.moveTo(arrowEndX - 8, arrowMidY - 5).lineTo(arrowEndX, arrowMidY).lineTo(arrowEndX - 8, arrowMidY + 5).stroke();

    // Amount in middle
    doc.fontSize(12).fillColor(typeColor).text(BDT(data.amount), arrowStartX, arrowMidY - 20, {
      width: arrowEndX - arrowStartX,
      align: 'center',
    });

    // To box
    doc.roundedRect(toX, arrowY, boxW, boxH, 6).fillAndStroke(COLORS.bg, COLORS.lightGray);
    doc.fontSize(9).fillColor(COLORS.gray).text('TO', toX + 10, arrowY + 8, { width: boxW - 20 });
    doc.fontSize(11).fillColor(COLORS.darkGray).text(data.to_account_name, toX + 10, arrowY + 24, { width: boxW - 20 });

    y = arrowY + boxH + 15;
  }

  // -------------------------------------------------------------------------
  // Person balance summary (for lending/borrowing)
  // -------------------------------------------------------------------------
  if (['LEND', 'LEND_REPAYMENT', 'BORROW', 'BORROW_REPAYMENT'].includes(data.transaction_type) && data.person_name) {
    y += 10;
    doc.fontSize(12).fillColor(COLORS.darkGray).text('Party Details', 50, y);
    y += 20;

    const personType = data.transaction_type.startsWith('LEND') ? 'Lender / Borrower' : 'Borrower / Lender';
    drawRow(personType, data.person_name);
    drawRow('Direction', data.transaction_type.startsWith('LEND')
      ? (data.transaction_type === 'LEND' ? 'You lent money to this person' : 'This person returned money to you')
      : (data.transaction_type === 'BORROW' ? 'You borrowed money from this person' : 'You returned money to this person'),
    true);
  }

  // -------------------------------------------------------------------------
  // Footer
  // -------------------------------------------------------------------------
  const pageHeight = doc.page.height;

  // Divider
  doc
    .moveTo(50, pageHeight - 80)
    .lineTo(doc.page.width - 50, pageHeight - 80)
    .strokeColor(COLORS.lightGray)
    .lineWidth(1)
    .stroke();

  // Footer text
  doc.fontSize(9).fillColor(COLORS.gray).text(
    `Generated by Finance Tracker on ${new Date().toLocaleDateString('en-BD', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
    50,
    pageHeight - 70,
    { width: doc.page.width - 100, align: 'center' },
  );

  doc.fontSize(8).fillColor(COLORS.gray).text(
    `This is a computer-generated document. No signature is required.`,
    50,
    pageHeight - 55,
    { width: doc.page.width - 100, align: 'center' },
  );

  // Bottom accent bar
  doc.rect(0, pageHeight - 8, doc.page.width, 8).fill(typeColor);

  return doc;
}
