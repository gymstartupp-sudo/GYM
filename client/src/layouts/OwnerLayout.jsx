import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
  LogOut,
  UserMinus,
  UserPlus
} from 'lucide-react';
import api from '../utils/api';

export default function OwnerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('owner_sidebar_collapsed') === 'true');
  const [gymProfile, setGymProfile] = useState(null);

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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const gymName = gymProfile?.gym?.gymName || user?.gymName || 'Gym Owner';
  const gymAvatar = gymName.charAt(0).toUpperCase();

  const navItems = [
    { to: '/owner/dashboard', label: 'Dashboard',  icon: LayoutDashboard },
    { to: '/owner/clients',   label: 'Clients',    icon: Users },
    { to: '/owner/inactive-clients', label: 'Inactive Clients', icon: UserMinus },
    { to: '/owner/plans',     label: 'Plans',      icon: Tag },
    { to: '/owner/clients-payment', label: 'Clients Payment', icon: Receipt },
    { to: '/owner/dues',      label: 'Dues',       icon: CircleDollarSign },
    { to: '/owner/payment-ledger', label: 'Payment Ledger', icon: CircleDollarSign },
    { to: '/owner/requests',  label: 'Requests',   icon: UserPlus },
    { to: '/owner/feedback',  label: 'Feedback',   icon: MessageSquare },
    { to: '/owner/settings',  label: 'Settings',   icon: Settings },
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
            <span style={{ color: '#3b82f6', fontWeight: 800, fontSize: '18px', letterSpacing: '0.05em' }}>RexFit</span>
            <span style={{ color: '#6b7280', fontSize: '12px' }}>
              {gymName ? `- ${gymName}` : ''}
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
          width: isCollapsed ? '72px' : '240px',
          minWidth: isCollapsed ? '72px' : '240px',
          background: '#1a1d27',
          borderRight: '1px solid #2a2d3a',
          display: 'flex', flexDirection: 'column',
          padding: '0',
          transition: 'all 0.3s ease-in-out'
        }
      }>
        {/* Branding & Logo */}
        <div style={{
          padding: isCollapsed && !isMobile ? '20px 10px' : '24px 20px',
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

          {/* RexFit Logo and Brand */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed && !isMobile ? 'center' : 'space-between',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px', height: '36px',
                borderRadius: '8px', background: '#3b82f6',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#ffffff', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                flexShrink: 0
              }}>
                <Dumbbell size={20} style={{ transform: 'rotate(45deg)' }} />
              </div>
              {(!isCollapsed || isMobile) && (
                <span style={{ color: '#ffffff', fontWeight: 800, fontSize: '18px', letterSpacing: '0.05em' }}>
                  RexFit
                </span>
              )}
            </div>

            {!isMobile && (
              <button
                onClick={() => {
                  const nextCollapsed = !isCollapsed;
                  setIsCollapsed(nextCollapsed);
                  localStorage.setItem('owner_sidebar_collapsed', nextCollapsed);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#9ca3af',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px',
                  borderRadius: '4px'
                }}
                className="hover:bg-gray-800 hover:text-white transition-colors"
                title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              >
                {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
              </button>
            )}
          </div>

          {/* Profile Section */}
          <div 
            onClick={() => {
              navigate('/owner/profile');
              if (isMobile) setIsSidebarOpen(false);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: isCollapsed && !isMobile ? '8px 4px' : '8px 10px',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
            className="hover:bg-gray-800/60 group border border-transparent hover:border-gray-800"
            title={isCollapsed && !isMobile ? gymName : undefined}
          >
            <div style={{
              width: '36px', height: '36px',
              borderRadius: '8px', background: '#10b981',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 'bold', fontSize: '16px', color: '#ffffff',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              flexShrink: 0
            }}>
              {gymAvatar}
            </div>
            {(!isCollapsed || isMobile) && (
              <div style={{ minWidth: 0, flex: 1 }}>
                <h3 
                  style={{
                    fontWeight: 700, color: '#ffffff', fontSize: '13px',
                    margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}
                  className="group-hover:text-primary transition-colors"
                  title={gymName}
                >
                  {gymName}
                </h3>
                <span style={{ fontSize: '10px', color: '#6b7280', display: 'block', marginTop: '2px', fontWeight: 500, letterSpacing: '0.05em' }}>
                  Owner Account
                </span>
              </div>
            )}
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
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed && !isMobile ? 'center' : 'flex-start',
                gap: isCollapsed && !isMobile ? '0' : '10px',
                padding: isCollapsed && !isMobile ? '11px 0' : '11px 20px',
                textDecoration: 'none',
                color: isActive ? '#ffffff' : '#9ca3af',
                background: isActive ? '#2563eb' : 'transparent',
                borderRadius: '0',
                fontSize: '14px',
                fontWeight: isActive ? 500 : 400,
                borderLeft: isCollapsed && !isMobile
                  ? 'none'
                  : isActive
                  ? '3px solid #60a5fa'
                  : '3px solid transparent',
                transition: 'all 0.15s'
              })}
              title={isCollapsed && !isMobile ? item.label : undefined}
            >
              <item.icon size={18} style={{ flexShrink: 0 }} />
              {(!isCollapsed || isMobile) && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div style={{
          padding: isCollapsed && !isMobile ? '16px 10px' : '16px 20px',
          borderTop: '1px solid #2a2d3a',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <button 
            onClick={handleLogout} 
            style={{
              width: '100%',
              padding: '10px',
              background: 'transparent',
              border: '1px solid #374151',
              borderRadius: '6px',
              color: '#9ca3af',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            className="hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition-colors"
            title={isCollapsed && !isMobile ? 'Logout' : undefined}
          >
            <LogOut size={18} style={{ flexShrink: 0 }} />
            {(!isCollapsed || isMobile) && <span>Logout</span>}
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
