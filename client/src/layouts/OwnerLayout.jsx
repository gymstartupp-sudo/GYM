import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Users, Tag, Receipt, CircleDollarSign, AlertCircle, User, UserPlus, UserMinus, Clock, CreditCard, Menu, X } from 'lucide-react';

export default function OwnerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) {
        setIsSidebarOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/owner/dashboard', label: 'Dashboard',  icon: LayoutDashboard },
    { to: '/owner/clients',   label: 'Clients',    icon: Users },
    { to: '/owner/inactive-clients', label: 'Inactive Clients', icon: UserMinus },
    { to: '/owner/plans',     label: 'Plans',      icon: Tag },
    { to: '/owner/clients-payment', label: 'Clients Payment', icon: Receipt },
    { to: '/owner/dues',      label: 'Dues',       icon: CircleDollarSign },
    { to: '/owner/payment-ledger', label: 'Payment Ledger', icon: CircleDollarSign },
    { to: '/owner/requests',  label: 'Requests',   icon: UserPlus },
    { to: '/owner/profile',   label: 'Profile',    icon: User },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0f1117', flexDirection: isMobile ? 'column' : 'row' }}>

      {/* MOBILE HEADER BAR */}
      {isMobile && (
        <header style={{
          height: '60px',
          background: '#1a1d27',
          borderBottom: '1px solid #2a2d3a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          zIndex: 40,
          position: 'relative'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: '#4ade80', fontWeight: 700, fontSize: '18px' }}>GymPro</span>
            <span style={{ color: '#6b7280', fontSize: '12px' }}>
              {user?.gymName ? `- ${user.gymName}` : ''}
            </span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            style={{
              background: 'transparent',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px',
              borderRadius: '6px',
              border: '1px solid #374151'
            }}
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </header>
      )}

      {/* MOBILE DRAWER BACKDROP */}
      {isMobile && isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 45,
            transition: 'opacity 0.2s'
          }}
        />
      )}

      {/* SIDEBAR */}
      <aside style={
        isMobile ? {
          position: 'fixed',
          top: 0,
          left: isSidebarOpen ? 0 : '-260px',
          width: '260px',
          height: '100vh',
          background: '#1a1d27',
          borderRight: '1px solid #2a2d3a',
          display: 'flex',
          flexDirection: 'column',
          padding: '0',
          zIndex: 50,
          transition: 'left 0.3s ease-in-out'
        } : {
          width: '240px', minWidth: '240px',
          background: '#1a1d27',
          borderRight: '1px solid #2a2d3a',
          display: 'flex', flexDirection: 'column',
          padding: '0'
        }
      }>
        {/* Logo / Gym Name */}
        <div style={{
          padding: '24px 20px',
          borderBottom: '1px solid #2a2d3a',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}>
          {isMobile && (
            <button 
              onClick={() => setIsSidebarOpen(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'transparent',
                border: 'none',
                color: '#9ca3af',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>
          )}
          <div style={{ color: '#4ade80', fontWeight: 700, fontSize: '18px' }}>
            GymPro
          </div>
          <div style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px' }}>
            {user?.gymName || 'Gym Owner Portal'}
          </div>
          <div style={{
            marginTop: '8px', padding: '4px 8px',
            background: '#0f2d1f', borderRadius: '4px',
            color: '#4ade80', fontSize: '11px',
            fontWeight: 600, display: 'inline-block',
            width: 'fit-content'
          }}>
            {user?.gymId || ''}
          </div>
        </div>

        {/* Nav Links */}
        <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => {
                if (isMobile) setIsSidebarOpen(false);
              }}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center',
                gap: '10px', padding: '11px 20px',
                textDecoration: 'none',
                color: isActive ? '#ffffff' : '#9ca3af',
                background: isActive ? '#2563eb' : 'transparent',
                borderRadius: isActive ? '0' : '0',
                fontSize: '14px', fontWeight: isActive ? 500 : 400,
                borderLeft: isActive ? '3px solid #60a5fa' : '3px solid transparent',
                transition: 'all 0.15s'
              })}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid #2a2d3a' }}>
          <button onClick={handleLogout} style={{
            width: '100%', padding: '10px',
            background: 'transparent',
            border: '1px solid #374151',
            borderRadius: '6px', color: '#9ca3af',
            cursor: 'pointer', fontSize: '14px'
          }}>
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main style={{
        flex: 1, overflowY: 'auto',
        background: '#0f1117', color: '#ffffff'
      }}>
        <Outlet />
      </main>
    </div>
  );
}
