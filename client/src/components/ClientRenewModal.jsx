import React, { useState, useEffect } from 'react';
import { X, Receipt, AlertTriangle, Package, Calendar, ChevronDown, Check, ArrowRight } from 'lucide-react';
import api from '../utils/api';
import { toast } from 'react-toastify';
import Button from './Button';
import { formatDisplayDate, calculateEndDate } from '../utils/membership';
import CustomDatePicker from './CustomDatePicker';

const getLatestExpiryDate = (clientDoc) => {
  if (!clientDoc) return null;
  if (clientDoc.memberships && clientDoc.memberships.length > 0) {
    const sortedMemberships = [...clientDoc.memberships].sort((a, b) => new Date(b.endDate) - new Date(a.endDate));
    const latest = sortedMemberships[0].endDate;
    if (latest && new Date(latest) >= new Date().setHours(0, 0, 0, 0)) {
      return latest;
    }
  } else if (clientDoc.membership?.endDate) {
    const latest = clientDoc.membership.endDate;
    if (latest && new Date(latest) >= new Date().setHours(0, 0, 0, 0)) {
      return latest;
    }
  }
  return null;
};

const getPendingPayment = (clientDoc) => {
  if (!clientDoc || !clientDoc.paymentHistory || clientDoc.paymentHistory.length === 0) return null;

  const sortedPayments = [...clientDoc.paymentHistory].sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));

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
  return pendingPayment;
};

