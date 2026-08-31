import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi, transactionsApi } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import QueryError from '../components/QueryError';
import VoucherModal, { VoucherReportData } from '../components/VoucherModal';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  PlusCircle,
  ArrowLeftRight,
  PieChart as PieChartIcon,
  ChevronRight,
  ShieldAlert,
  Tag,
  Zap,
  Clock,
  Sparkles,
  Building2,
  Banknote,
  Smartphone,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { formatDateDMY, formatCurrency } from '../utils/format';
import QuickTransactionModal, { QUICK_PRESETS, QuickPreset } from '../components/QuickTransactionModal';
import CreatePresetModal from '../components/CreatePresetModal';
import { detectSmartSuggestions, SmartSuggestion } from '../utils/smartSuggestions';
import type { Transaction, DashboardSummary, Account } from '../types';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899', '#06b6d4', '#3b82f6'];

const toNum = (v: any): number => (typeof v === 'number' ? v : parseFloat(v) || 0);

const getTransactionEffect = (tx: Transaction): string => {
  const type = tx.transaction_type;
  if (['INCOME', 'LEND_REPAYMENT', 'BORROW'].includes(type)) return '+';
  if (['EXPENSE', 'LEND', 'BORROW_REPAYMENT'].includes(type)) return '-';
  if (type === 'TRANSFER') return '↔';
  return '±';
};

