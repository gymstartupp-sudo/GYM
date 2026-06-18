import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, CreditCard, List, X, MessageSquare, Settings, Dumbbell, ChevronLeft, ChevronRight } from 'lucide-react';

const ClientSidebar = ({ isOpen, onClose, isMobile }) => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('client_sidebar_collapsed') === 'true';
  });

  const showLabels = !isCollapsed || isMobile;

  const navLinks = [
    { to: '/client', end: true, label: 'Home', icon: Home },
    { to: '/client/plans', label: 'Plans', icon: List },
    { to: '/client/payments', label: 'Payments', icon: CreditCard },
    { to: '/client/feedback', label: 'Feedback', icon: MessageSquare },
  ];

  const sidebarWidthClass = isMobile
    ? 'fixed inset-y-0 left-0 z-50 w-64 min-w-[256px]'
    : isCollapsed
      ? 'w-20 min-w-[80px]'
      : 'w-64 min-w-[256px]';

  return (
    <div
      className={`${sidebarWidthClass} ${
        isMobile ? `transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}` : ''
      } h-screen bg-surface-secondary border-r border-border flex flex-col shrink-0 transition-[width,min-width] duration-300 ease-in-out`}
    >
      <div className={`pt-6 pb-4 border-b border-border ${showLabels ? 'px-4' : 'px-2'}`}>
        <div className={`flex items-center ${showLabels ? 'justify-between' : 'flex-col gap-3'}`}>
          <div className={`flex items-center gap-3 ${!showLabels ? 'justify-center' : ''}`}>
            <div className="w-10 h-10 rounded-xl bg-primary flex justify-center items-center text-[var(--btn-primary-text)] shrink-0">
              <Dumbbell size={20} className="rotate-45" />
            </div>
            {showLabels && (
              <span className="font-bold text-text-primary text-xl tracking-wide whitespace-nowrap">RexFit</span>
            )}
          </div>
          {isMobile ? (
            <button onClick={onClose} className="text-text-muted hover:text-text-primary p-1 transition-colors">
              <X size={20} />
            </button>
          ) : (
            <button
              onClick={() => {
                const nextCollapsed = !isCollapsed;
                setIsCollapsed(nextCollapsed);
                localStorage.setItem('client_sidebar_collapsed', String(nextCollapsed));
              }}
              className="text-text-muted hover:text-text-primary p-1.5 hover:bg-surface-hover rounded transition-colors duration-200 shrink-0"
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
        {navLinks.map(({ to, end, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => isMobile && onClose()}
            title={!showLabels ? label : undefined}
            className={({ isActive }) =>
              `sidebar-nav-link ${isActive ? 'sidebar-nav-link-active' : ''} ${
                showLabels ? '' : 'sidebar-nav-link-collapsed'
              }`
            }
          >
            <span className="flex items-center justify-center w-5 h-5 shrink-0">
              <Icon size={20} />
            </span>
            {showLabels && <span className="truncate whitespace-nowrap leading-none">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Settings (pinned to bottom) */}
      <div className={`border border-border/60 rounded-lg mb-3 mt-auto ${showLabels ? 'mx-3' : 'mx-auto'}`}>
        <NavLink
          to="/client/settings"
          onClick={() => isMobile && onClose()}
          title={!showLabels ? 'Settings' : undefined}
          className={({ isActive }) =>
            `sidebar-nav-link !mx-0 ${isActive ? 'sidebar-nav-link-active' : ''} ${showLabels ? '' : 'sidebar-nav-link-collapsed'}`
          }
        >
          <span className="flex items-center justify-center w-5 h-5 shrink-0">
            <Settings size={20} />
          </span>
          {showLabels && <span className="truncate whitespace-nowrap leading-none">Settings</span>}
        </NavLink>
      </div>
    </div>
  );
};

export default ClientSidebar;
