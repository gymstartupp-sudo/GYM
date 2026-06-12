import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, CreditCard, ClipboardList, AlertCircle, User, LogOut, UserMinus, Clock, UserPlus, MessageSquare } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const Sidebar = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = [
    { name: 'Dashboard', path: '/owner', icon: <LayoutDashboard size={20} /> },
    { name: 'Clients', path: '/owner/clients', icon: <Users size={20} /> },
    { name: 'Inactive Clients', path: '/owner/inactive-clients', icon: <UserMinus size={20} /> },
    { name: 'Plans', path: '/owner/plans', icon: <ClipboardList size={20} /> },
    { name: 'Clients Payment', path: '/owner/clients-payment', icon: <CreditCard size={20} /> },
    { name: 'Dues', path: '/owner/dues', icon: <CreditCard size={20} /> },
    { name: 'Expired', path: '/owner/expired', icon: <Clock size={20} /> },
    { name: 'Payment Ledger', path: '/owner/payment-ledger', icon: <CreditCard size={20} /> },
    { name: 'Requests', path: '/owner/requests', icon: <UserPlus size={20} /> },
    { name: 'Feedback', path: '/owner/feedback', icon: <MessageSquare size={20} /> },
    { name: 'Profile', path: '/owner/profile', icon: <User size={20} /> },
  ];

  return (
    <div className="h-screen w-64 bg-gray-900 border-r border-gray-800 flex flex-col pt-6 px-4 sticky top-0 shadow-2xl z-20">
      <div className="flex items-center gap-3 mb-10 px-2">
        <div className="w-10 h-10 rounded-xl bg-primary flex justify-center items-center font-bold text-lg text-white shadow-lg shadow-primary/30">
          {user?.gymName?.charAt(0) || 'G'}
        </div>
        <div>
          <h2 className="font-bold text-white text-lg tracking-tight -mb-1 truncate">{user?.gymName}</h2>
          <span className="text-xs text-gray-400 font-medium tracking-wider uppercase">Owner Portal</span>
        </div>
      </div>

      <div className="flex-1 space-y-2">
        {navLinks.map((link) => (
          <NavLink
            key={link.name}
            to={link.path}
            end={link.path === '/owner'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${isActive
                ? 'bg-primary/10 text-primary font-semibold'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <span className="group-hover:scale-110 transition-transform duration-200">{link.icon}</span>
            {link.name}
          </NavLink>
        ))}
      </div>

      <div className="pb-6 pt-4 border-t border-gray-800 mt-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-red-500/10 hover:text-alert transition-all duration-200 group"
        >
          <LogOut size={20} className="group-hover:-translate-x-1 transition-transform duration-200" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
