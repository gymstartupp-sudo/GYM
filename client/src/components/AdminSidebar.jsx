import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, LayoutDashboard, Building2, X, Ticket, Wrench } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export const AdminSidebar = ({ isOpen, onClose, isMobile }) => {
  const { logout, role } = useAuth();
  const navigate = useNavigate();

  return (
    <div
      className={`${isMobile
        ? `fixed inset-y-0 left-0 z-50 w-64 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out`
        : 'w-64'
        } h-screen bg-surface-secondary border-r border-border flex flex-col shrink-0`}
    >
      <div className="p-5 border-b border-border">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex justify-center items-center font-bold text-sm text-[var(--btn-primary-text)]">
              SA
            </div>
            <h2 className="font-bold text-text-primary text-lg tracking-tight">Super Admin</h2>
          </div>
          {isMobile && (
            <button onClick={onClose} className="text-text-muted hover:text-text-primary p-1 transition-colors">
              <X size={20} />
            </button>
          )}
        </div>
        {!isMobile && <ThemeToggle className="w-full h-9" />}
      </div>

      <div className="flex-1 py-3 overflow-y-auto">
        <NavLink
          to="/admin"
          end
          onClick={() => isMobile && onClose()}
          className={({ isActive }) => `sidebar-nav-link ${isActive ? 'sidebar-nav-link-active' : ''}`}
        >
          <span className="flex items-center justify-center w-5 h-5 shrink-0">
            <LayoutDashboard size={20} />
          </span>
          <span className="leading-none">Dashboard</span>
        </NavLink>
        <NavLink
          to="/admin/gyms"
          onClick={() => isMobile && onClose()}
          className={({ isActive }) => `sidebar-nav-link ${isActive ? 'sidebar-nav-link-active' : ''}`}
        >
          <span className="flex items-center justify-center w-5 h-5 shrink-0">
            <Building2 size={20} />
          </span>
          <span className="leading-none">All Gyms</span>
        </NavLink>
        <NavLink
          to="/admin/issues"
          onClick={() => isMobile && onClose()}
          className={({ isActive }) => `sidebar-nav-link ${isActive ? 'sidebar-nav-link-active' : ''}`}
        >
          <span className="flex items-center justify-center w-5 h-5 shrink-0">
            <Ticket size={20} />
          </span>
          <span className="leading-none">Support Tickets</span>
        </NavLink>


      </div>

      <div className="p-4 border-t border-border">
        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-text-secondary hover:bg-danger/10 hover:text-danger transition-all duration-200"
        >
          <LogOut size={20} />
          Logout
        </button>
      </div>
    </div>
  );
};
