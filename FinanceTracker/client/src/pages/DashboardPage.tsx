import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  CreditCard,
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
import type { Transaction, DashboardSummary, MonthlyChartData } from '../types';

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

const formatCurrency = (amount: number) =>
  `৳${amount.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const getTransactionEffect = (tx: Transaction): string => {
  const type = tx.transaction_type;
  if (['INCOME', 'LEND_REPAYMENT', 'BORROW'].includes(type)) return '+';
  if (['EXPENSE', 'LEND', 'BORROW_REPAYMENT'].includes(type)) return '-';
  if (type === 'TRANSFER') return '↔';
  return '±';
};

const getTransactionColor = (tx: Transaction): string => {
  const effect = getTransactionEffect(tx);
  if (effect === '+') return 'text-green-600';
  if (effect === '-') return 'text-red-600';
  return 'text-gray-600';
};

export default function DashboardPage() {
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => dashboardApi.summary().then((r) => r.data.data),
  });

  const { data: recentTx, isLoading: recentLoading } = useQuery({
    queryKey: ['dashboard', 'recent'],
    queryFn: () => dashboardApi.recentTransactions().then((r) => r.data.data),
  });

  const { data: monthlyData } = useQuery({
    queryKey: ['dashboard', 'monthly'],
    queryFn: () => dashboardApi.monthlyChart().then((r) => r.data.data),
  });

  const { data: categoryData } = useQuery({
    queryKey: ['dashboard', 'categories'],
    queryFn: () => dashboardApi.expenseByCategory().then((r) => r.data.data),
  });

  const { data: loanSummary } = useQuery({
    queryKey: ['dashboard', 'loans'],
    queryFn: () => dashboardApi.loanSummary().then((r) => r.data.data),
  });

  const { data: peopleSummary } = useQuery({
    queryKey: ['dashboard', 'people'],
    queryFn: () => dashboardApi.peopleSummary().then((r) => r.data.data),
  });

  if (summaryLoading) return <LoadingSpinner />;

  const s = summary as DashboardSummary;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Your financial overview at a glance</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Wallet size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total in Accounts</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(s.totalAccountBalance)}</p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <TrendingUp size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Receivable</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(s.totalReceivable)}</p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <TrendingDown size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Payable</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(s.totalPayable)}</p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <CreditCard size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Net Position</p>
              <p className={`text-xl font-bold ${s.netPosition >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                {formatCurrency(s.netPosition)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Income vs Expense & Category Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Income vs Expense (12 months)</h3>
          {monthlyData && monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-500 py-8 text-center">No data yet. Add some transactions!</p>
          )}
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Expense by Category</h3>
          {categoryData && categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="total"
                  nameKey="category_name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ category_name, percent }) =>
                    `${category_name} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {categoryData.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-500 py-8 text-center">No expenses recorded yet</p>
          )}
        </div>
      </div>

      {/* Accounts, People, Loans */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Account Balances */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Accounts</h3>
          <div className="space-y-3">
            {s.accounts.map((acc: any) => (
              <div key={acc.account_id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{acc.account_name}</p>
                  <p className="text-xs text-gray-500">{acc.account_type.replace('_', ' ')}</p>
                </div>
                <p className="text-sm font-semibold text-gray-900">{formatCurrency(acc.current_balance)}</p>
              </div>
            ))}
            {s.accounts.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No accounts yet</p>
            )}
          </div>
        </div>

        {/* People */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users size={18} /> People
          </h3>
          <div className="space-y-3">
            {peopleSummary?.map((p: any) => (
              <div key={p.person_id} className="py-2 border-b border-gray-100 last:border-0">
                <p className="text-sm font-medium text-gray-900">{p.person_name}</p>
                <div className="flex gap-4 text-xs mt-1">
                  {parseFloat(p.amount_they_owe_you) > 0 && (
                    <span className="text-green-600">They owe: {formatCurrency(p.amount_they_owe_you)}</span>
                  )}
                  {parseFloat(p.amount_you_owe_them) > 0 && (
                    <span className="text-red-600">You owe: {formatCurrency(p.amount_you_owe_them)}</span>
                  )}
                </div>
              </div>
            ))}
            {(!peopleSummary || peopleSummary.length === 0) && (
              <p className="text-sm text-gray-500 text-center py-4">No people added yet</p>
            )}
          </div>
        </div>

        {/* Active Loans */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CreditCard size={18} /> Active Loans
          </h3>
          <div className="space-y-3">
            {loanSummary?.map((loan: any) => (
              <div key={loan.id} className="py-2 border-b border-gray-100 last:border-0">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {loan.direction === 'LENT' ? 'Lent to' : 'Borrowed from'} {loan.person_name || 'Unknown'}
                    </p>
                    {loan.due_date && (
                      <p className="text-xs text-gray-500">Due: {loan.due_date}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-orange-600">{formatCurrency(loan.remaining_amount)}</p>
                    <p className="text-xs text-gray-500">remaining</p>
                  </div>
                </div>
              </div>
            ))}
            {(!loanSummary || loanSummary.length === 0) && (
              <p className="text-sm text-gray-500 text-center py-4">No active loans</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h3>
        {recentLoading ? (
          <LoadingSpinner />
        ) : recentTx && recentTx.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-200">
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2 pr-4">Description</th>
                  <th className="pb-2 pr-4">Type</th>
                  <th className="pb-2 pr-4">Account</th>
                  <th className="pb-2 pr-4">Person</th>
                  <th className="pb-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentTx.map((tx: Transaction) => (
                  <tr key={tx.id} className="border-b border-gray-50">
                    <td className="py-3 pr-4 text-sm text-gray-500 whitespace-nowrap">
                      {new Date(tx.transaction_date).toLocaleDateString('en-BD', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="py-3 pr-4 text-sm text-gray-900">{tx.description || tx.transaction_type.replace('_', ' ')}</td>
                    <td className="py-3 pr-4">
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                        {tx.transaction_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-sm text-gray-500">{tx.account_name || '-'}</td>
                    <td className="py-3 pr-4 text-sm text-gray-500">{tx.person_name || '-'}</td>
                    <td className={`py-3 text-sm font-semibold text-right whitespace-nowrap ${getTransactionColor(tx)}`}>
                      {getTransactionEffect(tx)}{formatCurrency(tx.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-8">No transactions yet. Start by adding one!</p>
        )}
      </div>
    </div>
  );
}
