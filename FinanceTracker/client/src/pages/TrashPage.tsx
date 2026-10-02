import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  trashApi,
  transactionsApi,
  categoriesApi,
  accountsApi,
  peopleApi,
} from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import QueryError from '../components/QueryError';
import ConfirmModal from '../components/ConfirmModal';
import toast from 'react-hot-toast';
import {
  Trash2,
  RotateCcw,
  Search,
  ArrowLeftRight,
  Tag,
  Wallet,
  Users,
  Building2,
  Banknote,
  Smartphone,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import type { Transaction, Category, Account, Person, TrashCounts } from '../types';
import { formatDateDMY, formatCurrency, formatTxType } from '../utils/format';

type TabType = 'transactions' | 'categories' | 'accounts' | 'people';

const ACCOUNT_TYPE_CONFIG: Record<string, { label: string; icon: typeof Building2 }> = {
  BANK: { label: 'Bank Account', icon: Building2 },
  CASH: { label: 'Cash Reserve', icon: Banknote },
  MOBILE_WALLET: { label: 'Mobile Banking', icon: Smartphone },
  OTHER: { label: 'Other Fund', icon: Wallet },
};

export default function TrashPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab state synced with URL ?tab=...
  const activeTab = (searchParams.get('tab') as TabType) || 'transactions';
  const setActiveTab = (tab: TabType) => {
    setSearchParams({ tab });
    setSearchQuery('');
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [restoringItem, setRestoringItem] = useState<{ id: string; type: TabType; name: string } | null>(null);
  const [showRestoreAllModal, setShowRestoreAllModal] = useState(false);

  // Invalidate all related caches
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['trash'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    queryClient.invalidateQueries({ queryKey: ['categories'] });
    queryClient.invalidateQueries({ queryKey: ['people'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['reports'] });
    queryClient.invalidateQueries({ queryKey: ['loans'] });
  };

  // 1. Recycle bin counts query
  const { data: countsData } = useQuery<TrashCounts>({
    queryKey: ['trash', 'counts'],
    queryFn: () => trashApi.counts().then((r) => r.data.data),
  });

  // 2. Tab-specific data queries
  const {
    data: deletedTransactions,
    isLoading: loadingTx,
    isError: errorTx,
    refetch: refetchTx,
  } = useQuery<Transaction[]>({
    queryKey: ['trash', 'transactions'],
    queryFn: () => transactionsApi.listDeleted().then((r) => r.data.data),
    enabled: activeTab === 'transactions',
  });

  const {
    data: deletedCategories,
    isLoading: loadingCat,
    isError: errorCat,
    refetch: refetchCat,
  } = useQuery<Category[]>({
    queryKey: ['trash', 'categories'],
    queryFn: () => categoriesApi.listDeleted().then((r) => r.data.data),
    enabled: activeTab === 'categories',
  });

  const {
    data: deletedAccounts,
    isLoading: loadingAcc,
    isError: errorAcc,
    refetch: refetchAcc,
  } = useQuery<Account[]>({
    queryKey: ['trash', 'accounts'],
    queryFn: () => accountsApi.listDeleted().then((r) => r.data.data),
    enabled: activeTab === 'accounts',
  });

  const {
    data: deletedPeople,
    isLoading: loadingPpl,
    isError: errorPpl,
    refetch: refetchPpl,
  } = useQuery<Person[]>({
    queryKey: ['trash', 'people'],
    queryFn: () => peopleApi.listDeleted().then((r) => r.data.data),
    enabled: activeTab === 'people',
  });

  // 3. Single restore mutations
  const restoreTxMutation = useMutation({
    mutationFn: (id: string) => transactionsApi.restore(id),
    onSuccess: () => {
      invalidateAll();
      toast.success('Transaction restored successfully!');
      setRestoringItem(null);
    },
  });

  const restoreCatMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.restore(id),
    onSuccess: () => {
      invalidateAll();
      toast.success('Category restored successfully!');
      setRestoringItem(null);
    },
  });

  const restoreAccMutation = useMutation({
    mutationFn: (id: string) => accountsApi.restore(id),
    onSuccess: () => {
      invalidateAll();
      toast.success('Account restored successfully!');
      setRestoringItem(null);
    },
  });

  const restorePplMutation = useMutation({
    mutationFn: (id: string) => peopleApi.restore(id),
    onSuccess: () => {
      invalidateAll();
      toast.success('Person restored successfully!');
      setRestoringItem(null);
    },
  });

  // 4. Bulk restore mutation
  const restoreAllMutation = useMutation({
    mutationFn: (type: TabType) => trashApi.restoreAll(type),
    onSuccess: (res) => {
      invalidateAll();
      const count = res.data.data?.restoredCount ?? 0;
      toast.success(`Successfully restored ${count} item${count === 1 ? '' : 's'}!`);
      setShowRestoreAllModal(false);
    },
  });

  const handleRestoreConfirm = () => {
    if (!restoringItem) return;
    const { id, type } = restoringItem;
    if (type === 'transactions') restoreTxMutation.mutate(id);
    else if (type === 'categories') restoreCatMutation.mutate(id);
    else if (type === 'accounts') restoreAccMutation.mutate(id);
    else if (type === 'people') restorePplMutation.mutate(id);
  };

  const isRestoringSingle =
    restoreTxMutation.isPending ||
    restoreCatMutation.isPending ||
    restoreAccMutation.isPending ||
    restorePplMutation.isPending;

  // Filter lists based on search query
  const filteredTransactions = useMemo(() => {
    if (!deletedTransactions) return [];
    if (!searchQuery.trim()) return deletedTransactions;
    const q = searchQuery.toLowerCase();
    return deletedTransactions.filter(
      (tx) =>
        (tx.description && tx.description.toLowerCase().includes(q)) ||
        (tx.reference && tx.reference.toLowerCase().includes(q)) ||
        (tx.category_name && tx.category_name.toLowerCase().includes(q)) ||
        (tx.account_name && tx.account_name.toLowerCase().includes(q)) ||
        (tx.person_name && tx.person_name.toLowerCase().includes(q)) ||
        String(tx.amount).includes(q)
    );
  }, [deletedTransactions, searchQuery]);

  const filteredCategories = useMemo(() => {
    if (!deletedCategories) return [];
    if (!searchQuery.trim()) return deletedCategories;
    const q = searchQuery.toLowerCase();
    return deletedCategories.filter((c) => c.name.toLowerCase().includes(q));
  }, [deletedCategories, searchQuery]);

  const filteredAccounts = useMemo(() => {
    if (!deletedAccounts) return [];
    if (!searchQuery.trim()) return deletedAccounts;
    const q = searchQuery.toLowerCase();
    return deletedAccounts.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.notes && a.notes.toLowerCase().includes(q)) ||
        a.account_type.toLowerCase().includes(q)
    );
  }, [deletedAccounts, searchQuery]);

  const filteredPeople = useMemo(() => {
    if (!deletedPeople) return [];
    if (!searchQuery.trim()) return deletedPeople;
    const q = searchQuery.toLowerCase();
    return deletedPeople.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.phone && p.phone.toLowerCase().includes(q)) ||
        (p.email && p.email.toLowerCase().includes(q)) ||
        (p.notes && p.notes.toLowerCase().includes(q))
    );
  }, [deletedPeople, searchQuery]);

  const currentTabCount =
    activeTab === 'transactions'
      ? countsData?.transactions ?? 0
      : activeTab === 'categories'
      ? countsData?.categories ?? 0
      : activeTab === 'accounts'
      ? countsData?.accounts ?? 0
      : countsData?.people ?? 0;

  const currentList =
    activeTab === 'transactions'
      ? filteredTransactions
      : activeTab === 'categories'
      ? filteredCategories
      : activeTab === 'accounts'
      ? filteredAccounts
      : filteredPeople;

  const isCurrentTabLoading =
    activeTab === 'transactions'
      ? loadingTx
      : activeTab === 'categories'
      ? loadingCat
      : activeTab === 'accounts'
      ? loadingAcc
      : loadingPpl;

  const isCurrentTabError =
    activeTab === 'transactions'
      ? errorTx
      : activeTab === 'categories'
      ? errorCat
      : activeTab === 'accounts'
      ? errorAcc
      : errorPpl;

  const refetchCurrentTab = () => {
    if (activeTab === 'transactions') refetchTx();
    else if (activeTab === 'categories') refetchCat();
    else if (activeTab === 'accounts') refetchAcc();
    else if (activeTab === 'people') refetchPpl();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#111726] p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-rose-500 flex items-center justify-center text-white shadow-md shadow-amber-500/20 shrink-0">
            <Trash2 size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                Recycle Bin
              </h1>
              {countsData && countsData.total > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                  {countsData.total} {countsData.total === 1 ? 'item' : 'items'}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              View and safely restore deleted transactions, categories, accounts, and people.
            </p>
          </div>
        </div>

        {/* Restore All Button for current tab */}
        {currentTabCount > 0 && (
          <button
            onClick={() => setShowRestoreAllModal(true)}
            disabled={restoreAllMutation.isPending}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-brand-50 hover:bg-brand-100 text-brand-700 dark:bg-brand-950/60 dark:hover:bg-brand-900/60 dark:text-brand-300 border border-brand-200 dark:border-brand-800/60 transition-all shadow-xs shrink-0 self-start sm:self-center"
          >
            <RotateCcw size={15} />
            <span>Restore All {activeTab}</span>
          </button>
        )}
      </div>

      {/* Tabs Bar & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 dark:bg-slate-800/80 rounded-xl overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'transactions'
                ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ArrowLeftRight size={14} />
            <span>Transactions</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === 'transactions'
                  ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300'
                  : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {countsData?.transactions ?? 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'categories'
                ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Tag size={14} />
            <span>Categories</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === 'categories'
                  ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300'
                  : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {countsData?.categories ?? 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('accounts')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'accounts'
                ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Wallet size={14} />
            <span>Accounts</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === 'accounts'
                  ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300'
                  : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {countsData?.accounts ?? 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('people')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'people'
                ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users size={14} />
            <span>People</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === 'people'
                  ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300'
                  : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {countsData?.people ?? 0}
            </span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[240px] max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search deleted ${activeTab}...`}
            className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-[#111726] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-brand-500/30 transition-all"
          />
        </div>
      </div>

      {/* Main Tab Content */}
      {isCurrentTabLoading ? (
        <LoadingSpinner message={`Loading deleted ${activeTab}...`} />
      ) : isCurrentTabError ? (
        <QueryError title={`Failed to load deleted ${activeTab}`} onRetry={refetchCurrentTab} />
      ) : currentList.length === 0 ? (
        <EmptyState
          title={`No deleted ${activeTab} found`}
          description={
            searchQuery
              ? `No items match your search "${searchQuery}". Try a different search term.`
              : `Your ${activeTab} recycle bin is currently empty.`
          }
          icon={<Sparkles size={28} />}
        />
      ) : (
        <div>
          {/* TAB 1: TRANSACTIONS */}
          {activeTab === 'transactions' && (
            <div className="bg-white dark:bg-[#111726] rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Description / Reference</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Account / Person</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4 text-center">Deleted On</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredTransactions.map((tx) => {
                      const isIncome = tx.transaction_type === 'INCOME' || tx.transaction_type === 'LEND_REPAYMENT';
                      const isExpense = tx.transaction_type === 'EXPENSE' || tx.transaction_type === 'BORROW_REPAYMENT';

                      return (
                        <tr
                          key={tx.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3 px-4 whitespace-nowrap text-slate-700 dark:text-slate-300 font-medium">
                            {formatDateDMY(tx.transaction_date)}
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isIncome
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
                                  : isExpense
                                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40'
                                  : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40'
                              }`}
                            >
                              {formatTxType(tx.transaction_type)}
                            </span>
                          </td>

                          <td className="py-3 px-4 max-w-xs">
                            <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {tx.description || 'No description'}
                            </p>
                            {tx.reference && (
                              <p className="text-[11px] text-slate-400 truncate">Ref: {tx.reference}</p>
                            )}
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            {tx.category_name ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px]">
                                <Tag size={12} className="text-slate-400" />
                                {tx.category_name}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap text-slate-600 dark:text-slate-400">
                            {tx.transaction_type === 'TRANSFER' && tx.transfer ? (
                              <span>
                                {tx.transfer.from_account_name} &rarr; {tx.transfer.to_account_name}
                              </span>
                            ) : (
                              <span>{tx.account_name || tx.person_name || '-'}</span>
                            )}
                          </td>

                          <td
                            className={`py-3 px-4 text-right whitespace-nowrap font-bold text-sm ${
                              isIncome
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : isExpense
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-slate-900 dark:text-slate-100'
                            }`}
                          >
                            {isIncome ? '+' : isExpense ? '-' : ''}
                            {formatCurrency(tx.amount)}
                          </td>

                          <td className="py-3 px-4 text-center whitespace-nowrap text-[11px] text-slate-400">
                            {tx.deleted_at ? formatDateDMY(tx.deleted_at) : '-'}
                          </td>

                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <button
                              onClick={() =>
                                setRestoringItem({
                                  id: tx.id,
                                  type: 'transactions',
                                  name: `${formatTxType(tx.transaction_type)}: ${formatCurrency(tx.amount)} (${
                                    tx.description || formatDateDMY(tx.transaction_date)
                                  })`,
                                })
                              }
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 transition-all shadow-xs"
                            >
                              <RotateCcw size={13} />
                              <span>Restore</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: CATEGORIES */}
          {activeTab === 'categories' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="bg-white dark:bg-[#111726] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between gap-3 group hover:border-brand-500/40 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 font-bold text-sm shadow-xs"
                      style={{ backgroundColor: cat.color || (cat.type === 'INCOME' ? '#10b981' : '#f43f5e') }}
                    >
                      <Tag size={18} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                        {cat.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.2 rounded-md ${
                            cat.type === 'INCOME'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                          }`}
                        >
                          {cat.type}
                        </span>
                        {cat.usage_count !== undefined && (
                          <span className="text-[11px] text-slate-400">
                            {cat.usage_count} {cat.usage_count === 1 ? 'tx' : 'txs'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      setRestoringItem({
                        id: cat.id,
                        type: 'categories',
                        name: `${cat.name} (${cat.type})`,
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 transition-all shadow-xs shrink-0"
                  >
                    <RotateCcw size={13} />
                    <span>Restore</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: ACCOUNTS */}
          {activeTab === 'accounts' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredAccounts.map((acc) => {
                const config = ACCOUNT_TYPE_CONFIG[acc.account_type] || ACCOUNT_TYPE_CONFIG.OTHER;
                const Icon = config.icon;

                return (
                  <div
                    key={acc.account_id}
                    className="bg-white dark:bg-[#111726] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between gap-4 group hover:border-brand-500/40 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                          <Icon size={18} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                            {acc.name}
                          </h3>
                          <p className="text-[11px] text-slate-400 font-medium">{config.label}</p>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40 shrink-0">
                        Inactive
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-semibold">Current Balance</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {formatCurrency(acc.current_balance ?? acc.opening_balance ?? 0)}
                        </p>
                      </div>

                      <button
                        onClick={() =>
                          setRestoringItem({
                            id: acc.account_id,
                            type: 'accounts',
                            name: `${acc.name} (${config.label})`,
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 transition-all shadow-xs"
                      >
                        <RotateCcw size={13} />
                        <span>Restore</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 4: PEOPLE */}
          {activeTab === 'people' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredPeople.map((person) => (
                <div
                  key={person.id}
                  className="bg-white dark:bg-[#111726] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between gap-4 group hover:border-brand-500/40 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                        {person.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                          {person.name}
                        </h3>
                        {person.phone && (
                          <p className="text-[11px] text-slate-400 truncate">{person.phone}</p>
                        )}
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40 shrink-0">
                      Archived
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                    <div>
                      {person.amount_they_owe_you > 0 ? (
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          Owes you: {formatCurrency(person.amount_they_owe_you)}
                        </p>
                      ) : person.amount_you_owe_them > 0 ? (
                        <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
                          You owe: {formatCurrency(person.amount_you_owe_them)}
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-400">All settled</p>
                      )}
                    </div>

                    <button
                      onClick={() =>
                        setRestoringItem({
                          id: person.id,
                          type: 'people',
                          name: person.name,
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 transition-all shadow-xs"
                    >
                      <RotateCcw size={13} />
                      <span>Restore</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal for Single Restore */}
      <ConfirmModal
        isOpen={!!restoringItem}
        onClose={() => setRestoringItem(null)}
        onConfirm={handleRestoreConfirm}
        title={`Restore ${
          restoringItem?.type === 'transactions'
            ? 'Transaction'
            : restoringItem?.type === 'categories'
            ? 'Category'
            : restoringItem?.type === 'accounts'
            ? 'Account'
            : 'Person'
        }`}
        message={
          <div>
            <p>Are you sure you want to restore this item?</p>
            <p className="mt-2 font-semibold text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
              {restoringItem?.name}
            </p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              It will immediately be returned to your active list and dashboards.
            </p>
          </div>
        }
        confirmText="Restore Item"
        cancelText="Cancel"
        variant="primary"
        isLoading={isRestoringSingle}
      />

      {/* Confirmation Modal for Restore All */}
      <ConfirmModal
        isOpen={showRestoreAllModal}
        onClose={() => setShowRestoreAllModal(false)}
        onConfirm={() => restoreAllMutation.mutate(activeTab)}
        title={`Restore All Deleted ${activeTab}`}
        message={`Are you sure you want to restore all ${currentTabCount} deleted ${activeTab}? They will be brought back into your active workspace.`}
        confirmText="Yes, Restore All"
        cancelText="Cancel"
        variant="primary"
        isLoading={restoreAllMutation.isPending}
      />
    </div>
  );
}
