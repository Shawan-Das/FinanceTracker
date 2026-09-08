import { useState } from 'react';
import { Printer, X, Calendar, Download, Eye, FileText, CheckCircle2 } from 'lucide-react';
import { formatDateDMY } from '../utils/format';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportTitle: string;
  dateFrom: string;
  dateTo: string;
  onDateFromChange?: (val: string) => void;
  onDateToChange?: (val: string) => void;
  showDateControls?: boolean;
  children: React.ReactNode;
}

export default function PrintPreviewModal({
  isOpen,
  onClose,
  reportTitle,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  showDateControls = true,
  children,
}: PrintPreviewModalProps) {
  const [paperSize, setPaperSize] = useState<'A4' | 'Letter'>('A4');

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const periodLabel =
    dateFrom && dateTo
      ? `${formatDateDMY(dateFrom)} – ${formatDateDMY(dateTo)}`
      : dateFrom
      ? `From ${formatDateDMY(dateFrom)}`
      : dateTo
      ? `Until ${formatDateDMY(dateTo)}`
      : 'All Time Records';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150 print:hidden">
      <div
        className="relative bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-800 shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header & Control Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold">
              <Eye size={16} />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Print &amp; PDF Export Preview</span>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border border-slate-200 dark:border-slate-700">
                  {paperSize}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {reportTitle} • {periodLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Paper Size selector */}
            <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-900 rounded-lg p-0.5 border border-slate-200 dark:border-slate-800 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setPaperSize('A4')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  paperSize === 'A4'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                A4
              </button>
              <button
                type="button"
                onClick={() => setPaperSize('Letter')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  paperSize === 'Letter'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Letter
              </button>
            </div>

            <button
              onClick={handlePrint}
              type="button"
              className="btn-primary text-xs flex items-center gap-2 px-4 py-2 shadow-md shadow-brand-500/20"
            >
              <Printer size={14} />
              <span>Print / Save PDF</span>
            </button>

            <button
              onClick={onClose}
              type="button"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close preview"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Date Filter Bar in Preview (if enabled) */}
        {showDateControls && (onDateFromChange || onDateToChange) && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-semibold">
              <Calendar size={13} className="text-brand-500" />
              <span>Adjust Date Scope:</span>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-[11px] text-slate-500">From:</label>
              <input
                type="date"
                className="input py-1 px-2 text-xs h-7"
                value={dateFrom}
                onChange={(e) => onDateFromChange?.(e.target.value)}
              />
              <label className="text-[11px] text-slate-500 ml-1">To:</label>
              <input
                type="date"
                className="input py-1 px-2 text-xs h-7"
                value={dateTo}
                onChange={(e) => onDateToChange?.(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Paper Canvas Viewport */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200/70 dark:bg-slate-950/80 flex justify-center">
          <div
            className="w-full max-w-4xl bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-300 p-8 sm:p-12 space-y-6"
            style={{ minHeight: '800px' }}
          >
            {/* Printable Document Header */}
            <div className="border-b-2 border-slate-800 pb-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-xl tracking-tight bg-slate-900 text-white px-2.5 py-1 rounded-lg">
                      BALQEN
                    </span>
                    <span className="text-base font-extrabold text-slate-900 tracking-tight">
                      FinanceTracker
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    Executive Financial Intelligence &amp; Ledger Statements
                  </p>
                </div>
                <div className="text-right text-xs text-slate-600 space-y-0.5">
                  <p className="font-bold text-slate-900">Official Report</p>
                  <p>Generated: {new Date().toLocaleDateString('en-BD', { dateStyle: 'medium' })}</p>
                  <p className="text-[11px] text-slate-500">Document ID: REP-{Date.now().toString().slice(-6)}</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
                    Statement Type
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900">{reportTitle}</h3>
                </div>
                <div className="text-right">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
                    Reporting Range
                  </span>
                  <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                    {periodLabel}
                  </span>
                </div>
              </div>
            </div>

            {/* Document Content Render */}
            <div className="space-y-6 text-slate-900">{children}</div>

            {/* Document Footer */}
            <div className="mt-12 pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-1">
                <CheckCircle2 size={12} className="text-emerald-500" />
                <span>Verified System Extract • Confidential Financial Information</span>
              </div>
              <p>Page 1 of 1</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
