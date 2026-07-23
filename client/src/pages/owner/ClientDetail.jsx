import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { toast } from 'react-toastify';
import { ChevronLeft, Phone, Mail, User, CreditCard, Calendar, CheckCircle2, AlertCircle, Clock, X, FileText, Trash2, Download, MessageSquare } from 'lucide-react';
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
    const [sendingWhatsAppId, setSendingWhatsAppId] = useState(null);
    const [downloadingId, setDownloadingId] = useState(null);

    const handleSendWhatsAppInvoice = async (payment) => {
        setSendingWhatsAppId(payment._id);
        try {
            await api.post(`/payment/${payment._id}/send-whatsapp`);
            toast.success("Invoice queued to send via WhatsApp");
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to send invoice via WhatsApp");
        } finally {
            setSendingWhatsAppId(null);
        }
    };

    const downloadInvoice = async (payment) => {
        setDownloadingId(payment._id);
        try {
            const response = await api.get(`/payment/${payment._id}/pdf`, { responseType: 'blob' });
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Invoice_${payment.paymentId}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            toast.success("Invoice downloaded successfully");
        } catch (err) {
            toast.error("Failed to download invoice");
        } finally {
            setDownloadingId(null);
        }
    };

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
                                                <th className="p-5">Plan</th>
                                                <th className="p-5">Mode</th>
                                                <th className="p-5 text-right">Plan Amount</th>
                                                <th className="p-5 text-right">Paid Now</th>
                                                <th className="p-5 text-right">Total Paid</th>
                                                <th className="p-5 text-right">Remaining Balance</th>
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
                                                    <td className="p-5">
                                                        <span className="text-text-secondary text-xs font-medium">{payment.planName}</span>
                                                    </td>
                                                    <td className="p-5">
                                                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${(payment.paymentMethod || payment.mode || 'cash') === 'cash' ? 'text-emerald-400 bg-emerald-400/5' : 'text-blue-400 bg-blue-400/5'}`}>
                                                            {payment.paymentMethod || payment.mode || 'cash'}
                                                        </span>
                                                    </td>
                                                    <td className="p-5 text-right text-text-primary font-bold text-sm">₹{payment.invoiceAmount || payment.amount || 0}</td>
                                                    <td className="p-5 text-right text-blue-400 font-bold text-sm">₹{payment.paidNow || payment.paidAmount || 0}</td>
                                                    <td className="p-5 text-right text-emerald-400 font-bold text-sm">₹{payment.totalPaid || payment.paidAmount || 0}</td>
                                                    <td className="p-5 text-right text-rose-500 font-bold text-sm">₹{payment.remainingBalance !== undefined ? payment.remainingBalance : (payment.amount - (payment.paidAmount || 0))}</td>
                                                    <td className="p-5 text-center">
                                                        {getStatusBadge(payment)}
                                                        {payment.status === 'partial' && !isPaymentCleared(payment) && payment.dueDate && (
                                                            <div className="mt-1 text-[10px] text-text-muted font-medium">
                                                                Due: {new Date(payment.dueDate).toLocaleDateString('en-GB').replace(/\//g, '-')}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-5 text-center text-xs">
                                                         <div className="flex items-center justify-center gap-1">
                                                             <button
                                                                 type="button"
                                                                 onClick={() => { setSelectedPayment(payment); setShowReceiptModal(true); }}
                                                                 className="p-2 rounded-lg text-text-secondary hover:text-primary hover:bg-primary/10 transition-all"
                                                                 title="View Invoice"
                                                             >
                                                                 <FileText size={16} />
                                                             </button>
                                                             <button
                                                                 type="button"
                                                                 disabled={downloadingId === payment._id}
                                                                 onClick={() => downloadInvoice(payment)}
                                                                 className="p-2 rounded-lg text-text-secondary hover:text-emerald-400 hover:bg-emerald-500/10 transition-all disabled:opacity-50"
                                                                 title="Download Invoice"
                                                             >
                                                                 <Download size={16} />
                                                             </button>
                                                             <button
                                                                 type="button"
                                                                 disabled={sendingWhatsAppId === payment._id}
                                                                 onClick={() => handleSendWhatsAppInvoice(payment)}
                                                                 className="p-2 rounded-lg text-text-secondary hover:text-blue-400 hover:bg-blue-500/10 transition-all disabled:opacity-50"
                                                                 title="Send via WhatsApp"
                                                             >
                                                                 <MessageSquare size={16} />
                                                             </button>
                                                         </div>
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

            {showReceiptModal && selectedPayment && (
                <div className="fixed inset-0 z-[100] overflow-y-auto">
                    {/* Backdrop overlay */}
                    <div 
                        className="fixed inset-0 bg-black/80 backdrop-blur-md print:hidden"
                        onClick={() => setShowReceiptModal(false)}
                    />
                    
                    {/* Modal content wrapper */}
                    <div 
                        className="flex min-h-full items-center justify-center p-4"
                        onClick={(e) => { if (e.target === e.currentTarget) setShowReceiptModal(false); }}
                    >
                        <div className="bg-white text-gray-900 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 print-invoice-container my-8 relative z-10">
                            {/* Actions Header (Hidden in print) */}
                            <div className="no-print p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                                <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">Invoice Preview</span>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => window.print()}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-text-primary text-xs font-bold rounded-lg hover:brightness-95 transition-all shadow-sm"
                                    >
                                        Print
                                    </button>
                                    <button
                                        type="button"
                                        disabled={downloadingId === selectedPayment._id}
                                        onClick={() => downloadInvoice(selectedPayment)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-50"
                                    >
                                        Download
                                    </button>
                                    <button
                                        type="button"
                                        disabled={sendingWhatsAppId === selectedPayment._id}
                                        onClick={() => handleSendWhatsAppInvoice(selectedPayment)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50"
                                    >
                                        Send WhatsApp
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowReceiptModal(false)}
                                        className="p-1.5 text-text-secondary hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-all"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Invoice Printable Body */}
                            <div className="p-8 space-y-6">
                                {/* Header: Gym Info */}
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-gray-200">
                                    <div className="flex items-center gap-3">
                                        {getLogoUrl() ? (
                                            <img
                                                src={getLogoUrl()}
                                                alt={gymInfo?.gymName || "Gym Logo"}
                                                className="w-16 h-16 object-contain rounded-lg border border-gray-100"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center font-black text-primary text-xl">
                                                {(gymInfo?.gymName || "G").charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div>
                                            <h2 className="text-xl font-black uppercase tracking-tight text-gray-900">{gymInfo?.gymName || "Gym Workspace"}</h2>
                                            <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Gym ID: {gymInfo?.gymId || "N/A"}</p>
                                        </div>
                                    </div>

                                    <div className="text-left sm:text-right text-xs text-gray-600 space-y-1">
                                        <p className="font-bold text-gray-900">Address:</p>
                                        <p className="max-w-[220px] leading-relaxed whitespace-pre-line">{gymInfo?.billingInfo?.addressOnBill || gymInfo?.address || "Address details"}</p>
                                        {gymInfo?.billingInfo?.helpContact && (
                                            <p className="font-medium">Support: +91 {gymInfo.billingInfo.helpContact}</p>
                                        )}
                                        {(gymInfo?.billingInfo?.gst || gymInfo?.gst) && (
                                            <p className="font-bold text-primary">GSTIN: {gymInfo?.billingInfo?.gst || gymInfo?.gst}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Middle Section: Meta & Client details */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6 border-b border-gray-200 text-xs">
                                    <div>
                                        <h4 className="font-black text-text-secondary uppercase tracking-widest mb-1.5">Billed To (Client Details)</h4>
                                        <p className="font-bold text-gray-900 text-sm">{client.personalInfo.name}</p>
                                        <p className="text-text-muted font-medium mt-1">Client ID: {client.clientId || 'N/A'}</p>
                                    </div>
                                    <div className="text-left sm:text-right">
                                        <h4 className="font-black text-text-secondary uppercase tracking-widest mb-1.5">Invoice Info</h4>
                                        <p className="font-bold text-gray-900">Invoice No: {selectedPayment.paymentId}</p>
                                        <p className="text-text-muted font-medium mt-1">Date: {new Date(selectedPayment.createdAt || selectedPayment.date || selectedPayment.paymentDate).toLocaleDateString('en-GB').replace(/\//g, '-')}</p>
                                        <p className="mt-1.5">{getStatusBadge(selectedPayment)}</p>
                                    </div>
                                </div>

                                {/* Subscription Details Table */}
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Membership Details</h4>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead>
                                                <tr className="bg-gray-50 text-text-muted font-bold uppercase tracking-wider border-b border-gray-200">
                                                    <th className="p-3">Plan Name / Description</th>
                                                    <th className="p-3 text-center">Payment Method</th>
                                                    <th className="p-3 text-right">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr className="border-b border-gray-100 text-gray-800">
                                                    <td className="p-3 font-semibold">
                                                        {selectedPayment.planName} Subscription
                                                        {selectedPayment.startDate && (
                                                            <span className="block text-[10px] text-text-muted font-normal mt-0.5">
                                                                Period: {getInvoicePeriod(selectedPayment)}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-center font-bold uppercase tracking-wider text-slate-700">
                                                        {(selectedPayment.paymentMethod || selectedPayment.mode || 'cash') === 'cash' ? 'Cash' : 'Online'}
                                                    </td>
                                                    <td className="p-3 text-right font-black text-gray-900">₹{selectedPayment.invoiceAmount || selectedPayment.amount || 0}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Calculations & Balance Section */}
                                <div className="flex justify-end pt-4">
                                    <div className="w-full max-w-[260px] bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-2">
                                        <div className="flex justify-between text-xs font-semibold text-text-muted">
                                            <span>Subtotal</span>
                                            <span>₹{selectedPayment.invoiceAmount || selectedPayment.amount || 0}</span>
                                        </div>
                                        <div className="flex justify-between text-xs font-semibold text-text-muted">
                                            <span>Paid Now</span>
                                            <span className="text-blue-600 font-bold">₹{selectedPayment.paidNow || selectedPayment.paidAmount || 0}</span>
                                        </div>
                                        <div className="flex justify-between text-xs font-bold text-gray-900 pt-1 border-t border-gray-200">
                                            <span>Cumulative Paid</span>
                                            <span className="text-emerald-600">₹{selectedPayment.totalPaid || selectedPayment.paidAmount || 0}</span>
                                        </div>

                                        {/* Partial Payment Balance Display */}
                                        {selectedPayment.status !== 'paid' && (getBalance(selectedPayment) > 0) && (
                                            <div className="flex justify-between text-xs font-black text-rose-600 pt-1.5 border-t border-dashed border-gray-300">
                                                <span>Balance Amount</span>
                                                <span>₹{getBalance(selectedPayment)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Footer: Greetings & Regards */}
                                <div className="pt-8 border-t border-gray-200 text-center space-y-3">
                                    {gymInfo?.billingInfo?.greetingText && (
                                        <p className="text-xs text-text-muted font-medium italic">"{gymInfo.greetingText}"</p>
                                    )}
                                    <div className="text-[11px] text-text-secondary">
                                        <p className="font-bold text-gray-900">{gymInfo?.billingInfo?.regards || `Regards, Team ${gymInfo?.gymName || 'GymPro'}`}</p>
                                        <p className="mt-1 font-medium">Thank you for your business!</p>
                                    </div>
                                </div>
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
