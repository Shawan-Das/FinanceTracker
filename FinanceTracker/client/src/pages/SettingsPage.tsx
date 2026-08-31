import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme, Theme } from '../contexts/ThemeContext';
import { authApi } from '../api/client';
import toast from 'react-hot-toast';
import { User, Lock, Save, Sun, Moon, Monitor, ShieldCheck, KeyRound, Eye, EyeOff } from 'lucide-react';
import { formatDateDMY } from '../utils/format';

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'profile' | 'theme' | 'password'>('profile');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setPasswordLoading(true);
    try {
      await authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      toast.success('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const message = err.response?.data?.error?.message || 'Failed to change password';
      toast.error(message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const themeOptions: { value: Theme; title: string; desc: string; icon: typeof Sun }[] = [
    { value: 'light', title: 'Light Mode', desc: 'Clean slate backdrop with crisp borders', icon: Sun },
    { value: 'dark', title: 'Dark Mode', desc: 'Sleek dark zinc layout tailored for night viewing', icon: Moon },
    { value: 'system', title: 'System Default', desc: 'Automatically match operating system preferences', icon: Monitor },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          Account & App Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Manage profile details, theme preferences, and security credentials.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-slate-200/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 max-w-md">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'profile'
              ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <User size={14} /> Profile
        </button>
        <button
          onClick={() => setActiveTab('theme')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'theme'
              ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <Sun size={14} /> Theme
        </button>
        <button
          onClick={() => setActiveTab('password')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'password'
              ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <Lock size={14} /> Password
        </button>
      </div>

      {/* Profile Card */}
      {activeTab === 'profile' && (
        <div className="card p-6 max-w-lg space-y-6">
          <div className="flex items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white text-xl font-extrabold shadow-md">
              {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{user?.full_name}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 mt-1 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                <ShieldCheck size={12} /> Verified Account
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input
                type="text"
                className="input bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold cursor-not-allowed"
                value={user?.full_name || ''}
                disabled
              />
            </div>
            <div>
              <label className="label">Email Address</label>
              <input
                type="email"
                className="input bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold cursor-not-allowed"
                value={user?.email || ''}
                disabled
              />
            </div>
            <div>
              <label className="label">Base Currency</label>
              <input
                type="text"
                className="input bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold cursor-not-allowed"
                value={user?.default_currency || 'BDT (৳)'}
                disabled
              />
            </div>
            <div>
              <label className="label">Registration Date</label>
              <input
                type="text"
                className="input bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold cursor-not-allowed"
                value={user?.created_at ? formatDateDMY(user.created_at) : 'N/A'}
                disabled
              />
            </div>
          </div>
        </div>
      )}

      {/* Theme Selection Card */}
      {activeTab === 'theme' && (
        <div className="card p-6 max-w-lg space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Appearance & Theme</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Select your preferred color theme across the application.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {themeOptions.map(({ value, title, desc, icon: Icon }) => (
              <div
                key={value}
                onClick={() => setTheme(value)}
                className={`flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${
                  theme === value
                    ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/40 ring-2 ring-brand-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/40'
                }`}
              >
                <div className={`p-2.5 rounded-xl ${
                  theme === value
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">{title}</h3>
                    {theme === value && (
                      <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Password Change Card */}
      {activeTab === 'password' && (
        <div className="card p-6 max-w-lg space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold">
              <KeyRound size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Update Credentials</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Ensure your account uses a strong password.</p>
            </div>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="label">Current Password</label>
              <input
                type="password"
                className="input"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="Min. 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Must include uppercase, lowercase, and a number.</p>
            </div>

            <div>
              <label className="label">Confirm New Password</label>
              <input
                type="password"
                className="input"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            <button
              type="submit"
              className="btn-primary w-full text-xs py-2.5 font-semibold shadow-md shadow-brand-500/20"
              disabled={passwordLoading}
            >
              <Save size={15} />
              <span>{passwordLoading ? 'Updating Password...' : 'Save New Password'}</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
