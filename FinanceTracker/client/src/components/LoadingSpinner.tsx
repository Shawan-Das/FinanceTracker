export default function LoadingSpinner({ message = 'Loading financial records...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="relative flex items-center justify-center mb-4">
        <div className="w-10 h-10 rounded-full border-2 border-brand-200 dark:border-brand-900 border-t-brand-600 dark:border-t-brand-400 animate-spin" />
        <div className="absolute w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
      </div>
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wide uppercase">{message}</p>
    </div>
  );
}
