import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi, accountsApi, peopleApi } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import QueryError from '../components/QueryError';
import { useTheme } from '../contexts/ThemeContext';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  BarChart3, Landmark, UserCheck, ShieldAlert, ArrowUpRight, ArrowDownRight, Calendar,
  TrendingUp, TrendingDown, Wallet, CreditCard, Users, AlertTriangle, CheckCircle2, Clock,
  RefreshCw,
} from 'lucide-react';
import type { Account, Person } from '../types';
import { formatDateDMY } from '../utils/format';

const toNum = (v: any): number => (typeof v === 'number' ? v : parseFloat(v) || 0);

const formatCurrency = (amount: number) =>
  `৳${amount.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

type ReportTab = 'position' | 'income' | 'expense' | 'account' | 'person' | 'loan';

export default function ReportsPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [activeTab, setActiveTab] = useState<ReportTab>('position');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState('');

  const dateParams = { ...(dateFrom && { from: dateFrom }), ...(dateTo && { to: dateTo }) };

  // Income report
  const { data: incomeReport, isLoading: incomeLoading, isError: incomeError, refetch: refetchIncome } = useQuery({
    queryKey: ['reports', 'income', dateParams],
    queryFn: () => reportsApi.income(dateParams).then((r) => r.data.data),
    enabled: activeTab === 'income',
  });

  // Expense report
  const { data: expenseReport, isLoading: expenseLoading, isError: expenseError, refetch: refetchExpense } = useQuery({
    queryKey: ['reports', 'expense', dateParams],
    queryFn: () => reportsApi.expense(dateParams).then((r) => r.data.data),
    enabled: activeTab === 'expense',
  });

  // Financial position
  const { data: position, isLoading: positionLoading, isError: positionError, refetch: refetchPosition } = useQuery({
    queryKey: ['reports', 'position'],
    queryFn: () => reportsApi.financialPosition().then((r) => r.data.data),
    enabled: activeTab === 'position',
  });

  // Account statement
  const accountDateParams = { account_id: selectedAccountId, ...dateParams };
  const { data: accountStatement, isLoading: accountLoading, isError: accountError, refetch: refetchAccount } = useQuery({
    queryKey: ['reports', 'account', selectedAccountId, dateParams],
    queryFn: () => reportsApi.accountStatement(accountDateParams).then((r) => r.data.data),
    enabled: activeTab === 'account' && !!selectedAccountId,
  });

  // Person statement
  const personDateParams = { person_id: selectedPersonId, ...dateParams };
  const { data: personStatement, isLoading: personLoading, isError: personError, refetch: refetchPerson } = useQuery({
    queryKey: ['reports', 'person', selectedPersonId, dateParams],
    queryFn: () => reportsApi.personStatement(personDateParams).then((r) => r.data.data),
    enabled: activeTab === 'person' && !!selectedPersonId,
  });

  // Loan report
  const { data: loanReport, isLoading: loanLoading, isError: loanError, refetch: refetchLoan } = useQuery({
    queryKey: ['reports', 'loan'],
    queryFn: () => reportsApi.loanReport().then((r) => r.data.data),
    enabled: activeTab === 'loan',
  });

  // Reference data
  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list().then((r) => r.data.data),
  });

  const { data: people } = useQuery({
    queryKey: ['people'],
    queryFn: () => peopleApi.list().then((r) => r.data.data),
  });

  const tabs: { key: ReportTab; label: string; icon: typeof BarChart3 }[] = [
    { key: 'position', label: 'Financial Position', icon: Landmark },
    { key: 'income', label: 'Income Report', icon: TrendingUp },
    { key: 'expense', label: 'Expense Report', icon: TrendingDown },
    { key: 'account', label: 'Account Statement', icon: BarChart3 },
    { key: 'person', label: 'Person Statement', icon: UserCheck },
    { key: 'loan', label: 'Loan Portfolio', icon: ShieldAlert },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-xl text-xs space-y-1">
          <p className="font-bold text-slate-900 dark:text-slate-100 mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} className="flex items-center gap-2" style={{ color: entry.color }}>
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: entry.color }} />
              <span className="font-semibold">{formatCurrency(entry.value)}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          Financial Intelligence &amp; Reports
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Executive financial statements, category breakdowns, and account ledgers.
        </p>
      </div>

      {/* Pill Navigation Bar */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-slate-200/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === key
                ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Icon size={14} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Date Filter Bar */}
      {['income', 'expense', 'person', 'account'].includes(activeTab) && (
        <div className="card p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <Calendar size={15} />
            <span>Date Range:</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500">From:</label>
            <input
              type="date"
              className="input py-1 px-3 text-xs"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500">To:</label>
            <input
              type="date"
              className="input py-1 px-3 text-xs"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="text-xs text-rose-500 hover:text-rose-700 font-semibold transition-colors ml-auto"
            >
              Clear Filter
            </button>
          )}
        </div>
      )}

      {/* ─── FINANCIAL POSITION ─── */}
      {activeTab === 'position' && (
        <div>
          {positionLoading ? (
            <LoadingSpinner message="Calculating financial position..." />
          ) : positionError ? (
            <QueryError title="Failed to load position" onRetry={() => refetchPosition()} />
          ) : (
            position && (
              <div className="space-y-5">
                {/* 4 Overview Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="stat-card">
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                        <Wallet size={16} className="text-slate-600 dark:text-slate-400" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cash in Accounts</span>
                    </div>
                    <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{formatCurrency(position.totalCash)}</p>
                    <span className="text-[10px] text-slate-400 mt-1">Liquid balances across accounts</span>
                  </div>

                  <div className="stat-card">
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100/60 dark:bg-emerald-950/40 flex items-center justify-center flex-shrink-0">
                        <ArrowUpRight size={16} className="text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Receivables</span>
                    </div>
                    <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">+{formatCurrency(position.totalReceivable)}</p>
                    <span className="text-[10px] text-slate-400 mt-1">Owed to you by counterparties</span>
                  </div>

                  <div className="stat-card">
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-8 h-8 rounded-xl bg-rose-100/60 dark:bg-rose-950/40 flex items-center justify-center flex-shrink-0">
                        <ArrowDownRight size={16} className="text-rose-600 dark:text-rose-400" />
                      </div>
                      <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Payables</span>
                    </div>
                    <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">-{formatCurrency(position.totalPayable)}</p>
                    <span className="text-[10px] text-slate-400 mt-1">Owed by you to others</span>
                  </div>

                  <div className="stat-card border-brand-300/50 dark:border-brand-800/50">
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-8 h-8 rounded-xl bg-brand-100/60 dark:bg-brand-950/40 flex items-center justify-center flex-shrink-0">
                        <TrendingUp size={16} className="text-brand-600 dark:text-brand-400" />
                      </div>
                      <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">Net Wealth</span>
                    </div>
                    <p className={`text-2xl font-extrabold ${position.netPosition >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600 dark:text-rose-400'}`}>
                      {formatCurrency(position.netPosition)}
                    </p>
                    <span className="text-[10px] text-slate-400 mt-1">Cash + Receivables - Payables</span>
                  </div>
                </div>

                {/* Loan Commitments Block */}
                <div className="card p-5">
                  <div className="pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Active Loan Commitments
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Overview of funds currently tied up in formal loan agreements.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-brand-50/40 dark:bg-brand-950/20 border border-brand-200/50 dark:border-brand-900/40">
                      <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-950/60 flex items-center justify-center flex-shrink-0">
                        <ArrowUpRight size={18} className="text-brand-600 dark:text-brand-400" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Active Lent</p>
                        <p className="text-lg font-extrabold text-brand-600 dark:text-brand-400">{formatCurrency(position.loanSummary.totalLent)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/40">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center flex-shrink-0">
                        <ArrowDownRight size={18} className="text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Active Borrowed</p>
                        <p className="text-lg font-extrabold text-amber-600 dark:text-amber-400">{formatCurrency(position.loanSummary.totalBorrowed)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* ─── INCOME REPORT ─── */}
      {activeTab === 'income' && (
        <div>
          {incomeLoading ? (
            <LoadingSpinner message="Aggregating income data..." />
          ) : incomeError ? (
            <QueryError title="Failed to load income report" onRetry={() => refetchIncome()} />
          ) : (
            incomeReport && (
              <div className="space-y-5">
                {/* Hero Stat */}
                <div className="card p-5 bg-gradient-to-br from-emerald-50/80 to-teal-50/40 dark:from-emerald-950/30 dark:to-teal-950/20 border-emerald-200/70 dark:border-emerald-900/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center flex-shrink-0">
                      <TrendingUp size={20} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Total Income Earned</p>
                      <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{formatCurrency(incomeReport.total)}</p>
                    </div>
                  </div>
                  {(dateFrom || dateTo) && (
                    <p className="text-[11px] text-emerald-700/70 dark:text-emerald-400/60 mt-2">
                      Period: {dateFrom && `From ${formatDateDMY(dateFrom)}`}{dateFrom && dateTo && ' — '}{dateTo && `To ${formatDateDMY(dateTo)}`}
                    </p>
                  )}
                </div>

                {/* Category Chart & Breakdown */}
                {incomeReport.byCategory?.length > 0 ? (
                  <div className="card p-5 space-y-5">
                    <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Income by Category</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">{incomeReport.byCategory.length} categories contributing to total revenue</p>
                    </div>

                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={incomeReport.byCategory} barCategoryGap="30%">
                          <XAxis dataKey="category_name" tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `৳${(v/1000).toFixed(0)}k`} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={48}>
                            {incomeReport.byCategory.map((_: any, i: number) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Progress Bar Category Breakdown */}
                    <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                      {incomeReport.byCategory.map((cat: any, i: number) => {
                        const pct = incomeReport.total > 0 ? (toNum(cat.total) / incomeReport.total) * 100 : 0;
                        return (
                          <div key={i} className="flex items-center gap-3">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                            <span className="text-xs text-slate-700 dark:text-slate-300 font-medium flex-1 truncate">{cat.category_name}</span>
                            <div className="flex-1 max-w-[140px] h-2 rounded-full bg-slate-200/60 dark:bg-slate-800 overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                            </div>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 w-[90px] text-right font-mono">{formatCurrency(toNum(cat.total))}</span>
                            <span className="text-[11px] text-slate-400 font-semibold w-[36px] text-right">{pct.toFixed(0)}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="card p-8 text-center">
                    <p className="text-sm text-slate-400">No income records found for this period.</p>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}

      {/* ─── EXPENSE REPORT ─── */}
      {activeTab === 'expense' && (
        <div>
          {expenseLoading ? (
            <LoadingSpinner message="Aggregating expense metrics..." />
          ) : expenseError ? (
            <QueryError title="Failed to load expense report" onRetry={() => refetchExpense()} />
          ) : (
            expenseReport && (
              <div className="space-y-5">
                {/* Hero Stat */}
                <div className="card p-5 bg-gradient-to-br from-rose-50/80 to-pink-50/40 dark:from-rose-950/30 dark:to-pink-950/20 border-rose-200/70 dark:border-rose-900/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center flex-shrink-0">
                      <TrendingDown size={20} className="text-rose-600 dark:text-rose-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">Total Outgoing Expenses</p>
                      <p className="text-3xl font-extrabold text-rose-600 dark:text-rose-400">{formatCurrency(expenseReport.total)}</p>
                    </div>
                  </div>
                  {(dateFrom || dateTo) && (
                    <p className="text-[11px] text-rose-700/70 dark:text-rose-400/60 mt-2">
                      Period: {dateFrom && `From ${formatDateDMY(dateFrom)}`}{dateFrom && dateTo && ' — '}{dateTo && `To ${formatDateDMY(dateTo)}`}
                    </p>
                  )}
                </div>

                {/* Donut Chart & Category Breakdown */}
                {expenseReport.byCategory?.length > 0 ? (
                  <div className="card p-5 space-y-5">
                    <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Expenses by Category Share</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">{expenseReport.byCategory.length} categories with expense activity</p>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-6 items-center">
                      <div className="h-60 w-full max-w-[260px] flex-shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={expenseReport.byCategory}
                              dataKey="total"
                              nameKey="category_name"
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={90}
                              paddingAngle={3}
                            >
                              {expenseReport.byCategory.map((_: any, i: number) => (
                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Progress Bar Category List */}
                      <div className="flex-1 w-full space-y-2.5">
                        {expenseReport.byCategory.map((cat: any, i: number) => {
                          const pct = expenseReport.total > 0 ? (toNum(cat.total) / expenseReport.total) * 100 : 0;
                          return (
                            <div key={i} className="flex items-center gap-3">
                              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                              <span className="text-xs text-slate-700 dark:text-slate-300 font-medium flex-1 truncate">{cat.category_name}</span>
                              <div className="flex-1 max-w-[140px] h-2 rounded-full bg-slate-200/60 dark:bg-slate-800 overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                              </div>
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 w-[90px] text-right font-mono">{formatCurrency(toNum(cat.total))}</span>
                              <span className="text-[11px] text-slate-400 font-semibold w-[36px] text-right">{pct.toFixed(0)}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="card p-8 text-center">
                    <p className="text-sm text-slate-400">No expense records found for this period.</p>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}

      {/* ─── ACCOUNT STATEMENT ─── */}
      {activeTab === 'account' && (
        <div className="space-y-4">
          <div className="card p-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 flex-shrink-0">
              <CreditCard size={15} />
              <span>Select Account:</span>
            </div>
            <select
              className="input flex-1 max-w-sm text-xs font-semibold"
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
            >
              <option value="">Choose an account...</option>
              {accounts?.map((a: Account) => (
                <option key={a.account_id} value={a.account_id}>{a.account_name}</option>
              ))}
            </select>
          </div>

          {accountLoading ? (
            <LoadingSpinner message="Generating account ledger statement..." />
          ) : accountError ? (
            <QueryError title="Failed to load statement" onRetry={() => refetchAccount()} />
          ) : (
            accountStatement && (
              <div className="space-y-4">
                {/* Statement Header Card */}
                <div className="card p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Ledger Statement</p>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                        {accountStatement.account?.account_name || accountStatement.account?.name}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5 capitalize">
                        {accountStatement.account?.account_type} account · Opening balance: {formatCurrency(accountStatement.openingBalance)}
                      </p>
                    </div>
                    <div className="flex items-center gap-5">
                      <div className="text-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Debit</span>
                        <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                          {formatCurrency(accountStatement.transactions?.reduce((s: number, t: any) => s + toNum(t.debit), 0) || 0)}
                        </span>
                      </div>
                      <div className="text-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Credit</span>
                        <span className="text-sm font-extrabold text-rose-600 dark:text-rose-400 font-mono">
                          {formatCurrency(accountStatement.transactions?.reduce((s: number, t: any) => s + toNum(t.credit), 0) || 0)}
                        </span>
                      </div>
                      <div className="text-center pl-4 border-l border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Closing Balance</span>
                        <span className={`text-sm font-extrabold font-mono ${accountStatement.closingBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {formatCurrency(Math.abs(accountStatement.closingBalance))} {accountStatement.closingBalance >= 0 ? 'Dr' : 'Cr'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ledger Table */}
                {accountStatement.transactions && accountStatement.transactions.length > 0 ? (
                  <div className="card p-0 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800">
                            <th className="p-3 w-[100px]">Date</th>
                            <th className="p-3">Particulars</th>
                            <th className="p-3 w-[130px]">Type</th>
                            <th className="p-3 w-[120px] text-right">Debit (৳)</th>
                            <th className="p-3 w-[120px] text-right">Credit (৳)</th>
                            <th className="p-3 w-[140px] text-right">Balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                          {accountStatement.transactions.map((tx: any) => {
                            const debit = toNum(tx.debit);
                            const credit = toNum(tx.credit);
                            const bal = toNum(tx.running_balance);
                            const isDr = bal >= 0;
                            return (
                              <tr key={tx.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                                <td className="p-3 text-slate-500 whitespace-nowrap font-medium">
                                  {formatDateDMY(tx.transaction_date)}
                                </td>
                                <td className="p-3">
                                  <div className="font-bold text-slate-900 dark:text-slate-100 max-w-[240px] truncate">
                                    {tx.description || tx.transaction_type.replace(/_/g, ' ').toLowerCase()}
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                    {tx.person_name && <span>with {tx.person_name}</span>}
                                    {tx.category_name && <span>· {tx.category_name}</span>}
                                  </div>
                                </td>
                                <td className="p-3">
                                  <span className={`badge text-[10px] ${
                                    tx.transaction_type === 'INCOME' ? 'badge-success' :
                                    tx.transaction_type === 'EXPENSE' ? 'badge-danger' :
                                    tx.transaction_type === 'TRANSFER' ? 'badge-brand' :
                                    tx.transaction_type === 'LEND' ? 'badge-warning' :
                                    tx.transaction_type === 'BORROW' ? 'badge-brand' :
                                    tx.transaction_type === 'LEND_REPAYMENT' ? 'badge-success' :
                                    tx.transaction_type === 'BORROW_REPAYMENT' ? 'badge-danger' :
                                    'badge-neutral'
                                  }`}>
                                    {tx.transaction_type.replace(/_/g, ' ')}
                                  </span>
                                </td>
                                <td className="p-3 text-right font-bold font-mono">
                                  {debit > 0 ? (
                                    <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(debit)}</span>
                                  ) : (
                                    <span className="text-slate-300 dark:text-slate-700">—</span>
                                  )}
                                </td>
                                <td className="p-3 text-right font-bold font-mono">
                                  {credit > 0 ? (
                                    <span className="text-rose-600 dark:text-rose-400">{formatCurrency(credit)}</span>
                                  ) : (
                                    <span className="text-slate-300 dark:text-slate-700">—</span>
                                  )}
                                </td>
                                <td className="p-3 text-right font-extrabold font-mono">
                                  <span className={isDr ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                                    {formatCurrency(Math.abs(bal))} {isDr ? 'Dr' : 'Cr'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-50/80 dark:bg-slate-900/60 border-t-2 border-slate-200 dark:border-slate-700">
                            <td className="p-3" colSpan={3}>
                              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Totals</span>
                            </td>
                            <td className="p-3 text-right font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(accountStatement.transactions.reduce((s: number, t: any) => s + toNum(t.debit), 0))}
                            </td>
                            <td className="p-3 text-right font-extrabold font-mono text-rose-600 dark:text-rose-400">
                              {formatCurrency(accountStatement.transactions.reduce((s: number, t: any) => s + toNum(t.credit), 0))}
                            </td>
                            <td className="p-3 text-right">
                              <span className={`font-extrabold font-mono text-sm ${accountStatement.closingBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {formatCurrency(Math.abs(accountStatement.closingBalance))} {accountStatement.closingBalance >= 0 ? 'Dr' : 'Cr'}
                              </span>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="card p-10 text-center">
                    <p className="text-sm text-slate-400">No transactions found for this account in the selected period.</p>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}

      {/* ─── PERSON STATEMENT ─── */}
      {activeTab === 'person' && (
        <div className="space-y-4">
          <div className="card p-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 flex-shrink-0">
              <Users size={15} />
              <span>Select Contact:</span>
            </div>
            <select
              className="input flex-1 max-w-sm text-xs font-semibold"
              value={selectedPersonId}
              onChange={(e) => setSelectedPersonId(e.target.value)}
            >
              <option value="">Choose a person...</option>
              {people?.map((p: Person) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {personLoading ? (
            <LoadingSpinner message="Retrieving contact ledger..." />
          ) : personError ? (
            <QueryError title="Failed to load person ledger" onRetry={() => refetchPerson()} />
          ) : (
            personStatement && (
              <div className="space-y-4">
                {/* Header Summary */}
                <div className="card p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Counterparty Ledger</p>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                        {personStatement.person?.name}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        All transactions involving this contact
                      </p>
                    </div>
                    <div className="flex items-center gap-5">
                      <div className="text-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Debit</span>
                        <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                          {formatCurrency(personStatement.transactions?.reduce((s: number, t: any) => s + toNum(t.debit), 0) || 0)}
                        </span>
                      </div>
                      <div className="text-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Credit</span>
                        <span className="text-sm font-extrabold text-rose-600 dark:text-rose-400 font-mono">
                          {formatCurrency(personStatement.transactions?.reduce((s: number, t: any) => s + toNum(t.credit), 0) || 0)}
                        </span>
                      </div>
                      <div className="text-center pl-4 border-l border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Net Balance</span>
                        {(() => {
                          const bal = toNum(personStatement.balance?.amount_they_owe_you) - toNum(personStatement.balance?.amount_you_owe_them);
                          const isDr = bal >= 0;
                          return (
                            <span className={`text-sm font-extrabold font-mono ${isDr ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                              {formatCurrency(Math.abs(bal))} {isDr ? 'Dr' : 'Cr'}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ledger Table */}
                {personStatement.transactions && personStatement.transactions.length > 0 ? (
                  <div className="card p-0 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800">
                            <th className="p-3 w-[100px]">Date</th>
                            <th className="p-3">Particulars</th>
                            <th className="p-3 w-[130px]">Type</th>
                            <th className="p-3 w-[120px] text-right">Debit (৳)</th>
                            <th className="p-3 w-[120px] text-right">Credit (৳)</th>
                            <th className="p-3 w-[140px] text-right">Balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                          {personStatement.transactions.map((tx: any) => {
                            const debit = toNum(tx.debit);
                            const credit = toNum(tx.credit);
                            const bal = toNum(tx.running_balance);
                            const isDr = bal >= 0;
                            return (
                              <tr key={tx.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                                <td className="p-3 text-slate-500 whitespace-nowrap font-medium">
                                  {formatDateDMY(tx.transaction_date)}
                                </td>
                                <td className="p-3">
                                  <div className="font-bold text-slate-900 dark:text-slate-100 max-w-[240px] truncate">
                                    {tx.description || tx.transaction_type.replace(/_/g, ' ').toLowerCase()}
                                  </div>
                                  {tx.account_name && (
                                    <div className="text-[10px] text-slate-400 mt-0.5">via {tx.account_name}</div>
                                  )}
                                </td>
                                <td className="p-3">
                                  <span className={`badge text-[10px] ${
                                    tx.transaction_type === 'LEND' ? 'badge-warning' :
                                    tx.transaction_type === 'BORROW' ? 'badge-brand' :
                                    tx.transaction_type === 'LEND_REPAYMENT' ? 'badge-success' :
                                    tx.transaction_type === 'BORROW_REPAYMENT' ? 'badge-danger' :
                                    'badge-neutral'
                                  }`}>
                                    {tx.transaction_type.replace(/_/g, ' ')}
                                  </span>
                                </td>
                                <td className="p-3 text-right font-bold font-mono">
                                  {debit > 0 ? (
                                    <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(debit)}</span>
                                  ) : (
                                    <span className="text-slate-300 dark:text-slate-700">—</span>
                                  )}
                                </td>
                                <td className="p-3 text-right font-bold font-mono">
                                  {credit > 0 ? (
                                    <span className="text-rose-600 dark:text-rose-400">{formatCurrency(credit)}</span>
                                  ) : (
                                    <span className="text-slate-300 dark:text-slate-700">—</span>
                                  )}
                                </td>
                                <td className="p-3 text-right font-extrabold font-mono">
                                  <span className={isDr ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                                    {formatCurrency(Math.abs(bal))} {isDr ? 'Dr' : 'Cr'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-50/80 dark:bg-slate-900/60 border-t-2 border-slate-200 dark:border-slate-700">
                            <td className="p-3" colSpan={3}>
                              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Totals</span>
                            </td>
                            <td className="p-3 text-right font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(personStatement.transactions.reduce((s: number, t: any) => s + toNum(t.debit), 0))}
                            </td>
                            <td className="p-3 text-right font-extrabold font-mono text-rose-600 dark:text-rose-400">
                              {formatCurrency(personStatement.transactions.reduce((s: number, t: any) => s + toNum(t.credit), 0))}
                            </td>
                            <td className="p-3 text-right">
                              {(() => {
                                const bal = toNum(personStatement.balance?.amount_they_owe_you) - toNum(personStatement.balance?.amount_you_owe_them);
                                const isDr = bal >= 0;
                                return (
                                  <span className={`font-extrabold font-mono text-sm ${isDr ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                    {formatCurrency(Math.abs(bal))} {isDr ? 'Dr' : 'Cr'}
                                  </span>
                                );
                              })()}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="card p-10 text-center">
                    <p className="text-sm text-slate-400">No transactions found in this person's ledger.</p>
                  </div>
                )}

                {/* Loans with this person */}
                {personStatement.loans && personStatement.loans.length > 0 && (
                  <div className="card p-0 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Loan Agreements with {personStatement.person?.name}
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800">
                            <th className="p-3">Direction</th>
                            <th className="p-3">Principal</th>
                            <th className="p-3">Interest</th>
                            <th className="p-3">Repaid</th>
                            <th className="p-3">Remaining</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Start Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                          {personStatement.loans.map((loan: any) => (
                            <tr key={loan.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                              <td className="p-3">
                                <span className={`badge text-[10px] ${loan.direction === 'LENT' ? 'badge-warning' : 'badge-brand'}`}>
                                  {loan.direction === 'LENT' ? 'Lent' : 'Borrowed'}
                                </span>
                              </td>
                              <td className="p-3 font-bold text-slate-900 dark:text-slate-100">{formatCurrency(toNum(loan.principal_amount))}</td>
                              <td className="p-3 text-slate-500">{formatCurrency(toNum(loan.interest_amount))}</td>
                              <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(toNum(loan.total_repaid))}</td>
                              <td className="p-3 font-bold text-amber-600 dark:text-amber-400">{formatCurrency(toNum(loan.remaining_amount))}</td>
                              <td className="p-3">
                                <span className={`badge text-[10px] ${
                                  loan.status === 'ACTIVE' ? 'badge-warning' :
                                  loan.status === 'PAID' ? 'badge-success' :
                                  loan.status === 'OVERDUE' ? 'badge-danger' :
                                  'badge-neutral'
                                }`}>
                                  {loan.status}
                                </span>
                              </td>
                              <td className="p-3 text-slate-500">{formatDateDMY(loan.start_date)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}

      {/* ─── LOAN PORTFOLIO ─── */}
      {activeTab === 'loan' && (
        <div className="space-y-5">
          {loanLoading ? (
            <LoadingSpinner message="Calculating loan portfolio..." />
          ) : loanError ? (
            <QueryError title="Failed to load loan report" onRetry={() => refetchLoan()} />
          ) : (
            loanReport && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="stat-card">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-brand-100/60 dark:bg-brand-950/40 flex items-center justify-center flex-shrink-0">
                      <Clock size={16} className="text-brand-600 dark:text-brand-400" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Loans</span>
                  </div>
                  <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{loanReport.summary?.active_count || 0}</p>
                  <span className="text-[10px] text-slate-400 mt-1">Ongoing agreements</span>
                </div>

                <div className="stat-card">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-100/60 dark:bg-amber-950/40 flex items-center justify-center flex-shrink-0">
                      <Wallet size={16} className="text-amber-600 dark:text-amber-400" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Principal</span>
                  </div>
                  <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{formatCurrency(loanReport.summary?.total_active_principal || 0)}</p>
                  <span className="text-[10px] text-slate-400 mt-1">Outstanding principal</span>
                </div>

                <div className="stat-card">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100/60 dark:bg-emerald-950/40 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Repaid</span>
                  </div>
                  <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{formatCurrency(loanReport.summary?.total_active_repaid || 0)}</p>
                  <span className="text-[10px] text-slate-400 mt-1">Repayments collected/made</span>
                </div>

                <div className="stat-card">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-rose-100/60 dark:bg-rose-950/40 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle size={16} className="text-rose-600 dark:text-rose-400" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Overdue</span>
                  </div>
                  <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">{loanReport.summary?.overdue_count || 0}</p>
                  <span className="text-[10px] text-slate-400 mt-1">Agreements past due date</span>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