const getTransactionBadge = (tx: Transaction) => {
  const effect = getTransactionEffect(tx);
  if (effect === '+') return 'badge-success';
  if (effect === '-') return 'badge-danger';
  return 'badge-neutral';
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const isDark = resolvedTheme === 'dark';

  // Fast 1-Click Transaction Modal state
  const [quickPreset, setQuickPreset] = useState<QuickPreset | null>(null);
  const [isQuickOpen, setIsQuickOpen] = useState(false);
  const [isCreatePresetOpen, setIsCreatePresetOpen] = useState(false);
  const [presetTab, setPresetTab] = useState<'smart' | 'custom'>('smart');
  const [voucherReportData, setVoucherReportData] = useState<VoucherReportData | null>(null);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);

  // Load custom user presets from localStorage
  const storageKey = `balqen_custom_presets_${user?.id || 'guest'}`;
  const [customPresets, setCustomPresets] = useState<QuickPreset[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleSaveCustomPreset = (newPreset: QuickPreset) => {
    const updated = [newPreset, ...customPresets];
    setCustomPresets(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteCustomPreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customPresets.filter((p) => p.id !== id);
    setCustomPresets(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    toast.success('Shortcut deleted');
  };

  // Queries
  const { data: summary, isLoading: summaryLoading, isError: summaryError, refetch: refetchSummary } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => dashboardApi.summary().then((r) => r.data.data),
  });

  const { data: recentTx, isLoading: recentLoading } = useQuery({
    queryKey: ['dashboard', 'recent'],
    queryFn: () => dashboardApi.recentTransactions().then((r) => r.data.data),
  });

  const { data: monthlyData, isError: monthlyError } = useQuery({
    queryKey: ['dashboard', 'monthly'],
    queryFn: () => dashboardApi.monthlyChart().then((r) => r.data.data),
  });

  const { data: categoryData, isError: categoryError } = useQuery({
    queryKey: ['dashboard', 'categories'],
    queryFn: () => dashboardApi.expenseByCategory().then((r) => r.data.data),
  });

  const { data: loanSummary, isError: loanError } = useQuery({
    queryKey: ['dashboard', 'loans'],
    queryFn: () => dashboardApi.loanSummary().then((r) => r.data.data),
  });

  const { data: peopleSummary, isError: peopleError } = useQuery({
    queryKey: ['dashboard', 'people'],
    queryFn: () => dashboardApi.peopleSummary().then((r) => r.data.data),
  });

  const formattedCategoryData = useMemo(() => {
    if (!categoryData || !Array.isArray(categoryData) || categoryData.length === 0) return [];
    return categoryData
      .map((cat: any) => ({
        ...cat,
        category_name: cat.category_name || 'Uncategorized',
        total: toNum(cat.total),
      }))
      .filter((c: any) => c.total > 0);
  }, [categoryData]);

  const smartSuggestions = useMemo(() => {
    return detectSmartSuggestions(recentTx || []);
  }, [recentTx]);

  const handleOpenQuickPreset = (preset: QuickPreset) => {
    setQuickPreset(preset);
    setIsQuickOpen(true);
  };

  const handleOpenVoucher = (tx: Transaction) => {
    setVoucherReportData({
      id: tx.id,
      transaction_type: tx.transaction_type,
      transaction_date: tx.transaction_date,
      amount: tx.amount,
      description: tx.description,
      reference: tx.reference,
      account_name: tx.account_name,
      person_name: tx.person_name,
      category_name: tx.category_name,
      user_name: user?.full_name,
      user_email: user?.email,
    });
    setIsVoucherModalOpen(true);
  };

  if (summaryLoading) return <LoadingSpinner message="Assembling financial command center..." />;
  if (summaryError) return <QueryError title="Failed to load financial dashboard" onRetry={() => refetchSummary()} />;

  const s = summary as DashboardSummary;

  // Compute Greeting based on local hour
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.full_name ? user.full_name.split(' ')[0] : 'User';

  // Compute Account Balances breakdown
  const bankBalance = s?.accounts
    ?.filter((a: any) => a.account_type === 'BANK')
    .reduce((sum: number, a: any) => sum + toNum(a.current_balance), 0) || 0;

  const cashBalance = s?.accounts
    ?.filter((a: any) => a.account_type === 'CASH')
    .reduce((sum: number, a: any) => sum + toNum(a.current_balance), 0) || 0;

  const walletBalance = s?.accounts
    ?.filter((a: any) => a.account_type === 'MOBILE_WALLET')
    .reduce((sum: number, a: any) => sum + toNum(a.current_balance), 0) || 0;

  // Monthly stats calculations
  const totalIncomeThisYear = monthlyData?.reduce((acc: number, curr: any) => acc + curr.income, 0) || 0;
  const totalExpenseThisYear = monthlyData?.reduce((acc: number, curr: any) => acc + curr.expense, 0) || 0;
  const avgMonthlyBurn = monthlyData && monthlyData.length > 0 ? totalExpenseThisYear / monthlyData.length : 0;
  const runwayMonths = avgMonthlyBurn > 0 && s ? (s.totalAccountBalance / avgMonthlyBurn).toFixed(1) : '∞';

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-xl text-xs space-y-1">
          <p className="font-bold text-slate-900 dark:text-slate-100">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} className="flex items-center gap-2" style={{ color: entry.color }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="capitalize">{entry.name}:</span>
              <span className="font-semibold">{formatCurrency(entry.value)}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Hero Greeting & Quick Action Ribbon */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-brand-950 text-white p-4 sm:p-6 lg:p-8 border border-slate-800 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-brand-500/20 text-brand-300 border border-brand-500/30">
                <Sparkles className="w-3 h-3" /> Balqen Intelligence
              </span>
              <span className="text-[11px] sm:text-xs text-slate-400">
                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-white">
              {greeting}, {firstName}!
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-300 max-w-xl">
              You have <strong className="text-white">{formatCurrency(s.totalAccountBalance)}</strong> liquid with an estimated{' '}
              <strong className="text-emerald-400">{runwayMonths} mo</strong> runway.
            </p>
          </div>

          {/* Quick Action Buttons (Full width 3-col on mobile) */}
          <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-center gap-2 w-full lg:w-auto shrink-0 mt-2 sm:mt-0">
            <button
              onClick={() => navigate('/transactions')}
              className="btn-primary text-[11px] sm:text-xs font-bold py-2 sm:py-2.5 px-2.5 sm:px-4 shadow-lg shadow-brand-500/25 flex items-center justify-center gap-1 cursor-pointer truncate"
            >
              <PlusCircle size={14} className="shrink-0" />
              <span>Record</span>
            </button>
            <button
              onClick={() => navigate('/loans')}
              className="py-2 sm:py-2.5 px-2.5 sm:px-4 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-[11px] sm:text-xs font-semibold text-white border border-slate-700 transition-all flex items-center justify-center gap-1 cursor-pointer truncate"
            >
              <CreditCard size={14} className="shrink-0" />
              <span>Loans</span>
            </button>
            <button
              onClick={() => navigate('/reports')}
              className="py-2 sm:py-2.5 px-2.5 sm:px-4 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-[11px] sm:text-xs font-semibold text-white border border-slate-700 transition-all flex items-center justify-center gap-1 cursor-pointer truncate"
            >
              <TrendingUp size={14} className="shrink-0" />
              <span>Reports</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. ⚡ Smart Fast Transactions & Custom Shortcuts */}
      {(() => {
        const activePresets =
          presetTab === 'custom'
            ? customPresets
            : smartSuggestions.length > 0
            ? smartSuggestions
            : QUICK_PRESETS;

        return (
          <div className="card p-5 sm:p-6 bg-gradient-to-r from-[#e5edf5] to-brand-100/30 dark:from-[#111726] dark:to-slate-900 border border-[#cbd5e1] dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Zap size={15} className="fill-current" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>⚡ Quick 1-Click Transactions</span>
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {presetTab === 'smart'
                      ? 'Smart patterns learned from your recent transactions'
                      : 'Your personalized quick transaction shortcuts'}
                  </p>
                </div>
              </div>

              {/* Tabs & Create Action */}
              <div className="flex items-center gap-2">
                <div className="flex rounded-xl bg-[#d5dfea] dark:bg-slate-800/80 p-0.5 text-xs font-semibold">
                  <button
                    onClick={() => setPresetTab('smart')}
                    className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                      presetTab === 'smart'
                        ? 'bg-[#f4f7fa] dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Sparkles size={13} className="text-amber-500" />
                    <span>Smart Suggestions</span>
                  </button>
                  <button
                    onClick={() => setPresetTab('custom')}
                    className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                      presetTab === 'custom'
                        ? 'bg-[#f4f7fa] dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span>My Shortcuts</span>
                    {customPresets.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300">
                        {customPresets.length}
                      </span>
                    )}
                  </button>
                </div>

                <button
                  onClick={() => setIsCreatePresetOpen(true)}
                  className="btn-primary text-xs px-3 py-1.5 font-semibold flex items-center gap-1 shrink-0"
                  title="Create Custom Shortcut"
                >
                  <PlusCircle size={14} />
                  <span className="hidden md:inline">New Shortcut</span>
                </button>
              </div>
            </div>

            {/* Presets Horizontal Grid (Swipeable on mobile) */}
            {activePresets.length > 0 ? (
              <div className="flex sm:grid sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 overflow-x-auto pb-2 sm:pb-0 scrollbar-none snap-x">
                {activePresets.map((preset) => (
                  <div
                    key={preset.id}
                    onClick={() => handleOpenQuickPreset(preset)}
                    className={`w-36 shrink-0 sm:w-auto snap-start p-3 rounded-2xl bg-[#eaf0f7] dark:bg-slate-900/80 border ${preset.color} hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all text-left flex flex-col justify-between group cursor-pointer relative`}
                  >
                    {/* Delete button if custom preset */}
                    {presetTab === 'custom' && (
                      <button
                        onClick={(e) => handleDeleteCustomPreset(preset.id, e)}
                        className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#d0dbe7] dark:bg-slate-800 text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete shortcut"
                      >
                        ×
                      </button>
                    )}

                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xl group-hover:scale-110 transition-transform">{preset.icon}</span>
                      <span className="text-[10px] font-extrabold uppercase opacity-80">
                        {preset.type === 'INCOME' ? 'Income' : 'Expense'}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{preset.title}</p>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          {formatCurrency(preset.defaultAmount)}
                        </span>
                        {(preset as any).frequency && (preset as any).frequency > 1 && (
                          <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.2 rounded">
                            {(preset as any).frequency}x
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 sm:p-8 text-center bg-white/50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">No custom shortcuts created yet</p>
                <p className="text-[11px] text-slate-400 mt-1 mb-3">Create your favorite 1-click expense or income shortcuts to save time.</p>
                <button
                  onClick={() => setIsCreatePresetOpen(true)}
                  className="btn-primary text-xs px-3.5 py-2 font-semibold inline-flex items-center gap-1.5"
                >
                  <PlusCircle size={14} /> Create Your First Shortcut
                </button>
              </div>
            )}
          </div>
        );
      })()}

      {/* 3. Top Financial Metrics Grid (2-columns on mobile, 4-columns on desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Total Accounts Balance */}
        <div className="stat-card p-3.5 sm:p-5 group">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
              Total Balance
            </span>
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
              <Wallet size={16} />
            </div>
          </div>
          <div>
            <p className="text-lg sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
              {formatCurrency(s.totalAccountBalance)}
            </p>
            {/* Account Breakdown Pills */}
            <div className="mt-2 pt-1.5 sm:pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-1.5 text-[9px] sm:text-[10px] font-medium text-slate-500 dark:text-slate-400">
              <span title="Bank Accounts">🏦 {formatCurrency(bankBalance)}</span>
              <span>•</span>
              <span title="Cash">💵 {formatCurrency(cashBalance)}</span>
              <span>•</span>
              <span title="Mobile Wallets">📱 {formatCurrency(walletBalance)}</span>
            </div>
          </div>
        </div>

        {/* Receivable */}
        <div className="stat-card p-3.5 sm:p-5 group">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
              Receivable
            </span>
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
              <TrendingUp size={16} />
            </div>
          </div>
          <div>
            <p className="text-lg sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight truncate">
              {formatCurrency(Math.max(0, toNum(s.totalReceivable)))}
            </p>
            <div className="mt-2 pt-1.5 sm:pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] sm:text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <span className="truncate">
                {peopleSummary?.filter((p: any) => parseFloat(p.amount_they_owe_you) > 0).length || 0} debtors
              </span>
              <Link to="/people" className="text-[10px] hover:underline font-semibold shrink-0">
                View
              </Link>
            </div>
          </div>
        </div>

        {/* Payable */}
        <div className="stat-card p-3.5 sm:p-5 group">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
              Total Payable
            </span>
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
              <TrendingDown size={16} />
            </div>
          </div>
          <div>
            <p className="text-lg sm:text-2xl font-extrabold text-rose-600 dark:text-rose-400 tracking-tight truncate">
              {formatCurrency(Math.max(0, toNum(s.totalPayable)))}
            </p>
            <div className="mt-2 pt-1.5 sm:pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] sm:text-[11px] font-medium text-rose-600 dark:text-rose-400">
              <span className="truncate">Outstanding dues</span>
              <Link to="/loans" className="text-[10px] hover:underline font-semibold shrink-0">
                Settle
              </Link>
            </div>
          </div>
        </div>

        {/* Net Wealth Position */}
        <div className="stat-card p-3.5 sm:p-5 group">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
              Net Wealth
            </span>
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
              <CreditCard size={16} />
            </div>
          </div>
          <div>
            <p className={`text-lg sm:text-2xl font-extrabold tracking-tight truncate ${s.netPosition >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600 dark:text-rose-400'}`}>
              {formatCurrency(s.netPosition)}
            </p>
            <div className="mt-2 pt-1.5 sm:pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <span className="truncate">Liquid + Dues</span>
              <span className={`px-1.5 py-0.2 rounded text-[9px] sm:text-[10px] font-bold shrink-0 ${s.netPosition >= 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400'}`}>
                {s.netPosition >= 0 ? 'Surplus' : 'Deficit'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Income vs Expense Bar Chart */}
        <div className="lg:col-span-2 card p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Cash Flow Performance</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Monthly income credits vs expense outflows</p>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Income
                </span>
                <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Expense
                </span>
              </div>
            </div>

            {monthlyError ? (
              <p className="text-xs text-rose-500 py-12 text-center">Failed to load chart data</p>
            ) : monthlyData && monthlyData.length > 0 ? (
              <div className="h-64 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `৳${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="income" name="Income" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={30} />
                    <Bar dataKey="expense" name="Expense" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-16 text-center">No cashflow data available yet.</p>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
            <span>Total Logged Inflow: <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(totalIncomeThisYear)}</strong></span>
            <span>Total Outflow: <strong className="text-rose-600 dark:text-rose-400">{formatCurrency(totalExpenseThisYear)}</strong></span>
          </div>
        </div>

        {/* Expense by Category Pie Chart */}
        <div className="card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Category Share</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Expense distribution</p>
              </div>
              <PieChartIcon size={18} className="text-slate-400" />
            </div>

            {categoryError ? (
              <p className="text-xs text-rose-500 py-12 text-center">Failed to load categories</p>
            ) : formattedCategoryData.length > 0 ? (
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={formattedCategoryData}
                      dataKey="total"
                      nameKey="category_name"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={74}
                      paddingAngle={3}
                    >
                      {formattedCategoryData.map((cat: any, i: number) => (
                        <Cell key={i} fill={cat.color || COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="py-8 text-center flex flex-col items-center justify-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">No expense entries recorded yet.</p>
                <p className="text-[11px] text-slate-400 mt-0.5 mb-3">Log an expense to view your live category share.</p>
                <button
                  onClick={() => navigate('/transactions')}
                  className="btn-secondary text-xs px-3 py-1.5 inline-flex items-center gap-1.5"
                >
                  <PlusCircle size={13} /> Record Expense
                </button>
              </div>
            )}
          </div>

          {formattedCategoryData.length > 0 && (
            <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 max-h-36 overflow-y-auto">
              {formattedCategoryData.slice(0, 5).map((cat: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color || COLORS[i % COLORS.length] }}
                    />
                    <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[130px]">
                      {cat.category_name}
                    </span>
                  </div>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {formatCurrency(cat.total)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 5. Mini-Hubs Grid: Accounts, People Balances, Active Loans */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Accounts Portfolio */}
        <div className="card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Liquidity Accounts</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Cash & banks</p>
              </div>
              <Link to="/accounts" className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-0.5">
                Manage <ChevronRight size={14} />
              </Link>
            </div>
            <div className="space-y-2.5">
              {s.accounts?.slice(0, 4).map((acc: any) => {
                const isBank = acc.account_type === 'BANK';
                const isCash = acc.account_type === 'CASH';
                const Icon = isBank ? Building2 : isCash ? Banknote : Smartphone;
                return (
                  <div
                    key={acc.account_id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-xs">
                        <Icon size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate max-w-[130px]">{acc.account_name}</p>
                        <p className="text-[10px] text-slate-400 capitalize">{acc.account_type.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <p className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                      {formatCurrency(acc.current_balance)}
                    </p>
                  </div>
                );
              })}
              {(!s.accounts || s.accounts.length === 0) && (
                <p className="text-xs text-slate-500 py-6 text-center">No accounts added yet.</p>
              )}
            </div>
          </div>
          <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80">
            <button
              onClick={() => navigate('/accounts')}
              className="btn-secondary w-full text-xs py-2 flex items-center justify-center gap-1.5"
            >
              <PlusCircle size={14} /> Add New Account
            </button>
          </div>
        </div>

        {/* Counterparties & Debtors */}
        <div className="card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">People Balances</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Debtors & Creditors</p>
              </div>
              <Link to="/people" className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-0.5">
                View All <ChevronRight size={14} />
              </Link>
            </div>
            <div className="space-y-2.5">
              {peopleError ? (
                <p className="text-xs text-rose-500 py-4 text-center">Error loading people</p>
              ) : (
                peopleSummary?.slice(0, 4).map((p: any) => (
                  <div
                    key={p.person_id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                        {p.person_name.charAt(0)}
                      </div>
                      <span className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[120px]">{p.person_name}</span>
                    </div>
                    <div className="text-right">
                      {parseFloat(p.amount_they_owe_you) > 0 && (
                        <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                          + {formatCurrency(p.amount_they_owe_you)}
                        </p>
                      )}
                      {parseFloat(p.amount_you_owe_them) > 0 && (
                        <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                          - {formatCurrency(p.amount_you_owe_them)}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
              {!peopleError && (!peopleSummary || peopleSummary.length === 0) && (
                <p className="text-xs text-slate-500 py-6 text-center">No contacts added yet.</p>
              )}
            </div>
          </div>
          <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80">
            <button
              onClick={() => navigate('/people')}
              className="btn-secondary w-full text-xs py-2 flex items-center justify-center gap-1.5"
            >
              <Users size={14} /> Manage People & Dues
            </button>
          </div>
        </div>

        {/* Active Loans Tracker */}
        <div className="card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Loans Tracker</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Agreements & Due Dates</p>
              </div>
              <Link to="/loans" className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-0.5">
                View Loans <ChevronRight size={14} />
              </Link>
            </div>
            <div className="space-y-2.5">
              {loanError ? (
                <p className="text-xs text-rose-500 py-4 text-center">Error loading loans</p>
              ) : (
                loanSummary?.slice(0, 4).map((loan: any) => (
                  <div
                    key={loan.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60"
                  >
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-bold text-slate-900 dark:text-slate-100 truncate max-w-[140px]">
                        {loan.direction === 'LENT' ? 'Lent to' : 'Borrowed from'} {loan.person_name || 'Contact'}
                      </span>
                      <span className="font-extrabold text-amber-600 dark:text-amber-400">
                        {formatCurrency(toNum(loan.remaining_amount))}
                      </span>
                    </div>
                    {loan.due_date && (
                      <p className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Calendar size={11} /> Due: {formatDateDMY(loan.due_date)}
                      </p>
                    )}
                  </div>
                ))
              )}
              {!loanError && (!loanSummary || loanSummary.length === 0) && (
                <p className="text-xs text-slate-500 py-6 text-center">No active loans outstanding.</p>
              )}
            </div>
          </div>
          <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80">
            <button
              onClick={() => navigate('/loans')}
              className="btn-secondary w-full text-xs py-2 flex items-center justify-center gap-1.5"
            >
              <CreditCard size={14} /> Record Loan Agreement
            </button>
          </div>
        </div>
      </div>

      {/* 6. Recent Transactions Table */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Recent Transactions</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Live journal entries with instant PDF vouchers</p>
          </div>
          <Link
            to="/transactions"
            className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-0.5"
          >
            Full Ledger <ChevronRight size={14} />
          </Link>
        </div>

        {recentLoading ? (
          <LoadingSpinner />
        ) : recentTx && recentTx.length > 0 ? (
          <>
            {/* Desktop Table View (sm+) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                    <th className="pb-3 pr-4">Date</th>
                    <th className="pb-3 pr-4">Description</th>
                    <th className="pb-3 pr-4">Type</th>
                    <th className="pb-3 pr-4">Account</th>
                    <th className="pb-3 text-right pr-4">Amount</th>
                    <th className="pb-3 text-right">Voucher</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                  {recentTx.map((tx: Transaction) => (
                    <tr key={tx.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors group">
                      <td className="py-3 pr-4 text-slate-500 dark:text-slate-400 whitespace-nowrap font-medium">
                        {new Date(tx.transaction_date).toLocaleDateString('en-BD', { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="py-3 pr-4 font-semibold text-slate-900 dark:text-slate-100 max-w-xs truncate">
                        {tx.description || tx.transaction_type.replace('_', ' ')}
                      </td>
                      <td className="py-3 pr-4 whitespace-nowrap">
                        <span className={getTransactionBadge(tx)}>
                          {tx.transaction_type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                        {tx.account_name || '-'}
                      </td>
                      <td className={`py-3 pr-4 text-right font-bold whitespace-nowrap ${
                        getTransactionEffect(tx) === '+' ? 'text-emerald-600 dark:text-emerald-400' :
                        getTransactionEffect(tx) === '-' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'
                      }`}>
                        {getTransactionEffect(tx)}{formatCurrency(tx.amount)}
                      </td>
                      <td className="py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleOpenVoucher(tx)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/60 transition-colors"
                          title="View Official Voucher & Invoice"
                        >
                          <FileText size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View (Phones) */}
            <div className="sm:hidden space-y-2.5">
              {recentTx.map((tx: Transaction) => (
                <div
                  key={tx.id}
                  className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs shrink-0 font-bold ${
                      getTransactionEffect(tx) === '+'
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                        : getTransactionEffect(tx) === '-'
                        ? 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400'
                        : 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                    }`}>
                      {getTransactionEffect(tx)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {tx.description || tx.transaction_type.replace('_', ' ')}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                        <span>{new Date(tx.transaction_date).toLocaleDateString('en-BD', { month: 'short', day: 'numeric' })}</span>
                        {tx.account_name && (
                          <>
                            <span>•</span>
                            <span className="truncate">{tx.account_name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex items-center gap-2">
                    <div>
                      <p className={`text-xs font-extrabold ${
                        getTransactionEffect(tx) === '+' ? 'text-emerald-600 dark:text-emerald-400' :
                        getTransactionEffect(tx) === '-' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'
                      }`}>
                        {getTransactionEffect(tx)}{formatCurrency(tx.amount)}
                      </p>
                      <span className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${
                        getTransactionBadge(tx)
                      }`}>
                        {tx.transaction_type.replace('_', ' ')}
                      </span>
                    </div>
                    <button
                      onClick={() => handleOpenVoucher(tx)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs transition-colors"
                      title="View Voucher"
                    >
                      <FileText size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-8">No recent transactions to display.</p>
        )}
      </div>

      {/* 1-Click Fast Transaction Modal */}
      <QuickTransactionModal
        isOpen={isQuickOpen}
        onClose={() => {
          setIsQuickOpen(false);
          setQuickPreset(null);
        }}
        preset={quickPreset}
      />

      {/* Custom Shortcut Creator Modal */}
      <CreatePresetModal
        isOpen={isCreatePresetOpen}
        onClose={() => setIsCreatePresetOpen(false)}
        onSavePreset={handleSaveCustomPreset}
      />

      {/* Printable Voucher, Invoice & Receipt Report Modal */}
      <VoucherModal
        isOpen={isVoucherModalOpen}
        onClose={() => setIsVoucherModalOpen(false)}
        data={voucherReportData}
      />
    </div>
  );
}
