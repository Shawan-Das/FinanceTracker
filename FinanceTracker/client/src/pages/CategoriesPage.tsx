import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesApi } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import QueryError from '../components/QueryError';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import toast from 'react-hot-toast';
import { Plus, Tag, Edit, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import type { Category } from '../types';

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'INCOME' | 'EXPENSE'>('INCOME');

  const { data: categories, isLoading, isError, refetch } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list().then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => categoriesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category created!');
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => categoriesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category updated!');
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category deactivated');
      setDeletingCategory(null);
    },
  });

  const resetForm = () => {
    setFormName('');
    setFormType('INCOME');
    setEditingCategory(null);
    setShowForm(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name: formName, type: formType };
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  if (isLoading) return <LoadingSpinner message="Loading financial categories..." />;
  if (isError) return <QueryError title="Failed to load categories" onRetry={() => refetch()} />;

  const incomeCategories = categories?.filter((c: Category) => c.type === 'INCOME') || [];
  const expenseCategories = categories?.filter((c: Category) => c.type === 'EXPENSE') || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Financial Categories
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Organize transactions for budgeting and expense analytics.
          </p>
        </div>

        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="btn-primary text-xs font-semibold px-3.5 py-2 shadow-sm shadow-brand-500/20"
        >
          <Plus size={15} />
          <span>New Category</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Categories */}
        <div className="card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <TrendingUp size={16} />
                </div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Income Categories ({incomeCategories.length})
                </h2>
              </div>
            </div>

            {incomeCategories.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {incomeCategories.map((cat: Category) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between py-3 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 px-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Tag size={15} className="text-emerald-500" />
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingCategory(cat);
                          setFormName(cat.name);
                          setFormType(cat.type);
                          setShowForm(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Edit Category"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => setDeletingCategory(cat)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Deactivate Category"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-8 text-center">No income categories configured.</p>
            )}
          </div>
        </div>

        {/* Expense Categories */}
        <div className="card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                  <TrendingDown size={16} />
                </div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Expense Categories ({expenseCategories.length})
                </h2>
              </div>
            </div>

            {expenseCategories.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {expenseCategories.map((cat: Category) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between py-3 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 px-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Tag size={15} className="text-rose-500" />
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingCategory(cat);
                          setFormName(cat.name);
                          setFormType(cat.type);
                          setShowForm(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Edit Category"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => setDeletingCategory(cat)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Deactivate Category"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-8 text-center">No expense categories configured.</p>
            )}
          </div>
        </div>
      </div>

      {/* Modal Dialog */}
      <Modal
        isOpen={showForm}
        onClose={resetForm}
        title={editingCategory ? 'Edit Financial Category' : 'Add New Category'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Category Title</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Groceries, Consulting, Rent"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="label">Category Flow Type</label>
            {editingCategory ? (
              <input
                type="text"
                className="input bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed text-xs font-semibold"
                value={formType === 'INCOME' ? 'Income' : 'Expense'}
                disabled
              />
            ) : (
              <select
                className="input text-xs font-semibold"
                value={formType}
                onChange={(e) => setFormType(e.target.value as any)}
              >
                <option value="INCOME">Income Category</option>
                <option value="EXPENSE">Expense Category</option>
              </select>
            )}
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
              {editingCategory ? 'Save Category' : 'Create Category'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete / Deactivate Category Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingCategory}
        onClose={() => { setDeletingCategory(null); deleteMutation.reset(); }}
        onConfirm={() => {
          if (deletingCategory) {
            deleteMutation.mutate(deletingCategory.id);
          }
        }}
        title="Deactivate Category"
        message={deleteMutation.isError
          ? (deleteMutation.error as any)?.response?.data?.error?.message || 'Cannot deactivate this category. It may have existing transactions linked to it.'
          : `Are you sure you want to deactivate the "${deletingCategory?.name}" category?`
        }
        confirmText="Deactivate Category"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
