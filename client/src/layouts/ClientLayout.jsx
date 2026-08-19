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
  const [profile, setProfile] = useState(null);

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
        setProfile(res.data.data);
        setClientName(res.data.data?.personalInfo?.name || user?.personalInfo?.name || 'Member');
        setClientEmail(res.data.data?.personalInfo?.email || user?.personalInfo?.email || '');
      } catch {
        setClientName(user?.personalInfo?.name || 'Member');
        setClientEmail(user?.personalInfo?.email || '');
      }
    };
    fetchProfile();
    const interval = setInterval(fetchProfile, 30000);
    window.addEventListener('profileUpdated', fetchProfile);
    return () => {
      clearInterval(interval);
      window.removeEventListener('profileUpdated', fetchProfile);
    };
  }, [user?.personalInfo?.name, user?.personalInfo?.email]);

  return (
    <div className="flex flex-col w-full h-screen bg-surface-primary overflow-hidden">
      {isMobile && isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] transition-opacity"
        />
      )}

      <div className={`flex flex-1 overflow-hidden ${isMobile ? 'flex-col' : 'flex-row'}`}>
        <ClientSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} isMobile={isMobile} />

        <div className="flex-1 flex flex-col overflow-hidden bg-surface-primary text-text-primary w-full max-w-full">
          <ClientHeader
            clientName={clientName}
            clientEmail={clientEmail}
            isMobile={isMobile}
            isSidebarOpen={isSidebarOpen}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            profile={profile}
          />
          <main className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full p-4 md:p-8 md:pt-10 space-y-8 scrollbar-hide">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
