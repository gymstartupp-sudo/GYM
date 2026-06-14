import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, CreditCard, ClipboardList, AlertCircle, UserMinus, Clock, UserPlus, MessageSquare } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const Sidebar = () => {
  const { user } = useAuth();

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
  ];

  return (
    <div className="h-screen w-64 bg-surface-secondary border-r border-border flex flex-col pt-6 px-4 sticky top-0 shadow-2xl z-20">
      <div className="flex items-center gap-3 mb-10 px-2">
        <div className="w-10 h-10 rounded-xl bg-primary flex justify-center items-center font-bold text-lg text-text-primary shadow-lg shadow-primary/30">
          {user?.gymName?.charAt(0) || 'G'}
        </div>
        <div>
          <h2 className="font-bold text-text-primary text-lg tracking-tight -mb-1 truncate">{user?.gymName}</h2>
          <span className="text-xs text-text-secondary font-medium tracking-wider uppercase">Owner Portal</span>
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
                : 'text-text-secondary hover:bg-surface-divider hover:text-text-primary'
              }`
            }
          >
            <span className="group-hover:scale-110 transition-transform duration-200">{link.icon}</span>
            {link.name}
          </NavLink>
        ))}
      </div>


    </div>
  );
};

export default Sidebar;
