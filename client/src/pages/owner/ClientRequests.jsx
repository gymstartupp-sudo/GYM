import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { toast } from 'react-toastify';
import { UserPlus, Check, X, Clock } from 'lucide-react';
import Button from '../../components/Button';
import PaymentModal from '../../components/PaymentModal';

const ClientRequests = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionId, setActionId] = useState(null);
    const [actionType, setActionType] = useState(null);

    const [plans, setPlans] = useState([]);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [selectedPlan, setSelectedPlan] = useState(null);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            // Reusing the client list endpoint with status=pending
            const res = await api.get('/client?status=pending');
            setRequests(res.data.data || []);
        } catch (error) {
            toast.error("Failed to load client requests");
        } finally {
            setLoading(false);
        }
    };

    const fetchPlans = async () => {
        try {
            const res = await api.get('/plan');
            setPlans(res.data.data || []);
        } catch (error) {
            console.error("Failed to load plans", error);
        }
    };

    useEffect(() => {
        fetchRequests();
        fetchPlans();
    }, []);

    const handleApproveWithPayment = async (paymentData) => {
        if (!selectedRequest) return;
        setActionId(selectedRequest._id);
        setActionType('approve');
        try {
            await api.put(`/client/${selectedRequest._id}/approve`, paymentData);
            toast.success("Client Approved and ID Generated!");
            fetchRequests();
            setShowPaymentModal(false);
            setSelectedRequest(null);
            setSelectedPlan(null);
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to approve client");
            throw error; // Let PaymentModal handle loading state reset
        } finally {
            setActionId(null);
            setActionType(null);
        }
    };

    const handleReject = async (id) => {
        if (!window.confirm("Are you sure you want to reject this request? This will delete the request permanently.")) return;
        setActionId(id);
        setActionType('reject');
        try {
            await api.delete(`/client/${id}`);
            toast.success("Request rejected and removed.");
            fetchRequests();
        } catch (error) {
            toast.error("Failed to reject request");
        } finally {
            setActionId(null);
            setActionType(null);
        }
    };

    return (
        <div className="flex bg-dark h-screen overflow-hidden">
            <div className="flex-1 overflow-y-auto p-8 pt-10">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <UserPlus className="text-primary" size={32} /> Client Requests
                    </h1>
                    <p className="text-gray-400 mt-1">Review and approve new membership registrations.</p>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : requests.length === 0 ? (
                    <div className="card bg-gray-900 border-gray-800 text-center py-16 text-gray-400">
                        <Clock size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="text-lg font-medium">No pending requests</p>
                        <p className="text-sm mt-1 text-gray-600">New registration requests will appear here.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {requests.map((req) => (
                            <div key={req._id} className="card bg-gray-900 border-gray-800 hover:border-gray-700 transition-all">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl">
                                            {req.personalInfo.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white">{req.personalInfo.name}</h3>
                                            <p className="text-gray-400 text-sm">{req.personalInfo.mobileNo} • {req.personalInfo.email}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:flex items-center gap-8 text-sm">
                                        <div>
                                            <p className="text-gray-500 uppercase text-[10px] font-bold tracking-wider mb-1">Requested Plan</p>
                                            <p className="text-white font-medium">{req.membership.planName || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500 uppercase text-[10px] font-bold tracking-wider mb-1">Request Date</p>
                                            <p className="text-white font-medium">{new Date(req.createdAt).toLocaleDateString('en-GB').replace(/\//g, '-')}</p>
                                        </div>
                                        <div className="hidden md:block">
                                            <p className="text-gray-500 uppercase text-[10px] font-bold tracking-wider mb-1">Status</p>
                                            <span className="px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500 text-[10px] font-bold uppercase">
                                                {req.membership.status}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Button 
                                            variant="secondary" 
                                            onClick={() => handleReject(req._id)}
                                            className="!text-red-400 !border-red-500/20 hover:!bg-red-500/10"
                                            isLoading={actionId === req._id && actionType === 'reject'}
                                            disabled={actionId !== null}
                                        >
                                            <X size={16} className="mr-1" /> REJECT
                                        </Button>
                                        <Button 
                                            onClick={() => {
                                                const plan = plans.find(p => p._id === req.membership?.planId);
                                                setSelectedRequest(req);
                                                setSelectedPlan(plan);
                                                setShowPaymentModal(true);
                                            }}
                                            className="bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-900/20"
                                            disabled={actionId !== null}
                                        >
                                            <Check size={16} className="mr-1" /> APPROVE
                                        </Button>
                                    </div>
                                </div>
                             </div>
                        ))}
                    </div>
                )}
            </div>

            {showPaymentModal && selectedRequest && (
                <PaymentModal
                    isOpen={showPaymentModal}
                    onClose={() => {
                        setShowPaymentModal(false);
                        setSelectedRequest(null);
                        setSelectedPlan(null);
                    }}
                    onSave={handleApproveWithPayment}
                    clientData={selectedRequest}
                    planData={selectedPlan}
                    plans={plans}
                    lockClient={true}
                />
            )}
        </div>
    );
};

export default ClientRequests;
