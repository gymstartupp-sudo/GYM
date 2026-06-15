import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { toast } from 'react-toastify';
import { Receipt, Plus, X, Edit2, Eye, FileText, Calendar, CreditCard, User, CheckCircle2 } from 'lucide-react';
import Button from '../../components/Button';
import { getPlanStatus, calculateEndDate } from '../../utils/membership';
import PaymentModal from '../../components/PaymentModal';
import ClientDetail from './ClientDetail';

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
        if (!gymInfo?.billingInfo?.logo) return null;
        const backendUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace('/api', '');
        return `${backendUrl}${gymInfo.billingInfo.logo}`;
    };

    useEffect(() => {
        fetchData();
        document.title = "Clients Payment | GymPro";
    }, []);

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

    return (
        <div className="flex bg-surface-primary h-screen overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 md:p-8 md:pt-10">
                <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-8">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight">Clients Payment</h1>
                        <p className="text-text-secondary mt-1 text-sm md:text-base">Manage and track all member transactions.</p>
                    </div>
                    <Button onClick={() => setShowModal(true)} className="flex items-center gap-2 w-full sm:w-auto justify-center">
                        <Plus size={18} /> Record Payment
                    </Button>
                </div>

                <div className="bg-surface-divider/80 rounded-2xl border border-border overflow-hidden shadow-2xl backdrop-blur-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse whitespace-nowrap min-w-[900px]">
                            <thead>
                                <tr className="bg-surface-divider/80 border-b border-border text-text-secondary text-[11px] font-black tracking-widest uppercase">
                                    <th className="p-5">Receipt Info</th>
                                    <th className="p-5">Client Info</th>
                                    <th className="p-5">Plan</th>
                                    <th className="p-5">Mode</th>
                                    <th className="p-5 text-right">Plan Amount</th>
                                    <th className="p-5 text-right">Paid Now</th>
                                    <th className="p-5 text-right">Total Paid</th>
                                    <th className="p-5 text-right">Remaining Balance</th>
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
                                            <td className="p-5"><div className="h-4 w-16 bg-surface-divider rounded animate-pulse"></div></td>
                                            <td className="p-5"><div className="h-4 w-12 bg-surface-divider rounded animate-pulse"></div></td>
                                            <td className="p-5"><div className="h-4 w-14 bg-surface-divider rounded animate-pulse ml-auto"></div></td>
                                            <td className="p-5"><div className="h-4 w-14 bg-surface-divider rounded animate-pulse ml-auto"></div></td>
                                            <td className="p-5"><div className="h-4 w-14 bg-surface-divider rounded animate-pulse ml-auto"></div></td>
                                            <td className="p-5"><div className="h-5 w-14 bg-surface-divider rounded-full animate-pulse mx-auto"></div></td>
                                            <td className="p-5"><div className="h-7 w-7 bg-surface-divider rounded-lg animate-pulse mx-auto"></div></td>
                                            <td className="p-5"><div className="flex gap-2 justify-center"><div className="h-7 w-7 bg-surface-divider rounded-lg animate-pulse"></div><div className="h-7 w-7 bg-surface-divider rounded-lg animate-pulse"></div></div></td>
                                        </tr>
                                    ))
                                ) : payments.length === 0 ? (
                                    <tr><td colSpan="10" className="text-center py-20 text-text-muted">No payment records found.</td></tr>
                                ) : (
                                    payments.map(payment => (
                                        <tr key={payment._id} className="hover:bg-surface-divider/80 transition-all group">
                                            <td className="p-5">
                                                <p className="font-bold text-text-primary text-sm">{payment.paymentId}</p>
                                                <p className="text-[10px] text-text-muted mt-0.5">{new Date(payment.createdAt || payment.date).toLocaleDateString('en-GB').replace(/\//g, '-')}</p>
                                            </td>
                                            <td className="p-5">
                                                <p className="font-bold text-text-primary text-sm">{payment.clientName}</p>
                                                <p className="text-[10px] font-black text-primary uppercase tracking-tighter">{getClientDisplayId(payment.clientId)}</p>
                                            </td>
                                            <td className="p-5">
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
                                            <td className="p-5">
                                                <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${payment.paymentMethod === 'cash' ? 'text-emerald-400 bg-emerald-400/5' : 'text-blue-400 bg-blue-400/5'}`}>
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
                                            <td className="p-5 text-center">
                                                <button
                                                    onClick={() => { setSelectedPayment(payment); setShowReceiptModal(true); }}
                                                    className="p-2 rounded-lg text-text-secondary hover:text-primary hover:bg-primary/10 transition-all"
                                                    title="View Bill"
                                                >
                                                    <FileText size={18} />
                                                </button>
                                            </td>
                                            <td className="p-5">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            const client = clients.find(c => c._id === payment.clientId);
                                                            if (client) { setSelectedClient(client); setShowClientDetailModal(true); }
                                                        }}
                                                        className="p-2 rounded-lg text-text-secondary hover:text-success hover:bg-emerald-400/10 transition-all"
                                                        title="View Client"
                                                    >
                                                        <Eye size={18} />
                                                    </button>

                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
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
                    dueDate: selectedPayment.dueDate ? new Date(selectedPayment.dueDate).toISOString().split('T')[0] : '',
                    startDate: selectedPayment.startDate ? new Date(selectedPayment.startDate).toISOString().split('T')[0] : '',
                    paymentMethod: selectedPayment.paymentMethod || 'cash',
                    id: selectedPayment._id
                } : {
                    startDate: new Date().toISOString().split('T')[0],
                    dueDate: new Date().toISOString().split('T')[0]
                }}
            />

            {/* Receipt / Bill Modal */}
            {showReceiptModal && selectedPayment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
                    <div className="bg-white text-gray-900 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 print-invoice-container my-8 relative">
                        {/* Actions Header (Hidden in print) */}
                        <div className="no-print p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                            <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">Invoice Preview</span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => window.print()}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-text-primary text-xs font-bold rounded-lg hover:brightness-95 transition-all shadow-sm"
                                >
                                    Print Invoice
                                </button>
                                <button
                                    onClick={() => setShowReceiptModal(false)}
                                    className="p-1.5 text-text-secondary hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-all"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Invoice Printable Body */}
                        <div className="p-5 space-y-4">
                            {/* Header: Gym Info */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-gray-200">
                                <div className="flex items-center gap-2.5">
                                    {getLogoUrl() ? (
                                        <img
                                            src={getLogoUrl()}
                                            alt={gymInfo?.gymName || "Gym Logo"}
                                            className="w-12 h-12 object-contain rounded-lg border border-gray-100"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center font-black text-primary text-lg">
                                            {(gymInfo?.gymName || "G").charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div>
                                        <h2 className="text-lg font-black uppercase tracking-tight text-gray-900">{gymInfo?.gymName || "Gym Workspace"}</h2>
                                        <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider">Gym ID: {gymInfo?.gymId || "N/A"}</p>
                                    </div>
                                </div>

                                <div className="text-left sm:text-right text-[11px] text-gray-600 space-y-0.5">
                                    <p className="font-bold text-gray-900">Address:</p>
                                    <p className="max-w-[200px] leading-snug whitespace-pre-line">{gymInfo?.billingInfo?.addressOnBill || gymInfo?.address || "Address details"}</p>
                                    {gymInfo?.billingInfo?.helpContact && (
                                        <p className="font-medium">Support: +91 {gymInfo.billingInfo.helpContact}</p>
                                    )}
                                    {(gymInfo?.billingInfo?.gst || gymInfo?.gst) && (
                                        <p className="font-bold text-primary">GSTIN: {gymInfo?.billingInfo?.gst || gymInfo?.gst}</p>
                                    )}
                                </div>
                            </div>

                            {/* Middle Section: Meta & Client details */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4 border-b border-gray-200 text-xs">
                                <div>
                                    <h4 className="font-black text-text-secondary uppercase tracking-widest mb-1 text-[9px]">Billed To (Client Details)</h4>
                                    <p className="font-bold text-gray-900 text-sm">{selectedPayment.clientName}</p>
                                    <p className="text-text-muted font-medium mt-0.5">Client ID: {getClientDisplayId(selectedPayment.clientId)}</p>
                                </div>
                                <div className="text-left sm:text-right">
                                    <h4 className="font-black text-text-secondary uppercase tracking-widest mb-1 text-[9px]">Invoice Info</h4>
                                    <p className="font-bold text-gray-900">Invoice No: {selectedPayment.paymentId}</p>
                                    <p className="text-text-muted font-medium mt-0.5">Date: {new Date(selectedPayment.createdAt || selectedPayment.date).toLocaleDateString('en-GB').replace(/\//g, '-')}</p>
                                    <p className="mt-1">{getStatusBadge(selectedPayment)}</p>
                                </div>
                            </div>

                            {/* Subscription Details Table */}
                            <div className="space-y-2">
                                <h4 className="text-[9px] font-black text-text-secondary uppercase tracking-widest">Membership Details</h4>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50 text-text-muted font-bold uppercase tracking-wider border-b border-gray-200">
                                                <th className="p-2.5">Plan Name / Description</th>
                                                <th className="p-2.5 text-center">Payment Method</th>
                                                <th className="p-2.5 text-right">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr className="border-b border-gray-100 text-gray-800">
                                                <td className="p-2.5 font-semibold">
                                                    {selectedPayment.planName} Subscription
                                                    {selectedPayment.startDate && (
                                                        <span className="block text-[10px] text-text-muted font-normal mt-0.5">
                                                            Period: {new Date(selectedPayment.startDate).toLocaleDateString('en-GB').replace(/\//g, '-')} to {selectedPayment.dueDate ? new Date(selectedPayment.dueDate).toLocaleDateString('en-GB').replace(/\//g, '-') : 'Expiry'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-2.5 text-center font-bold uppercase tracking-wider text-slate-700">
                                                    {selectedPayment.paymentMethod === 'cash' ? 'Cash' : 'Online'}
                                                </td>
                                                <td className="p-2.5 text-right font-black text-gray-900">
                                                    ₹{selectedPayment.paidNow || selectedPayment.paidAmount || 0}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Payment Summary: show when this single payment did NOT cover the full plan
                                 (i.e. any partial payment or the final clearing payment in a partial series).
                                 Hide only when a SINGLE payment covers the entire plan amount. */}
                            {(() => {
                                const paidNow = selectedPayment.paidNow || selectedPayment.paidAmount || 0;
                                const planAmt = selectedPayment.invoiceAmount || selectedPayment.amount || 0;
                                const showSummary = paidNow < planAmt;
                                if (!showSummary) return null;
                                return (
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1.5 text-xs">
                                        <h4 className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">Payment Summary</h4>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 font-medium">Plan Amount:</span>
                                            <span className="font-bold text-gray-900">₹{planAmt}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 font-medium">Paid Now:</span>
                                            <span className="font-bold text-blue-600">₹{paidNow}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 font-medium">Total Paid:</span>
                                            <span className="font-bold text-emerald-600">₹{selectedPayment.totalPaid || selectedPayment.paidAmount || 0}</span>
                                        </div>
                                        <div className="flex justify-between pt-1.5 border-t border-amber-300">
                                            <span className="text-gray-800 font-bold">Balance Due:</span>
                                            <span className="font-black text-rose-600">₹{selectedPayment.remainingBalance !== undefined ? selectedPayment.remainingBalance : getBalance(selectedPayment)}</span>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Footer: Greetings & Regards */}
                            <div className="pt-4 border-t border-gray-200 text-center space-y-2">
                                {gymInfo?.billingInfo?.greetingText && (
                                    <p className="text-[11px] text-text-muted font-medium italic">"{gymInfo.billingInfo.greetingText}"</p>
                                )}
                                <div className="text-[10px] text-text-secondary">
                                    <p className="font-bold text-gray-900">{gymInfo?.billingInfo?.regards || `Regards, Team ${gymInfo?.gymName || 'GymPro'}`}</p>
                                    <p className="mt-0.5 font-medium">Thank you for your business!</p>
                                </div>
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
                            <ClientDetail clientId={selectedClient._id} onClose={() => setShowClientDetailModal(false)} />
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Transactions;
