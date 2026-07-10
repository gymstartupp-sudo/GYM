import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { toast } from 'react-toastify';
import { ChevronLeft, Phone, Mail, User, CreditCard, Calendar, CheckCircle2, AlertCircle, Clock, X, FileText, Trash2, Printer } from 'lucide-react';
import Button from '../../components/Button';
import ConfirmModal from '../../components/ConfirmModal';
import { formatDisplayDate, calculateDaysLeft, getPlanStatus, getPaymentStatus, getClientPlans } from '../../utils/membership';
import ClientProfileHeader from '../../components/ClientProfileHeader';

const ClientDetail = ({ clientId: propClientId, onClose, simplified = false }) => {
    const { id: paramId } = useParams();
    const id = propClientId || paramId;
    const navigate = useNavigate();
    const [client, setClient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showDeactivateModal, setShowDeactivateModal] = useState(false);
    const [activeTab, setActiveTab] = useState('personal'); // 'personal' or 'payment'
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [gymInfo, setGymInfo] = useState(null);

    const getPaidAmount = (p) => {
        const paid = p.paidAmount !== undefined ? p.paidAmount : p.amount;
        return Number(paid) || 0;
    };
    const getBalance = (p) => {
        if (p.amount === 0) return 0; // Installment record, doesn't carry a balance itself
        const total = Number(p.amount) || 0;
        return Math.max(0, total - getPaidAmount(p));
    };

    const getInvoicePeriod = (payment) => {
        if (!payment.startDate) return '—';
        const relatedM = client.memberships?.find(m => 
            (m.planId?._id || m.planId)?.toString() === (payment.planId?._id || payment.planId)?.toString() &&
            new Date(m.startDate).getTime() === new Date(payment.startDate).getTime()
        ) || (
            (client.membership?.planId?._id || client.membership?.planId)?.toString() === (payment.planId?._id || payment.planId)?.toString() &&
            new Date(client.membership?.startDate).getTime() === new Date(payment.startDate).getTime() ? client.membership : null
        );
        const startStr = new Date(payment.startDate).toLocaleDateString('en-GB').replace(/\//g, '-');
        if (relatedM?.endDate) {
            return `${startStr} to ${new Date(relatedM.endDate).toLocaleDateString('en-GB').replace(/\//g, '-')}`;
        }
        return `${startStr} to Expiry`;
    };

    const isPaymentCleared = (payment) => {
        if (!payment || payment.status !== 'partial') return false;
        return client?.paymentHistory?.some(p =>
            p.planId === payment.planId &&
            new Date(p.startDate).getTime() === new Date(payment.startDate).getTime() &&
            p.status === 'paid'
        );
    };

    const getStatusBadge = (payment) => {
        const status = typeof payment === 'object' ? payment.status : payment;
        if (!status || status === 'paid') return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">PAID</span>;

        if (status === 'partial' && typeof payment === 'object') {
            if (isPaymentCleared(payment)) {
                return (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center gap-1 w-fit mx-auto">
                        <CheckCircle2 size={10} className="text-emerald-500 shrink-0" />
                        PARTIAL (CLEARED)
                    </span>
                );
            }
        }

        if (status === 'partial') return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">PARTIALLY</span>;
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 uppercase">OVERDUE</span>;
    };

    useEffect(() => {
        const fetchClient = async () => {
            try {
                const res = await api.get(`/client/${id}`);
                setClient(res.data.data);
            } catch (error) {
                toast.error("Failed to load client details");
                navigate('/owner/clients');
            } finally {
                setLoading(false);
            }
        };
        fetchClient();
    }, [id, navigate]);

    useEffect(() => {
        const fetchGymProfile = async () => {
            try {
                const res = await api.get('/gym/profile');
                if (res.data?.success) {
                    setGymInfo(res.data.data.gym);
                }
            } catch (e) {
                console.error("Failed to load gym profile in ClientDetail", e);
            }
        };
        fetchGymProfile();
    }, []);

    const getLogoUrl = () => {
        const logo = gymInfo?.gymLogo || gymInfo?.billingInfo?.logo;
        if (!logo) return null;
        if (logo.startsWith('http://') || logo.startsWith('https://')) {
            return logo;
        }
        const backendUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace('/api', '');
        return `${backendUrl}${logo}`;
    };

    const handleDeactivate = async () => {
        try {
            await api.put(`/client/${id}/deactivate`);
            toast.success('Client deactivated');
            setShowDeactivateModal(false);
            if (onClose) {
                onClose();
            } else {
                navigate('/owner/clients');
            }
        } catch {
            toast.error('Failed to deactivate');
        }
    };

    if (loading) {
        return (
            <div className={propClientId ? "flex justify-center items-center h-64" : "flex justify-center items-center h-[60vh]"}>
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!client) return null;

    return (
        <div className={propClientId ? "flex flex-col bg-surface-secondary overflow-hidden" : ""}>
            <style>{`
                @media (min-width: 768px) {
                    .text-center {
                        text-align: center !important;
                    }
                    .justify-center {
                        justify-content: center !important;
                    }
                    .mx-auto {
                        margin-left: auto !important;
                        margin-right: auto !important;
                    }
                }
            `}</style>
            <div className={propClientId ? "flex-1 overflow-y-auto p-4 md:p-6" : "p-4 md:p-8 pt-8"}>
                {/* Header Actions */}
                {!propClientId && (
                    <div className="flex justify-between items-center mb-6">
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors group"
                        >
                            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                            <span>Back to List</span>
                        </button>
                    </div>
                )}

                <ClientProfileHeader client={client} showStatus={!simplified} />

                {/* Tabs */}
                {!simplified && (
                    <div className="flex justify-between items-center flex-wrap gap-4 mb-6">
                        <div className="flex gap-1 p-1 bg-surface-hover/50 rounded-xl w-fit border border-border/50">
                            <button
                                onClick={() => setActiveTab('personal')}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'personal' ? 'bg-primary text-text-primary shadow-lg' : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'}`}
                            >
                                <User size={18} /> Personal Info
                            </button>
                            <button
                                onClick={() => setActiveTab('payment')}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'payment' ? 'bg-primary text-text-primary shadow-lg' : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'}`}
                            >
                                <CreditCard size={18} /> Payment History
                            </button>
                        </div>

                        {client.isActive && (
                            <Button
                                type="button"
                                variant="danger"
                                onClick={() => setShowDeactivateModal(true)}
                                className="!px-4 !py-2.5 text-xs flex items-center gap-1.5"
                            >
                                <Trash2 size={14} /> Deactivate Client
                            </Button>
                        )}
                    </div>
                )}

                {/* Tab Content */}
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {activeTab === 'personal' ? (
                        <div className={simplified ? "grid grid-cols-1 gap-6" : "grid grid-cols-1 lg:grid-cols-2 gap-6"}>
                            {/* Registration Details */}
                            <div className="card bg-surface-secondary border-border">
                                <h3 className="text-lg font-bold text-text-primary mb-6 flex items-center gap-2 border-b border-border pb-4">
                                    <User size={20} className="text-primary" /> Registration Details
                                </h3>
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-text-muted uppercase text-[10px] font-bold tracking-wider mb-1">Gender</p>
                                            <p className="text-text-primary font-medium capitalize">{client.personalInfo.gender}</p>
                                        </div>
                                        <div>
                                            <p className="text-text-muted uppercase text-[10px] font-bold tracking-wider mb-1">Date of Birth</p>
                                            <p className="text-text-primary font-medium">{formatDisplayDate(client.personalInfo.dob)}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-text-muted uppercase text-[10px] font-bold tracking-wider mb-1">Address</p>
                                        <p className="text-text-primary font-medium">{client.personalInfo.address}</p>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <p className="text-text-muted uppercase text-[10px] font-bold tracking-wider mb-1">City</p>
                                            <p className="text-text-primary font-medium">{client.personalInfo.city || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-text-muted uppercase text-[10px] font-bold tracking-wider mb-1">State</p>
                                            <p className="text-text-primary font-medium">{client.personalInfo.state || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-text-muted uppercase text-[10px] font-bold tracking-wider mb-1">Pincode</p>
                                            <p className="text-text-primary font-medium">{client.personalInfo.pincode || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-text-muted uppercase text-[10px] font-bold tracking-wider mb-1">Medical Condition</p>
                                        <p className="text-text-primary font-medium italic">{client.personalInfo.medicalCondition || 'None reported'}</p>
                                    </div>
                                    <div>
                                        <p className="text-text-muted uppercase text-[10px] font-bold tracking-wider mb-1">Emergency Contact</p>
                                        <p className="text-text-primary font-medium">{client.personalInfo.emergencyContact || 'Not provided'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Membership Details */}
                            <div className="card bg-surface-secondary border-border">
                                <h3 className="text-lg font-bold text-text-primary mb-6 flex items-center gap-2 border-b border-border pb-4">
                                    <Calendar size={20} className="text-accent" /> Membership Lifecycle
                                </h3>
                                <div className="space-y-8">
                                    {(() => {
                                        const memberships = client.memberships || (client.membership?.startDate ? [client.membership] : []);
                                        const { currentPlan, nextPlan, previousPlans, gaps } = getClientPlans(memberships);

                                        const getPaymentBadgeStyle = (status) => {
                                            switch (status) {
                                                case 'PAID': return 'bg-green-500 text-text-primary';
                                                case 'PENDING': return 'bg-yellow-500 text-black';
                                                case 'OVERDUE': return 'bg-red-500 text-text-primary';
                                                default: return 'bg-gray-500 text-text-primary';
                                            }
                                        };

                                        return (
                                            <>
                                                {/* CURRENT PLAN */}
                                                <div>
                                                    <p className="text-text-muted uppercase text-[10px] font-bold tracking-wider mb-3">Current Plan</p>
                                                    {currentPlan ? (
                                                        <div className="p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <div>
                                                                    <p className="text-xl font-bold text-emerald-400">{currentPlan.planName}</p>
                                                                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-bold uppercase">Active</span>
                                                                </div>
                                                                <div className="text-right">
                                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${getPaymentBadgeStyle(currentPlan.paymentStatus)}`}>
                                                                        {currentPlan.paymentStatus}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                                                                <div>
                                                                    <p className="text-text-muted text-[10px] uppercase font-bold tracking-widest">Starts</p>
                                                                    <p className="text-text-primary font-medium">{formatDisplayDate(currentPlan.startDate)}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-text-muted text-[10px] uppercase font-bold tracking-widest">Expires</p>
                                                                    <p className="text-text-primary font-medium">{formatDisplayDate(currentPlan.endDate)}</p>
                                                                </div>
                                                            </div>

                                                            {/* Payment Info */}
                                                            <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-4">
                                                                <div>
                                                                    <p className="text-text-muted text-[10px] uppercase font-bold tracking-widest">Paid / Balance</p>
                                                                    <p className="text-text-primary font-medium">₹{currentPlan.totalPaid || 0} / <span className="text-accent">₹{currentPlan.balance || 0}</span></p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-text-muted text-[10px] uppercase font-bold tracking-widest">Due Date</p>
                                                                    <p className="text-text-primary font-medium">{currentPlan.dueDate ? formatDisplayDate(currentPlan.dueDate) : 'No Due Date'}</p>
                                                                </div>
                                                            </div>

                                                            <div className="mt-4 pt-4 border-t border-emerald-500/10 flex justify-between items-center">
                                                                <span className="text-text-secondary text-xs">Days Remaining:</span>
                                                                <span className="text-emerald-400 font-bold">{calculateDaysLeft(currentPlan.startDate, currentPlan.endDate)} Days</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="p-6 bg-surface-divider/50 rounded-xl border border-border/50 flex flex-col items-center justify-center text-center">
                                                            <AlertCircle size={32} className="text-gray-600 mb-2 opacity-20" />
                                                            <p className="text-text-secondary font-bold">No Active Plan</p>
                                                            <p className="text-gray-600 text-[10px] uppercase tracking-widest mt-1">Renewal Required</p>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* GAP WARNINGS */}
                                                {gaps.map((gap, i) => (
                                                    <div key={i} className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
                                                        <AlertCircle size={18} className="text-red-400" />
                                                        <p className="text-xs text-red-400 font-medium">
                                                            No active plan between {formatDisplayDate(gap.from)} and {formatDisplayDate(gap.to)}
                                                        </p>
                                                    </div>
                                                ))}

                                                {/* NEXT PLAN */}
                                                {nextPlan && (
                                                    <div>
                                                        <p className="text-text-muted uppercase text-[10px] font-bold tracking-wider mb-3">Next Plan</p>
                                                        <div className="p-4 bg-blue-500/5 rounded-xl border border-blue-500/10">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <div>
                                                                    <p className="text-lg font-bold text-blue-400">{nextPlan.planName}</p>
                                                                    <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[9px] font-bold uppercase">Upcoming</span>
                                                                </div>
                                                                <div className="text-right">
                                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${getPaymentBadgeStyle(nextPlan.paymentStatus)}`}>
                                                                        {nextPlan.paymentStatus}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <p className="text-xs text-blue-400/60 font-medium mb-4">Starts automatically on {formatDisplayDate(nextPlan.startDate)}</p>

                                                            <div className="pt-4 border-t border-border grid grid-cols-2 gap-4">
                                                                <div>
                                                                    <p className="text-text-muted text-[10px] uppercase font-bold tracking-widest">Paid / Balance</p>
                                                                    <p className="text-text-primary font-medium">₹{nextPlan.totalPaid || 0} / <span className="text-accent">₹{nextPlan.balance || 0}</span></p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-text-muted text-[10px] uppercase font-bold tracking-widest">Due Date</p>
                                                                    <p className="text-text-primary font-medium">{nextPlan.dueDate ? formatDisplayDate(nextPlan.dueDate) : 'No Due Date'}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* PREVIOUS PLANS */}
                                                {previousPlans.length > 0 && (
                                                    <div>
                                                        <p className="text-text-muted uppercase text-[10px] font-bold tracking-wider mb-3">Previous Plans</p>
                                                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                                            {previousPlans.map((plan, i) => (
                                                                <div key={i} className="flex justify-between items-center p-3 bg-surface-divider/80 rounded-lg border border-border/50">
                                                                    <div>
                                                                        <div className="flex items-center gap-2">
                                                                            <p className="text-text-primary text-sm font-semibold">{plan.planName}</p>
                                                                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${getPaymentBadgeStyle(plan.paymentStatus)}`}>
                                                                                {plan.paymentStatus}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-[10px] text-text-muted">{formatDisplayDate(plan.startDate)} - {formatDisplayDate(plan.endDate)}</p>
                                                                    </div>
                                                                    <span className="text-[10px] text-gray-600 font-bold uppercase">Expired</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}

                                    </div>
                                </div>
                            </div>
                        ) : (
                        <div className="card bg-surface-divider/80 border-border p-0 overflow-hidden shadow-2xl backdrop-blur-sm">
                            <div className="p-6 border-b border-border flex justify-between items-center bg-surface-divider/80">
                                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                                    <CreditCard size={20} className="text-primary" /> Payment History
                                </h3>
                            </div>

                            {client.paymentHistory && client.paymentHistory.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse whitespace-nowrap min-w-[700px]">
                                        <thead>
                                            <tr className="bg-surface-divider/80 border-b border-border text-text-secondary text-[11px] font-black tracking-widest uppercase">
                                                <th className="p-5">Receipt Info</th>
                                                <th className="p-5 text-center">Plan</th>
                                                <th className="p-5 text-center">Mode</th>
                                                <th className="p-5 text-center">Plan Amount</th>
                                                <th className="p-5 text-center">Paid Now</th>
                                                <th className="p-5 text-center">Total Paid</th>
                                                <th className="p-5 text-center">Remaining Balance</th>
                                                <th className="p-5 text-center">Status</th>
                                                <th className="p-5 text-center">Bill</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/50">
                                            {client.paymentHistory.map((payment) => (
                                                <tr key={payment._id} className="hover:bg-surface-divider/80 transition-all group">
                                                    <td className="p-5">
                                                        <p className="font-bold text-text-primary text-sm">{payment.paymentId}</p>
                                                        <p className="text-[10px] text-text-muted mt-0.5">{new Date(payment.createdAt || payment.date || payment.paymentDate).toLocaleDateString('en-GB').replace(/\//g, '-')}</p>
                                                    </td>
                                                    <td className="p-5 text-center">
                                                        <span className="text-text-secondary text-xs font-medium">{payment.planName}</span>
                                                    </td>
                                                    <td className="p-5 text-center">
                                                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${(payment.paymentMethod || payment.mode || 'cash') === 'cash' ? 'text-emerald-400 bg-emerald-400/5' : 'text-blue-400 bg-blue-400/5'} mx-auto block w-fit`}>
                                                            {payment.paymentMethod || payment.mode || 'cash'}
                                                        </span>
                                                    </td>
                                                    <td className="p-5 text-center text-text-primary font-bold text-sm">₹{payment.invoiceAmount || payment.amount || 0}</td>
                                                    <td className="p-5 text-center text-blue-400 font-bold text-sm">₹{payment.paidNow || payment.paidAmount || 0}</td>
                                                    <td className="p-5 text-center text-emerald-400 font-bold text-sm">₹{payment.totalPaid || payment.paidAmount || 0}</td>
                                                    <td className="p-5 text-center text-rose-500 font-bold text-sm">₹{payment.remainingBalance !== undefined ? payment.remainingBalance : (payment.amount - (payment.paidAmount || 0))}</td>
                                                    <td className="p-5 text-center">
                                                        {getStatusBadge(payment)}
                                                        {payment.status === 'partial' && !isPaymentCleared(payment) && payment.dueDate && (
                                                            <div className="mt-1 text-[10px] text-text-muted font-medium">
                                                                Due: {new Date(payment.dueDate).toLocaleDateString('en-GB').replace(/\//g, '-')}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-5 text-center">
                                                        <button
                                                            onClick={() => { setSelectedPayment(payment); setShowReceiptModal(true); }}
                                                            className="p-2 rounded-lg text-text-secondary hover:text-primary hover:bg-primary/10 transition-all mx-auto block"
                                                            title="View Bill"
                                                        >
                                                            <FileText size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="py-16 text-center text-text-muted">
                                    <AlertCircle size={48} className="mx-auto mb-4 opacity-10" />
                                    <p className="font-medium">No payment history found.</p>
                                    <p className="text-xs mt-1">This client hasn't made any transactions yet.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Receipt Modal */}
            {showReceiptModal && selectedPayment && (
                <div 
                    className="fixed inset-0 z-[100] flex items-start justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto"
                    onClick={(e) => { if (e.target === e.currentTarget) setShowReceiptModal(false); }}
                >
                    <div className="bg-white text-gray-900 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 print-invoice-container my-6 relative">
                        {/* Actions Header (sticky, hidden in print) */}
                        <div className="print:hidden sticky top-0 z-10 p-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Invoice Preview</span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => window.print()}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-gray-900 text-xs font-bold rounded-lg hover:brightness-95 transition-all shadow-sm"
                                >
                                    <Printer size={13} />
                                    Print Invoice
                                </button>
                                <button
                                    onClick={() => setShowReceiptModal(false)}
                                    className="p-1.5 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-200 transition-all"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Invoice Printable Body */}
                        <div className="p-5 space-y-4">
                            {/* Header: Gym & Invoice Details */}
                            <div className="flex justify-between items-start gap-3 pb-4 border-b border-gray-200">
                                {/* Gym Details on Left */}
                                <div className="flex items-center gap-2.5">
                                    {getLogoUrl() ? (
                                        <img
                                            src={getLogoUrl()}
                                            alt={gymInfo?.gymName || "Gym Logo"}
                                            className="w-11 h-11 object-contain rounded-lg border border-gray-100"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center font-black text-primary text-lg">
                                            {(gymInfo?.gymName || "G").charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div>
                                        <h2 className="text-base font-black uppercase tracking-tight text-gray-900 leading-none">{gymInfo?.gymName || "Gym Workspace"}</h2>
                                        <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider mt-1">Gym ID: {gymInfo?.gymId || "N/A"}</p>
                                        <p className="text-[10px] text-gray-600 max-w-[220px] leading-relaxed whitespace-pre-line mt-0.5">
                                            {gymInfo?.billingInfo?.addressOnBill || gymInfo?.address || ""}
                                        </p>
                                    </div>
                                </div>

                                {/* Invoice Meta on Right */}
                                <div className="text-right">
                                    <div className="mb-1.5">
                                        {selectedPayment.status === 'paid' || (selectedPayment.remainingBalance !== undefined ? selectedPayment.remainingBalance : (selectedPayment.amount - (selectedPayment.paidAmount || 0))) === 0 ? (
                                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-widest">Paid</span>
                                        ) : (
                                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-widest">Partially Paid</span>
                                        )}
                                    </div>
                                    <h3 className="text-sm font-black text-gray-900">Invoice #{selectedPayment.paymentId}</h3>
                                    <p className="text-[10px] text-text-muted mt-0.5">Date: {new Date(selectedPayment.createdAt || selectedPayment.date || selectedPayment.paymentDate).toLocaleDateString('en-GB').replace(/\//g, '-')}</p>
                                </div>
                            </div>

                            {/* Billed To & Payment Details */}
                            <div className="grid grid-cols-2 gap-4 text-xs pb-2">
                                <div>
                                    <h4 className="font-bold text-amber-600 uppercase tracking-wider mb-1.5 text-[9px]">Billed To</h4>
                                    <p className="font-black text-gray-900 text-sm">{client.personalInfo?.name}</p>
                                    <p className="text-text-secondary mt-0.5">Client ID: {client.clientId || 'N/A'}</p>
                                    <p className="text-text-muted mt-0.5">Member since: {client.createdAt ? new Date(client.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Jan 2024'}</p>
                                </div>
                                <div className="text-right">
                                    <h4 className="font-bold text-amber-600 uppercase tracking-wider mb-1.5 text-[9px]">Payment Details</h4>
                                    <p className="text-text-secondary">Method: <strong className="text-gray-900 uppercase font-black">{selectedPayment.paymentMethod || selectedPayment.mode || 'CASH'}</strong></p>
                                    <p className="text-text-secondary mt-0.5">Status: <span className="font-bold text-gray-900">{selectedPayment.status === 'partial' ? 'Installment Plan' : 'Full Payment'}</span></p>
                                </div>
                            </div>

                            {/* Table of Subscription Details */}
                            <div className="space-y-2">
                                <h4 className="text-[9px] font-black text-amber-600 uppercase tracking-wider">Membership Details</h4>
                                <div className="overflow-hidden border border-gray-100 rounded-lg">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50 text-text-muted font-bold uppercase tracking-wider border-b border-gray-100">
                                                <th className="p-2.5">Membership Details</th>
                                                <th className="p-2.5 text-center">Period</th>
                                                <th className="p-2.5 text-right">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr className="text-gray-800">
                                                <td className="p-3 align-top">
                                                    <p className="font-black text-gray-900 text-sm">{selectedPayment.planName} Subscription</p>
                                                    <p className="text-[10px] text-text-muted mt-0.5 leading-relaxed max-w-xs">
                                                        Premium access to all gym facilities and equipment.
                                                    </p>
                                                </td>
                                                <td className="p-3 text-center align-top font-medium text-gray-700 whitespace-nowrap">
                                                    {getInvoicePeriod(selectedPayment)}
                                                </td>
                                                <td className="p-3 text-right align-top font-black text-gray-900 text-sm">
                                                    ₹{(selectedPayment.paidNow || selectedPayment.paidAmount || 0).toFixed(2)}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Quote and Payment Summary Row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                                {/* Quote card */}
                                <div className="bg-blue-50/40 border border-blue-100/50 rounded-lg p-3">
                                    <h4 className="text-[9px] font-black text-amber-600 uppercase tracking-wider">Membership Note</h4>
                                    <p className="text-[10px] text-gray-600 leading-relaxed font-semibold italic mt-1">
                                        "Discipline is the bridge between goals and accomplishment. Thank you for staying dedicated to your fitness journey."
                                    </p>
                                </div>

                                {/* Financial Calculations */}
                                <div className="space-y-1 text-xs">
                                    <div className="flex justify-between py-0.5">
                                        <span className="text-gray-500 font-medium">Plan Amount</span>
                                        <span className="font-bold text-gray-900">₹{(selectedPayment.invoiceAmount || selectedPayment.amount || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between py-0.5">
                                        <span className="text-gray-500 font-medium">Paid Now</span>
                                        <span className="font-bold text-blue-600">₹{(selectedPayment.paidNow || selectedPayment.paidAmount || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between py-0.5">
                                        <span className="text-gray-500 font-medium">Total Paid</span>
                                        <span className="font-bold text-emerald-600">₹{(selectedPayment.totalPaid || selectedPayment.paidAmount || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="border-t border-gray-200 my-1"></div>
                                    <div className="flex justify-between py-1 items-baseline">
                                        <span className="text-gray-900 font-black text-sm">Balance Due</span>
                                        <span className="font-black text-rose-600 text-sm">₹{(selectedPayment.remainingBalance !== undefined ? selectedPayment.remainingBalance : (selectedPayment.amount - (selectedPayment.paidAmount || 0))).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Footer: Greetings & Contact info */}
                            <div className="pt-3 border-t border-gray-200 text-center space-y-2">
                                <div>
                                    <p className="text-xs font-black text-gray-900">Thank you for your business!</p>
                                    <p className="text-[10px] text-text-muted font-medium mt-0.5">
                                        For any inquiries regarding this invoice or your membership, please reach out to our dedicated support team.
                                    </p>
                                </div>
                                <div className="flex justify-center items-center gap-5 text-[10px] text-gray-600 font-bold">
                                    <div className="flex items-center gap-1">
                                        <Phone size={11} className="text-amber-600" />
                                        <span>+91 {gymInfo?.billingInfo?.helpContact || "9865327412"}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Mail size={11} className="text-amber-600" />
                                        <span>{gymInfo?.gymEmail || "support@likgym.com"}</span>
                                    </div>
                                </div>
                                <p className="text-[8px] text-text-muted font-black tracking-widest uppercase">
                                    © 2024 {gymInfo?.gymName || "Gym Workspace"} MANAGEMENT SYSTEM. ALL RIGHTS RESERVED.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={showDeactivateModal}
                onCancel={() => setShowDeactivateModal(false)}
                onConfirm={handleDeactivate}
                title="Deactivate Client"
                message="Are you sure you want to deactivate this client?"
                confirmLabel="Deactivate"
                danger
            />
        </div>
    );
};

export default ClientDetail;
