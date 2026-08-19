import React, { useState, useEffect, useRef } from 'react';
import { LogOut, Sunrise, Sun, Sunset, Moon, X, Menu, Dumbbell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import ThemeToggle from './ThemeToggle';
import LogoutModal from './LogoutModal';

const HEADER_BG = 'var(--header-bg)';
const HEADER_BORDER = 'var(--header-border)';

const AdminHeader = ({ isMobile = false, isSidebarOpen = false, onToggleSidebar = null }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
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

  const adminEmail = user?.email || user?.personalInfo?.email || 'rexfit.nexus@gmail.com';
  const adminName = user?.personalInfo?.name || user?.name || 'Super Admin';

  return (
    <>
      <header
        className="h-[64px] flex items-center justify-between px-4 md:px-6 shrink-0 z-30"
        style={{
          background: HEADER_BG,
          borderBottom: `1px solid ${HEADER_BORDER}`,
        }}
      >
        <div className="flex items-center gap-3 text-sm font-medium text-text-secondary select-none animate-in fade-in slide-in-from-left-2 duration-300">
          {isMobile && (
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-lg border border-border text-text-primary hover:bg-surface-hover transition-colors duration-200 mr-1"
              aria-label="Toggle sidebar"
            >
              {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          )}

          {isMobile && (
            <div className="flex items-center gap-2 mr-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-[var(--btn-primary-text)] shrink-0">
                <Dumbbell size={15} className="rotate-45" />
              </div>
              <span className="text-text-primary font-bold text-base tracking-wide whitespace-nowrap">Super Admin</span>
            </div>
          )}

          <div className={`${isMobile ? 'hidden sm:flex' : 'flex'} items-center gap-2`}>
            {greetingData.icon}
            <span>
              {greetingData.text}, <span className="font-bold text-text-primary">{adminName}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle className="w-9 h-9" size={16} />

          {/* Profile Avatar & Dropdown Container */}
          <div className="relative" ref={profileRef}>
            <button
              id="admin-profile-btn"
              onClick={handleProfileClick}
              className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm transition-all duration-200 shadow-md"
              style={{
                background: showProfileDropdown ? 'var(--bg-hover)' : 'linear-gradient(135deg, #FFBD07, #E5AA06)',
                color: 'var(--color-text-primary)',
                boxShadow: '0 2px 8px rgba(255,189,7,0.25)',
                border: showProfileDropdown ? '1px solid var(--border-color)' : 'none',
              }}
              title={`${adminName} — Profile Menu`}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.06)';
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(255,189,7,0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(255,189,7,0.25)';
              }}
            >
              SA
            </button>

            {/* Profile Dropdown Menu */}
            {showProfileDropdown && (
              <div
                className="absolute right-0 top-12 w-[280px] rounded-2xl border shadow-2xl z-50 p-6 animate-in fade-in slide-in-from-top-2 duration-200"
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
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl text-black shadow-md mb-4 border-[3px]"
                    style={{
                      background: 'linear-gradient(135deg, #FFBD07, #E5AA06)',
                      borderColor: '#10B981',
                    }}
                  >
                    SA
                  </div>

                  <h3 className="text-sm font-bold text-text-primary tracking-wide text-center uppercase mb-1">
                    {adminName}
                  </h3>

                  <p className="text-xs text-text-secondary text-center mb-4">
                    {adminEmail}
                  </p>

                  <div className="w-full h-px my-4" style={{ background: 'var(--border-color)' }} />

                  {/* Logout Button */}
                  <button
                    onClick={() => {
                      setShowProfileDropdown(false);
                      setShowLogoutModal(true);
                    }}
                    className="w-full py-2.5 rounded-xl font-bold text-xs text-center shadow-md transition-all duration-200"
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

export default AdminHeader;
