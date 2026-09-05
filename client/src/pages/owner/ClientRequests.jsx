import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import api from '../../utils/api';
import { toast } from 'react-toastify';
import { UserPlus, Check, X, Clock, AlertTriangle } from 'lucide-react';
import Button from '../../components/Button';
import PaymentModal from '../../components/PaymentModal';
import Pagination from '../../components/Pagination';
import { useAuth } from '../../context/AuthContext';

const ClientRequests = () => {
    const { role } = useAuth();
    const isReadOnly = role === 'superadmin' && !!sessionStorage.getItem('viewGymId');
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionId, setActionId] = useState(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [actionType, setActionType] = useState(null);

    const [plans, setPlans] = useState([]);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [rejectModalId, setRejectModalId] = useState(null);

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

    useEffect(() => {
        setCurrentPage(1);
    }, [requests.length]);

    const paginatedRequests = useMemo(() => {
        const startIndex = (currentPage - 1) * 10;
        return requests.slice(startIndex, startIndex + 10);
    }, [requests, currentPage]);

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

    const handleReject = (id) => {
        setRejectModalId(id);
    };

    const handleRejectConfirm = async (id) => {
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
        <div className="p-4 sm:p-8 pt-10">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-text-primary tracking-tight flex items-center gap-3">
                    Client Requests
                </h1>
                <p className="text-text-secondary mt-1">Review and approve new membership registrations.</p>
            </div>

            {loading ? (
                <div className="bg-card rounded-xl border border-border overflow-x-auto shadow-lg animate-pulse">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                            <tr className="bg-surface-hover/50 border-b border-border text-text-secondary text-xs tracking-wider uppercase">
                                <th className="p-4 font-medium">Client Info</th>
                                <th className="p-4 font-medium text-center">Requested Plan</th>
                                <th className="p-4 font-medium text-center">Requested Date</th>
                                <th className="p-4 font-medium text-center">Status</th>
                                <th className="p-4 font-medium text-right pr-4">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {[...Array(5)].map((_, i) => (
                                <tr key={i}>
                                    <td className="p-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-surface-divider rounded-xl animate-pulse shrink-0"></div>
                                            <div>
                                                <div className="h-4 w-24 bg-surface-divider rounded animate-pulse mb-1"></div>
                                                <div className="h-3 w-16 bg-surface-divider rounded animate-pulse"></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="h-4 w-20 bg-surface-divider rounded animate-pulse mx-auto"></div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="h-4 w-20 bg-surface-divider rounded animate-pulse mx-auto"></div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="h-5 w-14 bg-surface-divider rounded-full animate-pulse mx-auto"></div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="h-8 w-32 bg-surface-divider rounded-lg animate-pulse ml-auto"></div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : requests.length === 0 ? (
                <div className="card bg-surface-secondary border-border text-center py-16 text-text-secondary">
                    <Clock size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-medium">No pending requests</p>
                    <p className="text-sm mt-1 text-gray-600">New registration requests will appear here.</p>
                </div>
            ) : (
                <div className="md:bg-card md:rounded-xl md:border md:border-border overflow-x-auto md:shadow-lg">
                    <table className="w-full text-left border-collapse md:min-w-[760px]">
                        <thead>
                            <tr className="bg-surface-hover/50 border-b border-border text-text-secondary text-xs tracking-wider uppercase">
                                <th className="p-4 font-medium">Client Info</th>
                                <th className="p-4 font-medium text-center">Requested Plan</th>
                                <th className="p-4 font-medium text-center">Requested Date</th>
                                <th className="p-4 font-medium text-center">Status</th>
                                <th className="p-4 font-medium text-right pr-4">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {paginatedRequests.map((req) => (
                                <tr key={req._id} className="hover:bg-surface-divider/40 transition-colors group">
                                    {/* Client Info */}
                                    <td className="p-4">
                                        <div className="flex gap-3 items-center min-w-0">
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-lg border border-primary/20 shrink-0 shadow-inner overflow-hidden">
                                                {req.avatar && req.avatar.length > 1 ? (
                                                    <img src={req.avatar} alt={req.personalInfo.name} className="w-full h-full object-cover rounded-xl" />
                                                ) : (
                                                    (req.avatar || req.personalInfo.name.charAt(0)).toUpperCase()
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-semibold text-text-primary truncate group-hover:text-primary transition-colors">{req.personalInfo.name}</h3>
                                                <p className="text-xs text-text-muted truncate">{req.personalInfo.mobileNo}</p>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Requested Plan */}
                                    <td className="p-4 text-center">
                                        <p className="text-text-primary font-medium">{req.membership.planName || 'N/A'}</p>
                                    </td>

                                    {/* Requested Date */}
                                    <td className="p-4 text-center">
                                        <p className="text-text-primary font-medium">{new Date(req.createdAt).toLocaleDateString('en-GB').replace(/\//g, '-')}</p>
                                    </td>

                                    {/* Status */}
                                    <td className="p-4 text-center">
                                        <span className="px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500 text-[10px] font-bold uppercase inline-block">
                                            {req.membership.status}
                                        </span>
                                    </td>

                                    {/* Action */}
                                    <td className="p-4 text-right">
                                        <div className="flex gap-2 items-center justify-end shrink-0">
                                            {!isReadOnly ? (
                                                <>
                                                    <Button
                                                        variant="secondary"
                                                        onClick={() => handleReject(req._id)}
                                                        className="!text-red-400 !border-red-500/20 hover:!bg-red-500/10 px-3 py-1.5 text-xs flex items-center justify-center gap-1"
                                                        isLoading={actionId === req._id && actionType === 'reject'}
                                                        disabled={actionId !== null}
                                                    >
                                                        <X size={14} />
                                                        <span className="hidden xl:inline">REJECT</span>
                                                    </Button>
                                                    <Button
                                                        onClick={() => {
                                                            const plan = plans.find(p => p._id === req.membership?.planId);
                                                            setSelectedRequest(req);
                                                            setSelectedPlan(plan);
                                                            setShowPaymentModal(true);
                                                        }}
                                                        className="bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-900/20 px-3 py-1.5 text-xs flex items-center justify-center gap-1"
                                                        disabled={actionId !== null}
                                                    >
                                                        <Check size={14} />
                                                        <span className="hidden xl:inline">APPROVE</span>
                                                    </Button>
                                                </>
                                            ) : (
                                                <span className="text-text-muted text-xs italic">Read Only Mode</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="p-4 border-t border-border">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={Math.ceil(requests.length / 10)}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                </div>
            )}

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

            {rejectModalId && (
                createPortal(
                    <div
                        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                        style={{ background: 'var(--overlay)', backdropFilter: 'blur(6px)' }}
                        onClick={() => setRejectModalId(null)}
                    >
                        <div
                            className="relative w-full max-w-md rounded-2xl border shadow-2xl animate-in fade-in zoom-in-95 duration-200 bg-surface-secondary border-border p-8 flex flex-col items-center text-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Close button */}
                            <button
                                onClick={() => setRejectModalId(null)}
                                className="absolute top-4 right-4 p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-divider transition-all duration-200"
                            >
                                <X size={18} />
                            </button>

                            {/* Icon */}
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 shadow-lg bg-red-500/10 border border-red-500/20">
                                <AlertTriangle size={30} className="text-red-400" />
                            </div>

                            {/* Title */}
                            <h2 className="text-xl font-bold mb-3 text-text-primary">
                                Reject Confirmation
                            </h2>

                            {/* Message */}
                            <p className="text-sm leading-relaxed mb-6 text-text-secondary">
                                Are you sure you want to reject this request? This will delete the request permanently.
                            </p>

                            {/* Divider */}
                            <div className="w-full border-t border-border mb-6" />

                            {/* Buttons */}
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => setRejectModalId(null)}
                                    className="flex-1 py-2.5 px-5 rounded-xl text-sm font-semibold border border-border text-text-secondary hover:bg-surface-divider hover:text-text-primary transition-all duration-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        handleRejectConfirm(rejectModalId);
                                        setRejectModalId(null);
                                    }}
                                    className="flex-1 py-2.5 px-5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/20 transition-all duration-200"
                                >
                                    Reject
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )
            )}
        </div>
    );
};

export default ClientRequests;
