import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Home, User, CreditCard, List, X, MessageSquare, Settings } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const ClientSidebar = ({ isOpen, onClose, isMobile }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={`${isMobile ? `fixed inset-y-0 left-0 z-50 w-64 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out` : 'w-64'} h-screen bg-gray-900 border-r border-gray-800 flex flex-col pt-6 px-4 shrink-0`}>
      <div className="flex items-center justify-between gap-3 mb-10 px-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent flex justify-center items-center font-bold text-lg text-white shadow-lg shadow-accent/30">
            {user?.avatar || 'C'}
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-white text-lg tracking-tight -mb-1 truncate max-w-[120px]">{user?.personalInfo?.name}</h2>
            <span className="text-xs text-gray-400 uppercase tracking-wider truncate block">{user?.gymName}</span>
          </div>
        </div>
        {isMobile && (
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X size={20} />
          </button>
        )}
      </div>

      <div className="flex-1 space-y-2">
        <NavLink
          to="/client"
          end
          onClick={() => isMobile && onClose()}
          className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all group ${isActive ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-400 hover:text-white'}`}
        >
          <Home size={20} /> Home
        </NavLink>
        <NavLink
          to="/client/plans"
          onClick={() => isMobile && onClose()}
          className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all group ${isActive ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-400 hover:text-white'}`}
        >
          <List size={20} /> Plans
        </NavLink>
        <NavLink
          to="/client/payments"
          onClick={() => isMobile && onClose()}
          className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all group ${isActive ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-400 hover:text-white'}`}
        >
          <CreditCard size={20} /> Payments
        </NavLink>

        <NavLink
          to="/client/profile"
          onClick={() => isMobile && onClose()}
          className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all group ${isActive ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-400 hover:text-white'}`}
        >
          <User size={20} /> Profile
        </NavLink>
        <NavLink
          to="/client/feedback"
          onClick={() => isMobile && onClose()}
          className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all group ${isActive ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-400 hover:text-white'}`}
        >
          <MessageSquare size={20} /> Feedback
        </NavLink>
        <NavLink
          to="/client/settings"
          onClick={() => isMobile && onClose()}
          className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all group ${isActive ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-400 hover:text-white'}`}
        >
          <Settings size={20} /> Settings
        </NavLink>
      </div>

      <div className="pb-6 pt-4 border-t border-gray-800">
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-red-500/10 hover:text-alert transition-all group">
          <LogOut size={20} /> Logout
        </button>
      </div>
    </div>
  );
};

export default ClientSidebar;
