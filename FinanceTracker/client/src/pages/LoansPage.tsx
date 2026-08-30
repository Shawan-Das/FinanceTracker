import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { loansApi, peopleApi, accountsApi } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import QueryError from '../components/QueryError';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { Plus, CreditCard, AlertTriangle, CheckCircle, Wrench, FileText } from 'lucide-react';
import type { Loan, Person, Account } from '../types';

const toNum = (v: any): number => typeof v === 'number' ? v : parseFloat(v) || 0;

const formatCurrency = (amount: number) =>
  `৳${amount.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export default function LoansPage() {
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showRepayForm, setShowRepayForm] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);

  // Create loan form
  const [direction, setDirection] = useState<'BORROWED' | 'LENT'>('LENT');
  const [personId, setPersonId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [principal, setPrincipal] = useState('');
  const [interest, setInterest] = useState('0');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');

  // Fix orphaned loans
  const [showFixForm, setShowFixForm] = useState(false);
  const [fixAccountId, setFixAccountId] = useState('');

  // Repay form
  const [repayAmount, setRepayAmount] = useState('');
  const [repayDate, setRepayDate] = useState(new Date().toISOString().split('T')[0]);
  const [repayAccountId, setRepayAccountId] = useState('');
  const [repayNotes, setRepayNotes] = useState('');

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

  const createMutation = useMutation({
    mutationFn: (data: any) => loansApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Loan created!');
      setShowCreateForm(false);
      resetCreateForm();
    },
  });

  const repayMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => loansApi.createRepayment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Repayment recorded!');
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
  };

  const resetRepayForm = () => {
    setRepayAmount('');
    setRepayDate(new Date().toISOString().split('T')[0]);
    setRepayAccountId('');
    setRepayNotes('');
    setSelectedLoan(null);
  };

  const handleDownloadVoucher = async (loan: Loan) => {
    try {
      const response = await loansApi.voucher(loan.id, 'voucher');
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `loan-${loan.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      toast.error('Failed to generate voucher');
    }
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

  if (isLoading) return <LoadingSpinner />;
  if (loansError) return <QueryError title="Failed to load loans" onRetry={() => refetchLoans()} />;

  const activeLoans = loans?.filter((l: Loan) => l.status === 'ACTIVE') || [];
  const otherLoans = loans?.filter((l: Loan) => l.status !== 'ACTIVE') || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Loans</h1>
          <p className="text-gray-500">Track loans you've lent or borrowed</p>
        </div>
        <button onClick={() => { resetCreateForm(); setShowCreateForm(true); }} className="btn-primary">
          <Plus size={16} className="mr-1" /> New Loan
        </button>
      </div>

      {/* Orphaned Loans Warning */}
      {orphanedData && orphanedData.count > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Wrench size={20} className="text-amber-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-amber-800">
                {orphanedData.count} loan(s) missing transaction records
              </h3>
              <p className="text-sm text-amber-700 mt-1">
                These loans were created before the system started tracking transactions automatically.
                Their balances may be inaccurate until fixed.
              </p>
              <button
                onClick={() => { setFixAccountId(''); setShowFixForm(true); }}
                className="mt-3 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
              >
                <Wrench size={14} className="inline mr-1" /> Fix {orphanedData.count} Loan(s)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Loans */}
      {activeLoans.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <AlertTriangle size={18} className="text-orange-500" /> Active Loans
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeLoans.map((loan: Loan) => {
              const principal = toNum(loan.principal_amount);
              const interest = toNum(loan.interest_amount);
              const repaid = toNum(loan.total_repaid);
              const remaining = toNum(loan.remaining_amount);
              const totalDue = principal + interest;
              const progress = totalDue > 0 ? ((repaid / totalDue) * 100) : 0;
              return (
                <div key={loan.id} className="card hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center
                      ${loan.direction === 'LENT' ? 'bg-blue-100' : 'bg-orange-100'}`}>
                      <CreditCard size={20}
                        className={loan.direction === 'LENT' ? 'text-blue-600' : 'text-orange-600'} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {loan.direction === 'LENT' ? 'Lent to' : 'Borrowed from'} {loan.person_name || 'Unknown'}
                      </h3>
                      <p className="text-xs text-gray-500">
                        Started: {new Date(loan.start_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Total</span>
                      <span className="font-medium">{formatCurrency(totalDue)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Repaid</span>
                      <span className="font-medium text-green-600">{formatCurrency(repaid)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Remaining</span>
                      <span className="font-semibold text-orange-600">{formatCurrency(remaining)}</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                    <div className="bg-primary-600 h-2 rounded-full transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
                  </div>

                  {loan.due_date && (
                    <p className="text-xs text-gray-500 mb-3">Due: {new Date(loan.due_date).toLocaleDateString()}</p>
                  )}

                  <div className="flex gap-2">
                    <button onClick={() => openRepay(loan)} className="btn-primary flex-1 text-sm">
                      Record Repayment
                    </button>
                    <button onClick={() => handleDownloadVoucher(loan)} className="btn-secondary text-sm px-3" title="Download Voucher">
                      <FileText size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Other Loans */}
      {otherLoans.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <CheckCircle size={18} className="text-green-500" /> Completed / Cancelled
          </h2>
          <div className="card p-0">
            <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-200">
                  <th className="p-4">Person</th>
                  <th className="p-4">Direction</th>
                  <th className="p-4">Principal</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {otherLoans.map((loan: Loan) => (
                  <tr key={loan.id} className="border-b border-gray-50">
                    <td className="p-4 text-sm">{loan.person_name || 'Unknown'}</td>
                    <td className="p-4 text-sm">{loan.direction}</td>
                    <td className="p-4 text-sm">{formatCurrency(toNum(loan.principal_amount))}</td>
                    <td className="p-4">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full
                        ${loan.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {loan.status}
                      </span>
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
          title="No loans yet"
          description="Record money you've lent or borrowed to keep track of it."
          action={
            <button onClick={() => setShowCreateForm(true)} className="btn-primary">
              <Plus size={16} className="mr-1" /> Add Loan
            </button>
          }
        />
      )}

      {/* Create Loan Modal */}
      <Modal isOpen={showCreateForm} onClose={() => { setShowCreateForm(false); resetCreateForm(); }} title="New Loan">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Loan Direction</label>
            <select className="input" value={direction} onChange={(e) => setDirection(e.target.value as any)}>
              <option value="LENT">I lent money to someone</option>
              <option value="BORROWED">I borrowed money from someone</option>
            </select>
          </div>
          <div>
            <label className="label">Person</label>
            <select className="input" value={personId} onChange={(e) => setPersonId(e.target.value)}>
              <option value="">Select person</option>
              {people?.map((p: Person) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">From Account</label>
            <select className="input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value="">Select account</option>
              {accounts?.map((a: Account) => (
                <option key={a.account_id} value={a.account_id}>{a.account_name} ({formatCurrency(a.current_balance)})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Principal Amount (৳)</label>
            <input type="number" className="input" step="0.01" min="0.01" placeholder="0.00"
              value={principal} onChange={(e) => setPrincipal(e.target.value)} required />
          </div>
          <div>
            <label className="label">Interest Amount (৳)</label>
            <input type="number" className="input" step="0.01" min="0" placeholder="0"
              value={interest} onChange={(e) => setInterest(e.target.value)} />
          </div>
          <div>
            <label className="label">Start Date</label>
            <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          </div>
          <div>
            <label className="label">Due Date (optional)</label>
            <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Description (optional)</label>
            <input type="text" className="input" placeholder="Loan details..."
              value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={createMutation.isPending}>
              Create Loan
            </button>
            <button type="button" className="btn-secondary" onClick={() => { setShowCreateForm(false); resetCreateForm(); }}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* Repay Modal */}
      <Modal isOpen={showRepayForm} onClose={() => { setShowRepayForm(false); resetRepayForm(); }} title="Record Repayment">
        {selectedLoan && (
          <form onSubmit={handleRepay} className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 text-sm">
              <p className="text-gray-600">
                {selectedLoan.direction === 'LENT' ? 'Lent to' : 'Borrowed from'}:{' '}
                <span className="font-medium text-gray-900">{selectedLoan.person_name}</span>
              </p>
              <p className="text-gray-600">
                Remaining: <span className="font-semibold text-orange-600">{formatCurrency(selectedLoan.remaining_amount)}</span>
              </p>
            </div>
            <div>
              <label className="label">Repayment Amount (৳)</label>
              <input type="number" className="input" step="0.01" min="0.01"
                max={selectedLoan.remaining_amount} placeholder="0.00"
                value={repayAmount} onChange={(e) => setRepayAmount(e.target.value)} required />
            </div>
            <div>
              <label className="label">From Account</label>
              <select className="input" value={repayAccountId}
                onChange={(e) => setRepayAccountId(e.target.value)} required>
                <option value="">Select account</option>
                {accounts?.map((a: Account) => (
                  <option key={a.account_id} value={a.account_id}>{a.account_name} ({formatCurrency(a.current_balance)})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Date</label>
              <input type="date" className="input" value={repayDate}
                onChange={(e) => setRepayDate(e.target.value)} required />
            </div>
            <div>
              <label className="label">Notes (optional)</label>
              <input type="text" className="input" placeholder="Payment notes..."
                value={repayNotes} onChange={(e) => setRepayNotes(e.target.value)} />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="btn-primary flex-1" disabled={repayMutation.isPending}>
                Record Repayment
              </button>
              <button type="button" className="btn-secondary"
                onClick={() => { setShowRepayForm(false); resetRepayForm(); }}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Fix Orphaned Loans Modal */}
      <Modal isOpen={showFixForm} onClose={() => { setShowFixForm(false); setFixAccountId(''); }} title="Fix Missing Transactions">
        <div className="space-y-4">
          <div className="bg-amber-50 rounded-lg p-4">
            <p className="text-sm text-amber-800">
              This will create the missing LEND/BORROW transactions for {orphanedData?.count || 0} loan(s)
              that were created before automatic transaction tracking was added.
            </p>
            <p className="text-sm text-amber-700 mt-2">
              Select the account the money was originally sent from. This ensures your account balances are accurate.
            </p>
          </div>
          {orphanedData && orphanedData.loans.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500 uppercase">Loans to fix:</p>
              {orphanedData.loans.map((loan: any) => (
                <div key={loan.id} className="flex justify-between text-sm py-1">
                  <span className="text-gray-700">
                    {loan.direction === 'LENT' ? 'Lent to' : 'Borrowed from'} {loan.person_name || 'Unknown'}
                  </span>
                  <span className="font-medium">{formatCurrency(toNum(loan.principal_amount))}</span>
                </div>
              ))}
            </div>
          )}
          <div>
            <label className="label">Select Account</label>
            <select className="input" value={fixAccountId} onChange={(e) => setFixAccountId(e.target.value)}>
              <option value="">Choose account...</option>
              {accounts?.map((a: Account) => (
                <option key={a.account_id} value={a.account_id}>{a.account_name} ({formatCurrency(a.current_balance)})</option>
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
              className="btn-primary flex-1"
              disabled={fixOrphanedMutation.isPending}
            >
              {fixOrphanedMutation.isPending ? 'Fixing...' : `Fix ${orphanedData?.count || 0} Loan(s)`}
            </button>
            <button type="button" className="btn-secondary" onClick={() => { setShowFixForm(false); setFixAccountId(''); }}>
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
