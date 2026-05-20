import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'react-toastify';
import { useNavigate, NavLink } from 'react-router-dom';
import { LogOut, Home, List, Menu, X } from 'lucide-react';
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
              <Button type="button" variant="secondary" onClick={() => setEditing(true)}>Edit Profile</Button>
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
      </div>
    </div>
  );
};

export default ClientDashboard;
