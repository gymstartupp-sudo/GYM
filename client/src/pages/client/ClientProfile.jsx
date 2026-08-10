import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { toast } from 'react-toastify';
import { ChevronLeft } from 'lucide-react';
import Button from '../../components/Button';
import CustomDatePicker from '../../components/CustomDatePicker';
import { DATE_RULES, getDobYearBounds, validateDob } from '../../utils/dateInput';


// ─── Constants ───────────────────────────────────────────────────────────────
const phoneRegex = /^[6-9]\d{9}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const errorInputClass = 'border-red-500 focus:ring-red-500/50 shadow-[0_0_8px_rgba(239,68,68,0.2)]';

// ─── Component: Reusable Field ────────────────────
const Field = ({ label, value, onChange, disabled = false, textarea = false, type = "text", error, maxLength, ...rest }) => {
  const Component = textarea ? 'textarea' : 'input';
  const baseClass = `input-field ${textarea ? 'h-24 resize-none' : ''}`;
  const statusClass = disabled ? 'bg-surface-hover/60 text-text-muted cursor-not-allowed' : (error ? errorInputClass : '');

  return (
    <label className="space-y-1 block group">
      <div className="flex justify-between items-center">
        <span className="text-xs uppercase tracking-wider text-text-muted group-focus-within:text-primary transition-colors font-medium">{label}</span>
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
        {...rest}
      />
      {error && !disabled && <p className="text-red-500 text-[11px] mt-1 italic font-medium">{error}</p>}
    </label>
  );
};

