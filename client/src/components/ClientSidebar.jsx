import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Home, CreditCard, List, X, MessageSquare, Settings, Dumbbell, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';

const ClientSidebar = ({ isOpen, onClose, isMobile }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('client_sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/client/profile');
        setProfile(res.data.data);
      } catch (error) {
        console.error('Failed to load profile in client sidebar:', error);
      }
    };
    fetchProfile();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const clientName = profile?.personalInfo?.name || user?.personalInfo?.name || 'Member';
  const clientAvatar = clientName.charAt(0).toUpperCase();

  return (
    <div
      className={`${
        isMobile
          ? `fixed inset-y-0 left-0 z-50 w-64 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} px-4`
          : isCollapsed
          ? 'w-20 px-2'
          : 'w-64 px-4'
      } h-screen bg-gray-900 border-r border-gray-800 flex flex-col pt-6 shrink-0 transition-all duration-300 ease-in-out`}
    >
      {/* Brand Branding: [Logo] RexFit */}
      <div className={`flex items-center justify-between mb-8 ${isCollapsed && !isMobile ? 'justify-center px-0' : 'px-2'}`}>
        <div className="flex flex-row items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex justify-center items-center text-white shadow-lg shadow-primary/30 shrink-0">
            <Dumbbell size={22} className="rotate-45" />
          </div>
          {(!isCollapsed || isMobile) && (
            <span className="font-extrabold text-white text-xl tracking-wider">RexFit</span>
          )}
        </div>
        {isMobile ? (
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X size={20} />
          </button>
        ) : (
          <button
            onClick={() => {
              const nextCollapsed = !isCollapsed;
              setIsCollapsed(nextCollapsed);
              localStorage.setItem('client_sidebar_collapsed', nextCollapsed);
            }}
            className={`text-gray-400 hover:text-white p-1 hover:bg-gray-800 rounded transition-colors ${isCollapsed ? 'mt-2' : ''}`}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        )}
      </div>

      {/* Client Profile Section */}
      <div
        onClick={() => {
          navigate('/client/profile');
          if (isMobile) onClose();
        }}
        className={`flex items-center gap-3 mb-6 p-2 rounded-xl cursor-pointer hover:bg-gray-800/60 transition-all duration-300 group border border-transparent hover:border-gray-800 ${
          isCollapsed && !isMobile ? 'justify-center p-1' : ''
        }`}
        title={isCollapsed && !isMobile ? clientName : undefined}
      >
        <div className="w-10 h-10 rounded-xl bg-accent flex justify-center items-center font-bold text-lg text-white shadow-lg shadow-accent/30 shrink-0 group-hover:scale-105 transition-transform duration-300">
          {clientAvatar}
        </div>
        {(!isCollapsed || isMobile) && (
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-white text-sm tracking-tight truncate group-hover:text-primary transition-colors duration-300" title={clientName}>
              {clientName}
            </h3>
            <span className="text-[10px] text-gray-500 font-medium tracking-wider uppercase block mt-0.5">
              Member Account
            </span>
          </div>
        )}
      </div>

      <div className="border-b border-gray-800 mb-6" />

      {/* Nav Links */}
      <div className="flex-1 space-y-2">
        <NavLink
          to="/client"
          end
          onClick={() => isMobile && onClose()}
          className={({ isActive }) =>
            `flex items-center gap-3 py-3 rounded-lg transition-all duration-200 group ${
              isActive ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-400 hover:text-white'
            } ${isCollapsed && !isMobile ? 'justify-center px-0' : 'px-4'}`
          }
          title={isCollapsed && !isMobile ? 'Home' : undefined}
        >
          <Home size={20} className="group-hover:scale-110 transition-transform duration-200 shrink-0" />
          {(!isCollapsed || isMobile) && <span>Home</span>}
        </NavLink>

        <NavLink
          to="/client/plans"
          onClick={() => isMobile && onClose()}
          className={({ isActive }) =>
            `flex items-center gap-3 py-3 rounded-lg transition-all duration-200 group ${
              isActive ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-400 hover:text-white'
            } ${isCollapsed && !isMobile ? 'justify-center px-0' : 'px-4'}`
          }
          title={isCollapsed && !isMobile ? 'Plans' : undefined}
        >
          <List size={20} className="group-hover:scale-110 transition-transform duration-200 shrink-0" />
          {(!isCollapsed || isMobile) && <span>Plans</span>}
        </NavLink>

        <NavLink
          to="/client/payments"
          onClick={() => isMobile && onClose()}
          className={({ isActive }) =>
            `flex items-center gap-3 py-3 rounded-lg transition-all duration-200 group ${
              isActive ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-400 hover:text-white'
            } ${isCollapsed && !isMobile ? 'justify-center px-0' : 'px-4'}`
          }
          title={isCollapsed && !isMobile ? 'Payments' : undefined}
        >
          <CreditCard size={20} className="group-hover:scale-110 transition-transform duration-200 shrink-0" />
          {(!isCollapsed || isMobile) && <span>Payments</span>}
        </NavLink>

        <NavLink
          to="/client/feedback"
          onClick={() => isMobile && onClose()}
          className={({ isActive }) =>
            `flex items-center gap-3 py-3 rounded-lg transition-all duration-200 group ${
              isActive ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-400 hover:text-white'
            } ${isCollapsed && !isMobile ? 'justify-center px-0' : 'px-4'}`
          }
          title={isCollapsed && !isMobile ? 'Feedback' : undefined}
        >
          <MessageSquare size={20} className="group-hover:scale-110 transition-transform duration-200 shrink-0" />
          {(!isCollapsed || isMobile) && <span>Feedback</span>}
        </NavLink>

        <NavLink
          to="/client/settings"
          onClick={() => isMobile && onClose()}
          className={({ isActive }) =>
            `flex items-center gap-3 py-3 rounded-lg transition-all duration-200 group ${
              isActive ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-400 hover:text-white'
            } ${isCollapsed && !isMobile ? 'justify-center px-0' : 'px-4'}`
          }
          title={isCollapsed && !isMobile ? 'Settings' : undefined}
        >
          <Settings size={20} className="group-hover:scale-110 transition-transform duration-200 shrink-0" />
          {(!isCollapsed || isMobile) && <span>Settings</span>}
        </NavLink>
      </div>

      {/* Logout */}
      <div className="pb-6 pt-4 border-t border-gray-800 mt-4">
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 py-3 rounded-lg text-gray-400 hover:bg-red-500/10 hover:text-alert transition-all duration-200 group ${
            isCollapsed && !isMobile ? 'justify-center px-0' : 'px-4'
          }`}
          title={isCollapsed && !isMobile ? 'Logout' : undefined}
        >
          <LogOut size={20} className="group-hover:-translate-x-1 transition-transform duration-200 shrink-0" />
          {(!isCollapsed || isMobile) && <span className="font-medium">Logout</span>}
        </button>
      </div>
    </div>
  );
};

export default ClientSidebar;
