import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Receipt, Search, ChevronDown, Check, Package, AlertTriangle, Calendar, ArrowRight } from 'lucide-react';
import Button from './Button';
import { formatDisplayDate, calculateEndDate } from '../utils/membership';

const PaymentModal = ({
    isOpen,
    onClose,
    onSave,
    clientData,
    planData,
    clients = [],
    plans = [],
    payments = [],
    initialData = {},
    lockClient = false
}) => {
    const [selectedClient, setSelectedClient] = useState(clientData);
    const [selectedPlan, setSelectedPlan] = useState(planData);
    const [searchQuery, setSearchQuery] = useState('');
    const [planSearchQuery, setPlanSearchQuery] = useState('');
    const [showClientDropdown, setShowClientDropdown] = useState(false);
    const [showPlanDropdown, setShowPlanDropdown] = useState(false);
    const [paymentType, setPaymentType] = useState('full'); // 'full' or 'partial'
    const dropdownRef = useRef(null);
    const planDropdownRef = useRef(null);
    // Track if we auto-detected a pending payment for the selected client
    const [detectedPendingPayment, setDetectedPendingPayment] = useState(null);
    const [latestExpiryDate, setLatestExpiryDate] = useState(null);

    const [formData, setFormData] = useState({
        amount: planData?.price || initialData.amount || 0,
        paidAmount: planData?.price || initialData.paidAmount || 0,
        paymentMethod: 'cash',
        dueDate: initialData.dueDate || '',
        startDate: initialData.startDate || new Date().toISOString().split('T')[0]
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset all state when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            // Reset detected pending payment when modal freshly opens
            if (!clientData && !initialData.id) {
                setDetectedPendingPayment(null);
                setSelectedClient(null);
                setSelectedPlan(null);
                setSearchQuery('');
                setPlanSearchQuery('');
                setPaymentType('full');
                setIsSubmitting(false);
                setFormData({
                    amount: 0,
                    paidAmount: 0,
                    paymentMethod: 'cash',
                    dueDate: '',
                    startDate: new Date().toISOString().split('T')[0]
                });
            }
            if (clientData) {
                setSelectedClient(clientData);
                setSearchQuery(clientData.personalInfo?.name || clientData.name || '');

                // Auto-detect: Check if this client has any active unpaid/partial payment using grouped-latest logic
                if (payments.length > 0 && !initialData.id) {
                    const clientIdStr = String(clientData._id);
                    const clientPayments = payments.filter(p => String(p.clientId) === clientIdStr);
                    const sortedPayments = [...clientPayments].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

                    const seenWindows = new Set();
                    let pendingPayment = null;

                    for (const p of sortedPayments) {
                        const startDateStr = p.startDate ? new Date(p.startDate).toISOString().split('T')[0] : '';
                        const windowKey = `${p.planId}_${startDateStr}`;

                        if (seenWindows.has(windowKey)) continue;
                        seenWindows.add(windowKey);

                        if (p.status !== 'paid') {
                            pendingPayment = p;
                            break;
                        }
                    }

                    if (pendingPayment) {
                        setDetectedPendingPayment(pendingPayment);
                        const plan = plans.find(p => p._id === pendingPayment.planId);
                        if (plan) {
                            setSelectedPlan(plan);
                            setPlanSearchQuery(plan.name);
                        }
                        setFormData(prev => ({
                            ...prev,
                            amount: pendingPayment.invoiceAmount || pendingPayment.amount || pendingPayment.paidAmount || 0,
                            paidAmount: '',
                            paymentMethod: pendingPayment.paymentMethod || 'cash',
                            dueDate: pendingPayment.dueDate ? new Date(pendingPayment.dueDate).toISOString().split('T')[0] : '',
                            startDate: pendingPayment.startDate ? new Date(pendingPayment.startDate).toISOString().split('T')[0] : prev.startDate
                        }));
                        setPaymentType('partial');
                        return; // Skip standard planData setup since we are in auto-detected update mode
                    }
                }
            }
            if (planData) {
                setSelectedPlan(planData);
                setPlanSearchQuery(planData.name || '');
                setFormData(prev => ({
                    ...prev,
                    amount: initialData.amount !== undefined ? initialData.amount : planData.price,
                    paidAmount: initialData.paidAmount !== undefined ? initialData.paidAmount : planData.price,
                    paymentMethod: initialData.paymentMethod || prev.paymentMethod || 'cash',
                    dueDate: initialData.dueDate || prev.dueDate,
                    startDate: initialData.startDate || prev.startDate
                }));
                if (initialData.paidAmount !== undefined && initialData.paidAmount < (initialData.amount || planData.price)) {
                    setPaymentType('partial');
                } else {
                    setPaymentType('full');
                }
            }
        }
    }, [clientData, planData, isOpen]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowClientDropdown(false);
            }
            if (planDropdownRef.current && !planDropdownRef.current.contains(event.target)) {
                setShowPlanDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!isOpen) return null;

    const filteredClients = clients.filter(c => {
        const name = (c.personalInfo?.name || c.name || '').toLowerCase();
        const id = (c.clientId || '').toLowerCase();
        const query = searchQuery.toLowerCase();
        return name.includes(query) || id.includes(query);
    });

    const filteredPlans = plans.filter(p => {
        const name = (p.name || '').toLowerCase();
        const query = planSearchQuery.toLowerCase();
        return name.includes(query);
    });

    const handleClientSelect = (client) => {
        if (lockClient) return;
        setSelectedClient(client);
        setSearchQuery(client.personalInfo?.name || client.name);
        setShowClientDropdown(false);

        // Check if this client has any active unpaid/partial payment using grouped-latest logic
        if (payments.length > 0 && !initialData.id) {
            const clientIdStr = String(client._id);
            const clientPayments = payments.filter(p => String(p.clientId) === clientIdStr);
            const sortedPayments = [...clientPayments].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            const seenWindows = new Set();
            let pendingPayment = null;

            for (const p of sortedPayments) {
                const startDateStr = p.startDate ? new Date(p.startDate).toISOString().split('T')[0] : '';
                const windowKey = `${p.planId}_${startDateStr}`;

                if (seenWindows.has(windowKey)) continue;
                seenWindows.add(windowKey);

                if (p.status !== 'paid') {
                    pendingPayment = p;
                    break;
                }
            }

            if (pendingPayment) {
                // Auto-switch to update mode
                setDetectedPendingPayment(pendingPayment);
                const plan = plans.find(p => p._id === pendingPayment.planId);
                if (plan) {
                    setSelectedPlan(plan);
                    setPlanSearchQuery(plan.name);
                }
                setFormData(prev => ({
                    ...prev,
                    amount: pendingPayment.invoiceAmount || pendingPayment.amount || pendingPayment.paidAmount || 0,
                    paidAmount: '',
                    paymentMethod: pendingPayment.paymentMethod || prev.paymentMethod || 'cash',
                    dueDate: pendingPayment.dueDate ? new Date(pendingPayment.dueDate).toISOString().split('T')[0] : '',
                    startDate: pendingPayment.startDate ? new Date(pendingPayment.startDate).toISOString().split('T')[0] : prev.startDate
                }));
                setPaymentType('partial');
                return;
            }
        }

        // No pending payment found - reset to new payment mode
        setDetectedPendingPayment(null);

        // Calculate latest expiry date for start date handling
        if (client.memberships && client.memberships.length > 0) {
            const sortedMemberships = [...client.memberships].sort((a, b) => new Date(b.endDate) - new Date(a.endDate));
            const latest = sortedMemberships[0].endDate;
            if (latest && new Date(latest) >= new Date().setHours(0,0,0,0)) {
                setLatestExpiryDate(latest);
                const nextDay = new Date(latest);
                nextDay.setDate(nextDay.getDate() + 1);
                setFormData(prev => ({
                    ...prev,
                    startDate: nextDay.toISOString().split('T')[0]
                }));
            } else {
                setLatestExpiryDate(null);
                setFormData(prev => ({
                    ...prev,
                    startDate: new Date().toISOString().split('T')[0]
                }));
            }
        } else if (client.membership?.endDate) {
            // Check legacy field
            const latest = client.membership.endDate;
             if (latest && new Date(latest) >= new Date().setHours(0,0,0,0)) {
                setLatestExpiryDate(latest);
                const nextDay = new Date(latest);
                nextDay.setDate(nextDay.getDate() + 1);
                setFormData(prev => ({
                    ...prev,
                    startDate: nextDay.toISOString().split('T')[0]
                }));
            } else {
                setLatestExpiryDate(null);
            }
        } else {
            setLatestExpiryDate(null);
            setFormData(prev => ({
                ...prev,
                startDate: new Date().toISOString().split('T')[0]
            }));
        }

        // Auto-select client's active plan if available
        if (client?.membership?.planId) {
            const planId = typeof client.membership.planId === 'object' ? client.membership.planId._id : client.membership.planId;
            const plan = plans.find(p => p._id === planId);
            if (plan) handlePlanSelect(plan);
        }
    };

    const handlePlanSelect = (plan) => {
        setSelectedPlan(plan);
        setPlanSearchQuery(plan.name);
        setShowPlanDropdown(false);
        setFormData(prev => ({
            ...prev,
            amount: plan.price,
            paidAmount: paymentType === 'full' ? plan.price : prev.paidAmount
        }));
    };

    const handlePaymentTypeChange = (type) => {
        setPaymentType(type);
        if (type === 'full') {
            // In update mode, "fully paid" means pay the REMAINING balance, not the full plan price
            const fullPayAmt = isUpdateMode ? outstandingBalance : formData.amount;
            setFormData(prev => ({
                ...prev,
                paidAmount: fullPayAmt,
                dueDate: ''
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                paidAmount: '', // Clear paid amount for partial
                dueDate: ''
            }));
        }
    };

    // Determine if we're in update mode (either from initialData or auto-detected)
    const isUpdateMode = !!(initialData.id || detectedPendingPayment);
    const activePaymentId = initialData.id || detectedPendingPayment?._id;

    const originalPlanPrice = isUpdateMode 
        ? (detectedPendingPayment 
            ? (detectedPendingPayment.invoiceAmount || detectedPendingPayment.amount) 
            : (initialData.amount || 0)
          )
        : (selectedPlan?.price || planData?.price || formData.amount || 0);

    const totalPaidSoFar = isUpdateMode
        ? (detectedPendingPayment
            ? (detectedPendingPayment.totalPaid || detectedPendingPayment.paidNow || detectedPendingPayment.paidAmount || 0)
            : (initialData.totalPaidSoFar || 0)
          )
        : 0;

    const outstandingBalance = originalPlanPrice - totalPaidSoFar;
    const balance = outstandingBalance - (Number(formData.paidAmount) || 0);

    // Auto-detect: does this payment clear the remaining balance?
    const isEffectivelyFullPayment = (Number(formData.paidAmount) || 0) >= outstandingBalance && outstandingBalance > 0;

    const billingPeriodText = (() => {
        const start = isUpdateMode 
            ? (detectedPendingPayment?.startDate || initialData.startDate) 
            : formData.startDate;
        const duration = selectedPlan?.durationMonths || planData?.durationMonths || 1;
        if (!start) return null;
        
        try {
            const startDateObj = new Date(start);
            const endDateStr = calculateEndDate(start, duration);
            const endDateObj = new Date(endDateStr);
            
            return `${startDateObj.toLocaleDateString('en-GB')} - ${endDateObj.toLocaleDateString('en-GB')}`;
        } catch (e) {
            return null;
        }
    })();

    const handleSubmit = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (isSubmitting) return;

        if (!selectedClient) return alert("Please select a client");
        if (!selectedPlan) return alert("Please select a plan");

        const paid = Number(formData.paidAmount) || 0;

        // Validations
        if (paid > outstandingBalance) {
            const errorMsg = `You cannot pay more than the outstanding balance of ₹${outstandingBalance}`;
            alert(errorMsg);
            return;
        }

        // Determine REAL status from the actual numbers, not from button selection
        const realStatus = (paid >= outstandingBalance) ? 'paid' : 'partial';

        // Due date is only required for TRUE partial payments (balance remains after this payment)
        if (realStatus === 'partial' && !formData.dueDate) {
            return alert("Due Date is required for partial payments");
        }

        setIsSubmitting(true);
        try {
            await onSave({
                ...formData,
                paidAmount: paid,
                clientId: selectedClient._id,
                planId: selectedPlan._id,
                planName: selectedPlan.name,
                status: realStatus,
                balance: realStatus === 'paid' ? 0 : balance,
                _isUpdate: isUpdateMode,
                _paymentId: activePaymentId
            });
            onClose();
        } catch (error) {
            console.error("Payment failed:", error);
            setIsSubmitting(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-gray-900 border border-gray-700/50 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/50 shrink-0">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Receipt className="text-primary" />
                        {lockClient ? 'Renew Membership' : isUpdateMode ? 'Update Payment' : 'Record Payment'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors" disabled={isSubmitting}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
                    {/* Pending Payment Banner */}
                    {detectedPendingPayment && (
                        <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
                            <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                            <div>
                                <p className="text-amber-400 text-sm font-bold">Pending Balance Detected</p>
                                <p className="text-gray-400 text-xs mt-1">
                                    This client has an outstanding balance of <span className="text-white font-bold">₹{detectedPendingPayment.remainingBalance !== undefined ? detectedPendingPayment.remainingBalance : ((detectedPendingPayment.invoiceAmount || detectedPendingPayment.amount || 0) - (detectedPendingPayment.totalPaid || detectedPendingPayment.paidAmount || 0))}</span> for <span className="text-white font-medium">{detectedPendingPayment.planName}</span>. Pay the remaining amount below.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Client Selection (Searchable) */}
                    <div className="space-y-4">
                        <div className="relative" ref={dropdownRef}>
                            <label className="block text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1.5 ml-1">
                                {lockClient ? 'Selected Client' : 'Search Client'}
                            </label>
                            {selectedClient ? (
                                <div className={`flex items-center gap-3 p-3 bg-gray-800/50 border rounded-xl transition-all ${lockClient ? 'border-primary/30 bg-primary/5' : 'border-gray-700'}`}>
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                                        {(selectedClient.personalInfo?.name || selectedClient.name || 'C').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-white font-bold text-sm">{selectedClient.personalInfo?.name || selectedClient.name}</p>
                                        <p className="text-[10px] text-primary font-black uppercase tracking-tighter">{selectedClient.clientId}</p>
                                    </div>
                                    {!lockClient && !clientData && (
                                        <button type="button" onClick={() => { setSelectedClient(null); setSearchQuery(''); }} className="p-1 text-gray-500 hover:text-white transition-colors">
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div className="relative group">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors" size={18} />
                                        <input
                                            type="text"
                                            className="w-full bg-dark border border-gray-700 rounded-xl pl-11 pr-4 py-3.5 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder-gray-600 font-medium"
                                            placeholder="Type Client Name or ID (e.g. NEX-C-01)"
                                            value={searchQuery}
                                            onChange={(e) => {
                                                setSearchQuery(e.target.value);
                                                setShowClientDropdown(true);
                                            }}
                                            onFocus={() => setShowClientDropdown(true)}
                                        />
                                        <ChevronDown className={`absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 transition-transform duration-300 ${showClientDropdown ? 'rotate-180' : ''}`} size={18} />
                                    </div>

                                    {showClientDropdown && (
                                        <div className="absolute z-[10000] left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto custom-scrollbar animate-in slide-in-from-top-2 duration-200">
                                            {filteredClients.length > 0 ? (
                                                filteredClients.map(c => (
                                                    <button
                                                        key={c._id}
                                                        type="button"
                                                        className="w-full flex items-center justify-between p-3.5 hover:bg-gray-700/50 transition-colors text-left border-b border-gray-700/50 last:border-0 group"
                                                        onClick={() => handleClientSelect(c)}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center text-gray-400 group-hover:bg-primary/20 group-hover:text-primary transition-colors font-bold text-xs">
                                                                {(c.personalInfo?.name || c.name || 'C').charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-gray-200 group-hover:text-white transition-colors">{c.personalInfo?.name || c.name}</p>
                                                                <p className="text-[10px] font-black text-gray-500 group-hover:text-primary transition-colors uppercase tracking-tighter">{c.clientId}</p>
                                                            </div>
                                                        </div>
                                                        {selectedClient?._id === c._id && <Check size={16} className="text-primary" />}
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="p-8 text-center text-gray-500 text-sm italic">No matching clients found</div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Plan Selection (Searchable) */}
                        <div className="relative" ref={planDropdownRef}>
                            <label className="block text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1.5 ml-1">Search Membership Plan</label>
                            {(planData || detectedPendingPayment) ? (
                                <div className={`flex flex-col gap-2.5 p-3.5 bg-gray-800/50 border rounded-xl ${detectedPendingPayment ? 'border-amber-500/30' : 'border-gray-700'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                            <Package size={18} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-white font-bold text-sm">{selectedPlan?.name || planData?.name}</p>
                                            <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">₹{selectedPlan?.price || planData?.price}</p>
                                        </div>
                                    </div>
                                    {billingPeriodText && (
                                        <div className="pt-2 border-t border-gray-800/50 flex items-center justify-between text-xs text-gray-400">
                                            <span>Billing Period:</span>
                                            <span className="text-white font-bold">{billingPeriodText}</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div className="relative group">
                                        <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors" size={18} />
                                        <input
                                            type="text"
                                            disabled={!selectedClient}
                                            className="w-full bg-dark border border-gray-700 rounded-xl pl-11 pr-4 py-3.5 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder-gray-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                            placeholder="Type Plan Name (e.g. Monthly, Yearly)"
                                            value={planSearchQuery}
                                            onChange={(e) => {
                                                setPlanSearchQuery(e.target.value);
                                                setShowPlanDropdown(true);
                                            }}
                                            onFocus={() => setShowPlanDropdown(true)}
                                        />
                                        <ChevronDown className={`absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 transition-transform duration-300 ${showPlanDropdown ? 'rotate-180' : ''}`} size={18} />
                                    </div>

                                    {selectedPlan && billingPeriodText && (
                                        <div className="mt-2.5 p-3 bg-gray-800/30 border border-gray-800/50 rounded-xl flex items-center justify-between text-xs text-gray-400 animate-in fade-in duration-300">
                                            <span>Billing Period:</span>
                                            <span className="text-white font-bold">{billingPeriodText}</span>
                                        </div>
                                    )}

                                    {showPlanDropdown && (
                                        <div className="absolute z-[10000] left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto custom-scrollbar animate-in slide-in-from-top-2 duration-200">
                                            {filteredPlans.length > 0 ? (
                                                filteredPlans.map(p => (
                                                    <button
                                                        key={p._id}
                                                        type="button"
                                                        className="w-full flex items-center justify-between p-3.5 hover:bg-gray-700/50 transition-colors text-left border-b border-gray-700/50 last:border-0 group"
                                                        onClick={() => handlePlanSelect(p)}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center text-gray-400 group-hover:bg-primary/20 group-hover:text-primary transition-colors font-bold text-xs">
                                                                <Package size={16} />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-gray-200 group-hover:text-white transition-colors">{p.name}</p>
                                                            </div>
                                                        </div>
                                                        {selectedPlan?._id === p._id && <Check size={16} className="text-primary" />}
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="p-8 text-center text-gray-500 text-sm italic">No matching plans found</div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Membership Scheduling (ONLY for NEW memberships) */}
                        {!isUpdateMode && selectedPlan && (
                            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-300">
                                <div className="flex items-center gap-2 mb-1">
                                    <Calendar className="text-primary" size={16} />
                                    <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Membership Scheduling</h3>
                                </div>

                                {latestExpiryDate && (
                                    <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                                        <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={14} />
                                        <p className="text-[10px] text-amber-200 font-medium leading-relaxed">
                                            Client has an active/upcoming plan expiring on <span className="text-white font-bold">{formatDisplayDate(latestExpiryDate)}</span>. 
                                            The new membership will start automatically after this.
                                        </p>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1.5 ml-1">Start Date</label>
                                        <input
                                            type="date"
                                            required
                                            min={latestExpiryDate ? (() => {
                                                const d = new Date(latestExpiryDate);
                                                d.setDate(d.getDate() + 1);
                                                return d.toISOString().split('T')[0];
                                            })() : new Date().toISOString().split('T')[0]}
                                            className="w-full bg-dark border border-gray-700 rounded-xl p-3 text-white font-bold focus:border-primary outline-none transition-all"
                                            value={formData.startDate}
                                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1.5 ml-1">Calculated Expiry</label>
                                        <div className="w-full bg-gray-800/30 border border-gray-800 rounded-xl p-3 text-emerald-400 font-bold flex items-center justify-between">
                                            <span>{formatDisplayDate(calculateEndDate(formData.startDate, selectedPlan.durationMonths))}</span>
                                            <ArrowRight size={14} className="opacity-30" />
                                        </div>
                                    </div>
                                </div>
                                
                                <p className="text-[9px] text-gray-500 italic ml-1">
                                    Status: {new Date(formData.startDate).setHours(0,0,0,0) === new Date().setHours(0,0,0,0) ? 
                                        <span className="text-emerald-500 font-bold uppercase tracking-widest">Active Today</span> : 
                                        <span className="text-blue-500 font-bold uppercase tracking-widest">Upcoming (Scheduled)</span>
                                    }
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1.5 ml-1">Total Amount</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                                <input
                                    type="number"
                                    readOnly
                                    className="w-full bg-gray-800/30 border border-gray-800 rounded-xl pl-8 pr-4 py-3 text-white font-bold outline-none cursor-not-allowed"
                                    value={originalPlanPrice}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1.5 ml-1">Payment Method</label>
                            <select
                                className="w-full bg-dark border border-gray-700 rounded-xl p-3 text-white font-bold focus:border-primary outline-none transition-all appearance-none"
                                value={formData.paymentMethod}
                                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                                disabled={isSubmitting}
                            >
                                <option value="cash">Cash</option>
                                <option value="upi">UPI</option>
                                <option value="card">Card</option>
                            </select>
                        </div>
                    </div>

                    {/* Payment Completion Type */}
                    <div className="bg-gray-800/20 p-4 rounded-xl border border-gray-800 space-y-4">
                        <div>
                            <label className="block text-[10px] text-gray-500 uppercase font-black tracking-widest mb-2 ml-1">Payment Completion Type</label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => handlePaymentTypeChange('full')}
                                    className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${paymentType === 'full' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-dark text-gray-500 border border-gray-700 hover:border-gray-600'}`}
                                >
                                    Fully Paid
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handlePaymentTypeChange('partial')}
                                    className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${paymentType === 'partial' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-dark text-gray-500 border border-gray-700 hover:border-gray-600'}`}
                                >
                                    Partially Paid
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1.5 ml-1">Paid Amount (₹)</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    max={outstandingBalance}
                                    className={`w-full bg-dark border rounded-xl p-3 text-white font-bold focus:border-primary outline-none transition-all ${paymentType === 'full' ? 'opacity-50 cursor-not-allowed border-gray-800' : 'border-gray-700'}`}
                                    value={formData.paidAmount}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '' || (Number(val) >= 0 && Number(val) <= outstandingBalance)) {
                                            setFormData({ ...formData, paidAmount: val });
                                        }
                                    }}
                                    disabled={isSubmitting || paymentType === 'full'}
                                    placeholder="Enter amount"
                                />
                                <p className="text-[10px] text-gray-500 mt-1.5 ml-1 font-bold uppercase tracking-tight">
                                    {isUpdateMode ? (
                                        <>
                                            Already Paid: <span className="text-emerald-500">₹{totalPaidSoFar}</span> | Bal: <span className="text-primary">₹{outstandingBalance}</span>
                                        </>
                                    ) : (
                                        <>
                                            Max Allowed: <span className="text-primary">₹{originalPlanPrice}</span> (Plan Price)
                                        </>
                                    )}
                                </p>
                                {paymentType === 'partial' && (
                                    isEffectivelyFullPayment ? (
                                        <p className="text-[10px] mt-1.5 font-bold uppercase tracking-widest text-emerald-500 flex justify-between px-1 animate-in fade-in duration-200">
                                            <span>✓ Full Balance Covered</span>
                                            <span>₹0.00 remaining</span>
                                        </p>
                                    ) : (
                                        <p className="text-[10px] mt-1.5 font-bold uppercase tracking-widest text-rose-500 flex justify-between px-1">
                                            <span>Balance Due:</span>
                                            <span>₹{balance.toFixed(2)}</span>
                                        </p>
                                    )
                                )}
                            </div>
                            <div>
                                {paymentType === 'partial' && !isEffectivelyFullPayment && (
                                    <>
                                        <label className="block text-[10px] text-amber-500 uppercase font-black tracking-widest mb-1.5 ml-1 animate-in fade-in slide-in-from-bottom-1">
                                            Due Date <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            required
                                            className="w-full bg-dark border border-amber-500/50 rounded-xl p-3 text-white font-bold outline-none focus:border-amber-500 transition-all animate-in fade-in slide-in-from-bottom-1"
                                            value={formData.dueDate}
                                            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                            disabled={isSubmitting}
                                        />
                                    </>
                                )}
                                {paymentType === 'partial' && isEffectivelyFullPayment && (
                                    <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl animate-in fade-in slide-in-from-bottom-1">
                                        <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">✓ No due date needed</p>
                                        <p className="text-[9px] text-gray-400 mt-1">Amount covers full remaining balance</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                        <Button
                            type="button"
                            variant="secondary"
                            className="w-full sm:flex-1 py-3.5 text-xs font-black uppercase tracking-widest"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className={`w-full sm:flex-1 py-3.5 text-xs font-black uppercase tracking-widest ${paymentType === 'full' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20' : 'bg-primary shadow-primary/20'}`}
                            isLoading={isSubmitting}
                            disabled={isSubmitting || !selectedClient || !selectedPlan}
                        >
                            {isSubmitting ? 'Processing...' : 'Confirm Payment'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default PaymentModal;



