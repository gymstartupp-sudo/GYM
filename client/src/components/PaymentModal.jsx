import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Receipt, Search, ChevronDown, Check, Package, AlertTriangle, Calendar, ArrowRight } from 'lucide-react';
import Button from './Button';
import CustomDatePicker from './CustomDatePicker';
import { formatDisplayDate, calculateEndDate } from '../utils/membership';
import api from '../utils/api';
import { DATE_RULES } from '../utils/dateInput';


const toLocalYYYYMMDD = (val) => {
    if (!val) return '';
    try {
        const d = new Date(val);
        if (isNaN(d.getTime())) return '';
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) {
        return '';
    }
};

const calculateDueDate = (start, durationMonths) => {
    if (!start) return '';
    try {
        const d = new Date(start);
        if (isNaN(d.getTime())) return '';
        d.setDate(d.getDate() + (durationMonths <= 6 ? 15 : 30));
        return toLocalYYYYMMDD(d);
    } catch (e) {
        return '';
    }
};

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
    const wasOpen = useRef(false);

    const [formData, setFormData] = useState(() => {
        let defaultStartDate = toLocalYYYYMMDD(new Date());
        if (initialData.startDate) {
            defaultStartDate = toLocalYYYYMMDD(initialData.startDate);
        } else if (!lockClient) {
            const clientStart = clientData?.membership?.startDate || clientData?.startDate;
            if (clientStart) {
                defaultStartDate = toLocalYYYYMMDD(clientStart);
            }
        }

        return {
            amount: planData?.price || initialData.amount || 0,
            paidAmount: planData?.price || initialData.paidAmount || 0,
            paymentMethod: 'cash',
            dueDate: initialData.dueDate || '',
            startDate: defaultStartDate
        };
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [allowPartialPayments, setAllowPartialPayments] = useState(true);
    const [dateErrors, setDateErrors] = useState({});
    const [formError, setFormError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setFormError('');
        }
    }, [isOpen]);

    useEffect(() => {
        setFormError('');
    }, [formData, paymentType, selectedPlan, selectedClient]);

    useEffect(() => {
        const fetchGymSettings = async () => {
            try {
                const res = await api.get('/gym/profile');
                if (res.data?.success && res.data.data?.gym?.billingInfo) {
                    const allow = res.data.data.gym.billingInfo.allowPartialPayments !== false;
                    setAllowPartialPayments(allow);
                }
            } catch (err) {
                console.error("Failed to fetch gym settings inside PaymentModal:", err);
            }
        };

        if (isOpen) {
            fetchGymSettings();
        }
    }, [isOpen]);

    // Reset all state when modal opens
    useEffect(() => {
        if (isOpen && !wasOpen.current) {
            setDetectedPendingPayment(null);
            setIsSubmitting(false);

            let customStartDate = null;
            if (clientData) {
                const rawDate = clientData.membership?.startDate || clientData.startDate;
                if (rawDate) {
                    customStartDate = toLocalYYYYMMDD(rawDate);
                }
            }

            if (!clientData && !initialData.id) {
                setSelectedClient(null);
                setSelectedPlan(null);
                setSearchQuery('');
                setPlanSearchQuery('');
                setPaymentType('full');
                setFormData({
                    amount: 0,
                    paidAmount: 0,
                    paymentMethod: 'cash',
                    dueDate: '',
                    startDate: toLocalYYYYMMDD(new Date())
                });
            }
            if (clientData) {
                setSelectedClient(clientData);
                setSearchQuery(clientData.personalInfo?.name || clientData.name || '');

                // Auto-detect: Check if this client has any active unpaid/partial payment using grouped-latest logic
                if (payments.length > 0 && !initialData.id && !lockClient && clientData?._id) {
                    const clientIdStr = String(clientData._id);
                    const clientPayments = payments.filter(p => String(p.clientId) === clientIdStr);
                    const sortedPayments = [...clientPayments].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

                    const seenWindows = new Set();
                    let pendingPayment = null;

                    for (const p of sortedPayments) {
                        const startDateStr = toLocalYYYYMMDD(p.startDate);
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
                            dueDate: toLocalYYYYMMDD(pendingPayment.dueDate),
                            startDate: toLocalYYYYMMDD(pendingPayment.startDate) || customStartDate || prev.startDate
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
                    startDate: initialData.startDate || (lockClient ? toLocalYYYYMMDD(new Date()) : customStartDate) || prev.startDate
                }));
                if (initialData.paidAmount !== undefined && initialData.paidAmount < (initialData.amount || planData.price)) {
                    setPaymentType('partial');
                } else {
                    setPaymentType('full');
                }
            } else if (clientData) {
                setFormData(prev => ({
                    ...prev,
                    startDate: initialData.startDate || (lockClient ? toLocalYYYYMMDD(new Date()) : customStartDate) || prev.startDate
                }));
            }
        }

        // Update wasOpen ref
        wasOpen.current = isOpen;
    }, [clientData, planData, isOpen, initialData, payments, plans]);

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

    const computedDueDateVal = React.useMemo(() => {
        const plan = selectedPlan || planData;
        const dueDays = plan ? (plan.partialPaymentDueDays ?? 15) : 15;
        if (!formData.startDate) return '';
        try {
            const d = new Date(formData.startDate);
            if (isNaN(d.getTime())) return '';
            d.setDate(d.getDate() + dueDays);
            return toLocalYYYYMMDD(d);
        } catch (e) {
            return '';
        }
    }, [formData.startDate, selectedPlan, planData]);

    useEffect(() => {
        if (isUpdateMode) {
            setPaymentType('full');
            setFormData(prev => ({
                ...prev,
                paidAmount: outstandingBalance,
                dueDate: ''
            }));
        }
    }, [isUpdateMode, outstandingBalance]);

    useEffect(() => {
        if (paymentType === 'partial' && !isUpdateMode) {
            setFormData(prev => ({
                ...prev,
                dueDate: computedDueDateVal
            }));
        }
    }, [paymentType, isUpdateMode, computedDueDateVal]);

    useEffect(() => {
        if (!allowPartialPayments) {
            setPaymentType('full');
            setFormData(prev => {
                const fullPayAmt = isUpdateMode ? outstandingBalance : (selectedPlan?.price || planData?.price || prev.amount || 0);
                return {
                    ...prev,
                    paidAmount: fullPayAmt,
                    dueDate: ''
                };
            });
        }
    }, [allowPartialPayments, isUpdateMode, outstandingBalance, selectedPlan, planData]);

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
                const startDateStr = toLocalYYYYMMDD(p.startDate);
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
                    dueDate: toLocalYYYYMMDD(pendingPayment.dueDate),
                    startDate: toLocalYYYYMMDD(pendingPayment.startDate) || prev.startDate
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
            if (latest && new Date(latest) >= new Date().setHours(0, 0, 0, 0)) {
                setLatestExpiryDate(latest);
                const nextDay = new Date(latest);
                nextDay.setDate(nextDay.getDate() + 1);
                setFormData(prev => ({
                    ...prev,
                    startDate: toLocalYYYYMMDD(nextDay)
                }));
            } else {
                setLatestExpiryDate(null);
                setFormData(prev => ({
                    ...prev,
                    startDate: toLocalYYYYMMDD(new Date())
                }));
            }
        } else if (client.membership?.endDate) {
            // Check legacy field
            const latest = client.membership.endDate;
            if (latest && new Date(latest) >= new Date().setHours(0, 0, 0, 0)) {
                setLatestExpiryDate(latest);
                const nextDay = new Date(latest);
                nextDay.setDate(nextDay.getDate() + 1);
                setFormData(prev => ({
                    ...prev,
                    startDate: toLocalYYYYMMDD(nextDay)
                }));
            } else {
                setLatestExpiryDate(null);
            }
        } else {
            setLatestExpiryDate(null);
            setFormData(prev => ({
                ...prev,
                startDate: toLocalYYYYMMDD(new Date())
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

    const getMembershipStartMinDate = () => {
        if (latestExpiryDate) {
            const d = new Date(latestExpiryDate);
            d.setDate(d.getDate() + 1);
            d.setHours(0, 0, 0, 0);
            return d;
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return today;
    };

    const handleDateFieldChange = (field, e) => {
        setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    };

    const handleDateValidationError = (field, message) => {
        setDateErrors((prev) => {
            const next = { ...prev };
            if (message) next[field] = message;
            else delete next[field];
            return next;
        });
    };

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

            return `${startDateObj.toLocaleDateString('en-GB').replace(/\//g, '-')} - ${endDateObj.toLocaleDateString('en-GB').replace(/\//g, '-')}`;
        } catch (e) {
            return null;
        }
    })();

    const handleSubmit = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (isSubmitting) return;

        if (!selectedClient) {
            setFormError("Please select a client");
            return;
        }
        if (!selectedPlan) {
            setFormError("Please select a plan");
            return;
        }

        const paid = Number(formData.paidAmount) || 0;

        // Validations
        if (!formData.startDate || isNaN(new Date(formData.startDate).getTime())) {
            setFormError("Please enter a valid Start Date");
            return;
        }

        if (!isUpdateMode && paymentType === 'partial') {
            if (paid <= 100) {
                setFormError("You must pay an amount greater than ₹100 for partial payment.");
                return;
            }
        }

        if (paid > outstandingBalance) {
            setFormError(`You cannot pay more than the outstanding balance of ₹${outstandingBalance}`);
            return;
        }

        // Determine REAL status from the actual numbers, not from button selection
        const realStatus = (paid >= outstandingBalance) ? 'paid' : 'partial';

        // Due date is only required for TRUE partial payments (balance remains after this payment)
        if (realStatus === 'partial') {
            if (!formData.dueDate || isNaN(new Date(formData.dueDate).getTime())) {
                setFormError("Due Date is required and must be a valid date for partial payments");
                return;
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const start = new Date(formData.startDate);
            start.setHours(0, 0, 0, 0);

            const due = new Date(formData.dueDate);
            due.setHours(0, 0, 0, 0);

            const duration = selectedPlan?.durationMonths || planData?.durationMonths || 1;
            const end = calculateEndDate(formData.startDate, duration);
            if (end) end.setHours(0, 0, 0, 0);

            if (due < start) {
                setFormError("Due Date cannot be earlier than the membership Start Date.");
                return;
            }
            if (end && due > end) {
                setFormError(`Due Date cannot exceed the membership Expiry Date (${end.toLocaleDateString('en-GB').replace(/\//g, '-')}).`);
                return;
            }
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
            <div className="bg-surface-secondary border border-border/50 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-border flex justify-between items-center bg-surface-divider/80 shrink-0">
                    <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                        <Receipt className="text-primary" />
                        {isUpdateMode ? 'Update Payment' : (lockClient ? ((selectedClient?.membership?.requestApproved === false || selectedClient?.membership?.status === 'pending') ? 'Record Payment' : 'Renew Membership') : 'Record Payment')}
                    </h2>
                    <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors" disabled={isSubmitting}>
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
                                <p className="text-text-secondary text-xs mt-1">
                                    This client has an outstanding balance of <span className="text-text-primary font-bold">₹{detectedPendingPayment.remainingBalance !== undefined ? detectedPendingPayment.remainingBalance : ((detectedPendingPayment.invoiceAmount || detectedPendingPayment.amount || 0) - (detectedPendingPayment.totalPaid || detectedPendingPayment.paidAmount || 0))}</span> for <span className="text-text-primary font-medium">{detectedPendingPayment.planName}</span>. Pay the remaining amount below.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Client Selection (Searchable) */}
                    <div className="space-y-4">
                        <div className="relative" ref={dropdownRef}>
                            <label className="block text-[10px] text-text-muted uppercase font-black tracking-widest mb-1.5 ml-1">
                                {lockClient ? 'Selected Client' : 'Search Client'}
                            </label>
                            {selectedClient ? (
                                <div className={`flex items-center gap-3 p-3 bg-surface-hover/50 border rounded-xl transition-all ${lockClient ? 'border-primary/30 bg-primary/5' : 'border-border'}`}>
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                                        {(selectedClient.personalInfo?.name || selectedClient.name || 'C').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-text-primary font-bold text-sm">{selectedClient.personalInfo?.name || selectedClient.name}</p>
                                        <p className="text-[10px] text-primary font-black uppercase tracking-tighter">{selectedClient.clientId}</p>
                                    </div>
                                    {!lockClient && !clientData && (
                                        <button type="button" onClick={() => { setSelectedClient(null); setSearchQuery(''); }} className="p-1 text-text-muted hover:text-text-primary transition-colors">
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div className="relative group">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors" size={18} />
                                        <input
                                            type="text"
                                            className="w-full bg-surface-primary border border-border rounded-xl pl-11 pr-4 py-3.5 text-text-primary focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder-gray-600 font-medium"
                                            placeholder="Type Client Name or ID (e.g. NEX-C-01)"
                                            value={searchQuery}
                                            onChange={(e) => {
                                                setSearchQuery(e.target.value);
                                                setShowClientDropdown(true);
                                            }}
                                            onFocus={() => setShowClientDropdown(true)}
                                        />
                                        <ChevronDown className={`absolute right-4 top-1/2 -translate-y-1/2 text-text-muted transition-transform duration-300 ${showClientDropdown ? 'rotate-180' : ''}`} size={18} />
                                    </div>

                                    {showClientDropdown && (
                                        <div className="absolute z-[10000] left-0 right-0 mt-2 bg-surface-divider border border-border rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto custom-scrollbar animate-in slide-in-from-top-2 duration-200">
                                            {filteredClients.length > 0 ? (
                                                filteredClients.map(c => (
                                                    <button
                                                        key={c._id}
                                                        type="button"
                                                        className="w-full flex items-center justify-between p-3.5 hover:bg-surface-hover/50 transition-colors text-left border-b border-border/50 last:border-0 group"
                                                        onClick={() => handleClientSelect(c)}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-surface-secondary flex items-center justify-center text-text-secondary group-hover:bg-primary/20 group-hover:text-primary transition-colors font-bold text-xs">
                                                                {(c.personalInfo?.name || c.name || 'C').charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-text-primary group-hover:text-text-primary transition-colors">{c.personalInfo?.name || c.name}</p>
                                                                <p className="text-[10px] font-black text-text-muted group-hover:text-primary transition-colors uppercase tracking-tighter">{c.clientId}</p>
                                                            </div>
                                                        </div>
                                                        {selectedClient?._id === c._id && <Check size={16} className="text-primary" />}
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="p-8 text-center text-text-muted text-sm italic">No matching clients found</div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Plan Selection (Searchable) */}
                        <div className="relative" ref={planDropdownRef}>
                            <label className="block text-[10px] text-text-muted uppercase font-black tracking-widest mb-1.5 ml-1">Search Membership Plan</label>
                            {(planData || detectedPendingPayment) ? (
                                <div className={`flex flex-col gap-2.5 p-3.5 bg-surface-hover/50 border rounded-xl ${detectedPendingPayment ? 'border-amber-500/30' : 'border-border'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                            <Package size={18} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-text-primary font-bold text-sm">{selectedPlan?.name || planData?.name}</p>
                                            <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">₹{selectedPlan?.price || planData?.price}</p>
                                        </div>
                                    </div>
                                    {billingPeriodText && (
                                        <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs text-text-secondary">
                                            <span>Billing Period:</span>
                                            <span className="text-text-primary font-bold">{billingPeriodText}</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div className="relative group">
                                        <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors" size={18} />
                                        <input
                                            type="text"
                                            disabled={!selectedClient}
                                            className="w-full bg-surface-primary border border-border rounded-xl pl-11 pr-4 py-3.5 text-text-primary focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder-gray-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                            placeholder="Type Plan Name (e.g. Monthly, Yearly)"
                                            value={planSearchQuery}
                                            onChange={(e) => {
                                                setPlanSearchQuery(e.target.value);
                                                setShowPlanDropdown(true);
                                            }}
                                            onFocus={() => setShowPlanDropdown(true)}
                                        />
                                        <ChevronDown className={`absolute right-4 top-1/2 -translate-y-1/2 text-text-muted transition-transform duration-300 ${showPlanDropdown ? 'rotate-180' : ''}`} size={18} />
                                    </div>

                                    {selectedPlan && billingPeriodText && (
                                        <div className="mt-2.5 p-3 bg-surface-divider/80 border border-border/50 rounded-xl flex items-center justify-between text-xs text-text-secondary animate-in fade-in duration-300">
                                            <span>Billing Period:</span>
                                            <span className="text-text-primary font-bold">{billingPeriodText}</span>
                                        </div>
                                    )}

                                    {showPlanDropdown && (
                                        <div className="absolute z-[10000] left-0 right-0 mt-2 bg-surface-divider border border-border rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto custom-scrollbar animate-in slide-in-from-top-2 duration-200">
                                            {filteredPlans.length > 0 ? (
                                                filteredPlans.map(p => (
                                                    <button
                                                        key={p._id}
                                                        type="button"
                                                        className="w-full flex items-center justify-between p-3.5 hover:bg-surface-hover/50 transition-colors text-left border-b border-border/50 last:border-0 group"
                                                        onClick={() => handlePlanSelect(p)}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-surface-secondary flex items-center justify-center text-text-secondary group-hover:bg-primary/20 group-hover:text-primary transition-colors font-bold text-xs">
                                                                <Package size={16} />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-text-primary group-hover:text-text-primary transition-colors">{p.name}</p>
                                                            </div>
                                                        </div>
                                                        {selectedPlan?._id === p._id && <Check size={16} className="text-primary" />}
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="p-8 text-center text-text-muted text-sm italic">No matching plans found</div>
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
                                            Client has an active/upcoming plan expiring on <span className="text-text-primary font-bold">{formatDisplayDate(latestExpiryDate)}</span>.
                                            The new membership will start automatically after this.
                                        </p>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] text-text-muted uppercase font-black tracking-widest mb-1.5 ml-1">Start Date</label>
                                        <CustomDatePicker
                                            required
                                            className={`w-full bg-surface-primary border rounded-xl p-3 text-text-primary font-bold focus:border-primary outline-none transition-all ${dateErrors.startDate ? 'border-red-500' : 'border-border'}`}
                                            value={formData.startDate}
                                            onChange={(e) => handleDateFieldChange('startDate', e)}
                                            onValidationError={(message) => handleDateValidationError('startDate', message)}
                                        />
                                        {dateErrors.startDate && <p className="text-red-500 text-xs mt-1">{dateErrors.startDate}</p>}
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] text-text-muted uppercase font-black tracking-widest mb-1.5 ml-1">Calculated Expiry</label>
                                        <div className="w-full bg-surface-divider/80 border border-border rounded-xl p-3 text-emerald-400 font-bold bg-surface-primary flex items-center justify-between">
                                            <span>{formatDisplayDate(calculateEndDate(formData.startDate, selectedPlan.durationMonths))}</span>
                                            <ArrowRight size={14} className="opacity-30" />
                                        </div>
                                    </div>
                                </div>

                                <p className="text-[9px] text-text-muted italic ml-1">
                                    Status: {(() => {
                                        const sd = new Date(formData.startDate).setHours(0, 0, 0, 0);
                                        const today = new Date().setHours(0, 0, 0, 0);
                                        if (sd === today) return <span className="text-emerald-500 font-bold uppercase tracking-widest">Active Today</span>;
                                        if (sd < today) return <span className="text-amber-500 font-bold uppercase tracking-widest">Back-dated</span>;
                                        return <span className="text-blue-500 font-bold uppercase tracking-widest">Upcoming (Scheduled)</span>;
                                    })()}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] text-text-muted uppercase font-black tracking-widest mb-1.5 ml-1">Total Amount</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-bold">₹</span>
                                <input
                                    type="number"
                                    readOnly
                                    className="w-full bg-surface-divider/80 border border-border rounded-xl pl-8 pr-4 py-3 bg-surface-primary text-text-primary font-bold outline-none cursor-not-allowed"
                                    value={originalPlanPrice}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] text-text-muted uppercase font-black tracking-widest mb-1.5 ml-1">Payment Method</label>
                            <select
                                className="w-full bg-surface-primary border border-border rounded-xl p-3 text-text-primary font-bold focus:border-primary outline-none transition-all appearance-none"
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
                    <div className="bg-surface-divider/50 p-4 rounded-xl border border-border space-y-4">
                        {allowPartialPayments && !isUpdateMode && (
                            <div>
                                <label className="block text-[10px] text-text-muted uppercase font-black tracking-widest mb-2 ml-1">Payment Completion Type</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handlePaymentTypeChange('full')}
                                        className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${paymentType === 'full' ? 'bg-emerald-500 text-text-primary shadow-lg shadow-emerald-500/20' : 'bg-surface-primary text-text-muted border border-border hover:border-gray-600'}`}
                                    >
                                        Fully Paid
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handlePaymentTypeChange('partial')}
                                        className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${paymentType === 'partial' ? 'bg-amber-500 text-text-primary shadow-lg shadow-amber-500/20' : 'bg-surface-primary text-text-muted border border-border hover:border-gray-600'}`}
                                    >
                                        Partially Paid
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className={`${allowPartialPayments ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : 'block'}`}>
                            <div>
                                <label className="block text-[10px] text-text-secondary uppercase font-black tracking-widest mb-1.5 ml-1">Paid Amount (₹)</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    max={outstandingBalance}
                                    className={`w-full bg-surface-primary border rounded-xl p-3 text-text-primary font-bold focus:border-primary outline-none transition-all ${paymentType === 'full' ? 'opacity-50 cursor-not-allowed border-border' : 'border-border'}`}
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
                                <p className="text-[10px] text-text-muted mt-1.5 ml-1 font-bold uppercase tracking-tight">
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
                                             Calculated Due Date
                                         </label>
                                         <div className="w-full bg-surface-divider/80 border border-amber-500/50 rounded-xl p-3 text-amber-400 font-bold bg-surface-primary flex items-center justify-between animate-in fade-in slide-in-from-bottom-1">
                                             <span>{formatDisplayDate(formData.dueDate)}</span>
                                             <Calendar size={14} className="opacity-30" />
                                         </div>
                                     </>
                                 )}
                                 {paymentType === 'partial' && isEffectivelyFullPayment && (
                                     <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl animate-in fade-in slide-in-from-bottom-1">
                                         <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">✓ No due date needed</p>
                                         <p className="text-[9px] text-text-secondary mt-1">Amount covers full remaining balance</p>
                                     </div>
                                 )}
                            </div>
                        </div>
                    </div>

                    {formError && (
                        <div className="flex items-start gap-3 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl animate-in fade-in slide-in-from-top-2 duration-200">
                            <AlertTriangle className="text-rose-500 shrink-0 mt-0.5" size={16} />
                            <div className="flex-1">
                                <p className="text-rose-400 text-xs font-semibold leading-relaxed">{formError}</p>
                            </div>
                        </div>
                    )}

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



