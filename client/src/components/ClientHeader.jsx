import React, { useState, useEffect, useRef } from 'react';
import { Bell, LogOut, Sunrise, Sun, Sunset, Moon, X, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import ThemeToggle from './ThemeToggle';
import LogoutModal from './LogoutModal';

const HEADER_BG = 'var(--header-bg)';
const HEADER_BORDER = 'var(--header-border)';

/**
 * ClientHeader — Global top navigation bar for client dashboard pages.
 * Shows: Brand | Client Name  ···  [Bell] [Profile Avatar]
 */
const ClientHeader = ({ clientName = 'Member', clientEmail = '', isMobile = false }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [notifCount] = useState(0); // Future: connect to real notifications
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const clientAvatar = clientName.charAt(0).toUpperCase();

  const handleProfileClick = () => {
    setShowProfileDropdown(prev => !prev);
  };

  const handleLogout = () => {
    setShowLogoutModal(false);
    logout();
    navigate('/login');
  };

  const getGreetingData = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return { text: 'Good morning', icon: <Sunrise size={16} className="text-amber-500 animate-bounce" style={{ animationDuration: '3s' }} /> };
    }
    if (hour >= 12 && hour < 17) {
      return { text: 'Good afternoon', icon: <Sun size={16} className="text-amber-500 animate-spin" style={{ animationDuration: '10s' }} /> };
    }
    if (hour >= 17 && hour < 22) {
      return { text: 'Good evening', icon: <Sunset size={16} className="text-orange-400" /> };
    }
    return { text: 'Good night', icon: <Moon size={16} className="text-indigo-400" /> };
  };

  const greetingData = getGreetingData();

  if (isMobile) return null; // Mobile already has its own header in each client page

  return (
    <>
    <header
      className="h-[64px] flex items-center justify-between px-6 shrink-0 z-30"
      style={{
        background: HEADER_BG,
        borderBottom: `1px solid ${HEADER_BORDER}`,
      }}
    >
      <div className="flex items-center gap-2 text-sm font-medium text-text-secondary select-none animate-in fade-in slide-in-from-left-2 duration-300">
        {greetingData.icon}
        <span>
          {greetingData.text}, <span className="font-bold text-text-primary">{clientName}</span>
        </span>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle className="w-9 h-9" size={16} />

        {/* Notification Bell */}
        <button
          id="client-notification-btn"
          className="relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200"
          style={{ color: 'var(--text-muted)', border: '1px solid transparent' }}
          title="Notifications"
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-hover)';
            e.currentTarget.style.borderColor = 'var(--border-color)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-muted)';
          }}
        >
          <Bell size={18} />
          {notifCount > 0 && (
            <span
              className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
              style={{ background: '#ef4444', color: '#fff' }}
            >
              {notifCount > 9 ? '9+' : notifCount}
            </span>
          )}
        </button>

        {/* Divider */}
        <div className="w-px h-6 mx-1" style={{ background: 'var(--border-color)' }} />

        {/* Profile Avatar & Dropdown Container */}
        <div className="relative" ref={profileRef}>
          <button
            id="client-profile-btn"
            onClick={handleProfileClick}
            className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm transition-all duration-200 shadow-md"
            style={{
              background: showProfileDropdown ? 'var(--bg-hover)' : 'linear-gradient(135deg, #10B981, #059669)',
              color: '#FFFFFF',
              boxShadow: '0 2px 8px rgba(16,185,129,0.35)',
              border: showProfileDropdown ? '1px solid var(--border-color)' : 'none',
            }}
            title={`${clientName} — Profile Menu`}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.06)';
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(16,185,129,0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(16,185,129,0.35)';
            }}
          >
            {clientAvatar}
          </button>

          {/* Chrome-style Dropdown Menu */}
          {showProfileDropdown && (
            <div
              className="absolute right-0 top-12 w-[320px] rounded-2xl border shadow-2xl z-50 p-6 animate-in fade-in slide-in-from-top-2 duration-200"
              style={{
                borderColor: 'var(--border-color)',
                background: 'var(--bg-elevated)',
              }}
            >
              {/* Close Button */}
              <button
                onClick={() => setShowProfileDropdown(false)}
                className="absolute top-4 right-4 p-1 rounded-lg text-text-muted hover:text-text-primary transition-colors"
              >
                <X size={18} />
              </button>

              {/* Content Container */}
              <div className="flex flex-col items-center pt-2">
                {/* Avatar with thick gold border */}
                <div 
                  className="w-20 h-20 rounded-full flex items-center justify-center font-bold text-3xl text-white shadow-md mb-4 border-[3px]"
                  style={{
                    background: 'linear-gradient(135deg, #10B981, #059669)',
                    borderColor: '#FFBD07',
                  }}
                >
                  {clientAvatar}
                </div>

                {/* Name */}
                <h3 className="text-lg font-bold text-text-primary tracking-wide text-center uppercase mb-1">
                  {clientName}
                </h3>

                {/* Email */}
                <p className="text-xs text-text-secondary text-center mb-4 truncate max-w-full" title={clientEmail}>
                  {clientEmail || 'member@rexfit.in'}
                </p>

                {/* View Profile Capsule Button */}
                <button
                  onClick={() => {
                    setShowProfileDropdown(false);
                    navigate('/client/profile');
                  }}
                  className="px-5 py-2.5 rounded-full text-xs font-semibold border text-text-primary transition-all duration-200"
                  style={{
                    borderColor: 'var(--border-color)',
                    background: 'rgba(255, 255, 255, 0.03)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-hover)';
                    e.currentTarget.style.borderColor = 'var(--text-secondary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                  }}
                >
                  Manage RexFit Profile
                </button>

                {/* Separator line */}
                <div className="w-full h-px my-5" style={{ background: 'var(--border-color)' }} />

                {/* Logout Button */}
                <button
                  onClick={() => {
                    setShowProfileDropdown(false);
                    setShowLogoutModal(true);
                  }}
                  className="w-full py-3 rounded-xl font-bold text-sm text-center shadow-md transition-all duration-200"
                  style={{
                    background: '#FFBD07',
                    color: '#111111',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#E5AA06';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#FFBD07';
                  }}
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>

    <LogoutModal
      isOpen={showLogoutModal}
      onCancel={() => setShowLogoutModal(false)}
      onConfirm={handleLogout}
    />
    </>
  );
};

export default ClientHeader;
