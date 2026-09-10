import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ThemeSelector from '../components/ThemeSelector';
import api from '../api';

export default function Settings() {
  const { user, preferences, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);
    try {
      await api.put('/auth/me', { name, currentPassword: currentPassword || undefined, newPassword: newPassword || undefined });
      if (name !== user.name) updateUser({ name });
      setMessage('Profile updated successfully');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setError(err.response?.data?.error || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This cannot be undone.')) return;
    try {
      await api.delete('/auth/me');
      logout();
      navigate('/login');
    } catch (err) {
      setError('Failed to delete account');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 anim-fade-rise">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="text-slate-500 mt-1 dark:text-slate-400">Manage your account</p>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 dark:text-white">Appearance</h2>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">Theme</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Pick a color scheme for the app</p>
          </div>
          <ThemeSelector />
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 dark:text-white">Subject Preferences</h2>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">Your subjects</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {(preferences?.subject_ids?.length || 0)} subject{(preferences?.subject_ids?.length || 0) === 1 ? '' : 's'} selected &middot;{' '}
              {preferences?.show_only_selected_subjects ? 'only showing your subjects' : 'showing all subjects'}
            </p>
          </div>
          <button
            onClick={() => navigate('/onboarding?edit=1')}
            className="btn-primary"
          >
            Edit Preferences
          </button>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 dark:text-white">Profile</h2>

        {message && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 dark:bg-green-500/10 dark:border-green-500/30 dark:text-green-400">{message}</div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-400">{error}</div>
        )}

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="input bg-slate-50 text-slate-500 cursor-not-allowed dark:bg-slate-800/60 dark:text-slate-400"
            />
          </div>
          <div>
            <label className="label">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Required to change password"
              className="input"
            />
          </div>
          <div>
            <label className="label">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Leave blank to keep current"
              className="input"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      <div className="card border-red-200 p-6 dark:border-red-500/30">
        <h2 className="text-lg font-semibold text-red-700 mb-2 dark:text-red-400">Danger Zone</h2>
        <p className="text-sm text-slate-500 mb-4 dark:text-slate-400">Once you delete your account, there is no going back.</p>
        <button
          onClick={handleDeleteAccount}
          className="px-6 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors"
        >
          Delete Account
        </button>
      </div>
    </div>
  );
}
