import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../api/client';
import toast from 'react-hot-toast';
import { User, Lock, Save } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">Manage your account settings</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2
            ${activeTab === 'profile'
              ? 'bg-primary-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
            }`}
        >
          <User size={16} /> Profile
        </button>
        <button
          onClick={() => setActiveTab('password')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2
            ${activeTab === 'password'
              ? 'bg-primary-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
            }`}
        >
          <Lock size={16} /> Change Password
        </button>
      </div>

      {/* Profile */}
      {activeTab === 'profile' && (
        <div className="card max-w-lg">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input type="text" className="input bg-gray-50" value={user?.full_name || ''} disabled />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input bg-gray-50" value={user?.email || ''} disabled />
            </div>
            <div>
              <label className="label">Default Currency</label>
              <input type="text" className="input bg-gray-50" value={user?.default_currency || 'BDT'} disabled />
            </div>
            <div>
              <label className="label">Member Since</label>
              <input type="text" className="input bg-gray-50"
                value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : ''} disabled />
            </div>
          </div>
        </div>
      )}

      {/* Password Change */}
      {activeTab === 'password' && (
        <div className="card max-w-lg">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h2>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="label">Current Password</label>
              <input type="password" className="input" placeholder="Enter current password"
                value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
            </div>
            <div>
              <label className="label">New Password</label>
              <input type="password" className="input" placeholder="Enter new password"
                value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required
                minLength={8} />
              <p className="text-xs text-gray-500 mt-1">
                Must be at least 8 characters with uppercase, lowercase, and a number.
              </p>
            </div>
            <div>
              <label className="label">Confirm New Password</label>
              <input type="password" className="input" placeholder="Confirm new password"
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
                minLength={8} />
            </div>
            <button type="submit" className="btn-primary flex items-center gap-2" disabled={passwordLoading}>
              <Save size={16} />
              {passwordLoading ? 'Saving...' : 'Change Password'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
