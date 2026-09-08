import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Mail } from 'lucide-react';
import Modal from '../Modal';
import { loansApi } from '../../api/client';
import type { Loan, Account } from '../../types';

interface LoanRepayModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan | null;
  accounts?: Account[];
  onSuccess?: () => void;
}

const toNum = (v: any): number => (typeof v === 'number' ? v : parseFloat(v) || 0);

const formatCurrency = (amount: number) =>
  `৳${amount.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export default function LoanRepayModal({
  isOpen,
  onClose,
  loan,
  accounts,
  onSuccess,
}: LoanRepayModalProps) {
  const queryClient = useQueryClient();

  const [repayAmount, setRepayAmount] = useState('');
  const [repayDate, setRepayDate] = useState(new Date().toISOString().split('T')[0]);
  const [repayAccountId, setRepayAccountId] = useState('');
  const [repayNotes, setRepayNotes] = useState('');
  const [repaySendReceipt, setRepaySendReceipt] = useState(false);

  useEffect(() => {
    if (loan) {
      setRepayAmount(String(toNum(loan.remaining_amount)));
      setRepayDate(new Date().toISOString().split('T')[0]);
      setRepayAccountId('');
      setRepayNotes('');
      setRepaySendReceipt(false);
    }
  }, [loan, isOpen]);

  const resetForm = () => {
    setRepayAmount('');
    setRepayDate(new Date().toISOString().split('T')[0]);
    setRepayAccountId('');
    setRepayNotes('');
    setRepaySendReceipt(false);
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  const repayMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => loansApi.createRepayment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Repayment transaction logged!');
      handleClose();
      onSuccess?.();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error?.message || 'Failed to log repayment';
      toast.error(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loan) return;
    repayMutation.mutate({
      id: loan.id,
      data: {
        amount: parseFloat(repayAmount),
        repayment_date: repayDate,
        account_id: repayAccountId,
        notes: repayNotes || undefined,
        send_receipt: repaySendReceipt,
      },
    });
  };

  if (!loan) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Record Loan Repayment"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Counterparty:</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {loan.person_name || 'Unknown Contact'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Direction:</span>
            <span
              className={`font-bold ${
                loan.direction === 'LENT'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {loan.direction === 'LENT' ? 'Collecting from them' : 'Paying them back'}
            </span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-slate-800">
            <span className="text-slate-500 font-semibold">Remaining Balance:</span>
            <span className="font-extrabold font-mono text-sm text-amber-600 dark:text-amber-400">
              {formatCurrency(toNum(loan.remaining_amount))}
            </span>
          </div>
        </div>

        <div>
          <label className="label">Repayment Amount (৳)</label>
          <input
            type="number"
            className="input font-mono font-bold text-base"
            step="0.01"
            min="0.01"
            max={toNum(loan.remaining_amount)}
            value={repayAmount}
            onChange={(e) => setRepayAmount(e.target.value)}
            required
          />

          {/* Quick Amount Percentage Shortcuts */}
          <div className="flex gap-1.5 mt-2">
            {[
              { label: '25%', fraction: 0.25 },
              { label: '50%', fraction: 0.5 },
              { label: '75%', fraction: 0.75 },
              { label: '100% Full', fraction: 1 },
            ].map(({ label, fraction }) => {
              const amt = Math.round(toNum(loan.remaining_amount) * fraction * 100) / 100;
              const isActive = parseFloat(repayAmount) === amt;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setRepayAmount(String(amt))}
                  className={`flex-1 text-[10px] font-bold py-1.5 rounded-lg border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-brand-600 dark:bg-brand-500 text-white border-brand-600 dark:border-brand-500'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-brand-400'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Balance Preview */}
          {repayAmount && (
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50">
              <span>Balance after payment:</span>
              <span className="font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                {formatCurrency(
                  Math.max(0, toNum(loan.remaining_amount) - (parseFloat(repayAmount) || 0))
                )}
              </span>
            </div>
          )}
        </div>

        <div>
          <label className="label">Settlement Account</label>
          <select
            className="input text-xs font-medium"
            value={repayAccountId}
            onChange={(e) => setRepayAccountId(e.target.value)}
            required
          >
            <option value="">Select funding account...</option>
            {accounts?.map((a: Account) => (
              <option key={a.account_id} value={a.account_id}>
                {a.account_name} ({formatCurrency(a.current_balance)})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Payment Date</label>
          <input
            type="date"
            className="input text-xs"
            value={repayDate}
            onChange={(e) => setRepayDate(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="label">Notes / Remarks (Optional)</label>
          <input
            type="text"
            className="input text-xs"
            placeholder="e.g. Month 1 installment, Bank transfer ref..."
            value={repayNotes}
            onChange={(e) => setRepayNotes(e.target.value)}
          />
        </div>

        <div className="p-3.5 rounded-xl bg-brand-50/60 dark:bg-brand-950/40 border border-brand-200/70 dark:border-brand-900/60">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={repaySendReceipt}
              onChange={(e) => setRepaySendReceipt(e.target.checked)}
              className="mt-0.5 rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
            />
            <div>
              <p className="text-xs font-bold text-brand-900 dark:text-brand-200 flex items-center gap-1.5">
                <Mail size={13} className="text-brand-600 dark:text-brand-400" />
                <span>Send PDF Repayment Receipt to Contact</span>
              </p>
              <p className="text-[11px] text-brand-700 dark:text-brand-300 mt-0.5">
                Email an official transaction receipt confirming payment to the contact.
              </p>
            </div>
          </label>
        </div>

        <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/80">
          <button
            type="button"
            className="btn-secondary flex-1 text-xs"
            onClick={handleClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary flex-1 text-xs shadow-md shadow-brand-500/20"
            disabled={repayMutation.isPending}
          >
            {repayMutation.isPending ? 'Logging Repayment...' : 'Confirm Repayment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
