import { AlertTriangle, RefreshCw } from 'lucide-react';

interface QueryErrorProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export default function QueryError({
  title = 'Something went wrong',
  message = 'Failed to load financial data. Please try again.',
  onRetry,
}: QueryErrorProps) {
  return (
    <div className="card p-8 flex flex-col items-center justify-center text-center max-w-md mx-auto my-6 border-rose-200/60 dark:border-rose-900/40 bg-rose-50/20 dark:bg-rose-950/10">
      <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center mb-4 text-rose-600 dark:text-rose-400 shadow-sm">
        <AlertTriangle size={24} />
      </div>
      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">{title}</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary inline-flex items-center gap-2 text-xs">
          <RefreshCw size={14} />
          <span>Try Again</span>
        </button>
      )}
    </div>
  );
}
