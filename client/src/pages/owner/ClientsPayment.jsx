import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { toast } from 'react-toastify';
import { Receipt, Plus, X, Edit2, Eye, FileText, Calendar, CreditCard, User, CheckCircle2 } from 'lucide-react';
import Button from '../../components/Button';
import { getPlanStatus } from '../../utils/membership';
import PaymentModal from '../../components/PaymentModal';
import ClientDetail from './ClientDetail';

const Transactions = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [payments, setPayments] = useState([]);
    const [clients, setClients] = useState([]);
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    
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
            const [paymentsRes, clientsRes, plansRes] = await Promise.all([
                api.get('/payment'),
                api.get('/client'),
                api.get('/plan')
            ]);
            setPayments(paymentsRes.data.data.filter(p => {
                const paid = p.paidAmount !== undefined ? p.paidAmount : p.amount;
                return paid > 0;
            }));
            setClients(clientsRes.data.data);
            setPlans(plansRes.data.data);
        } catch(e) {
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        document.title = "Clients Payment | GymPro";
    }, []);

    useEffect(() => {
        if (location.state?.showPaymentModal && location.state?.client && clients.length > 0) {
            const existingUnpaid = [...payments]
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .find(p => p.clientId === location.state.client._id && p.status !== 'paid');

            if (existingUnpaid) {
                setSelectedPayment(existingUnpaid);
                setShowModal(true);
                navigate(location.pathname, { replace: true });
            } else {
                const client = clients.find(c => c._id === location.state.client._id);
                if (client) {
                    handleClientChange(client._id);
                    setShowModal(true);
                    navigate(location.pathname, { replace: true });
                }
            }
        }
    }, [location.state, clients, payments]);

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
            if (selectedPayment) {
                // Update existing payment
                const additionalAmount = Number(paymentData.paidAmount);
                if (additionalAmount <= 0) {
                    setShowModal(false);
                    return;
                }
                await api.put(`/payment/${selectedPayment._id}`, { additionalAmount });
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
        if (p.amount === 0) return 0; // Installment record, doesn't carry a balance itself
        const total = Number(p.amount) || 0;
        return Math.max(0, total - getPaidAmount(p));
    };

    const getStatusBadge = (status) => {
        if (!status || status === 'paid') return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-widest">PAID</span>;
        if (status === 'partial') return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-widest">PARTIAL</span>;
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 uppercase tracking-widest">OVERDUE</span>;
    };

    const getClientDisplayId = (mongoId) => {
        const client = clients.find(c => c._id === mongoId);
        return client?.clientId || 'N/A';
    };

    return (
        <div className="flex bg-dark h-screen overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 md:p-8 md:pt-10">
                <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-8">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Clients Payment</h1>
                        <p className="text-gray-400 mt-1 text-sm md:text-base">Manage and track all member transactions.</p>
                    </div>
                    <Button onClick={() => setShowModal(true)} className="flex items-center gap-2 w-full sm:w-auto justify-center">
                        <Plus size={18} /> Record Payment
                    </Button>
                </div>

                <div className="bg-gray-900/40 rounded-2xl border border-gray-800 overflow-hidden shadow-2xl backdrop-blur-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse whitespace-nowrap min-w-[900px]">
                            <thead>
                                <tr className="bg-gray-800/30 border-b border-gray-800 text-gray-400 text-[11px] font-black tracking-widest uppercase">
                                    <th className="p-5">Receipt Info</th>
                                    <th className="p-5">Client Info</th>
                                    <th className="p-5">Plan</th>
                                    <th className="p-5">Mode</th>
                                    <th className="p-5 text-right">Invoice Amount</th>
                                    <th className="p-5 text-right">Paid Now</th>
                                    <th className="p-5 text-right">Total Paid</th>
                                    <th className="p-5 text-right">Remaining Balance</th>
                                    <th className="p-5 text-center">Status</th>
                                    <th className="p-5 text-center">Bill</th>
                                    <th className="p-5 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/50">
                                {loading ? (
                                    [...Array(4)].map((_, i) => (
                                        <tr key={i} className="border-b border-gray-800/50">
                                            <td className="p-5"><div className="h-4 w-16 bg-gray-800 rounded animate-pulse mb-1"></div><div className="h-3 w-20 bg-gray-800 rounded animate-pulse"></div></td>
                                            <td className="p-5"><div className="h-4 w-24 bg-gray-800 rounded animate-pulse mb-1"></div><div className="h-3 w-16 bg-gray-800 rounded animate-pulse"></div></td>
                                            <td className="p-5"><div className="h-4 w-16 bg-gray-800 rounded animate-pulse"></div></td>
                                            <td className="p-5"><div className="h-4 w-12 bg-gray-800 rounded animate-pulse"></div></td>
                                            <td className="p-5"><div className="h-4 w-14 bg-gray-800 rounded animate-pulse ml-auto"></div></td>
                                            <td className="p-5"><div className="h-4 w-14 bg-gray-800 rounded animate-pulse ml-auto"></div></td>
                                            <td className="p-5"><div className="h-4 w-14 bg-gray-800 rounded animate-pulse ml-auto"></div></td>
                                            <td className="p-5"><div className="h-5 w-14 bg-gray-800 rounded-full animate-pulse mx-auto"></div></td>
                                            <td className="p-5"><div className="h-7 w-7 bg-gray-800 rounded-lg animate-pulse mx-auto"></div></td>
                                            <td className="p-5"><div className="flex gap-2 justify-center"><div className="h-7 w-7 bg-gray-800 rounded-lg animate-pulse"></div><div className="h-7 w-7 bg-gray-800 rounded-lg animate-pulse"></div></div></td>
                                        </tr>
                                    ))
                                ) : payments.length === 0 ? (
                                    <tr><td colSpan="10" className="text-center py-20 text-gray-500">No payment records found.</td></tr>
                                ) : (
                                    payments.map(payment => (
                                        <tr key={payment._id} className="hover:bg-gray-800/30 transition-all group">
                                            <td className="p-5">
                                                <p className="font-bold text-white text-sm">#{payment.paymentId}</p>
                                                <p className="text-[10px] text-gray-500 mt-0.5">{new Date(payment.createdAt || payment.date).toLocaleDateString('en-GB')}</p>
                                            </td>
                                            <td className="p-5">
                                                <p className="font-bold text-gray-200 text-sm">{payment.clientName}</p>
                                                <p className="text-[10px] font-black text-primary uppercase tracking-tighter">{getClientDisplayId(payment.clientId)}</p>
                                            </td>
                                            <td className="p-5">
                                                <span className="text-gray-300 text-xs font-medium">{payment.planName}</span>
                                            </td>
                                            <td className="p-5">
                                                <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${payment.paymentMethod === 'cash' ? 'text-emerald-400 bg-emerald-400/5' : 'text-blue-400 bg-blue-400/5'}`}>
                                                    {payment.paymentMethod || payment.mode || 'cash'}
                                                </span>
                                            </td>
                                            <td className="p-5 text-right text-gray-200 font-bold text-sm">₹{payment.invoiceAmount || payment.amount || 0}</td>
                                            <td className="p-5 text-right text-blue-400 font-bold text-sm">₹{payment.paidNow || payment.paidAmount || 0}</td>
                                            <td className="p-5 text-right text-emerald-400 font-bold text-sm">₹{payment.totalPaid || payment.paidAmount || 0}</td>
                                            <td className="p-5 text-right text-rose-500 font-bold text-sm">₹{payment.remainingBalance !== undefined ? payment.remainingBalance : (payment.amount - (payment.paidAmount || 0))}</td>
                                            <td className="p-5 text-center">
                                                {getStatusBadge(payment.status)}
                                                {payment.status === 'partial' && payment.dueDate && (
                                                    <div className="mt-1 text-[10px] text-gray-500 font-medium">
                                                        Due: {new Date(payment.dueDate).toLocaleDateString('en-GB')}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-5 text-center">
                                                <button 
                                                    onClick={() => { setSelectedPayment(payment); setShowReceiptModal(true); }}
                                                    className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/10 transition-all"
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
                                                        className="p-2 rounded-lg text-gray-400 hover:text-emerald-400 hover:bg-emerald-400/10 transition-all"
                                                        title="View Client"
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                    <button 
                                                        disabled={payment.status === 'paid'}
                                                        onClick={() => { 
                                                            setSelectedPayment(payment); 
                                                            setShowModal(true); 
                                                        }}
                                                        className={`p-2 rounded-lg transition-all ${payment.status === 'paid' ? 'opacity-20 cursor-not-allowed' : 'text-gray-400 hover:text-blue-400 hover:bg-blue-400/10'}`}
                                                        title="Update Payment"
                                                    >
                                                        <Edit2 size={18} />
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
                }} 
                onSave={handlePaymentSave} 
                clients={clients} 
                plans={plans}
                payments={payments}
                clientData={selectedPayment ? clients.find(c => c._id === selectedPayment.clientId) : null}
                planData={selectedPayment ? plans.find(p => p._id === selectedPayment.planId) : null}
                initialData={selectedPayment ? {
                    amount: getBalance(selectedPayment),
                    paidAmount: '',
                    dueDate: selectedPayment.dueDate ? new Date(selectedPayment.dueDate).toISOString().split('T')[0] : '',
                    startDate: selectedPayment.startDate ? new Date(selectedPayment.startDate).toISOString().split('T')[0] : '',
                    id: selectedPayment._id
                } : { 
                    startDate: new Date().toISOString().split('T')[0], 
                    dueDate: new Date().toISOString().split('T')[0] 
                }} 
            />

            {/* Receipt / Bill Modal */}
            {showReceiptModal && selectedPayment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                    <div className="bg-white text-gray-900 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-8 border-b-2 border-dashed border-gray-200 relative">
                            <button onClick={() => setShowReceiptModal(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-900"><X size={20} /></button>
                            <div className="text-center">
                                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle2 size={32} className="text-primary" />
                                </div>
                                <h2 className="text-2xl font-black uppercase tracking-tight">Payment Receipt</h2>
                                <p className="text-gray-500 font-medium mt-1">Transaction ID: #{selectedPayment.paymentId}</p>
                            </div>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-y-4">
                                <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Client Name</p><p className="font-bold">{selectedPayment.clientName}</p></div>
                                <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Plan Name</p><p className="font-bold">{selectedPayment.planName}</p></div>
                                <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</p><p className="font-bold">{new Date(selectedPayment.createdAt || selectedPayment.date).toLocaleDateString('en-GB')}</p></div>
                                <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Method</p><p className="font-bold uppercase">{selectedPayment.paymentMethod || 'CASH'}</p></div>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-4 space-y-2 border border-gray-100">
                                <div className="flex justify-between text-sm"><span className="text-gray-500">Invoice Amount</span><span className="font-bold">₹{selectedPayment.invoiceAmount || selectedPayment.amount || 0}</span></div>
                                <div className="flex justify-between text-sm"><span className="text-gray-500">Amount Paid Now</span><span className="font-bold text-blue-600">₹{selectedPayment.paidNow || selectedPayment.paidAmount || 0}</span></div>
                                <div className="flex justify-between text-sm pt-1"><span className="text-gray-500 text-xs">Cumulative Paid</span><span className="font-bold text-emerald-600 text-xs">₹{selectedPayment.totalPaid || selectedPayment.paidAmount || 0}</span></div>
                                <div className="flex justify-between pt-2 border-t border-gray-200"><span className="font-black uppercase text-xs tracking-wider">Remaining Balance</span><span className="font-black text-rose-600">₹{selectedPayment.remainingBalance !== undefined ? selectedPayment.remainingBalance : (selectedPayment.amount - (selectedPayment.paidAmount || 0))}</span></div>
                            </div>
                        </div>
                        <div className="p-8 bg-gray-50 text-center"><p className="text-xs text-gray-400 font-medium italic">Thank you for your business!</p></div>
                    </div>
                </div>
            )}

            {/* Client Detail Modal */}
            {showClientDetailModal && selectedClient && (
                <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-dark w-full max-w-4xl h-screen shadow-2xl animate-in slide-in-from-right duration-500 relative flex flex-col">
                        <button 
                            onClick={() => setShowClientDetailModal(false)} 
                            className="absolute top-6 right-6 p-2.5 bg-gray-800/80 hover:bg-gray-700 text-gray-400 hover:text-white rounded-full z-[60] transition-all border border-gray-700/50"
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
