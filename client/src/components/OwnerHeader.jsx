import React, { useState, useEffect, useRef } from 'react';
import { Bell, HelpCircle, X, Mail, Phone, MessageSquare, ChevronRight, LogOut, UserPlus, Sunrise, Sun, Sunset, Moon, Trash2, AlertTriangle, Receipt, Camera, Bug, Menu, Dumbbell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import ThemeToggle from './ThemeToggle';
import LogoutModal from './LogoutModal';
import ReportIssueModal from './ReportIssueModal';
import api from '../utils/api';
import { toast } from 'react-toastify';
import { createPortal } from 'react-dom';

const HEADER_BG = 'var(--header-bg)';
const HEADER_BORDER = 'var(--header-border)';

/**
 * ContactUsPanel — Slide-in support panel for gym owners.
 */
const ContactUsPanel = ({ isOpen, onClose, onReportIssue, gymEmail, ownerName, ownerPhone }) => {

  if (!isOpen) return null;

  const SUPPORT_EMAIL = 'rexfit.nexus@gmail.com';
  const SUPPORT_PHONE = '+91 9345164608';

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
        style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-color)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}
            >
              <HelpCircle size={18} className="text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-text-primary">RexFit Support</p>
              <p className="text-[10px] text-text-muted">We're here to help</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all duration-200"
          >
            <X size={16} />
          </button>
        </div>

        {/* Quick Message */}
        <div className="px-5 py-3.5" style={{ background: 'rgba(99,102,241,0.06)', borderBottom: '1px solid var(--border-color)' }}>
          <div className="flex items-start gap-2">
            <MessageSquare size={14} className="text-indigo-400 mt-0.5 shrink-0" />
            <p className="text-xs text-text-secondary leading-relaxed">
              Need help? Contact RexFit support team and we'll get back to you shortly.
            </p>
          </div>
        </div>

        {/* Contact Info */}
        <div className="p-5 space-y-3">
          {/* Email */}
          <a
            href={`https://mail.google.com/mail/?extsrc=mailto&url=mailto:${SUPPORT_EMAIL}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl transition-all duration-200 cursor-pointer group text-text-primary no-underline"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', textDecoration: 'none', display: 'flex' }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.2)' }}
            >
              <Mail size={14} className="text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Support Email</p>
              <p className="text-sm font-medium text-text-primary truncate">{SUPPORT_EMAIL}</p>
            </div>
            <ChevronRight size={14} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
          </a>

          {/* Phone */}
          <div
            className="flex items-center gap-3 p-3 rounded-xl"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)' }}
            >
              <Phone size={14} className="text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Support Phone</p>
              <p className="text-sm font-medium text-text-primary">{SUPPORT_PHONE}</p>
            </div>
          </div>

        </div>

        {/* Report an Issue Button */}
        <div className="px-5 pb-5">
          <button
            onClick={onReportIssue}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: '#FFFFFF',
              boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
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
            <Bug size={15} />
            Report an Issue
          </button>
        </div>
      </div>
    </>
  );
};

/**
 * OwnerHeader — Global top navigation bar for gym owner dashboard.
 * Shows: Brand | Gym Name  ···  [Bell] [Contact Us] [Profile Avatar]
 */
const ConfirmModal = ({ isOpen, title, message, cancelText = 'Cancel', confirmText, onCancel, onConfirm }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onCancel?.();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'var(--overlay)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel?.(); }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-sm rounded-2xl border shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        style={{
          background: 'var(--bg-elevated)',
          borderColor: 'var(--border-color)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all duration-200"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="p-6 flex flex-col items-center text-center">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-lg animate-bounce"
            style={{
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.25)',
              animationDuration: '3s'
            }}
          >
            <AlertTriangle size={22} className="text-red-400" />
          </div>

          <h3 className="text-lg font-bold mb-2 text-text-primary">
            {title}
          </h3>

          <p className="text-xs text-text-secondary leading-relaxed mb-6">
            {message}
          </p>

          <div className="w-full border-t mb-5" style={{ borderColor: 'var(--border-color)' }} />

          <div className="flex gap-2.5 w-full">
            <button
              onClick={onCancel}
              className="flex-1 py-2 px-4 rounded-xl text-xs font-semibold transition-all duration-200"
              style={{
                background: 'transparent',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-hover)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              {cancelText}
            </button>

            <button
              onClick={onConfirm}
              className="flex-1 py-2 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-200 shadow-md text-white hover:brightness-110"
              style={{
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                boxShadow: '0 4px 12px rgba(239,68,68,0.25)',
              }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

const OwnerHeader = ({
  gymName = 'Gym Owner',
  gymLogo = null,
  gymEmail = '',
  ownerName = '',
  ownerPhone = '',
  isMobile = false,
  isSidebarOpen = false,
  onToggleSidebar = () => { }
}) => {
  const navigate = useNavigate();
  const { user, logout, role } = useAuth();
  const isReadOnly = role === 'superadmin' && !!sessionStorage.getItem('viewGymId');
  const [showContactPanel, setShowContactPanel] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const profileRef = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const notifRef = useRef(null);

  const [showClearAllModal, setShowClearAllModal] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatNotifTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };

  const fetchNotifications = async (forceMarkRead = false) => {
    if (!user) return;
    try {
      const gymId = user.gymId || user._id;
      const [clientsRes, feedbacksRes, paymentsRes] = await Promise.all([
        api.get('/client?status=pending'),
        api.get(`/feedback/gym/${gymId}`),
        api.get('/payment')
      ]);

      const pendingClients = clientsRes.data?.data || [];
      const feedbacks = feedbacksRes.data || [];
      const payments = paymentsRes.data?.data || [];

      const requestsNotifs = pendingClients.map(c => ({
        id: `request-${c._id}`,
        type: 'request',
        title: 'New Client Request',
        message: `${c.personalInfo?.name} is requesting to register.`,
        date: c.createdAt,
        link: '/owner/requests'
      }));

      const feedbackNotifs = feedbacks
        .filter(f => f.status === 'Unread')
        .map(f => ({
          id: `feedback-${f._id}`,
          type: 'feedback',
          title: 'New Feedback',
          message: `${f.clientName}: ${f.subject || 'No Subject'}`,
          date: f.createdAt,
          link: '/owner/feedback'
        }));

      const paymentNotifs = payments
        .filter(p => p.razorpay_payment_id)
        .map(p => ({
          id: `payment-${p._id}`,
          type: 'payment',
          title: 'Online Payment Received',
          message: `${p.clientName} paid ₹${p.paidAmount?.toLocaleString('en-IN')} for ${p.planName} (Method: ${p.paymentMethod?.toUpperCase()}, ID: ${p.razorpay_payment_id})`,
          date: p.createdAt || p.paymentDate || p.date,
          link: '/owner/clients-payment'
        }));

      const allNotifs = [...requestsNotifs, ...feedbackNotifs, ...paymentNotifs].sort((a, b) => new Date(b.date) - new Date(a.date));

      // Filter out deleted notifications
      const deletedIds = JSON.parse(localStorage.getItem('deleted_notification_ids') || '[]');
      const activeNotifs = allNotifs.filter(n => !deletedIds.includes(n.id));

      setNotifications(activeNotifs);

      // If the dropdown is open (or being opened), mark all these active notifications as read in localStorage
      if (showNotifDropdown || forceMarkRead) {
        const readIds = JSON.parse(localStorage.getItem('read_notification_ids') || '[]');
        const activeIds = activeNotifs.map(n => n.id);
        const newReadIds = [...new Set([...readIds, ...activeIds])].filter(id => activeIds.includes(id));
        localStorage.setItem('read_notification_ids', JSON.stringify(newReadIds));
      }
    } catch (error) {
      console.error('Failed to fetch notifications in OwnerHeader:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotifClick = (link) => {
    setShowNotifDropdown(false);
    navigate(link);
  };

  const handleNotificationBellClick = () => {
    const next = !showNotifDropdown;
    setShowNotifDropdown(next);
    if (next) {
      // Mark current notifications as read
      const readIds = JSON.parse(localStorage.getItem('read_notification_ids') || '[]');
      const activeIds = notifications.map(n => n.id);
      const newReadIds = [...new Set([...readIds, ...activeIds])].filter(id => activeIds.includes(id));
      localStorage.setItem('read_notification_ids', JSON.stringify(newReadIds));

      // Fetch fresh notifications and force mark them as read too
      fetchNotifications(true);
    }
  };

  const handleInstantDeleteNotification = (notif) => {
    if (!notif) return;
    const deletedIds = JSON.parse(localStorage.getItem('deleted_notification_ids') || '[]');
    const newDeletedIds = [...new Set([...deletedIds, notif.id])];
    localStorage.setItem('deleted_notification_ids', JSON.stringify(newDeletedIds));

    // Update state immediately
    setNotifications(prev => prev.filter(n => n.id !== notif.id));

    toast.success("Notification deleted.");
  };

  const handleClearAllNotifications = () => {
    const deletedIds = JSON.parse(localStorage.getItem('deleted_notification_ids') || '[]');
    const activeIds = notifications.map(n => n.id);
    const newDeletedIds = [...new Set([...deletedIds, ...activeIds])];
    localStorage.setItem('deleted_notification_ids', JSON.stringify(newDeletedIds));

    // Clear state immediately
    setNotifications([]);

    toast.success("All notifications cleared.");
    setShowClearAllModal(false);
  };

  const gymAvatar = gymName.charAt(0).toUpperCase();

  const readIds = JSON.parse(localStorage.getItem('read_notification_ids') || '[]');
  const unreadCount = notifications.filter(n => !readIds.includes(n.id)).length;

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

  const handleProfileClick = () => {
    setShowContactPanel(false);
    setShowProfileDropdown(prev => !prev);
  };

  const handleLogout = () => {
    setShowLogoutModal(false);
    logout();
    navigate('/login');
  };

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
              <span className="text-text-primary font-bold text-base tracking-wide whitespace-nowrap">RexFit</span>
            </div>
          )}

          <div className={`${isMobile ? 'hidden sm:flex' : 'flex'} items-center gap-2`}>
            {greetingData.icon}
            <span>
              {greetingData.text}, <span className="font-bold text-text-primary">{gymName}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle className="w-9 h-9" size={16} />

          {/* Notification Bell */}
          <div className="relative" ref={notifRef}>
            <button
              id="owner-notification-btn"
              onClick={handleNotificationBellClick}
              className="relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 group"
              style={{
                color: showNotifDropdown ? 'var(--text-primary)' : 'var(--text-muted)',
                background: showNotifDropdown ? 'var(--bg-hover)' : 'transparent',
                border: showNotifDropdown ? '1px solid var(--border-color)' : '1px solid transparent',
              }}
              title="Notifications"
              onMouseEnter={(e) => {
                if (!showNotifDropdown) {
                  e.currentTarget.style.background = 'var(--bg-hover)';
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!showNotifDropdown) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }
              }}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span
                  className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-bold shadow-sm"
                  style={{ background: '#ef4444', color: '#fff' }}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifDropdown && (
              <div
                className="fixed left-4 right-4 sm:absolute sm:left-auto sm:right-0 top-[70px] sm:top-12 w-auto sm:w-96 rounded-2xl border bg-surface-secondary shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
                style={{ borderColor: 'var(--border-color)', background: 'var(--bg-elevated)' }}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b bg-surface-hover/20" style={{ borderColor: 'var(--border-color)' }}>
                  <div className="flex items-center gap-2 text-text-primary text-sm font-bold">
                    <Bell size={16} className="text-primary" />
                    <span>Notifications</span>
                  </div>
                  {notifications.length > 0 && (
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-surface-hover text-text-secondary border border-border/30">
                        {notifications.length} Total
                      </span>
                      <button
                        onClick={() => setShowClearAllModal(true)}
                        className="text-[11px] font-bold text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                  )}
                </div>

                {/* Notifications List */}
                <div className="max-h-80 overflow-y-auto divide-y divide-border/50 custom-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="p-10 flex flex-col items-center justify-center text-center animate-in fade-in duration-200">
                      <div className="text-3xl mb-3 animate-bounce" style={{ animationDuration: '4s' }}>🔔</div>
                      <p className="text-sm font-bold text-text-primary">No notifications</p>
                      <p className="text-xs text-text-secondary mt-1">You're all caught up.</p>
                    </div>
                  ) : (
                    notifications.map((notif) => {
                      let iconEl = <UserPlus size={14} />;
                      let badgeClass = 'bg-primary/10 text-primary border border-primary/20';

                      if (notif.type === 'feedback') {
                        iconEl = <MessageSquare size={14} />;
                        badgeClass = 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
                      } else if (notif.type === 'payment') {
                        iconEl = <Receipt size={14} />;
                        badgeClass = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
                      }

                      return (
                        <div
                          key={notif.id}
                          onClick={() => handleNotifClick(notif.link)}
                          className="p-4 flex gap-3 hover:bg-surface-hover/50 transition-colors cursor-pointer group relative overflow-hidden"
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${badgeClass}`}>
                            {iconEl}
                          </div>

                          <div className="flex-1 min-w-0 text-left pr-10">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-bold text-text-primary group-hover:text-primary transition-colors">
                                {notif.title}
                              </p>
                              <span className="text-[9px] text-text-secondary whitespace-nowrap">
                                {formatNotifTime(notif.date)}
                              </span>
                            </div>
                            <p className="text-xs text-text-secondary mt-1 line-clamp-2 leading-relaxed">
                              {notif.message}
                            </p>
                          </div>

                          {/* Delete Action Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInstantDeleteNotification(notif);
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-200 cursor-pointer"
                            title="Delete Notification"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Contact Us */}
          <button
            id="owner-contact-us-btn"
            onClick={() => setShowContactPanel((prev) => !prev)}
            className="relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200"
            style={{
              color: showContactPanel ? '#6366f1' : 'var(--text-muted)',
              background: showContactPanel ? 'rgba(99,102,241,0.12)' : 'transparent',
              border: showContactPanel ? '1px solid rgba(99,102,241,0.35)' : '1px solid transparent',
            }}
            title="Contact Support"
            onMouseEnter={(e) => {
              if (!showContactPanel) {
                e.currentTarget.style.background = 'var(--bg-hover)';
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }
            }}
            onMouseLeave={(e) => {
              if (!showContactPanel) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.color = 'var(--text-muted)';
              }
            }}
          >
            <HelpCircle size={18} />
          </button>



          {/* Profile Avatar & Dropdown Container */}
          <div className="relative" ref={profileRef}>
            <button
              id="owner-profile-btn"
              onClick={handleProfileClick}
              className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm transition-all duration-200 shadow-md overflow-hidden"
              style={{
                background: gymLogo ? 'transparent' : 'linear-gradient(135deg, #10B981, #059669)',
                color: '#FFFFFF',
                boxShadow: '0 2px 8px rgba(16,185,129,0.35)',
                border: showProfileDropdown ? '1px solid var(--border-color)' : 'none',
              }}
              title={`${gymName} — Profile Menu`}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.06)';
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(16,185,129,0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(16,185,129,0.35)';
              }}
            >
              {gymLogo ? (
                <img
                  src={gymLogo.startsWith('http') ? gymLogo : `${(import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace('/api', '')}${gymLogo}`}
                  alt="Gym Logo"
                  className="w-full h-full object-cover"
                />
              ) : (
                gymAvatar
              )}
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
                    className="w-20 h-20 rounded-full flex items-center justify-center font-bold text-3xl text-white shadow-md mb-4 border-[3px] overflow-hidden"
                    style={{
                      background: gymLogo ? 'transparent' : 'linear-gradient(135deg, #10B981, #059669)',
                      borderColor: '#FFBD07',
                    }}
                  >
                    {gymLogo ? (
                      <img
                        src={gymLogo.startsWith('http') ? gymLogo : `${(import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace('/api', '')}${gymLogo}`}
                        alt="Gym Logo"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      gymAvatar
                    )}
                  </div>

                  {/* Name */}
                  <h3 className="text-lg font-bold text-text-primary tracking-wide text-center uppercase mb-1">
                    {gymName}
                  </h3>

                  {/* Email */}
                  <p className="text-xs text-text-secondary text-center mb-4 truncate max-w-full" title={gymEmail}>
                    {gymEmail || 'owner@rexfit.in'}
                  </p>

                  {/* View Profile Capsule Button */}
                  <button
                    onClick={() => {
                      setShowProfileDropdown(false);
                      navigate('/owner/profile');
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

                  {/* Separator line & Logout Button */}
                  {!isReadOnly && (
                    <>
                      <div className="w-full h-px my-5" style={{ background: 'var(--border-color)' }} />
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
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <ContactUsPanel
        isOpen={showContactPanel}
        onClose={() => setShowContactPanel(false)}
        onReportIssue={() => { setShowContactPanel(false); setShowReportModal(true); }}
        gymEmail={gymEmail}
        ownerName={ownerName}
        ownerPhone={ownerPhone}
      />

      <ReportIssueModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        gymName={gymName}
        ownerName={ownerName}
        ownerPhone={ownerPhone}
      />

      <LogoutModal
        isOpen={showLogoutModal}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
      />

      <ConfirmModal
        isOpen={showClearAllModal}
        title="Clear all notifications?"
        message="This will permanently remove all notifications."
        confirmText="Clear All"
        onCancel={() => setShowClearAllModal(false)}
        onConfirm={handleClearAllNotifications}
      />
    </>
  );
};

export default OwnerHeader;
