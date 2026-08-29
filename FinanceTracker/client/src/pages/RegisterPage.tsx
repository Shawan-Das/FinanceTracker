import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../api/client';
import toast from 'react-hot-toast';

type Step = 'register' | 'verify';

export default function RegisterPage() {
  const { register, checkAuth } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('register');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
      }
    };
  }, []);

  // Start cooldown timer
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
      // Fetch the real user data now that the session is set server-side
      await checkAuth();
      toast.success('Email verified! Welcome to Finance Tracker.');
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">💰 Finance Tracker</h1>
          <p className="text-gray-500 mt-2">
            {step === 'register' ? 'Create your account' : 'Verify your email'}
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className={`flex items-center gap-2 ${step === 'register' ? 'text-primary-600' : 'text-green-600'}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold
              ${step === 'register' ? 'bg-primary-100 text-primary-700' : 'bg-green-100 text-green-700'}`}>
              {step === 'register' ? '1' : '✓'}
            </div>
            <span className="text-sm font-medium">Register</span>
          </div>
          <div className="w-8 h-px bg-gray-300" />
          <div className={`flex items-center gap-2 ${step === 'verify' ? 'text-primary-600' : 'text-gray-400'}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold
              ${step === 'verify' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'}`}>
              2
            </div>
            <span className="text-sm font-medium">Verify</span>
          </div>
        </div>

        <div className="card">
          {step === 'register' ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="label">Full Name</label>
                <input type="text" className="input" placeholder="John Doe" value={fullName}
                  onChange={(e) => setFullName(e.target.value)} required autoFocus />
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" placeholder="you@example.com" value={email}
                  onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="label">Password</label>
                <input type="password" className="input" placeholder="Min. 8 characters" value={password}
                  onChange={(e) => setPassword(e.target.value)} required />
                <p className="text-xs text-gray-500 mt-1">Must include uppercase, lowercase, and a number</p>
              </div>
              <div>
                <label className="label">Confirm Password</label>
                <input type="password" className="input" placeholder="Re-enter password" value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)} required />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                <p className="font-medium">Verification code sent!</p>
                <p className="mt-1">We sent a 6-digit code to <strong>{email}</strong></p>
              </div>

              <div>
                <label className="label">Verification Code</label>
                <input type="text" className="input text-center text-2xl tracking-[0.5em] font-mono"
                  placeholder="000000" maxLength={6}
                  value={verificationCode} onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  required autoFocus />
              </div>

              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify Email'}
              </button>

              <div className="text-center">
                <button type="button" onClick={handleResend}
                  disabled={resendCooldown > 0}
                  className="text-sm text-primary-600 hover:text-primary-700 disabled:text-gray-400 disabled:cursor-not-allowed">
                  {resendCooldown > 0
                    ? `Resend code in ${resendCooldown}s`
                    : 'Didn\'t receive the code? Resend'}
                </button>
              </div>
            </form>
          )}

          <p className="mt-4 text-center text-sm text-gray-500">
            {step === 'register' ? (
              <>Already have an account? <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">Sign In</Link></>
            ) : (
              <button onClick={() => setStep('register')} className="text-primary-600 hover:text-primary-700 font-medium">
                ← Back to registration
              </button>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
