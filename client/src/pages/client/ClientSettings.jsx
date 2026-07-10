import React, { useState } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'react-toastify';
import { Eye, EyeOff, Settings, LogOut } from 'lucide-react';
import Button from '../../components/Button';
import { useTheme } from '../../context/ThemeContext';
import ThemeToggle from '../../components/ThemeToggle';
import LogoutModal from '../../components/LogoutModal';
import { useNavigate } from 'react-router-dom';

const ClientSettings = () => {
  const { logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  // Form states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Password visibility states
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Logout modal state
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('All password fields are required');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long');
      return;
    }

    // Recommended validation check: 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
    if (!passwordRegex.test(newPassword)) {
      toast.error('Password must contain uppercase, lowercase, and a number');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsUpdating(true);
    try {
      await api.put('/client/change-password', {
        currentPassword,
        newPassword
      });
      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error(error.response?.data?.message || 'Unable to update password');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      {/* Page Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-text-primary tracking-tight flex items-center gap-3">
          <Settings className="text-primary" /> Settings
        </h1>
        <p className="text-text-secondary mt-2 text-base md:text-lg">Manage your account preferences and login security.</p>
      </div>


      {/* Appearance */}
      <div className="card space-y-5 bg-surface-secondary border border-border rounded-2xl p-6 md:p-8">
        <div className="border-b border-border pb-4">
          <h2 className="section-heading text-xl">Appearance</h2>
        </div>
        <div className="flex items-center justify-between p-4 bg-surface-divider/50 border border-border rounded-xl">
          <div className="space-y-1 pr-4">
            <span className="text-sm font-semibold text-text-primary block">Theme</span>
            <span className="text-xs text-text-secondary">Switch between light and dark mode.</span>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setTheme('light')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${theme === 'light' ? 'bg-primary text-[var(--btn-primary-text)]' : 'border border-border text-text-secondary hover:bg-surface-hover'}`}>Light</button>
            <button type="button" onClick={() => setTheme('dark')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${theme === 'dark' ? 'bg-primary text-[var(--btn-primary-text)]' : 'border border-border text-text-secondary hover:bg-surface-hover'}`}>Dark</button>
            <ThemeToggle className="w-10 h-10" />
          </div>
        </div>
      </div>

      {/* 1. Security & Password Section */}
      <div className="card space-y-5 bg-surface-secondary border border-border rounded-2xl p-6 md:p-8 shadow-xl">
        <div className="border-b border-border pb-4">
          <h2 className="text-xl font-semibold text-text-primary">Security & Password</h2>
        </div>
        <form onSubmit={handlePasswordChange} className="space-y-6 max-w-xl">
          {/* Current Password */}
          <div className="space-y-1 block group">
            <span className="text-xs uppercase tracking-wider text-text-muted group-focus-within:text-primary transition-colors font-medium block">Current Password</span>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="input-field password-toggle-field w-full"
                disabled={isUpdating}
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-1 block group">
            <span className="text-xs uppercase tracking-wider text-text-muted group-focus-within:text-primary transition-colors font-medium block">New Password</span>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="input-field password-toggle-field w-full"
                disabled={isUpdating}
                required
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-[10px] text-text-muted mt-1">
              Password must be at least 6 characters, and contain uppercase, lowercase, and a number.
            </p>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1 block group">
            <span className="text-xs uppercase tracking-wider text-text-muted group-focus-within:text-primary transition-colors font-medium block">Confirm New Password</span>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="input-field password-toggle-field w-full"
                disabled={isUpdating}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" isLoading={isUpdating}>
              Update Password
            </Button>
          </div>
        </form>
      </div>

      {/* Account Actions */}
      <div className="card space-y-5 bg-surface-secondary border border-border rounded-2xl p-6 md:p-8 shadow-xl">
        <div className="border-b border-border pb-4">
          <h2 className="text-xl font-semibold text-text-primary">Account Actions</h2>
          <p className="text-sm text-text-muted mt-1">Manage your session and account access.</p>
        </div>
        <div className="flex items-center justify-between p-4 bg-surface-divider/50 border border-border/60 rounded-xl">
          <div className="space-y-1 pr-4">
            <span className="text-sm font-bold text-text-primary block">Sign Out</span>
            <span className="text-xs text-text-secondary">Securely logout from your account and end the current session.</span>
          </div>
          <button
            id="client-settings-logout-btn"
            type="button"
            onClick={() => setShowLogoutModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border"
            style={{
              color: '#ef4444',
              borderColor: 'rgba(239,68,68,0.3)',
              background: 'rgba(239,68,68,0.06)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.12)';
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.06)';
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)';
            }}
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <LogoutModal
        isOpen={showLogoutModal}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
      />
    </>
  );
};

export default ClientSettings;
