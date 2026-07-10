import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ClientSidebar from '../components/ClientSidebar';
import ClientHeader from '../components/ClientHeader';
import api from '../utils/api';

export default function ClientLayout() {
  const { user } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [clientName, setClientName] = useState(user?.personalInfo?.name || 'Member');
  const [clientEmail, setClientEmail] = useState(user?.personalInfo?.email || '');

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
    const fetchProfile = async () => {
      try {
        const res = await api.get('/client/profile');
        setClientName(res.data.data?.personalInfo?.name || user?.personalInfo?.name || 'Member');
        setClientEmail(res.data.data?.personalInfo?.email || user?.personalInfo?.email || '');
      } catch {
        setClientName(user?.personalInfo?.name || 'Member');
        setClientEmail(user?.personalInfo?.email || '');
      }
    };
    fetchProfile();
  }, [user?.personalInfo?.name, user?.personalInfo?.email]);

  return (
    <div className={`flex h-screen bg-surface-primary overflow-hidden ${isMobile ? 'flex-col' : 'flex-row'}`}>
      {isMobile && (
        <header className="h-16 bg-surface-secondary border-b border-border flex items-center justify-between px-6 z-40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent flex justify-center items-center font-bold text-sm text-text-primary shadow-md">
              {user?.avatar || 'C'}
            </div>
            <div>
              <span className="text-text-primary font-bold text-base tracking-tight truncate max-w-[120px] inline-block">
                {clientName}
              </span>
              <span className="text-xs text-text-muted block -mt-1 uppercase tracking-wider truncate max-w-[120px]">
                {user?.gymName}
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 border border-border rounded-lg text-text-primary hover:bg-surface-divider transition-colors"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </header>
      )}

      {isMobile && isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] transition-opacity"
        />
      )}

      <ClientSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} isMobile={isMobile} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {!isMobile && <ClientHeader clientName={clientName} clientEmail={clientEmail} isMobile={isMobile} />}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 md:pt-10 space-y-8 scrollbar-hide">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
