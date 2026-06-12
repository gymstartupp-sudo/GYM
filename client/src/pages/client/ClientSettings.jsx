import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'react-toastify';
import { Menu, X, Eye, EyeOff, Settings } from 'lucide-react';
import Button from '../../components/Button';
import ClientSidebar from '../../components/ClientSidebar';

const ClientSettings = () => {
  const { user } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Form states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Password visibility states
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) {
        setIsSidebarOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    <div className={`flex bg-dark h-screen overflow-hidden ${isMobile ? 'flex-col' : 'flex-row'}`}>
      {/* MOBILE HEADER BAR */}
      {isMobile && (
        <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 z-40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent flex justify-center items-center font-bold text-sm text-white shadow-md">
              {user?.avatar || 'C'}
            </div>
            <div>
              <span className="text-white font-bold text-base tracking-tight truncate max-w-[120px] inline-block">{user?.personalInfo?.name}</span>
              <span className="text-xs text-gray-500 block -mt-1 uppercase tracking-wider truncate max-w-[120px]">{user?.gymName}</span>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 border border-gray-700 rounded-lg text-white hover:bg-gray-800 transition-colors"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </header>
      )}

      {/* MOBILE DRAWER BACKDROP */}
      {isMobile && isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-45 transition-opacity"
        />
      )}

      <ClientSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} isMobile={isMobile} />

      <div className="flex-1 overflow-y-auto p-4 md:p-8 md:pt-10 space-y-8 scrollbar-hide">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <Settings className="text-primary" /> Settings
          </h1>
          <p className="text-gray-400 mt-2 text-base md:text-lg">Manage your account preferences and login security.</p>
        </div>


        {/* 1. Security & Password Section */}
        <div className="card space-y-5 bg-gray-900 border border-gray-800 rounded-2xl p-6 md:p-8 shadow-xl">
          <div className="border-b border-gray-800 pb-4">
            <h2 className="text-xl font-semibold text-white">Security & Password</h2>
          </div>
          <form onSubmit={handlePasswordChange} className="space-y-6 max-w-xl">
            {/* Current Password */}
            <div className="space-y-1 block group">
              <span className="text-xs uppercase tracking-wider text-gray-500 group-focus-within:text-primary transition-colors font-medium block">Current Password</span>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="input-field w-full pr-10"
                  disabled={isUpdating}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                >
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-1 block group">
              <span className="text-xs uppercase tracking-wider text-gray-500 group-focus-within:text-primary transition-colors font-medium block">New Password</span>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="input-field w-full pr-10"
                  disabled={isUpdating}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-[10px] text-gray-500 mt-1">
                Password must be at least 6 characters, and contain uppercase, lowercase, and a number.
              </p>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1 block group">
              <span className="text-xs uppercase tracking-wider text-gray-500 group-focus-within:text-primary transition-colors font-medium block">Confirm New Password</span>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="input-field w-full pr-10"
                  disabled={isUpdating}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
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
      </div>
    </div>
  );
};

export default ClientSettings;
