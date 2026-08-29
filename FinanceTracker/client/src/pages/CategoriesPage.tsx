import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesApi } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import QueryError from '../components/QueryError';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { Plus, Tag, Edit, Trash2 } from 'lucide-react';
import type { Category } from '../types';

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
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
    mutationFn: ({ id, data }: { id: number; data: any }) => categoriesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category updated!');
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => categoriesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category deactivated');
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

  if (isLoading) return <LoadingSpinner />;
  if (isError) return <QueryError onRetry={() => refetch()} />;

  const incomeCategories = categories?.filter((c: Category) => c.type === 'INCOME') || [];
  const expenseCategories = categories?.filter((c: Category) => c.type === 'EXPENSE') || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-gray-500">Manage income and expense categories</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary">
          <Plus size={16} className="mr-1" /> New Category
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Categories */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            Income Categories
          </h2>
          {incomeCategories.length > 0 ? (
            <div className="space-y-2">
              {incomeCategories.map((cat: Category) => (
                <div key={cat.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-2">
                    <Tag size={14} className="text-gray-400" />
                    <span className="text-sm text-gray-900">{cat.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => {
                      setEditingCategory(cat);
                      setFormName(cat.name);
                      setFormType(cat.type);
                      setShowForm(true);
                    }} className="p-1 hover:bg-gray-100 rounded text-gray-400">
                      <Edit size={14} />
                    </button>
                    <button onClick={() => {
                      if (confirm('Deactivate this category?')) deleteMutation.mutate(cat.id);
                    }} className="p-1 hover:bg-red-50 rounded text-red-400">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">No income categories</p>
          )}
        </div>

        {/* Expense Categories */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            Expense Categories
          </h2>
          {expenseCategories.length > 0 ? (
            <div className="space-y-2">
              {expenseCategories.map((cat: Category) => (
                <div key={cat.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-2">
                    <Tag size={14} className="text-gray-400" />
                    <span className="text-sm text-gray-900">{cat.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => {
                      setEditingCategory(cat);
                      setFormName(cat.name);
                      setFormType(cat.type);
                      setShowForm(true);
                    }} className="p-1 hover:bg-gray-100 rounded text-gray-400">
                      <Edit size={14} />
                    </button>
                    <button onClick={() => {
                      if (confirm('Deactivate this category?')) deleteMutation.mutate(cat.id);
                    }} className="p-1 hover:bg-red-50 rounded text-red-400">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">No expense categories</p>
          )}
        </div>
      </div>

      <Modal isOpen={showForm} onClose={resetForm} title={editingCategory ? 'Edit Category' : 'New Category'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Category Name</label>
            <input type="text" className="input" placeholder="e.g. Groceries" value={formName}
              onChange={(e) => setFormName(e.target.value)} required autoFocus />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={formType} onChange={(e) => setFormType(e.target.value as any)}>
              <option value="INCOME">Income</option>
              <option value="EXPENSE">Expense</option>
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary flex-1">
              {editingCategory ? 'Update' : 'Create'} Category
            </button>
            <button type="button" className="btn-secondary" onClick={resetForm}>Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
