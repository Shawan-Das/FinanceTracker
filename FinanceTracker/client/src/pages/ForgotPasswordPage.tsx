import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/client';
import toast from 'react-hot-toast';
import { Mail, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
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

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md text-center">
          <div className="card">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <Mail size={32} className="text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Check Your Email</h2>
            <p className="text-sm text-gray-500 mb-6">
              If an account with <strong>{email}</strong> exists, we've sent a password reset code.
              Check your inbox and spam folder.
            </p>
            <Link to="/reset-password" state={{ email }} className="btn-primary w-full inline-block">
              Enter Reset Code
            </Link>
            <p className="mt-4 text-sm text-gray-500">
              <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium flex items-center justify-center gap-1">
                <ArrowLeft size={14} /> Back to login
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">💰 Finance Tracker</h1>
          <p className="text-gray-500 mt-2">Reset your password</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <input type="email" className="input" placeholder="you@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
              <p className="text-xs text-gray-500 mt-1">
                Enter the email you used to register. We'll send you a reset code.
              </p>
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Code'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-500">
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium flex items-center justify-center gap-1">
              <ArrowLeft size={14} /> Back to login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
