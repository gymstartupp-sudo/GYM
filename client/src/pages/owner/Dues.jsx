import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { toast } from 'react-toastify';
import { CircleDollarSign, Search, Filter, History, AlertCircle, Clock, ArrowRight, Eye, RefreshCw, Smartphone, X, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ClientDetail from './ClientDetail';
import Button from '../../components/Button';
import PaymentModal from '../../components/PaymentModal';
import { calculateEndDate } from '../../utils/membership';

const Dues = () => {
    const navigate = useNavigate();
    const [clients, setClients] = useState([]);
    const [plans, setPlans] = useState([]);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'overdue', 'expired'
    const [expiredClients, setExpiredClients] = useState([]);

    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [selectedDue, setSelectedDue] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [viewClientId, setViewClientId] = useState(null);
    const [isRenewing, setIsRenewing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = async () => {
        try {
            setLoading(true);
            const [clientsRes, plansRes, paymentsRes, expiredRes] = await Promise.all([
                api.get('/client'),
                api.get('/plan'),
                api.get('/payment'),
                api.get('/overdue/expired')
            ]);
            setClients(clientsRes.data.data);
            setPlans(plansRes.data.data);
            setPayments(paymentsRes.data.data);
            setExpiredClients(expiredRes.data.data);
        } catch (e) {
            toast.error("Failed to load dues data");
        } finally {
            setLoading(false);
        }
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

    useEffect(() => {
        fetchData();
    }, []);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const getDuesList = () => {
        const dues = [];
        clients.forEach(client => {
            // Get all memberships (plural array and singular field for legacy/backward compatibility)
            const allMemberships = [...(client.memberships || [])];

            // Check if singular membership exists and isn't already in memberships array
            if (client.membership && client.membership.startDate) {
                const alreadyExists = allMemberships.some(m =>
                    new Date(m.startDate).getTime() === new Date(client.membership.startDate).getTime() &&
                    m.planId?.toString() === (client.membership.planId?._id || client.membership.planId)?.toString()
                );
                if (!alreadyExists) {
                    allMemberships.push(client.membership);
                }
            }

            allMemberships.forEach(m => {
                const finalPrice = Number(m.finalPrice || m.amount || 0);
                const totalPaid = Number(m.totalPaid || m.paidAmount || 0);
                const balance = finalPrice - totalPaid;

                if (balance > 0) {
                    const dueDate = m.dueDate ? new Date(m.dueDate) : null;
                    const endDate = m.endDate ? new Date(m.endDate) : null;

                    // Calculate flags
                    const isExpired = endDate && endDate < today;
                    const isOverdue = dueDate && dueDate < today;
                    const isPending = !isOverdue && !isExpired;

                    dues.push({
                        ...m,
                        clientId: client._id,
                        clientIdDisplay: client.clientId,
                        clientName: client.personalInfo?.name || client.name,
                        finalPrice,
                        totalPaid,
                        balance,
                        isExpired,
                        isOverdue,
                        isPending
                    });
                }
            });
        });
        return dues;
    };

    const getFilteredDues = () => {
        let list = [];
        if (activeTab === 'expired') {
            list = expiredClients.map(c => {
                const membership = c.memberships?.[0] || c.membership;
                const endDate = membership?.endDate ? new Date(membership.endDate) : null;
                const daysAgo = endDate ? Math.floor((today - endDate) / (1000 * 60 * 60 * 24)) : 0;

                return {
                    clientId: c._id,
                    clientIdDisplay: c.clientId,
                    clientName: c.personalInfo?.name,
                    mobile: c.personalInfo?.mobileNo,
                    planName: membership?.planName || 'No Active Plan',
                    startDate: membership?.startDate,
                    endDate: membership?.endDate,
                    daysAgo: daysAgo,
                    isExpiredTab: true,
                    rawClient: c
                };
            });
        } else {
            list = getDuesList().filter(due => {
                if (activeTab === 'pending') return due.isPending;
                if (activeTab === 'overdue') return due.isOverdue;
                return false;
            });
        }

        if (searchTerm) {
            const query = searchTerm.toLowerCase();
            return list.filter(due =>
                due.clientName?.toLowerCase().includes(query) ||
                due.clientIdDisplay?.toLowerCase().includes(query)
            );
        }
        return list;
    };

    const filteredDues = getFilteredDues();

    const handlePayNow = (due) => {
        // Find the corresponding payment record to update
        let payment = payments.find(p => {
            const pId = p.planId?.toString();
            const dId = (due.planId?._id || due.planId)?.toString();
            if (p.clientId?.toString() !== due.clientId?.toString() || pId !== dId) {
                return false;
            }
            if (p.startDate && due.startDate) {
                return new Date(p.startDate).setHours(0, 0, 0, 0) === new Date(due.startDate).setHours(0, 0, 0, 0);
            }
            return !p.startDate && !due.startDate;
        });

        // Fallback: If no date-exact match, find the latest unpaid payment record for this client and plan
        if (!payment) {
            payment = payments.find(p => {
                const pId = p.planId?.toString();
                const dId = (due.planId?._id || due.planId)?.toString();
                return p.clientId?.toString() === due.clientId?.toString() &&
                       pId === dId &&
                       p.status !== 'paid';
            });
        }

        setSelectedDue({
            ...due,
            paymentId: payment?._id,
            paymentMethod: payment?.paymentMethod || 'cash'
        });
        setIsUpdating(!!payment);
        setIsRenewing(false);
        setShowModal(true);
    };

    const handleRenew = (due) => {
        setSelectedDue(due);
        setIsRenewing(true);
        setIsUpdating(false);
        setShowModal(true);
    };

    const handlePaymentSave = async (paymentData) => {
        try {
            if (isUpdating && selectedDue.paymentId) {
                // It's an update to an existing partial payment
                // We pass the BALANCE as the total amount in PaymentModal, so paidAmount here is the additional amount
                const additionalAmount = Number(paymentData.paidAmount);

                if (additionalAmount <= 0) {
                    setShowModal(false);
                    return;
                }

                await api.put(`/payment/${selectedDue.paymentId}`, { 
                    additionalAmount,
                    paymentMethod: paymentData.paymentMethod
                });
                toast.success("Payment updated successfully");
            } else if (isRenewing) {
                // Renewal logic
                await api.post('/payment', paymentData);

                // Automatically reactivate if client is inactive or just ensure status update
                // The server usually updates status on payment if it's a new plan or renewal
                // But specifically for inactive clients, we might need a reactivate call if they were manually deactivated
                if (selectedDue.rawClient?.status === 'inactive') {
                    await api.put(`/client/${selectedDue.clientId}/reactivate`);
                }

                toast.success("Membership renewed successfully");
            } else {
                // If no payment record found (shouldn't happen with new logic but for safety)
                // Or if we want to record it as a new payment anyway
                await api.post('/payment', {
                    ...paymentData,
                    amount: selectedDue.finalPrice, // Ensure we use the due's total
                });
                toast.success("Payment recorded successfully");
            }

            setShowModal(false);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to process payment");
            throw error;
        }
    };

    const getBillingPeriod = (due) => {
        if (!due.startDate) return null;
        try {
            const startDateObj = new Date(due.startDate);
            let endDateObj = due.endDate ? new Date(due.endDate) : null;
            
            if (!endDateObj) {
                const plan = plans.find(p => p._id === due.planId);
                const duration = plan?.durationMonths || 1;
                const endDateStr = calculateEndDate(due.startDate, duration);
                if (endDateStr) {
                    endDateObj = new Date(endDateStr);
                }
            }
            
            if (endDateObj) {
                return `${startDateObj.toLocaleDateString('en-GB').replace(/\//g, '-')} - ${endDateObj.toLocaleDateString('en-GB').replace(/\//g, '-')}`;
            }
            return null;
        } catch (e) {
            return null;
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending': return <Clock size={16} className="text-blue-400" />;
            case 'overdue': return <AlertCircle size={16} className="text-amber-400" />;

            default: return null;
        }
    };

    return (
        <div className="flex bg-dark h-screen overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 md:p-8 md:pt-10">
                <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-8">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                            Due & Expired Clients
                        </h1>
                        <p className="text-gray-400 mt-1 text-sm md:text-base">Manage and collect pending payments or renew expired memberships.</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap gap-1 mb-6 bg-gray-800/50 p-1 rounded-xl w-full sm:w-fit">
                    {[
                        { id: 'pending', label: 'Pending', icon: Clock },
                        { id: 'overdue', label: 'Overdue', icon: AlertCircle },
                        { id: 'expired', label: 'Expired', icon: History },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-grow sm:flex-grow-0 flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                                ? 'bg-primary text-white shadow-lg'
                                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                                }`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Search Bar */}
                <div className="mb-6 relative group max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Search by client name or ID..."
                        className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-11 pr-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder-gray-600 font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="bg-card rounded-xl border border-gray-800 overflow-hidden shadow-lg">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse whitespace-nowrap min-w-[850px]">
                            <thead>
                                <tr className="bg-gray-800/50 border-b border-gray-700 text-gray-400 text-xs tracking-wider uppercase">
                                    <th className="p-4 font-bold">Client Info</th>
                                    {activeTab === 'expired' && <th className="p-4 font-bold">Mobile</th>}
                                    <th className="p-4 font-bold">{activeTab === 'expired' ? 'Last Plan' : 'Plan'}</th>
                                    {activeTab !== 'expired' && (
                                        <>
                                            <th className="p-4 font-bold text-right">Total Amount</th>
                                            <th className="p-4 font-bold text-right">Paid Amount</th>
                                            <th className="p-4 font-bold text-right">Balance</th>
                                        </>
                                    )}
                                    <th className="p-4 font-bold">{activeTab === 'expired' ? 'Ended On' : 'Due Date'}</th>
                                    {activeTab === 'expired' && <th className="p-4 font-bold text-center">Days Ago</th>}
                                    <th className="p-4 font-bold text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {loading ? (
                                    [...Array(4)].map((_, i) => (
                                        <tr key={i} className="border-b border-gray-800">
                                            <td className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-gray-800 rounded-xl animate-pulse"></div><div><div className="h-4 w-24 bg-gray-800 rounded animate-pulse mb-1"></div><div className="h-3 w-16 bg-gray-800 rounded animate-pulse"></div></div></div></td>
                                            <td className="p-4"><div className="h-4 w-20 bg-gray-800 rounded animate-pulse"></div></td>
                                            {activeTab !== 'expired' && <><td className="p-4"><div className="h-4 w-14 bg-gray-800 rounded animate-pulse ml-auto"></div></td><td className="p-4"><div className="h-4 w-14 bg-gray-800 rounded animate-pulse ml-auto"></div></td><td className="p-4"><div className="h-4 w-14 bg-gray-800 rounded animate-pulse ml-auto"></div></td></>}
                                            <td className="p-4"><div className="h-4 w-20 bg-gray-800 rounded animate-pulse"></div></td>
                                            <td className="p-4 text-right"><div className="h-7 w-16 bg-gray-800 rounded-lg animate-pulse ml-auto"></div></td>
                                        </tr>
                                    ))
                                ) : filteredDues.length === 0 ? (
                                    <tr><td colSpan="8" className="text-center p-10 text-gray-500">No {activeTab} dues found.</td></tr>
                                ) : (
                                    filteredDues.map((due, idx) => (
                                        <tr key={`${due.clientId}-${idx}`} className="border-b border-gray-800 hover:bg-white/[0.02] transition-colors group">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-lg border border-primary/20 shrink-0 shadow-inner group-hover:bg-primary group-hover:text-white transition-all duration-300">
                                                        {due.clientName?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-white font-bold truncate group-hover:text-primary transition-colors">{due.clientName}</span>
                                                        <span className="text-gray-500 text-[10px] font-mono tracking-tighter uppercase">{due.clientIdDisplay || 'N/A'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            {activeTab === 'expired' && (
                                                <td className="p-4 text-gray-300 text-sm font-medium">
                                                    {due.mobile}
                                                </td>
                                            )}
                                            <td className="p-4 text-gray-300 text-sm font-medium">
                                                <span className="block">{due.planName}</span>
                                                {due.startDate && (() => {
                                                    const period = getBillingPeriod(due);
                                                    return period ? (
                                                        <span className="text-[10px] text-gray-500 mt-0.5 block font-medium">
                                                            {period}
                                                        </span>
                                                    ) : null;
                                                })()}
                                            </td>
                                            {activeTab !== 'expired' && (
                                                <>
                                                    <td className="p-4 text-right text-gray-300 font-bold text-sm">
                                                        ₹{due.finalPrice}
                                                    </td>
                                                    <td className="p-4 text-right text-emerald-400 font-bold text-sm">
                                                        ₹{due.totalPaid}
                                                    </td>
                                                    <td className="p-4 text-right text-rose-500 font-black text-sm">
                                                        ₹{due.balance}
                                                    </td>
                                                </>
                                            )}
                                            <td className="p-4 text-gray-400 text-xs">
                                                {activeTab === 'expired' ? (
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="whitespace-nowrap">Start: {due.startDate ? new Date(due.startDate).toLocaleDateString('en-GB').replace(/\//g, '-') : 'N/A'}</span>
                                                        <span className="whitespace-nowrap">End: {due.endDate ? new Date(due.endDate).toLocaleDateString('en-GB').replace(/\//g, '-') : 'N/A'}</span>
                                                    </div>
                                                ) : (
                                                    due.dueDate ? new Date(due.dueDate).toLocaleDateString('en-GB').replace(/\//g, '-') : 'N/A'
                                                )}
                                            </td>
                                            {activeTab === 'expired' && (
                                                <td className="p-4 text-center">
                                                    <span className="text-white font-black text-sm">-{due.daysAgo}</span>
                                                </td>
                                            )}
                                            <td className="p-4 text-right">
                                                {due.isExpiredTab ? (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => setViewClientId(due.clientId)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 text-gray-400 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border border-gray-700"
                                                        >
                                                            <Eye size={14} /> View
                                                        </button>
                                                        <button
                                                            onClick={() => handleRenew(due)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border border-primary/20"
                                                        >
                                                            <RefreshCw size={14} /> Renew
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(due.clientId)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/20 text-red-400 hover:bg-red-900/40 hover:text-red-300 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border border-red-900/30"
                                                        >
                                                            <Trash2 size={14} /> Deactivate
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => setViewClientId(due.clientId)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 text-gray-400 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border border-gray-700"
                                                        >
                                                            <Eye size={14} /> View
                                                        </button>
                                                        <button
                                                            onClick={() => handlePayNow(due)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border border-primary/20"
                                                        >
                                                            Pay Now
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showModal && selectedDue && (
                <PaymentModal
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                    onSave={handlePaymentSave}
                    clientData={selectedDue.rawClient || clients.find(c => c._id === selectedDue.clientId)}
                    planData={plans.find(p => p._id === selectedDue.planId)}
                    initialData={{
                        amount: selectedDue.finalPrice,
                        totalPaidSoFar: isUpdating ? selectedDue.totalPaid : 0,
                        paidAmount: '',
                        dueDate: selectedDue.dueDate ? new Date(selectedDue.dueDate).toISOString().split('T')[0] : '',
                        startDate: isRenewing ? new Date().toISOString().split('T')[0] : (selectedDue.startDate ? new Date(selectedDue.startDate).toISOString().split('T')[0] : ''),
                        paymentMethod: isUpdating ? (selectedDue.paymentMethod || 'cash') : 'cash',
                        id: isUpdating ? selectedDue.paymentId : undefined
                    }}
                    lockClient={isRenewing}
                    plans={plans}
                    payments={payments}
                />
            )}

            {/* View Client Modal */}
            {viewClientId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="relative bg-gray-900 border border-gray-700/50 rounded-xl w-full max-w-4xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-gray-800 flex justify-between items-center shrink-0">
                            <h2 className="text-lg font-bold text-white">Client Details</h2>
                            <button onClick={() => setViewClientId(null)} className="text-gray-400 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="overflow-y-auto custom-scrollbar flex-1">
                            <ClientDetail clientId={viewClientId} onClose={() => setViewClientId(null)} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dues;
