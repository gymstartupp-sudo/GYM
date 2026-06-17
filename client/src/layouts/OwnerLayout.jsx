import React, { useState, useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import OwnerHeader from '../components/OwnerHeader';
import {
  LayoutDashboard,
  Users,
  Tag,
  Receipt,
  CircleDollarSign,
  Menu,
  X,
  MessageSquare,
  Settings,
  Dumbbell,
  ChevronLeft,
  ChevronRight,
  UserMinus,
  UserPlus
} from 'lucide-react';
import api from '../utils/api';

export default function OwnerLayout() {
  const { user } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('owner_sidebar_collapsed') === 'true');
  const [gymProfile, setGymProfile] = useState(null);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setIsSidebarOpen(false);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchGymProfile = async () => {
      try {
        const res = await api.get('/gym/profile');
        setGymProfile(res.data.data);
      } catch (err) {
        console.error('Failed to load gym profile in sidebar:', err);
      }
    };
    fetchGymProfile();
  }, []);


  const gymName = gymProfile?.gym?.gymName || user?.gymName || 'Gym Owner';

  const navItems = [
    { to: '/owner/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/owner/clients', label: 'Clients', icon: Users },
    { to: '/owner/inactive-clients', label: 'Inactive Clients', icon: UserMinus },
    { to: '/owner/plans', label: 'Plans', icon: Tag },
    { to: '/owner/clients-payment', label: 'Clients Payment', icon: Receipt },
    { to: '/owner/dues', label: 'Dues', icon: CircleDollarSign },
    { to: '/owner/payment-ledger', label: 'Payment Ledger', icon: CircleDollarSign },
    { to: '/owner/requests', label: 'Requests', icon: UserPlus },
    { to: '/owner/feedback', label: 'Feedback', icon: MessageSquare },
    { to: '/owner/settings', label: 'Settings', icon: Settings },
  ];

  const sidebarWidth = isMobile
    ? 'w-[260px] min-w-[260px]'
    : isCollapsed
      ? 'w-[72px] min-w-[72px]'
      : 'w-60 min-w-[240px]';
  const showLabels = !isCollapsed || isMobile;

  return (
    <div className={`flex h-screen bg-surface-primary ${isMobile ? 'flex-col' : 'flex-row'}`}>
      {/* Mobile header */}
      {isMobile && (
        <header className="h-[60px] bg-surface-secondary border-b border-border flex items-center justify-end px-5 z-40 shrink-0">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg border border-border text-text-primary hover:bg-surface-hover transition-colors duration-200"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </header>
      )}

      {/* Mobile backdrop */}
      {isMobile && isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-[45] transition-opacity duration-200"
          style={{ background: 'var(--overlay)' }}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          ${isMobile
            ? `fixed top-0 left-0 h-screen z-50 transition-all duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`
            : `${sidebarWidth} shrink-0 transition-[width,min-width] duration-300`
          }
          bg-surface-secondary border-r border-border flex flex-col
        `}
      >
        {/* Brand */}
        <div className={`border-b border-border ${showLabels ? 'p-5' : 'p-3'}`}>
          {isMobile && (
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="absolute top-5 right-5 text-text-muted hover:text-text-primary transition-colors"
            >
              <X size={20} />
            </button>
          )}

          <div className={`flex items-center ${showLabels ? 'justify-between' : 'flex-col gap-3'}`}>
            <div className={`flex items-center gap-2.5 ${!showLabels ? 'justify-center' : ''}`}>
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-[var(--btn-primary-text)] shrink-0">
                <Dumbbell size={18} className="rotate-45" />
              </div>
              {showLabels && (
                <span className="text-text-primary font-bold text-lg tracking-wide whitespace-nowrap">RexFit</span>
              )}
            </div>
            {!isMobile && (
              <button
                onClick={() => {
                  const next = !isCollapsed;
                  setIsCollapsed(next);
                  localStorage.setItem('owner_sidebar_collapsed', String(next));
                }}
                className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors duration-200 shrink-0"
                title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
              </button>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
          {navItems.filter(item => item.label !== 'Settings').map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => { if (isMobile) setIsSidebarOpen(false); }}
              title={!showLabels ? item.label : undefined}
              className={({ isActive }) =>
                `sidebar-nav-link ${isActive ? 'sidebar-nav-link-active' : ''} ${showLabels ? '' : 'sidebar-nav-link-collapsed'
                }`
              }
            >
              <span className="flex items-center justify-center w-5 h-5 shrink-0">
                <item.icon size={18} />
              </span>
              {showLabels && <span className="truncate whitespace-nowrap leading-none">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Settings (pinned to bottom) */}
        <div className={`border border-border/60 rounded-lg mb-3 mt-auto ${showLabels ? 'mx-3' : 'mx-auto'}`}>
          <NavLink
            to="/owner/settings"
            onClick={() => { if (isMobile) setIsSidebarOpen(false); }}
            title={!showLabels ? 'Settings' : undefined}
            className={({ isActive }) =>
              `sidebar-nav-link !mx-0 ${isActive ? 'sidebar-nav-link-active' : ''} ${showLabels ? '' : 'sidebar-nav-link-collapsed'}`
            }
          >
            <span className="flex items-center justify-center w-5 h-5 shrink-0">
              <Settings size={18} />
            </span>
            {showLabels && <span className="truncate whitespace-nowrap leading-none">Settings</span>}
          </NavLink>
        </div>


      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-surface-primary text-text-primary">
        {!isMobile && <OwnerHeader gymName={gymName} gymLogo={gymProfile?.gym?.gymLogo || gymProfile?.gym?.billingInfo?.logo} isMobile={isMobile} />}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
