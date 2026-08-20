import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { toast } from 'react-toastify';
import { ChevronLeft } from 'lucide-react';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { sortOperatingDays } from '../../utils/membership';
import { STATES_LIST, getCitiesForState } from '../../utils/indianStatesCities';

// ─── Constants ───────────────────────────────────────────────────────────────
const disabledInputClass = 'input-field bg-surface-hover/60 text-text-muted cursor-not-allowed';
const errorInputClass = 'border-red-500 focus:ring-red-500/50 shadow-[0_0_8px_rgba(239,68,68,0.2)]';
const phoneRegex = /^[6-9]\d{9}$/;
const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = ['00', '15', '30', '45'];

const parseTime = (timeStr) => {
  if (!timeStr) return { hour: '6', minute: '00', ampm: 'AM' };
  const str = timeStr.trim().toUpperCase();
  const matchColon = str.match(/^(\d+):(\d+)\s*(AM|PM)$/);
  if (matchColon) {
    return {
      hour: String(parseInt(matchColon[1], 10)),
      minute: matchColon[2],
      ampm: matchColon[3]
    };
  }
  const matchNoColon = str.match(/^(\d+)\s*(AM|PM)$/);
  if (matchNoColon) {
    return {
      hour: String(parseInt(matchNoColon[1], 10)),
      minute: '00',
      ampm: matchNoColon[2]
    };
  }
  return { hour: '6', minute: '00', ampm: 'AM' };
};

const buildTimeStr = (hour, minute, ampm) => {
  if (!hour) return '';
  return `${hour}:${minute || '00'} ${ampm || 'AM'}`;
};

// ─── Helper: Build form state from API data ──────────────────────────────────
const buildFormState = (data) => {
  const socialLinks = data?.gym?.socialMediaLinks || [];
  const getSocialLink = (platform) => socialLinks.find((item) => item.platform === platform)?.url || '';

  const openTimeParsed = parseTime(data.gym?.operatingHours?.open);
  const closeTimeParsed = parseTime(data.gym?.operatingHours?.close);

  return {
    gym: {
      ...data.gym,
      billingInfo: {
        allowPartialPayments: true,
        ...data.gym?.billingInfo
      },
      operatingDays: sortOperatingDays(data.gym?.operatingDays || []),
      operatingDaysText: sortOperatingDays(data.gym?.operatingDays || []).join(', '),
      operatingOpen: data.gym?.operatingHours?.open || '',
      operatingClose: data.gym?.operatingHours?.close || '',
      operatingOpenHour: openTimeParsed.hour,
      operatingOpenMinute: openTimeParsed.minute,
      operatingOpenAmpm: openTimeParsed.ampm,
      operatingCloseHour: closeTimeParsed.hour,
      operatingCloseMinute: closeTimeParsed.minute,
      operatingCloseAmpm: closeTimeParsed.ampm,
      instagramUrl: getSocialLink('instagram'),
      facebookUrl: getSocialLink('facebook'),
      websiteUrl: getSocialLink('website')
    },
    owner: data.owner
  };
};

// ─── Component: Profile Section wrapper ──────────────────────────────────────
const ProfileSection = ({ title, children }) => (
  <div className="card space-y-5 bg-surface-secondary border-border rounded-2xl p-6 md:p-8 shadow-xl">
    <div className="border-b border-border pb-4">
      <h2 className="text-xl font-semibold text-text-primary">{title}</h2>
    </div>
    {children}
  </div>
);

// ─── Component: Reusable Field ───────────────────────────────────────────────
const Field = ({ label, value, onChange, disabled = false, textarea = false, type = "text", error, maxLength, onInput }) => {
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
        onInput={onInput}
        disabled={disabled}
        maxLength={maxLength}
        className={`${baseClass} ${statusClass}`.trim()}
      />
      {error && !disabled && <p className="text-red-500 text-[11px] mt-1 italic">{error}</p>}
    </label>
  );
};

