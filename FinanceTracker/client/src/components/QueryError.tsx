import { AlertTriangle, RefreshCw } from 'lucide-react';

interface QueryErrorProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export default function QueryError({
  title = 'Something went wrong',
  message = 'Failed to load data. Please try again.',
  onRetry,
}: QueryErrorProps) {
  return (
    <div className="card flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
        <AlertTriangle size={24} className="text-red-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 mb-4 max-w-md">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary inline-flex items-center gap-2">
          <RefreshCw size={14} />
          Try Again
        </button>
      )}
    </div>
  );
}
