import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'react-toastify';
import { useNavigate, NavLink } from 'react-router-dom';
import { LogOut, Home, List, Menu, X, Receipt, Calendar, Package, ChevronDown, Check, AlertTriangle, ArrowRight } from 'lucide-react';
import Button from '../../components/Button';
import { calculateDaysLeft, formatDisplayDate } from '../../utils/membership';

// ─── Constants ───────────────────────────────────────────────────────────────
const phoneRegex = /^[6-9]\d{9}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const errorInputClass = 'border-red-500 focus:ring-red-500/50 shadow-[0_0_8px_rgba(239,68,68,0.2)]';

// ─── Component: Reusable Field (Matches owner profile UI) ────────────────────
const Field = ({ label, value, onChange, disabled = false, textarea = false, type = "text", error, maxLength }) => {
  const Component = textarea ? 'textarea' : 'input';
  const baseClass = `input-field ${textarea ? 'h-24 resize-none' : ''}`;
  const statusClass = disabled ? 'bg-gray-800/60 text-gray-500 cursor-not-allowed' : (error ? errorInputClass : '');

  return (
    <label className="space-y-1 block group">
      <div className="flex justify-between items-center">
        <span className="text-xs uppercase tracking-wider text-gray-500 group-focus-within:text-primary transition-colors font-medium">{label}</span>
        {maxLength && !disabled && (
          <span className={`text-[10px] ${(value?.length || 0) >= maxLength ? 'text-orange-400' : 'text-gray-600'}`}>
            {value?.length || 0}/{maxLength}
          </span>
        )}
      </div>
      <Component
        type={textarea ? undefined : type}
        value={value || ''}
        onChange={onChange}
        disabled={disabled}
        maxLength={maxLength}
        className={`${baseClass} ${statusClass}`.trim()}
      />
      {error && !disabled && <p className="text-red-500 text-[11px] mt-1 italic font-medium">{error}</p>}
    </label>
  );
};

