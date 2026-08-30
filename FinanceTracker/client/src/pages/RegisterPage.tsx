import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../api/client';
import toast from 'react-hot-toast';
import ThemeToggle from '../components/ThemeToggle';
import { Mail, Lock, User, Eye, EyeOff, TrendingUp, ShieldCheck, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';

type Step = 'register' | 'verify';

export default function RegisterPage() {
  const { register, checkAuth } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('register');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
      }
    };
  }, []);

  const startCooldown = () => {
    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current);
    }
    setResendCooldown(60);
    cooldownTimerRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownTimerRef.current) {
            clearInterval(cooldownTimerRef.current);
            cooldownTimerRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password || !confirmPassword) {
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
      await register(fullName, email, password, confirmPassword);
      toast.success('Account created! Check your email for a verification code.');
      setStep('verify');
      startCooldown();
    } catch (error: any) {
      const msg = error.response?.data?.error?.message || 'Registration failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Please enter the 6-digit verification code');
      return;
    }
    setLoading(true);
    try {
      await authApi.verifyEmail({ email, code: verificationCode });
      await checkAuth();
      toast.success('Email verified! Welcome to FinanceFlow.');
      navigate('/');
    } catch (error: any) {
      const msg = error.response?.data?.error?.message || 'Verification failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      await authApi.resendVerification({ email });
      toast.success('A new verification code has been sent to your email.');
      startCooldown();
    } catch (error: any) {
      toast.error('Failed to resend code');
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Left Column Hero (Desktop) */}
      <div className="hidden lg:flex flex-1 relative bg-gradient-to-br from-slate-900 via-slate-950 to-brand-950 p-12 flex-col justify-between overflow-hidden border-r border-slate-800">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-500 to-emerald-400 flex items-center justify-center text-white shadow-lg shadow-brand-500/30">
            <TrendingUp size={22} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Finance<span className="text-brand-400">Flow</span>
            </h1>
            <p className="text-xs font-medium text-slate-400">Next-Gen Financial Intelligence</p>
          </div>
        </div>

        <div className="relative z-10 max-w-lg space-y-6 my-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" /> Start Your Financial Journey
          </span>
          <h2 className="text-3xl font-extrabold text-white leading-tight">
            Join Thousands Building Wealth Smarter
          </h2>

          <div className="space-y-3 pt-2">
            {[
              'Unified multi-currency account management',
              'Automated monthly budget cap notifications',
              'Debt & loan repayment amortization tools',
              'Export-ready CSV & PDF financial reports',
            ].map((text, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-xs text-slate-500 flex items-center justify-between border-t border-slate-800/80 pt-4">
          <span>© 2026 FinanceFlow Inc.</span>
          <span>Bank-grade 256-bit encryption</span>
        </div>
      </div>

      {/* Right Column Form */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-12 lg:p-16 max-w-xl mx-auto w-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 lg:hidden">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center text-white">
              <TrendingUp size={18} strokeWidth={2.5} />
            </div>
            <span className="font-bold text-slate-900 dark:text-white">FinanceFlow</span>
          </div>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>

        <div className="my-auto py-8">
          <div className="mb-6">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {step === 'register' ? 'Create your account' : 'Verify your email'}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1">
              {step === 'register'
                ? 'Get started with your free financial tracking dashboard.'
                : `We sent a 6-digit verification code to ${email}`}
            </p>
          </div>

          {/* Stepper Progress */}
          <div className="flex items-center gap-3 mb-6 p-2 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80">
            <div className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-bold transition-all ${
              step === 'register'
                ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400'
            }`}>
              <span className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-[10px]">1</span>
              <span>Account Setup</span>
            </div>
            <div className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-bold transition-all ${
              step === 'verify'
                ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-400 dark:text-slate-500'
            }`}>
              <span className="w-5 h-5 rounded-full bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center text-[10px]">2</span>
              <span>Email Verification</span>
            </div>
          </div>

          {step === 'register' ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="label">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    className="input pl-10"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="label">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="email"
                    className="input pl-10"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label">Password</label>
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
                <p className="text-[11px] text-slate-400 mt-1">Must contain uppercase, lowercase, and a number.</p>
              </div>

              <div>
                <label className="label">Confirm Password</label>
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
                className="btn-primary w-full py-3 text-sm font-semibold shadow-lg shadow-brand-500/20"
                disabled={loading}
              >
                {loading ? 'Creating Account...' : 'Continue to Verification'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="p-4 rounded-2xl bg-brand-50/50 dark:bg-brand-950/30 border border-brand-200/60 dark:border-brand-900/60 text-xs text-brand-900 dark:text-brand-200">
                <p className="font-semibold">Verification Code Sent!</p>
                <p className="mt-1">Enter the 6-digit passcode delivered to <strong>{email}</strong>.</p>
              </div>

              <div>
                <label className="label">6-Digit Code</label>
                <input
                  type="text"
                  className="input text-center text-2xl tracking-[0.5em] font-mono font-bold py-3"
                  placeholder="000000"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className="btn-primary w-full py-3 text-sm font-semibold shadow-lg shadow-brand-500/20"
                disabled={loading}
              >
                {loading ? 'Verifying...' : 'Complete Registration'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0}
                  className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline disabled:opacity-50 disabled:no-underline"
                >
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Didn't get code? Resend"}
                </button>
              </div>
            </form>
          )}

          <div className="mt-8 text-center pt-6 border-t border-slate-100 dark:border-slate-800/80">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-brand-600 dark:text-brand-400 hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
