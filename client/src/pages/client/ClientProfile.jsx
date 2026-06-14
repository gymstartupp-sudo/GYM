import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { toast } from 'react-toastify';
import Button from '../../components/Button';
import CustomDatePicker from '../../components/CustomDatePicker';

// ─── Constants ───────────────────────────────────────────────────────────────
const phoneRegex = /^[6-9]\d{9}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const errorInputClass = 'border-red-500 focus:ring-red-500/50 shadow-[0_0_8px_rgba(239,68,68,0.2)]';

// ─── Component: Reusable Field ────────────────────
const Field = ({ label, value, onChange, disabled = false, textarea = false, type = "text", error, maxLength, ...rest }) => {
  const Component = type === 'date' ? CustomDatePicker : (textarea ? 'textarea' : 'input');
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
        type={(textarea || type === 'date') ? undefined : type}
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
  const [profile, setProfile] = useState(null);
  const [formState, setFormState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

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
        const parsed = new Date(value);
        if (isNaN(parsed.getTime())) {
          errMsg = 'Enter a valid date of birth (DD-MM-YYYY)';
        } else {
          const today = new Date();
          let age = today.getFullYear() - parsed.getFullYear();
          const m = today.getMonth() - parsed.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < parsed.getDate())) {
            age--;
          }
          if (age < 14) {
            errMsg = 'Must be at least 14 years old';
          }
        }
      }
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
      const parsed = new Date(pi.dob);
      if (isNaN(parsed.getTime())) {
        newErrors.dob = 'Enter a valid date of birth (DD-MM-YYYY)';
      } else {
        const today = new Date();
        let age = today.getFullYear() - parsed.getFullYear();
        const m = today.getMonth() - parsed.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < parsed.getDate())) {
          age--;
        }
        if (age < 14) {
          newErrors.dob = 'Must be at least 14 years old';
        }
      }
    }

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
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-text-primary tracking-tight">Client Profile</h1>
            <p className="text-text-secondary mt-2 text-base md:text-lg">Manage your personal identity details.</p>
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
            <Field label="Home Gym ID" value={formState.gymId} disabled />

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

            <Field
              label="Date of Birth *"
              value={formState.personalInfo?.dob ? formState.personalInfo.dob.slice(0, 10) : ''}
              type="date"
              disabled={!editing}
              error={errors.dob}
              onChange={e => setPersonalInfo('dob', e.target.value)}
            />

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
