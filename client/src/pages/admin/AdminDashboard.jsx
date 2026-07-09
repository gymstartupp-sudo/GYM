import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { AdminSidebar } from '../../components/AdminSidebar';
import ThemeToggle from '../../components/ThemeToggle';

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const [isMobile, setIsMobile] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const [runningCheck, setRunningCheck] = useState(false);
    const [checkResults, setCheckResults] = useState(null);
    const [runningReminders, setRunningReminders] = useState(false);

    const handleRunOverdueCheck = async () => {
        setRunningCheck(true);
        setCheckResults(null);
        try {
            const res = await api.post('/admin/overdue-check');
            setCheckResults(res.data.data);
            toast.success("Overdue check executed successfully");
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to execute overdue check");
        } finally {
            setRunningCheck(false);
        }
    };

    const handleRunRemindersJob = async () => {
        setRunningReminders(true);
        try {
            const res = await api.post('/trigger/reminders');
            if (res.data.success) {
                toast.success(res.data.message || 'Reminder job executed successfully!');
            } else {
                toast.error(res.data.message || 'Failed to execute reminder job.');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error triggering reminder job');
        } finally {
            setRunningReminders(false);
        }
    };

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
        <div className={`flex bg-surface-primary h-screen overflow-hidden ${isMobile ? 'flex-col' : 'flex-row'}`}>
            {/* MOBILE HEADER BAR */}
            {isMobile && (
                <header className="h-16 bg-surface-secondary border-b border-border flex items-center justify-between px-6 z-40 shrink-0">
                    <span className="text-primary font-bold text-base tracking-tight">Super Admin</span>
                    <div className="flex items-center gap-2">
                      <ThemeToggle className="w-9 h-9" />
                      <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 border border-border rounded-lg text-text-primary hover:bg-surface-hover transition-colors duration-200"
                      >
                        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
                      </button>
                    </div>
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
                <h1 className="page-heading text-2xl md:text-[36px] mb-8">Platform Overview</h1>

                {loading ? <div className="text-text-muted">Loading data...</div> : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                        <div className="kpi-card">
                            <p className="kpi-card-label">Total Gyms Onboarded</p>
                            <h3 className="kpi-card-value">{stats?.totalGyms || 0}</h3>
                        </div>
                        <div className="kpi-card">
                            <p className="kpi-card-label">Total Active Clients</p>
                            <h3 className="kpi-card-value">{stats?.totalClients || 0}</h3>
                        </div>
                        <div className="kpi-card">
                            <p className="kpi-card-label">Platform Revenue/Payments</p>
                            <h3 className="kpi-card-value">{stats?.totalPayments || 0} Trx</h3>
                        </div>
                    </div>
                )}

                {/* System Diagnostics & Manual Expiry Reminders */}
                <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                    <div className="card border-border bg-surface-divider/80 p-6 rounded-2xl border">
                        <h2 className="text-lg font-bold text-text-primary mb-2">System Diagnostics</h2>
                        <p className="text-text-secondary text-xs mb-5">Manually run status updater overdue calculations. This runs identical backend business rules as the daily automated schedule.</p>
                        
                        <button
                            type="button"
                            onClick={handleRunOverdueCheck}
                            disabled={runningCheck}
                            className="px-5 py-2.5 bg-primary text-text-primary text-xs font-bold rounded-lg hover:brightness-95 transition-all shadow-md shadow-primary/10 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {runningCheck ? 'Running Overdue Check...' : 'Run Overdue Check'}
                        </button>

                        {checkResults && (
                            <div className="mt-5 p-4 bg-surface-divider/80 border border-border rounded-xl space-y-2 text-xs font-mono text-text-secondary animate-in fade-in slide-in-from-top-2 duration-300">
                                <p className="text-emerald-400 font-bold mb-1">Execution Statistics:</p>
                                <div className="grid grid-cols-2 gap-y-1 text-[11px]">
                                    <span>Clients Checked:</span>
                                    <span className="text-text-primary font-bold">{checkResults.clientsChecked}</span>
                                    <span>Clients Marked Overdue:</span>
                                    <span className="text-text-primary font-bold">{checkResults.clientsMarkedOverdue}</span>
                                    <span>Clients Skipped:</span>
                                    <span className="text-text-primary font-bold">{checkResults.clientsSkipped}</span>
                                    <span>Execution Time:</span>
                                    <span className="text-text-primary font-bold">{checkResults.executionTime}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="card border-border bg-surface-divider/80 p-6 rounded-2xl border">
                        <h2 className="text-lg font-bold text-text-primary mb-2">Manual Expiry Reminders</h2>
                        <p className="text-text-secondary text-xs mb-5">Manually execute the daily WhatsApp expiry reminders job. This sends expiration warning alerts to clients via Twilio WhatsApp API.</p>
                        
                        <button
                            type="button"
                            onClick={handleRunRemindersJob}
                            disabled={runningReminders}
                            className="px-5 py-2.5 bg-primary text-text-primary text-xs font-bold rounded-lg hover:brightness-95 transition-all shadow-md shadow-primary/10 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {runningReminders ? 'Running Reminders Job...' : 'Run Expiry Reminders'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
