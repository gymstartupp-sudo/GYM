import React, { useState, useEffect, useRef } from 'react';
import { Bell, LogOut, Sunrise, Sun, Sunset, Moon, X, Camera, AlertTriangle, Info, Trash2, Menu, Dumbbell } from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import ThemeToggle from './ThemeToggle';
import LogoutModal from './LogoutModal';
import { calculateDaysLeft } from '../utils/membership';

const HEADER_BG = 'var(--header-bg)';
const HEADER_BORDER = 'var(--header-border)';

/**
 * ClientHeader — Global top navigation bar for client dashboard pages.
 * Shows: Brand | Client Name  ···  [Bell] [Profile Avatar]
 */
const ClientHeader = ({ clientName = 'Member', clientEmail = '', isMobile = false, isSidebarOpen = false, onToggleSidebar = null, profile = null }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const profileRef = useRef(null);
  const notifRef = useRef(null);

  const [readNotifIds, setReadNotifIds] = useState(() => {
    try {
      const saved = localStorage.getItem('client_read_notification_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleInstantDeleteNotification = (notif) => {
    if (!notif) return;
    const deletedIds = JSON.parse(localStorage.getItem('client_deleted_notification_ids') || '[]');
    const newDeletedIds = [...new Set([...deletedIds, notif.id])];
    localStorage.setItem('client_deleted_notification_ids', JSON.stringify(newDeletedIds));

    // Update state immediately
    setNotifications(prev => prev.filter(n => n.id !== notif.id));
    toast.success("Notification deleted.");
  };

  const handleClearAllNotifications = () => {
    const deletedIds = JSON.parse(localStorage.getItem('client_deleted_notification_ids') || '[]');
    const activeIds = notifications.map(n => n.id);
    const newDeletedIds = [...new Set([...deletedIds, ...activeIds])];
    localStorage.setItem('client_deleted_notification_ids', JSON.stringify(newDeletedIds));

    // Clear state immediately
    setNotifications([]);
    toast.success("All notifications cleared.");
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!profile) return;

    const notifs = [];
    const getTs = (d) => d ? new Date(d).getTime() : 0;
    const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB').replace(/\//g, '-') : 'N/A';

    const mem = profile.membership;
    const endStr = fmt(mem?.endDate);
    const startStr = fmt(mem?.startDate);
    const planName = mem?.planName || 'Membership Plan';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate real-time daysLeft from endDate
    let daysLeft = mem?.daysLeft;
    if (mem?.endDate) {
      const endD = new Date(mem.endDate);
      endD.setHours(0, 0, 0, 0);
      daysLeft = Math.ceil((endD.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }

    const isExpired = mem?.status === 'expired' || (typeof daysLeft === 'number' && daysLeft < 0);
    const isExpiringSoon = mem?.status === 'expiring_soon' || (typeof daysLeft === 'number' && daysLeft <= 3);

    // Calculate pending balance from memberships
    let pendingBal = 0;
    let targetDueDate = mem?.dueDate || null;
    (profile.memberships || []).forEach(m => {
      const bal = Math.max(0, (m.finalPrice || 0) - (m.totalPaid || 0));
      if (bal > 0) {
        pendingBal += bal;
        if (!targetDueDate && m.dueDate) targetDueDate = m.dueDate;
      }
    });
    const hasPendingBalance = pendingBal > 0 || profile.paymentStatus === 'partial' || profile.paymentStatus === 'overdue';

    // 1. Plan Activated — always show when membership exists
    if (mem?.startDate) {
      notifs.push({
        id: `plan-active-${getTs(mem.startDate)}`,
        timestamp: getTs(mem.startDate),
        type: 'info',
        title: 'Plan Activated',
        message: `Your "${planName}" plan started on ${startStr} and is valid until ${endStr}.`,
      });
    }

    // 2. Expiring Soon (Triggered at Days Left = 3 milestone)
    if ((isExpiringSoon || isExpired) && mem?.endDate) {
      const expSoonTs = getTs(mem.endDate) - 3 * 24 * 60 * 60 * 1000;

      if (hasPendingBalance) {
        notifs.push({
          id: `status-expiring-soon-pending-${getTs(mem.endDate)}`,
          timestamp: expSoonTs,
          type: 'danger',
          title: 'Membership Expiring Soon & Payment Pending',
          message: `Your "${planName}" plan is expiring on ${endStr} with pending balance${pendingBal > 0 ? ` of ₹${pendingBal}` : ''}. Please clear your dues and renew soon.`,
        });
      } else {
        notifs.push({
          id: `status-expiring-soon-${getTs(mem.endDate)}`,
          timestamp: expSoonTs,
          type: 'warning',
          title: 'Membership Expiring Soon',
          message: `Your "${planName}" plan is expiring on ${endStr}. Please renew soon to avoid service interruption.`,
        });
      }
    }

    // 3. Expired (Triggered at Days Left = -1 milestone)
    if (isExpired && mem?.endDate) {
      const expTs = getTs(mem.endDate);

      if (hasPendingBalance) {
        notifs.push({
          id: `status-expired-pending-${getTs(mem.endDate)}`,
          timestamp: expTs,
          type: 'danger',
          title: 'Membership Expired & Payment Pending',
          message: `Your "${planName}" plan expired on ${endStr} with pending dues${pendingBal > 0 ? ` of ₹${pendingBal}` : ''}. Please clear your balance and renew to continue.`,
        });
      } else {
        notifs.push({
          id: `status-expired-${getTs(mem.endDate)}`,
          timestamp: expTs,
          type: 'danger',
          title: 'Membership Expired',
          message: `Your "${planName}" plan expired on ${endStr}. Please renew to continue accessing the gym.`,
        });
      }
    }

    // 4. Due Reminders (Milestones: 3 days before, on due date, 3 days after)
    if (hasPendingBalance && targetDueDate) {
      const dueD = new Date(targetDueDate);
      dueD.setHours(0, 0, 0, 0);
      const daysUntilDue = Math.round((dueD.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Due Reminder 1: 3 days before due date
      if (daysUntilDue <= 3) {
        const ts1 = dueD.getTime() - 3 * 24 * 60 * 60 * 1000;
        notifs.push({
          id: `overdue-reminder1-${getTs(targetDueDate)}`,
          timestamp: ts1,
          type: 'danger',
          title: 'Due Reminder 1',
          message: `Due Reminder 1: Your payment${pendingBal > 0 ? ` of ₹${pendingBal}` : ''} is due on ${fmt(targetDueDate)}. Please clear your balance on or before the due date.`,
        });
      }

      // Due Reminder 2: On due date
      if (daysUntilDue <= 0) {
        const ts2 = dueD.getTime();
        notifs.push({
          id: `overdue-reminder2-${getTs(targetDueDate)}`,
          timestamp: ts2,
          type: 'danger',
          title: 'Due Reminder 2',
          message: `Due Reminder 2: Your payment${pendingBal > 0 ? ` of ₹${pendingBal}` : ''} is due today (${fmt(targetDueDate)}). Please clear your balance immediately.`,
        });
      }

      // Due Reminder 3: 3 days after due date
      if (daysUntilDue <= -3) {
        const ts3 = dueD.getTime() + 3 * 24 * 60 * 60 * 1000;
        notifs.push({
          id: `overdue-reminder3-${getTs(targetDueDate)}`,
          timestamp: ts3,
          type: 'danger',
          title: 'Due Reminder 3',
          message: `Due Reminder 3: Your payment${pendingBal > 0 ? ` of ₹${pendingBal}` : ''} is overdue since ${fmt(targetDueDate)}. Please clear immediately to avoid membership suspension.`,
        });
      }
    }

    // Sort newest first (highest timestamp on top)
    notifs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    const deletedIds = JSON.parse(localStorage.getItem('client_deleted_notification_ids') || '[]');
    setNotifications(notifs.filter(n => !deletedIds.includes(n.id)));
  }, [profile]);




  useEffect(() => {
    if (showNotifDropdown && notifications.length > 0) {
      const currentIds = notifications.map(n => n.id);
      setReadNotifIds(prev => {
        const updated = Array.from(new Set([...prev, ...currentIds]));
        localStorage.setItem('client_read_notification_ids', JSON.stringify(updated));
        return updated;
      });
    }
  }, [showNotifDropdown, notifications]);

  const unreadCount = notifications.filter(n => !readNotifIds.includes(n.id)).length;


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
              {greetingData.text}, <span className="font-bold text-text-primary">{clientName}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle className="w-9 h-9" size={16} />

          {/* Notification Bell & Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              id="client-notification-btn"
              onClick={() => setShowNotifDropdown(prev => !prev)}
              className="relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200"
              style={{
                color: showNotifDropdown ? 'var(--text-primary)' : 'var(--text-muted)',
                border: showNotifDropdown ? '1px solid var(--border-color)' : '1px solid transparent',
                background: showNotifDropdown ? 'var(--bg-hover)' : 'transparent'
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
                  className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={{ background: '#ef4444', color: '#fff' }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Panel */}
            {showNotifDropdown && (
              <div
                className="fixed left-4 right-4 sm:absolute sm:left-auto sm:right-0 top-[70px] sm:top-12 w-auto sm:w-96 rounded-2xl border shadow-2xl z-50 p-4 animate-in fade-in slide-in-from-top-2 duration-200"
                style={{
                  borderColor: 'var(--border-color)',
                  background: 'var(--bg-elevated)',
                }}
              >
                <div className="flex justify-between items-center mb-3 pb-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <h3 className="font-bold text-sm text-text-primary">Notifications</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                      {notifications.length} Active
                    </span>
                    {notifications.length > 0 && (
                      <button
                        onClick={handleClearAllNotifications}
                        className="text-[11px] font-bold text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                </div>

                <div className="max-h-[280px] overflow-y-auto space-y-2.5 pr-1 scrollbar-hide">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center flex flex-col items-center justify-center text-text-muted">
                      <Bell size={28} className="opacity-30 mb-2" />
                      <p className="text-xs">No new notifications</p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className="p-3.5 rounded-xl border flex gap-3 hover:scale-[1.01] transition-transform duration-200 relative group"
                        style={{
                          background: 'rgba(255,255,255,0.01)',
                          borderColor: notif.type === 'danger' ? 'rgba(239,68,68,0.2)' : notif.type === 'warning' ? 'rgba(245,158,11,0.2)' : 'var(--border-color)'
                        }}
                      >
                        <div
                          className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center"
                          style={{
                            background: notif.type === 'danger' ? 'rgba(239,68,68,0.1)' : notif.type === 'warning' ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.1)',
                            color: notif.type === 'danger' ? '#ef4444' : notif.type === 'warning' ? '#f5980b' : '#3b82f6'
                          }}
                        >
                          {notif.type === 'danger' ? <AlertTriangle size={15} /> : notif.type === 'warning' ? <AlertTriangle size={15} /> : <Info size={15} />}
                        </div>
                        <div className="flex-1 space-y-1 pr-6 text-left">
                          <div className="flex justify-between items-start">
                            <h4 className="text-xs font-bold text-text-primary leading-tight">{notif.title}</h4>
                          </div>
                          <p className="text-[11px] text-text-secondary leading-normal">{notif.message}</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInstantDeleteNotification(notif);
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer"
                          title="Delete Notification"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>



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