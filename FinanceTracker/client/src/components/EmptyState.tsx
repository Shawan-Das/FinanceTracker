import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-4 shadow-sm">
        {icon || <Inbox size={28} />}
      </div>
      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">{title}</h3>
      {description && <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 max-w-xs">{description}</p>}
      {action}
    </div>
  );
}
