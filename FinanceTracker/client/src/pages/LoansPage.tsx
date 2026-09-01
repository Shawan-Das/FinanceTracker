import { useState, useMemo } from 'react';
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
import {
  Plus,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  FileText,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Mail,
  Trash2,
  Zap,
  PenLine,
  CircleDollarSign,
  Clock,
  Search,
  SlidersHorizontal,
  Wallet,
  Scale,
  Percent,
  Eye,
  X,
  CreditCard,
} from 'lucide-react';
import type { Loan, Person, Account } from '../types';
import { formatDateDMY } from '../utils/format';

const toNum = (v: any): number => (typeof v === 'number' ? v : parseFloat(v) || 0);

const formatCurrency = (amount: number) =>
  `৳${amount.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

function getInitials(name: string | null | undefined): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getDueDateStatus(dueDateStr: string | null | undefined): { label: string; isOverdue: boolean; isSoon: boolean } | null {
  if (!dueDateStr) return null;
  const target = new Date(dueDateStr);
  if (isNaN(target.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const days = Math.abs(diffDays);
    return {
      label: `${days}d overdue`,
      isOverdue: true,
      isSoon: false,
    };
  } else if (diffDays === 0) {
    return {
      label: 'Due today',
      isOverdue: false,
      isSoon: true,
    };
  } else if (diffDays <= 7) {
    return {
      label: `Due in ${diffDays}d`,
      isOverdue: false,
      isSoon: true,
    };
  } else {
    return {
      label: `Due in ${diffDays}d`,
      isOverdue: false,
      isSoon: false,
    };
  }
}

type LoanTab = 'active' | 'lent' | 'borrowed' | 'overdue' | 'settled';

export default function LoansPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // Filters & State
  const [activeTab, setActiveTab] = useState<LoanTab>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'remaining' | 'due_date' | 'start_date' | 'progress'>('remaining');

  // Modals state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showRepayForm, setShowRepayForm] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [detailsLoan, setDetailsLoan] = useState<Loan | null>(null);
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
  const [showAddFundsForm, setShowAddFundsForm] = useState(false);
  const [addFundsAmount, setAddFundsAmount] = useState('');
  const [addFundsAccountId, setAddFundsAccountId] = useState('');
  const [addFundsDate, setAddFundsDate] = useState(new Date().toISOString().split('T')[0]);
  const [addFundsDescription, setAddFundsDescription] = useState('');

  // Repay form
  const [repayAmount, setRepayAmount] = useState('');
  const [repayDate, setRepayDate] = useState(new Date().toISOString().split('T')[0]);
  const [repayAccountId, setRepayAccountId] = useState('');
  const [repayNotes, setRepayNotes] = useState('');
  const [repaySendReceipt, setRepaySendReceipt] = useState(false);

  // Fix orphaned loans
  const [showFixForm, setShowFixForm] = useState(false);
  const [fixAccountId, setFixAccountId] = useState('');

  // Details Modal query
  const { data: detailsData, isLoading: detailsLoading } = useQuery({
    queryKey: ['loans', detailsLoan?.id],
    queryFn: () => loansApi.get(detailsLoan!.id).then((r) => r.data.data),
    enabled: !!detailsLoan?.id,
  });

  // Data fetching
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

  // Mutations
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
      toast.success('Loan agreement deleted successfully!');
      setDeletingLoanId(null);
      if (detailsLoan) setDetailsLoan(null);
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

  // Form Reset Handlers
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
      description:
        loan.description ||
        (loan.direction === 'LENT'
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

  // Executive Metrics Calculations
  const metrics = useMemo(() => {
    if (!loans) {
      return {
        totalLentPrincipal: 0,
        totalLentRepaid: 0,
        outstandingLent: 0,
        lentRecoveryRate: 0,
        totalBorrowedPrincipal: 0,
        totalBorrowedRepaid: 0,
        outstandingBorrowed: 0,
        borrowedPayRate: 0,
        netPosition: 0,
        activeCount: 0,
        overdueCount: 0,
        settledCount: 0,
      };
    }

    const lentList = loans.filter((l: Loan) => l.direction === 'LENT');
    const borrowedList = loans.filter((l: Loan) => l.direction === 'BORROWED');

    const totalLentPrincipal = lentList.reduce(
      (s: number, l: Loan) => s + toNum(l.principal_amount) + toNum(l.interest_amount),
      0
    );
    const totalLentRepaid = lentList.reduce((s: number, l: Loan) => s + toNum(l.total_repaid), 0);
    const outstandingLent = lentList
      .filter((l: Loan) => l.status !== 'PAID')
      .reduce((s: number, l: Loan) => s + toNum(l.remaining_amount), 0);
    const lentRecoveryRate = totalLentPrincipal > 0 ? (totalLentRepaid / totalLentPrincipal) * 100 : 0;

    const totalBorrowedPrincipal = borrowedList.reduce(
      (s: number, l: Loan) => s + toNum(l.principal_amount) + toNum(l.interest_amount),
      0
    );
    const totalBorrowedRepaid = borrowedList.reduce((s: number, l: Loan) => s + toNum(l.total_repaid), 0);
    const outstandingBorrowed = borrowedList
      .filter((l: Loan) => l.status !== 'PAID')
      .reduce((s: number, l: Loan) => s + toNum(l.remaining_amount), 0);
    const borrowedPayRate =
      totalBorrowedPrincipal > 0 ? (totalBorrowedRepaid / totalBorrowedPrincipal) * 100 : 0;

    const netPosition = outstandingLent - outstandingBorrowed;
    const activeCount = loans.filter((l: Loan) => l.status === 'ACTIVE' || l.status === 'OVERDUE').length;
    const overdueCount = loans.filter(
      (l: Loan) =>
        l.status === 'OVERDUE' ||
        (l.status === 'ACTIVE' && l.due_date && new Date(l.due_date).getTime() < new Date().setHours(0, 0, 0, 0))
    ).length;
    const settledCount = loans.filter((l: Loan) => l.status === 'PAID').length;

    return {
      totalLentPrincipal,
      totalLentRepaid,
      outstandingLent,
      lentRecoveryRate,
      totalBorrowedPrincipal,
      totalBorrowedRepaid,
      outstandingBorrowed,
      borrowedPayRate,
      netPosition,
      activeCount,
      overdueCount,
      settledCount,
    };
  }, [loans]);

  // Tab Filtering & Sorting
  const filteredLoans = useMemo(() => {
    if (!loans) return [];

    let list = loans.filter((l: Loan) => {
      // Tab filter
      if (activeTab === 'active') {
        if (l.status === 'PAID') return false;
      } else if (activeTab === 'lent') {
        if (l.direction !== 'LENT' || l.status === 'PAID') return false;
      } else if (activeTab === 'borrowed') {
        if (l.direction !== 'BORROWED' || l.status === 'PAID') return false;
      } else if (activeTab === 'overdue') {
        const isOverdue =
          l.status === 'OVERDUE' ||
          (l.status === 'ACTIVE' && l.due_date && new Date(l.due_date).getTime() < new Date().setHours(0, 0, 0, 0));
        if (!isOverdue || l.status === 'PAID') return false;
      } else if (activeTab === 'settled') {
        if (l.status !== 'PAID') return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (l.person_name || '').toLowerCase();
        const desc = (l.description || '').toLowerCase();
        const amt = String(l.principal_amount);
        const rem = String(l.remaining_amount);
        if (!name.includes(q) && !desc.includes(q) && !amt.includes(q) && !rem.includes(q)) {
          return false;
        }
      }

      return true;
    });

    // Sorting
    list = [...list].sort((a: Loan, b: Loan) => {
      if (sortBy === 'remaining') {
        return toNum(b.remaining_amount) - toNum(a.remaining_amount);
      }
      if (sortBy === 'due_date') {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      if (sortBy === 'start_date') {
        return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
      }
      if (sortBy === 'progress') {
        const aTot = toNum(a.principal_amount) + toNum(a.interest_amount);
        const bTot = toNum(b.principal_amount) + toNum(b.interest_amount);
        const aProg = aTot > 0 ? toNum(a.total_repaid) / aTot : 0;
        const bProg = bTot > 0 ? toNum(b.total_repaid) / bTot : 0;
        return bProg - aProg;
      }
      return 0;
    });

    return list;
  }, [loans, activeTab, searchQuery, sortBy]);

  if (isLoading) return <LoadingSpinner message="Loading loan portfolio & amortization schedules..." />;
  if (loansError) return <QueryError title="Failed to load loans" onRetry={() => refetchLoans()} />;

  return (
    <div className="space-y-6">
      {/* ─── Header & Actions ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Loan Portfolio &amp; Debt Tracking
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Track money lent out, borrowed liabilities, running balances, and repayment schedules.
          </p>
        </div>

        <button
          onClick={() => {
            resetCreateForm();
            setShowCreateForm(true);
          }}
          className="btn-primary text-xs font-semibold px-4 py-2.5 shadow-md shadow-brand-500/20 flex items-center gap-2"
        >
          <Plus size={16} />
          <span>New Loan Agreement</span>
        </button>
      </div>

      {/* ─── Executive KPI Stat Cards (4 Cards) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Receivables (Lent Out) */}
        <div className="stat-card relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-100/70 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <ArrowUpRight size={18} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Money Lent (Receivables)
                </span>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  {metrics.lentRecoveryRate.toFixed(0)}% recovered
                </span>
              </div>
            </div>
          </div>
          <p className="text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
            {formatCurrency(metrics.outstandingLent)}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <span>Given: {formatCurrency(metrics.totalLentPrincipal)}</span>
            <span>Repaid: {formatCurrency(metrics.totalLentRepaid)}</span>
          </div>
        </div>

        {/* Total Payables (Borrowed In) */}
        <div className="stat-card relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-100/70 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                <ArrowDownRight size={18} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Money Borrowed (Payables)
                </span>
                <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                  {metrics.borrowedPayRate.toFixed(0)}% settled
                </span>
              </div>
            </div>
          </div>
          <p className="text-2xl font-extrabold font-mono text-rose-600 dark:text-rose-400 tracking-tight">
            {formatCurrency(metrics.outstandingBorrowed)}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <span>Taken: {formatCurrency(metrics.totalBorrowedPrincipal)}</span>
            <span>Repaid: {formatCurrency(metrics.totalBorrowedRepaid)}</span>
          </div>
        </div>

        {/* Net Credit Position */}
        <div className="stat-card relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                  metrics.netPosition >= 0
                    ? 'bg-brand-100/70 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400'
                    : 'bg-amber-100/70 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                }`}
              >
                <Scale size={18} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Net Lending Position
                </span>
                <span
                  className={`text-[10px] font-semibold ${
                    metrics.netPosition >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {metrics.netPosition >= 0 ? 'Net Creditor (Surplus)' : 'Net Debtor (Deficit)'}
                </span>
              </div>
            </div>
          </div>
          <p
            className={`text-2xl font-extrabold font-mono tracking-tight ${
              metrics.netPosition >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {metrics.netPosition >= 0 ? '+' : ''}
            {formatCurrency(metrics.netPosition)}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <span>Receivables − Payables</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {metrics.netPosition >= 0 ? 'Surplus' : 'Deficit'}
            </span>
          </div>
        </div>

        {/* Portfolio Status & Health */}
        <div className="stat-card relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                  metrics.overdueCount > 0
                    ? 'bg-rose-100/80 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 animate-pulse'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {metrics.overdueCount > 0 ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Agreements Health
                </span>
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                  {metrics.activeCount} Ongoing · {metrics.settledCount} Settled
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              {metrics.activeCount}
            </p>
            <span className="text-xs text-slate-400 font-medium">active agreements</span>
          </div>
          <div className="flex items-center justify-between text-[11px] mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            {metrics.overdueCount > 0 ? (
              <span className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <AlertTriangle size={12} /> {metrics.overdueCount} Overdue Attention
              </span>
            ) : (
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 size={12} /> All payments on schedule
              </span>
            )}
            <span className="text-slate-400 font-mono text-[10px]">{metrics.settledCount} paid</span>
          </div>
        </div>
      </div>

      {/* ─── Legacy Loan Synchronization Notice ─── */}
      {orphanedData && orphanedData.count > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 shadow-sm animate-in fade-in">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
              <Wrench size={18} />
            </div>
            <div className="flex-1">
              <h3 className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                {orphanedData.count} Legacy Loan Agreement(s) Require Ledger Sync
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 leading-relaxed">
                These loans were recorded prior to automatic cash flow synchronizing. Map them to a funding account so
                they accurately reflect in your ledger and account balances.
              </p>
              <button
                onClick={() => {
                  setFixAccountId('');
                  setShowFixForm(true);
                }}
                className="mt-3 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Wrench size={13} />
                <span>Sync {orphanedData.count} Loan Record(s)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Interactive Tab Bar, Search, and Sort Controls ─── */}
      <div className="card p-3.5 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Tab Navigation Pills */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
            <button
              onClick={() => setActiveTab('active')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'active'
                  ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span>All Active</span>
              <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700">
                {metrics.activeCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('lent')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'lent'
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400'
              }`}
            >
              <ArrowUpRight size={13} className="text-emerald-500" />
              <span>Money Lent</span>
            </button>

            <button
              onClick={() => setActiveTab('borrowed')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'borrowed'
                  ? 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400'
              }`}
            >
              <ArrowDownRight size={13} className="text-rose-500" />
              <span>Money Borrowed</span>
            </button>

            <button
              onClick={() => setActiveTab('overdue')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'overdue'
                  ? 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400'
              }`}
            >
              <AlertTriangle size={13} className={metrics.overdueCount > 0 ? 'text-rose-500' : 'text-slate-400'} />
              <span>Overdue</span>
              {metrics.overdueCount > 0 && (
                <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-300">
                  {metrics.overdueCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('settled')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'settled'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <CheckCircle2 size={13} className="text-emerald-500" />
              <span>Settled / Paid</span>
              <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700">
                {metrics.settledCount}
              </span>
            </button>
          </div>

          {/* Search Bar & Sorting */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search contact, note, or amount..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-8.5 py-1.5 text-xs w-full"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <SlidersHorizontal size={14} className="text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="input py-1.5 px-2.5 text-xs font-semibold"
              >
                <option value="remaining">Highest Balance First</option>
                <option value="due_date">Due Date (Urgent First)</option>
                <option value="start_date">Newest Agreement</option>
                <option value="progress">Highest Progress %</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Compact, Optimized Active Loans Grid ─── */}
      {activeTab !== 'settled' && (
        <div className="space-y-4">
          {filteredLoans.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredLoans.map((loan: Loan) => {
                const principal = toNum(loan.principal_amount);
                const interest = toNum(loan.interest_amount);
                const repaid = toNum(loan.total_repaid);
                const remaining = toNum(loan.remaining_amount);
                const totalDue = principal + interest;
                const progress = totalDue > 0 ? (repaid / totalDue) * 100 : 0;
                const isLent = loan.direction === 'LENT';
                const dueStatus = getDueDateStatus(loan.due_date);
                const isOverdue = loan.status === 'OVERDUE' || (dueStatus?.isOverdue ?? false);

                return (
                  <div
                    key={loan.id}
                    className={`card p-4 hover:shadow-md transition-all flex flex-col justify-between border ${
                      isOverdue
                        ? 'border-rose-300/90 dark:border-rose-900/60 shadow-sm shadow-rose-500/5 bg-rose-50/20 dark:bg-rose-950/10'
                        : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Compact Header: Avatar + Contact Name + Direction Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0 ${
                              isLent
                                ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/40'
                                : 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/40'
                            }`}
                          >
                            {getInitials(loan.person_name)}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                              {loan.person_name || 'Unnamed Contact'}
                            </h3>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span
                                className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded flex items-center gap-0.5 ${
                                  isLent
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'
                                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300'
                                }`}
                              >
                                {isLent ? 'Lent' : 'Borrowed'}
                              </span>

                              {isOverdue && (
                                <span className="text-[9px] font-bold uppercase px-1 py-0.2 rounded bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-300 flex items-center gap-0.5">
                                  <AlertTriangle size={8} /> Overdue
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Details popup button (Eye icon) on top corner */}
                        <button
                          onClick={() => setDetailsLoan(loan)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0"
                          title="View Full Loan Details & Timeline"
                        >
                          <Eye size={15} />
                        </button>
                      </div>

                      {/* Hero Remaining Outstanding Balance */}
                      <div className="p-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80">
                        <div className="flex items-baseline justify-between">
                          <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                            Remaining
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 font-mono">
                            of {formatCurrency(totalDue)}
                          </span>
                        </div>
                        <p
                          className={`text-xl font-extrabold font-mono tracking-tight mt-0.5 ${
                            isLent ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {formatCurrency(remaining)}
                        </p>

                        {/* Thin Progress Bar */}
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-[9px] text-slate-400 font-semibold mb-1">
                            <span>Repaid {formatCurrency(repaid)}</span>
                            <span className="font-mono">{progress.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-slate-200/70 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full transition-all duration-500 ${
                                isLent ? 'bg-emerald-500' : 'bg-brand-500'
                              }`}
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Single-line Metadata: Date / Due / Memo */}
                      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1">
                        <span className="flex items-center gap-1 truncate">
                          <Calendar size={11} className="text-slate-400 flex-shrink-0" />
                          {formatDateDMY(loan.start_date)}
                        </span>

                        {dueStatus && (
                          <span
                            className={`font-semibold px-1.5 py-0.5 rounded text-[9px] flex-shrink-0 ${
                              dueStatus.isOverdue
                                ? 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-300'
                                : dueStatus.isSoon
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {dueStatus.label}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Compact Action Toolbar */}
                    <div className="flex items-center gap-1.5 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80">
                      <button
                        onClick={() => openRepay(loan)}
                        className="btn-primary flex-1 text-xs py-1.5 font-bold shadow-sm shadow-brand-500/20 flex items-center justify-center gap-1"
                      >
                        <Wallet size={12} />
                        <span>Pay</span>
                      </button>

                      <button
                        onClick={() => openAddFunds(loan)}
                        className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/70 border border-emerald-200/60 dark:border-emerald-900/60 transition-colors flex-shrink-0"
                        title="Add more funds / capital to this loan"
                      >
                        <CircleDollarSign size={14} />
                      </button>

                      <button
                        onClick={() => handleOpenVoucher(loan)}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex-shrink-0"
                        title="View Statement & Voucher"
                      >
                        <FileText size={14} />
                      </button>

                      <button
                        onClick={() => setDeletingLoanId(loan.id)}
                        className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/70 border border-rose-200/60 dark:border-rose-900/60 transition-colors flex-shrink-0"
                        title="Delete Loan Record"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title={searchQuery ? 'No matching loan records' : 'No active loans in this view'}
              description={
                searchQuery
                  ? 'Try adjusting your search query or sorting filters.'
                  : 'Start recording personal lending, borrowings, and credit agreements.'
              }
              action={
                <button
                  onClick={() => {
                    resetCreateForm();
                    setShowCreateForm(true);
                  }}
                  className="btn-primary text-xs font-semibold px-4 py-2"
                >
                  <Plus size={15} /> Create Loan Agreement
                </button>
              }
            />
          )}
        </div>
      )}

      {/* ─── Settled / Completed Loans Table View ─── */}
      {activeTab === 'settled' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Completed &amp; Settled Agreements ({filteredLoans.length})
            </h2>
          </div>

          {filteredLoans.length > 0 ? (
            <div className="card p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800">
                      <th className="p-4">Counterparty</th>
                      <th className="p-4">Direction</th>
                      <th className="p-4 text-right">Settled Principal</th>
                      <th className="p-4 text-right">Total Repaid</th>
                      <th className="p-4">Agreement Date</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                    {filteredLoans.map((loan: Loan) => {
                      const isLent = loan.direction === 'LENT';
                      return (
                        <tr
                          key={loan.id}
                          className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors"
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-300">
                                {getInitials(loan.person_name)}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 dark:text-slate-100">
                                  {loan.person_name || 'Unknown Contact'}
                                </p>
                                {loan.description && (
                                  <p className="text-[10px] text-slate-400 truncate max-w-[200px]">
                                    {loan.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span
                              className={`badge text-[10px] ${
                                isLent ? 'badge-success' : 'badge-brand'
                              }`}
                            >
                              {isLent ? 'Lent (Receivable)' : 'Borrowed (Payable)'}
                            </span>
                          </td>
                          <td className="p-4 text-right font-bold font-mono text-slate-900 dark:text-slate-100">
                            {formatCurrency(toNum(loan.principal_amount))}
                          </td>
                          <td className="p-4 text-right font-bold font-mono text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(toNum(loan.total_repaid))}
                          </td>
                          <td className="p-4 text-slate-500 font-medium whitespace-nowrap">
                            {formatDateDMY(loan.start_date)}
                          </td>
                          <td className="p-4 text-center">
                            <span className="badge badge-success text-[10px] font-bold">PAID</span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setDetailsLoan(loan)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title="View Loan Statement Details"
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                onClick={() => handleOpenVoucher(loan)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title="View Voucher Statement"
                              >
                                <FileText size={14} />
                              </button>
                              <button
                                onClick={() => setDeletingLoanId(loan.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title="Delete Loan Record"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <EmptyState
              title="No settled loans found"
              description="Loans will automatically appear here once all outstanding balance is fully repaid."
            />
          )}
        </div>
      )}

      {/* ─── POPUP MODAL: Full Loan Details & Amortization Statement ─── */}
      <Modal
        isOpen={!!detailsLoan}
        onClose={() => setDetailsLoan(null)}
        title="Loan Agreement Details & Statement"
        maxWidth="max-w-2xl"
      >
        {detailsLoan && (
          <div className="space-y-5">
            {/* Header with Counterparty, Direction, and Badges */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm shadow-sm ${
                    detailsLoan.direction === 'LENT'
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                      : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  {getInitials(detailsLoan.person_name)}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                    {detailsLoan.person_name || 'Unknown Contact'}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span
                      className={`badge text-[10px] ${
                        detailsLoan.direction === 'LENT' ? 'badge-success' : 'badge-danger'
                      }`}
                    >
                      {detailsLoan.direction === 'LENT' ? 'Lent (Receivable)' : 'Borrowed (Payable)'}
                    </span>
                    <span className="badge badge-neutral text-[10px]">{detailsLoan.status}</span>
                    {detailsLoan.source === 'AUTO' && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 flex items-center gap-0.5">
                        <Zap size={9} /> Auto
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons inside Details Modal */}
              <div className="flex items-center gap-2">
                {detailsLoan.status !== 'PAID' && (
                  <button
                    onClick={() => {
                      const l = detailsLoan;
                      setDetailsLoan(null);
                      openRepay(l);
                    }}
                    className="btn-primary text-xs px-3 py-1.5 font-semibold flex items-center gap-1"
                  >
                    <Wallet size={13} />
                    <span>Record Payment</span>
                  </button>
                )}
                <button
                  onClick={() => handleOpenVoucher(detailsLoan)}
                  className="btn-secondary text-xs px-3 py-1.5 font-semibold flex items-center gap-1"
                >
                  <FileText size={13} />
                  <span>Voucher</span>
                </button>
              </div>
            </div>

            {/* Financial Overview 4 Grid */}
            {(() => {
              const p = toNum(detailsLoan.principal_amount);
              const i = toNum(detailsLoan.interest_amount);
              const r = toNum(detailsLoan.total_repaid);
              const rem = toNum(detailsLoan.remaining_amount);
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
                          detailsLoan.direction === 'LENT'
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
                  {formatDateDMY(detailsLoan.start_date)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Due Date</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
                  {detailsLoan.due_date ? formatDateDMY(detailsLoan.due_date) : 'No due date set'}
                </span>
              </div>
              {detailsLoan.description && (
                <div className="sm:col-span-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Notes / Purpose</span>
                  <p className="text-slate-600 dark:text-slate-300 mt-0.5">{detailsLoan.description}</p>
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
        )}
      </Modal>

      {/* ─── Modal: New Loan Agreement ─── */}
      <Modal
        isOpen={showCreateForm}
        onClose={() => {
          setShowCreateForm(false);
          resetCreateForm();
        }}
        title="Record New Loan Agreement"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {/* Direction Tabs */}
          <div>
            <label className="label">Loan Direction</label>
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDirection('LENT')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  direction === 'LENT'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <ArrowUpRight size={14} />
                <span>I Lent Money (Receivable)</span>
              </button>
              <button
                type="button"
                onClick={() => setDirection('BORROWED')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  direction === 'BORROWED'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <ArrowDownRight size={14} />
                <span>I Borrowed Money (Payable)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Counterparty / Person</label>
              <select
                className="input text-xs font-medium"
                value={personId}
                onChange={(e) => setPersonId(e.target.value)}
                required
              >
                <option value="">Select contact from directory...</option>
                {people?.map((p: Person) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.phone ? `(${p.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Funding / Settlement Account</label>
              <select
                className="input text-xs font-medium"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                required
              >
                <option value="">Select account...</option>
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
                className="input font-mono font-bold text-xs"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Interest / Markup (Optional ৳)</label>
              <input
                type="number"
                className="input font-mono text-xs"
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
              <label className="label">Agreement Start Date</label>
              <input
                type="date"
                className="input text-xs"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Expected Due Date (Optional)</label>
              <input
                type="date"
                className="input text-xs"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label">Description / Agreement Purpose (Optional)</label>
            <input
              type="text"
              className="input text-xs"
              placeholder="e.g. Business equipment purchase, Emergency loan..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {personId && (
            <div className="p-3.5 rounded-xl bg-brand-50/60 dark:bg-brand-950/40 border border-brand-200/70 dark:border-brand-900/60">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={loanSendReceipt}
                  onChange={(e) => setLoanSendReceipt(e.target.checked)}
                  className="mt-0.5 rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
                />
                <div>
                  <p className="text-xs font-bold text-brand-900 dark:text-brand-200 flex items-center gap-1.5">
                    <Mail size={13} className="text-brand-600 dark:text-brand-400" />
                    <span>Email Agreement PDF to Contact</span>
                  </p>
                  <p className="text-[11px] text-brand-700 dark:text-brand-300 mt-0.5">
                    Automatically send an official statement of loan terms to their registered email address.
                  </p>
                </div>
              </label>
            </div>
          )}

          <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <button
              type="button"
              className="btn-secondary flex-1 text-xs"
              onClick={() => {
                setShowCreateForm(false);
                resetCreateForm();
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1 text-xs shadow-md shadow-brand-500/20"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Loan Agreement'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── Modal: Record Repayment ─── */}
      <Modal
        isOpen={showRepayForm}
        onClose={() => {
          setShowRepayForm(false);
          resetRepayForm();
        }}
        title="Record Loan Repayment"
        maxWidth="max-w-md"
      >
        {selectedLoan && (
          <form onSubmit={handleRepay} className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Counterparty:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {selectedLoan.person_name || 'Unknown Contact'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Direction:</span>
                <span
                  className={`font-bold ${
                    selectedLoan.direction === 'LENT'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {selectedLoan.direction === 'LENT' ? 'Collecting from them' : 'Paying them back'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-slate-800">
                <span className="text-slate-500 font-semibold">Remaining Balance:</span>
                <span className="font-extrabold font-mono text-sm text-amber-600 dark:text-amber-400">
                  {formatCurrency(toNum(selectedLoan.remaining_amount))}
                </span>
              </div>
            </div>

            <div>
              <label className="label">Repayment Amount (৳)</label>
              <input
                type="number"
                className="input font-mono font-bold text-base"
                step="0.01"
                min="0.01"
                max={toNum(selectedLoan.remaining_amount)}
                value={repayAmount}
                onChange={(e) => setRepayAmount(e.target.value)}
                required
              />

              {/* Quick Amount Percentage Shortcuts */}
              <div className="flex gap-1.5 mt-2">
                {[
                  { label: '25%', fraction: 0.25 },
                  { label: '50%', fraction: 0.5 },
                  { label: '75%', fraction: 0.75 },
                  { label: '100% Full', fraction: 1 },
                ].map(({ label, fraction }) => {
                  const amt = Math.round(toNum(selectedLoan.remaining_amount) * fraction * 100) / 100;
                  const isActive = parseFloat(repayAmount) === amt;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setRepayAmount(String(amt))}
                      className={`flex-1 text-[10px] font-bold py-1.5 rounded-lg border transition-all cursor-pointer ${
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

              {/* Balance Preview */}
              {repayAmount && (
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                  <span>Balance after payment:</span>
                  <span className="font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(
                      Math.max(0, toNum(selectedLoan.remaining_amount) - (parseFloat(repayAmount) || 0))
                    )}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="label">Settlement Account</label>
              <select
                className="input text-xs font-medium"
                value={repayAccountId}
                onChange={(e) => setRepayAccountId(e.target.value)}
                required
              >
                <option value="">Select funding account...</option>
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
                className="input text-xs"
                value={repayDate}
                onChange={(e) => setRepayDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">Notes / Remarks (Optional)</label>
              <input
                type="text"
                className="input text-xs"
                placeholder="e.g. Month 1 installment, Bank transfer ref..."
                value={repayNotes}
                onChange={(e) => setRepayNotes(e.target.value)}
              />
            </div>

            <div className="p-3.5 rounded-xl bg-brand-50/60 dark:bg-brand-950/40 border border-brand-200/70 dark:border-brand-900/60">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={repaySendReceipt}
                  onChange={(e) => setRepaySendReceipt(e.target.checked)}
                  className="mt-0.5 rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
                />
                <div>
                  <p className="text-xs font-bold text-brand-900 dark:text-brand-200 flex items-center gap-1.5">
                    <Mail size={13} className="text-brand-600 dark:text-brand-400" />
                    <span>Send PDF Repayment Receipt to Contact</span>
                  </p>
                  <p className="text-[11px] text-brand-700 dark:text-brand-300 mt-0.5">
                    Email an official transaction receipt confirming payment to the contact.
                  </p>
                </div>
              </label>
            </div>

            <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/80">
              <button
                type="button"
                className="btn-secondary flex-1 text-xs"
                onClick={() => {
                  setShowRepayForm(false);
                  resetRepayForm();
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary flex-1 text-xs shadow-md shadow-brand-500/20"
                disabled={repayMutation.isPending}
              >
                {repayMutation.isPending ? 'Logging Repayment...' : 'Confirm Repayment'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ─── Modal: Add More Funds ─── */}
      <Modal
        isOpen={showAddFundsForm}
        onClose={() => {
          setShowAddFundsForm(false);
          resetAddFundsForm();
        }}
        title="Add More Capital / Funds to Loan"
        maxWidth="max-w-md"
      >
        {selectedLoan && (
          <form onSubmit={handleAddFunds} className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Target Contact:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {selectedLoan.person_name || 'Unknown Contact'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Current Principal:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">
                  {formatCurrency(toNum(selectedLoan.principal_amount))}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-slate-800">
                <span className="text-slate-400">Current Remaining:</span>
                <span className="font-extrabold font-mono text-amber-600 dark:text-amber-400">
                  {formatCurrency(toNum(selectedLoan.remaining_amount))}
                </span>
              </div>
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
              <label className="label">Funding Account</label>
              <select
                className="input text-xs font-medium"
                value={addFundsAccountId}
                onChange={(e) => setAddFundsAccountId(e.target.value)}
                required
              >
                <option value="">Select account...</option>
                {accounts?.map((a: Account) => (
                  <option key={a.account_id} value={a.account_id}>
                    {a.account_name} ({formatCurrency(a.current_balance)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Transaction Date</label>
              <input
                type="date"
                className="input text-xs"
                value={addFundsDate}
                onChange={(e) => setAddFundsDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">Description / Memo (Optional)</label>
              <input
                type="text"
                className="input text-xs"
                placeholder="e.g. Additional top-up emergency funds"
                value={addFundsDescription}
                onChange={(e) => setAddFundsDescription(e.target.value)}
              />
            </div>

            <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/60 text-xs text-emerald-700 dark:text-emerald-300">
              This will increase the loan principal and automatically adjust the chosen account ledger.
            </div>

            <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/80">
              <button
                type="button"
                className="btn-secondary flex-1 text-xs"
                onClick={() => {
                  setShowAddFundsForm(false);
                  resetAddFundsForm();
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 text-xs py-2.5 font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20 transition-all"
                disabled={addFundsMutation.isPending}
              >
                {addFundsMutation.isPending ? 'Adding Funds...' : 'Add Funds'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ─── Modal: Fix Orphaned Loans ─── */}
      <Modal
        isOpen={showFixForm}
        onClose={() => {
          setShowFixForm(false);
          setFixAccountId('');
        }}
        title="Synchronize Legacy Loans"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200">
            Select the primary account to link for missing ledger transactions.
          </div>

          <div>
            <label className="label">Funding Account</label>
            <select
              className="input text-xs font-medium"
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
              onClick={() => {
                setShowFixForm(false);
                setFixAccountId('');
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── Printable Voucher Modal ─── */}
      <VoucherModal
        isOpen={isVoucherModalOpen}
        onClose={() => setIsVoucherModalOpen(false)}
        data={voucherReportData}
      />

      {/* ─── Delete Loan Confirmation Modal ─── */}
      <ConfirmModal
        isOpen={!!deletingLoanId}
        onClose={() => {
          setDeletingLoanId(null);
          deleteMutation.reset();
        }}
        onConfirm={() => {
          if (deletingLoanId) {
            deleteMutation.mutate(deletingLoanId);
          }
        }}
        title="Delete Loan Agreement"
        message={
          deleteMutation.isError
            ? (deleteMutation.error as any)?.response?.data?.error?.message ||
              'Cannot delete this loan. It may have existing repayments or linked transactions.'
            : 'Are you sure you want to delete this loan? This will remove all associated transactions and adjust running balances.'
        }
        confirmText="Delete Loan"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
