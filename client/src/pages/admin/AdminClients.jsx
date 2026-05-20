import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { toast } from 'react-toastify';
import { AdminSidebar } from './AdminDashboard';
import Button from '../../components/Button';
import { ArrowLeft, Menu, X } from 'lucide-react';

const AdminClients = () => {
    const { gymId } = useParams();
    const [clients, setClients] = useState([]);
    const [gymInfo, setGymInfo] = useState(null);
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
                <div className="mb-8 flex items-center gap-4">
                   <Button variant="secondary" onClick={() => navigate(-1)} className="!p-2 rounded-full"><ArrowLeft size={20}/></Button>
                   <div>
                       <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Gym Clients</h1>
                       <p className="text-gray-400 mt-1 text-sm md:text-base">Viewing clients for gym: {gymId}</p>
                   </div>
                </div>

                <div className="bg-card rounded-xl border border-gray-800 overflow-x-auto shadow-lg">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                            <tr className="bg-gray-800/50 border-b border-gray-700 text-gray-400 text-sm tracking-wider uppercase">
                                <th className="p-4 font-medium">Client Info</th>
                                <th className="p-4 font-medium">Contact</th>
                                <th className="p-4 font-medium">Plan</th>
                                <th className="p-4 font-medium">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {loading ? (
                                <tr><td colSpan="4" className="text-center p-10 text-gray-500">Loading...</td></tr>
                            ) : clients.length === 0 ? (
                                <tr><td colSpan="4" className="text-center p-10 text-gray-500">No clients found for this gym.</td></tr>
                            ) : clients.map(client => (
                                <tr key={client._id} className="hover:bg-gray-800/20">
                                    <td className="p-4 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
                                            {client.avatar}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-white">{client.personalInfo.name}</p>
                                            <p className="text-xs text-gray-400">{client.clientId}</p>
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm text-gray-300">{client.personalInfo.mobileNo}</td>
                                    <td className="p-4 text-sm text-gray-300">{client.membership.planName || 'N/A'}</td>
                                    <td className="p-4">
                                       <span className={`px-2 py-1 text-xs rounded-full ${client.membership.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-gray-500/10 text-gray-400'}`}>
                                            {client.membership.status.toUpperCase()}
                                        </span>
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

export default AdminClients;
