import React, { useState, useEffect } from 'react';
// Sidebar removed
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { toast } from 'react-toastify';
import { AlertOctagon } from 'lucide-react';
import ClientCard from '../../components/ClientCard';

const Overdue = () => {
    const navigate = useNavigate();
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchOverdueClients = async () => {
        try {
            const res = await api.get('/overdue');
            setClients(res.data.data);
        } catch(e) {
            toast.error("Failed to load overdue clients");
        }
        setLoading(false);
    };

    useEffect(() => { fetchOverdueClients(); }, []);

    const handleRenew = (client) => {
        navigate('/owner/clients-payment', { state: { showPaymentModal: true, client } });
    };

    const handleView = (client) => {
        navigate(`/owner/clients/${client._id}`);
    };

    return (
        <div className="flex bg-surface-primary h-screen overflow-hidden">
            <></>
            <div className="flex-1 overflow-y-auto p-8 pt-10">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-text-primary tracking-tight flex items-center gap-3">
                        <AlertOctagon className="text-alert" size={32} /> Payment Overdue
                    </h1>
                    <p className="text-text-secondary mt-1">Clients who have outstanding payments past their due date.</p>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="w-10 h-10 border-4 border-alert border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : clients.length === 0 ? (
                    <div className="card bg-surface-secondary border-alert/20 text-center py-16 text-text-secondary">No clients found</div>
                ) : (
                    <div className="card p-0 bg-surface-secondary border border-border rounded-xl overflow-hidden shadow-lg">
                        {/* List Header */}
                        <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_2fr_1fr_1fr_1fr] gap-2 px-4 py-4 bg-surface-secondary/80 border-b border-border text-xs font-semibold text-text-secondary uppercase tracking-wider sticky top-0 z-10 backdrop-blur-sm">
                            <div>Client Info</div>
                            <div>Mobile</div>
                            <div>Plan</div>
                            <div>Duration</div>
                            <div>Days Left</div>
                            <div>Status</div>
                            <div className="text-right pd-pr-4">Actions</div>
                        </div>

                        <div className="flex flex-col">
                            {clients.map((client) => (
                                <ClientCard
                                    key={client._id}
                                    client={client}
                                    onView={handleView}
                                    onRenew={handleRenew}
                                    showRenew
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Overdue;