// ─── Component: Reusable TimeField ───────────────────────────────────────────
const TimeField = ({ label, hour, minute, ampm, disabled, onHourChange, onMinuteChange, onAmpmChange }) => {
  const [openDropdown, setOpenDropdown] = useState(null); // 'hour' | 'minute' | 'ampm' | null
  const containerRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-1 block group relative" ref={containerRef}>
      <span className="text-xs uppercase tracking-wider text-text-muted group-hover:text-primary transition-colors font-medium block">
        {label}
      </span>

      <div className={`flex items-center gap-1.5 h-11 px-3 bg-surface-card border rounded-input transition-all duration-200 ${disabled
          ? 'bg-surface-hover/60 border-border text-text-muted cursor-not-allowed'
          : 'border-border hover:border-primary hover:shadow-[0_0_8px_rgba(255,189,7,0.25)] focus-within:border-primary'
        }`}>

        {/* Hour Picker */}
        <div className="relative flex-1 text-center">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setOpenDropdown(prev => prev === 'hour' ? null : 'hour')}
            className="w-full text-text-primary hover:text-primary font-semibold text-sm focus:outline-none cursor-pointer py-1 flex items-center justify-center gap-1 select-none disabled:text-text-muted disabled:cursor-not-allowed transition-colors"
          >
            {hour || '6'}
          </button>

          {openDropdown === 'hour' && !disabled && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-20 max-h-48 overflow-y-auto bg-surface-card border border-border rounded-xl shadow-2xl z-50 py-1 space-y-0.5 animate-in fade-in zoom-in-95 duration-150">
              {HOURS.map(h => (
                <button
                  key={h}
                  type="button"
                  onClick={() => {
                    onHourChange({ target: { value: h } });
                    setOpenDropdown(null);
                  }}
                  className={`w-full text-center px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors ${String(hour) === String(h)
                      ? 'bg-primary text-black font-bold'
                      : 'text-text-primary hover:bg-primary hover:text-black'
                    }`}
                >
                  {h}
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="text-text-muted font-bold select-none group-hover:text-primary transition-colors">:</span>

        {/* Minute Picker */}
        <div className="relative flex-1 text-center">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setOpenDropdown(prev => prev === 'minute' ? null : 'minute')}
            className="w-full text-text-primary hover:text-primary font-semibold text-sm focus:outline-none cursor-pointer py-1 flex items-center justify-center gap-1 select-none disabled:text-text-muted disabled:cursor-not-allowed transition-colors"
          >
            {minute || '00'}
          </button>

          {openDropdown === 'minute' && !disabled && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-20 bg-surface-card border border-border rounded-xl shadow-2xl z-50 py-1 space-y-0.5 animate-in fade-in zoom-in-95 duration-150">
              {MINUTES.map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    onMinuteChange({ target: { value: m } });
                    setOpenDropdown(null);
                  }}
                  className={`w-full text-center px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors ${String(minute) === String(m)
                      ? 'bg-primary text-black font-bold'
                      : 'text-text-primary hover:bg-primary hover:text-black'
                    }`}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* AM/PM Picker */}
        <div className="relative">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setOpenDropdown(prev => prev === 'ampm' ? null : 'ampm')}
            className="bg-surface-divider text-text-primary font-bold text-xs focus:outline-none cursor-pointer px-2.5 py-1 rounded-md select-none border border-border hover:border-primary hover:bg-primary/20 hover:text-primary disabled:bg-transparent disabled:border-transparent disabled:text-text-muted disabled:cursor-not-allowed transition-all"
          >
            {ampm || 'AM'}
          </button>

          {openDropdown === 'ampm' && !disabled && (
            <div className="absolute top-full right-0 mt-2 w-16 bg-surface-card border border-border rounded-xl shadow-2xl z-50 py-1 space-y-0.5 animate-in fade-in zoom-in-95 duration-150">
              {['AM', 'PM'].map(ap => (
                <button
                  key={ap}
                  type="button"
                  onClick={() => {
                    onAmpmChange({ target: { value: ap } });
                    setOpenDropdown(null);
                  }}
                  className={`w-full text-center px-3 py-1.5 text-xs font-bold cursor-pointer transition-colors ${String(ampm) === String(ap)
                      ? 'bg-primary text-black font-bold'
                      : 'text-text-primary hover:bg-primary hover:text-black'
                    }`}
                >
                  {ap}
                </button>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

const SearchableSelect = ({ value, onChange, options = [], placeholder = 'Select', error }) => {
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
        onClick={() => setIsOpen(!isOpen)}
        className={`input-field bg-surface-card text-text-primary text-left flex items-center justify-between w-full h-11 px-3 ${error ? errorInputClass : ''
          } focus:outline-none cursor-pointer`}
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

      {isOpen && (
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

// ─── Main Profile Page ───────────────────────────────────────────────────────
const Profile = () => {
  const { role } = useAuth();
  const isReadOnly = role === 'superadmin' && !!sessionStorage.getItem('viewGymId');
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [formState, setFormState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const fileInputRef = React.useRef(null);

  const handleLogoClick = () => {
    if (isReadOnly) return;
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Supports: JPG, JPEG, PNG, WEBP.');
      return;
    }

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File is too large. Limit is 5MB.');
      return;
    }

    const formData = new FormData();
    formData.append('logo', file);

    try {
      toast.info('Uploading new profile picture...');
      const res = await api.put('/gym/profile/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const newLogoUrl = res.data.data.gymLogo;

      setFormState(curr => ({
        ...curr,
        gym: {
          ...curr.gym,
          gymLogo: newLogoUrl,
          billingInfo: {
            ...curr.gym.billingInfo,
            logo: newLogoUrl
          }
        }
      }));

      setProfile(curr => ({
        ...curr,
        gym: {
          ...curr.gym,
          gymLogo: newLogoUrl,
          billingInfo: {
            ...curr.gym.billingInfo,
            logo: newLogoUrl
          }
        }
      }));

      toast.success('Profile picture updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile picture');
    }
  };

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await api.get('/gym/profile');
      setProfile(res.data.data);
      setFormState(buildFormState(res.data.data));
    } catch (error) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  const validateSingleField = (key, value) => {
    let errMsg = '';
    if (key === 'gymName' || key === 'name') {
      if (!value?.trim()) errMsg = 'Name is required';
      else if (value.length > 35) errMsg = 'Max 35 characters';
    } else if (key === 'gymType' || key === 'tagline') {
      if (value && value.length > 50) errMsg = 'Max 20 characters';
    } else if (key === 'regards' || key === 'greetingText') {
      if (value && value.length > 35) errMsg = 'Max 35 characters';
    } else if (key === 'gymEmail' || key === 'gmail' || key === 'mailId') {
      if (!value?.trim()) errMsg = 'Email is required';
      else if (!emailRegex.test(value)) errMsg = 'Enter a valid email address';
    } else if (key === 'gymContact' || key === 'mobileNo' || key === 'whatsappNumber' || key === 'phoneNumber' || key === 'helpContact') {
      if (!value?.trim()) {
        if (['gymContact', 'mobileNo'].includes(key)) errMsg = 'Contact number is required';
      } else if (!phoneRegex.test(value)) {
        errMsg = 'Enter a valid 10-digit Indian mobile number';
      }
    } else if (key === 'address' || key === 'addressOnBill') {
      if (!value?.trim()) {
        if (key === 'address') errMsg = 'Address is required';
      } else if (value.length > 100) {
        errMsg = 'Max 100 characters';
      }
    } else if (key === 'city' || key === 'state') {
      if (!value?.trim()) errMsg = `${key === 'city' ? 'City' : 'State'} is required`;
      else if (value.length > 25) errMsg = 'Max 25 characters';
    } else if (key === 'pincode') {
      if (!value?.trim()) errMsg = 'Pincode is required';
      else if (!/^\d{6}$/.test(value)) errMsg = 'Pincode must be exactly 6 digits';
    } else if (key === 'billingIdPrefix') {
      if (!value?.trim()) errMsg = 'Prefix is required';
    }

    // Map keys to errors object keys
    const errMap = {
      gymName: 'gymName',
      gymType: 'gymType',
      tagline: 'tagline',

      gymEmail: 'gymEmail',
      gymContact: 'gymContact',
      address: 'address',
      city: 'city',
      state: 'state',
      pincode: 'pincode',
      name: 'ownerName',
      mobileNo: 'ownerMobile',
      mailId: 'ownerEmail',
      whatsappNumber: 'whatsapp',
      phoneNumber: 'smsPhone',
      gmail: 'reminderEmail',
      billingIdPrefix: 'billPrefix',
      helpContact: 'billHelp',
      regards: 'billRegards',
      greetingText: 'billGreeting',
      addressOnBill: 'billAddress'
    };

    const errKey = errMap[key];
    if (errKey) {
      setErrors(prev => {
        const newErr = { ...prev };
        if (errMsg) newErr[errKey] = errMsg;
        else delete newErr[errKey];
        return newErr;
      });
    }
  };

  const setSectionValue = (section, key, value, subkey = null) => {
    setFormState(curr => {
      if (subkey) {
        return {
          ...curr,
          [section]: {
            ...curr[section],
            [key]: {
              ...curr[section][key],
              [subkey]: value
            }
          }
        };
      } else {
        return {
          ...curr,
          [section]: {
            ...curr[section],
            [key]: value
          }
        };
      }
    });

    const valKey = subkey || key;
    validateSingleField(valKey, value);
  };

  const cancelEditing = () => {
    setFormState(buildFormState(profile));
    setIsEditing(false);
    setErrors({});
  };

  const validateAll = () => {
    const newErrors = {};
    const gym = formState.gym;
    const owner = formState.owner;

    // Gym validations
    if (!gym.gymName?.trim()) newErrors.gymName = 'Gym name is required';
    else if (gym.gymName.length > 35) newErrors.gymName = 'Max 35 characters';

    if (gym.gymType?.length > 50) newErrors.gymType = 'Max 50 characters';
    if (gym.tagline?.length > 30) newErrors.tagline = 'Max 30 characters';

    if (!gym.operatingDays || gym.operatingDays.length === 0) {
      newErrors.operatingDays = 'Please select at least one operating day';
    }

    if (!gym.operatingOpenHour || !gym.operatingCloseHour) {
      newErrors.operatingHours = 'Operating hours are required';
    }

    if (!gym.gymEmail?.trim()) newErrors.gymEmail = 'Email is required';
    else if (!emailRegex.test(gym.gymEmail)) newErrors.gymEmail = 'Email address must end with @gmail.com';

    if (!gym.gymContact?.trim()) newErrors.gymContact = 'Contact is required';
    else if (!phoneRegex.test(gym.gymContact)) newErrors.gymContact = 'Enter a valid 10-digit Indian mobile number';

    if (!gym.address?.trim()) newErrors.address = 'Address is required';
    else if (gym.address.length > 100) newErrors.address = 'Max 100 characters';

    if (!gym.city?.trim()) newErrors.city = 'City is required';

    if (!gym.state?.trim()) newErrors.state = 'State is required';

    if (!gym.pincode?.trim()) newErrors.pincode = 'Pincode is required';
    else if (!/^\d{6}$/.test(gym.pincode)) newErrors.pincode = 'Pincode must be exactly 6 digits';

    // Owner validations
    if (!owner.name?.trim()) newErrors.ownerName = 'Owner name is required';
    else if (owner.name.length > 35) newErrors.ownerName = 'Max 35 characters';
    else if (!/^[a-zA-Z\s]+$/.test(owner.name)) newErrors.ownerName = 'Only letters and spaces are allowed';

    if (!owner.mobileNo?.trim()) newErrors.ownerMobile = 'Mobile number is required';
    else if (!phoneRegex.test(owner.mobileNo)) newErrors.ownerMobile = 'Enter a valid 10-digit Indian mobile number';

    if (!owner.mailId?.trim()) newErrors.ownerEmail = 'Email is required';
    else if (!emailRegex.test(owner.mailId)) newErrors.ownerEmail = 'Email address must end with @gmail.com';

    // Reminder validations
    const rs = gym.reminderSettings || {};
    if (rs.whatsappNumber && !phoneRegex.test(rs.whatsappNumber)) newErrors.whatsapp = 'Enter a valid 10-digit Indian mobile number';
    if (rs.phoneNumber && !phoneRegex.test(rs.phoneNumber)) newErrors.smsPhone = 'Enter a valid 10-digit Indian mobile number';
    if (rs.gmail && !emailRegex.test(rs.gmail)) newErrors.reminderEmail = 'Email address must end with @gmail.com';

    // Billing validations
    const bi = gym.billingInfo || {};
    if (!bi.billingIdPrefix?.trim()) newErrors.billPrefix = 'Prefix is required';
    if (bi.helpContact && !phoneRegex.test(bi.helpContact)) newErrors.billHelp = 'Enter a valid 10-digit Indian mobile number';
    if (bi.regards?.length > 35) newErrors.billRegards = 'Max 35 characters';
    if (bi.greetingText?.length > 35) newErrors.billGreeting = 'Max 35 characters';
    if (bi.addressOnBill?.length > 35) newErrors.billAddress = 'Max 35 characters';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveAllProfile = async () => {
    if (!validateAll()) {
      toast.error('Please fix the errors before saving');
      return;
    }

    setIsSaving(true);
    try {
      const openStr = buildTimeStr(
        formState.gym.operatingOpenHour,
        formState.gym.operatingOpenMinute,
        formState.gym.operatingOpenAmpm
      );
      const closeStr = buildTimeStr(
        formState.gym.operatingCloseHour,
        formState.gym.operatingCloseMinute,
        formState.gym.operatingCloseAmpm
      );

      const payload = {
        gymData: {
          gymName: formState.gym.gymName,
          gst: formState.gym.gst,
          tagline: formState.gym.tagline,
          address: formState.gym.address,
          city: formState.gym.city,
          state: formState.gym.state,
          pincode: formState.gym.pincode,

          gymEmail: formState.gym.gymEmail,
          gymContact: formState.gym.gymContact,
          gymType: formState.gym.gymType,
          gymLogo: formState.gym.gymLogo,
          socialMediaLinks: [
            { platform: 'instagram', url: formState.gym.instagramUrl },
            { platform: 'facebook', url: formState.gym.facebookUrl },
            { platform: 'website', url: formState.gym.websiteUrl }
          ].filter(i => i.url),
          operatingDays: formState.gym.operatingDays || [],
          operatingHours: { open: openStr, close: closeStr },
          reminderSettings: {
            whatsappNumber: formState.gym.reminderSettings?.whatsappNumber,
            phoneNumber: formState.gym.reminderSettings?.phoneNumber,
            gmail: formState.gym.reminderSettings?.gmail
          },
          billingInfo: { ...formState.gym.billingInfo }
        },
        ownerData: {
          name: formState.owner.name,
          mobileNo: formState.owner.mobileNo,
          mailId: formState.owner.mailId
        }
      };

      const res = await api.put('/gym/profile', payload);
      const data = res.data.data;
      const updatedProfile = { gym: data.gym || profile.gym, owner: data.owner || profile.owner };

      setProfile(updatedProfile);
      setFormState(buildFormState(updatedProfile));
      setIsEditing(false);
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
      setIsSaving(false);
    }
  };

  if (loading || !formState) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 pt-10 space-y-8">
      <div className="flex flex-row items-center justify-between gap-4 border-b border-border pb-6 w-full">
        <div className="flex flex-row items-center gap-3 sm:gap-4 min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-divider rounded-lg transition-colors shrink-0"
            >
              <ChevronLeft size={20} />
            </button>
          </div>
          <div className="flex items-center gap-3 sm:gap-5 min-w-0 flex-1">
            {/* Logo Preview */}
            <div
              onClick={isReadOnly ? undefined : handleLogoClick}
              className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border border-border shadow-md bg-surface-secondary flex items-center justify-center shrink-0 ${isReadOnly ? 'cursor-default' : 'cursor-pointer group'}`}
              title={isReadOnly ? undefined : "Click to change logo"}
            >
              {formState.gym.gymLogo || formState.gym.billingInfo?.logo ? (
                <img
                  src={
                    (formState.gym.gymLogo || formState.gym.billingInfo?.logo).startsWith('http')
                      ? (formState.gym.gymLogo || formState.gym.billingInfo?.logo)
                      : `${(import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace('/api', '')}${formState.gym.gymLogo || formState.gym.billingInfo?.logo}`
                  }
                  alt="Gym Logo"
                  className={`w-full h-full object-cover ${isReadOnly ? '' : 'transition-transform duration-200 group-hover:scale-105'}`}
                />
              ) : (
                <div className={`w-full h-full bg-primary/10 flex items-center justify-center text-primary font-black text-xl sm:text-2xl ${isReadOnly ? '' : 'transition-transform duration-200 group-hover:scale-105'}`}>
                  {formState.gym.gymName?.charAt(0).toUpperCase() || 'G'}
                </div>
              )}

              {/* Instagram-style Hover Overlay */}
              {!isReadOnly && (
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center text-text-primary gap-1 select-none">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-primary text-center px-1">
                    Change Photo
                  </span>
                </div>
              )}
            </div>

            {/* Hidden Input for profile picture changes */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleLogoChange}
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
            />
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-3xl md:text-4xl font-extrabold text-text-primary tracking-tight truncate">{formState.gym.gymName || 'Gym Settings'}</h1>
              <p className="text-text-secondary mt-1 text-xs sm:text-sm md:text-base leading-relaxed truncate">{formState.gym.gymEmail || 'Manage settings'}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2 shrink-0 self-center">
          {!isReadOnly && (
            isEditing ? (
              <>
                <Button type="button" variant="secondary" onClick={cancelEditing} disabled={isSaving} className="px-3 py-1.5 text-xs sm:text-sm sm:px-4 sm:py-2">Cancel</Button>
                <Button type="button" onClick={saveAllProfile} isLoading={isSaving} className="px-3 py-1.5 text-xs sm:text-sm sm:px-4 sm:py-2">Save</Button>
              </>
            ) : (
              <Button type="button" onClick={() => setIsEditing(true)} className="px-3 py-1.5 text-xs sm:text-sm sm:px-4 sm:py-2">Edit Profile</Button>
            )
          )}
        </div>
      </div>

      {/* ── Section: Gym establishment ── */}
      <ProfileSection title="Establishment Details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field label="Gym ID" value={formState.gym.gymId} disabled />
          <Field label="Gym Name *" value={formState.gym.gymName} disabled={!isEditing} maxLength={35} error={errors.gymName} onChange={e => setSectionValue('gym', 'gymName', e.target.value)} />
          <Field label="Gym Type" value={formState.gym.gymType} disabled={!isEditing} maxLength={50} error={errors.gymType} onChange={e => setSectionValue('gym', 'gymType', e.target.value)} />

          <Field label="Tagline" value={formState.gym.tagline} disabled={!isEditing} maxLength={30} error={errors.tagline} onChange={e => setSectionValue('gym', 'tagline', e.target.value)} />
          <Field label="Gym Email *" value={formState.gym.gymEmail} type="email" disabled={!isEditing} error={errors.gymEmail} onChange={e => setSectionValue('gym', 'gymEmail', e.target.value)} />
          <Field label="Gym Contact *" value={formState.gym.gymContact} type="tel" disabled={!isEditing} error={errors.gymContact} maxLength={10} onInput={e => e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10)} onChange={e => setSectionValue('gym', 'gymContact', e.target.value)} />
          <Field label="GST Number" value={formState.gym.gst} disabled={!isEditing} maxLength={15} onChange={e => setSectionValue('gym', 'gst', e.target.value)} />

          {/* Operating Days */}
          <div className="md:col-span-2">
            <span className="text-xs uppercase tracking-wider text-text-muted font-medium block mb-2">Operating Days *</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                const isChecked = (formState.gym.operatingDays || []).includes(day);
                return (
                  <label
                    key={day}
                    className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2.5 border select-none transition-all duration-200 ${!isEditing
                        ? isChecked
                          ? 'opacity-90 cursor-not-allowed bg-primary/10 border-primary/30 text-primary font-semibold'
                          : 'opacity-50 cursor-not-allowed bg-surface-divider/50 border-border/50 text-text-muted'
                        : isChecked
                          ? 'cursor-pointer bg-primary/15 border-primary/50 text-primary font-bold shadow-sm'
                          : 'cursor-pointer bg-surface-card border-border text-text-secondary hover:border-primary/40 hover:text-text-primary'
                      }`}
                  >
                    <input
                      type="checkbox"
                      disabled={!isEditing}
                      checked={isChecked}
                      onChange={(e) => {
                        let days = [...(formState.gym.operatingDays || [])];
                        if (e.target.checked) {
                          days.push(day);
                        } else {
                          days = days.filter(d => d !== day);
                        }
                        const sortedDays = sortOperatingDays(days);
                        setFormState(c => ({
                          ...c,
                          gym: {
                            ...c.gym,
                            operatingDays: sortedDays,
                            operatingDaysText: sortedDays.join(', ')
                          }
                        }));
                      }}
                      className="w-3.5 h-3.5 rounded border-border bg-surface-card text-primary focus:ring-primary/50 accent-primary cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span>{day}</span>
                  </label>
                );
              })}
            </div>
            {errors.operatingDays && <p className="text-red-500 text-xs mt-1 italic">{errors.operatingDays}</p>}
          </div>

          <Field label="Instagram URL" value={formState.gym.instagramUrl} disabled={!isEditing} onChange={e => setSectionValue('gym', 'instagramUrl', e.target.value)} />
          <Field label="Facebook URL" value={formState.gym.facebookUrl} disabled={!isEditing} onChange={e => setSectionValue('gym', 'facebookUrl', e.target.value)} />
          <Field label="Website URL" value={formState.gym.websiteUrl} disabled={!isEditing} onChange={e => setSectionValue('gym', 'websiteUrl', e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <TimeField
              label="Open Time *"
              hour={formState.gym.operatingOpenHour}
              minute={formState.gym.operatingOpenMinute}
              ampm={formState.gym.operatingOpenAmpm}
              disabled={!isEditing}
              onHourChange={e => setSectionValue('gym', 'operatingOpenHour', e.target.value)}
              onMinuteChange={e => setSectionValue('gym', 'operatingOpenMinute', e.target.value)}
              onAmpmChange={e => setSectionValue('gym', 'operatingOpenAmpm', e.target.value)}
            />
            <TimeField
              label="Close Time *"
              hour={formState.gym.operatingCloseHour}
              minute={formState.gym.operatingCloseMinute}
              ampm={formState.gym.operatingCloseAmpm}
              disabled={!isEditing}
              onHourChange={e => setSectionValue('gym', 'operatingCloseHour', e.target.value)}
              onMinuteChange={e => setSectionValue('gym', 'operatingCloseMinute', e.target.value)}
              onAmpmChange={e => setSectionValue('gym', 'operatingCloseAmpm', e.target.value)}
            />
          </div>
          {errors.operatingHours && <p className="text-red-500 text-xs mt-1 italic md:col-span-2">{errors.operatingHours}</p>}
          <div className="md:col-span-2">
            <Field label="Establishment Address *" value={formState.gym.address} textarea disabled={!isEditing} maxLength={100} error={errors.address} onChange={e => setSectionValue('gym', 'address', e.target.value)} />
          </div>
          {isEditing ? (
            <div className="space-y-1 block group">
              <span className="text-xs uppercase tracking-wider text-text-muted font-medium block">State *</span>
              <SearchableSelect
                value={formState.gym.state || ''}
                onChange={(newState) => {
                  const cities = getCitiesForState(newState);
                  const currentCity = formState.gym.city;
                  const newCity = cities.includes(currentCity) ? currentCity : (cities[0] || '');
                  setFormState(c => ({
                    ...c,
                    gym: {
                      ...c.gym,
                      state: newState,
                      city: newCity
                    }
                  }));
                }}
                options={STATES_LIST}
                placeholder="Select State"
                error={errors.state}
              />
              {errors.state && <p className="text-red-500 text-[11px] mt-1 italic">{errors.state}</p>}
            </div>
          ) : (
            <Field label="State *" value={formState.gym.state} disabled />
          )}

          {isEditing ? (
            <div className="space-y-1 block group">
              <span className="text-xs uppercase tracking-wider text-text-muted font-medium block">City *</span>
              <SearchableSelect
                value={formState.gym.city || ''}
                onChange={(newCity) => setSectionValue('gym', 'city', newCity)}
                options={getCitiesForState(formState.gym.state)}
                placeholder={formState.gym.state ? "Select City" : "Select State First"}
                error={errors.city}
              />
              {errors.city && <p className="text-red-500 text-[11px] mt-1 italic">{errors.city}</p>}
            </div>
          ) : (
            <Field label="City *" value={formState.gym.city} disabled />
          )}
          <Field label="Pincode *" value={formState.gym.pincode} disabled={!isEditing} maxLength={6} error={errors.pincode} onInput={e => e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6)} onChange={e => setSectionValue('gym', 'pincode', e.target.value)} />
        </div>
      </ProfileSection>

      {/* ── Section: Ownership ── */}
      <ProfileSection title="Ownership Details">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Field label="Owner Full Name *" value={formState.owner?.name} disabled={!isEditing} maxLength={35} error={errors.ownerName} onInput={e => e.target.value = e.target.value.replace(/[^a-zA-Z\s]/g, '')} onChange={e => setSectionValue('owner', 'name', e.target.value)} />
          <Field label="Mobile Number *" value={formState.owner?.mobileNo} type="tel" disabled={!isEditing} error={errors.ownerMobile} maxLength={10} onInput={e => e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10)} onChange={e => setSectionValue('owner', 'mobileNo', e.target.value)} />
          <Field label="Email Address *" value={formState.owner?.mailId} type="email" disabled={!isEditing} error={errors.ownerEmail} onChange={e => setSectionValue('owner', 'mailId', e.target.value)} />
        </div>
      </ProfileSection>



      {/* ── Section: Billing ── */}
      <ProfileSection title="Invoicing & Billing">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field label="Billing ID Prefix *" value={formState.gym.billingInfo?.billingIdPrefix} disabled={!isEditing} maxLength={5} error={errors.billPrefix} onChange={e => setSectionValue('gym', 'billingInfo', e.target.value, 'billingIdPrefix')} />
          <Field label="Helpdesk Contact" value={formState.gym.billingInfo?.helpContact} type="tel" disabled={!isEditing} error={errors.billHelp} maxLength={10} onInput={e => e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10)} onChange={e => setSectionValue('gym', 'billingInfo', e.target.value, 'helpContact')} />
          <div className="md:col-span-2">
            <Field label="Address On Invoice" value={formState.gym.billingInfo?.addressOnBill} textarea disabled={!isEditing} maxLength={35} error={errors.billAddress} onChange={e => setSectionValue('gym', 'billingInfo', e.target.value, 'addressOnBill')} />
          </div>
          <Field label="Regards Name" value={formState.gym.billingInfo?.regards} disabled={!isEditing} maxLength={35} error={errors.billRegards} onChange={e => setSectionValue('gym', 'billingInfo', e.target.value, 'regards')} />
        </div>
      </ProfileSection>
    </div>
  );
};

export default Profile;
