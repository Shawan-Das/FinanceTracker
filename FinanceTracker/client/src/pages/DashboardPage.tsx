import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import QueryError from '../components/QueryError';
import { useTheme } from '../contexts/ThemeContext';
import { Link } from 'react-router-dom';
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
  Tag
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
  Legend,
} from 'recharts';
import type { Transaction, DashboardSummary } from '../types';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899', '#06b6d4', '#3b82f6'];

const toNum = (v: any): number => (typeof v === 'number' ? v : parseFloat(v) || 0);

const formatCurrency = (amount: number) =>
  `৳${amount.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

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
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

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

  if (summaryLoading) return <LoadingSpinner message="Calculating net worth & balances..." />;
  if (summaryError) return <QueryError title="Failed to load financial dashboard" onRetry={() => refetchSummary()} />;

  const s = summary as DashboardSummary;

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
    <div className="space-y-6">
      {/* Page Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Financial Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Real-time overview of accounts, cash flow, and debt position.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/transactions"
            className="btn-primary text-xs font-semibold px-3.5 py-2 shadow-sm shadow-brand-500/20"
          >
            <PlusCircle size={15} />
            <span>Add Transaction</span>
          </Link>
          <Link
            to="/accounts"
            className="btn-secondary text-xs font-semibold px-3.5 py-2"
          >
            <Wallet size={15} />
            <span>Accounts</span>
          </Link>
        </div>
      </div>

      {/* Top Financial Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Accounts */}
        <div className="stat-card group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Accounts Balance
            </span>
            <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Wallet size={18} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {formatCurrency(s.totalAccountBalance)}
            </p>
            <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <span>Across {s.accounts?.length || 0} active accounts</span>
            </div>
          </div>
        </div>

        {/* Receivable */}
        <div className="stat-card group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Receivable
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <TrendingUp size={18} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
              {formatCurrency(Math.max(0, toNum(s.totalReceivable)))}
            </p>
            <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <ArrowUpRight size={13} />
              <span>Assets due back to you</span>
            </div>
          </div>
        </div>

        {/* Payable */}
        <div className="stat-card group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Payable
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <TrendingDown size={18} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 tracking-tight">
              {formatCurrency(Math.max(0, toNum(s.totalPayable)))}
            </p>
            <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">
              <ArrowDownRight size={13} />
              <span>Outstanding debts & loans</span>
            </div>
          </div>
        </div>

        {/* Net Position */}
        <div className="stat-card group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Net Wealth Position
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <CreditCard size={18} />
            </div>
          </div>
          <div>
            <p className={`text-2xl font-extrabold tracking-tight ${s.netPosition >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600 dark:text-rose-400'}`}>
              {formatCurrency(s.netPosition)}
            </p>
            <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <span>(Accounts + Receivable - Payable)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Income vs Expense Bar Chart */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Income vs Expenses</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">12-month historical performance</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Income
              </span>
              <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
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
                  <Bar dataKey="income" name="Income" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="expense" name="Expense" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-16 text-center">No cashflow data available yet.</p>
          )}
        </div>

        {/* Expense by Category Pie Chart */}
        <div className="card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Category Share</h3>
              <PieChartIcon size={18} className="text-slate-400" />
            </div>

            {categoryError ? (
              <p className="text-xs text-rose-500 py-12 text-center">Failed to load categories</p>
            ) : categoryData && categoryData.length > 0 ? (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="total"
                      nameKey="category_name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                    >
                      {categoryData.map((_: any, i: number) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-12 text-center">No expense entries recorded yet.</p>
            )}
          </div>

          {categoryData && categoryData.length > 0 && (
            <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 max-h-32 overflow-y-auto">
              {categoryData.slice(0, 4).map((cat: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[120px]">
                      {cat.category_name}
                    </span>
                  </div>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {formatCurrency(toNum(cat.total))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Grid: Accounts, People, Loans Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Accounts List */}
        <div className="card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Accounts</h3>
              <Link to="/accounts" className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-0.5">
                View All <ChevronRight size={14} />
              </Link>
            </div>
            <div className="space-y-3">
              {s.accounts?.slice(0, 4).map((acc: any) => (
                <div
                  key={acc.account_id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-xs">
                      {acc.account_name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{acc.account_name}</p>
                      <p className="text-[10px] text-slate-400 capitalize">{acc.account_type.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <p className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                    {formatCurrency(acc.current_balance)}
                  </p>
                </div>
              ))}
              {(!s.accounts || s.accounts.length === 0) && (
                <p className="text-xs text-slate-500 py-6 text-center">No accounts added yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Debt & Credit Contacts */}
        <div className="card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">People Balances</h3>
              <Link to="/people" className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-0.5">
                Manage <ChevronRight size={14} />
              </Link>
            </div>
            <div className="space-y-3">
              {peopleError ? (
                <p className="text-xs text-rose-500 py-4 text-center">Error loading people</p>
              ) : (
                peopleSummary?.slice(0, 4).map((p: any) => (
                  <div
                    key={p.person_id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <Users size={16} className="text-slate-400" />
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{p.person_name}</span>
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
        </div>

        {/* Active Loans */}
        <div className="card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Loans Tracker</h3>
              <Link to="/loans" className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-0.5">
                View Loans <ChevronRight size={14} />
              </Link>
            </div>
            <div className="space-y-3">
              {loanError ? (
                <p className="text-xs text-rose-500 py-4 text-center">Error loading loans</p>
              ) : (
                loanSummary?.slice(0, 4).map((loan: any) => (
                  <div
                    key={loan.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60"
                  >
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {loan.direction === 'LENT' ? 'Lent to' : 'Borrowed from'} {loan.person_name || 'Contact'}
                      </span>
                      <span className="font-extrabold text-amber-600 dark:text-amber-400">
                        {formatCurrency(toNum(loan.remaining_amount))}
                      </span>
                    </div>
                    {loan.due_date && (
                      <p className="text-[10px] text-slate-400">Due: {loan.due_date}</p>
                    )}
                  </div>
                ))
              )}
              {!loanError && (!loanSummary || loanSummary.length === 0) && (
                <p className="text-xs text-slate-500 py-6 text-center">No active loans outstanding.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Recent Transactions</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Latest financial activities across all accounts</p>
          </div>
          <Link
            to="/transactions"
            className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-0.5"
          >
            All Transactions <ChevronRight size={14} />
          </Link>
        </div>

        {recentLoading ? (
          <LoadingSpinner />
        ) : recentTx && recentTx.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">Description</th>
                  <th className="pb-3 pr-4">Type</th>
                  <th className="pb-3 pr-4">Account</th>
                  <th className="pb-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {recentTx.map((tx: Transaction) => (
                  <tr key={tx.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 pr-4 text-slate-500 dark:text-slate-400 whitespace-nowrap font-medium">
                      {new Date(tx.transaction_date).toLocaleDateString('en-BD', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="py-3 pr-4 font-semibold text-slate-900 dark:text-slate-100">
                      {tx.description || tx.transaction_type.replace('_', ' ')}
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      <span className={getTransactionBadge(tx)}>
                        {tx.transaction_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-slate-500 dark:text-slate-400 font-medium">
                      {tx.account_name || '-'}
                    </td>
                    <td className={`py-3 text-right font-bold whitespace-nowrap ${
                      getTransactionEffect(tx) === '+' ? 'text-emerald-600 dark:text-emerald-400' :
                      getTransactionEffect(tx) === '-' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'
                    }`}>
                      {getTransactionEffect(tx)}{formatCurrency(tx.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-8">No recent transactions to display.</p>
        )}
      </div>
    </div>
  );
}
