import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionsApi, accountsApi, peopleApi, categoriesApi } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import QueryError from '../components/QueryError';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { Plus, Filter, Trash2, Edit, Download, FileText, Search, X, Check, ArrowLeftRight, Mail } from 'lucide-react';
import type { Transaction, TransactionType, Account, Person, Category } from '../types';

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
  const [formSendReceipt, setFormSendReceipt] = useState(false);

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
      toast.success('Transaction record added!');
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
      toast.success('Transaction removed');
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
    setFormSendReceipt(false);
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
    if (formSendReceipt && !editingTx) payload.send_receipt = true;

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

  const hasActiveFilters = Object.values(filters).some((val) => val !== '');

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Transaction Ledger
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Track and search every financial entry across your accounts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary text-xs font-semibold px-3.5 py-2 ${
              hasActiveFilters ? 'border-brand-500 text-brand-600 dark:text-brand-400' : ''
            }`}
          >
            <Filter size={15} />
            <span>Filter</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-brand-500" />
            )}
          </button>

          <button
            onClick={() => handleExport('csv')}
            className="btn-secondary text-xs font-semibold px-3.5 py-2"
          >
            <Download size={15} />
            <span>CSV Export</span>
          </button>

          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="btn-primary text-xs font-semibold px-3.5 py-2 shadow-sm shadow-brand-500/20"
          >
            <Plus size={15} />
            <span>New Entry</span>
          </button>
        </div>
      </div>

      {/* Filter Panel Drawer */}
      {showFilters && (
        <div className="card p-5 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800/80">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Search & Filter Ledger
            </h3>
            <button
              onClick={() => setShowFilters(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div>
              <label className="label">Start Date</label>
              <input
                type="date"
                className="input text-xs"
                value={filters.from}
                onChange={(e) => setFilters({ ...filters, from: e.target.value })}
              />
            </div>
            <div>
              <label className="label">End Date</label>
              <input
                type="date"
                className="input text-xs"
                value={filters.to}
                onChange={(e) => setFilters({ ...filters, to: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Account</label>
              <select
                className="input text-xs"
                value={filters.account_id}
                onChange={(e) => setFilters({ ...filters, account_id: e.target.value })}
              >
                <option value="">All Accounts</option>
                {accounts?.map((a: Account) => (
                  <option key={a.account_id} value={a.account_id}>{a.account_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Contact / Person</label>
              <select
                className="input text-xs"
                value={filters.person_id}
                onChange={(e) => setFilters({ ...filters, person_id: e.target.value })}
              >
                <option value="">All People</option>
                {people?.map((p: Person) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Type</label>
              <select
                className="input text-xs"
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              >
                <option value="">All Types</option>
                {TRANSACTION_TYPES.map((t) => (
                  <option key={t} value={t}>{t.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Keyword Search</label>
              <input
                type="text"
                className="input text-xs"
                placeholder="Search notes..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <button onClick={clearFilters} className="btn-secondary text-xs px-3 py-1.5">
              Reset Filters
            </button>
            <button onClick={applyFilters} className="btn-primary text-xs px-4 py-1.5">
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Main Table Card */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <LoadingSpinner message="Fetching transactions log..." />
        ) : txError ? (
          <QueryError title="Failed to load transaction records" onRetry={() => refetchTx()} />
        ) : data?.data && data.data.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800">
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
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                  {data.data.map((tx: Transaction) => (
                    <tr key={tx.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                      <td className="p-4 text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                        {new Date(tx.transaction_date).toLocaleDateString('en-BD', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="p-4 font-bold text-slate-900 dark:text-slate-100 max-w-[220px] truncate">
                        {tx.description || tx.transaction_type.replace('_', ' ')}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className="badge badge-neutral text-[10px]">
                          {tx.transaction_type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500 dark:text-slate-400 font-medium">
                        {tx.account_name || '-'}
                      </td>
                      <td className="p-4 text-slate-500 dark:text-slate-400 font-medium">
                        {tx.person_name || '-'}
                      </td>
                      <td className="p-4 text-slate-500 dark:text-slate-400 font-medium">
                        {tx.category_name ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 dark:text-brand-400">
                            {tx.category_name}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className={`p-4 text-right font-extrabold text-sm whitespace-nowrap ${
                        getEffect(tx) === '+' ? 'text-emerald-600 dark:text-emerald-400' :
                        getEffect(tx) === '-' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'
                      }`}>
                        {getEffect(tx)}{formatCurrency(tx.amount)}
                      </td>
                      <td className="p-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => openEdit(tx)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Edit Record"
                          >
                            <Edit size={15} />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedTxForVoucher(tx);
                              setVoucherType('voucher');
                              setShowVoucherModal(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="PDF Voucher / Receipt"
                          >
                            <FileText size={15} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this transaction record?')) {
                                deleteMutation.mutate(tx.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data.pagination && (
              <Pagination pagination={data.pagination} onPageChange={setPage} />
            )}
          </>
        ) : (
          <EmptyState
            title="No transactions found"
            description="Start logging your income, expenses, or transfers to populate your financial ledger."
            action={
              <button
                onClick={() => { resetForm(); setShowForm(true); }}
                className="btn-primary text-xs font-semibold px-4 py-2"
              >
                <Plus size={15} /> Add First Entry
              </button>
            }
          />
        )}
      </div>

      {/* Modal: Create/Edit Transaction */}
      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); resetForm(); }}
        title={editingTx ? 'Edit Transaction' : 'Record New Transaction'}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Transaction Type</label>
            <select
              className="input text-xs font-semibold"
              value={formType}
              onChange={(e) => { setFormType(e.target.value as TransactionType); setFormCategoryId(''); }}
            >
              {TRANSACTION_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace('_', ' ')}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Amount (৳)</label>
              <input
                type="number"
                className="input font-mono font-bold"
                placeholder="0.00"
                step="0.01"
                min="0.01"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Date</label>
              <input
                type="date"
                className="input"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                required
              />
            </div>
          </div>

          {showFromAccount && (
            <div>
              <label className="label">{showToAccount ? 'Source Account' : 'Account'}</label>
              <select
                className="input"
                value={formAccountId}
                onChange={(e) => setFormAccountId(e.target.value)}
                required
              >
                <option value="">Select account</option>
                {accounts?.map((a: Account) => (
                  <option key={a.account_id} value={a.account_id}>
                    {a.account_name} ({formatCurrency(a.current_balance)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {showToAccount && (
            <div>
              <label className="label">Destination Account</label>
              <select
                className="input"
                value={formToAccountId}
                onChange={(e) => setFormToAccountId(e.target.value)}
                required
              >
                <option value="">Select destination account</option>
                {accounts?.filter((a: Account) => String(a.account_id) !== formAccountId).map((a: Account) => (
                  <option key={a.account_id} value={a.account_id}>
                    {a.account_name} ({formatCurrency(a.current_balance)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {showPerson && (
            <div>
              <label className="label">Person / Contact</label>
              <select
                className="input"
                value={formPersonId}
                onChange={(e) => setFormPersonId(e.target.value)}
                required
              >
                <option value="">Select person</option>
                {people?.map((p: Person) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {showCategory && (
            <div>
              <label className="label">Category</label>
              <select
                className="input"
                value={formCategoryId}
                onChange={(e) => setFormCategoryId(e.target.value)}
              >
                <option value="">Select category</option>
                {filteredCategories?.map((c: Category) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="label">Description / Purpose</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Monthly Grocery Payment"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Reference / Memo</label>
            <input
              type="text"
              className="input"
              placeholder="Optional check #, invoice #, memo"
              value={formReference}
              onChange={(e) => setFormReference(e.target.value)}
            />
          </div>

          {!editingTx && ['LEND', 'BORROW', 'LEND_REPAYMENT', 'BORROW_REPAYMENT'].includes(formType) && (
            <div className="p-3.5 rounded-xl bg-brand-50/60 dark:bg-brand-950/40 border border-brand-200/60 dark:border-brand-900/60">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formSendReceipt}
                  onChange={(e) => setFormSendReceipt(e.target.checked)}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-xs font-bold text-brand-900 dark:text-brand-200 flex items-center gap-1.5">
                    <Mail size={14} /> Send Email PDF Receipt to Contact
                  </p>
                  <p className="text-[11px] text-brand-700 dark:text-brand-300 mt-0.5">
                    Automatically dispatch an official transaction receipt to their registered email address.
                  </p>
                </div>
              </label>
            </div>
          )}

          <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <button
              type="button"
              className="btn-secondary flex-1 text-xs"
              onClick={() => { setShowForm(false); resetForm(); }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1 text-xs shadow-md shadow-brand-500/20"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingTx ? 'Update Entry' : 'Save Transaction'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Voucher Generation Modal */}
      <Modal
        isOpen={showVoucherModal}
        onClose={() => { setShowVoucherModal(false); setSelectedTxForVoucher(null); }}
        title="Generate PDF Financial Document"
      >
        <div className="space-y-4">
          {selectedTxForVoucher && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 text-xs space-y-1">
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                Transaction: <span className="font-normal">{selectedTxForVoucher.description || selectedTxForVoucher.transaction_type}</span>
              </p>
              <p className="text-slate-600 dark:text-slate-400">
                Amount: <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(selectedTxForVoucher.amount)}</span>
              </p>
            </div>
          )}

          <div>
            <label className="label">Document Format</label>
            <div className="space-y-2">
              {([
                { value: 'voucher', label: 'Transaction Voucher', description: 'Internal audit & accounting record' },
                { value: 'receipt', label: 'Payment Receipt', description: 'Official acknowledgment of payment received' },
                { value: 'invoice', label: 'Commercial Invoice', description: 'Bill statement for debt or goods' },
              ] as const).map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    voucherType === opt.value
                      ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/40'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/40'
                  }`}
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
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{opt.label}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{opt.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleGenerateVoucher}
              className="btn-primary flex-1 text-xs py-2.5 flex items-center justify-center gap-1.5 shadow-md shadow-brand-500/20"
            >
              <FileText size={15} />
              <span>Download PDF</span>
            </button>
            <button
              type="button"
              className="btn-secondary text-xs py-2.5"
              onClick={() => { setShowVoucherModal(false); setSelectedTxForVoucher(null); }}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
