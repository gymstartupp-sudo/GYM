import React, { useState, useEffect, useRef } from 'react';
import { Bell, LogOut, Sunrise, Sun, Sunset, Moon, X, Camera, AlertTriangle, Info } from 'lucide-react';
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
const ClientHeader = ({ clientName = 'Member', clientEmail = '', isMobile = false, profile = null }) => {
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

    const sortedMemberships = [...(profile.memberships || [])]
      .sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
    const latestMembership = sortedMemberships[0];

    const normalizeDate = (d) => {
      const nd = new Date(d);
      nd.setHours(0, 0, 0, 0);
      return nd;
    };

    const newMembershipStarted = latestMembership && normalizeDate(latestMembership.startDate) <= normalizeDate(new Date());

    // 1. Membership Expiry / Expiring Soon Check
    const membership = profile.membership;
    if (membership && membership.endDate) {
      const daysLeft = calculateDaysLeft(membership.startDate, membership.endDate);

      // Find the membership with balance (if any) to check for outstanding payments
      let remainingBalance = 0;
      let activeMembership = null;
      if (newMembershipStarted) {
        const finalPrice = latestMembership.finalPrice || 0;
        const totalPaid = latestMembership.totalPaid || 0;
        if (finalPrice - totalPaid > 0) {
          activeMembership = latestMembership;
        }
      } else {
        activeMembership = sortedMemberships.find(m => {
          const finalPrice = m.finalPrice || 0;
          const totalPaid = m.totalPaid || 0;
          return (finalPrice - totalPaid) > 0;
        });
      }
      if (activeMembership) {
        remainingBalance = (activeMembership.finalPrice || 0) - (activeMembership.totalPaid || 0);
      }

      if (daysLeft < 0) {
        // Expired
        if (remainingBalance > 0) {
          notifs.push({
            id: `expired-dues-${getTs(membership.startDate)}-${getTs(membership.endDate)}-${remainingBalance}`,
            type: 'danger',
            title: 'Membership Expired',
            message: `Your membership has expired. You still have an outstanding balance of ₹${remainingBalance}. Please clear the pending amount and renew.`,
          });
        } else {
          notifs.push({
            id: `expired-clean-${getTs(membership.startDate)}-${getTs(membership.endDate)}`,
            type: 'danger',
            title: 'Membership Expired',
            message: 'Your membership has expired. Please renew your membership to continue.',
          });
        }
      } else if (daysLeft <= 3) {
        // Expiring Soon (3, 2, 1, 0 days left)
        const daysText = daysLeft === 0 ? 'today' : `in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`;
        if (remainingBalance > 0) {
          notifs.push({
            id: `expiring-dues-${getTs(membership.startDate)}-${getTs(membership.endDate)}-${remainingBalance}`,
            type: 'warning',
            title: 'Membership Expiring Soon',
            message: `Your membership will expire ${daysText}. You currently have a pending balance of ₹${remainingBalance}. Please clear the pending balance and renew.`,
          });
        } else {
          notifs.push({
            id: `expiring-clean-${getTs(membership.startDate)}-${getTs(membership.endDate)}`,
            type: 'warning',
            title: 'Membership Expiring Soon',
            message: `Your membership plan is expiring soon (expires ${daysText}). Please renew your plan.`,
          });
        }
      }
    }

    // 2. Partial Payment Due Date Check
    let memWithDues = null;
    if (newMembershipStarted) {
      const finalPrice = latestMembership.finalPrice || 0;
      const totalPaid = latestMembership.totalPaid || 0;
      if (finalPrice - totalPaid > 0) {
        memWithDues = latestMembership;
      }
    } else {
      memWithDues = sortedMemberships.find(mem => {
        const finalPrice = mem.finalPrice || 0;
        const totalPaid = mem.totalPaid || 0;
        return (finalPrice - totalPaid) > 0;
      });
    }

    if (memWithDues && memWithDues.dueDate) {
      const balance = (memWithDues.finalPrice || 0) - (memWithDues.totalPaid || 0);

      const normalizedToday = normalizeDate(new Date());
      const normalizedDueDate = normalizeDate(memWithDues.dueDate);
      const diffTime = normalizedDueDate.getTime() - normalizedToday.getTime();
      const daysUntilDue = Math.round(diffTime / (1000 * 60 * 60 * 24));
      const dueDateString = new Date(memWithDues.dueDate).toLocaleDateString('en-GB').replace(/\//g, '-');

      if (daysUntilDue <= 3 && daysUntilDue > 0) {
        // 3 days before due date (due soon)
        notifs.push({
          id: `due-soon-${getTs(memWithDues.startDate)}-${getTs(memWithDues.dueDate)}-${balance}`,
          type: 'info',
          title: 'Payment Due Soon',
          message: `Friendly reminder: your pending membership balance of ₹${balance} is due on ${dueDateString}.`,
        });
      } else if (daysUntilDue <= 0 && daysUntilDue > -3) {
        // on the due date and up to 2 days after
        const daysText = daysUntilDue === 0 ? 'today' : `${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) !== 1 ? 's' : ''} ago`;
        notifs.push({
          id: `due-today-${getTs(memWithDues.startDate)}-${getTs(memWithDues.dueDate)}-${balance}`,
          type: 'warning',
          title: 'Payment Due',
          message: `Your pending membership balance of ₹${balance} is due ${daysText}. Please clear the payment.`,
        });
      } else if (daysUntilDue <= -3) {
        // 3 days or more overdue
        notifs.push({
          id: `overdue-${getTs(memWithDues.startDate)}-${getTs(memWithDues.dueDate)}-${balance}`,
          type: 'danger',
          title: 'Payment Overdue',
          message: `Your pending membership balance of ₹${balance} is overdue (Due Date: ${dueDateString}). Please clear the dues immediately.`,
        });
      }
    }

    setNotifications(notifs);
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
                className="absolute right-0 top-12 w-[340px] md:w-[380px] rounded-2xl border shadow-2xl z-50 p-4 animate-in fade-in slide-in-from-top-2 duration-200"
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

                <div className="flex justify-between items-center mb-3 pb-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <h3 className="font-bold text-sm text-text-primary">Notifications</h3>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                    {notifications.length} Active
                  </span>
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
                        className="p-3.5 rounded-xl border flex gap-3 hover:scale-[1.01] transition-transform duration-200"
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
                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between items-start">
                            <h4 className="text-xs font-bold text-text-primary leading-tight">{notif.title}</h4>
                          </div>
                          <p className="text-[11px] text-text-secondary leading-normal">{notif.message}</p>
                        </div>
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
