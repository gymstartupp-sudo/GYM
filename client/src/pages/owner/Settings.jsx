import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'react-toastify';
import { Eye, EyeOff, Settings as SettingsIcon } from 'lucide-react';
import Button from '../../components/Button';

const Settings = () => {
  const { user } = useAuth();

  // Gym settings state
  const [gym, setGym] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

  // Form states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Password visibility states
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const fetchGymSettings = async () => {
    try {
      const res = await api.get('/gym/profile');
      setGym(res.data.data.gym);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGymSettings();
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
      await api.put('/gym/change-password', {
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

  const handleTogglePartialPayment = async () => {
    if (isToggling || !gym) return;

    setIsToggling(true);
    try {
      const currentVal = gym.billingInfo?.allowPartialPayments !== false;
      const updatedBillingInfo = {
        ...gym.billingInfo,
        allowPartialPayments: !currentVal
      };

      await api.put('/gym/profile', {
        gymData: {
          billingInfo: updatedBillingInfo
        }
      });

      setGym((prev) => ({
        ...prev,
        billingInfo: updatedBillingInfo
      }));

      toast.success(
        `Partial payments are now ${!currentVal ? 'ENABLED' : 'DISABLED'}`
      );
    } catch (error) {
      console.error('Error updating billing settings:', error);
      toast.error('Failed to update billing settings');
    } finally {
      setIsToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex bg-dark h-screen overflow-hidden">
        <div className="flex-1 flex justify-center items-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 pt-10 space-y-8 scrollbar-hide">
      {/* Page Header */}
      <div>
        <h1 className="text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
          <SettingsIcon className="text-primary" /> Settings
        </h1>
        <p className="text-gray-400 mt-2 text-lg">Manage your gym platform options and security settings.</p>
      </div>



      {/* 1. Platform Billing Config Section */}
      <div className="card space-y-5 bg-gray-900 border border-gray-800 rounded-2xl p-6 md:p-8 shadow-xl">
        <div className="border-b border-gray-800 pb-4">
          <h2 className="text-xl font-semibold text-white">Platform Configurations</h2>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-800/20 border border-gray-800/60 rounded-xl">
          <div className="space-y-1 pr-4">
            <span className="text-sm font-bold text-white block">Allow Partial Payments</span>
            <span className="text-xs text-gray-400">If disabled, client payments must be paid in full; due date and installments will not be prompt.</span>
          </div>
          <button
            type="button"
            disabled={isToggling}
            onClick={handleTogglePartialPayment}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-gray-900 cursor-pointer ${(gym.billingInfo?.allowPartialPayments !== false) ? 'bg-primary' : 'bg-gray-700'
              } ${isToggling ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${(gym.billingInfo?.allowPartialPayments !== false) ? 'translate-x-5' : 'translate-x-0'
                }`}
            />
          </button>
        </div>
      </div>

      {/* 2. Security Section */}
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors cursor-pointer"
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors cursor-pointer"
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors cursor-pointer"
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
  );
};

export default Settings;
