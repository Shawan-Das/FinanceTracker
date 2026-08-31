import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { transactionsApi, accountsApi, peopleApi, categoriesApi } from '../api/client';
import {
  Search,
  ArrowRight,
  Wallet,
  Users,
  CreditCard,
  PlusCircle,
  BarChart3,
  Tag,
  Settings,
  X,
  Command,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { formatDateDMY, formatCurrency } from '../utils/format';
import type { Transaction, Account, Person, Category } from '../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Fetch searchable resources
  const { data: txData } = useQuery({
    queryKey: ['transactions', 'search'],
    queryFn: () => transactionsApi.list({ limit: 100 }).then((r: any) => r.data),
    enabled: isOpen,
  });

  const { data: accounts } = useQuery({
    queryKey: ['accounts', 'search'],
    queryFn: () => accountsApi.list().then((r: any) => r.data.data),
    enabled: isOpen,
  });

  const { data: people } = useQuery({
    queryKey: ['people', 'search'],
    queryFn: () => peopleApi.list().then((r: any) => r.data.data),
    enabled: isOpen,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories', 'search'],
    queryFn: () => categoriesApi.list().then((r: any) => r.data.data),
    enabled: isOpen,
  });

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();

  // Filter items
  const matchedAccounts = accounts?.filter((a: Account) =>
    a.account_name.toLowerCase().includes(q) || a.account_type.toLowerCase().includes(q)
  ) || [];

  const matchedPeople = people?.filter((p: Person) =>
    p.name.toLowerCase().includes(q) || (p.phone && p.phone.toLowerCase().includes(q))
  ) || [];

  const matchedTransactions = txData?.data?.filter((tx: Transaction) =>
    (tx.description && tx.description.toLowerCase().includes(q)) ||
    (tx.reference && tx.reference.toLowerCase().includes(q)) ||
    (tx.account_name && tx.account_name.toLowerCase().includes(q)) ||
    (tx.person_name && tx.person_name.toLowerCase().includes(q)) ||
    tx.transaction_type.toLowerCase().includes(q)
  ) || [];

  const matchedCategories = categories?.filter((c: Category) =>
    c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q)
  ) || [];

  const quickNavs = [
    { label: 'Add New Transaction', icon: PlusCircle, path: '/transactions', desc: 'Record expense, income, or transfer' },
    { label: 'Financial Reports', icon: BarChart3, path: '/reports', desc: 'Cashflow, balance sheet, position' },
    { label: 'Manage Accounts', icon: Wallet, path: '/accounts', desc: 'Bank accounts, mobile wallets, cash' },
    { label: 'Loans & Amortization', icon: CreditCard, path: '/loans', desc: 'Track borrowings & lent assets' },
    { label: 'People & Contacts', icon: Users, path: '/people', desc: 'Counterparties, debtors, creditors' },
    { label: 'Category Settings', icon: Tag, path: '/categories', desc: 'Income & expense flow types' },
    { label: 'Settings & Security', icon: Settings, path: '/settings', desc: 'Profile, dark mode, credentials' },
  ].filter((n) => !q || n.label.toLowerCase().includes(q) || n.desc.toLowerCase().includes(q));

  const handleSelect = (path: string) => {
    navigate(path);
    onClose();
  };

  const hasResults =
    q === '' ||
    matchedAccounts.length > 0 ||
    matchedPeople.length > 0 ||
    matchedTransactions.length > 0 ||
    matchedCategories.length > 0 ||
    quickNavs.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-[#111726] rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header Input */}
        <div className="flex items-center px-4 border-b border-slate-100 dark:border-slate-800/80">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="w-full px-3 py-4 text-sm bg-transparent border-0 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
            placeholder="Type a command, transaction, account, contact, or category..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 mr-2"
            >
              <X size={16} />
            </button>
          )}
          <div className="hidden sm:flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
            <span>ESC to close</span>
          </div>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-3 space-y-4 flex-1">
          {/* Quick Actions / Commands */}
          {quickNavs.length > 0 && (
            <div>
              <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Navigation & Actions
              </p>
              <div className="space-y-1 mt-1">
                {quickNavs.slice(0, q ? 5 : 4).map((nav, i) => {
                  const Icon = nav.icon;
                  return (
                    <button
                      key={i}
                      onClick={() => handleSelect(nav.path)}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                          <Icon size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{nav.label}</p>
                          <p className="text-[10px] text-slate-400">{nav.desc}</p>
                        </div>
                      </div>
                      <ArrowRight size={14} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Matched Accounts */}
          {matchedAccounts.length > 0 && (
            <div>
              <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Accounts ({matchedAccounts.length})
              </p>
              <div className="space-y-1 mt-1">
                {matchedAccounts.slice(0, 3).map((acc: Account) => (
                  <button
                    key={acc.account_id}
                    onClick={() => handleSelect('/accounts')}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <Wallet size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{acc.account_name}</p>
                        <p className="text-[10px] text-slate-400 capitalize">{acc.account_type.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                      {formatCurrency(acc.current_balance)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Matched Contacts / People */}
          {matchedPeople.length > 0 && (
            <div>
              <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                People & Contacts ({matchedPeople.length})
              </p>
              <div className="space-y-1 mt-1">
                {matchedPeople.slice(0, 3).map((p: Person) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelect('/people')}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <Users size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{p.name}</p>
                        <p className="text-[10px] text-slate-400">{p.phone || p.email || 'Contact'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {parseFloat(String(p.amount_they_owe_you || 0)) > 0 && (
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block">
                          +{formatCurrency(p.amount_they_owe_you)}
                        </span>
                      )}
                      {parseFloat(String(p.amount_you_owe_them || 0)) > 0 && (
                        <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 block">
                          -{formatCurrency(p.amount_you_owe_them)}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Matched Transactions */}
          {matchedTransactions.length > 0 && (
            <div>
              <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Transactions ({matchedTransactions.length})
              </p>
              <div className="space-y-1 mt-1">
                {matchedTransactions.slice(0, 5).map((tx: Transaction) => (
                  <button
                    key={tx.id}
                    onClick={() => handleSelect('/transactions')}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center">
                        {['INCOME', 'LEND_REPAYMENT'].includes(tx.transaction_type) ? (
                          <ArrowUpRight size={16} className="text-emerald-500" />
                        ) : (
                          <ArrowDownRight size={16} className="text-rose-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 max-w-sm truncate">
                          {tx.description || tx.transaction_type.replace('_', ' ')}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {formatDateDMY(tx.transaction_date)} • {tx.account_name || 'Account'}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                      {formatCurrency(tx.amount)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!hasResults && (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Command className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="font-semibold text-slate-600 dark:text-slate-300">No matching items found</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Try searching with a different keyword</p>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span><strong>↑↓</strong> to navigate</span>
            <span><strong>↵</strong> to select</span>
            <span><strong>ESC</strong> to close</span>
          </div>
          <span>Balqen Quick Search</span>
        </div>
      </div>
    </div>
  );
}
