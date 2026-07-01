import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { toast } from 'react-toastify';
import { AdminSidebar } from '../../components/AdminSidebar';
import Button from '../../components/Button';
import { ArrowLeft, Menu, X } from 'lucide-react';
import Pagination from '../../components/Pagination';

const AdminClients = () => {
    const { gymId } = useParams();
    const [clients, setClients] = useState([]);
    const [gymInfo, setGymInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const [currentPage, setCurrentPage] = useState(1);

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
        const fetchData = async () => {
            try {
                // Fetch Clients
                const res = await api.get(`/client?gymId=${gymId}`);
                setClients(res.data.data);
                
                // Fetch Gym Info (Assuming admin can fetch gym profile, or we display what we have)
                // For simplicity, we just show the clients list
            } catch(e) {
                toast.error("Failed to load gym clients");
            }
            setLoading(false);
        };
        fetchData();
    }, [gymId]);

    useEffect(() => {
        setCurrentPage(1);
    }, [clients.length]);

    const paginatedClients = useMemo(() => {
        const startIndex = (currentPage - 1) * 10;
        return clients.slice(startIndex, startIndex + 10);
    }, [clients, currentPage]);

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
                <div className="mb-8 flex items-center gap-4">
                   <Button variant="secondary" onClick={() => navigate(-1)} className="!p-2 rounded-full"><ArrowLeft size={20}/></Button>
                   <div>
                       <h1 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight">Gym Clients</h1>
                       <p className="text-text-secondary mt-1 text-sm md:text-base">Viewing clients for gym: {gymId}</p>
                   </div>
                </div>

                <div className="bg-card rounded-xl border border-border overflow-x-auto shadow-lg">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                            <tr className="bg-surface-hover/50 border-b border-border text-text-secondary text-sm tracking-wider uppercase">
                                <th className="p-4 font-medium">Client Info</th>
                                <th className="p-4 font-medium">Contact</th>
                                <th className="p-4 font-medium">Plan</th>
                                <th className="p-4 font-medium">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                <tr><td colSpan="4" className="text-center p-10 text-text-muted">Loading...</td></tr>
                            ) : clients.length === 0 ? (
                                <tr><td colSpan="4" className="text-center p-10 text-text-muted">No clients found for this gym.</td></tr>
                            ) : paginatedClients.map(client => (
                                <tr key={client._id} className="hover:bg-surface-divider/50">
                                    <td className="p-4 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
                                            {client.avatar}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-text-primary">{client.personalInfo.name}</p>
                                            <p className="text-xs text-text-secondary">{client.clientId}</p>
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm text-text-secondary">{client.personalInfo.mobileNo}</td>
                                    <td className="p-4 text-sm text-text-secondary">{client.membership?.planName || 'N/A'}</td>
                                    <td className="p-4">
                                       <span className={`px-2 py-1 text-xs rounded-full ${client.membership?.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-gray-500/10 text-text-secondary'}`}>
                                            {(client.membership?.status || 'N/A').toUpperCase()}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <Pagination
                        currentPage={currentPage}
                        totalPages={Math.ceil(clients.length / 10)}
                        onPageChange={setCurrentPage}
                    />
                </div>
            </div>
        </div>
    );
};

export default AdminClients;
