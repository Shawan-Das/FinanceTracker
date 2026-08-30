import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api/client';
import toast from 'react-hot-toast';
import ThemeToggle from '../components/ThemeToggle';
import { Mail, ArrowLeft, TrendingUp, KeyRound, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email');
      return;
    }
    setLoading(true);
    try {
      await authApi.forgotPassword({ email });
      setSent(true);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 p-4 transition-colors duration-200">
      <div className="w-full max-w-md">
        {/* Header Row */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center text-white shadow-md">
              <TrendingUp size={20} strokeWidth={2.5} />
            </div>
            <span className="font-bold text-lg text-slate-900 dark:text-white">FinanceFlow</span>
          </div>
          <ThemeToggle />
        </div>

        {/* Card */}
        <div className="card p-6 sm:p-8 shadow-xl">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 size={30} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Reset Code Dispatched</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
                If an account associated with <strong className="text-slate-800 dark:text-slate-200">{email}</strong> exists, you will receive a 6-digit passcode shortly.
              </p>
              <div className="pt-4 space-y-3">
                <Link
                  to="/reset-password"
                  state={{ email }}
                  className="btn-primary w-full py-2.5 text-xs font-semibold shadow-md shadow-brand-500/20"
                >
                  Enter Passcode & Reset Password
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  <ArrowLeft size={14} /> Back to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-6">
                <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-4">
                  <KeyRound size={24} />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Reset your password</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Enter your account email to receive a password reset code.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Registered Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="email"
                      className="input pl-10"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-primary w-full py-2.5 text-xs font-semibold shadow-md shadow-brand-500/20"
                  disabled={loading}
                >
                  {loading ? 'Sending Code...' : 'Send Reset Code'}
                </button>
              </form>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  <ArrowLeft size={14} /> Return to Sign In
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