const ClientRenewModal = ({ isOpen, onClose, profile, onSuccess }) => {
  const [availablePlans, setAvailablePlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [detectedPendingPayment, setDetectedPendingPayment] = useState(null);
  const [isPaying, setIsPaying] = useState(false);

  const [paymentType, setPaymentType] = useState('full'); // 'full' or 'partial'
  const [showPlanDropdown, setShowPlanDropdown] = useState(false);
  const [planSearchQuery, setPlanSearchQuery] = useState('');

  const [renewalForm, setRenewalForm] = useState({
    startDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'upi',
    paidAmount: '',
    dueDate: ''
  });

  const allowPartialPayments = profile?.gym?.billingInfo?.allowPartialPayments !== false;

  useEffect(() => {
    // Dynamically load Razorpay Checkout script
    if (isOpen && !document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!allowPartialPayments && isOpen) {
      setPaymentType('full');
      setRenewalForm(prev => {
        const maxLimit = detectedPendingPayment ? (
          (detectedPendingPayment.invoiceAmount || detectedPendingPayment.amount || 0) - (detectedPendingPayment.totalPaid || detectedPendingPayment.paidNow || detectedPendingPayment.paidAmount || 0)
        ) : (selectedPlan ? selectedPlan.price : 0);
        return {
          ...prev,
          paidAmount: maxLimit,
          dueDate: ''
        };
      });
    }
  }, [allowPartialPayments, isOpen, selectedPlan, detectedPendingPayment]);

  useEffect(() => {
    if (isOpen && profile) {
      loadRenewalData();
    }
  }, [isOpen, profile]);

  const loadRenewalData = async () => {
    setLoadingPlans(true);
    try {
      const pendingPayment = getPendingPayment(profile);
      const res = await api.get('/plan');
      const plansList = res.data.data || [];
      setAvailablePlans(plansList);

      if (pendingPayment) {
        setDetectedPendingPayment(pendingPayment);
        const plan = plansList.find(p => p._id === pendingPayment.planId);
        if (plan) {
          setSelectedPlan(plan);
          setPlanSearchQuery(plan.name);
        } else {
          setSelectedPlan({
            _id: pendingPayment.planId,
            name: pendingPayment.planName,
            price: pendingPayment.invoiceAmount || pendingPayment.amount
          });
          setPlanSearchQuery(pendingPayment.planName);
        }

        const originalPlanPrice = pendingPayment.invoiceAmount || pendingPayment.amount || 0;
        const totalPaidSoFar = pendingPayment.totalPaid || pendingPayment.paidNow || pendingPayment.paidAmount || 0;
        const outstandingBalance = originalPlanPrice - totalPaidSoFar;

        setPaymentType('full');
        setRenewalForm({
          startDate: pendingPayment.startDate ? new Date(pendingPayment.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          paymentMethod: 'upi',
          paidAmount: outstandingBalance,
          dueDate: ''
        });
      } else {
        setDetectedPendingPayment(null);
        // Auto-select active plan by default
        if (profile?.membership?.planId) {
          const pId = typeof profile.membership.planId === 'object' ? profile.membership.planId._id : profile.membership.planId;
          const current = plansList.find(p => p._id === pId);
          if (current) {
            handlePlanSelect(current);
          }
        } else if (plansList.length > 0) {
          handlePlanSelect(plansList[0]);
        }
      }
    } catch (err) {
      toast.error('Failed to load available plans');
    } finally {
      setLoadingPlans(false);
    }
  };

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
    setPlanSearchQuery(plan.name);
    setShowPlanDropdown(false);

    const latestExpiry = getLatestExpiryDate(profile);
    let defaultStart = new Date().toISOString().split('T')[0];
    if (latestExpiry) {
      const nextDay = new Date(latestExpiry);
      nextDay.setDate(nextDay.getDate() + 1);
      defaultStart = nextDay.toISOString().split('T')[0];
    }

    setPaymentType('full');
    setRenewalForm({
      startDate: defaultStart,
      paymentMethod: 'upi',
      paidAmount: plan.price,
      dueDate: ''
    });
  };

  const handlePaymentTypeChange = (type) => {
    setPaymentType(type);
    if (type === 'full') {
      const outstanding = detectedPendingPayment ? (
        (detectedPendingPayment.invoiceAmount || detectedPendingPayment.amount || 0) - (detectedPendingPayment.totalPaid || detectedPendingPayment.paidNow || detectedPendingPayment.paidAmount || 0)
      ) : (selectedPlan ? selectedPlan.price : 0);

      setRenewalForm(prev => ({
        ...prev,
        paidAmount: outstanding,
        dueDate: ''
      }));
    } else {
      setRenewalForm(prev => ({
        ...prev,
        paidAmount: '',
        dueDate: ''
      }));
    }
  };

  const handleRenewSubmit = (e) => {
    e.preventDefault();
    if (!selectedPlan) {
      alert("Please select a membership plan");
      return;
    }

    const maxLimit = detectedPendingPayment ? (
      (detectedPendingPayment.invoiceAmount || detectedPendingPayment.amount || 0) - (detectedPendingPayment.totalPaid || detectedPendingPayment.paidNow || detectedPendingPayment.paidAmount || 0)
    ) : selectedPlan.price;

    const paid = Number(renewalForm.paidAmount) || 0;
    if (paid > maxLimit) {
      alert(`Paid amount cannot exceed outstanding balance of ₹${maxLimit}`);
      return;
    }

    if (paymentType === 'partial' && paid < maxLimit) {
      if (!renewalForm.dueDate) {
        alert("Due Date is required for partial payments");
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const start = new Date(renewalForm.startDate);
      start.setHours(0, 0, 0, 0);

      const due = new Date(renewalForm.dueDate);
      due.setHours(0, 0, 0, 0);

      const duration = selectedPlan.durationMonths || 1;
      const end = calculateEndDate(renewalForm.startDate, duration);
      if (end) end.setHours(0, 0, 0, 0);

      if (due < today) {
        alert("Due Date cannot be in the past.");
        return;
      }
      if (due < start) {
        alert("Due Date cannot be earlier than the membership Start Date.");
        return;
      }
      if (end && due > end) {
        alert(`Due Date cannot exceed the membership Expiry Date (${end.toLocaleDateString('en-GB').replace(/\//g, '-')}).`);
        return;
      }
    }

    if (renewalForm.paymentMethod === 'upi' || renewalForm.paymentMethod === 'card') {
      handleRealRazorpayPayment(paid);
    } else {
      executeRenewalPayment(paid);
    }
  };

  const executeRenewalPayment = async (paidAmtOverride) => {
    setIsPaying(true);
    try {
      const paidValue = paidAmtOverride !== undefined ? paidAmtOverride : (Number(renewalForm.paidAmount) || 0);

      if (detectedPendingPayment) {
        await api.put(`/payment/${detectedPendingPayment._id}`, {
          additionalAmount: paidValue,
          paymentMethod: renewalForm.paymentMethod
        });
        toast.success(`Outstanding balance successfully paid!`);
      } else {
        const payload = {
          planId: selectedPlan._id,
          startDate: renewalForm.startDate,
          paymentMethod: renewalForm.paymentMethod,
          paidAmount: paidValue,
          dueDate: paymentType === 'full' ? '' : renewalForm.dueDate
        };

        await api.post('/payment', payload);
        toast.success(`Membership successfully renewed for ${selectedPlan.name}!`);
      }

      onClose();
      setSelectedPlan(null);
      setDetectedPendingPayment(null);
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Membership renewal failed');
    } finally {
      setIsPaying(false);
    }
  };

  const handleRealRazorpayPayment = async (paidValue) => {
    if (!window.Razorpay) {
      toast.error("Razorpay SDK failed to load. Please refresh the page.");
      return;
    }

    setIsPaying(true);
    try {
      const payload = detectedPendingPayment 
        ? { paymentId: detectedPendingPayment._id, additionalAmount: paidValue }
        : { planId: selectedPlan._id, paidAmount: paidValue };
      
      const res = await api.post('/payment/create-order', payload);
      const { orderId, amount, keyId } = res.data;

      const options = {
        key: keyId,
        amount: amount,
        currency: 'INR',
        name: profile.gymName || 'GymPro',
        description: detectedPendingPayment ? `Dues: ${detectedPendingPayment.planName}` : `Plan: ${selectedPlan.name}`,
        order_id: orderId,
        handler: async function (response) {
          try {
            setIsPaying(true);
            if (detectedPendingPayment) {
              await api.put(`/payment/${detectedPendingPayment._id}`, {
                additionalAmount: paidValue,
                paymentMethod: renewalForm.paymentMethod,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature
              });
              toast.success(`Outstanding balance successfully paid!`);
            } else {
              const payloadPost = {
                planId: selectedPlan._id,
                startDate: renewalForm.startDate,
                paymentMethod: renewalForm.paymentMethod,
                paidAmount: paidValue,
                dueDate: paymentType === 'full' ? '' : renewalForm.dueDate,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature
              };
              await api.post('/payment', payloadPost);
              toast.success(`Membership successfully renewed for ${selectedPlan.name}!`);
            }
            onClose();
            setSelectedPlan(null);
            setDetectedPendingPayment(null);
            if (onSuccess) onSuccess();
          } catch (error) {
            toast.error(error.response?.data?.message || 'Payment signature verification failed');
          } finally {
            setIsPaying(false);
          }
        },
        prefill: {
          name: profile.personalInfo?.name || '',
          email: profile.personalInfo?.email || '',
          contact: profile.personalInfo?.mobileNo || ''
        },
        theme: {
          color: '#3B82F6'
        },
        modal: {
          ondismiss: function () {
            setIsPaying(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to initiate checkout order');
      setIsPaying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-gray-900 border border-gray-700/50 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/50 shrink-0">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Receipt className="text-primary" />
            {detectedPendingPayment ? 'Update Payment' : 'Renew Membership'}
          </h2>
          <button onClick={() => { onClose(); setDetectedPendingPayment(null); }} className="text-gray-400 hover:text-white transition-colors" disabled={loadingPlans || isPaying}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleRenewSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
          {/* Pending Payment Banner */}
          {detectedPendingPayment && (
            <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
              <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-amber-400 text-sm font-bold">Pending Balance Detected</p>
                <p className="text-gray-400 text-xs mt-1">
                  You have an outstanding balance of <span className="text-white font-bold">₹{detectedPendingPayment.remainingBalance !== undefined ? detectedPendingPayment.remainingBalance : ((detectedPendingPayment.invoiceAmount || detectedPendingPayment.amount || 0) - (detectedPendingPayment.totalPaid || detectedPendingPayment.paidNow || detectedPendingPayment.paidAmount || 0))}</span> for <span className="text-white font-medium">{detectedPendingPayment.planName}</span>. Pay the remaining amount below.
                </p>
              </div>
            </div>
          )}
          
          {/* Client Display */}
          <div className="space-y-4">
            <div className="relative">
              <label className="block text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1.5 ml-1">Client Profile</label>
              <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/30 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {profile.personalInfo?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-white font-bold text-sm">{profile.personalInfo?.name}</p>
                  <p className="text-[10px] text-primary font-black uppercase tracking-tighter">{profile.clientId}</p>
                </div>
              </div>
            </div>

            {/* Plan Selection Dropdown */}
            <div className="relative">
              <label className="block text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1.5 ml-1">Search Membership Plan</label>
              {selectedPlan ? (
                <div className="flex items-center justify-between p-3 bg-gray-800/50 border border-gray-700 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                      <Package size={18} />
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">{selectedPlan.name}</p>
                      <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">₹{selectedPlan.price?.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                  {!detectedPendingPayment && (
                    <button
                      type="button"
                      onClick={() => { setSelectedPlan(null); setPlanSearchQuery(''); }}
                      className="text-xs text-gray-400 hover:text-white bg-gray-800 px-2.5 py-1 rounded-md border border-gray-700"
                    >
                      Change
                    </button>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input
                    type="text"
                    required
                    readOnly
                    disabled={!!detectedPendingPayment}
                    className={`w-full bg-dark border border-gray-700 rounded-xl pl-11 pr-4 py-3.5 text-white focus:border-primary outline-none ${detectedPendingPayment ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    placeholder="Click to select a membership plan"
                    value={planSearchQuery}
                    onClick={() => !detectedPendingPayment && setShowPlanDropdown(true)}
                  />
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />

                  {showPlanDropdown && (
                    <div className="absolute z-[10000] left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto custom-scrollbar">
                      {availablePlans.length > 0 ? (
                        availablePlans.map(p => (
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
                                <p className="text-sm font-bold text-gray-200 group-hover:text-white">{p.name}</p>
                                <p className="text-[10px] text-gray-500 font-bold">₹{p.price?.toLocaleString('en-IN')} for {p.durationMonths} Mo</p>
                              </div>
                            </div>
                            {selectedPlan?._id === p._id && <Check size={16} className="text-primary" />}
                          </button>
                        ))
                      ) : (
                        <div className="p-8 text-center text-gray-500 text-sm italic">No plans available</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Scheduling Section */}
            {!detectedPendingPayment && selectedPlan && (
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="text-primary" size={16} />
                  <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Membership Scheduling</h3>
                </div>

                {getLatestExpiryDate(profile) && (
                  <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={14} />
                    <p className="text-[10px] text-amber-200 font-medium leading-relaxed">
                      Your active/upcoming plan expires on <span className="text-white font-bold">{formatDisplayDate(getLatestExpiryDate(profile))}</span>.
                      The renewed membership will start automatically after this to prevent overlap.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1.5 ml-1">Start Date</label>
                    <CustomDatePicker
                      required
                      min={getLatestExpiryDate(profile) ? (() => {
                        const d = new Date(getLatestExpiryDate(profile));
                        d.setDate(d.getDate() + 1);
                        return d.toISOString().split('T')[0];
                      })() : new Date().toISOString().split('T')[0]}
                      className="w-full bg-dark border border-gray-700 rounded-xl p-3 text-white font-bold focus:border-primary outline-none transition-all"
                      value={renewalForm.startDate}
                      onChange={(e) => setRenewalForm({ ...renewalForm, startDate: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1.5 ml-1">Calculated Expiry</label>
                    <div className="w-full bg-gray-800/30 border border-gray-800 rounded-xl p-3 text-emerald-400 font-bold flex items-center justify-between">
                      <span>{formatDisplayDate(calculateEndDate(renewalForm.startDate, selectedPlan.durationMonths))}</span>
                      <ArrowRight size={14} className="opacity-30" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {selectedPlan && (
            <>
              {/* Financial Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-200">
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1.5 ml-1">Total Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                    <input
                      type="number"
                      readOnly
                      className="w-full bg-gray-800/30 border border-gray-800 rounded-xl pl-8 pr-4 py-3 text-white font-bold outline-none cursor-not-allowed"
                      value={detectedPendingPayment ? (detectedPendingPayment.invoiceAmount || detectedPendingPayment.amount || 0) : selectedPlan.price}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1.5 ml-1">Payment Method</label>
                  <select
                    className="w-full bg-dark border border-gray-700 rounded-xl p-3 text-white font-bold focus:border-primary outline-none transition-all"
                    value={renewalForm.paymentMethod}
                    onChange={(e) => setRenewalForm({ ...renewalForm, paymentMethod: e.target.value })}
                  >
                    <option value="upi">UPI (Razorpay Mockup)</option>
                    <option value="card">Card (Razorpay Mockup)</option>
                    <option value="cash">Cash (Simulated Manual)</option>
                  </select>
                </div>
              </div>

              {/* Payment Type Toggles */}
              <div className="bg-gray-800/20 p-4 rounded-xl border border-gray-800 space-y-4 animate-in fade-in duration-200">
                {allowPartialPayments && (
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
                )}

                <div className={`${allowPartialPayments ? 'grid grid-cols-1 sm:grid-cols-2 gap-4 col-span-2' : 'block col-span-2'}`}>
                  <div>
                    <label className="block text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1.5 ml-1">Paid Amount (₹)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      max={detectedPendingPayment ? (
                        (detectedPendingPayment.invoiceAmount || detectedPendingPayment.amount || 0) - (detectedPendingPayment.totalPaid || detectedPendingPayment.paidNow || detectedPendingPayment.paidAmount || 0)
                      ) : selectedPlan.price}
                      className={`w-full bg-dark border rounded-xl p-3 text-white font-bold focus:border-primary outline-none transition-all ${paymentType === 'full' ? 'opacity-50 cursor-not-allowed border-gray-800' : 'border-gray-700'}`}
                      value={renewalForm.paidAmount}
                      onChange={(e) => {
                        const val = e.target.value;
                        const maxLimit = detectedPendingPayment ? (
                          (detectedPendingPayment.invoiceAmount || detectedPendingPayment.amount || 0) - (detectedPendingPayment.totalPaid || detectedPendingPayment.paidNow || detectedPendingPayment.paidAmount || 0)
                        ) : selectedPlan.price;
                        if (val === '' || (Number(val) >= 0 && Number(val) <= maxLimit)) {
                          setRenewalForm({ ...renewalForm, paidAmount: val });
                        }
                      }}
                      disabled={paymentType === 'full' || isPaying}
                      placeholder="Enter paid amount"
                    />
                    <p className="text-[10px] text-gray-500 mt-1.5 ml-1 font-bold uppercase tracking-tight">
                      {detectedPendingPayment ? (
                        <>
                          Already Paid: <span className="text-emerald-500">₹{detectedPendingPayment.totalPaid || detectedPendingPayment.paidNow || detectedPendingPayment.paidAmount || 0}</span> | Bal: <span className="text-primary">₹{(detectedPendingPayment.invoiceAmount || detectedPendingPayment.amount || 0) - (detectedPendingPayment.totalPaid || detectedPendingPayment.paidNow || detectedPendingPayment.paidAmount || 0)}</span>
                        </>
                      ) : (
                        <>
                          Max Allowed: <span className="text-primary">₹{selectedPlan.price}</span> (Plan Price)
                        </>
                      )}
                    </p>
                    {paymentType === 'partial' && (
                      <p className="text-[10px] mt-1.5 font-bold uppercase tracking-widest text-rose-500 flex justify-between px-1">
                        <span>Balance Due:</span>
                        <span>₹{(
                          (detectedPendingPayment ? (
                            (detectedPendingPayment.invoiceAmount || detectedPendingPayment.amount || 0) - (detectedPendingPayment.totalPaid || detectedPendingPayment.paidNow || detectedPendingPayment.paidAmount || 0)
                          ) : selectedPlan.price) - (Number(renewalForm.paidAmount) || 0)
                        ).toFixed(2)}</span>
                      </p>
                    )}
                  </div>
                  <div>
                    {paymentType === 'partial' && (Number(renewalForm.paidAmount) || 0) < (
                      detectedPendingPayment ? (
                        (detectedPendingPayment.invoiceAmount || detectedPendingPayment.amount || 0) - (detectedPendingPayment.totalPaid || detectedPendingPayment.paidNow || detectedPendingPayment.paidAmount || 0)
                      ) : selectedPlan.price
                    ) && (
                      <>
                        <label className="block text-[10px] text-amber-500 uppercase font-black tracking-widest mb-1.5 ml-1">
                          Due Date <span className="text-rose-500">*</span>
                        </label>
                        <CustomDatePicker
                          required
                          disabled={isPaying}
                          className="w-full bg-dark border border-amber-500/50 rounded-xl p-3 text-white font-bold outline-none focus:border-amber-500 transition-all animate-in fade-in duration-200"
                          value={renewalForm.dueDate}
                          onChange={(e) => setRenewalForm({ ...renewalForm, dueDate: e.target.value })}
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-800">
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:flex-1 py-3.5 text-xs font-black uppercase tracking-widest"
              onClick={() => { onClose(); setDetectedPendingPayment(null); }}
              disabled={isPaying}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className={`w-full sm:flex-1 py-3.5 text-xs font-black uppercase tracking-widest ${paymentType === 'full' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20' : 'bg-primary shadow-primary/20'}`}
              disabled={!selectedPlan || isPaying}
              isLoading={isPaying}
            >
              {renewalForm.paymentMethod === 'cash' ? 'Confirm Cash Renewal' : 'Proceed to Payment'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClientRenewModal;