const ClientProfile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [formState, setFormState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const { minYear: dobMinYear, maxYear: dobMaxYear } = getDobYearBounds();

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

  useEffect(() => {
    fetchProfile();
  }, []);

  const validateSingleField = (key, value) => {
    let errMsg = '';
    if (key === 'name') {
      if (!value?.trim()) errMsg = 'Full name is required';
      else if (value.length > 25) errMsg = 'Max 25 characters';
    } else if (key === 'email') {
      if (!value?.trim()) errMsg = 'Email address is required';
      else if (!emailRegex.test(value)) errMsg = 'Enter a valid email address';
    } else if (key === 'mobileNo') {
      if (!value?.trim()) errMsg = 'Mobile number is required';
      else if (!phoneRegex.test(value)) errMsg = 'Enter a valid Indian mobile number';
    } else if (key === 'emergencyContact') {
      if (value && !phoneRegex.test(value)) errMsg = 'Enter a valid Indian mobile number';
    } else if (key === 'address') {
      if (!value?.trim()) errMsg = 'Residential address is required';
      else if (value.length > 100) errMsg = 'Max 100 characters';
    } else if (key === 'medicalCondition') {
      if (value && value.length > 100) errMsg = 'Max 100 characters';
    } else if (key === 'dob') {
      if (!value) {
        errMsg = 'Date of birth is required';
      } else {
        errMsg = validateDob(value) || '';
      }
    } else if (key === 'city') {
      // No max validation
    } else if (key === 'state') {
      // No max validation
    } else if (key === 'pincode') {
      if (value && value.length !== 6) errMsg = 'Enter a valid 6-digit pincode';
    }

    setErrors(prev => {
      const newErr = { ...prev };
      if (errMsg) newErr[key] = errMsg;
      else delete newErr[key];
      return newErr;
    });
  };

  const setPersonalInfo = (key, value) => {
    setFormState((curr) => ({ ...curr, personalInfo: { ...curr.personalInfo, [key]: value } }));
    validateSingleField(key, value);
  };

  const handleDobChange = (e) => {
    setPersonalInfo('dob', e.target.value);
  };

  const validate = () => {
    const newErrors = {};
    const pi = formState.personalInfo || {};

    if (!pi.name?.trim()) newErrors.name = 'Full name is required';
    else if (pi.name.length > 25) newErrors.name = 'Max 25 characters';

    if (!pi.email?.trim()) newErrors.email = 'Email address is required';
    else if (!emailRegex.test(pi.email)) newErrors.email = 'Enter a valid email address';

    if (!pi.mobileNo?.trim()) newErrors.mobileNo = 'Mobile number is required';
    else if (!phoneRegex.test(pi.mobileNo)) newErrors.mobileNo = 'Enter a valid Indian mobile number';

    if (pi.emergencyContact && !phoneRegex.test(pi.emergencyContact)) newErrors.emergencyContact = 'Enter a valid Indian mobile number';

    if (!pi.address?.trim()) newErrors.address = 'Residential address is required';
    else if (pi.address.length > 100) newErrors.address = 'Max 100 characters';

    if (pi.medicalCondition && pi.medicalCondition.length > 100) newErrors.medicalCondition = 'Max 100 characters';

    if (!pi.dob) {
      newErrors.dob = 'Date of birth is required';
    } else {
      const dobError = validateDob(pi.dob);
      if (dobError) {
        newErrors.dob = dobError;
      }
    }

    // No max validation for city and state
    if (pi.pincode && pi.pincode.length !== 6) newErrors.pincode = 'Enter a valid 6-digit pincode';

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
      setTimeout(() => {
        window.location.reload();
      }, 1000);
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

  if (loading || !formState) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-divider rounded-lg transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-text-primary tracking-tight">Client Profile</h1>
            <p className="text-text-secondary mt-2 text-base md:text-lg">Manage your personal identity details.</p>
          </div>
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

      <div className="card space-y-6 bg-surface-secondary border-border rounded-2xl p-6 md:p-8 shadow-xl">
        <h2 className="text-xl font-semibold text-text-primary border-b border-border pb-4">Personal Info</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field label="Client ID" value={formState.clientId} disabled />
          <Field label="Gym ID" value={formState.gymId} disabled />

          <Field
            label="Full Name *"
            value={formState.personalInfo?.name}
            disabled={!editing}
            maxLength={25}
            error={errors.name}
            onChange={e => setPersonalInfo('name', e.target.value)}
          />

          <label className="space-y-1 block group">
            <span className="text-xs uppercase tracking-wider text-text-muted group-focus-within:text-primary transition-colors font-medium">Gender *</span>
            <select
              value={formState.personalInfo?.gender || ''}
              onChange={e => setPersonalInfo('gender', e.target.value)}
              disabled={!editing}
              className={`input-field bg-surface-secondary border border-border text-text-primary rounded-xl ${!editing ? 'bg-surface-hover/60 text-text-muted cursor-not-allowed' : ''}`}
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
            maxLength={10}
            onInput={(e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10); }}
            onChange={e => setPersonalInfo('mobileNo', e.target.value)}
          />

          <label className="space-y-1 block group">
            <span className="text-xs uppercase tracking-wider text-text-muted group-focus-within:text-primary transition-colors font-medium">Date of Birth *</span>
            <CustomDatePicker
              value={formState.personalInfo?.dob ? formState.personalInfo.dob.slice(0, 10) : ''}
              disabled={!editing}
              validationRule={DATE_RULES.DOB}
              minDate={`${dobMinYear}-01-01`}
              maxDate={`${dobMaxYear}-12-31`}
              className={`input-field ${!editing ? 'bg-surface-hover/60 text-text-muted cursor-not-allowed' : ''} ${errors.dob ? errorInputClass : ''}`.trim()}
              onChange={handleDobChange}
              onValidationError={(message) => {
                setErrors(prev => {
                  const next = { ...prev };
                  if (message) next.dob = message;
                  else delete next.dob;
                  return next;
                });
              }}
            />
            {errors.dob && editing && <p className="text-red-500 text-[11px] mt-1 italic font-medium">{errors.dob}</p>}
          </label>

          <Field
            label="Emergency Contact"
            value={formState.personalInfo?.emergencyContact}
            type="tel"
            disabled={!editing}
            error={errors.emergencyContact}
            maxLength={10}
            onInput={(e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10); }}
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

          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Field
              label="City"
              value={formState.personalInfo?.city}
              disabled={!editing}
              error={errors.city}
              onChange={e => setPersonalInfo('city', e.target.value)}
            />
            <Field
              label="State"
              value={formState.personalInfo?.state}
              disabled={!editing}
              error={errors.state}
              onChange={e => setPersonalInfo('state', e.target.value)}
            />
            <Field
              label="Pincode"
              value={formState.personalInfo?.pincode}
              disabled={!editing}
              maxLength={6}
              error={errors.pincode}
              onInput={(e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6); }}
              onChange={e => setPersonalInfo('pincode', e.target.value)}
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
    </>
  );
};

export default ClientProfile;