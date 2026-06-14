import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { toast } from 'react-toastify';
import { AdminSidebar } from '../../components/AdminSidebar';
import Button from '../../components/Button';
import { useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const AdminGyms = () => {
    const [gyms, setGyms] = useState([]);
    const [loading, setLoading] = useState(true);
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

    const fetchGyms = async () => {
        try {
            const res = await api.get('/admin/gyms');
            setGyms(res.data.data);
        } catch(e) {
            toast.error("Failed to load gyms");
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchGyms();
    }, []);

    const toggleStatus = async (id) => {
        try {
            await api.put(`/admin/gym/${id}/status`);
            fetchGyms();
            toast.success("Gym status toggled");
        } catch(e) {
            toast.error("Failed to update status");
        }
    };

    return (
        <div className={`flex bg-surface-primary h-screen overflow-hidden ${isMobile ? 'flex-col' : 'flex-row'}`}>
            {/* MOBILE HEADER BAR */}
            {isMobile && (
                <header className="h-16 bg-surface-secondary border-b border-border flex items-center justify-between px-6 z-40 shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="text-purple-500 font-bold text-base tracking-tight">Super Admin</span>
                    </div>
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 border border-border rounded-lg text-text-primary hover:bg-surface-divider transition-colors"
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
                <h1 className="text-2xl md:text-3xl font-bold text-text-primary mb-8 tracking-tight">All Vendor Gyms</h1>

                <div className="bg-card rounded-xl border border-border overflow-x-auto shadow-lg">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                            <tr className="bg-surface-hover/50 border-b border-border text-text-secondary text-sm tracking-wider uppercase">
                                <th className="p-4 font-medium">Gym Details</th>
                                <th className="p-4 font-medium">Owner</th>
                                <th className="p-4 font-medium">Contact</th>
                                <th className="p-4 font-medium">Status</th>
                                <th className="p-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                <tr><td colSpan="5" className="text-center p-10 text-text-muted">Loading...</td></tr>
                            ) : gyms.map(gym => (
                                <tr key={gym._id} className="hover:bg-surface-divider/50">
                                    <td className="p-4 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
                                            {gym.gymName.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-text-primary">{gym.gymName}</p>
                                            <p className="text-xs text-text-secondary">{gym.gymId}</p>
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm text-text-secondary">{gym.ownerName}</td>
                                    <td className="p-4 text-sm text-text-secondary">{gym.gymContact}</td>
                                    <td className="p-4">
                                        {gym.isActive ? 
                                            <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 text-xs rounded-full">Active</span> : 
                                            <span className="px-2 py-1 bg-red-500/10 text-red-500 text-xs rounded-full">Inactive</span>
                                        }
                                    </td>
                                    <td className="p-4 text-right flex justify-end gap-2">
                                        <Button variant="secondary" onClick={() => navigate(`/admin/gyms/${gym.gymId}/clients`)} className="!py-1.5 !px-3 text-xs">
                                            View Clients
                                        </Button>
                                        <Button variant={gym.isActive ? "danger" : "primary"} onClick={() => toggleStatus(gym._id)} className="!py-1.5 !px-3 text-xs">
                                            {gym.isActive ? 'Deactivate' : 'Activate'}
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminGyms;
