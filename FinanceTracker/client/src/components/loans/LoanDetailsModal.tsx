import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Wallet, FileText, Zap } from 'lucide-react';
import Modal from '../Modal';
import { loansApi } from '../../api/client';
import { useTheme } from '../../contexts/ThemeContext';
import type { Loan } from '../../types';
import { formatDateDMY } from '../../utils/format';

const toNum = (v: any): number => (typeof v === 'number' ? v : parseFloat(v) || 0);

const formatCurrency = (amount: number) =>
  `৳${amount.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

function getInitials(name: string | null | undefined): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface LoanDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan | null;
  onRecordPayment?: (loan: Loan) => void;
  onOpenVoucher?: (loan: Loan) => void;
}

export default function LoanDetailsModal({
  isOpen,
  onClose,
  loan,
  onRecordPayment,
  onOpenVoucher,
}: LoanDetailsModalProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const { data: detailsData, isLoading: detailsLoading } = useQuery({
    queryKey: ['loans', loan?.id],
    queryFn: () => loansApi.get(loan!.id).then((r) => r.data.data),
    enabled: !!loan?.id && isOpen,
  });

  if (!loan) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Loan Agreement Details & Statement"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-5">
        {/* Header with Counterparty, Direction, and Badges */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm shadow-sm ${
                loan.direction === 'LENT'
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
              }`}
            >
              {getInitials(loan.person_name)}
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                {loan.person_name || 'Unknown Contact'}
              </h3>
              <div className="flex items-center gap-1.5 mt-1">
                <span
                  className={`badge text-[10px] ${
                    loan.direction === 'LENT' ? 'badge-success' : 'badge-danger'
                  }`}
                >
                  {loan.direction === 'LENT' ? 'Lent (Receivable)' : 'Borrowed (Payable)'}
                </span>
                <span className="badge badge-neutral text-[10px]">{loan.status}</span>
                {loan.source === 'AUTO' && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 flex items-center gap-0.5">
                    <Zap size={9} /> Auto
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons inside Details Modal */}
          <div className="flex items-center gap-2">
            {loan.status !== 'PAID' && onRecordPayment && (
              <button
                onClick={() => {
                  onClose();
                  onRecordPayment(loan);
                }}
                className="btn-primary text-xs px-3 py-1.5 font-semibold flex items-center gap-1"
              >
                <Wallet size={13} />
                <span>Record Payment</span>
              </button>
            )}
            {onOpenVoucher && (
              <button
                onClick={() => onOpenVoucher(loan)}
                className="btn-secondary text-xs px-3 py-1.5 font-semibold flex items-center gap-1"
              >
                <FileText size={13} />
                <span>Voucher</span>
              </button>
            )}
          </div>
        </div>

        {/* Financial Overview 4 Grid */}
        {(() => {
          const p = toNum(loan.principal_amount);
          const i = toNum(loan.interest_amount);
          const r = toNum(loan.total_repaid);
          const rem = toNum(loan.remaining_amount);
          const tot = p + i;
          const pct = tot > 0 ? (r / tot) * 100 : 0;

          return (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-xl bg-slate-100/60 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Principal</p>
                  <p className="text-sm font-extrabold font-mono text-slate-900 dark:text-slate-100 mt-0.5">
                    {formatCurrency(p)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-100/60 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Interest</p>
                  <p className="text-sm font-extrabold font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                    {formatCurrency(i)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-100/60 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Total Repaid</p>
                  <p className="text-sm font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {formatCurrency(r)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-100/60 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Remaining</p>
                  <p
                    className={`text-sm font-extrabold font-mono mt-0.5 ${
                      loan.direction === 'LENT'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {formatCurrency(rem)}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
                  <span>Repayment Settlement Progress</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{pct.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-brand-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })()}

        {/* Dates & Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Agreement Start Date</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
              {formatDateDMY(loan.start_date)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Due Date</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
              {loan.due_date ? formatDateDMY(loan.due_date) : 'No due date set'}
            </span>
          </div>
          {loan.description && (
            <div className="sm:col-span-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Notes / Purpose</span>
              <p className="text-slate-600 dark:text-slate-300 mt-0.5">{loan.description}</p>
            </div>
          )}
        </div>

        {/* Running Balance Trend Chart */}
        {detailsLoading ? (
          <div className="py-6 text-center text-xs text-slate-400">Loading ledger data...</div>
        ) : detailsData?.transactions?.length > 1 ? (
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-2">
              Outstanding Balance Trajectory
            </h4>
            <div className="h-32 w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800">
              {(() => {
                let r = 0;
                const chartData = detailsData.transactions.map((tx: any) => {
                  const isA = tx.transaction_type === 'LEND' || tx.transaction_type === 'BORROW';
                  r += isA ? toNum(tx.amount) : -toNum(tx.amount);
                  return {
                    date: tx.transaction_date,
                    balance: Math.max(r, 0),
                  };
                });
                return (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                      <defs>
                        <linearGradient id="detailsGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 9, fill: isDark ? '#64748b' : '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis hide domain={[0, 'auto']} />
                      <Tooltip
                        formatter={(v: number) => [formatCurrency(v), 'Balance']}
                        labelFormatter={(l: string) => formatDateDMY(l)}
                        contentStyle={{
                          fontSize: 11,
                          borderRadius: 8,
                          border: 'none',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          padding: '6px 10px',
                        }}
                      />
                      <Area
                        type="stepAfter"
                        dataKey="balance"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        fill="url(#detailsGrad)"
                        dot={{ r: 3, fill: '#f59e0b', stroke: '#fff', strokeWidth: 1 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                );
              })()}
            </div>
          </div>
        ) : null}

        {/* Transaction Timeline Table */}
        <div>
          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-2">
            Transaction History &amp; Running Balance
          </h4>
          {detailsData?.transactions?.length > 0 ? (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] font-bold text-slate-400 uppercase tracking-wider sticky top-0">
                  <tr>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Particulars</th>
                    <th className="p-2.5 text-right">Amount</th>
                    <th className="p-2.5 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {(() => {
                    let running = 0;
                    return detailsData.transactions.map((tx: any) => {
                      const isAdd = tx.transaction_type === 'LEND' || tx.transaction_type === 'BORROW';
                      running += isAdd ? toNum(tx.amount) : -toNum(tx.amount);
                      return (
                        <tr
                          key={tx.id}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors"
                        >
                          <td className="p-2.5 text-slate-500 whitespace-nowrap font-medium">
                            {formatDateDMY(tx.transaction_date)}
                          </td>
                          <td className="p-2.5">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate max-w-[200px]">
                              {tx.description || tx.transaction_type.replace(/_/g, ' ').toLowerCase()}
                            </span>
                            {tx.account_name && (
                              <span className="text-[10px] text-slate-400">via {tx.account_name}</span>
                            )}
                          </td>
                          <td className="p-2.5 text-right font-bold font-mono">
                            <span
                              className={
                                isAdd
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }
                            >
                              {isAdd ? '+' : '-'}
                              {formatCurrency(toNum(tx.amount))}
                            </span>
                          </td>
                          <td className="p-2.5 text-right font-extrabold font-mono text-slate-700 dark:text-slate-300">
                            {formatCurrency(running)}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-3 text-center">No transaction records logged.</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