const ClientSidebar = ({ isOpen, onClose, isMobile }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={`${isMobile ? `fixed inset-y-0 left-0 z-50 w-64 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out` : 'w-64'} h-screen bg-gray-900 border-r border-gray-800 flex flex-col pt-6 px-4 shrink-0`}>
      <div className="flex items-center justify-between gap-3 mb-10 px-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent flex justify-center items-center font-bold text-lg text-white shadow-lg shadow-accent/30">
            {user?.avatar || 'C'}
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-white text-lg tracking-tight -mb-1 truncate max-w-[120px]">{user?.personalInfo?.name}</h2>
            <span className="text-xs text-gray-400 uppercase tracking-wider truncate block">{user?.gymName}</span>
          </div>
        </div>
        {isMobile && (
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X size={20} />
          </button>
        )}
      </div>

      <div className="flex-1 space-y-2">
        <NavLink to="/client" end onClick={() => isMobile && onClose()} className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all group ${isActive ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:text-white'}`}><Home size={20} /> Profile</NavLink>
        <NavLink to="/client/plans" onClick={() => isMobile && onClose()} className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all group ${isActive ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:text-white'}`}><List size={20} /> Plans</NavLink>
      </div>

      <div className="pb-6 pt-4 border-t border-gray-800">
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-red-500/10 hover:text-alert transition-all group"><LogOut size={20} /> Logout</button>
      </div>
    </div>
  );
}

const ClientDashboard = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [formState, setFormState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [showRenewModal, setShowRenewModal] = useState(false);
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
    if (!allowPartialPayments && showRenewModal) {
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
  }, [allowPartialPayments, showRenewModal, selectedPlan, detectedPendingPayment]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) {
        setIsSidebarOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Dynamically load Razorpay Checkout script
    if (!document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/client/profile');
      setProfile(res.data.data);
      setFormState(res.data.data);
    } catch (error) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  const calculateEndDate = (startDateStr, months) => {
    if (!startDateStr || !months) return new Date();
    const d = new Date(startDateStr);
    d.setMonth(d.getMonth() + Number(months));
    return d;
  };

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

  const handleRenewClick = async () => {
    setShowRenewModal(true);
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
    } catch {
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

    if (paymentType === 'partial' && paid < maxLimit && !renewalForm.dueDate) {
      alert("Due Date is required for partial payments");
      return;
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

      setShowRenewModal(false);
      setSelectedPlan(null);
      setDetectedPendingPayment(null);
      await fetchProfile();
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
            setShowRenewModal(false);
            setSelectedPlan(null);
            setDetectedPendingPayment(null);
            await fetchProfile();
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

  const setPersonalInfo = (key, value) => {
    setFormState((curr) => ({ ...curr, personalInfo: { ...curr.personalInfo, [key]: value } }));
    if (errors[key]) setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const validate = () => {
    const newErrors = {};
    const pi = formState.personalInfo;

    if (!pi.name?.trim()) newErrors.name = 'Full name is required';
    else if (pi.name.length > 20) newErrors.name = 'Max 20 characters';

    if (!pi.email?.trim()) newErrors.email = 'Email address is required';
    else if (!emailRegex.test(pi.email)) newErrors.email = 'Enter a valid email address';

    if (!pi.mobileNo?.trim()) newErrors.mobileNo = 'Mobile number is required';
    else if (!phoneRegex.test(pi.mobileNo)) newErrors.mobileNo = 'Enter a valid Indian mobile number';

    if (pi.emergencyContact && !phoneRegex.test(pi.emergencyContact)) newErrors.emergencyContact = 'Enter a valid Indian mobile number';

    if (!pi.address?.trim()) newErrors.address = 'Residential address is required';
    else if (pi.address.length > 100) newErrors.address = 'Max 100 characters';

    if (pi.medicalCondition && pi.medicalCondition.length > 100) newErrors.medicalCondition = 'Max 100 characters';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCancel = () => {
    setFormState(profile);
    setEditing(false);
    setErrors({});
  };

  const handleSave = async () => {
    if (!validate()) {
      toast.error('Please fix validation errors');
      return;
    }

    setSaving(true);
    try {
      const res = await api.put('/client/profile', { personalInfo: formState.personalInfo });
      setProfile(res.data.data);
      setFormState(res.data.data);
      setEditing(false);
      setErrors({});
      toast.success('Profile updated successfully');
    } catch (error) {
      const serverError = error.response?.data;
      if (serverError?.field) {
        setErrors(prev => ({ ...prev, [serverError.field]: serverError.message }));
        toast.error(serverError.message);
      } else {
        toast.error(serverError?.message || 'Failed to update profile');
      }
    } finally {
      setSaving(false);
    }
  };

  const getDaysLeftDisplay = () => {
    const membership = formState?.membership;
    if (!membership) return '-';
    const calcDb = calculateDaysLeft(membership.startDate, membership.endDate);
    const computedValue = calcDb !== null ? calcDb : (membership.daysLeft ?? '-');
    if (typeof computedValue === 'string' && computedValue.includes('Starts in')) return computedValue;
    if (membership.status === 'expired' || membership.status === 'overdue') return 'Expired';
    return `${computedValue} days left`;
  };

  if (loading || !formState) {
    return (
      <div className={`flex bg-dark h-screen overflow-hidden text-white ${isMobile ? 'flex-col' : 'flex-row'}`}>
        {isMobile && (
          <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 z-40 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-white font-bold text-base tracking-tight">GymPro</span>
            </div>
          </header>
        )}
        <ClientSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} isMobile={isMobile} />
        <div className="flex-1 flex justify-center items-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex bg-dark h-screen overflow-hidden ${isMobile ? 'flex-col' : 'flex-row'}`}>
      {/* MOBILE HEADER BAR */}
      {isMobile && (
        <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 z-40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent flex justify-center items-center font-bold text-sm text-white shadow-md">
              {user?.avatar || 'C'}
            </div>
            <div>
              <span className="text-white font-bold text-base tracking-tight truncate max-w-[120px] inline-block">{user?.personalInfo?.name}</span>
              <span className="text-xs text-gray-500 block -mt-1 uppercase tracking-wider truncate max-w-[120px]">{user?.gymName}</span>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 border border-gray-700 rounded-lg text-white hover:bg-gray-800 transition-colors"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </header>
      )}

      {/* MOBILE DRAWER BACKDROP */}
      {isMobile && isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-45 transition-opacity"
        />
      )}

      <ClientSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} isMobile={isMobile} />

      <div className="flex-1 overflow-y-auto p-4 md:p-8 md:pt-10 space-y-8 scrollbar-hide">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">Client Profile</h1>
            <p className="text-gray-400 mt-2 text-base md:text-lg">Manage your personal identity and membership status.</p>
          </div>
          <div className="flex gap-2">
            {editing ? (
              <>
                <Button type="button" variant="secondary" onClick={handleCancel}>Cancel</Button>
                <Button type="button" onClick={handleSave} isLoading={saving}>Save Changes</Button>
              </>
            ) : (
              <>
                <Button type="button" onClick={handleRenewClick}>
                  {getPendingPayment(profile) ? 'Pay Pending Dues' : 'Renew Membership'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setEditing(true)}>Edit Profile</Button>
              </>
            )}
          </div>
        </div>

        <div className="card space-y-6 bg-gray-900 border-gray-800">
          <h2 className="text-xl font-semibold text-white border-b border-gray-800 pb-4">Personal Info</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Field label="Client ID" value={formState.clientId} disabled />
            <Field label="Home Gym ID" value={formState.gymId} disabled />

            <Field
              label="Full Name *"
              value={formState.personalInfo?.name}
              disabled={!editing}
              maxLength={20}
              error={errors.name}
              onChange={e => setPersonalInfo('name', e.target.value)}
            />

            <label className="space-y-1 block group">
              <span className="text-xs uppercase tracking-wider text-gray-500 group-focus-within:text-primary transition-colors font-medium">Gender *</span>
              <select
                value={formState.personalInfo?.gender || ''}
                onChange={e => setPersonalInfo('gender', e.target.value)}
                disabled={!editing}
                className={`input-field bg-gray-900 ${!editing ? 'bg-gray-800/60 text-gray-500 cursor-not-allowed' : ''}`}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </label>

            <Field
              label="Email Address *"
              value={formState.personalInfo?.email}
              type="email"
              disabled={!editing}
              error={errors.email}
              onChange={e => setPersonalInfo('email', e.target.value)}
            />

            <Field
              label="Mobile Number *"
              value={formState.personalInfo?.mobileNo}
              type="tel"
              disabled={!editing}
              error={errors.mobileNo}
              onChange={e => setPersonalInfo('mobileNo', e.target.value)}
            />

            <Field
              label="Date of Birth *"
              value={formState.personalInfo?.dob ? formState.personalInfo.dob.slice(0, 10) : ''}
              type="date"
              disabled={!editing}
              onChange={e => setPersonalInfo('dob', e.target.value)}
            />

            <Field
              label="Emergency Contact"
              value={formState.personalInfo?.emergencyContact}
              type="tel"
              disabled={!editing}
              error={errors.emergencyContact}
              onChange={e => setPersonalInfo('emergencyContact', e.target.value)}
            />

            <div className="md:col-span-2">
              <Field
                label="Residential Address *"
                value={formState.personalInfo?.address}
                textarea
                disabled={!editing}
                maxLength={100}
                error={errors.address}
                onChange={e => setPersonalInfo('address', e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <Field
                label="Medical Condition / Health Notes"
                value={formState.personalInfo?.medicalCondition}
                textarea
                disabled={!editing}
                maxLength={100}
                error={errors.medicalCondition}
                onChange={e => setPersonalInfo('medicalCondition', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="card space-y-6 bg-gray-900 border-gray-800">
          <h2 className="text-xl font-semibold text-white border-b border-gray-800 pb-4">Membership Info</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <div className="bg-gray-800/40 rounded-xl p-5 border border-gray-800 shadow-inner group hover:border-primary/30 transition-colors">
              <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-2">Active Plan</p>
              <p className="text-white text-lg font-semibold">{formState.membership?.planName || 'N/A'}</p>
            </div>
            <div className="bg-gray-800/40 rounded-xl p-5 border border-gray-800 shadow-inner group hover:border-primary/30 transition-colors">
              <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-2">Total Duration</p>
              <p className="text-white text-lg font-semibold">{formState.membership?.durationMonths ? `${formState.membership.durationMonths} Months` : 'N/A'}</p>
            </div>
            <div className="bg-gray-800/40 rounded-xl p-5 border border-gray-800 bg-primary/5 shadow-inner group hover:border-primary/30 transition-colors">
              <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-2 text-primary/70">Remaining Time</p>
              <p className="text-white text-lg font-bold">{getDaysLeftDisplay()}</p>
            </div>
            <div className="bg-gray-800/40 rounded-xl p-5 border border-gray-800 shadow-inner group hover:border-primary/30 transition-colors">
              <p className="text-xs text-gray-400 uppercase font-bold tracking-widest mb-2">Start Date</p>
              <p className="text-white text-lg font-semibold">{formatDisplayDate(formState.membership?.startDate)}</p>
            </div>
            <div className="bg-gray-800/40 rounded-xl p-5 border border-gray-800 shadow-inner group hover:border-primary/30 transition-colors">
              <p className="text-xs text-gray-400 uppercase font-bold tracking-widest mb-2">End Date</p>
              <p className="text-white text-lg font-semibold">{formatDisplayDate(formState.membership?.endDate)}</p>
            </div>
            <div className="bg-gray-800/40 rounded-xl p-5 border border-gray-800 shadow-inner group hover:border-primary/30 transition-colors">
              <p className="text-xs text-gray-400 uppercase font-bold tracking-widest mb-2">Member Status</p>
              <p className={`text-lg font-bold uppercase ${formState.membership?.status === 'active' ? 'text-emerald-400' : 'text-orange-400'}`}>
                {formState.membership?.status?.replace('_', ' ') || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Payment History Ledger */}
        <div className="card space-y-6 bg-gray-900 border-gray-800">
          <h2 className="text-xl font-semibold text-white border-b border-gray-800 pb-4 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" /> Payment History
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-800">
                  <th className="p-4">Receipt No</th>
                  <th className="p-4">Plan Name</th>
                  <th className="p-4">Payment Method</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {!formState.paymentHistory || formState.paymentHistory.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-gray-500">
                      No payment records found.
                    </td>
                  </tr>
                ) : (
                  formState.paymentHistory.map((pmt) => (
                    <tr key={pmt._id || pmt.paymentId} className="hover:bg-gray-800/30 transition-colors text-sm text-gray-300">
                      <td className="p-4 font-semibold text-white">{pmt.paymentId || 'N/A'}</td>
                      <td className="p-4">{pmt.planName || 'Custom'}</td>
                      <td className="p-4 uppercase text-xs">{pmt.paymentMethod || 'cash'}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${pmt.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                          }`}>
                          {pmt.status}
                        </span>
                      </td>
                      <td className="p-4">
                        {pmt.paymentDate ? new Date(pmt.paymentDate).toLocaleDateString('en-GB') : 'N/A'}
                      </td>
                      <td className="p-4 font-black text-white">₹{pmt.paidAmount?.toLocaleString('en-IN') || 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Plan Selection and Scheduling Renewal Modal (Exact replica of owner-side flow) */}
      {showRenewModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-gray-900 border border-gray-700/50 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/50 shrink-0">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Receipt className="text-primary" />
                Renew Membership
              </h2>
              <button onClick={() => { setShowRenewModal(false); setDetectedPendingPayment(null); }} className="text-gray-400 hover:text-white transition-colors" disabled={loadingPlans}>
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
              {/* Locked Client Display */}
              <div className="space-y-4">
                <div className="relative">
                  <label className="block text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1.5 ml-1">Client Profile</label>
                  <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/30 rounded-xl">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {formState.personalInfo?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-bold text-sm">{formState.personalInfo?.name}</p>
                      <p className="text-[10px] text-primary font-black uppercase tracking-tighter">{formState.clientId}</p>
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
                        <input
                          type="date"
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
                          disabled={paymentType === 'full'}
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
                              <input
                                type="date"
                                required
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
                  onClick={() => { setShowRenewModal(false); setDetectedPendingPayment(null); }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className={`w-full sm:flex-1 py-3.5 text-xs font-black uppercase tracking-widest ${paymentType === 'full' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20' : 'bg-primary shadow-primary/20'}`}
                  disabled={!selectedPlan}
                >
                  {renewalForm.paymentMethod === 'cash' ? 'Confirm Cash Renewal' : 'Proceed to Payment'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDashboard;
