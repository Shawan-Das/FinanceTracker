import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { peopleApi } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import QueryError from '../components/QueryError';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, User, Phone, Mail, ArrowUpRight, ArrowDownRight, CheckCircle2 } from 'lucide-react';
import type { Person } from '../types';

const formatCurrency = (amount: number) =>
  `৳${amount.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export default function PeoplePage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [deletingPerson, setDeletingPerson] = useState<Person | null>(null);

  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const { data: people, isLoading, isError, refetch } = useQuery({
    queryKey: ['people'],
    queryFn: () => peopleApi.list().then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => peopleApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Person added to directory');
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => peopleApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Person contact updated');
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => peopleApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Person removed from directory');
      setDeletingPerson(null);
    },
  });

  const resetForm = () => {
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormNotes('');
    setEditingPerson(null);
    setShowForm(false);
  };

  const openEdit = (p: Person) => {
    setEditingPerson(p);
    setFormName(p.name);
    setFormPhone(p.phone || '');
    setFormEmail(p.email || '');
    setFormNotes(p.notes || '');
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: formName,
      phone: formPhone || undefined,
      email: formEmail || undefined,
      notes: formNotes || undefined,
    };
    if (editingPerson) {
      updateMutation.mutate({ id: editingPerson.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  if (isLoading) return <LoadingSpinner message="Loading contact relationships..." />;
  if (isError) return <QueryError title="Failed to load people directory" onRetry={() => refetch()} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            People & Counterparties
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Track receivables and payables per person contact.
          </p>
        </div>

        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="btn-primary text-xs font-semibold px-3.5 py-2 shadow-sm shadow-brand-500/20"
        >
          <Plus size={15} />
          <span>Add Person</span>
        </button>
      </div>

      {/* Directory Grid */}
      {people && people.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {people.map((p: Person) => {
            const owesYou = p.amount_they_owe_you > 0;
            const youOwe = p.amount_you_owe_them > 0;

            return (
              <div
                key={p.id}
                className="card p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                      <div className="w-10 h-10 flex-shrink-0 rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center text-white font-extrabold text-sm shadow-sm">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{p.name}</h3>
                        <div className="flex flex-col gap-0.5 text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                          {p.phone && <span className="flex items-center gap-1 truncate"><Phone size={11} className="flex-shrink-0" /> {p.phone}</span>}
                          {p.email && <span className="flex items-center gap-1 truncate"><Mail size={11} className="flex-shrink-0" /> {p.email}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => openEdit(p)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Edit Contact"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => setDeletingPerson(p)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Delete Contact"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Financial Status Pills */}

                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    {owesYou && (
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/60 text-xs">
                        <span className="font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                          <ArrowUpRight size={14} className="text-emerald-600 dark:text-emerald-400" /> They owe you:
                        </span>
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(p.amount_they_owe_you)}
                        </span>
                      </div>
                    )}

                    {youOwe && (
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/60 text-xs">
                        <span className="font-medium text-rose-800 dark:text-rose-300 flex items-center gap-1">
                          <ArrowDownRight size={14} className="text-rose-600 dark:text-rose-400" /> You owe them:
                        </span>
                        <span className="font-extrabold text-rose-600 dark:text-rose-400">
                          {formatCurrency(p.amount_you_owe_them)}
                        </span>
                      </div>
                    )}

                    {!owesYou && !youOwe && (
                      <div className="py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/40 dark:border-slate-800/40 text-[11px] text-slate-400 text-center font-medium flex items-center justify-center gap-1">
                        <CheckCircle2 size={13} className="text-slate-400" /> All balances settled
                      </div>
                    )}
                  </div>
                </div>

                {p.notes && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/60 line-clamp-2">
                    {p.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No contacts added yet"
          description="Keep track of friends, colleagues, or vendors for personal debt balances."
          action={
            <button onClick={() => setShowForm(true)} className="btn-primary text-xs font-semibold px-4 py-2">
              <Plus size={15} /> Add First Contact
            </button>
          }
        />
      )}

      {/* Modal Dialog Form */}
      <Modal
        isOpen={showForm}
        onClose={resetForm}
        title={editingPerson ? 'Edit Contact Info' : 'Add Person to Directory'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Rahim Chowdhury"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="label">Phone Number (Optional)</label>
            <input
              type="text"
              className="input"
              placeholder="+880 1700-000000"
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Email Address (Optional)</label>
            <input
              type="email"
              className="input"
              placeholder="rahim@example.com"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
            />
            <p className="text-[11px] text-slate-400 mt-1">Required if you plan to email automatic PDF transaction receipts.</p>
          </div>

          <div>
            <label className="label">Notes / Relationship Memo</label>
            <textarea
              className="input"
              rows={2}
              placeholder="e.g. Business partner, room roommate..."
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <button type="button" className="btn-secondary flex-1 text-xs" onClick={resetForm}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1 text-xs shadow-md shadow-brand-500/20"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingPerson ? 'Save Contact' : 'Add Person'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingPerson}
        onClose={() => { setDeletingPerson(null); deleteMutation.reset(); }}
        onConfirm={() => {
          if (deletingPerson) {
            deleteMutation.mutate(deletingPerson.id);
          }
        }}
        title="Remove Person"
        message={deleteMutation.isError
          ? (deleteMutation.error as any)?.response?.data?.error?.message || 'Cannot remove this person. They may have active transactions or loans linked to their profile.'
          : `Are you sure you want to remove ${deletingPerson?.name} from your contacts directory?`
        }
        confirmText="Remove Person"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
