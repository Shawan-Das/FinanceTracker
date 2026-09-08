import Modal from './Modal';
import { Command, PlusCircle, HelpCircle, ArrowUpDown, CornerDownLeft, X, Laptop } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
  icon: typeof Command;
  category: 'Global' | 'Navigation' | 'Actions';
}

const SHORTCUTS: ShortcutItem[] = [
  {
    keys: ['Ctrl', 'K'],
    description: 'Open Global Command & Search palette',
    icon: Command,
    category: 'Global',
  },
  {
    keys: ['N'],
    description: 'Record a New Transaction in-context',
    icon: PlusCircle,
    category: 'Actions',
  },
  {
    keys: ['?'],
    description: 'Open this Keyboard Shortcuts cheat-sheet',
    icon: HelpCircle,
    category: 'Global',
  },
  {
    keys: ['↑', '↓'],
    description: 'Navigate up/down in search results',
    icon: ArrowUpDown,
    category: 'Navigation',
  },
  {
    keys: ['Enter'],
    description: 'Select highlighted item in search',
    icon: CornerDownLeft,
    category: 'Navigation',
  },
  {
    keys: ['ESC'],
    description: 'Close active modal, drawer, or search palette',
    icon: X,
    category: 'Navigation',
  },
];

export default function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  const categories = ['Global', 'Actions', 'Navigation'] as const;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="⌨️ Keyboard Shortcuts"
      maxWidth="max-w-lg"
    >
      <div className="space-y-5">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Supercharge your accounting workflow with these high-efficiency keyboard controls.
        </p>

        <div className="space-y-4">
          {categories.map((cat) => {
            const items = SHORTCUTS.filter((s) => s.category === cat);
            if (items.length === 0) return null;
            return (
              <div key={cat} className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                  {cat} Shortcuts
                </p>
                <div className="space-y-1.5">
                  {items.map((shortcut, i) => {
                    const Icon = shortcut.icon;
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/80 text-xs"
                      >
                        <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                          <Icon size={15} className="text-brand-500 shrink-0" />
                          <span className="font-medium">{shortcut.description}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {shortcut.keys.map((k, ki) => (
                            <kbd
                              key={ki}
                              className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200 shadow-xs"
                            >
                              {k}
                            </kbd>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-3 rounded-xl bg-brand-50/60 dark:bg-brand-950/30 border border-brand-200/60 dark:border-brand-900/50 flex items-center justify-between text-[11px] text-brand-700 dark:text-brand-300">
          <span className="flex items-center gap-1.5 font-medium">
            <Laptop size={14} /> Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 font-bold">?</kbd> anywhere to re-open this guide.
          </span>
          <button
            onClick={onClose}
            className="font-bold underline hover:text-brand-900 dark:hover:text-brand-100"
          >
            Got it
          </button>
        </div>
      </div>
    </Modal>
  );
}
