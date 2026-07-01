import React, { useState, useEffect, useMemo } from 'react';
import api from '../../utils/api';
import { toast } from 'react-toastify';
import { CircleDollarSign, Search, Filter, History, AlertCircle, AlertTriangle, Clock, ArrowRight, Eye, RefreshCw, Smartphone, X, Trash2, MessageSquare } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ClientDetail from './ClientDetail';
import Button from '../../components/Button';
import PaymentModal from '../../components/PaymentModal';
import ReminderTimeline from '../../components/ReminderTimeline';
import ReminderDetailsModal from '../../components/ReminderDetailsModal';
import { calculateEndDate, toLocalDateString } from '../../utils/membership';
import Pagination from '../../components/Pagination';

const Dues = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [clients, setClients] = useState([]);
    const [plans, setPlans] = useState([]);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'pending');
    const [expiredClients, setExpiredClients] = useState([]);

    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [selectedDue, setSelectedDue] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [viewClientId, setViewClientId] = useState(null);
    const [isRenewing, setIsRenewing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [currentPage, setCurrentPage] = useState(1);

    // Reminder modal states
    const [reminderModalClient, setReminderModalClient] = useState(null);
    const [reminderModalTab, setReminderModalTab] = useState('both');
    const [sendingReminder, setSendingReminder] = useState(null);

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

    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, searchTerm]);

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab && ['pending', 'overdue', 'expiring', 'expired'].includes(tab)) {
            setActiveTab(tab);
        }
    }, [searchParams]);

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
                        isPending,
                        rawClient: client
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
        } else if (activeTab === 'expiring') {
            const threeDaysFromNow = new Date(today);
            threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

            clients.forEach(client => {
                const allMemberships = [...(client.memberships || [])];
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
                    const endDate = m.endDate ? new Date(m.endDate) : null;
                    if (!endDate) return;

                    const isExpired = endDate < today;
                    const isExpiringSoon = !isExpired && endDate >= today && endDate <= threeDaysFromNow;

                    if (isExpiringSoon) {
                        const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

                        list.push({
                            clientId: client._id,
                            clientIdDisplay: client.clientId,
                            clientName: client.personalInfo?.name || client.name,
                            mobile: client.personalInfo?.mobileNo,
                            planName: m.planName || m.planId?.name || 'N/A',
                            startDate: m.startDate,
                            endDate: m.endDate,
                            daysLeft: daysLeft,
                            isExpiringTab: true,
                            rawClient: client
                        });
                    }
                });
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

    const paginatedDues = useMemo(() => {
        const startIndex = (currentPage - 1) * 10;
        return filteredDues.slice(startIndex, startIndex + 10);
    }, [filteredDues, currentPage]);

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

    const handleSendReminder = async (due) => {
        const clientId = due.clientId;
        setSendingReminder(clientId);
        try {
            await api.post(`/client/${clientId}/send-reminder`);
            toast.success('Reminder sent successfully');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to send reminder');
        } finally {
            setSendingReminder(null);
        }
    };

    return (
        <div className="p-4 md:p-8 md:pt-10">
                <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-8">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight flex items-center gap-3">
                            Due & Expired Clients
                        </h1>
                        <p className="text-text-secondary mt-1 text-sm md:text-base">Manage and collect pending payments or renew expired memberships.</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap gap-1 mb-6 bg-surface-hover/50 p-1 rounded-xl w-full sm:w-fit">
                    {[
                        { id: 'pending', label: 'Pending', icon: Clock },
                        { id: 'overdue', label: 'Overdue', icon: AlertCircle },
                        { id: 'expiring', label: 'Expiring Soon', icon: AlertTriangle },
                        { id: 'expired', label: 'Expired', icon: History },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-grow sm:flex-grow-0 flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                                ? 'bg-[var(--color-warning)] text-black shadow-lg'
                                : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover/50'
                                }`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Search Bar */}
                <div className="mb-6 relative group max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Search by client name or ID..."
                        className="w-full bg-surface-secondary border border-border rounded-xl pl-11 pr-4 py-3 text-text-primary focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder-gray-600 font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="bg-card rounded-xl border border-border overflow-hidden shadow-lg">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
                            <thead>
                                <tr className="bg-surface-hover/50 border-b border-border text-text-secondary text-xs tracking-wider uppercase">
                                    <th className="p-4 font-bold">Client Info</th>
                                    {(activeTab === 'expired' || activeTab === 'expiring') && <th className="p-4 font-bold">Mobile</th>}
                                    <th className="p-4 font-bold">{(activeTab === 'expired' || activeTab === 'expiring') ? 'Last Plan' : 'Plan'}</th>
                                    {activeTab !== 'expired' && activeTab !== 'expiring' && (
                                        <>
                                            <th className="p-4 font-bold text-right">Total Amount</th>
                                            <th className="p-4 font-bold text-right">Paid Amount</th>
                                            <th className="p-4 font-bold text-right">Balance</th>
                                        </>
                                    )}
                                    <th className="p-4 font-bold">{(activeTab === 'expired' || activeTab === 'expiring') ? 'Ended On' : 'Due Date'}</th>
                                    {activeTab === 'expired' && <th className="p-4 font-bold text-center">Days Ago</th>}
                                    {activeTab === 'expiring' && <th className="p-4 font-bold text-center">Days Left</th>}
                                    <th className="p-4 font-bold text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {loading ? (
                                    [...Array(4)].map((_, i) => (
                                        <tr key={i} className="border-b border-border">
                                            <td className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-surface-divider rounded-xl animate-pulse"></div><div><div className="h-4 w-24 bg-surface-divider rounded animate-pulse mb-1"></div><div className="h-3 w-16 bg-surface-divider rounded animate-pulse"></div></div></div></td>
                                            <td className="p-4"><div className="h-4 w-20 bg-surface-divider rounded animate-pulse"></div></td>
                                            {activeTab !== 'expired' && activeTab !== 'expiring' && <><td className="p-4"><div className="h-4 w-14 bg-surface-divider rounded animate-pulse ml-auto"></div></td><td className="p-4"><div className="h-4 w-14 bg-surface-divider rounded animate-pulse ml-auto"></div></td><td className="p-4"><div className="h-4 w-14 bg-surface-divider rounded animate-pulse ml-auto"></div></td></>}
                                            <td className="p-4"><div className="h-4 w-20 bg-surface-divider rounded animate-pulse"></div></td>
                                            <td className="p-4 text-right"><div className="h-7 w-16 bg-surface-divider rounded-lg animate-pulse ml-auto"></div></td>
                                        </tr>
                                    ))
                                ) : filteredDues.length === 0 ? (
                                    <tr><td colSpan="8" className="text-center p-10 text-text-muted">No {activeTab} dues found.</td></tr>
                                ) : (
                                    paginatedDues.map((due, idx) => (
                                        <tr key={`${due.clientId}-${idx}`} className="border-b border-border hover:bg-white/[0.02] transition-colors group">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-lg border border-primary/20 shrink-0 shadow-inner group-hover:bg-primary group-hover:text-black transition-all duration-300">
                                                        {due.clientName?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-text-primary font-bold truncate group-hover:text-primary transition-colors">{due.clientName}</span>
                                                        <span className="text-text-muted text-[10px] font-mono tracking-tighter uppercase">{due.clientIdDisplay || 'N/A'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            {(activeTab === 'expired' || activeTab === 'expiring') && (
                                                <td className="p-4 text-text-secondary text-sm font-medium">
                                                    {due.mobile}
                                                </td>
                                            )}
                                            <td className="p-4 text-text-secondary text-sm font-medium">
                                                <span className="block">{due.planName}</span>
                                                {due.startDate && (() => {
                                                    const period = getBillingPeriod(due);
                                                    return period ? (
                                                        <span className="text-[10px] text-text-muted mt-0.5 block font-medium">
                                                            {period}
                                                        </span>
                                                    ) : null;
                                                })()}
                                            </td>
                                            {activeTab !== 'expired' && activeTab !== 'expiring' && (
                                                <>
                                                    <td className="p-4 text-right text-text-secondary font-bold text-sm">
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
                                            <td className="p-4 text-text-secondary text-xs">
                                                {(activeTab === 'expired' || activeTab === 'expiring') ? (
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
                                                    <span className="text-text-primary font-black text-sm">-{due.daysAgo}</span>
                                                </td>
                                            )}
                                            {activeTab === 'expiring' && (
                                                <td className="p-4 text-center">
                                                    <span className="text-text-primary font-black text-sm">{due.daysLeft}</span>
                                                </td>
                                            )}
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {activeTab === 'overdue' && (
                                                        <button
                                                            onClick={() => handleSendReminder(due)}
                                                            disabled={sendingReminder === due.clientId}
                                                            className="p-2 bg-surface-divider text-text-secondary hover:text-[var(--btn-primary-text)] hover:bg-primary rounded-lg transition-all duration-200 border border-border disabled:opacity-50"
                                                            title="Send WhatsApp reminder"
                                                        >
                                                            {sendingReminder === due.clientId ? (
                                                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                            ) : (
                                                                <MessageSquare size={16} />
                                                            )}
                                                        </button>
                                                    )}
                                                    {due.rawClient && (
                                                        <ReminderTimeline
                                                            client={due.rawClient}
                                                            mode={
                                                                activeTab === 'pending' ? 'pending' :
                                                                activeTab === 'overdue' ? 'overdue' : 'membership'
                                                            }
                                                            onCircleClick={(c, tab) => { setReminderModalClient(c); setReminderModalTab(tab); }}
                                                        />
                                                    )}
                                                    <button
                                                        onClick={() => setViewClientId(due.clientId)}
                                                        className="p-2 bg-surface-divider text-text-secondary hover:text-[var(--btn-primary-text)] hover:bg-primary rounded-lg transition-all duration-200 border border-border"
                                                        title="View client"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    {(due.isExpiredTab || due.isExpiringTab) ? (
                                                        <button
                                                            onClick={() => handleRenew(due)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-text-primary rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border border-primary/20"
                                                        >
                                                            <RefreshCw size={14} /> Renew
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handlePayNow(due)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-text-primary rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border border-primary/20"
                                                        >
                                                            Pay Now
                                                        </button>
                                                    )}
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
                        totalPages={Math.ceil(filteredDues.length / 10)}
                        onPageChange={setCurrentPage}
                    />
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
                        dueDate: selectedDue.dueDate ? toLocalDateString(selectedDue.dueDate) : '',
                        startDate: isRenewing ? toLocalDateString(new Date()) : (selectedDue.startDate ? toLocalDateString(selectedDue.startDate) : ''),
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

            {/* Reminder Details Modal */}
            <ReminderDetailsModal
                isOpen={!!reminderModalClient}
                onClose={() => { setReminderModalClient(null); setReminderModalTab('both'); }}
                client={reminderModalClient}
                activeTab={reminderModalTab}
            />
        </div>
    );
};

export default Dues;
