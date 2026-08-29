import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountsApi } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import QueryError from '../components/QueryError';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { Plus, Wallet, Edit, Trash2, Building, Banknote, Smartphone } from 'lucide-react';
import type { Account } from '../types';

const formatCurrency = (amount: number) =>
  `৳${amount.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const ACCOUNT_TYPE_ICONS: Record<string, React.ReactNode> = {
  BANK: <Building size={20} className="text-blue-600" />,
  CASH: <Banknote size={20} className="text-green-600" />,
  MOBILE_WALLET: <Smartphone size={20} className="text-purple-600" />,
  OTHER: <Wallet size={20} className="text-gray-600" />,
};

export default function AccountsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

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
      toast.success('Account created!');
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => accountsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Account updated!');
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => accountsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
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

  if (isLoading) return <LoadingSpinner />;
  if (isError) return <QueryError onRetry={() => refetch()} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
          <p className="text-gray-500">Manage your money accounts</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary">
          <Plus size={16} className="mr-1" /> New Account
        </button>
      </div>

      {accounts && accounts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc: Account) => (
            <div key={acc.account_id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    {ACCOUNT_TYPE_ICONS[acc.account_type] || <Wallet size={20} />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{acc.name}</h3>
                    <p className="text-xs text-gray-500">{acc.account_type.replace('_', ' ')}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(acc)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => {
                    if (confirm('Delete this account?')) deleteMutation.mutate(acc.account_id);
                  }} className="p-2 hover:bg-red-50 rounded-lg text-red-400">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(acc.current_balance)}</div>
              <p className="text-xs text-gray-500 mt-1">Opening: {formatCurrency(acc.opening_balance)}</p>
              {acc.notes && <p className="text-xs text-gray-500 mt-2 line-clamp-2">{acc.notes}</p>}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No accounts yet"
          description="Create your first account to start tracking your money."
          action={
            <button onClick={() => setShowForm(true)} className="btn-primary">
              <Plus size={16} className="mr-1" /> Add Account
            </button>
          }
        />
      )}

      <Modal isOpen={showForm} onClose={resetForm} title={editingAccount ? 'Edit Account' : 'New Account'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Account Name</label>
            <input type="text" className="input" placeholder="e.g. Dutch-Bangla Bank" value={formName}
              onChange={(e) => setFormName(e.target.value)} required autoFocus />
          </div>
          <div>
            <label className="label">Account Type</label>
            <select className="input" value={formType} onChange={(e) => setFormType(e.target.value)}>
              <option value="BANK">Bank</option>
              <option value="CASH">Cash</option>
              <option value="MOBILE_WALLET">Mobile Wallet</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label className="label">Opening Balance (৳)</label>
            <input type="number" className="input" step="0.01" value={formBalance}
              onChange={(e) => setFormBalance(e.target.value)} />
          </div>
          <div>
            <label className="label">Opening Balance Date</label>
            <input type="date" className="input" value={formBalanceDate}
              onChange={(e) => setFormBalanceDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={2} placeholder="Optional notes..."
              value={formNotes} onChange={(e) => setFormNotes(e.target.value)} />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary flex-1">
              {editingAccount ? 'Update' : 'Create'} Account
            </button>
            <button type="button" className="btn-secondary" onClick={resetForm}>Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
