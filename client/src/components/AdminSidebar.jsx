import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, LayoutDashboard, Building2, X, Ticket, Wrench, UserPlus } from 'lucide-react';
import api from '../utils/api';
import ThemeToggle from './ThemeToggle';

export const AdminSidebar = ({ isOpen, onClose, isMobile }) => {
  const { logout, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const fetchPending = async () => {
      try {
        const res = await api.get('/admin/requests');
        if (isMounted) {
          setPendingCount(res.data?.data?.length || 0);
        }
      } catch {
        // silent fail on sidebar counter
      }
    };
    fetchPending();
    return () => { isMounted = false; };
  }, [location.pathname]);

  return (
    <div
      className={`${isMobile
        ? `fixed inset-y-0 left-0 z-50 w-64 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out`
        : 'w-64'
        } h-screen bg-surface-secondary border-r border-border flex flex-col shrink-0`}
    >
      <div className="h-[64px] px-5 border-b border-border flex items-center shrink-0">
        <div className="flex items-center justify-between gap-3 w-full">
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
          to="/admin/requests"
          onClick={() => isMobile && onClose()}
          className={({ isActive }) => `sidebar-nav-link ${isActive ? 'sidebar-nav-link-active' : ''}`}
        >
          <span className="flex items-center justify-center w-5 h-5 shrink-0">
            <UserPlus size={20} />
          </span>
          <span className="leading-none flex-1">Gym Requests</span>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
              {pendingCount}
            </span>
          )}
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

        {(role === 'superadmin' || role === 'developer') && (
          <>
            <div className="px-5 py-2 mt-4 text-[10px] font-black uppercase text-text-muted tracking-widest border-t border-border/50">
              Developer Tools
            </div>
            <NavLink
              to="/admin/reminder-testing"
              onClick={() => isMobile && onClose()}
              className={({ isActive }) => `sidebar-nav-link ${isActive ? 'sidebar-nav-link-active' : ''}`}
            >
              <span className="flex items-center justify-center w-5 h-5 shrink-0">
                <Wrench size={20} />
              </span>
              <span className="leading-none">Reminder Testing</span>
            </NavLink>
          </>
        )}
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
