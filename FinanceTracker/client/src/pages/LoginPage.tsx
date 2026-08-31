import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../api/client';
import toast from 'react-hot-toast';
import ThemeToggle from '../components/ThemeToggle';
import { Mail, Lock, Eye, EyeOff, TrendingUp, ShieldCheck, PieChart, ArrowRight, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [lockoutTimer, setLockoutTimer] = useState(0);
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutTimer <= 0) return;
    const timer = setInterval(() => {
      setLockoutTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setAttemptsRemaining(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutTimer > 0]);

  const formatLockoutTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    setEmailNotVerified(false);
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (error: any) {
      const data = error.response?.data;
      const errCode = data?.error?.code;
      const errMsg = data?.error?.message || 'Login failed';

      if (errCode === 'ACCOUNT_LOCKED') {
        const seconds = data.error.remainingSeconds || data.error.lockDurationMinutes * 60 || 600;
        setLockoutTimer(seconds);
        setAttemptsRemaining(0);
        toast.error(errMsg);
      } else if (errCode === 'INVALID_CREDENTIALS') {
        const remaining = data.error?.attemptsRemaining;
        if (remaining !== undefined) {
          setAttemptsRemaining(remaining);
        }
        toast.error(errMsg);
      } else if (errCode === 'EMAIL_NOT_VERIFIED') {
        setEmailNotVerified(true);
        toast.error(errMsg + ' Check your inbox or resend the code.');
      } else {
        toast.error(errMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (resendCooldown > 0 || !email) return;
    setResendLoading(true);
    try {
      await authApi.resendVerification({ email });
      toast.success('Verification code sent! Check your inbox.');
      setResendCooldown(60);
    } catch {
      toast.error('Failed to resend verification code');
    } finally {
      setResendLoading(false);
    }
  };

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown > 0]);

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Left Column - Financial Hero Showcase (Hidden on Mobile/Tab) */}
      <div className="hidden lg:flex flex-1 relative bg-gradient-to-br from-slate-900 via-slate-950 to-brand-950 p-12 flex-col justify-between overflow-hidden border-r border-slate-800">
        {/* Background Ambient Glows */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-500 to-emerald-400 flex items-center justify-center text-white shadow-lg shadow-brand-500/30">
            <TrendingUp size={22} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Balqen
            </h1>
            <p className="text-xs font-medium text-slate-400">Next-Gen Financial Intelligence</p>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="relative z-10 max-w-lg space-y-8 my-auto">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/20 mb-4">
              <ShieldCheck className="w-3.5 h-3.5" /> 256-Bit Encrypted Platform
            </span>
            <h2 className="text-3xl font-extrabold text-white leading-tight tracking-tight">
              Master Your Money with Precision & Confidence
            </h2>
            <p className="mt-3 text-slate-400 text-sm leading-relaxed">
              Track net worth across multi-currency accounts, automate debt settlement schedules, and visualize cashflow trends with real-time analytics.
            </p>
          </div>

          {/* Quick Metrics Card Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-1">
                <TrendingUp className="w-4 h-4" /> Real-time Analytics
              </div>
              <p className="text-xs text-slate-400">Live transaction categorization & insights</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-brand-400 text-xs font-semibold mb-1">
                <PieChart className="w-4 h-4" /> Multi-Account Hub
              </div>
              <p className="text-xs text-slate-400">Consolidated banking & loan portfolios</p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 text-xs text-slate-500 flex items-center justify-between border-t border-slate-800/80 pt-4">
          <span>© 2026 Balqen Inc.</span>
          <div className="flex gap-4">
            <span className="hover:text-slate-400 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-slate-400 cursor-pointer">Terms of Service</span>
          </div>
        </div>
      </div>

      {/* Right Column - Login Form */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-12 lg:p-16 max-w-xl mx-auto w-full">
        {/* Top Header Row with Theme Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 lg:hidden">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center text-white">
              <TrendingUp size={18} strokeWidth={2.5} />
            </div>
            <span className="font-bold text-slate-900 dark:text-white">Balqen</span>
          </div>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>

        {/* Form Container */}
        <div className="my-auto py-8">
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Welcome back
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1">
              Please enter your credentials to access your financial dashboard.
            </p>
          </div>

          {/* Lockout Warning Banner */}
          {lockoutTimer > 0 && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-4 mb-6 animate-in fade-in duration-200">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/60 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                  <Lock size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-rose-900 dark:text-rose-200">Account Temporarily Locked</p>
                  <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                    Too many failed attempts. Try again in{' '}
                    <span className="font-mono font-bold text-rose-900 dark:text-rose-100">
                      {formatLockoutTime(lockoutTimer)}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Remaining Attempts Banner */}
          {attemptsRemaining !== null && attemptsRemaining > 0 && attemptsRemaining <= 3 && lockoutTimer <= 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-4 mb-6">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
                <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  <strong>{attemptsRemaining}</strong> attempt{attemptsRemaining !== 1 ? 's' : ''} remaining before account lockout.
                </span>
              </div>
            </div>
          )}

          {/* Email Not Verified Banner */}
          {emailNotVerified && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <Mail size={18} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-amber-900 dark:text-amber-200">Email Verification Required</p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    Please verify your email before logging in. Check your inbox for the code.
                  </p>
                  <div className="mt-2.5 flex items-center gap-3">
                    <button
                      onClick={handleResendVerification}
                      disabled={resendCooldown > 0 || resendLoading}
                      className="text-xs font-semibold text-amber-900 dark:text-amber-200 hover:underline disabled:no-underline disabled:opacity-50"
                    >
                      {resendCooldown > 0
                        ? `Resend in ${resendCooldown}s`
                        : resendLoading
                        ? 'Sending...'
                        : 'Resend code'}
                    </button>
                    <span className="text-amber-400">·</span>
                    <Link to="/register" className="text-xs font-semibold text-amber-900 dark:text-amber-200 hover:underline">
                      Register again
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  className="input pl-10"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  disabled={lockoutTimer > 0}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label mb-0">Password</label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pl-10 pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={lockoutTimer > 0}
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

            <button
              type="submit"
              className="btn-primary w-full py-3 text-sm font-semibold shadow-lg shadow-brand-500/20"
              disabled={loading || lockoutTimer > 0}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Authenticating...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <span>Sign In to Portal</span>
                  <ArrowRight size={16} />
                </div>
              )}
            </button>
          </form>

          {/* Registration Footer Prompt */}
          <div className="mt-8 text-center pt-6 border-t border-slate-100 dark:border-slate-800/80">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Don't have an account yet?{' '}
              <Link to="/register" className="font-bold text-brand-600 dark:text-brand-400 hover:underline">
                Create an account
              </Link>
            </p>
          </div>
        </div>

        <div className="text-center text-[11px] text-slate-400 dark:text-slate-600">
          Protected by enterprise security & 2FA support.
        </div>
      </div>
    </div>
  );
}
