import { useState } from 'react';
import { Printer, Download, X, Copy, Check, ShieldCheck, TrendingUp, Building2, Tag, User, FileText, ArrowRight } from 'lucide-react';
import { formatCurrency, formatDateDMY, numberToWords } from '../utils/format';
import toast from 'react-hot-toast';

export type VoucherType = 'voucher' | 'invoice' | 'receipt';

export interface VoucherReportData {
  id: string;
  transaction_type: string;
  transaction_date: string | Date;
  amount: number | string;
  description: string | null | undefined;
  reference: string | null | undefined;
  account_name: string | null | undefined;
  person_name: string | null | undefined;
  category_name: string | null | undefined;
  user_name?: string | null;
  user_email?: string | null;
  from_account_name?: string | null | undefined;
  to_account_name?: string | null | undefined;
}

interface VoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: VoucherReportData | null;
  initialType?: VoucherType;
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

export default function VoucherModal({
  isOpen,
  onClose,
  data,
  initialType = 'voucher',
}: VoucherModalProps) {
  const [activeType, setActiveType] = useState<VoucherType>(initialType);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !data) return null;

  const numAmount = typeof data.amount === 'number' ? data.amount : parseFloat(String(data.amount || 0));
  const wordsAmount = numberToWords(numAmount);
  const docTitle =
    (TYPE_TITLES[data.transaction_type] && TYPE_TITLES[data.transaction_type][activeType]) ||
    `${data.transaction_type.replace('_', ' ')} ${activeType.toUpperCase()}`;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(data.id);
    setCopied(true);
    toast.success('Document ID copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const isIncome = ['INCOME', 'LEND_REPAYMENT', 'BORROW'].includes(data.transaction_type);
  const isExpense = ['EXPENSE', 'BORROW_REPAYMENT', 'LEND'].includes(data.transaction_type);

  const themeColorClass = isIncome
    ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
    : isExpense
    ? 'text-rose-700 dark:text-rose-400 bg-rose-500/10 border-rose-500/30'
    : 'text-brand-700 dark:text-brand-400 bg-brand-500/10 border-brand-500/30';

  const badgeBg = isIncome
    ? 'bg-emerald-600 text-white'
    : isExpense
    ? 'bg-rose-600 text-white'
    : 'bg-brand-600 text-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative bg-white dark:bg-[#111726] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-3xl max-h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Toolbar (Hidden in print) */}
        <div className="print:hidden flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-slate-100 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800">
          {/* Document Type Switcher Tabs */}
          <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            {(['voucher', 'invoice', 'receipt'] as VoucherType[]).map((t) => (
              <button
                key={t}
                onClick={() => setActiveType(t)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-all cursor-pointer ${
                  activeType === t
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyId}
              className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
              title="Copy Document ID"
            >
              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              <span className="hidden sm:inline">Copy ID</span>
            </button>

            <button
              onClick={handlePrint}
              className="btn-primary text-xs px-3.5 py-1.5 flex items-center gap-1.5 shadow-sm"
              title="Print or Save as PDF"
            >
              <Printer size={15} />
              <span>Print / Save PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Document Container */}
        <div className="p-6 sm:p-10 overflow-y-auto flex-1 bg-white text-slate-900 print:p-8 print:m-0 print:shadow-none print:w-full">
          {/* 1. Header Bar */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-5 mb-6">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-brand-600 via-brand-500 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-brand-500/25">
                <TrendingUp size={24} strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 leading-tight">
                  BALQEN
                </h1>
                <p className="text-[11px] font-medium text-slate-500 tracking-wide uppercase">
                  Personal & Business Financial Ledger
                </p>
              </div>
            </div>

            <div className="text-right">
              <h2 className="text-xl font-extrabold tracking-tight text-slate-900">{docTitle}</h2>
              <span className={`inline-block mt-1 px-3 py-0.5 text-[10px] font-black uppercase rounded tracking-wider ${badgeBg}`}>
                {activeType.toUpperCase()}
              </span>
            </div>
          </div>

          {/* 2. Document Metadata Grid */}
          <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 mb-6 text-xs">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Document ID</p>
              <p className="font-mono font-bold text-slate-900 text-sm mt-0.5">{data.id.toUpperCase()}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Transaction Date</p>
              <p className="font-semibold text-slate-900 text-sm mt-0.5">{formatDateDMY(data.transaction_date)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Issued By / Account</p>
              <p className="font-semibold text-slate-900 text-sm mt-0.5 truncate">{data.user_name || 'Authorized User'}</p>
              {data.user_email && <p className="text-[10px] text-slate-500 truncate">{data.user_email}</p>}
            </div>
          </div>

          {/* 3. Prominent Amount Display Card */}
          <div className={`p-5 rounded-2xl border ${themeColorClass} mb-6`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider opacity-70">
                  Total Transaction Amount
                </p>
                <h3 className="text-3xl sm:text-4xl font-black tracking-tight mt-1">
                  {formatCurrency(numAmount)}
                </h3>
              </div>
              <div className="text-left sm:text-right">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-white/80 border border-slate-200/80 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-current" />
                  <span>{data.transaction_type.replace('_', ' ')}</span>
                </span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-current/15">
              <p className="text-xs italic font-medium">
                <span className="font-bold not-italic">In Words:</span> {wordsAmount}
              </p>
            </div>
          </div>

          {/* 4. Detailed Breakdown Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden mb-6 text-xs">
            <div className="bg-slate-100 px-4 py-2.5 font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200">
              Transaction Details & Line Items
            </div>
            <table className="w-full text-left">
              <tbody className="divide-y divide-slate-200">
                {/* Description */}
                <tr>
                  <td className="px-4 py-3 font-semibold text-slate-500 w-1/3 bg-slate-50/50">Description / Note</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{data.description || 'General transaction entry'}</td>
                </tr>

                {/* Category */}
                {data.category_name && (
                  <tr>
                    <td className="px-4 py-3 font-semibold text-slate-500 bg-slate-50/50">Category</td>
                    <td className="px-4 py-3 font-medium text-slate-900 flex items-center gap-2">
                      <Tag size={13} className="text-slate-400" />
                      <span>{data.category_name}</span>
                    </td>
                  </tr>
                )}

                {/* Counterparty / Person */}
                {data.person_name && (
                  <tr>
                    <td className="px-4 py-3 font-semibold text-slate-500 bg-slate-50/50">Counterparty / Person</td>
                    <td className="px-4 py-3 font-medium text-slate-900 flex items-center gap-2">
                      <User size={13} className="text-slate-400" />
                      <span>{data.person_name}</span>
                    </td>
                  </tr>
                )}

                {/* Account / Fund Source */}
                {data.account_name && (
                  <tr>
                    <td className="px-4 py-3 font-semibold text-slate-500 bg-slate-50/50">Payment Account / Fund</td>
                    <td className="px-4 py-3 font-medium text-slate-900 flex items-center gap-2">
                      <Building2 size={13} className="text-slate-400" />
                      <span>{data.account_name}</span>
                    </td>
                  </tr>
                )}

                {/* Transfer Breakdown */}
                {data.transaction_type === 'TRANSFER' && (data.from_account_name || data.to_account_name) && (
                  <tr>
                    <td className="px-4 py-3 font-semibold text-slate-500 bg-slate-50/50">Transfer Route</td>
                    <td className="px-4 py-3 font-medium text-slate-900 flex items-center gap-2">
                      <span className="font-bold">{data.from_account_name || 'Source Account'}</span>
                      <ArrowRight size={13} className="text-slate-400" />
                      <span className="font-bold text-emerald-600">{data.to_account_name || 'Destination Account'}</span>
                    </td>
                  </tr>
                )}

                {/* Reference Code */}
                {data.reference && (
                  <tr>
                    <td className="px-4 py-3 font-semibold text-slate-500 bg-slate-50/50">Reference Code</td>
                    <td className="px-4 py-3 font-mono font-medium text-slate-900">{data.reference}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 5. Authorization & Verification Section */}
          <div className="grid grid-cols-2 gap-8 pt-8 mt-6 border-t border-slate-200 text-xs">
            {/* Left signature */}
            <div className="flex flex-col justify-end">
              <div className="border-t border-slate-400 w-48 pt-1 text-slate-600">
                <p className="font-bold text-slate-900">{data.user_name || 'Authorized Account Holder'}</p>
                <p className="text-[10px] text-slate-400">Prepared & Recorded By</p>
              </div>
            </div>

            {/* Right signature / digital seal */}
            <div className="flex flex-col items-end justify-end">
              <div className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
                <ShieldCheck size={16} className="text-emerald-600" />
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  Verified Electronic Record
                </span>
              </div>
              <div className="border-t border-slate-400 w-48 pt-1 text-right text-slate-600">
                <p className="font-bold text-slate-900">Balqen Ledger Authority</p>
                <p className="text-[10px] text-slate-400">Valid without physical signature</p>
              </div>
            </div>
          </div>

          {/* 6. Document Footer */}
          <div className="mt-8 pt-4 border-t border-slate-100 text-center text-[10px] text-slate-400">
            <p>Generated by Balqen Ledger System • Document ID: {data.id.toUpperCase()} • Generated on {new Date().toLocaleDateString('en-US')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
