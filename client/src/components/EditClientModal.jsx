import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../utils/api';
import Button from './Button';
import CustomDatePicker from './CustomDatePicker';
import { DATE_RULES, getDobYearBounds, validateDob } from '../utils/dateInput';
import { STATES_LIST, getCitiesForState } from '../utils/indianStatesCities';

const phoneRegex = /^[6-9]\d{9}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const errorInputClass = 'border-red-500 focus:ring-red-500/50 shadow-[0_0_8px_rgba(239,68,68,0.2)]';

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

const SearchableSelect = ({ value, onChange, options = [], placeholder = 'Select', error, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
    }
  }, [isOpen]);

  const filteredOptions = options.filter(opt =>
    String(opt).toLowerCase().startsWith(search.toLowerCase())
  );

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`input-field bg-surface-secondary border border-border text-text-primary rounded-xl text-left flex items-center justify-between w-full h-11 px-3 ${error ? errorInputClass : ''
          } ${disabled ? 'bg-surface-hover/60 text-text-muted cursor-not-allowed border-transparent' : 'cursor-pointer'} focus:outline-none`}
      >
        <span className={value ? 'text-text-primary' : 'text-text-muted'}>
          {value || placeholder}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-slate-500 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 mt-1 bg-surface-card border border-border rounded-xl shadow-2xl z-50 max-h-56 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2 py-1.5 border-b border-border shrink-0 bg-surface-card">
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface-primary border border-border rounded px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:border-primary/50"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto flex-1 max-h-40 py-1">
            {filteredOptions.length === 0 ? (
              <p className="text-center py-2 text-xs text-text-muted">No options found</p>
            ) : (
              filteredOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs font-semibold cursor-pointer transition-colors ${value === opt
                    ? 'bg-primary text-black font-bold'
                    : 'text-text-primary hover:bg-primary hover:text-black'
                    }`}
                >
                  {opt}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function EditClientModal({ isOpen, onClose, client, onSuccess }) {
  const [formState, setFormState] = useState(client ? JSON.parse(JSON.stringify(client)) : null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const { minYear: dobMinYear, maxYear: dobMaxYear } = getDobYearBounds();

  useEffect(() => {
    if (client) {
      setFormState(JSON.parse(JSON.stringify(client)));
      setErrors({});
    }
  }, [client]);

  if (!isOpen || !formState) return null;

  const validateSingleField = (key, value) => {
    let errMsg = '';
    if (key === 'name') {
      if (!value?.trim()) errMsg = 'Full name is required';
      else if (value.length > 35) errMsg = 'Max 35 characters';
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
    else if (pi.name.length > 35) newErrors.name = 'Max 35 characters';

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

    if (pi.pincode && pi.pincode.length !== 6) newErrors.pincode = 'Enter a valid 6-digit pincode';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      toast.error('Please fix validation errors');
      return;
    }

    setSaving(true);
    try {
      const cleanPersonalInfo = {};
      const allowed = [
        'name', 'email', 'mobileNo', 'gender', 'dob', 'address',
        'emergencyContact', 'city', 'state', 'pincode', 'medicalCondition'
      ];
      for (const key of allowed) {
        if (formState.personalInfo?.[key] !== undefined) {
          cleanPersonalInfo[key] = formState.personalInfo[key];
        }
      }

      // We call PUT /client/:id to update the client details as an owner
      await api.put(`/client/${client._id}`, { personalInfo: cleanPersonalInfo });
      
      toast.success('Client updated successfully');
      if (onSuccess) onSuccess();
    } catch (error) {
      const serverError = error.response?.data;
      if (serverError?.field) {
        setErrors(prev => ({ ...prev, [serverError.field]: serverError.message }));
        toast.error(serverError.message);
      } else {
        toast.error(serverError?.message || 'Failed to update client');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <div className="bg-surface-secondary w-full max-w-4xl rounded-2xl shadow-xl overflow-hidden border border-border my-8">
        <div className="p-6 border-b border-border flex justify-between items-center sticky top-0 bg-surface-secondary z-10">
          <h2 className="text-xl font-bold text-text-primary">Edit Client Details</h2>
          <button onClick={onClose} className="p-2 text-text-muted hover:text-text-primary transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto">
          <Field label="Client ID" value={formState.clientId} disabled />
          <Field label="Gym ID" value={formState.gymId} disabled />

          <Field
            label="Full Name *"
            value={formState.personalInfo?.name}
            maxLength={35}
            error={errors.name}
            onChange={e => setPersonalInfo('name', e.target.value)}
          />

          <label className="space-y-1 block group">
            <span className="text-xs uppercase tracking-wider text-text-muted group-focus-within:text-primary transition-colors font-medium">Gender *</span>
            <select
              value={formState.personalInfo?.gender || ''}
              onChange={e => setPersonalInfo('gender', e.target.value)}
              className="input-field bg-surface-secondary border border-border text-text-primary rounded-xl"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </label>

          {/* owner CAN edit email and phone */}
          <Field
            label="Email Address *"
            value={formState.personalInfo?.email}
            type="email"
            error={errors.email}
            onChange={e => setPersonalInfo('email', e.target.value)}
          />

          <Field
            label="Mobile Number *"
            value={formState.personalInfo?.mobileNo || ''}
            type="tel"
            error={errors.mobileNo}
            maxLength={10}
            onChange={e => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 10);
              setPersonalInfo('mobileNo', val);
            }}
          />

          <label className="space-y-1 block group">
            <span className="text-xs uppercase tracking-wider text-text-muted group-focus-within:text-primary transition-colors font-medium">Date of Birth *</span>
            <CustomDatePicker
              value={formState.personalInfo?.dob ? formState.personalInfo.dob.slice(0, 10) : ''}
              validationRule={DATE_RULES.DOB}
              minDate={`${dobMinYear}-01-01`}
              maxDate={`${dobMaxYear}-12-31`}
              className={`input-field ${errors.dob ? errorInputClass : ''}`.trim()}
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
            {errors.dob && <p className="text-red-500 text-[11px] mt-1 italic font-medium">{errors.dob}</p>}
          </label>

          <Field
            label="Emergency Contact"
            value={formState.personalInfo?.emergencyContact || ''}
            type="tel"
            error={errors.emergencyContact}
            maxLength={10}
            onChange={e => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 10);
              setPersonalInfo('emergencyContact', val);
            }}
          />

          <div className="md:col-span-2">
            <Field
              label="Residential Address *"
              value={formState.personalInfo?.address}
              textarea
              maxLength={100}
              error={errors.address}
              onChange={e => setPersonalInfo('address', e.target.value)}
            />
          </div>

          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1 block group">
              <span className="text-xs uppercase tracking-wider text-text-muted font-medium block">State *</span>
              <SearchableSelect
                value={formState.personalInfo?.state || ''}
                onChange={(newState) => {
                  const cities = getCitiesForState(newState);
                  const currentCity = formState.personalInfo?.city;
                  const newCity = cities.includes(currentCity) ? currentCity : (cities[0] || '');
                  setFormState(c => ({
                    ...c,
                    personalInfo: {
                      ...c.personalInfo,
                      state: newState,
                      city: newCity
                    }
                  }));
                  validateSingleField('state', newState);
                  validateSingleField('city', newCity);
                }}
                options={STATES_LIST}
                placeholder="Select State"
                error={errors.state}
              />
              {errors.state && <p className="text-red-500 text-[11px] mt-1 italic font-medium">{errors.state}</p>}
            </div>

            <div className="space-y-1 block group">
              <span className="text-xs uppercase tracking-wider text-text-muted font-medium block">City *</span>
              <SearchableSelect
                value={formState.personalInfo?.city || ''}
                onChange={(newCity) => setPersonalInfo('city', newCity)}
                options={getCitiesForState(formState.personalInfo?.state)}
                placeholder={formState.personalInfo?.state ? "Select City" : "Select State First"}
                error={errors.city}
              />
              {errors.city && <p className="text-red-500 text-[11px] mt-1 italic font-medium">{errors.city}</p>}
            </div>

            <Field
              label="Pincode"
              value={formState.personalInfo?.pincode || ''}
              maxLength={6}
              error={errors.pincode}
              onChange={e => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                setPersonalInfo('pincode', val);
              }}
            />
          </div>

          <div className="md:col-span-2">
            <Field
              label="Medical Condition / Health Notes"
              value={formState.personalInfo?.medicalCondition}
              textarea
              maxLength={100}
              error={errors.medicalCondition}
              onChange={e => setPersonalInfo('medicalCondition', e.target.value)}
            />
          </div>
        </div>

        <div className="p-6 border-t border-border flex justify-end gap-3 bg-surface-secondary">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} isLoading={saving}>Save Changes</Button>
        </div>
      </div>
    </div>
  );
}
