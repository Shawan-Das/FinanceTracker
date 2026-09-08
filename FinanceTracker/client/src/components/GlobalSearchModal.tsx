import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { formatDateDMY, formatCurrency, formatTxType } from '../utils/format';
import type { Transaction, Account, Person, Category } from '../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Only fetch data when there's an actual search query (lazy loading)
  const q = query.trim().toLowerCase();
  const hasQuery = q.length >= 2;

  const { data: txData } = useQuery({
    queryKey: ['transactions', 'search'],
    queryFn: () => transactionsApi.list({ limit: 50 }).then((r: any) => r.data),
    enabled: isOpen && hasQuery,
    staleTime: 60_000,
  });

  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list().then((r: any) => r.data.data),
    enabled: isOpen && hasQuery,
    staleTime: 120_000,
  });

  const { data: people } = useQuery({
    queryKey: ['people'],
    queryFn: () => peopleApi.list().then((r: any) => r.data.data),
    enabled: isOpen && hasQuery,
    staleTime: 120_000,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list().then((r: any) => r.data.data),
    enabled: isOpen && hasQuery,
    staleTime: 120_000,
  });

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

  // Compile flat actionable list for arrow key navigation
  const displayedNavs = quickNavs.slice(0, q ? 5 : 4);
  const displayedAccounts = matchedAccounts.slice(0, 3);
  const displayedPeople = matchedPeople.slice(0, 3);
  const displayedTransactions = matchedTransactions.slice(0, 5);

  const flatActions: { id: string; action: () => void }[] = [
    ...displayedNavs.map((n) => ({ id: `nav-${n.path}`, action: () => handleSelect(n.path) })),
    ...displayedAccounts.map((a: Account) => ({ id: `acc-${a.account_id}`, action: () => handleSelect('/accounts') })),
    ...displayedPeople.map((p: Person) => ({ id: `p-${p.id}`, action: () => handleSelect('/people') })),
    ...displayedTransactions.map((tx: Transaction) => ({ id: `tx-${tx.id}`, action: () => handleSelect('/transactions') })),
  ];

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setFocusedIndex(-1);
    } else {
      setQuery('');
      setFocusedIndex(-1);
    }
  }, [isOpen]);

  // Reset focus when query changes
  useEffect(() => {
    setFocusedIndex(-1);
  }, [query]);

  // Handle keyboard events (Escape, ArrowUp, ArrowDown, Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (flatActions.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = prev < flatActions.length - 1 ? prev + 1 : 0;
          return next;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = prev > 0 ? prev - 1 : flatActions.length - 1;
          return next;
        });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < flatActions.length) {
          flatActions[focusedIndex].action();
        } else if (flatActions.length > 0) {
          flatActions[0].action();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, flatActions, focusedIndex]);

  // Auto-scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0) {
      const el = document.querySelector(`[data-search-idx="${focusedIndex}"]`);
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIndex]);

  const hasResults =
    q === '' ||
    displayedNavs.length > 0 ||
    displayedAccounts.length > 0 ||
    displayedPeople.length > 0 ||
    displayedTransactions.length > 0;

  if (!isOpen) return null;

  let itemIndexCounter = 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-2xl bg-[#f4f7fa] dark:bg-[#111726] rounded-2xl shadow-2xl border border-[#cbd5e1] dark:border-slate-800 overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header Input */}
        <div className="flex items-center px-4 border-b border-[#cbd5e1] dark:border-slate-800/80 bg-[#eaf0f7] dark:bg-slate-900/40">
          <Search className="w-5 h-5 text-slate-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="w-full px-3 py-4 text-sm bg-transparent border-0 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:outline-none"
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
          <div className="hidden sm:flex items-center gap-1 text-[10px] font-semibold text-slate-600 dark:text-slate-400 bg-[#dce4ee] dark:bg-slate-800 px-2 py-0.5 rounded">
            <span>ESC to close</span>
          </div>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-3 space-y-4 flex-1">
          {/* Quick Actions / Commands */}
          {displayedNavs.length > 0 && (
            <div>
              <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Navigation & Actions
              </p>
              <div className="space-y-1 mt-1">
                {displayedNavs.map((nav) => {
                  const Icon = nav.icon;
                  const idx = itemIndexCounter++;
                  const isFocused = focusedIndex === idx;
                  return (
                    <button
                      key={nav.path}
                      data-search-idx={idx}
                      onClick={() => handleSelect(nav.path)}
                      onMouseEnter={() => setFocusedIndex(idx)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all text-left group ${
                        isFocused
                          ? 'bg-brand-500/15 dark:bg-brand-500/25 ring-2 ring-brand-500 text-brand-900 dark:text-brand-100'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-900/60'
                      }`}
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
          {displayedAccounts.length > 0 && (
            <div>
              <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Accounts ({matchedAccounts.length})
              </p>
              <div className="space-y-1 mt-1">
                {displayedAccounts.map((acc: Account) => {
                  const idx = itemIndexCounter++;
                  const isFocused = focusedIndex === idx;
                  return (
                    <button
                      key={acc.account_id}
                      data-search-idx={idx}
                      onClick={() => handleSelect('/accounts')}
                      onMouseEnter={() => setFocusedIndex(idx)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all text-left group ${
                        isFocused
                          ? 'bg-brand-500/15 dark:bg-brand-500/25 ring-2 ring-brand-500 text-brand-900 dark:text-brand-100'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-900/60'
                      }`}
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
                  );
                })}
              </div>
            </div>
          )}

          {/* Matched Contacts / People */}
          {displayedPeople.length > 0 && (
            <div>
              <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                People & Contacts ({matchedPeople.length})
              </p>
              <div className="space-y-1 mt-1">
                {displayedPeople.map((p: Person) => {
                  const idx = itemIndexCounter++;
                  const isFocused = focusedIndex === idx;
                  return (
                    <button
                      key={p.id}
                      data-search-idx={idx}
                      onClick={() => handleSelect('/people')}
                      onMouseEnter={() => setFocusedIndex(idx)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all text-left group ${
                        isFocused
                          ? 'bg-brand-500/15 dark:bg-brand-500/25 ring-2 ring-brand-500 text-brand-900 dark:text-brand-100'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-900/60'
                      }`}
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
                  );
                })}
              </div>
            </div>
          )}

          {/* Matched Transactions */}
          {displayedTransactions.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-3 py-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Transactions ({matchedTransactions.length})
                </p>
                {/* 50-limit indicator (#4) */}
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                  Latest 50 sample
                </span>
              </div>
              <div className="space-y-1 mt-1">
                {displayedTransactions.map((tx: Transaction) => {
                  const idx = itemIndexCounter++;
                  const isFocused = focusedIndex === idx;
                  return (
                    <button
                      key={tx.id}
                      data-search-idx={idx}
                      onClick={() => handleSelect('/transactions')}
                      onMouseEnter={() => setFocusedIndex(idx)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all text-left group ${
                        isFocused
                          ? 'bg-brand-500/15 dark:bg-brand-500/25 ring-2 ring-brand-500 text-brand-900 dark:text-brand-100'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-900/60'
                      }`}
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
                            {tx.description || formatTxType(tx.transaction_type)}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {formatDateDMY(tx.transaction_date)} • {tx.account_name || 'Account'} •{' '}
                            <span className="capitalize">{formatTxType(tx.transaction_type)}</span>
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                        {formatCurrency(tx.amount)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* 50-record limit warning note (#4) */}
              <div className="mt-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px] flex items-center justify-between">
                <span>⚡ Showing results from latest 50 transactions</span>
                <button
                  type="button"
                  onClick={() => handleSelect('/transactions')}
                  className="font-bold underline hover:text-amber-900 dark:hover:text-amber-200"
                >
                  Full search in Ledger →
                </button>
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
