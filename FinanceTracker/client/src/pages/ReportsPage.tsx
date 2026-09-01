import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi, accountsApi, peopleApi } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import QueryError from '../components/QueryError';
import { useTheme } from '../contexts/ThemeContext';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
  BarChart3, PieChart as PieIcon, Landmark, UserCheck, ShieldAlert, ArrowUpRight, ArrowDownRight, Calendar
} from 'lucide-react';
import type { Account, Person } from '../types';
import { formatDateDMY } from '../utils/format';

const toNum = (v: any): number => (typeof v === 'number' ? v : parseFloat(v) || 0);

const formatCurrency = (amount: number) =>
  `৳${amount.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899', '#06b6d4'];

type ReportTab = 'income' | 'expense' | 'position' | 'account' | 'person' | 'loan';

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
  const { data: accountStatement, isLoading: accountLoading, isError: accountError, refetch: refetchAccount } = useQuery({
    queryKey: ['reports', 'account', selectedAccountId],
    queryFn: () => reportsApi.accountStatement({ account_id: selectedAccountId }).then((r) => r.data.data),
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
    { key: 'income', label: 'Income Report', icon: ArrowUpRight },
    { key: 'expense', label: 'Expense Report', icon: ArrowDownRight },
    { key: 'account', label: 'Account Statement', icon: BarChart3 },
    { key: 'person', label: 'Person Statement', icon: UserCheck },
    { key: 'loan', label: 'Loan Portfolio', icon: ShieldAlert },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-xl text-xs space-y-1">
          <p className="font-bold text-slate-900 dark:text-slate-100">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} className="flex items-center gap-2" style={{ color: entry.color }}>
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
          Financial Intelligence & Reports
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Executive financial statements, category share, and account ledgers.
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
      {['income', 'expense', 'person'].includes(activeTab) && (
        <div className="card p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <Calendar size={15} /> Range Filter:
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
        </div>
      )}

      {/* Financial Position Tab */}
      {activeTab === 'position' && (
        <div>
          {positionLoading ? (
            <LoadingSpinner message="Calculating financial position..." />
          ) : positionError ? (
            <QueryError title="Failed to load position" onRetry={() => refetchPosition()} />
          ) : (
            position && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card p-6 space-y-4">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 pb-3 border-b border-slate-100 dark:border-slate-800">
                    Net Balance Position
                  </h3>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Cash in Accounts</span>
                      <span className="font-extrabold text-slate-900 dark:text-slate-100">{formatCurrency(position.totalCash)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Receivables (Owed to you)</span>
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400">+{formatCurrency(position.totalReceivable)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Payables (Owed to others)</span>
                      <span className="font-extrabold text-rose-600 dark:text-rose-400">-{formatCurrency(position.totalPayable)}</span>
                    </div>
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-sm">
                      <span className="font-bold text-slate-900 dark:text-slate-100">Net Wealth Value</span>
                      <span className={`text-xl font-extrabold ${position.netPosition >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600 dark:text-rose-400'}`}>
                        {formatCurrency(position.netPosition)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="card p-6 space-y-4">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 pb-3 border-b border-slate-100 dark:border-slate-800">
                    Active Loan Commitments
                  </h3>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Total Active Funds Lent</span>
                      <span className="font-extrabold text-brand-600 dark:text-brand-400">{formatCurrency(position.loanSummary.totalLent)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Total Active Borrowed Principal</span>
                      <span className="font-extrabold text-amber-600 dark:text-amber-400">{formatCurrency(position.loanSummary.totalBorrowed)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* Income Report */}
      {activeTab === 'income' && (
        <div>
          {incomeLoading ? (
            <LoadingSpinner message="Aggregating income data..." />
          ) : incomeError ? (
            <QueryError title="Failed to load income report" onRetry={() => refetchIncome()} />
          ) : (
            incomeReport && (
              <div className="space-y-6">
                <div className="stat-card">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Income Earned</span>
                  <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                    {formatCurrency(incomeReport.total)}
                  </p>
                </div>

                {incomeReport.byCategory?.length > 0 && (
                  <div className="card p-6">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">Income by Category</h3>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={incomeReport.byCategory}>
                          <XAxis dataKey="category_name" tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="total" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}

      {/* Expense Report */}
      {activeTab === 'expense' && (
        <div>
          {expenseLoading ? (
            <LoadingSpinner message="Aggregating expense metrics..." />
          ) : expenseError ? (
            <QueryError title="Failed to load expense report" onRetry={() => refetchExpense()} />
          ) : (
            expenseReport && (
              <div className="space-y-6">
                <div className="stat-card">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Outgoing Expenses</span>
                  <p className="text-3xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
                    {formatCurrency(expenseReport.total)}
                  </p>
                </div>

                {expenseReport.byCategory?.length > 0 && (
                  <div className="card p-6">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">Expenses by Category Share</h3>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={expenseReport.byCategory}
                            dataKey="total"
                            nameKey="category_name"
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={85}
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
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}

      {/* Account Statement */}
      {activeTab === 'account' && (
        <div className="space-y-4">
          <div className="card p-4">
            <label className="label">Select Target Account</label>
            <select
              className="input max-w-md text-xs font-semibold"
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
              <div className="card p-0 overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                  <div>
                    <span className="text-slate-500">Opening Balance: </span>
                    <strong className="text-slate-900 dark:text-slate-100">{formatCurrency(accountStatement.openingBalance)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Closing Balance: </span>
                    <strong className="text-brand-600 dark:text-brand-400 text-sm">{formatCurrency(accountStatement.closingBalance)}</strong>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800">
                        <th className="p-3">Date</th>
                        <th className="p-3">Description</th>
                        <th className="p-3">Type</th>
                        <th className="p-3 text-right">Cashflow Effect</th>
                        <th className="p-3 text-right">Running Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                      {accountStatement.transactions?.map((tx: any) => (
                        <tr key={tx.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                          <td className="p-3 text-slate-500">{formatDateDMY(tx.transaction_date)}</td>
                          <td className="p-3 font-bold text-slate-900 dark:text-slate-100">{tx.description || tx.transaction_type}</td>
                          <td className="p-3 text-slate-500">{tx.transaction_type.replace('_', ' ')}</td>
                          <td className={`p-3 text-right font-bold ${
                            parseFloat(tx.effect) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}>
                            {parseFloat(tx.effect) >= 0 ? '+' : ''}{formatCurrency(parseFloat(tx.effect))}
                          </td>
                          <td className="p-3 text-right font-extrabold text-slate-900 dark:text-slate-100">{formatCurrency(tx.running_balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* Person Statement — Accounting Ledger */}
      {activeTab === 'person' && (
        <div className="space-y-4">
          <div className="card p-4">
            <label className="label">Select Contact</label>
            <select
              className="input max-w-md text-xs font-semibold"
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
                {/* Accounting Header */}
                <div className="card p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                        Ledger Account: {personStatement.person?.name}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Personal account showing all debit & credit transactions
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <div className="text-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Debit</span>
                        <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(personStatement.transactions?.reduce((s: number, t: any) => s + toNum(t.debit), 0) || 0)}
                        </span>
                      </div>
                      <div className="text-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Credit</span>
                        <span className="text-sm font-extrabold text-rose-600 dark:text-rose-400">
                          {formatCurrency(personStatement.transactions?.reduce((s: number, t: any) => s + toNum(t.credit), 0) || 0)}
                        </span>
                      </div>
                      <div className="text-center pl-3 border-l border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Balance c/d</span>
                        {(() => {
                          const bal = toNum(personStatement.balance?.amount_they_owe_you) - toNum(personStatement.balance?.amount_you_owe_them);
                          const isDr = bal >= 0;
                          return (
                            <span className={`text-sm font-extrabold ${isDr ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                              {formatCurrency(Math.abs(bal))} {isDr ? 'Dr' : 'Cr'}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Proper Accounting Ledger Table */}
                {personStatement.transactions && personStatement.transactions.length > 0 && (
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
                            <th className="p-3 w-[150px] text-right">Balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                          {personStatement.transactions.map((tx: any) => {
                            const debit = toNum(tx.debit);
                            const credit = toNum(tx.credit);
                            const bal = toNum(tx.running_balance);
                            const isDr = bal >= 0;
                            return (
                              <tr key={tx.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                                <td className="p-3 text-slate-500 whitespace-nowrap font-medium">
                                  {formatDateDMY(tx.transaction_date)}
                                </td>
                                <td className="p-3">
                                  <div className="font-bold text-slate-900 dark:text-slate-100 max-w-[220px] truncate">
                                    {tx.description || tx.transaction_type.replace('_', ' ').toLowerCase()}
                                  </div>
                                  {tx.account_name && (
                                    <div className="text-[10px] text-slate-400 mt-0.5">via {tx.account_name}</div>
                                  )}
                                </td>
                                <td className="p-3">
                                  <span className={`badge text-[10px] ${
                                    tx.transaction_type === 'LEND' ? 'badge-warning' :
                                    tx.transaction_type === 'BORROW' ? 'badge-info' :
                                    tx.transaction_type === 'LEND_REPAYMENT' ? 'badge-success' :
                                    tx.transaction_type === 'BORROW_REPAYMENT' ? 'badge-danger' :
                                    'badge-neutral'
                                  }`}>
                                    {tx.transaction_type.replace('_', ' ')}
                                  </span>
                                </td>
                                <td className="p-3 text-right font-bold font-mono">
                                  {debit > 0 ? (
                                    <span className="text-emerald-600 dark:text-emerald-400">
                                      {formatCurrency(debit)}
                                    </span>
                                  ) : (
                                    <span className="text-slate-300 dark:text-slate-700">—</span>
                                  )}
                                </td>
                                <td className="p-3 text-right font-bold font-mono">
                                  {credit > 0 ? (
                                    <span className="text-rose-600 dark:text-rose-400">
                                      {formatCurrency(credit)}
                                    </span>
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
                        {/* Totals row */}
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
                            <tr key={loan.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                              <td className="p-3">
                                <span className={`badge text-[10px] ${loan.direction === 'LENT' ? 'badge-warning' : 'badge-info'}`}>
                                  {loan.direction === 'LENT' ? 'Lent' : 'Borrowed'}
                                </span>
                              </td>
                              <td className="p-3 font-bold text-slate-900 dark:text-slate-100">
                                {formatCurrency(toNum(loan.principal_amount))}
                              </td>
                              <td className="p-3 text-slate-500">{formatCurrency(toNum(loan.interest_amount))}</td>
                              <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(toNum(loan.total_repaid))}
                              </td>
                              <td className="p-3 font-bold text-amber-600 dark:text-amber-400">
                                {formatCurrency(toNum(loan.remaining_amount))}
                              </td>
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

                {/* Empty state */}
                {(!personStatement.transactions || personStatement.transactions.length === 0) && (
                  <div className="card p-8 text-center">
                    <p className="text-sm text-slate-400">No transactions found in this person's ledger.</p>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}

      {/* Loan Report */}
      {activeTab === 'loan' && (
        <div className="space-y-4">
          {loanLoading ? (
            <LoadingSpinner message="Calculating loan summary..." />
          ) : loanError ? (
            <QueryError title="Failed to load loan report" onRetry={() => refetchLoan()} />
          ) : (
            loanReport && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="stat-card">
                  <span className="text-xs text-slate-500 font-semibold uppercase">Active Loans</span>
                  <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{loanReport.summary?.active_count || 0}</p>
                </div>
                <div className="stat-card">
                  <span className="text-xs text-slate-500 font-semibold uppercase">Active Principal</span>
                  <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">{formatCurrency(loanReport.summary?.total_active_principal || 0)}</p>
                </div>
                <div className="stat-card">
                  <span className="text-xs text-slate-500 font-semibold uppercase">Total Repaid</span>
                  <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrency(loanReport.summary?.total_active_repaid || 0)}</p>
                </div>
                <div className="stat-card">
                  <span className="text-xs text-slate-500 font-semibold uppercase">Overdue Agreements</span>
                  <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">{loanReport.summary?.overdue_count || 0}</p>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
