import React, { useState } from 'react';
import { Bell, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import ThemeToggle from './ThemeToggle';
import LogoutModal from './LogoutModal';

const HEADER_BG = '#111111';
const HEADER_BORDER = '#333333';

/**
 * ClientHeader — Global top navigation bar for client dashboard pages.
 * Shows: Brand | Client Name  ···  [Bell] [Profile Avatar]
 */
const ClientHeader = ({ clientName = 'Member', isMobile = false }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [notifCount] = useState(0); // Future: connect to real notifications
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const clientAvatar = clientName.charAt(0).toUpperCase();

  const handleProfileClick = () => {
    navigate('/client/profile');
  };

  const handleLogout = () => {
    setShowLogoutModal(false);
    logout();
    navigate('/login');
  };

  if (isMobile) return null; // Mobile already has its own header in each client page

  return (
    <>
    <header
      className="h-[64px] flex items-center justify-end px-6 shrink-0 z-30"
      style={{
        background: HEADER_BG,
        borderBottom: `1px solid ${HEADER_BORDER}`,
      }}
    >
      <div className="flex items-center gap-2">
        <ThemeToggle className="w-9 h-9" size={16} />

        {/* Notification Bell */}
        <button
          id="client-notification-btn"
          className="relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200"
          style={{ color: '#8A8A8A', border: '1px solid transparent' }}
          title="Notifications"
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#1F1F1F';
            e.currentTarget.style.borderColor = '#333333';
            e.currentTarget.style.color = '#FFFFFF';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = 'transparent';
            e.currentTarget.style.color = '#8A8A8A';
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
        <div className="w-px h-6 mx-1" style={{ background: '#2A2A2A' }} />

        {/* Profile Avatar */}
        <button
          id="client-profile-btn"
          onClick={handleProfileClick}
          className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm transition-all duration-200 shadow-md"
          style={{
            background: 'linear-gradient(135deg, #10B981, #059669)',
            color: '#FFFFFF',
            boxShadow: '0 2px 8px rgba(16,185,129,0.35)',
          }}
          title={`${clientName} — View Profile`}
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

        {/* Logout */}
        <button
          id="client-logout-btn"
          onClick={() => setShowLogoutModal(true)}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200"
          style={{ color: '#8A8A8A', border: '1px solid transparent' }}
          title="Logout"
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239,68,68,0.12)';
            e.currentTarget.style.borderColor = 'rgba(239,68,68,0.35)';
            e.currentTarget.style.color = '#ef4444';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = 'transparent';
            e.currentTarget.style.color = '#8A8A8A';
          }}
        >
          <LogOut size={17} />
        </button>
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
