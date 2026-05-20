import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../hooks/useAuth';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { LogOut, LayoutDashboard, Building2, Users, Menu, X } from 'lucide-react';
import { toast } from 'react-toastify';

export const AdminSidebar = ({ isOpen, onClose, isMobile }) => {
    const { logout } = useAuth();
    const navigate = useNavigate();
    return (
      <div className={`${isMobile ? `fixed inset-y-0 left-0 z-50 w-64 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out` : 'w-64'} h-screen bg-gray-900 border-r border-gray-800 flex flex-col pt-6 px-4 shrink-0`}>
        <div className="flex items-center justify-between gap-3 mb-10 px-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 flex justify-center items-center font-bold text-lg text-white shadow-lg shadow-purple-600/30">SA</div>
            <div><h2 className="font-bold text-white text-lg tracking-tight -mb-1">Super Admin</h2></div>
          </div>
          {isMobile && (
            <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
              <X size={20} />
            </button>
          )}
        </div>
        <div className="flex-1 space-y-2">
            <NavLink to="/admin" end onClick={() => isMobile && onClose()} className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all group ${isActive ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:text-white'}`}><LayoutDashboard size={20}/> Dashboard</NavLink>
            <NavLink to="/admin/gyms" onClick={() => isMobile && onClose()} className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all group ${isActive ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:text-white'}`}><Building2 size={20}/> All Gyms</NavLink>
        </div>
        <div className="pb-6 pt-4 border-t border-gray-800">
           <button onClick={() => {logout(); navigate('/login');}} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-red-500/10 hover:text-alert transition-all group"><LogOut size={20}/> Logout</button>
        </div>
      </div>
    );
};

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

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

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/admin/dashboard');
                setStats(res.data.data);
            } catch(e) {
                toast.error("Failed to load dashboard data");
            }
            setLoading(false);
        };
        fetchStats();
    }, []);

    return (
        <div className={`flex bg-dark h-screen overflow-hidden ${isMobile ? 'flex-col' : 'flex-row'}`}>
            {/* MOBILE HEADER BAR */}
            {isMobile && (
                <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 z-40 shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="text-purple-500 font-bold text-base tracking-tight">Super Admin</span>
                    </div>
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 border border-gray-700 rounded-lg text-white hover:bg-gray-800 transition-colors"
                    >
                        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </header>
            )}

            {/* MOBILE DRAWER BACKDROP */}
            {isMobile && isSidebarOpen && (
                <div 
                    onClick={() => setIsSidebarOpen(false)}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-45 transition-opacity"
                />
            )}

            <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} isMobile={isMobile} />
            
            <div className="flex-1 overflow-y-auto p-4 md:p-8 md:pt-10">
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-8 tracking-tight">Platform Overview</h1>

                {loading ? <div className="text-gray-500">Loading data...</div> : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                        <div className="card border-primary/20 bg-primary/5">
                            <p className="text-gray-400 mb-1 text-sm md:text-base">Total Gyms Onboarded</p>
                            <h3 className="text-3xl md:text-4xl font-bold text-white">{stats?.totalGyms || 0}</h3>
                        </div>
                        <div className="card border-purple-500/20 bg-purple-500/5">
                            <p className="text-gray-400 mb-1 text-sm md:text-base">Total Active Clients</p>
                            <h3 className="text-3xl md:text-4xl font-bold text-white">{stats?.totalClients || 0}</h3>
                        </div>
                        <div className="card border-emerald-500/20 bg-emerald-500/5">
                            <p className="text-gray-400 mb-1 text-sm md:text-base">Platform Revenue/Payments</p>
                            <h3 className="text-3xl md:text-4xl font-bold text-white">{stats?.totalPayments || 0} Trx</h3>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
