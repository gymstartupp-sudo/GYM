import React, { useState, useEffect } from 'react';
import { Bell, HelpCircle, X, Mail, Phone, Clock, MessageSquare, ChevronRight, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import ThemeToggle from './ThemeToggle';
import LogoutModal from './LogoutModal';

const HEADER_BG = '#111111';
const HEADER_BORDER = '#333333';

/**
 * ContactUsPanel — Slide-in support panel for gym owners.
 */
const ContactUsPanel = ({ isOpen, onClose }) => {
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    if (!isOpen) setEmailSent(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const SUPPORT_EMAIL = 'support@rexfit.in';
  const SUPPORT_PHONE = '+91 98765 43210';
  const BUSINESS_HOURS = 'Mon–Sat, 9 AM – 6 PM';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60]"
        style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className="fixed top-[70px] right-4 z-[70] w-[340px] rounded-2xl shadow-2xl border animate-in fade-in slide-in-from-top-2 duration-200"
        style={{ background: '#181818', borderColor: '#333333' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#2A2A2A' }}>
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}
            >
              <HelpCircle size={18} className="text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">RexFit Support</p>
              <p className="text-[10px] text-gray-400">We're here to help</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200"
          >
            <X size={16} />
          </button>
        </div>

        {/* Quick Message */}
        <div className="px-5 py-3.5" style={{ background: 'rgba(99,102,241,0.06)', borderBottom: '1px solid #2A2A2A' }}>
          <div className="flex items-start gap-2">
            <MessageSquare size={14} className="text-indigo-400 mt-0.5 shrink-0" />
            <p className="text-xs text-gray-300 leading-relaxed">
              Need help? Contact RexFit support team and we'll get back to you shortly.
            </p>
          </div>
        </div>

        {/* Contact Info */}
        <div className="p-5 space-y-3">
          {/* Email */}
          <div
            className="flex items-center gap-3 p-3 rounded-xl transition-all duration-200 cursor-pointer group"
            style={{ background: '#222222', border: '1px solid #2A2A2A' }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = '#2A2A2A'}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.2)' }}
            >
              <Mail size={14} className="text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Support Email</p>
              <p className="text-sm font-medium text-white truncate">{SUPPORT_EMAIL}</p>
            </div>
            <ChevronRight size={14} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
          </div>

          {/* Phone */}
          <div
            className="flex items-center gap-3 p-3 rounded-xl"
            style={{ background: '#222222', border: '1px solid #2A2A2A' }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)' }}
            >
              <Phone size={14} className="text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Support Phone</p>
              <p className="text-sm font-medium text-white">{SUPPORT_PHONE}</p>
            </div>
          </div>

          {/* Business Hours */}
          <div
            className="flex items-center gap-3 p-3 rounded-xl"
            style={{ background: '#222222', border: '1px solid #2A2A2A' }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)' }}
            >
              <Clock size={14} className="text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Business Hours</p>
              <p className="text-sm font-medium text-white">{BUSINESS_HOURS}</p>
            </div>
          </div>
        </div>

        {/* Open Email Button */}
        <div className="px-5 pb-5">
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=RexFit%20Support%20Request&body=Hello%20RexFit%20Support%20Team%2C%0A%0A`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: '#FFFFFF',
              boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
              textDecoration: 'none',
              display: 'flex',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #4f46e5, #4338ca)';
              e.currentTarget.style.boxShadow = '0 6px 18px rgba(99,102,241,0.45)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #6366f1, #4f46e5)';
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(99,102,241,0.35)';
            }}
          >
            <Mail size={15} />
            Open Email
          </a>
        </div>
      </div>
    </>
  );
};

/**
 * OwnerHeader — Global top navigation bar for gym owner dashboard.
 * Shows: Brand | Gym Name  ···  [Bell] [Contact Us] [Profile Avatar]
 */
const OwnerHeader = ({ gymName = 'Gym Owner', isMobile = false }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [showContactPanel, setShowContactPanel] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [notifCount] = useState(0); // Future: connect to real notifications

  const gymAvatar = gymName.charAt(0).toUpperCase();

  const handleProfileClick = () => {
    setShowContactPanel(false);
    navigate('/owner/profile');
  };

  const handleLogout = () => {
    setShowLogoutModal(false);
    logout();
    navigate('/login');
  };

  if (isMobile) return null; // Mobile header is already handled in OwnerLayout

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
            id="owner-notification-btn"
            className="relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 group"
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

          {/* Contact Us */}
          <button
            id="owner-contact-us-btn"
            onClick={() => setShowContactPanel((prev) => !prev)}
            className="relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200"
            style={{
              color: showContactPanel ? '#6366f1' : '#8A8A8A',
              background: showContactPanel ? 'rgba(99,102,241,0.12)' : 'transparent',
              border: showContactPanel ? '1px solid rgba(99,102,241,0.35)' : '1px solid transparent',
            }}
            title="Contact Support"
            onMouseEnter={(e) => {
              if (!showContactPanel) {
                e.currentTarget.style.background = '#1F1F1F';
                e.currentTarget.style.borderColor = '#333333';
                e.currentTarget.style.color = '#FFFFFF';
              }
            }}
            onMouseLeave={(e) => {
              if (!showContactPanel) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.color = '#8A8A8A';
              }
            }}
          >
            <HelpCircle size={18} />
          </button>

          

          {/* Profile Avatar */}
          <button
            id="owner-profile-btn"
            onClick={handleProfileClick}
            className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm transition-all duration-200 shadow-md"
            style={{
              background: 'linear-gradient(135deg, #10B981, #059669)',
              color: '#FFFFFF',
              boxShadow: '0 2px 8px rgba(16,185,129,0.35)',
            }}
            title={`${gymName} — View Profile`}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.06)';
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(16,185,129,0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(16,185,129,0.35)';
            }}
          >
            {gymAvatar}
          </button>

          {/* Logout */}
          <button
            id="owner-logout-btn"
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

      <ContactUsPanel
        isOpen={showContactPanel}
        onClose={() => setShowContactPanel(false)}
      />

      <LogoutModal
        isOpen={showLogoutModal}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
      />
    </>
  );
};

export default OwnerHeader;
