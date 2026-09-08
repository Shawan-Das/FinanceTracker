import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ThemeToggle from './ThemeToggle';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Users,
  CreditCard,
  Tag,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  TrendingUp,
  Search,
  PlusCircle,
  AlertCircle,
  ChevronRight,
  ShieldCheck,
  MoreHorizontal,
  Keyboard,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/client';
import GlobalSearchModal from './GlobalSearchModal';
import QuickTransactionModal from './QuickTransactionModal';
import KeyboardShortcutsModal from './KeyboardShortcutsModal';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { to: '/accounts', icon: Wallet, label: 'Accounts' },
  { to: '/people', icon: Users, label: 'People' },
  { to: '/loans', icon: CreditCard, label: 'Loans' },
  { to: '/categories', icon: Tag, label: 'Categories' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

// Bottom nav primary items (visible without "More")
const bottomNavPrimary = [
  { to: '/', icon: LayoutDashboard, label: 'Home', end: true },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Ledger', end: false },
  // center slot is the Quick Add FAB
  { to: '/reports', icon: BarChart3, label: 'Reports', end: false },
  { to: '/loans', icon: CreditCard, label: 'Loans', end: false },
];

// "More" sheet items
const bottomNavMore = [
  { to: '/accounts', icon: Wallet, label: 'Accounts' },
  { to: '/people', icon: Users, label: 'People' },
  { to: '/categories', icon: Tag, label: 'Categories' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false); // #2: global quick add
  const [moreSheetOpen, setMoreSheetOpen] = useState(false); // #9: more sheet
  const [shortcutsOpen, setShortcutsOpen] = useState(false); // #21: keyboard shortcuts guide

  // #10: Fetch overdue loans count for notification dot
  const { data: loanSummary } = useQuery({
    queryKey: ['dashboard', 'loans'],
    queryFn: () => dashboardApi.loanSummary().then((r) => r.data.data),
    staleTime: 120_000,
  });

  const overdueCount = (loanSummary as any[])?.filter((loan: any) => {
    if (!loan.due_date) return false;
    const due = new Date(loan.due_date);
    due.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today && loan.status !== 'SETTLED';
  }).length ?? 0;

  // Global keyboard shortcuts: Ctrl+K search, ? for guide, N for quick add
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't fire single-char shortcuts if focus is in an input / textarea
      const target = e.target as HTMLElement;
      const inInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
        return;
      }
      if (!inInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === '?') {
          e.preventDefault();
          setShortcutsOpen((prev) => !prev);
        } else if (e.key === 'n' || e.key === 'N') {
          e.preventDefault();
          setQuickAddOpen((prev) => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close sidebar & more sheet on route change
  useEffect(() => {
    setSidebarOpen(false);
    setMoreSheetOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getPageTitle = () => {
    const activeNav = navItems.find((item) =>
      item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
    );
    return activeNav ? activeNav.label : 'Financial Portal';
  };

  return (
    <div className="min-h-screen flex bg-[#e9edf2] dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 antialiased selection:bg-brand-500 selection:text-white transition-colors duration-200">
      {/* Mobile & Tablet Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* #9: Mobile "More" Sheet Backdrop */}
      {moreSheetOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMoreSheetOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-[#dee5ee] dark:bg-[#111726] border-r border-[#cbd5e1] dark:border-slate-800/80
                    flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 shadow-sm
                    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Sidebar Header */}
        <div>
          <div className="h-16 px-6 flex items-center justify-between border-b border-[#cbd5e1] dark:border-slate-800/60">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 via-brand-500 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-brand-500/25">
                <TrendingUp size={20} strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                  BALQEN
                </h1>
                <p className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-500 tracking-wider">
                  Finance &amp; Ledger
                </p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={20} />
            </button>
          </div>

          {/* Quick Stats Pill */}
          <div className="px-4 py-3 m-3 rounded-xl bg-[#e4ecf4] dark:bg-slate-900/60 border border-[#cbd5e1] dark:border-slate-800/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Secure Session</span>
            </div>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
              Active
            </span>
          </div>

          {/* Nav Items */}
          <nav className="p-3 space-y-1">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${isActive
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20 font-semibold'
                    : 'text-slate-700 dark:text-slate-400 hover:bg-[#d0dbe7] dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Icon
                        size={18}
                        className={
                          isActive
                            ? 'text-white'
                            : 'text-slate-500 dark:text-slate-500 group-hover:text-slate-800 dark:group-hover:text-slate-300 transition-colors'
                        }
                      />
                      <span>{label}</span>
                    </div>
                    {isActive && <ChevronRight size={14} className="opacity-70" />}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer / User Profile */}
        <div className="p-4 border-t border-[#cbd5e1] dark:border-slate-800/60 bg-[#dee5ee] dark:bg-slate-900/30">
          <div className="flex items-center gap-3 mb-3 p-2 rounded-xl bg-[#f4f7fa] dark:bg-slate-900 border border-[#cbd5e1] dark:border-slate-800/60 shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                {user?.full_name || 'User'}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/40 rounded-xl transition-colors border border-transparent hover:border-rose-300 dark:hover:border-rose-900/40"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 bg-[#dee5ee]/90 dark:bg-[#111726]/80 backdrop-blur-md border-b border-[#cbd5e1] dark:border-slate-800/80 px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-[#d0dbe7] dark:hover:bg-slate-800/80"
              aria-label="Open sidebar menu"
            >
              <Menu size={22} />
            </button>

            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {getPageTitle()}
              </h2>
            </div>
          </div>

          {/* Header Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Search Button (Laptop/Desktop) */}
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden md:flex items-center justify-between w-48 lg:w-64 pl-3 pr-2 py-1.5 text-xs bg-[#e5ecf4] dark:bg-slate-900 border border-[#cbd5e1] dark:border-slate-800 rounded-xl text-slate-500 hover:border-brand-500/50 hover:bg-[#ffffff] dark:hover:bg-slate-800/80 transition-all cursor-pointer text-left group"
            >
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-slate-500 group-hover:text-brand-500 transition-colors" />
                <span className="truncate">Search records...</span>
              </div>
              <kbd className="hidden lg:inline-flex items-center gap-0.5 text-[10px] font-bold text-slate-500 bg-[#ffffff] dark:bg-slate-800 border border-[#cbd5e1] dark:border-slate-700 px-1.5 py-0.5 rounded shadow-2xs">
                Ctrl K
              </kbd>
            </button>

            {/* Mobile Search Button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-[#d0dbe7] dark:hover:bg-slate-800/80 transition-colors"
              title="Search"
            >
              <Search size={18} />
            </button>

            {/* #2: Quick Add Button — opens modal in-context, not navigate away */}
            <button
              onClick={() => setQuickAddOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-sm shadow-brand-500/20 transition-all cursor-pointer"
              title="Record a quick transaction (stays on current page)"
            >
              <PlusCircle size={15} />
              <span>New Entry</span>
            </button>

            {/* #1 + #10: Loans alert button — semantic icon, dynamic overdue dot */}
            <button
              onClick={() => navigate('/loans')}
              className="p-2.5 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-[#d0dbe7] dark:hover:bg-slate-800/80 transition-colors relative"
              title={overdueCount > 0 ? `${overdueCount} overdue loan${overdueCount > 1 ? 's' : ''}` : 'Loans & Agreements'}
            >
              <AlertCircle size={18} />
              {/* Only show dot when there are overdue loans (#10) */}
              {overdueCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#dee5ee] dark:ring-slate-900 animate-pulse" />
              )}
            </button>

            {/* #21: Keyboard Shortcuts help button */}
            <button
              onClick={() => setShortcutsOpen(true)}
              className="hidden sm:flex p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-[#d0dbe7] dark:hover:bg-slate-800/80 transition-colors"
              title="Keyboard Shortcuts (?)"
              aria-label="Open keyboard shortcuts guide"
            >
              <Keyboard size={17} />
            </button>

            {/* Theme Toggle Dropdown */}
            <ThemeToggle />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 lg:pb-8">
          <Outlet />
        </main>
      </div>

      {/* #9: Mobile Bottom Navigation Bar — rearranged with Reports, More sheet */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#dee5ee]/95 dark:bg-[#111726]/95 backdrop-blur-md border-t border-[#cbd5e1] dark:border-slate-800/80 px-2 py-1 flex items-center justify-around shadow-lg">
        {/* Home */}
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1.5 px-3 rounded-xl text-[10px] font-semibold transition-all ${isActive
              ? 'text-brand-600 dark:text-brand-400 font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`
          }
        >
          <LayoutDashboard size={19} />
          <span className="mt-0.5">Home</span>
        </NavLink>

        {/* Ledger */}
        <NavLink
          to="/transactions"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1.5 px-3 rounded-xl text-[10px] font-semibold transition-all ${isActive
              ? 'text-brand-600 dark:text-brand-400 font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`
          }
        >
          <ArrowLeftRight size={19} />
          <span className="mt-0.5">Ledger</span>
        </NavLink>

        {/* #2: Center Quick Add FAB — opens modal */}
        <button
          onClick={() => setQuickAddOpen(true)}
          className="w-11 h-11 -mt-4 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-brand-500/35 active:scale-95 transition-transform"
          title="Quick Add Transaction"
        >
          <PlusCircle size={22} />
        </button>

        {/* #9: Reports (replaces Accounts — more commonly visited) */}
        <NavLink
          to="/reports"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1.5 px-3 rounded-xl text-[10px] font-semibold transition-all ${isActive
              ? 'text-brand-600 dark:text-brand-400 font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`
          }
        >
          <BarChart3 size={19} />
          <span className="mt-0.5">Reports</span>
        </NavLink>

        {/* #9: "More" button opens bottom sheet */}
        <button
          onClick={() => setMoreSheetOpen(true)}
          className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl text-[10px] font-semibold transition-all relative ${
            ['/accounts', '/people', '/loans', '/categories', '/settings'].some((p) =>
              location.pathname.startsWith(p)
            )
              ? 'text-brand-600 dark:text-brand-400 font-bold'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <MoreHorizontal size={19} />
          <span className="mt-0.5">More</span>
          {/* Show overdue dot on More button too if on a "more" page */}
          {overdueCount > 0 && (
            <span className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full bg-rose-500" />
          )}
        </button>
      </nav>

      {/* #9: "More" Bottom Sheet */}
      {moreSheetOpen && (
        <div className="lg:hidden fixed bottom-16 left-0 right-0 z-50 bg-[#dee5ee] dark:bg-[#111726] border-t border-[#cbd5e1] dark:border-slate-800/80 rounded-t-2xl shadow-2xl p-4 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">More Pages</p>
            <button
              onClick={() => setMoreSheetOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {bottomNavMore.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMoreSheetOpen(false)}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl text-[10px] font-semibold transition-all ${
                    isActive
                      ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon size={20} />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      )}

      {/* Global Command & Search Palette */}
      <GlobalSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
      />

      {/* #2: Global Quick Add Modal — stays on current page */}
      <QuickTransactionModal
        isOpen={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        preset={null}
      />

      {/* #21: Keyboard Shortcuts Guide Modal */}
      <KeyboardShortcutsModal
        isOpen={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />
    </div>
  );
}
