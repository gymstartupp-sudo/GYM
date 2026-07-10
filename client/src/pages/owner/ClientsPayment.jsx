import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { toast } from 'react-toastify';
import { Receipt, Plus, X, Edit2, Eye, FileText, Calendar, CreditCard, User, CheckCircle2, Phone, Mail, Printer } from 'lucide-react';
import Button from '../../components/Button';
import { getPlanStatus, calculateEndDate, toLocalDateString } from '../../utils/membership';
import PaymentModal from '../../components/PaymentModal';
import ClientDetail from './ClientDetail';
import Pagination from '../../components/Pagination';

const Transactions = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [payments, setPayments] = useState([]);
    const [allPayments, setAllPayments] = useState([]);
    const [clients, setClients] = useState([]);
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [gymInfo, setGymInfo] = useState(null);
    const [preselectedClient, setPreselectedClient] = useState(null);

    const [currentPage, setCurrentPage] = useState(1);

    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [showClientDetailModal, setShowClientDetailModal] = useState(false);

    // Data for modals
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [selectedClient, setSelectedClient] = useState(null);

    const [formData, setFormData] = useState({
        clientId: '',
        planId: '',
        planName: '',
        amount: '',
        paidAmount: '',
        paymentMethod: 'cash',
        dueDate: new Date().toISOString().split('T')[0],
        startDate: new Date().toISOString().split('T')[0]
    });

    const fetchData = async () => {
        try {
            setLoading(true);
            const [paymentsRes, clientsRes, plansRes, gymRes] = await Promise.all([
                api.get('/payment'),
                api.get('/client'),
                api.get('/plan'),
                api.get('/gym/profile').catch(() => null)
            ]);
            setAllPayments(paymentsRes.data.data);
            setPayments(paymentsRes.data.data.filter(p => {
                const paid = p.paidAmount !== undefined ? p.paidAmount : p.amount;
                return paid > 0;
            }));
            setClients(clientsRes.data.data);
            setPlans(plansRes.data.data);
            if (gymRes && gymRes.data?.success) {
                setGymInfo(gymRes.data.data.gym);
            }
        } catch (e) {
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const getLogoUrl = () => {
        const logo = gymInfo?.gymLogo || gymInfo?.billingInfo?.logo;
        if (!logo) return null;
        if (logo.startsWith('http://') || logo.startsWith('https://')) {
            return logo;
        }
        const backendUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace('/api', '');
        return `${backendUrl}${logo}`;
    };

    useEffect(() => {
        fetchData();
        document.title = "Clients Payment | GymPro";
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [payments.length]);

    useEffect(() => {
        if (location.state?.showPaymentModal && location.state?.client && clients.length > 0) {
            const client = clients.find(c => String(c._id) === String(location.state.client._id));
            if (client) {
                setPreselectedClient(client);
            }

            const existingUnpaid = [...allPayments]
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .find(p => String(p.clientId) === String(location.state.client._id) && p.status !== 'paid');

            if (existingUnpaid) {
                setSelectedPayment(existingUnpaid);
                setShowModal(true);
                navigate(location.pathname, { replace: true });
            } else {
                if (client) {
                    handleClientChange(client._id);
                    setShowModal(true);
                    navigate(location.pathname, { replace: true });
                }
            }
        }
    }, [location.state, clients, allPayments]);

    const handleClientChange = (clientId) => {
        const client = clients.find(c => c._id === clientId);
        if (client && (client.membership?.planId || client.memberships?.[0]?.planId)) {
            const pId = client.membership?.planId || client.memberships?.[0]?.planId;
            const plan = plans.find(p => p._id === (typeof pId === 'object' ? pId._id : pId));

            setFormData(prev => ({
                ...prev,
                clientId: clientId,
                planId: plan?._id || '',
                planName: plan?.name || '',
                amount: plan?.price || '',
                paidAmount: plan?.price || ''
            }));
        } else {
            setFormData(prev => ({ ...prev, clientId, planId: '', planName: '', amount: '', paidAmount: '' }));
        }
    };

    const handlePaymentSave = async (paymentData) => {
        try {
            if (selectedPayment || paymentData._isUpdate) {
                // Update existing payment
                const additionalAmount = Number(paymentData.paidAmount);
                if (additionalAmount <= 0) {
                    setShowModal(false);
                    return;
                }
                const paymentIdToUpdate = selectedPayment?._id || paymentData._paymentId;
                await api.put(`/payment/${paymentIdToUpdate}`, {
                    additionalAmount,
                    paymentMethod: paymentData.paymentMethod
                });
                toast.success("Payment updated successfully");
            } else {
                // Record new payment
                await api.post('/payment', paymentData);
                toast.success("Payment recorded successfully");
            }
            setShowModal(false);
            setSelectedPayment(null);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to process payment");
            throw error;
        }
    };


    const getPaidAmount = (p) => {
        const val = p.paidAmount !== undefined ? p.paidAmount : p.amount;
        return Number(val) || 0;
    };
    const getBalance = (p) => {
        if (p.remainingBalance !== undefined) return p.remainingBalance;
        if (p.amount === 0) return 0;
        const total = Number(p.invoiceAmount || p.amount) || 0;
        const paid = Number(p.totalPaid || p.paidAmount) || 0;
        return Math.max(0, total - paid);
    };

    const paginatedPayments = useMemo(() => {
        const startIndex = (currentPage - 1) * 10;
        return payments.slice(startIndex, startIndex + 10);
    }, [payments, currentPage]);

    const isPaymentCleared = (payment) => {
        if (!payment || payment.status !== 'partial') return false;
        return payments.some(p =>
            p.clientId === payment.clientId &&
            p.planId === payment.planId &&
            new Date(p.startDate).getTime() === new Date(payment.startDate).getTime() &&
            p.status === 'paid'
        );
    };

    const getStatusBadge = (payment) => {
        const status = typeof payment === 'object' ? payment.status : payment;
        if (!status || status === 'paid') return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-widest">PAID</span>;

        if (status === 'partial' && typeof payment === 'object') {
            if (isPaymentCleared(payment)) {
                return (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-widest flex items-center justify-center gap-1 w-fit mx-auto">
                        <CheckCircle2 size={10} className="text-emerald-500 shrink-0" />
                        PARTIAL (CLEARED)
                    </span>
                );
            }
        }

        if (status === 'partial') return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-widest">PARTIALLY</span>;
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 uppercase tracking-widest">OVERDUE</span>;
    };

    const getClientDisplayId = (mongoId) => {
        const client = clients.find(c => c._id === mongoId);
        return client?.clientId || 'N/A';
    };

    const getClientAddress = (mongoId) => {
        const client = clients.find(c => c._id === mongoId);
        return client?.personalInfo?.address || 'N/A';
    };

    const getClientMemberSince = (mongoId) => {
        const client = clients.find(c => c._id === mongoId);
        if (!client?.createdAt) return 'Jan 2024';
        return new Date(client.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };

    const getBillingPeriod = (payment) => {
        if (!payment.startDate) return null;
        try {
            const plan = plans.find(p => p._id === payment.planId);
            const duration = plan?.durationMonths || 1;
            const startDateObj = new Date(payment.startDate);
            const endDateStr = calculateEndDate(payment.startDate, duration);
            const endDateObj = new Date(endDateStr);
            return `${startDateObj.toLocaleDateString('en-GB').replace(/\//g, '-')} - ${endDateObj.toLocaleDateString('en-GB').replace(/\//g, '-')}`;
        } catch (e) {
            return null;
        }
    };

    const getInvoicePeriod = (payment) => {
        if (!payment.startDate) return '—';
        const clientObj = clients.find(c => c._id === payment.clientId);
        const relatedM = clientObj?.memberships?.find(m => 
            (m.planId?._id || m.planId)?.toString() === (payment.planId?._id || payment.planId)?.toString() &&
            new Date(m.startDate).getTime() === new Date(payment.startDate).getTime()
        ) || (
            (clientObj?.membership?.planId?._id || clientObj?.membership?.planId)?.toString() === (payment.planId?._id || payment.planId)?.toString() &&
            new Date(clientObj?.membership?.startDate).getTime() === new Date(payment.startDate).getTime() ? clientObj.membership : null
        );
        const startStr = new Date(payment.startDate).toLocaleDateString('en-GB').replace(/\//g, '-');
        if (relatedM?.endDate) {
            return `${startStr} to ${new Date(relatedM.endDate).toLocaleDateString('en-GB').replace(/\//g, '-')}`;
        }
        const plan = plans.find(p => p._id === payment.planId);
        const duration = plan?.durationMonths || 1;
        try {
            const endDateStr = calculateEndDate(payment.startDate, duration);
            if (endDateStr) {
                return `${startStr} to ${new Date(endDateStr).toLocaleDateString('en-GB').replace(/\//g, '-')}`;
            }
        } catch (e) {
            console.error(e);
        }
        return `${startStr} to Expiry`;
    };

    return (
        <div className="p-4 md:p-8 md:pt-10 space-y-8">
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
            
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight">Clients Payment</h1>
                    <p className="text-text-secondary mt-1 text-sm md:text-base">Manage and track all member transactions.</p>
                </div>
                {!isReadOnly && (
                    <Button onClick={() => setShowModal(true)} className="flex items-center gap-2 w-full sm:w-auto justify-center">
                        <Plus size={18} /> Record Payment
                    </Button>
                )}
            </div>

                <div className="bg-surface-divider/80 rounded-2xl border border-border overflow-hidden shadow-2xl backdrop-blur-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse whitespace-nowrap min-w-[900px]">
                            <thead>
                                <tr className="bg-surface-divider/80 border-b border-border text-text-secondary text-[11px] font-black tracking-widest uppercase">
                                    <th className="p-5">Receipt Info</th>
                                    <th className="p-5">Client Info</th>
                                    <th className="p-5 text-center">Plan</th>
                                    <th className="p-5 text-center">Mode</th>
                                    <th className="p-5 text-center">Plan Amount</th>
                                    <th className="p-5 text-center">Paid Now</th>
                                    <th className="p-5 text-center">Total Paid</th>
                                    <th className="p-5 text-center">Remaining Balance</th>
                                    <th className="p-5 text-center">Status</th>
                                    <th className="p-5 text-center">Bill</th>
                                    <th className="p-5 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {loading ? (
                                    [...Array(4)].map((_, i) => (
                                        <tr key={i} className="border-b border-border/50">
                                            <td className="p-5"><div className="h-4 w-16 bg-surface-divider rounded animate-pulse mb-1"></div><div className="h-3 w-20 bg-surface-divider rounded animate-pulse"></div></td>
                                            <td className="p-5"><div className="h-4 w-24 bg-surface-divider rounded animate-pulse mb-1"></div><div className="h-3 w-16 bg-surface-divider rounded animate-pulse"></div></td>
                                            <td className="p-5 text-center"><div className="h-4 w-16 bg-surface-divider rounded animate-pulse mx-auto"></div></td>
                                            <td className="p-5 text-center"><div className="h-4 w-12 bg-surface-divider rounded animate-pulse mx-auto"></div></td>
                                            <td className="p-5 text-center"><div className="h-4 w-14 bg-surface-divider rounded animate-pulse mx-auto"></div></td>
                                            <td className="p-5 text-center"><div className="h-4 w-14 bg-surface-divider rounded animate-pulse mx-auto"></div></td>
                                            <td className="p-5 text-center"><div className="h-4 w-14 bg-surface-divider rounded animate-pulse mx-auto"></div></td>
                                            <td className="p-5 text-center"><div className="h-4 w-14 bg-surface-divider rounded animate-pulse mx-auto"></div></td>
                                            <td className="p-5 text-center"><div className="h-5 w-14 bg-surface-divider rounded-full animate-pulse mx-auto"></div></td>
                                            <td className="p-5 text-center"><div className="h-7 w-7 bg-surface-divider rounded-lg animate-pulse mx-auto"></div></td>
                                            <td className="p-5 text-center"><div className="flex gap-2 justify-center"><div className="h-7 w-7 bg-surface-divider rounded-lg animate-pulse"></div></div></td>
                                        </tr>
                                    ))
                                ) : payments.length === 0 ? (
                                    <tr><td colSpan="11" className="text-center py-20 text-text-muted">No payment records found.</td></tr>
                                ) : (
                                    paginatedPayments.map(payment => (
                                        <tr key={payment._id} className="hover:bg-surface-divider/80 transition-all group">
                                            <td className="p-5">
                                                <p className="font-bold text-text-primary text-sm">{payment.paymentId}</p>
                                                <p className="text-[10px] text-text-muted mt-0.5">{new Date(payment.createdAt || payment.date).toLocaleDateString('en-GB').replace(/\//g, '-')}</p>
                                            </td>
                                            <td className="p-5">
                                                <p className="font-bold text-text-primary text-sm">{payment.clientName}</p>
                                                <p className="text-[10px] font-black text-primary uppercase tracking-tighter">{getClientDisplayId(payment.clientId)}</p>
                                            </td>
                                            <td className="p-5 text-center">
                                                <span className="text-text-secondary text-xs font-medium block">{payment.planName}</span>
                                                {payment.startDate && (() => {
                                                    const period = getBillingPeriod(payment);
                                                    return period ? (
                                                        <span className="text-[10px] text-text-muted mt-0.5 block font-medium">
                                                            {period}
                                                        </span>
                                                    ) : null;
                                                })()}
                                            </td>
                                            <td className="p-5 text-center">
                                                <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${payment.paymentMethod === 'cash' ? 'text-emerald-400 bg-emerald-400/5' : 'text-blue-400 bg-blue-400/5'}`}>
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
                                            <td className="p-5 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            const client = clients.find(c => c._id === payment.clientId);
                                                            if (client) { setSelectedClient(client); setShowClientDetailModal(true); }
                                                        }}
                                                        className="p-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-text-primary rounded-lg transition-all"
                                                        title="View Client"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    <Pagination
                        currentPage={currentPage}
                        totalPages={Math.ceil(payments.length / 10)}
                        onPageChange={setCurrentPage}
                    />
                </div>

            {/* Modals */}
            <PaymentModal
                isOpen={showModal}
                onClose={() => {
                    setShowModal(false);
                    setSelectedPayment(null);
                    setPreselectedClient(null);
                }}
                onSave={handlePaymentSave}
                clients={clients}
                plans={plans}
                payments={allPayments}
                clientData={selectedPayment ? clients.find(c => c._id === selectedPayment.clientId) : preselectedClient}
                planData={selectedPayment ? plans.find(p => p._id === selectedPayment.planId) : null}
                initialData={selectedPayment ? {
                    amount: selectedPayment.invoiceAmount || selectedPayment.amount || 0,
                    totalPaidSoFar: selectedPayment.totalPaid || selectedPayment.paidAmount || 0,
                    paidAmount: '',
                    dueDate: selectedPayment.dueDate ? toLocalDateString(selectedPayment.dueDate) : '',
                    startDate: selectedPayment.startDate ? toLocalDateString(selectedPayment.startDate) : '',
                    paymentMethod: selectedPayment.paymentMethod || 'cash',
                    id: selectedPayment._id
                } : {
                    startDate: toLocalDateString(new Date()),
                    dueDate: toLocalDateString(new Date())
                }}
            />
                      {/* Receipt / Bill Modal */}
            {showReceiptModal && selectedPayment && (
                <div 
                    className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto"
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
                                        <h2 className="text-base font-black uppercase tracking-tight text-gray-900 leading-none">{gymInfo?.gymName || "LIK GYM"}</h2>
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
                                    <p className="text-[10px] text-text-muted mt-0.5">Date: {new Date(selectedPayment.createdAt || selectedPayment.date).toLocaleDateString('en-GB').replace(/\//g, '-')}</p>
                                </div>
                            </div>

                            {/* Billed To & Payment Details */}
                            <div className="grid grid-cols-2 gap-4 text-xs pb-2">
                                <div>
                                    <h4 className="font-bold text-amber-600 uppercase tracking-wider mb-1.5 text-[9px]">Billed To</h4>
                                    <p className="font-black text-gray-900 text-sm">{selectedPayment.clientName}</p>
                                    <p className="text-text-secondary mt-0.5">Client ID: {getClientDisplayId(selectedPayment.clientId)}</p>
                                    <p className="text-text-muted mt-0.5">Member since: {getClientMemberSince(selectedPayment.clientId)}</p>
                                </div>
                                <div className="text-right">
                                    <h4 className="font-bold text-amber-600 uppercase tracking-wider mb-1.5 text-[9px]">Payment Details</h4>
                                    <p className="text-text-secondary">Method: <strong className="text-gray-900 uppercase font-black">{selectedPayment.paymentMethod || 'CASH'}</strong></p>
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
                                    © 2024 {gymInfo?.gymName || "LIK GYM"} MANAGEMENT SYSTEM. ALL RIGHTS RESERVED.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Client Detail Modal */}
            {showClientDetailModal && selectedClient && (
                <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-surface-primary w-full max-w-4xl h-screen shadow-2xl animate-in slide-in-from-right duration-500 relative flex flex-col">
                        <button
                            onClick={() => setShowClientDetailModal(false)}
                            className="absolute top-6 right-6 p-2.5 bg-surface-divider/80 hover:bg-surface-hover text-text-secondary hover:text-text-primary rounded-full z-[60] transition-all border border-border/50"
                        >
                            <X size={20} />
                        </button>
                        <div className="flex-1 overflow-y-auto">
                            <ClientDetail clientId={selectedClient._id} onClose={() => { setShowClientDetailModal(false); fetchData(); }} />
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Transactions;
