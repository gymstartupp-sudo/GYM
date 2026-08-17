import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { toast } from 'react-toastify';
import { Clock, History, X } from 'lucide-react';
import ClientCard from '../../components/ClientCard';
import ClientDetail from './ClientDetail';
import PaymentModal from '../../components/PaymentModal';

const Expired = () => {
    const navigate = useNavigate();
    const [clients, setClients] = useState([]);
    const [plans, setPlans] = useState([]);
    const [allPayments, setAllPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewClientId, setViewClientId] = useState(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedClientForRenewal, setSelectedClientForRenewal] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [expiredRes, plansRes, paymentsRes] = await Promise.all([
                api.get('/overdue/expired'),
                api.get('/plan'),
                api.get('/payment')
            ]);
            setClients(expiredRes.data.data);
            setPlans(plansRes.data.data);
            setAllPayments(paymentsRes.data.data || []);
        } catch(e) {
            toast.error("Failed to load data");
        }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const handleRenew = (client) => {
        setSelectedClientForRenewal(client);
        setShowPaymentModal(true);
    };

    const handleRenewalSave = async (paymentData) => {
        try {
            if (paymentData._isUpdate && paymentData._paymentId) {
                // Update existing pending payment
                const additionalAmount = Number(paymentData.paidAmount) || 0;
                if (additionalAmount <= 0) {
                    setShowPaymentModal(false);
                    return;
                }
                await api.put(`/payment/${paymentData._paymentId}`, {
                    additionalAmount,
                    paymentMethod: paymentData.paymentMethod
                });
                toast.success('Payment updated successfully');
            } else {
                // New payment / renewal
                await api.post('/payment', paymentData);
                // Reactivate client if they were inactive
                if (selectedClientForRenewal.status === 'inactive') {
                    await api.put(`/client/${selectedClientForRenewal._id}/reactivate`);
                }
                toast.success("Membership renewed successfully");
            }
            setShowPaymentModal(false);
            setSelectedClientForRenewal(null);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to process payment");
            throw error;
        }
    };

    const handleView = (client) => {
        setViewClientId(client._id);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to deactivate this client?')) {
            try {
                await api.put(`/client/${id}/deactivate`);
                toast.success('Client deactivated');
                fetchData();
            } catch {
                toast.error('Failed to deactivate');
            }
        }
    };

    return (
        <div className="p-8 pt-10">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-text-primary tracking-tight flex items-center gap-3">
                        <History className="text-text-secondary" size={32} /> Expired Memberships
                    </h1>
                    <p className="text-text-secondary mt-1">Clients whose plans have ended. Renew their memberships to restore access.</p>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : clients.length === 0 ? (
                    <div className="card bg-surface-secondary border-border text-center py-16 text-text-secondary">
                        No expired memberships found.
                    </div>
                ) : (
                    <div className="card p-0 bg-surface-secondary border border-border rounded-xl overflow-hidden shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_2fr_1fr_1fr_1fr] gap-2 px-4 py-4 bg-surface-hover/50 border-b border-border text-xs font-semibold text-text-secondary uppercase tracking-wider sticky top-0 z-10 backdrop-blur-sm">
                            <div>Client Info</div>
                            <div className="text-center">Mobile</div>
                            <div className="text-center">Last Plan</div>
                            <div className="text-center">Ended On</div>
                            <div className="text-center">Days Ago</div>
                            <div className="text-center">Status</div>
                            <div className="text-right pr-4">Actions</div>
                        </div>

                        <div className="flex flex-col">
                            {clients.map((client) => (
                                <ClientCard
                                    key={client._id}
                                    client={client}
                                    onView={handleView}
                                    onRenew={handleRenew}
                                    onDelete={(selected) => handleDelete(selected._id)}
                                    showRenew={true}
                                    hideStatus={true}
                                />
                            ))}
                        </div>
                    </div>
                )}

            {/* View Client Modal */}
            {viewClientId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="relative bg-surface-secondary border border-border/50 rounded-xl w-full max-w-4xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-border flex justify-between items-center shrink-0">
                            <h2 className="text-lg font-bold text-text-primary">Client Details</h2>
                            <button onClick={() => setViewClientId(null)} className="text-text-secondary hover:text-text-primary transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="overflow-y-auto custom-scrollbar flex-1">
                            <ClientDetail clientId={viewClientId} onClose={() => { setViewClientId(null); fetchData(); }} />
                        </div>
                    </div>
                </div>
            )}
            {/* Payment Modal */}
            {showPaymentModal && selectedClientForRenewal && (
                <PaymentModal
                    isOpen={showPaymentModal}
                    onClose={() => { setShowPaymentModal(false); setSelectedClientForRenewal(null); }}
                    onSave={handleRenewalSave}
                    clientData={selectedClientForRenewal}
                    lockClient={true}
                    plans={plans}
                    payments={allPayments}
                />
            )}
        </div>
    );
};

export default Expired;
