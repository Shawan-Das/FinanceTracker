import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { accountsApi, categoriesApi } from '../api/client';
import Modal from './Modal';
import toast from 'react-hot-toast';
import { Plus, Sparkles, Tag, Wallet } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import type { Account, Category } from '../types';
import type { QuickPreset } from './QuickTransactionModal';

const POPULAR_EMOJIS = ['🍕', '☕', '🛒', '🚗', '🛵', '🏠', '📱', '💼', '🏋️', '💊', '⚡', '🎬', '🍔', '🎁', '💰', '✈️'];

interface CreatePresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSavePreset: (preset: QuickPreset) => void;
}

export default function CreatePresetModal({ isOpen, onClose, onSavePreset }: CreatePresetModalProps) {
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState('⚡');
  const [type, setType] = useState<'EXPENSE' | 'INCOME' | 'TRANSFER'>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [description, setDescription] = useState('');

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list().then((r: any) => r.data.data),
    enabled: isOpen,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Please enter a title for the shortcut');
      return;
    }
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast.error('Please enter a valid default amount');
      return;
    }

    const color =
      type === 'INCOME'
        ? 'from-emerald-500/20 to-teal-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
        : type === 'TRANSFER'
        ? 'from-blue-500/20 to-indigo-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30'
        : 'from-brand-500/20 to-indigo-500/20 text-brand-600 dark:text-brand-400 border-brand-500/30';

    const newPreset: QuickPreset = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      title: title.trim(),
      icon,
      type,
      defaultAmount: numAmount,
      categoryName: categoryName || undefined,
      description: description.trim() || title.trim(),
      color,
    };

    onSavePreset(newPreset);
    toast.success(`Created "${title}" quick shortcut!`);
    onClose();
    // Reset form
    setTitle('');
    setIcon('⚡');
    setAmount('');
    setDescription('');
    setCategoryName('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Custom Quick Shortcut"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Emoji Selector */}
        <div>
          <label className="label">Choose Shortcut Icon</label>
          <div className="flex items-center gap-2 mb-2">
            <div className="text-3xl w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-xs">
              {icon}
            </div>
            <input
              type="text"
              className="input w-24 text-center text-lg"
              value={icon}
              maxLength={2}
              onChange={(e) => setIcon(e.target.value || '⚡')}
              placeholder="Emoji"
            />
            <span className="text-[11px] text-slate-400">Pick below or paste emoji</span>
          </div>
          <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
            {POPULAR_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setIcon(emoji)}
                className={`w-8 h-8 rounded-lg text-base flex items-center justify-center hover:bg-white dark:hover:bg-slate-800 transition-all ${
                  icon === emoji ? 'bg-white dark:bg-slate-800 ring-2 ring-brand-500 shadow-xs' : ''
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="label">Shortcut Name</label>
          <input
            type="text"
            className="input text-xs font-bold"
            placeholder="e.g. Morning Coffee, Gym Membership, Office Rent"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
          />
        </div>

        {/* Type & Amount */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Type</label>
            <select
              className="input text-xs font-semibold"
              value={type}
              onChange={(e) => setType(e.target.value as any)}
            >
              <option value="EXPENSE">Expense</option>
              <option value="INCOME">Income</option>
              <option value="TRANSFER">Transfer</option>
            </select>
          </div>
          <div>
            <label className="label">Default Amount (৳)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              className="input text-xs font-mono font-bold"
              placeholder="e.g. 250"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Category */}
        {type !== 'TRANSFER' && (
          <div>
            <label className="label">Linked Category</label>
            <select
              className="input text-xs"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
            >
              <option value="">Uncategorized / None</option>
              {categories
                ?.filter((c: Category) => c.type === type)
                .map((cat: Category) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
            </select>
          </div>
        )}

        {/* Default Description */}
        <div>
          <label className="label">Default Description</label>
          <input
            type="text"
            className="input text-xs"
            placeholder="e.g. Espresso at Gloria Jeans"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex gap-2.5">
          <button
            type="button"
            className="btn-secondary flex-1 text-xs py-2.5"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary flex-[2] text-xs py-2.5 font-bold shadow-md shadow-brand-500/25 flex items-center justify-center gap-1.5"
          >
            <Plus size={15} />
            <span>Save Quick Shortcut</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
