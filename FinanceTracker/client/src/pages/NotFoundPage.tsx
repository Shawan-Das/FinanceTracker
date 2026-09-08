import { useNavigate } from 'react-router-dom';
import { FileQuestion, Home, ArrowLeft, Search } from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#dee5ee] dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100">
      <div className="card max-w-md w-full p-8 text-center space-y-6 shadow-2xl border border-[#cbd5e1] dark:border-slate-800 bg-[#f4f7fa] dark:bg-[#111726]">
        {/* Icon & Code Badge */}
        <div className="relative mx-auto w-20 h-20 rounded-3xl bg-brand-500/10 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center shadow-inner">
          <FileQuestion size={42} />
          <span className="absolute -top-1.5 -right-1.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white shadow-sm">
            404
          </span>
        </div>

        {/* Heading & Context */}
        <div className="space-y-2">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Page Not Found
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
            The financial route or resource you are looking for has moved, been archived, or does not exist.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          <button
            onClick={() => navigate('/')}
            className="btn-primary w-full py-2.5 text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-brand-500/20 cursor-pointer"
          >
            <Home size={15} />
            <span>Return to Dashboard</span>
          </button>

          <button
            onClick={() => navigate(-1)}
            className="btn-secondary w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft size={15} />
            <span>Go Back to Previous Page</span>
          </button>
        </div>

        {/* Brand footer */}
        <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800/80 text-[11px] text-slate-400">
          BALQEN Finance &amp; Ledger Ecosystem
        </div>
      </div>
    </div>
  );
}
