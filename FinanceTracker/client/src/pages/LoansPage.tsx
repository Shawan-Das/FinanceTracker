import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { loansApi, peopleApi, accountsApi } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import QueryError from '../components/QueryError';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import VoucherModal, { VoucherReportData } from '../components/VoucherModal';
import { useAuth } from '../contexts/AuthContext';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useTheme } from '../contexts/ThemeContext';
import toast from 'react-hot-toast';
import { Plus, CreditCard, AlertTriangle, CheckCircle2, Wrench, FileText, Calendar, ArrowUpRight, ArrowDownRight, Mail, Trash2, Zap, PenLine, CircleDollarSign, ChevronDown, ChevronUp, Clock, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import type { Loan, Person, Account } from '../types';
import { formatDateDMY } from '../utils/format';

const toNum = (v: any): number => (typeof v === 'number' ? v : parseFloat(v) || 0);

const formatCurrency = (amount: number) =>
  `৳${amount.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export default function LoansPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showRepayForm, setShowRepayForm] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [deletingLoanId, setDeletingLoanId] = useState<string | null>(null);
  const [voucherReportData, setVoucherReportData] = useState<VoucherReportData | null>(null);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);

  // Create loan form
  const [direction, setDirection] = useState<'BORROWED' | 'LENT'>('LENT');
  const [personId, setPersonId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [principal, setPrincipal] = useState('');
  const [interest, setInterest] = useState('0');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [loanSendReceipt, setLoanSendReceipt] = useState(false);

  // Add funds form
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);

  const { data: expandedLoanDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['loans', expandedLoanId],
    queryFn: () => loansApi.get(expandedLoanId!).then((r) => r.data.data),
    enabled: !!expandedLoanId,
  });

  const [showAddFundsForm, setShowAddFundsForm] = useState(false);
  const [addFundsAmount, setAddFundsAmount] = useState('');
  const [addFundsAccountId, setAddFundsAccountId] = useState('');
  const [addFundsDate, setAddFundsDate] = useState(new Date().toISOString().split('T')[0]);
  const [addFundsDescription, setAddFundsDescription] = useState('');

  // Fix orphaned loans
  const [showFixForm, setShowFixForm] = useState(false);
  const [fixAccountId, setFixAccountId] = useState('');

  // Repay form
  const [repayAmount, setRepayAmount] = useState('');
  const [repayDate, setRepayDate] = useState(new Date().toISOString().split('T')[0]);
  const [repayAccountId, setRepayAccountId] = useState('');
  const [repayNotes, setRepayNotes] = useState('');
  const [repaySendReceipt, setRepaySendReceipt] = useState(false);

  const { data: loans, isLoading, isError: loansError, refetch: refetchLoans } = useQuery({
    queryKey: ['loans'],
    queryFn: () => loansApi.list().then((r) => r.data.data),
  });

  const { data: people } = useQuery({
    queryKey: ['people'],
    queryFn: () => peopleApi.list().then((r) => r.data.data),
  });

  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list().then((r) => r.data.data),
  });

  const { data: orphanedData, refetch: refetchOrphaned } = useQuery({
    queryKey: ['loans', 'orphaned'],
    queryFn: () => loansApi.orphaned().then((r) => r.data.data),
  });

  const fixOrphanedMutation = useMutation({
    mutationFn: (data: { account_id: string }) => loansApi.fixOrphaned(data),
    onSuccess: (response) => {
      const fixedCount = response.data.data.fixed_count;
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      refetchOrphaned();
      toast.success(`Fixed ${fixedCount} loan(s) — missing transactions created!`);
      setShowFixForm(false);
      setFixAccountId('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => loansApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Loan deleted successfully!');
      setDeletingLoanId(null);
    },
  });

  const addFundsMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => loansApi.addFunds(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Funds added to loan successfully!');
      setShowAddFundsForm(false);
      resetAddFundsForm();
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => loansApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Loan position recorded!');
      setShowCreateForm(false);
      resetCreateForm();
    },
  });

  const repayMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => loansApi.createRepayment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Repayment transaction logged!');
      setShowRepayForm(false);
      resetRepayForm();
    },
  });

  const resetCreateForm = () => {
    setDirection('LENT');
    setPersonId('');
    setAccountId('');
    setPrincipal('');
    setInterest('0');
    setStartDate(new Date().toISOString().split('T')[0]);
    setDueDate('');
    setDescription('');
    setLoanSendReceipt(false);
  };

  const resetAddFundsForm = () => {
    setAddFundsAmount('');
    setAddFundsAccountId('');
    setAddFundsDate(new Date().toISOString().split('T')[0]);
    setAddFundsDescription('');
    setSelectedLoan(null);
  };

  const resetRepayForm = () => {
    setRepayAmount('');
    setRepayDate(new Date().toISOString().split('T')[0]);
    setRepayAccountId('');
    setRepayNotes('');
    setRepaySendReceipt(false);
    setSelectedLoan(null);
  };

  const handleOpenVoucher = (loan: Loan) => {
    setVoucherReportData({
      id: loan.id,
      transaction_type: loan.direction === 'LENT' ? 'LEND' : 'BORROW',
      transaction_date: loan.start_date,
      amount: loan.principal_amount,
      description: loan.description || (loan.direction === 'LENT'
        ? `Loan lent to ${loan.person_name || 'Unknown'}`
        : `Loan borrowed from ${loan.person_name || 'Unknown'}`),
      reference: null,
      account_name: null,
      person_name: loan.person_name,
      category_name: `Loan (${loan.status})`,
      user_name: user?.full_name,
      user_email: user?.email,
    });
    setIsVoucherModalOpen(true);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      direction,
      person_id: personId || undefined,
      account_id: accountId || undefined,
      principal_amount: parseFloat(principal),
      interest_amount: parseFloat(interest) || 0,
      start_date: startDate,
      due_date: dueDate || undefined,
      description: description || undefined,
      send_receipt: loanSendReceipt,
    });
  };

  const handleRepay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan) return;
    repayMutation.mutate({
      id: selectedLoan.id,
      data: {
        amount: parseFloat(repayAmount),
        repayment_date: repayDate,
        account_id: repayAccountId,
        notes: repayNotes || undefined,
        send_receipt: repaySendReceipt,
      },
    });
  };

  const openAddFunds = (loan: Loan) => {
    setSelectedLoan(loan);
    setAddFundsAmount('');
    setAddFundsAccountId('');
    setAddFundsDate(new Date().toISOString().split('T')[0]);
    setAddFundsDescription('');
    setShowAddFundsForm(true);
  };

  const handleAddFunds = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan) return;
    addFundsMutation.mutate({
      id: selectedLoan.id,
      data: {
        amount: parseFloat(addFundsAmount),
        account_id: addFundsAccountId,
        date: addFundsDate || undefined,
        description: addFundsDescription || undefined,
      },
    });
  };

  const openRepay = (loan: Loan) => {
    setSelectedLoan(loan);
    setRepayAmount(String(toNum(loan.remaining_amount)));
    setRepayDate(new Date().toISOString().split('T')[0]);
    setRepayAccountId('');
    setRepayNotes('');
    setShowRepayForm(true);
  };

  if (isLoading) return <LoadingSpinner message="Loading active loan portfolio..." />;
  if (loansError) return <QueryError title="Failed to load loans" onRetry={() => refetchLoans()} />;

  const activeLoans = loans?.filter((l: Loan) => l.status === 'ACTIVE') || [];
  const otherLoans = loans?.filter((l: Loan) => l.status !== 'ACTIVE') || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Loan Portfolio & Amortization
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Track money lent out or borrowed, interest terms, and repayment schedules.
          </p>
        </div>

        <button
          onClick={() => { resetCreateForm(); setShowCreateForm(true); }}
          className="btn-primary text-xs font-semibold px-3.5 py-2 shadow-sm shadow-brand-500/20"
        >
          <Plus size={15} />
          <span>New Loan Record</span>
        </button>
      </div>

      {/* Orphaned Warning */}
      {orphanedData && orphanedData.count > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60">
          <div className="flex items-start gap-3">
            <Wrench size={20} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                {orphanedData.count} Legacy Loan(s) Require Synchronization
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                These loans were created prior to automated ledger sync. Click below to map them to your funding account.
              </p>
              <button
                onClick={() => { setFixAccountId(''); setShowFixForm(true); }}
                className="mt-3 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Wrench size={14} /> Fix {orphanedData.count} Loan Record(s)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Loans Section */}
      {activeLoans.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Active Loans ({activeLoans.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {activeLoans.map((loan: Loan) => {
              const principal = toNum(loan.principal_amount);
              const interest = toNum(loan.interest_amount);
              const repaid = toNum(loan.total_repaid);
              const remaining = toNum(loan.remaining_amount);
              const totalDue = principal + interest;
              const progress = totalDue > 0 ? (repaid / totalDue) * 100 : 0;
              const isLent = loan.direction === 'LENT';

              return (
                <div
                  key={loan.id}
                  className="card p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Direction Badge & Name */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold shadow-sm ${
                          isLent
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                            : 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                        }`}>
                          {isLent ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                            {isLent ? 'Lent to' : 'Borrowed from'} {loan.person_name || 'Contact'}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                              isLent
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            }`}>
                              {loan.direction}
                            </span>
                            {loan.source === 'AUTO' ? (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 flex items-center gap-1">
                                <Zap size={10} /> Auto
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 flex items-center gap-1">
                                <PenLine size={10} /> Manual
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Breakdown List */}
                    <div className="space-y-2 py-3 border-y border-slate-100 dark:border-slate-800/80 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Total Principal + Int.</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(totalDue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Repaid Amount</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(repaid)}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800/50">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Remaining Balance</span>
                        <span className="font-extrabold text-amber-600 dark:text-amber-400">{formatCurrency(remaining)}</span>
                      </div>
                    </div>

                    {/* Repayment Progress Bar */}
                    <div className="my-3">
                      <div className="flex justify-between text-[11px] text-slate-400 font-medium mb-1">
                        <span>Repayment Progress</span>
                        <span>{progress.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-brand-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    </div>

                    {loan.due_date && (
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 mb-3">
                        <Calendar size={13} /> Due Date: {formatDateDMY(loan.due_date)}
                      </p>
                    )}

                    {/* Transaction History Toggle */}
                    <button
                      onClick={() => setExpandedLoanId(expandedLoanId === loan.id ? null : loan.id)}
                      className="w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors py-1.5 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-950/30 mb-1"
                    >
                      <Clock size={12} />
                      {expandedLoanId === loan.id ? 'Hide' : 'View'} Transaction History
                      {expandedLoanId === loan.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>

                    {/* Expanded Transaction Timeline */}
                    {expandedLoanId === loan.id && (
                      <div className="mt-2 mb-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
                        {detailLoading ? (
                          <p className="text-[10px] text-slate-400 text-center py-2">Loading history...</p>
                        ) : expandedLoanDetail?.transactions?.length > 0 ? (
                          <div>
                            {/* Summary Stats */}
                            {(() => {
                              const txs = expandedLoanDetail.transactions;
                              const totalAdded = txs
                                .filter((t: any) => t.transaction_type === 'LEND' || t.transaction_type === 'BORROW')
                                .reduce((s: number, t: any) => s + toNum(t.amount), 0);
                              const totalRepaid = txs
                                .filter((t: any) => t.transaction_type === 'LEND_REPAYMENT' || t.transaction_type === 'BORROW_REPAYMENT')
                                .reduce((s: number, t: any) => s + toNum(t.amount), 0);
                              const net = totalAdded - totalRepaid;
                              return (
                                <div className="grid grid-cols-3 gap-2 mb-3 pb-3 border-b border-slate-200/60 dark:border-slate-700/60">
                                  <div className="text-center">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Added</p>
                                    <p className="text-sm font-extrabold font-mono text-emerald-600 dark:text-emerald-400">{formatCurrency(totalAdded)}</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Repaid</p>
                                    <p className="text-sm font-extrabold font-mono text-rose-600 dark:text-rose-400">{formatCurrency(totalRepaid)}</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Net Outstanding</p>
                                    <p className={`text-sm font-extrabold font-mono ${net >= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{formatCurrency(net)}</p>
                                  </div>
                                </div>
                              );
                            })()}                            {/* Balance Trend Mini-Chart */}
                            {expandedLoanDetail.transactions.length > 1 && (
                              <div className="mb-3">
                                {(() => {
                                  let r = 0;
                                  const chartData = expandedLoanDetail.transactions.map((tx: any) => {
                                    const isA = tx.transaction_type === 'LEND' || tx.transaction_type === 'BORROW';
                                    r += isA ? toNum(tx.amount) : -toNum(tx.amount);
                                    return {
                                      date: tx.transaction_date,
                                      balance: Math.max(r, 0),
                                    };
                                  });
                                  return (
                                    <div className="h-28 w-full">
                                      <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                                          <defs>
                                            <linearGradient id="loanBalGrad" x1="0" y1="0" x2="0" y2="1">
                                              <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                                              <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
                                            </linearGradient>
                                          </defs>
                                          <XAxis
                                            dataKey="date"
                                            tick={{ fontSize: 8, fill: isDark ? '#64748b' : '#94a3b8' }}
                                            axisLine={false}
                                            tickLine={false}
                                          />
                                          <YAxis hide domain={[0, 'auto']} />
                                          <Tooltip
                                            formatter={(v: number) => [formatCurrency(v), 'Outstanding']}
                                            labelFormatter={(l: string) => formatDateDMY(l)}
                                            contentStyle={{
                                              fontSize: 10,
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
                                            fill="url(#loanBalGrad)"
                                            dot={{ r: 3, fill: '#f59e0b', stroke: '#fff', strokeWidth: 1.5 }}
                                            activeDot={{ r: 4, fill: '#f59e0b' }}
                                          />
                                        </AreaChart>
                                      </ResponsiveContainer>
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                            {/* Timeline with Running Balance */}
                            <div className="space-y-0">
                              {(() => {
                                let running = 0;
                                return expandedLoanDetail.transactions.map((tx: any, i: number) => {
                                  const isAdd = tx.transaction_type === 'LEND' || tx.transaction_type === 'BORROW';
                                  running += isAdd ? toNum(tx.amount) : -toNum(tx.amount);
                                  return (
                                    <div key={tx.id} className="flex gap-3 relative">
                                      {/* Vertical line */}
                                      {i < expandedLoanDetail.transactions.length - 1 && (
                                        <div className="absolute left-[7px] top-5 w-px h-full bg-slate-200 dark:bg-slate-700" />
                                      )}
                                      {/* Dot */}
                                      <div className={`relative z-10 w-[15px] h-[15px] rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center ${
                                        isAdd ? 'bg-emerald-100 dark:bg-emerald-950/60' : 'bg-rose-100 dark:bg-rose-950/60'
                                      }`}>
                                        <div className={`w-2 h-2 rounded-full ${
                                          isAdd ? 'bg-emerald-500' : 'bg-rose-500'
                                        }`} />
                                      </div>
                                      {/* Content */}
                                      <div className="flex-1 pb-3 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                            {formatDateDMY(tx.transaction_date)}
                                          </span>
                                          <span className={`text-[10px] font-extrabold font-mono ${
                                            isAdd ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                          }`}>
                                            {isAdd ? '+' : '-'}{formatCurrency(toNum(tx.amount))}
                                          </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-2">
                                          <p className="text-[10px] text-slate-600 dark:text-slate-300 font-medium truncate">
                                            {tx.description || tx.transaction_type.replace(/_/g, ' ').toLowerCase()}
                                          </p>
                                          <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded ${
                                            running >= 0
                                              ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400'
                                              : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'
                                          }`}>
                                            bal: {formatCurrency(running)}
                                          </span>
                                        </div>
                                        {tx.account_name && (
                                          <p className="text-[9px] text-slate-400">via {tx.account_name}</p>
                                        )}
                                      </div>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-400 text-center py-2">No transactions recorded yet</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => openRepay(loan)}
                      className="btn-primary flex-1 text-xs py-2 font-semibold shadow-sm shadow-brand-500/20"
                    >
                      Record Payment
                    </button>
                    <button
                      onClick={() => openAddFunds(loan)}
                      className="flex-1 text-xs py-2 font-semibold rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/60 transition-all flex items-center justify-center gap-1.5"
                      title="Add more funds to this loan"
                    >
                      <CircleDollarSign size={14} />
                      Add More
                    </button>
                    <button
                      onClick={() => handleOpenVoucher(loan)}
                      className="btn-secondary text-xs p-2"
                      title="View Loan Voucher & Statement"
                    >
                      <FileText size={16} />
                    </button>
                    <button
                      onClick={() => setDeletingLoanId(loan.id)}
                      className="text-xs p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 transition-all"
                      title="Delete Loan"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Other Completed Loans Table */}
      {otherLoans.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Completed & Settled Loans
            </h2>
          </div>

          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800">
                    <th className="p-4">Contact</th>
                    <th className="p-4">Direction</th>
                    <th className="p-4">Principal Amount</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                  {otherLoans.map((loan: Loan) => (
                    <tr key={loan.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                      <td className="p-4 font-bold text-slate-900 dark:text-slate-100">{loan.person_name || 'Unknown'}</td>
                      <td className="p-4 text-slate-500 dark:text-slate-400 font-medium">{loan.direction}</td>
                      <td className="p-4 font-bold text-slate-900 dark:text-slate-100">{formatCurrency(toNum(loan.principal_amount))}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <span className="badge badge-success text-[10px]">
                            {loan.status}
                          </span>
                          {loan.source === 'AUTO' ? (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 flex items-center gap-0.5">
                              <Zap size={9} /> Auto
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 flex items-center gap-0.5">
                              <PenLine size={9} /> Manual
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setDeletingLoanId(loan.id)}
                          className="text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 transition-colors p-1"
                          title="Delete Loan"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {loans && loans.length === 0 && (
        <EmptyState
          title="No active loan agreements"
          description="Log debt principal amounts and repayment timelines to track personal credit."
          action={
            <button onClick={() => setShowCreateForm(true)} className="btn-primary text-xs font-semibold px-4 py-2">
              <Plus size={15} /> Add First Loan
            </button>
          }
        />
      )}

      {/* Modal: New Loan */}
      <Modal
        isOpen={showCreateForm}
        onClose={() => { setShowCreateForm(false); resetCreateForm(); }}
        title="Record New Loan Agreement"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Loan Type / Direction</label>
            <select
              className="input text-xs font-semibold"
              value={direction}
              onChange={(e) => setDirection(e.target.value as any)}
            >
              <option value="LENT">I lent money to someone (Receivable)</option>
              <option value="BORROWED">I borrowed money from someone (Payable)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Contact / Person</label>
              <select
                className="input"
                value={personId}
                onChange={(e) => setPersonId(e.target.value)}
                required
              >
                <option value="">Select person</option>
                {people?.map((p: Person) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Source / Settlement Account</label>
              <select
                className="input"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Principal Amount (৳)</label>
              <input
                type="number"
                className="input font-mono font-bold"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Fixed Interest Fee (৳)</label>
              <input
                type="number"
                className="input font-mono"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={interest}
                onChange={(e) => setInterest(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Start Date</label>
              <input
                type="date"
                className="input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Due Date (Optional)</label>
              <input
                type="date"
                className="input"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label">Description / Purpose</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Emergency medical assistance loan"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {personId && (
            <div className="p-3 rounded-xl bg-brand-50/60 dark:bg-brand-950/40 border border-brand-200/60 dark:border-brand-900/60">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={loanSendReceipt}
                  onChange={(e) => setLoanSendReceipt(e.target.checked)}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-xs font-bold text-brand-900 dark:text-brand-200 flex items-center gap-1.5">
                    <Mail size={14} /> Email Loan Agreement Receipt
                  </p>
                  <p className="text-[11px] text-brand-700 dark:text-brand-300 mt-0.5">
                    Dispatch an official PDF summary of terms to contact email.
                  </p>
                </div>
              </label>
            </div>
          )}

          <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <button
              type="button"
              className="btn-secondary flex-1 text-xs"
              onClick={() => { setShowCreateForm(false); resetCreateForm(); }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1 text-xs shadow-md shadow-brand-500/20"
              disabled={createMutation.isPending}
            >
              Create Loan Position
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Record Repayment */}
      <Modal
        isOpen={showRepayForm}
        onClose={() => { setShowRepayForm(false); resetRepayForm(); }}
        title="Record Loan Repayment"
      >
        {selectedLoan && (
          <form onSubmit={handleRepay} className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 text-xs space-y-1">
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                {selectedLoan.direction === 'LENT' ? 'Repayment from' : 'Repayment to'}:{' '}
                <span className="font-normal">{selectedLoan.person_name || 'Contact'}</span>
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                Current Remaining Balance: <strong className="text-amber-600 dark:text-amber-400">{formatCurrency(selectedLoan.remaining_amount)}</strong>
              </p>
            </div>

            <div>
              <label className="label">Repayment Amount (৳)</label>
              <input
                type="number"
                className="input font-mono font-bold text-base"
                step="0.01"
                min="0.01"
                max={selectedLoan.remaining_amount}
                value={repayAmount}
                onChange={(e) => setRepayAmount(e.target.value)}
                required
              />
              {/* Quick Select Buttons */}
              <div className="flex gap-1.5 mt-2">
                {([
                  { label: '25%', fraction: 0.25 },
                  { label: '50%', fraction: 0.5 },
                  { label: '75%', fraction: 0.75 },
                  { label: 'Full', fraction: 1 },
                ]).map(({ label, fraction }) => {
                  const amt = Math.round(toNum(selectedLoan.remaining_amount) * fraction * 100) / 100;
                  const isActive = parseFloat(repayAmount) === amt;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setRepayAmount(String(amt))}
                      className={`flex-1 text-[10px] font-bold py-1.5 rounded-lg border transition-all ${
                        isActive
                          ? 'bg-brand-600 dark:bg-brand-500 text-white border-brand-600 dark:border-brand-500'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-brand-400'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5">
                Remaining: {formatCurrency(toNum(selectedLoan.remaining_amount))} — enter any amount for partial repayment
              </p>
            </div>

            <div>
              <label className="label">Settlement Account</label>
              <select
                className="input"
                value={repayAccountId}
                onChange={(e) => setRepayAccountId(e.target.value)}
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

            <div>
              <label className="label">Payment Date</label>
              <input
                type="date"
                className="input"
                value={repayDate}
                onChange={(e) => setRepayDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">Notes / Remarks</label>
              <input
                type="text"
                className="input"
                placeholder="Optional payment reference..."
                value={repayNotes}
                onChange={(e) => setRepayNotes(e.target.value)}
              />
            </div>

            <div className="p-3 rounded-xl bg-brand-50/60 dark:bg-brand-950/40 border border-brand-200/60 dark:border-brand-900/60">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={repaySendReceipt}
                  onChange={(e) => setRepaySendReceipt(e.target.checked)}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-xs font-bold text-brand-900 dark:text-brand-200 flex items-center gap-1.5">
                    <Mail size={14} /> Send Email Repayment Voucher
                  </p>
                  <p className="text-[11px] text-brand-700 dark:text-brand-300 mt-0.5">
                    Email an official PDF payment receipt to the contact.
                  </p>
                </div>
              </label>
            </div>

            <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/80">
              <button
                type="button"
                className="btn-secondary flex-1 text-xs"
                onClick={() => { setShowRepayForm(false); resetRepayForm(); }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary flex-1 text-xs shadow-md shadow-brand-500/20"
                disabled={repayMutation.isPending}
              >
                Log Repayment
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal: Add More Funds */}
      <Modal
        isOpen={showAddFundsForm}
        onClose={() => { setShowAddFundsForm(false); resetAddFundsForm(); }}
        title="Add More Funds to Loan"
      >
        {selectedLoan && (
          <form onSubmit={handleAddFunds} className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 text-xs space-y-1">
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                {selectedLoan.direction === 'LENT' ? 'Lending more to' : 'Borrowing more from'}{' '}
                <span className="font-normal">{selectedLoan.person_name || 'Contact'}</span>
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                Current Principal: <strong className="text-slate-700 dark:text-slate-300">{formatCurrency(toNum(selectedLoan.principal_amount))}</strong>
              </p>
            </div>

            <div>
              <label className="label">Additional Amount (৳)</label>
              <input
                type="number"
                className="input font-mono font-bold text-base"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={addFundsAmount}
                onChange={(e) => setAddFundsAmount(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">From Account</label>
              <select
                className="input"
                value={addFundsAccountId}
                onChange={(e) => setAddFundsAccountId(e.target.value)}
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

            <div>
              <label className="label">Date</label>
              <input
                type="date"
                className="input"
                value={addFundsDate}
                onChange={(e) => setAddFundsDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">Description (Optional)</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Additional emergency funds"
                value={addFundsDescription}
                onChange={(e) => setAddFundsDescription(e.target.value)}
              />
            </div>

            <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/60 text-xs text-emerald-700 dark:text-emerald-300">
              This will increase the loan principal and create a matching transaction entry.
            </div>

            <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/80">
              <button
                type="button"
                className="btn-secondary flex-1 text-xs"
                onClick={() => { setShowAddFundsForm(false); resetAddFundsForm(); }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 text-xs py-2.5 font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20 transition-all"
                disabled={addFundsMutation.isPending}
              >
                {addFundsMutation.isPending ? 'Adding...' : 'Add Funds'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Fix Orphaned Modal */}
      <Modal
        isOpen={showFixForm}
        onClose={() => { setShowFixForm(false); setFixAccountId(''); }}
        title="Synchronize Legacy Loans"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200">
            Select the primary account to link for missing ledger transactions.
          </div>

          <div>
            <label className="label">Funding Account</label>
            <select
              className="input"
              value={fixAccountId}
              onChange={(e) => setFixAccountId(e.target.value)}
            >
              <option value="">Select funding account...</option>
              {accounts?.map((a: Account) => (
                <option key={a.account_id} value={a.account_id}>
                  {a.account_name} ({formatCurrency(a.current_balance)})
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => {
                if (!fixAccountId) {
                  toast.error('Please select an account');
                  return;
                }
                fixOrphanedMutation.mutate({ account_id: fixAccountId });
              }}
              className="btn-primary flex-1 text-xs"
              disabled={fixOrphanedMutation.isPending}
            >
              {fixOrphanedMutation.isPending ? 'Syncing...' : 'Sync Loans'}
            </button>
            <button
              type="button"
              className="btn-secondary text-xs"
              onClick={() => { setShowFixForm(false); setFixAccountId(''); }}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Printable Voucher, Invoice & Receipt Report Modal */}
      <VoucherModal
        isOpen={isVoucherModalOpen}
        onClose={() => setIsVoucherModalOpen(false)}
        data={voucherReportData}
      />

      {/* Delete Loan Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingLoanId}
        onClose={() => { setDeletingLoanId(null); deleteMutation.reset(); }}
        onConfirm={() => {
          if (deletingLoanId) {
            deleteMutation.mutate(deletingLoanId);
          }
        }}
        title="Delete Loan Agreement"
        message={deleteMutation.isError
          ? (deleteMutation.error as any)?.response?.data?.error?.message || 'Cannot delete this loan. It may have existing repayments or linked transactions.'
          : 'Are you sure you want to delete this loan? This will also remove all associated repayment transactions and cannot be undone.'
        }
        confirmText="Delete Loan"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
