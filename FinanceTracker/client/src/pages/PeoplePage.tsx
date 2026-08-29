import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { peopleApi } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import QueryError from '../components/QueryError';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, User } from 'lucide-react';
import type { Person } from '../types';

const formatCurrency = (amount: number) =>
  `৳${amount.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export default function PeoplePage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);

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
      toast.success('Person added!');
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => peopleApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      toast.success('Person updated!');
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => peopleApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      toast.success('Person removed');
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

  if (isLoading) return <LoadingSpinner />;
  if (isError) return <QueryError onRetry={() => refetch()} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">People</h1>
          <p className="text-gray-500">Track who owes you and who you owe</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary">
          <Plus size={16} className="mr-1" /> Add Person
        </button>
      </div>

      {people && people.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {people.map((p: Person) => (
            <div key={p.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-primary-700 font-semibold text-sm">
                      {p.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{p.name}</h3>
                    {p.phone && <p className="text-xs text-gray-500">{p.phone}</p>}
                    {p.email && <p className="text-xs text-gray-500">{p.email}</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(p)} className="p-1 hover:bg-gray-100 rounded text-gray-400">
                    <Edit size={14} />
                  </button>
                  <button onClick={() => {
                    if (confirm('Remove this person?')) deleteMutation.mutate(p.id);
                  }} className="p-1 hover:bg-red-50 rounded text-red-400">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {p.amount_they_owe_you > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">They owe you</span>
                    <span className="text-sm font-semibold text-green-600">{formatCurrency(p.amount_they_owe_you)}</span>
                  </div>
                )}
                {p.amount_you_owe_them > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">You owe them</span>
                    <span className="text-sm font-semibold text-red-600">{formatCurrency(p.amount_you_owe_them)}</span>
                  </div>
                )}
                {p.amount_they_owe_you === 0 && p.amount_you_owe_them === 0 && (
                  <p className="text-sm text-gray-400 text-center py-2">No outstanding balances</p>
                )}
              </div>
              {p.notes && <p className="text-xs text-gray-500 mt-3 line-clamp-2">{p.notes}</p>}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No people yet"
          description="Add people you have financial relationships with."
          action={
            <button onClick={() => setShowForm(true)} className="btn-primary">
              <Plus size={16} className="mr-1" /> Add Person
            </button>
          }
        />
      )}

      <Modal isOpen={showForm} onClose={resetForm} title={editingPerson ? 'Edit Person' : 'Add Person'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input type="text" className="input" placeholder="e.g. Rahim" value={formName}
              onChange={(e) => setFormName(e.target.value)} required autoFocus />
          </div>
          <div>
            <label className="label">Phone (optional)</label>
            <input type="text" className="input" placeholder="Phone number" value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)} />
          </div>
          <div>
            <label className="label">Email (optional)</label>
            <input type="email" className="input" placeholder="Email address" value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)} />
          </div>
          <div>
            <label className="label">Notes (optional)</label>
            <textarea className="input" rows={2} placeholder="Any notes..."
              value={formNotes} onChange={(e) => setFormNotes(e.target.value)} />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary flex-1">
              {editingPerson ? 'Update' : 'Add'} Person
            </button>
            <button type="button" className="btn-secondary" onClick={resetForm}>Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
