import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountsApi } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import QueryError from '../components/QueryError';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import toast from 'react-hot-toast';
import { Plus, Wallet, Edit, Trash2, Building2, Banknote, Smartphone, ShieldCheck, ArrowUpRight } from 'lucide-react';
import type { Account } from '../types';
import { formatDateDMY } from '../utils/format';

const formatCurrency = (amount: number) =>
  `৳${amount.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const ACCOUNT_TYPE_CONFIG: Record<string, { label: string; icon: typeof Building2; gradient: string }> = {
  BANK: {
    label: 'Bank Account',
    icon: Building2,
    gradient: 'from-brand-600 to-indigo-700 text-white',
  },
  CASH: {
    label: 'Cash Reserve',
    icon: Banknote,
    gradient: 'from-emerald-600 to-teal-700 text-white',
  },
  MOBILE_WALLET: {
    label: 'Mobile Banking',
    icon: Smartphone,
    gradient: 'from-purple-600 to-pink-600 text-white',
  },
  OTHER: {
    label: 'Other Fund',
    icon: Wallet,
    gradient: 'from-slate-700 to-slate-900 text-white',
  },
};

export default function AccountsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);

  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('BANK');
  const [formBalance, setFormBalance] = useState('0');
  const [formBalanceDate, setFormBalanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [formNotes, setFormNotes] = useState('');

  const { data: accounts, isLoading, isError, refetch } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list().then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => accountsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('New account created!');
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => accountsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Account details updated');
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => accountsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Account deleted');
    },
  });

  const resetForm = () => {
    setFormName('');
    setFormType('BANK');
    setFormBalance('0');
    setFormBalanceDate(new Date().toISOString().split('T')[0]);
    setFormNotes('');
    setEditingAccount(null);
    setShowForm(false);
  };

  const openEdit = (acc: Account) => {
    setEditingAccount(acc);
    setFormName(acc.name);
    setFormType(acc.account_type);
    setFormBalance(String(acc.opening_balance));
    setFormBalanceDate(acc.opening_balance_date);
    setFormNotes(acc.notes || '');
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: formName,
      account_type: formType,
      opening_balance: parseFloat(formBalance),
      opening_balance_date: formBalanceDate,
      notes: formNotes || undefined,
    };

    if (editingAccount) {
      updateMutation.mutate({ id: editingAccount.account_id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  if (isLoading) return <LoadingSpinner message="Loading account balances..." />;
  if (isError) return <QueryError title="Failed to load accounts" onRetry={() => refetch()} />;

  const totalBalance = accounts?.reduce((sum: number, acc: Account) => sum + (acc.current_balance || 0), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header & Total Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Accounts & Portfolios
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Total Net Funds across all liquidity channels: <strong className="text-brand-600 dark:text-brand-400">{formatCurrency(totalBalance)}</strong>
          </p>
        </div>

        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="btn-primary text-xs font-semibold px-3.5 py-2 shadow-sm shadow-brand-500/20"
        >
          <Plus size={15} />
          <span>Add Account</span>
        </button>
      </div>

      {/* Account Cards Grid */}
      {accounts && accounts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {accounts.map((acc: Account) => {
            const config = ACCOUNT_TYPE_CONFIG[acc.account_type] || ACCOUNT_TYPE_CONFIG.OTHER;
            const Icon = config.icon;

            return (
              <div
                key={acc.account_id}
                className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#111726] shadow-sm hover:shadow-md transition-all group flex flex-col justify-between"
              >
                {/* Top Card Banner */}
                <div className={`p-5 bg-gradient-to-r ${config.gradient} flex items-center justify-between`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                      <Icon size={20} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white tracking-tight">{acc.name}</h3>
                      <p className="text-[11px] text-white/80 font-medium">{config.label}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(acc)}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                      title="Edit Account"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => setDeletingAccount(acc)}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-rose-500/40 text-white transition-colors"
                      title="Delete Account"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 space-y-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                      Current Available Balance
                    </span>
                    <p className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-0.5">
                      {formatCurrency(acc.current_balance)}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Opening: <strong className="text-slate-700 dark:text-slate-300">{formatCurrency(acc.opening_balance)}</strong></span>
                    <span className="text-[11px]">{formatDateDMY(acc.opening_balance_date)}</span>
                  </div>

                  {acc.notes && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/50 line-clamp-2">
                      {acc.notes}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No money accounts configured"
          description="Add your bank accounts, mobile wallets, or cash reserves to track balances."
          action={
            <button onClick={() => setShowForm(true)} className="btn-primary text-xs font-semibold px-4 py-2">
              <Plus size={15} /> Add First Account
            </button>
          }
        />
      )}

      {/* Modal Form */}
      <Modal
        isOpen={showForm}
        onClose={resetForm}
        title={editingAccount ? 'Edit Account Details' : 'Create New Account'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Account Label / Title</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Dutch-Bangla Bank Savings"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="label">Account Type</label>
            <select
              className="input text-xs font-semibold"
              value={formType}
              onChange={(e) => setFormType(e.target.value)}
            >
              <option value="BANK">Bank Account</option>
              <option value="CASH">Cash Reserve</option>
              <option value="MOBILE_WALLET">Mobile Wallet (bKash/Nagad/Rocket)</option>
              <option value="OTHER">Other Fund</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Opening Balance (৳)</label>
              <input
                type="number"
                className="input font-mono font-bold"
                step="0.01"
                value={formBalance}
                onChange={(e) => setFormBalance(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Opening Date</label>
              <input
                type="date"
                className="input"
                value={formBalanceDate}
                onChange={(e) => setFormBalanceDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label">Notes / Description</label>
            <textarea
              className="input"
              rows={2}
              placeholder="Optional account notes, IBAN, or branch info..."
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <button type="button" className="btn-secondary flex-1 text-xs" onClick={resetForm}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1 text-xs shadow-md shadow-brand-500/20"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingAccount ? 'Save Changes' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Account Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingAccount}
        onClose={() => setDeletingAccount(null)}
        onConfirm={() => {
          if (deletingAccount) {
            deleteMutation.mutate(deletingAccount.account_id);
            setDeletingAccount(null);
          }
        }}
        title="Delete Account"
        message={`Are you sure you want to delete ${deletingAccount?.name}? This action cannot be undone and will affect associated transactions.`}
        confirmText="Delete Account"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
