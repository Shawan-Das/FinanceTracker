import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { authApi } from '../api/client';
import toast from 'react-hot-toast';
import ThemeToggle from '../components/ThemeToggle';
import { Lock, ArrowLeft, CheckCircle2, TrendingUp, KeyRound, Eye, EyeOff } from 'lucide-react';

export default function ResetPasswordPage() {
  const location = useLocation();
  const prefillEmail = (location.state as any)?.email || '';

  const [email, setEmail] = useState(prefillEmail);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !code || !password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword({ email, code, password, confirm_password: confirmPassword });
      setSuccess(true);
      toast.success('Password reset successfully!');
    } catch (error: any) {
      const msg = error.response?.data?.error?.message || 'Password reset failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 p-4 transition-colors duration-200">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center text-white shadow-md">
              <TrendingUp size={20} strokeWidth={2.5} />
            </div>
            <span className="font-bold text-lg text-slate-900 dark:text-white">Balqen</span>
          </div>
          <ThemeToggle />
        </div>

        <div className="card p-6 sm:p-8 shadow-xl">
          {success ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 size={30} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Password Updated!</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Your credentials have been securely updated. You can now sign in with your new password.
              </p>
              <div className="pt-4">
                <Link
                  to="/login"
                  className="btn-primary w-full py-2.5 text-xs font-semibold shadow-md shadow-brand-500/20"
                >
                  Proceed to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-6">
                <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-4">
                  <KeyRound size={24} />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create new password</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Enter your reset passcode and choose a new password.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Target Email</label>
                  <input
                    type="email"
                    className="input bg-slate-100 dark:bg-slate-800/60 text-slate-500 cursor-not-allowed"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="label">Reset Passcode</label>
                  <input
                    type="text"
                    className="input text-center text-xl tracking-[0.4em] font-mono font-bold py-2.5"
                    placeholder="000000"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="label">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="input pl-10 pr-10"
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="label">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="password"
                      className="input pl-10"
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-primary w-full py-2.5 text-xs font-semibold shadow-md shadow-brand-500/20"
                  disabled={loading}
                >
                  {loading ? 'Updating Password...' : 'Reset Password'}
                </button>
              </form>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  <ArrowLeft size={14} /> Back to Sign In
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
