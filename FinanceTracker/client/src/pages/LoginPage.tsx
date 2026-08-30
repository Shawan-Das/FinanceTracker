import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../api/client';
import toast from 'react-hot-toast';
import { Mail } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown > 0]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">💰 Finance Tracker</h1>
          <p className="text-gray-500 mt-2">Sign in to manage your finances</p>
        </div>

        <div className="card">
          {/* Lockout Warning */}
          {lockoutTimer > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-red-600 text-lg">🔒</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-red-800">Account Temporarily Locked</p>
                  <p className="text-sm text-red-600 mt-0.5">
                    Too many failed attempts. Try again in{' '}
                    <span className="font-mono font-bold">{formatLockoutTime(lockoutTimer)}</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Attempts Warning */}
          {attemptsRemaining !== null && attemptsRemaining > 0 && attemptsRemaining <= 3 && lockoutTimer <= 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800">
                ⚠️ <strong>{attemptsRemaining}</strong> attempt{attemptsRemaining !== 1 ? 's' : ''} remaining before account lockout.
              </p>
            </div>
          )}

          {/* Email Not Verified Banner */}
          {emailNotVerified && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <Mail size={20} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800">Email not verified</p>
                  <p className="text-sm text-amber-700 mt-1">
                    Please verify your email before logging in. Check your inbox for the verification code.
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={handleResendVerification}
                      disabled={resendCooldown > 0 || resendLoading}
                      className="text-sm font-medium text-amber-800 hover:text-amber-900 underline disabled:no-underline disabled:text-amber-500 disabled:cursor-not-allowed"
                    >
                      {resendCooldown > 0
                        ? `Resend in ${resendCooldown}s`
                        : resendLoading
                          ? 'Sending...'
                          : 'Resend verification code'
                      }
                    </button>
                    <span className="text-amber-500">·</span>
                    <Link to="/register" className="text-sm font-medium text-amber-800 hover:text-amber-900 underline">
                      Register again
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" placeholder="you@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                required autoFocus disabled={lockoutTimer > 0} />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" className="input" placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)}
                required disabled={lockoutTimer > 0} />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading || lockoutTimer > 0}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link to="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700">
              Forgot your password?
            </Link>
          </div>

          <p className="mt-3 text-center text-sm text-gray-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
