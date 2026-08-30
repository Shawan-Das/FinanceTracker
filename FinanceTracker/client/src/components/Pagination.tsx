import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Pagination as PaginationType } from '../types';

interface PaginationProps {
  pagination: PaginationType;
  onPageChange: (page: number) => void;
}

export default function Pagination({ pagination, onPageChange }: PaginationProps) {
  const { page, totalPages, total } = pagination;

  if (totalPages <= 1) return null;

  const getVisiblePages = () => {
    const pages: (number | string)[] = [];
    const delta = 1;
    const left = Math.max(2, page - delta);
    const right = Math.min(totalPages - 1, page + delta);

    pages.push(1);
    if (left > 2) pages.push('...');
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < totalPages - 1) pages.push('...');
    if (totalPages > 1) pages.push(totalPages);

    return pages;
  };

  const startRecord = (page - 1) * pagination.limit + 1;
  const endRecord = Math.min(page * pagination.limit, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 dark:border-slate-800/80">
      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
        Showing <span className="font-semibold text-slate-900 dark:text-slate-100">{startRecord}</span> to{' '}
        <span className="font-semibold text-slate-900 dark:text-slate-100">{endRecord}</span> of{' '}
        <span className="font-semibold text-slate-900 dark:text-slate-100">{total}</span> items
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>
        {getVisiblePages().map((p, i) => (
          <button
            key={i}
            onClick={() => typeof p === 'number' && onPageChange(p)}
            disabled={typeof p !== 'number'}
            className={`w-8 h-8 rounded-xl text-xs font-semibold transition-all ${
              typeof p !== 'number'
                ? 'cursor-default text-slate-400 dark:text-slate-600'
                : p === page
                ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/30'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
