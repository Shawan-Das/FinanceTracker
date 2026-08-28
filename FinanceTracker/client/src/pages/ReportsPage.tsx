import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi, accountsApi, peopleApi } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import type { Account, Person } from '../types';

const formatCurrency = (amount: number) =>
  `৳${amount.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

type ReportTab = 'income' | 'expense' | 'position' | 'account' | 'person' | 'loan';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('position');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState('');

  const dateParams = { ...(dateFrom && { from: dateFrom }), ...(dateTo && { to: dateTo }) };

  // Income report
  const { data: incomeReport, isLoading: incomeLoading } = useQuery({
    queryKey: ['reports', 'income', dateParams],
    queryFn: () => reportsApi.income(dateParams).then((r) => r.data.data),
    enabled: activeTab === 'income',
  });

  // Expense report
  const { data: expenseReport, isLoading: expenseLoading } = useQuery({
    queryKey: ['reports', 'expense', dateParams],
    queryFn: () => reportsApi.expense(dateParams).then((r) => r.data.data),
    enabled: activeTab === 'expense',
  });

  // Financial position
  const { data: position, isLoading: positionLoading } = useQuery({
    queryKey: ['reports', 'position'],
    queryFn: () => reportsApi.financialPosition().then((r) => r.data.data),
    enabled: activeTab === 'position',
  });

  // Account statement
  const { data: accountStatement, isLoading: accountLoading } = useQuery({
    queryKey: ['reports', 'account', selectedAccountId],
    queryFn: () => reportsApi.accountStatement({ account_id: selectedAccountId }).then((r) => r.data.data),
    enabled: activeTab === 'account' && !!selectedAccountId,
  });

  // Person statement
  const { data: personStatement, isLoading: personLoading } = useQuery({
    queryKey: ['reports', 'person', selectedPersonId],
    queryFn: () => reportsApi.personStatement({ person_id: selectedPersonId }).then((r) => r.data.data),
    enabled: activeTab === 'person' && !!selectedPersonId,
  });

  // Loan report
  const { data: loanReport, isLoading: loanLoading } = useQuery({
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

  const tabs: { key: ReportTab; label: string }[] = [
    { key: 'position', label: 'Financial Position' },
    { key: 'income', label: 'Income Report' },
    { key: 'expense', label: 'Expense Report' },
    { key: 'account', label: 'Account Statement' },
    { key: 'person', label: 'Person Statement' },
    { key: 'loan', label: 'Loan Report' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-500">Analyze your financial data</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors
              ${activeTab === tab.key
                ? 'bg-primary-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Date filters (for income/expense) */}
      {['income', 'expense'].includes(activeTab) && (
        <div className="flex gap-4 items-end">
          <div>
            <label className="label">From</label>
            <input type="date" className="input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">To</label>
            <input type="date" className="input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>
      )}

      {/* Financial Position */}
      {activeTab === 'position' && (
        <div>
          {positionLoading ? <LoadingSpinner /> : position && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Net Financial Position</h3>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Money in Accounts</span>
                    <span className="font-medium">{formatCurrency(position.totalCash)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">People owe you</span>
                    <span className="font-medium text-green-600">+{formatCurrency(position.totalReceivable)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">You owe people</span>
                    <span className="font-medium text-red-600">-{formatCurrency(position.totalPayable)}</span>
                  </div>
                  <hr />
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-900">Net Position</span>
                    <span className={`text-xl font-bold ${position.netPosition >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                      {formatCurrency(position.netPosition)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Loan Summary</h3>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total lent (active)</span>
                    <span className="font-medium text-blue-600">{formatCurrency(position.loanSummary.totalLent)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total borrowed (active)</span>
                    <span className="font-medium text-orange-600">{formatCurrency(position.loanSummary.totalBorrowed)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Income Report */}
      {activeTab === 'income' && (
        <div>
          {incomeLoading ? <LoadingSpinner /> : incomeReport && (
            <div className="space-y-6">
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Income</h3>
                <p className="text-3xl font-bold text-green-600">{formatCurrency(incomeReport.total)}</p>
              </div>

              {incomeReport.byCategory.length > 0 && (
                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">By Category</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={incomeReport.byCategory}>
                      <XAxis dataKey="category_name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {incomeReport.byMonth.length > 0 && (
                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">By Month</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={incomeReport.byMonth}>
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Expense Report */}
      {activeTab === 'expense' && (
        <div>
          {expenseLoading ? <LoadingSpinner /> : expenseReport && (
            <div className="space-y-6">
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Expense</h3>
                <p className="text-3xl font-bold text-red-600">{formatCurrency(expenseReport.total)}</p>
              </div>

              {expenseReport.byCategory.length > 0 && (
                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">By Category</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={expenseReport.byCategory} dataKey="total" nameKey="category_name"
                        cx="50%" cy="50%" outerRadius={90}
                        label={({ category_name, percent }) => `${category_name} ${(percent * 100).toFixed(0)}%`}>
                        {expenseReport.byCategory.map((_: any, i: number) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {expenseReport.byMonth.length > 0 && (
                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">By Month</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={expenseReport.byMonth}>
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="total" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Account Statement */}
      {activeTab === 'account' && (
        <div>
          <div className="mb-4">
            <label className="label">Select Account</label>
            <select className="input max-w-md" value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}>
              <option value="">Choose an account...</option>
              {accounts?.map((a: Account) => (
                <option key={a.account_id} value={a.account_id}>{a.account_name}</option>
              ))}
            </select>
          </div>
          {accountLoading ? <LoadingSpinner /> : accountStatement && (
            <div className="card p-0">
              <div className="p-4 border-b border-gray-200">
                <p className="text-sm text-gray-600">Opening Balance: <span className="font-medium">{formatCurrency(accountStatement.openingBalance)}</span></p>
                <p className="text-sm text-gray-600">Closing Balance: <span className="font-semibold">{formatCurrency(accountStatement.closingBalance)}</span></p>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-200">
                    <th className="p-3">Date</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Type</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {accountStatement.transactions.map((tx: any) => (
                    <tr key={tx.id} className="border-b border-gray-50">
                      <td className="p-3 text-sm">{new Date(tx.transaction_date).toLocaleDateString()}</td>
                      <td className="p-3 text-sm">{tx.description || tx.transaction_type}</td>
                      <td className="p-3 text-sm">{tx.transaction_type.replace('_', ' ')}</td>
                      <td className={`p-3 text-sm text-right font-medium ${parseFloat(tx.effect) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {parseFloat(tx.effect) >= 0 ? '+' : ''}{formatCurrency(parseFloat(tx.effect))}
                      </td>
                      <td className="p-3 text-sm text-right font-medium">{formatCurrency(tx.running_balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Person Statement */}
      {activeTab === 'person' && (
        <div>
          <div className="mb-4">
            <label className="label">Select Person</label>
            <select className="input max-w-md" value={selectedPersonId}
              onChange={(e) => setSelectedPersonId(e.target.value)}>
              <option value="">Choose a person...</option>
              {people?.map((p: Person) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          {personLoading ? <LoadingSpinner /> : personStatement && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card text-center">
                  <p className="text-sm text-gray-500">They owe you</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(personStatement.balance.amount_they_owe_you)}</p>
                </div>
                <div className="card text-center">
                  <p className="text-sm text-gray-500">You owe them</p>
                  <p className="text-xl font-bold text-red-600">{formatCurrency(personStatement.balance.amount_you_owe_them)}</p>
                </div>
                <div className="card text-center">
                  <p className="text-sm text-gray-500">Net</p>
                  <p className={`text-xl font-bold ${personStatement.balance.amount_they_owe_you - personStatement.balance.amount_you_owe_them >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(personStatement.balance.amount_they_owe_you - personStatement.balance.amount_you_owe_them)}
                  </p>
                </div>
              </div>
              <div className="card p-0">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-200">
                      <th className="p-3">Date</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Account</th>
                      <th className="p-3">Description</th>
                      <th className="p-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {personStatement.transactions.map((tx: any) => (
                      <tr key={tx.id} className="border-b border-gray-50">
                        <td className="p-3 text-sm">{new Date(tx.transaction_date).toLocaleDateString()}</td>
                        <td className="p-3 text-sm">{tx.transaction_type.replace('_', ' ')}</td>
                        <td className="p-3 text-sm">{tx.account_name || '-'}</td>
                        <td className="p-3 text-sm">{tx.description || '-'}</td>
                        <td className={`p-3 text-sm text-right font-medium
                          ${['LEND', 'BORROW_REPAYMENT'].includes(tx.transaction_type) ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(tx.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loan Report */}
      {activeTab === 'loan' && (
        <div>
          {loanLoading ? <LoadingSpinner /> : loanReport && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card text-center">
                  <p className="text-sm text-gray-500">Active Loans</p>
                  <p className="text-2xl font-bold text-gray-900">{loanReport.summary.active_count || 0}</p>
                </div>
                <div className="card text-center">
                  <p className="text-sm text-gray-500">Total Active Principal</p>
                  <p className="text-2xl font-bold text-orange-600">{formatCurrency(loanReport.summary.total_active_principal || 0)}</p>
                </div>
                <div className="card text-center">
                  <p className="text-sm text-gray-500">Total Repaid</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(loanReport.summary.total_active_repaid || 0)}</p>
                </div>
                <div className="card text-center">
                  <p className="text-sm text-gray-500">Overdue</p>
                  <p className="text-2xl font-bold text-red-600">{loanReport.summary.overdue_count || 0}</p>
                </div>
              </div>

              <div className="card p-0">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-200">
                      <th className="p-3">Person</th>
                      <th className="p-3">Direction</th>
                      <th className="p-3">Principal</th>
                      <th className="p-3">Repaid</th>
                      <th className="p-3">Remaining</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loanReport.loans.map((loan: any) => (
                      <tr key={loan.id} className="border-b border-gray-50">
                        <td className="p-3 text-sm font-medium">{loan.person_name || 'Unknown'}</td>
                        <td className="p-3 text-sm">{loan.direction}</td>
                        <td className="p-3 text-sm">{formatCurrency(loan.principal_amount)}</td>
                        <td className="p-3 text-sm text-green-600">{formatCurrency(loan.total_repaid)}</td>
                        <td className="p-3 text-sm text-orange-600 font-medium">{formatCurrency(loan.remaining_amount)}</td>
                        <td className="p-3">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full
                            ${loan.status === 'ACTIVE' ? 'bg-orange-100 text-orange-700' :
                              loan.status === 'PAID' ? 'bg-green-100 text-green-700' :
                              loan.status === 'OVERDUE' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'}`}>
                            {loan.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
