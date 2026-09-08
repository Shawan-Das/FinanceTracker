import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Modal from '../Modal';
import { loansApi } from '../../api/client';
import type { Loan, Account } from '../../types';

interface LoanAddFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan | null;
  accounts?: Account[];
  onSuccess?: () => void;
}

const toNum = (v: any): number => (typeof v === 'number' ? v : parseFloat(v) || 0);

const formatCurrency = (amount: number) =>
  `৳${amount.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export default function LoanAddFundsModal({
  isOpen,
  onClose,
  loan,
  accounts,
  onSuccess,
}: LoanAddFundsModalProps) {
  const queryClient = useQueryClient();

  const [addFundsAmount, setAddFundsAmount] = useState('');
  const [addFundsAccountId, setAddFundsAccountId] = useState('');
  const [addFundsDate, setAddFundsDate] = useState(new Date().toISOString().split('T')[0]);
  const [addFundsDescription, setAddFundsDescription] = useState('');

  const resetForm = () => {
    setAddFundsAmount('');
    setAddFundsAccountId('');
    setAddFundsDate(new Date().toISOString().split('T')[0]);
    setAddFundsDescription('');
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  const addFundsMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => loansApi.addFunds(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Funds added to loan successfully!');
      handleClose();
      onSuccess?.();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error?.message || 'Failed to add funds';
      toast.error(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loan) return;
    addFundsMutation.mutate({
      id: loan.id,
      data: {
        amount: parseFloat(addFundsAmount),
        account_id: addFundsAccountId,
        date: addFundsDate || undefined,
        description: addFundsDescription || undefined,
      },
    });
  };

  if (!loan) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add More Capital / Funds to Loan"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Target Contact:</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {loan.person_name || 'Unknown Contact'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Current Principal:</span>
            <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">
              {formatCurrency(toNum(loan.principal_amount))}
            </span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-slate-800">
            <span className="text-slate-400">Current Remaining:</span>
            <span className="font-extrabold font-mono text-amber-600 dark:text-amber-400">
              {formatCurrency(toNum(loan.remaining_amount))}
            </span>
          </div>
        </div>

        <div>
          <label className="label">Additional Amount (৳)</label>
          <input
            type="number"
            className="input font-mono font-bold text-base"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={addFundsAmount}
            onChange={(e) => setAddFundsAmount(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="label">Funding Account</label>
          <select
            className="input text-xs font-medium"
            value={addFundsAccountId}
            onChange={(e) => setAddFundsAccountId(e.target.value)}
            required
          >
            <option value="">Select account...</option>
            {accounts?.map((a: Account) => (
              <option key={a.account_id} value={a.account_id}>
                {a.account_name} ({formatCurrency(a.current_balance)})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Transaction Date</label>
          <input
            type="date"
            className="input text-xs"
            value={addFundsDate}
            onChange={(e) => setAddFundsDate(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="label">Description / Memo (Optional)</label>
          <input
            type="text"
            className="input text-xs"
            placeholder="e.g. Additional top-up emergency funds"
            value={addFundsDescription}
            onChange={(e) => setAddFundsDescription(e.target.value)}
          />
        </div>

        <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/60 text-xs text-emerald-700 dark:text-emerald-300">
          This will increase the loan principal and automatically adjust the chosen account ledger.
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
            className="flex-1 text-xs py-2.5 font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20 transition-all"
            disabled={addFundsMutation.isPending}
          >
            {addFundsMutation.isPending ? 'Adding Funds...' : 'Add Funds'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
