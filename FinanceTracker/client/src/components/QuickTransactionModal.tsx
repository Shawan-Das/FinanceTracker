import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionsApi, accountsApi, categoriesApi } from '../api/client';
import Modal from './Modal';
import toast from 'react-hot-toast';
import { Zap, Check, ArrowRight, Wallet, Tag, Calendar, DollarSign, Sparkles } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import type { Account, Category } from '../types';

export interface QuickPreset {
  id: string;
  title: string;
  icon: string;
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER';
  categoryName?: string;
  defaultAmount: number;
  description: string;
  color: string;
}

export const QUICK_PRESETS: QuickPreset[] = [
  {
    id: 'lunch',
    title: 'Daily Lunch',
    icon: '🍕',
    type: 'EXPENSE',
    categoryName: 'Food & Dining',
    defaultAmount: 250,
    description: 'Lunch & Meal',
    color: 'from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30',
  },
  {
    id: 'groceries',
    title: 'Groceries / Mart',
    icon: '🛒',
    type: 'EXPENSE',
    categoryName: 'Groceries',
    defaultAmount: 1500,
    description: 'Weekly Supermarket & Groceries',
    color: 'from-emerald-500/20 to-teal-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  },
  {
    id: 'transit',
    title: 'Ride / Fuel / Transit',
    icon: '🚗',
    type: 'EXPENSE',
    categoryName: 'Transportation',
    defaultAmount: 300,
    description: 'Ride Share & Commute',
    color: 'from-blue-500/20 to-indigo-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30',
  },
  {
    id: 'coffee',
    title: 'Coffee & Snacks',
    icon: '☕',
    type: 'EXPENSE',
    categoryName: 'Snacks',
    defaultAmount: 150,
    description: 'Coffee & Tea Break',
    color: 'from-yellow-500/20 to-amber-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
  },
  {
    id: 'utilities',
    title: 'Utility / Mobile Bill',
    icon: '📱',
    type: 'EXPENSE',
    categoryName: 'Utilities',
    defaultAmount: 1000,
    description: 'Mobile Recharge / Internet Bill',
    color: 'from-purple-500/20 to-pink-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30',
  },
  {
    id: 'salary',
    title: 'Salary / Earnings',
    icon: '💼',
    type: 'INCOME',
    categoryName: 'Salary',
    defaultAmount: 50000,
    description: 'Monthly Salary / Professional Income',
    color: 'from-green-500/20 to-emerald-500/20 text-green-600 dark:text-green-400 border-green-500/30',
  },
];

interface QuickTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  preset: QuickPreset | null;
}

export default function QuickTransactionModal({ isOpen, onClose, preset }: QuickTransactionModalProps) {
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);

  // Fetch accounts and categories
  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list().then((r: any) => r.data.data),
    enabled: isOpen,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list().then((r: any) => r.data.data),
    enabled: isOpen,
  });

  // Pre-fill form when preset opens
  useEffect(() => {
    if (preset && isOpen) {
      setAmount(String(preset.defaultAmount || ''));
      setDescription(preset.description || preset.title);
      setTxDate(new Date().toISOString().split('T')[0]);

      // Pick default account (first one with positive balance, or first available)
      if (accounts && accounts.length > 0) {
        const positiveAcc = accounts.find((a: Account) => a.current_balance > 0) || accounts[0];
        setAccountId(positiveAcc.account_id);
        if (accounts.length > 1) {
          const secondAcc = accounts.find((a: Account) => a.account_id !== positiveAcc.account_id);
          if (secondAcc) setToAccountId(secondAcc.account_id);
        }
      }

      // Match category
      if (categories && preset.categoryName) {
        const matched = categories.find(
          (c: Category) =>
            c.name.toLowerCase() === preset.categoryName?.toLowerCase() ||
            c.name.toLowerCase().includes(preset.categoryName?.toLowerCase() || '')
        );
        if (matched) {
          setCategoryId(matched.id);
        } else {
          // Fallback to first category matching type
          const fallback = categories.find((c: Category) => c.type === preset.type);
          if (fallback) setCategoryId(fallback.id);
        }
      }
    }
  }, [preset, isOpen, accounts, categories]);

  const mutation = useMutation({
    mutationFn: (payload: any) => transactionsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success(`⚡ Fast Log: Recorded ${formatCurrency(parseFloat(amount) || 0)} for ${description}!`);
      onClose();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error?.message || 'Failed to record transaction';
      toast.error(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!accountId) {
      toast.error('Please select an account');
      return;
    }

    const payload: any = {
      transaction_type: preset?.type || 'EXPENSE',
      amount: parseFloat(amount),
      transaction_date: txDate,
      description,
      account_id: accountId,
      category_id: categoryId || null,
    };

    if (preset?.type === 'TRANSFER') {
      payload.from_account_id = accountId;
      payload.to_account_id = toAccountId;
    }

    mutation.mutate(payload);
  };

  if (!preset) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="⚡ 1-Click Fast Transaction"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Preset Badge Header */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-50 to-brand-50/40 dark:from-slate-900/60 dark:to-brand-950/30 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm">
              {preset.icon}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{preset.title}</h3>
              <p className="text-[11px] text-slate-400 capitalize">
                {preset.type.toLowerCase()} • {preset.categoryName || 'General'}
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300">
            <Sparkles size={11} /> Pre-filled
          </span>
        </div>

        {/* Amount Input */}
        <div>
          <label className="label flex items-center justify-between">
            <span>Amount (৳)</span>
            <span className="text-[10px] text-slate-400 font-normal">Edit or keep default</span>
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">৳</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input pl-9 text-xl font-bold font-mono text-slate-900 dark:text-white"
              required
              autoFocus
            />
          </div>
        </div>

        {/* Account Selection */}
        <div>
          <label className="label">Paying Account</label>
          <select
            className="input text-xs font-semibold"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            required
          >
            <option value="">Select Account</option>
            {accounts?.map((acc: Account) => (
              <option key={acc.account_id} value={acc.account_id}>
                {acc.account_name} ({formatCurrency(acc.current_balance)})
              </option>
            ))}
          </select>
        </div>

        {/* Transfer Destination if Transfer */}
        {preset.type === 'TRANSFER' && (
          <div>
            <label className="label">Destination Account</label>
            <select
              className="input text-xs font-semibold"
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
              required
            >
              <option value="">Select Destination</option>
              {accounts
                ?.filter((acc: Account) => acc.account_id !== accountId)
                .map((acc: Account) => (
                  <option key={acc.account_id} value={acc.account_id}>
                    {acc.account_name} ({formatCurrency(acc.current_balance)})
                  </option>
                ))}
            </select>
          </div>
        )}

        {/* Category Selection */}
        {preset.type !== 'TRANSFER' && (
          <div>
            <label className="label">Category</label>
            <select
              className="input text-xs"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">None / Uncategorized</option>
              {categories
                ?.filter((c: Category) => c.type === preset.type)
                .map((cat: Category) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
            </select>
          </div>
        )}

        {/* Description & Date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Description</label>
            <input
              type="text"
              className="input text-xs"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Date</label>
            <input
              type="date"
              className="input text-xs"
              value={txDate}
              onChange={(e) => setTxDate(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Action Buttons */}
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
            disabled={mutation.isPending}
            className="btn-primary flex-[2] text-xs py-2.5 font-bold shadow-md shadow-brand-500/25 flex items-center justify-center gap-1.5"
          >
            <Zap size={15} className="fill-current" />
            <span>{mutation.isPending ? 'Logging...' : 'Confirm & Log (1-Click)'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
