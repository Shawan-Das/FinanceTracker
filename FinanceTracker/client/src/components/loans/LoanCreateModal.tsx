import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowUpRight, ArrowDownRight, Mail } from 'lucide-react';
import Modal from '../Modal';
import { loansApi } from '../../api/client';
import type { Person, Account } from '../../types';

interface LoanCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  people?: Person[];
  accounts?: Account[];
  onSuccess?: () => void;
}

const formatCurrency = (amount: number) =>
  `৳${amount.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export default function LoanCreateModal({
  isOpen,
  onClose,
  people,
  accounts,
  onSuccess,
}: LoanCreateModalProps) {
  const queryClient = useQueryClient();

  const [direction, setDirection] = useState<'BORROWED' | 'LENT'>('LENT');
  const [personId, setPersonId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [principal, setPrincipal] = useState('');
  const [interest, setInterest] = useState('0');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [loanSendReceipt, setLoanSendReceipt] = useState(false);

  const resetForm = () => {
    setDirection('LENT');
    setPersonId('');
    setAccountId('');
    setPrincipal('');
    setInterest('0');
    setStartDate(new Date().toISOString().split('T')[0]);
    setDueDate('');
    setDescription('');
    setLoanSendReceipt(false);
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  const createMutation = useMutation({
    mutationFn: (data: any) => loansApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Loan position recorded!');
      handleClose();
      onSuccess?.();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error?.message || 'Failed to create loan agreement';
      toast.error(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      direction,
      person_id: personId || undefined,
      account_id: accountId || undefined,
      principal_amount: parseFloat(principal),
      interest_amount: parseFloat(interest) || 0,
      start_date: startDate,
      due_date: dueDate || undefined,
      description: description || undefined,
      send_receipt: loanSendReceipt,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Record New Loan Agreement"
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Direction Tabs */}
        <div>
          <label className="label">Loan Direction</label>
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setDirection('LENT')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                direction === 'LENT'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <ArrowUpRight size={14} />
              <span>I Lent Money (Receivable)</span>
            </button>
            <button
              type="button"
              onClick={() => setDirection('BORROWED')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                direction === 'BORROWED'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <ArrowDownRight size={14} />
              <span>I Borrowed Money (Payable)</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Counterparty / Person</label>
            <select
              className="input text-xs font-medium"
              value={personId}
              onChange={(e) => setPersonId(e.target.value)}
              required
            >
              <option value="">Select contact from directory...</option>
              {people?.map((p: Person) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.phone ? `(${p.phone})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Funding / Settlement Account</label>
            <select
              className="input text-xs font-medium"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
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
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Principal Amount (৳)</label>
            <input
              type="number"
              className="input font-mono font-bold text-xs"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={principal}
              onChange={(e) => setPrincipal(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Interest / Markup (Optional ৳)</label>
            <input
              type="number"
              className="input font-mono text-xs"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={interest}
              onChange={(e) => setInterest(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Agreement Start Date</label>
            <input
              type="date"
              className="input text-xs"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Expected Due Date (Optional)</label>
            <input
              type="date"
              className="input text-xs"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="label">Description / Agreement Purpose (Optional)</label>
          <input
            type="text"
            className="input text-xs"
            placeholder="e.g. Business equipment purchase, Emergency loan..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {personId && (
          <div className="p-3.5 rounded-xl bg-brand-50/60 dark:bg-brand-950/40 border border-brand-200/70 dark:border-brand-900/60">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={loanSendReceipt}
                onChange={(e) => setLoanSendReceipt(e.target.checked)}
                className="mt-0.5 rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
              />
              <div>
                <p className="text-xs font-bold text-brand-900 dark:text-brand-200 flex items-center gap-1.5">
                  <Mail size={13} className="text-brand-600 dark:text-brand-400" />
                  <span>Email Agreement PDF to Contact</span>
                </p>
                <p className="text-[11px] text-brand-700 dark:text-brand-300 mt-0.5">
                  Automatically send an official statement of loan terms to their registered email address.
                </p>
              </div>
            </label>
          </div>
        )}

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
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating...' : 'Create Loan Agreement'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
