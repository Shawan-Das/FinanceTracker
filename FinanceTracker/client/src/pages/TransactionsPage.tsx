import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionsApi, accountsApi, peopleApi, categoriesApi } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import QueryError from '../components/QueryError';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { Plus, Filter, Trash2, Edit, Download, FileText } from 'lucide-react';
import type { Transaction, TransactionType, Account, Person, Category, Pagination as PaginationType } from '../types';

const formatCurrency = (amount: number) =>
  `৳${amount.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

function toDateStr(d: any): string {
  if (!d) return new Date().toISOString().split('T')[0];
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const date = new Date(d);
  return isNaN(date.getTime()) ? new Date().toISOString().split('T')[0] : date.toISOString().split('T')[0];
}

const TRANSACTION_TYPES: TransactionType[] = [
  'INCOME', 'EXPENSE', 'TRANSFER',
  'LEND', 'LEND_REPAYMENT', 'BORROW', 'BORROW_REPAYMENT',
];

export default function TransactionsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [selectedTxForVoucher, setSelectedTxForVoucher] = useState<Transaction | null>(null);
  const [voucherType, setVoucherType] = useState<'receipt' | 'invoice' | 'voucher'>('voucher');

  // Filters
  const [filters, setFilters] = useState({
    from: '',
    to: '',
    account_id: '',
    person_id: '',
    type: '',
    search: '',
  });

  // Form state
  const [formType, setFormType] = useState<TransactionType>('INCOME');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formAmount, setFormAmount] = useState('');
  const [formAccountId, setFormAccountId] = useState('');
  const [formToAccountId, setFormToAccountId] = useState('');
  const [formPersonId, setFormPersonId] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formReference, setFormReference] = useState('');

  // Queries
  const queryParams: Record<string, any> = { page, limit: 30, ...filters };
  Object.keys(queryParams).forEach((key) => {
    if (!queryParams[key]) delete queryParams[key];
  });

  const { data, isLoading, isError: txError, refetch: refetchTx } = useQuery({
    queryKey: ['transactions', queryParams],
    queryFn: () => transactionsApi.list(queryParams).then((r) => ({ data: r.data.data, pagination: r.data.pagination })),
  });

  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list().then((r) => r.data.data),
  });

  const { data: people } = useQuery({
    queryKey: ['people'],
    queryFn: () => peopleApi.list().then((r) => r.data.data),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list().then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => transactionsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['people'] });
      toast.success('Transaction created!');
      resetForm();
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => transactionsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['people'] });
      toast.success('Transaction updated');
      resetForm();
      setShowForm(false);
    },
    onError: () => {
      toast.error('Failed to update transaction');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => transactionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['people'] });
      toast.success('Transaction deleted');
    },
  });

  const resetForm = () => {
    setFormType('INCOME');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormAmount('');
    setFormAccountId('');
    setFormToAccountId('');
    setFormPersonId('');
    setFormCategoryId('');
    setFormDescription('');
    setFormReference('');
    setEditingTx(null);
  };

  const openEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setFormType(tx.transaction_type);
    setFormDate(toDateStr(tx.transaction_date));
    setFormAmount(String(tx.amount));
    setFormAccountId(tx.account_id ? String(tx.account_id) : '');
    setFormToAccountId(tx.transfer?.to_account_id ? String(tx.transfer.to_account_id) : '');
    setFormPersonId(tx.person_id ? String(tx.person_id) : '');
    setFormCategoryId(tx.category_id ? String(tx.category_id) : '');
    setFormDescription(tx.description || '');
    setFormReference(tx.reference || '');
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      transaction_type: formType,
      transaction_date: formDate,
      amount: parseFloat(formAmount),
      description: formDescription || undefined,
      reference: formReference || undefined,
    };
    if (formAccountId) payload.account_id = formAccountId;
    if (formToAccountId && formType === 'TRANSFER') payload.to_account_id = formToAccountId;
    if (formPersonId) payload.person_id = formPersonId;
    if (formCategoryId) payload.category_id = formCategoryId;

    if (editingTx) {
      updateMutation.mutate({
        id: editingTx.id,
        data: {
          transaction_date: payload.transaction_date,
          amount: payload.amount,
          account_id: payload.account_id || null,
          person_id: payload.person_id || null,
          category_id: payload.category_id || null,
          description: payload.description,
          reference: payload.reference,
        },
      });
    } else {
      createMutation.mutate(payload);
    }
  };

  const applyFilters = () => {
    setPage(1);
    setShowFilters(false);
  };

  const clearFilters = () => {
    setFilters({ from: '', to: '', account_id: '', person_id: '', type: '', search: '' });
    setPage(1);
  };

  const getEffect = (tx: Transaction): string => {
    if (['INCOME', 'LEND_REPAYMENT', 'BORROW'].includes(tx.transaction_type)) return '+';
    if (['EXPENSE', 'LEND', 'BORROW_REPAYMENT'].includes(tx.transaction_type)) return '-';
    return '±';
  };

  const getEffectColor = (tx: Transaction): string => {
    const e = getEffect(tx);
    if (e === '+') return 'text-green-600';
    if (e === '-') return 'text-red-600';
    return 'text-gray-600';
  };

  const showPerson = ['LEND', 'LEND_REPAYMENT', 'BORROW', 'BORROW_REPAYMENT'].includes(formType);
  const showFromAccount = formType !== 'ADJUSTMENT';
  const showToAccount = formType === 'TRANSFER';
  const showCategory = ['INCOME', 'EXPENSE'].includes(formType);

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const exportParams: Record<string, any> = { format };
      if (filters.from) exportParams.from = filters.from;
      if (filters.to) exportParams.to = filters.to;
      if (filters.type) exportParams.type = filters.type;

      const response = await transactionsApi.export(exportParams);
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      toast.error('Failed to export transactions');
    }
  };

  const handleGenerateVoucher = async () => {
    if (!selectedTxForVoucher) return;
    try {
      const response = await transactionsApi.voucher(selectedTxForVoucher.id, voucherType);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${voucherType}-${selectedTxForVoucher.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setShowVoucherModal(false);
      setSelectedTxForVoucher(null);
    } catch {
      toast.error('Failed to generate voucher');
    }
  };

  const filteredCategories = categories?.filter((c: Category) => {
    if (formType === 'INCOME') return c.type === 'INCOME';
    if (formType === 'EXPENSE') return c.type === 'EXPENSE';
    return false;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-500">Your complete financial ledger</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowFilters(!showFilters)} className="btn-secondary">
            <Filter size={16} className="mr-1" /> Filters
          </button>
          <button onClick={() => handleExport('csv')} className="btn-secondary">
            <Download size={16} className="mr-1" /> Export CSV
          </button>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary">
            <Plus size={16} className="mr-1" /> New Transaction
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="card">
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="label">From Date</label>
              <input type="date" className="input" value={filters.from}
                onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
            </div>
            <div>
              <label className="label">To Date</label>
              <input type="date" className="input" value={filters.to}
                onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
            </div>
            <div>
              <label className="label">Account</label>
              <select className="input" value={filters.account_id}
                onChange={(e) => setFilters({ ...filters, account_id: e.target.value })}>
                <option value="">All Accounts</option>
                {accounts?.map((a: Account) => (
                  <option key={a.account_id} value={a.account_id}>{a.account_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Person</label>
              <select className="input" value={filters.person_id}
                onChange={(e) => setFilters({ ...filters, person_id: e.target.value })}>
                <option value="">All People</option>
                {people?.map((p: Person) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input" value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
                <option value="">All Types</option>
                {TRANSACTION_TYPES.map((t) => (
                  <option key={t} value={t}>{t.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Search</label>
              <input type="text" className="input" placeholder="Description..." value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={applyFilters} className="btn-primary">Apply</button>
            <button onClick={clearFilters} className="btn-secondary">Clear</button>
          </div>
        </div>
      )}

      {/* Transaction Table */}
      <div className="card p-0">
        {isLoading ? (
          <LoadingSpinner />
        ) : txError ? (
          <QueryError title="Failed to load transactions" onRetry={() => refetchTx()} />
        ) : data?.data && data.data.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-200">
                    <th className="p-4">Date</th>
                    <th className="p-4">Description</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Account</th>
                    <th className="p-4">Person</th>
                    <th className="p-4">Category</th>
                    <th className="p-4 text-right">Amount</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((tx: Transaction) => (
                    <tr key={tx.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="p-4 text-sm text-gray-500 whitespace-nowrap">
                        {new Date(tx.transaction_date).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-sm text-gray-900 max-w-[200px] truncate">
                        {tx.description || tx.transaction_type.replace('_', ' ')}
                      </td>
                      <td className="p-4">
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                          {tx.transaction_type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-gray-500">{tx.account_name || '-'}</td>
                      <td className="p-4 text-sm text-gray-500">{tx.person_name || '-'}</td>
                      <td className="p-4 text-sm text-gray-500">{tx.category_name || '-'}</td>
                      <td className={`p-4 text-sm font-semibold text-right whitespace-nowrap ${getEffectColor(tx)}`}>
                        {getEffect(tx)}{formatCurrency(tx.amount)}
                      </td>
                      <td className="p-4 text-right">
                        <button onClick={() => openEdit(tx)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 mr-1" title="Edit">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => {
                          setSelectedTxForVoucher(tx);
                          setVoucherType('voucher');
                          setShowVoucherModal(true);
                        }} className="p-2 hover:bg-blue-50 rounded-lg text-blue-500 mr-1" title="Generate Voucher">
                          <FileText size={16} />
                        </button>
                        <button onClick={() => {
                          if (confirm('Delete this transaction?')) deleteMutation.mutate(tx.id);
                        }} className="p-2 hover:bg-red-50 rounded-lg text-red-500" title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.pagination && (
              <div className="px-4">
                <Pagination pagination={data.pagination} onPageChange={setPage} />
              </div>
            )}
          </>
        ) : (
          <EmptyState
            title="No transactions yet"
            description="Create your first transaction to start tracking your finances."
            action={
              <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary">
                <Plus size={16} className="mr-1" /> Add Transaction
              </button>
            }
          />
        )}
      </div>

      {/* Create/Edit Transaction Modal */}
      <Modal isOpen={showForm} onClose={() => { setShowForm(false); resetForm(); }}
        title={editingTx ? 'Edit Transaction' : 'New Transaction'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Transaction Type */}
          <div>
            <label className="label">Transaction Type</label>
            <select className="input" value={formType}
              onChange={(e) => { setFormType(e.target.value as TransactionType); setFormCategoryId(''); }}>
              {TRANSACTION_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace('_', ' ')}</option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="label">Amount (৳)</label>
            <input type="number" className="input" placeholder="0.00" step="0.01" min="0.01"
              value={formAmount} onChange={(e) => setFormAmount(e.target.value)} required />
          </div>

          {/* From Account */}
          {showFromAccount && (
            <div>
              <label className="label">{showToAccount ? 'From Account' : 'Account'}</label>
              <select className="input" value={formAccountId}
                onChange={(e) => setFormAccountId(e.target.value)} required>
                <option value="">Select account</option>
                {accounts?.map((a: Account) => (
                  <option key={a.account_id} value={a.account_id}>{a.account_name} ({formatCurrency(a.current_balance)})</option>
                ))}
              </select>
            </div>
          )}

          {/* To Account (for transfers) */}
          {showToAccount && (
            <div>
              <label className="label">To Account</label>
              <select className="input" value={formToAccountId}
                onChange={(e) => setFormToAccountId(e.target.value)} required>
                <option value="">Select destination account</option>
                {accounts?.filter((a: Account) => String(a.account_id) !== formAccountId).map((a: Account) => (
                  <option key={a.account_id} value={a.account_id}>{a.account_name} ({formatCurrency(a.current_balance)})</option>
                ))}
              </select>
            </div>
          )}

          {/* Person */}
          {showPerson && (
            <div>
              <label className="label">Person</label>
              <select className="input" value={formPersonId}
                onChange={(e) => setFormPersonId(e.target.value)} required>
                <option value="">Select person</option>
                {people?.map((p: Person) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Category */}
          {showCategory && (
            <div>
              <label className="label">Category</label>
              <select className="input" value={formCategoryId}
                onChange={(e) => setFormCategoryId(e.target.value)}>
                <option value="">Select category</option>
                {filteredCategories?.map((c: Category) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Date */}
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={formDate}
              onChange={(e) => setFormDate(e.target.value)} required />
          </div>

          {/* Description */}
          <div>
            <label className="label">Description</label>
            <input type="text" className="input" placeholder="What was this transaction for?"
              value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
          </div>

          {/* Reference */}
          <div>
            <label className="label">Reference / Note</label>
            <input type="text" className="input" placeholder="Optional reference"
              value={formReference} onChange={(e) => setFormReference(e.target.value)} />
          </div>

          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={createMutation.isPending || updateMutation.isPending}>
              {editingTx ? 'Update' : 'Save'} Transaction
            </button>
            <button type="button" className="btn-secondary"
              onClick={() => { setShowForm(false); resetForm(); }}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* Voucher Type Selection Modal */}
      <Modal isOpen={showVoucherModal} onClose={() => { setShowVoucherModal(false); setSelectedTxForVoucher(null); }} title="Generate Voucher">
        <div className="space-y-4">
          {selectedTxForVoucher && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">
                Transaction: <span className="font-medium text-gray-900">{selectedTxForVoucher.description || selectedTxForVoucher.transaction_type}</span>
              </p>
              <p className="text-sm text-gray-600">
                Amount: <span className="font-semibold">{formatCurrency(selectedTxForVoucher.amount)}</span>
              </p>
              <p className="text-sm text-gray-600">
                Date: {new Date(selectedTxForVoucher.transaction_date).toLocaleDateString()}
              </p>
            </div>
          )}

          <div>
            <label className="label">Voucher Type</label>
            <div className="space-y-2">
              {([
                { value: 'voucher', label: 'Voucher', description: 'General-purpose transaction voucher' },
                { value: 'receipt', label: 'Receipt', description: 'Acknowledgment of payment received' },
                { value: 'invoice', label: 'Invoice', description: 'Bill or statement of amount due' },
              ] as const).map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                    ${voucherType === opt.value ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'}`}
                >
                  <input
                    type="radio"
                    name="voucherType"
                    value={opt.value}
                    checked={voucherType === opt.value}
                    onChange={(e) => setVoucherType(e.target.value as any)}
                    className="mt-1"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                    <p className="text-xs text-gray-500">{opt.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={handleGenerateVoucher} className="btn-primary flex-1 flex items-center justify-center gap-2">
              <FileText size={16} /> Download PDF
            </button>
            <button type="button" className="btn-secondary" onClick={() => { setShowVoucherModal(false); setSelectedTxForVoucher(null); }}>
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
