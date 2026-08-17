import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { toast } from 'react-toastify';
import { useNavigate, Link } from 'react-router-dom';
import Button from '../components/Button';
import PasswordInput from '../components/PasswordInput';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '../hooks/useAuth';
import {
  Building2,
  User,
  CreditCard,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Lock,
  Mail,
  Phone,
  Calendar,
  Clock,
  UploadCloud,
  X,
  Link as LinkIcon
} from 'lucide-react';

import { STATES_LIST, getCitiesForState } from '../utils/indianStatesCities';

const phoneError = 'Enter a valid 10-digit Indian mobile number';
const phoneRegex = /^[6-9]\d{9}$/;
const passwordError = 'Password must be at least 8 characters with 1 uppercase, 1 number, and 1 special character';
const gmailError = 'Email address must end with @gmail.com';
const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;
const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const handlePhoneInput = (e) => {
  let val = e.target.value.replace(/\D/g, '');
  e.target.value = val.slice(0, 10);
};

// TimeInput: stores time as "H:MM AM" / "H:MM PM" directly — no 24h conversion
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = ['00', '15', '30', '45'];

const CustomSelect = ({ options = [], value, onChange, placeholder = 'Select', className = '', buttonClassName = '', showSearch = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = React.useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
    }
  }, [isOpen]);

  const filteredOptions = showSearch
    ? options.filter((opt) => String(opt).toLowerCase().startsWith(search.toLowerCase()))
    : options;

  return (
    <div ref={containerRef} className={`relative flex-1 flex ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-transparent text-text-primary text-sm focus:outline-none cursor-pointer text-center py-2 select-none flex items-center justify-between px-3 gap-1 hover:bg-slate-800/40 transition-colors ${buttonClassName}`}
      >
        <span className={value ? 'text-text-primary font-medium truncate' : 'text-text-secondary font-normal truncate'}>
          {value || placeholder}
        </span>
        <ChevronDown size={14} className={`text-text-secondary transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-primary' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-slate-950 border border-slate-800 rounded-lg shadow-2xl z-50 max-h-56 flex flex-col overflow-hidden py-1 animate-in fade-in slide-in-from-top-1 duration-100">
          {showSearch && (
            <div className="px-2 py-1.5 border-b border-slate-800 shrink-0">
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:border-primary/50"
                autoFocus
              />
            </div>
          )}
          <div className="overflow-y-auto flex-1 max-h-40">
            {filteredOptions.length === 0 ? (
              <p className="text-center py-2 text-xs text-text-secondary">No options found</p>
            ) : (
              filteredOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs font-medium transition-colors hover:bg-primary/10 hover:text-primary ${value === opt ? 'bg-primary/15 text-primary font-bold' : 'text-white'
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

const TimeInput = ({ fieldHour, fieldMinute, fieldAmpm, register, setValue, watch }) => {
  const hourVal = watch(fieldHour) || '6';
  const minuteVal = watch(fieldMinute) || '00';
  const ampmVal = watch(fieldAmpm) || 'AM';

  useEffect(() => {
    register(fieldHour);
    register(fieldMinute);
    register(fieldAmpm);
  }, [register, fieldHour, fieldMinute, fieldAmpm]);

  return (
    <div className="flex items-stretch bg-surface-card border border-border rounded-input overflow-visible hover:border-border/80 focus-within:ring-2 focus-within:ring-offset-0 focus-within:ring-[var(--focus-ring)] focus-within:border-[var(--focus-ring)] transition-all duration-200">
      <CustomSelect
        options={HOURS}
        value={hourVal}
        onChange={val => setValue(fieldHour, val, { shouldValidate: true, shouldDirty: true })}
        className="border-r border-border"
        buttonClassName="rounded-l-input justify-center"
      />
      <span className="text-text-muted font-bold select-none flex items-center px-0.5">:</span>
      <CustomSelect
        options={MINUTES}
        value={minuteVal}
        onChange={val => setValue(fieldMinute, val, { shouldValidate: true, shouldDirty: true })}
        className="border-r border-border"
        buttonClassName="justify-center"
      />
      <CustomSelect
        options={['AM', 'PM']}
        value={ampmVal}
        onChange={val => setValue(fieldAmpm, val, { shouldValidate: true, shouldDirty: true })}
        buttonClassName="bg-primary/15 text-primary font-bold hover:bg-primary/25 rounded-r-input w-14 justify-center"
      />
    </div>
  );
};

const optionalUrl = yup.string().trim().test(
  'optional-url',
  'Please enter a valid URL',
  (value) => !value || /^https?:\/\/.+/i.test(value)
);

const schema = yup.object({
  gymName: yup.string().trim().required('Gym name is required').max(35, 'Max 35 chars'),
  gymEmail: yup.string().trim().email('Please enter a valid email address').matches(gmailRegex, gmailError).max(50, 'Email cannot exceed 50 characters').required('Gym email is required'),
  gymContact: yup.string().matches(phoneRegex, phoneError).required(phoneError),
  address: yup.string().trim().required('Address is required').max(100, 'Max 100 chars'),
  state: yup.string().trim().required('State is required'),
  city: yup.string().trim().required('City is required'),
  pincode: yup.string().trim().matches(/^\d{6}$/, 'Pincode must be 6 digits').required('Pincode is required'),
  gst: yup.string().trim().nullable().max(15, 'Max 15 chars'),
  gymType: yup.string().trim().nullable().max(50, 'Max 50 chars'),
  tagline: yup.string().trim().nullable().max(30, 'Max 30 chars'),
  instagramUrl: optionalUrl,
  facebookUrl: optionalUrl,
  websiteUrl: optionalUrl,
  operatingDays: yup.array().of(yup.string()).min(1, 'Please select at least one operating day').required('Operating days are required'),
  operatingOpenHour: yup.string().required('Opening hour is required'),
  operatingOpenMinute: yup.string().required('Opening minute is required'),
  operatingOpenAmpm: yup.string().required('Opening AM/PM is required'),
  operatingCloseHour: yup.string().required('Closing hour is required'),
  operatingCloseMinute: yup.string().required('Closing minute is required'),
  operatingCloseAmpm: yup.string().required('Closing AM/PM is required'),
  password: yup.string().min(8, passwordError).max(30, 'Max 30 chars').matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=\[\]{};':"\\|,.<>/?]).+$/, passwordError).required(passwordError),
  confirmPassword: yup.string().max(30, 'Max 30 chars').oneOf([yup.ref('password')], 'Passwords do not match').required('Please confirm your password'),
  name: yup.string().trim().required('Owner name is required').matches(/^[a-zA-Z\s]+$/, 'Only letters and spaces are allowed').max(50, 'Max 50 chars'),
  mobileNo: yup.string().matches(phoneRegex, phoneError).required(phoneError),
  mailId: yup.string().trim().email('Please enter a valid email address').matches(gmailRegex, gmailError).max(50, 'Email cannot exceed 50 characters').required('Email is required'),
  whatsappNumber: yup.string().nullable(),
  gmail: yup.string().nullable(),
  billingIdPrefix: yup.string().trim().required('Billing prefix is required').max(5, 'Max 5 chars').matches(/^[A-Za-z0-9]+$/, 'Alphanumeric only'),
  helpContact: yup.string().matches(phoneRegex, phoneError).required(phoneError),
  addressOnBill: yup.string().trim().required('Billing address is required').max(35, 'Max 35 chars'),
  regards: yup.string().trim().required('Regards text is required').max(35, 'Max 35 chars'),
  greetingText: yup.string().trim().nullable().max(35, 'Max 35 chars'),
  logo: yup.mixed().nullable()
});

const stepRequiredFields = {
  1: ['gymName', 'gymEmail', 'gymContact', 'address', 'state', 'city', 'pincode', 'password', 'confirmPassword', 'operatingDays', 'operatingOpenHour', 'operatingOpenMinute', 'operatingOpenAmpm', 'operatingCloseHour', 'operatingCloseMinute', 'operatingCloseAmpm'],
  2: ['name', 'mobileNo', 'mailId'],
  3: ['billingIdPrefix', 'helpContact', 'addressOnBill', 'regards']
};

const stepAllFields = {
  1: ['gymName', 'gymEmail', 'gymContact', 'address', 'state', 'city', 'pincode', 'gst', 'gymType', 'tagline', 'instagramUrl', 'facebookUrl', 'websiteUrl', 'operatingDays', 'operatingOpenHour', 'operatingOpenMinute', 'operatingOpenAmpm', 'operatingCloseHour', 'operatingCloseMinute', 'operatingCloseAmpm', 'password', 'confirmPassword'],
  2: ['name', 'mobileNo', 'mailId'],
  3: ['billingIdPrefix', 'helpContact', 'addressOnBill', 'regards', 'logo']
};

const GymRegister = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [logoName, setLogoName] = useState('');
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoError, setLogoError] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPrefixHelp, setShowPrefixHelp] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (logoPreview) {
        URL.revokeObjectURL(logoPreview);
      }
    };
  }, [logoPreview]);

  const handleLogoFile = (file) => {
    if (!file) return;

    // Validate type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setLogoError('Invalid file type. Supports: JPG, JPEG, PNG, WEBP.');
      if (logoPreview) URL.revokeObjectURL(logoPreview);
      setLogoPreview(null);
      setLogoName('');
      setValue('logo', null, { shouldDirty: true });
      return;
    }

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setLogoError('File is too large. Limit is 5MB.');
      if (logoPreview) URL.revokeObjectURL(logoPreview);
      setLogoPreview(null);
      setLogoName('');
      setValue('logo', null, { shouldDirty: true });
      return;
    }

    setLogoError('');
    setLogoName(file.name);

    // Create preview
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    const previewUrl = URL.createObjectURL(file);
    setLogoPreview(previewUrl);

    // Update react-hook-form value
    setValue('logo', [file], { shouldDirty: true, shouldValidate: true });
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleLogoFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveLogo = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoName('');
    setLogoPreview(null);
    setLogoError('');
    setValue('logo', null, { shouldDirty: true, shouldValidate: true });
  };

  // Smart Sync toggles (Defaulting to true for frictionless "one-click" experience)
  const [syncWhatsapp, setSyncWhatsapp] = useState(true);
  const [syncEmail, setSyncEmail] = useState(true);
  const [syncAddress, setSyncAddress] = useState(true);
  const [syncHelpContact, setSyncHelpContact] = useState(true);
  const [syncOwnerMobile, setSyncOwnerMobile] = useState(true);

  const {
    register,
    trigger,
    handleSubmit,
    watch,
    setValue,
    setError,
    clearErrors,
    setFocus,
    formState: { errors, touchedFields, isSubmitted }
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      operatingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      operatingOpenHour: '6',
      operatingOpenMinute: '00',
      operatingOpenAmpm: 'AM',
      operatingCloseHour: '10',
      operatingCloseMinute: '00',
      operatingCloseAmpm: 'PM'
    },
    mode: 'onChange',
    reValidateMode: 'onChange'
  });

  const values = watch();

  // Dynamic Sync useEffect Listeners
  const gymContact = watch('gymContact');
  const gymEmail = watch('gymEmail');
  const address = watch('address');
  const gymName = watch('gymName');

  // WhatsApp Sync
  useEffect(() => {
    if (syncWhatsapp && gymContact) {
      setValue('whatsappNumber', gymContact, { shouldValidate: isSubmitted });
    }
  }, [gymContact, syncWhatsapp, setValue, isSubmitted]);

  // Owner Mobile Sync
  useEffect(() => {
    if (syncOwnerMobile && gymContact) {
      setValue('mobileNo', gymContact, { shouldValidate: isSubmitted });
    }
  }, [gymContact, syncOwnerMobile, setValue, isSubmitted]);


  // Email Sync
  useEffect(() => {
    if (syncEmail && gymEmail) {
      setValue('gmail', gymEmail, { shouldValidate: isSubmitted });
    }
  }, [gymEmail, syncEmail, setValue, isSubmitted]);

  // Invoice Address Sync
  useEffect(() => {
    if (syncAddress && address) {
      setValue('addressOnBill', address, { shouldValidate: isSubmitted });
    }
  }, [address, syncAddress, setValue, isSubmitted]);

  // Helpdesk Contact Sync
  useEffect(() => {
    if (syncHelpContact && gymContact) {
      setValue('helpContact', gymContact, { shouldValidate: isSubmitted });
    }
  }, [gymContact, syncHelpContact, setValue, isSubmitted]);

  // Regards Auto-Generation
  useEffect(() => {
    if (gymName) {
      if (!touchedFields.regards && !errors.regards) {
        setValue('regards', `Regards, Team ${gymName}`);
      }
    }
  }, [gymName, setValue, touchedFields.regards, errors.regards]);

  const showFieldError = (field) => Boolean(errors[field]);

  const fieldClassName = (field, extra = '') => {
    const isError = showFieldError(field);
    return `input-field ${extra} ${isError ? 'border-red-500/80 focus:ring-red-500/30' : ''}`.trim();
  };

  const isFieldFilled = (field) => {
    const value = values[field];
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return value !== undefined && value !== null && String(value).trim() !== '';
  };

  const checkDuplicate = (field, fieldValue) => {
    const value = (fieldValue || values[field] || '').trim();
    if (!value) return;
    if ((field === 'gymEmail' || field === 'mailId' || field === 'gmail') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return;
    if ((field === 'gymContact' || field === 'mobileNo' || field === 'whatsappNumber' || field === 'phoneNumber' || field === 'helpContact') && !/^\d{10}$/.test(value)) return;

    setTimeout(async () => {
      try {
        const isEmail = field === 'gymEmail' || field === 'mailId' || field === 'gmail';
        const payload = isEmail ? { email: value } : { phone: value };
        await api.post('/auth/check-exists', payload);
        clearErrors(field);
      } catch (err) {
        if (err.response?.status === 409) {
          const isEmail = field === 'gymEmail' || field === 'mailId' || field === 'gmail';
          setError(field, { type: 'manual', message: isEmail ? 'Email already exists' : 'Phone number already exists', shouldFocus: false });
        }
      }
    }, 60);
  };

  const handleNext = async () => {
    if (step === 1) {
      const emailVal = values.gymEmail?.trim();
      const phoneVal = values.gymContact?.trim();
      if (emailVal || phoneVal) {
        try {
          await api.post('/auth/check-exists', { email: emailVal, phone: phoneVal });
          clearErrors(['gymEmail', 'gymContact']);
        } catch (err) {
          if (err.response?.status === 409) {
            toast.error(err.response.data.message);
            if (err.response.data.message.toLowerCase().includes('email')) {
              setError('gymEmail', { type: 'manual', message: 'Email already exists' });
            } else {
              setError('gymContact', { type: 'manual', message: 'Phone number already exists' });
            }
            return;
          }
        }
      }
    }



    const isStepValid = await trigger(stepRequiredFields[step]);

    if (isStepValid) {
      setStep((currentStep) => currentStep + 1);
    } else {
      toast.error('Please fill all the mandatory fields before submitting.');
      setTimeout(() => {
        const firstErrorField = stepRequiredFields[step].find(field => document.querySelector(`[name="${field}"]`)?.classList.contains('border-red-500'));
        if (firstErrorField) {
          setFocus(firstErrorField);
          document.querySelector(`[name="${firstErrorField}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
    }
  };

  const handlePrev = () => setStep((currentStep) => currentStep - 1);

  const onSubmit = async (data) => {
    setLoading(true);

    try {
      const formData = new FormData();
      const socialMediaLinks = [
        { platform: 'instagram', url: data.instagramUrl?.trim() },
        { platform: 'facebook', url: data.facebookUrl?.trim() },
        { platform: 'website', url: data.websiteUrl?.trim() }
      ].filter((item) => item.url);

      const buildTime = (hour, minute, ampm) => {
        if (!hour) return '';
        return `${hour}:${minute || '00'} ${ampm || 'AM'}`;
      };

      const operatingHours = {
        open: buildTime(data.operatingOpenHour, data.operatingOpenMinute, data.operatingOpenAmpm),
        close: buildTime(data.operatingCloseHour, data.operatingCloseMinute, data.operatingCloseAmpm)
      };

      Object.entries({
        gymName: data.gymName,
        gymEmail: data.gymEmail,
        gymContact: data.gymContact,
        address: data.address,
        state: data.state,
        city: data.city,
        pincode: data.pincode,
        location: data.location,
        gst: data.gst || '',
        gymType: data.gymType || '',
        tagline: data.tagline || '',
        password: data.password,
        confirmPassword: data.confirmPassword,
        name: data.name,
        mobileNo: data.mobileNo,
        mailId: data.mailId,
        whatsappNumber: data.whatsappNumber,
        phoneNumber: '',
        gmail: data.gmail,
        billingIdPrefix: data.billingIdPrefix,
        helpContact: data.helpContact,
        addressOnBill: data.addressOnBill,
        regards: data.regards,
        greetingText: data.greetingText || '',
        socialMediaLinks: JSON.stringify(socialMediaLinks),
        operatingDays: JSON.stringify(data.operatingDays || []),
        operatingHours: JSON.stringify(operatingHours)
      }).forEach(([key, value]) => {
        formData.append(key, value);
      });

      if (data.logo?.[0]) {
        formData.append('logo', data.logo[0]);
      }

      const res = await api.post('/auth/gym/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const { gymId } = res.data.data;

      // Automatically authenticate the session
      login(res.data.data.token, 'owner');

      toast.success('Registration successful');
      navigate('/registration-success', { state: { gymId, email: data.mailId, phone: data.mobileNo } });
    } catch (error) {
      const apiError = error.response?.data;
      if (apiError?.errors && Array.isArray(apiError.errors) && apiError.errors.length > 0) {
        const errorMsgs = apiError.errors.map(err => {
          if (typeof err === 'string') return err;
          return err.message || err.msg || JSON.stringify(err);
        });
        toast.error(errorMsgs.join(' | '));
      } else {
        toast.error(apiError?.message || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl relative z-10 backdrop-blur-md bg-surface-card/90 border border-border shadow-2xl p-8 rounded-2xl">

      {/* Glow effect */}
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl -z-10"></div>
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl -z-10"></div>

      <div className="text-center mb-8">
        <h2 className="text-3xl font-extrabold text-text-primary tracking-tight mb-2">Gym Registration</h2>
        <p className="text-sm text-slate-400">Set up your premium SaaS gym workspace in three fast steps.</p>
      </div>

      {/* Modern Stepper */}
      <div className="mb-10 select-none">
        <div className="flex items-center justify-between relative">
          <div className="absolute top-1/2 left-0 w-full h-[2px] bg-slate-800 -translate-y-1/2 -z-10 rounded-full"></div>
          <div
            className="absolute top-1/2 left-0 h-[2px] bg-primary -translate-y-1/2 -z-10 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${step === 1 ? '0%' : step === 2 ? '50%' : '100%'}` }}
          ></div>

          {[
            { num: 1, label: 'Gym Info', icon: Building2 },
            { num: 2, label: 'Owner & Comm', icon: User },
            { num: 3, label: 'Billing & Brand', icon: CreditCard }
          ].map((s) => {
            const Icon = s.icon;
            const isCompleted = step > s.num;
            const isActive = step === s.num;

            return (
              <div key={s.num} className="flex flex-col items-center flex-1 relative">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-300 relative z-10
                      ${isCompleted
                      ? 'bg-emerald-500 border-emerald-500 text-text-primary shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                      : isActive
                        ? 'bg-primary border-primary text-text-primary shadow-[0_0_12px_rgba(255,189,7,0.4)] scale-110'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700/60'
                    }`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 stroke-[3px]" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <span
                  className={`mt-2 text-[11px] font-semibold tracking-wide transition-colors duration-300 text-center
                      ${isActive ? 'text-text-primary font-bold' : isCompleted ? 'text-emerald-400' : 'text-slate-400'}`}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* STEP 1: GYM INFORMATION */}
        {step === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-2 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="md:col-span-2 mb-2">
              <h3 className="text-lg font-bold text-text-primary mb-1">Gym Information</h3>
              <p className="text-xs text-slate-400">Tell us about your gym business.</p>
            </div>

            {/* Gym Name */}
            <div>
              <div className="flex items-center h-5 mb-1.5">
                <p className="text-xs text-text-secondary font-medium">Gym Name <span className="text-red-500">*</span></p>
              </div>
              <input {...register('gymName')} placeholder="E.g. Titan Fitness" className={fieldClassName('gymName')} maxLength="35" />
              <div className="min-h-[20px] mt-1">
                {showFieldError('gymName') && <p className="text-red-500 text-xs font-medium leading-tight">{errors.gymName.message}</p>}
              </div>
            </div>

            {/* Tagline */}
            <div>
              <div className="flex items-center h-5 mb-1.6">
                <p className="text-xs text-text-secondary font-medium">Tagline <span className="text-text-secondary font-normal">(Optional)</span></p>
              </div>
              <input {...register('tagline')} placeholder="E.g. Unleash the beast" className={fieldClassName('tagline')} maxLength="30" />
              <div className="min-h-[20px] mt-1">
                {showFieldError('tagline') && <p className="text-red-500 text-xs font-medium leading-tight">{errors.tagline.message}</p>}
              </div>
            </div>

            {/* Gym Email */}
            <div>
              <div className="flex items-center h-5 mb-1.5">
                <p className="text-xs text-text-secondary font-medium">Gym Email <span className="text-red-500">*</span></p>
              </div>
              <input {...register('gymEmail')} type="email" placeholder="E.g. contact@fitness.com" className={fieldClassName('gymEmail')} maxLength="50" onBlur={(e) => { checkDuplicate('gymEmail', e.target.value); }} />
              <div className="min-h-[20px] mt-1">
                {showFieldError('gymEmail') && <p className="text-red-500 text-xs font-medium leading-tight">{errors.gymEmail.message}</p>}
              </div>
            </div>

            {/* Contact Number */}
            <div>
              <div className="flex items-center h-5 mb-1.5">
                <p className="text-xs text-text-secondary font-medium">Contact Number <span className="text-red-500">*</span></p>
              </div>
              <input
                {...register('gymContact')}
                type="tel"
                placeholder="E.g. 9876543210"
                className={fieldClassName('gymContact')}
                onInput={handlePhoneInput}
                maxLength="10"
                onBlur={(e) => { checkDuplicate('gymContact', e.target.value); }}
              />
              <div className="min-h-[20px] mt-1">
                {showFieldError('gymContact') && <p className="text-red-500 text-xs font-medium leading-tight">{errors.gymContact.message}</p>}
              </div>
            </div>



            {/* GST Number */}
            <div>
              <div className="flex items-center h-5 mb-1.5">
                <p className="text-xs text-text-secondary font-medium">GST Number <span className="text-text-secondary font-normal">(Optional)</span></p>
              </div>
              <input {...register('gst')} placeholder="E.g. 22AAAAA0000A1Z5" className={fieldClassName('gst')} maxLength="15" />
              <div className="min-h-[20px] mt-1">
                {showFieldError('gst') && <p className="text-red-500 text-xs font-medium leading-tight">{errors.gst.message}</p>}
              </div>
            </div>

            {/* Gym Type */}
            <div>
              <div className="flex items-center h-5 mb-1.5">
                <p className="text-xs text-text-secondary font-medium">Gym Type <span className="text-text-secondary font-normal">(Optional)</span></p>
              </div>
              <input {...register('gymType')} placeholder="E.g. CrossFit Studio, Gym" className={fieldClassName('gymType')} maxLength="50" />
              <div className="min-h-[20px] mt-1">
                {showFieldError('gymType') && <p className="text-red-500 text-xs font-medium leading-tight">{errors.gymType.message}</p>}
              </div>
            </div>



            {/* Address - full width below both columns */}
            <div className="md:col-span-2">
              <div className="flex items-center h-5 mb-1.5">
                <p className="text-xs text-text-secondary font-medium">Address <span className="text-red-500">*</span></p>
              </div>
              <textarea
                {...register('address')}
                placeholder="E.g. Plot 15, Sector 4, HSR Layout"
                className={fieldClassName('address', 'h-20 resize-none')}
                maxLength="100"
              />
              <div className="min-h-[20px] mt-1">
                {showFieldError('address') && <p className="text-red-500 text-xs font-medium leading-tight">{errors.address.message}</p>}
              </div>
            </div>

            {/* State */}
            <div>
              <div className="flex items-center h-5 mb-1.5">
                <p className="text-xs text-text-secondary font-medium">State <span className="text-red-500">*</span></p>
              </div>
              <CustomSelect
                options={STATES_LIST}
                value={watch('state') || ''}
                onChange={(val) => {
                  setValue('state', val, { shouldValidate: true, shouldDirty: true });
                  const availableCities = getCitiesForState(val);
                  const currentCity = watch('city');
                  if (!availableCities.includes(currentCity)) {
                    setValue('city', availableCities[0] || '', { shouldValidate: true, shouldDirty: true });
                  }
                }}
                placeholder="Select State"
                buttonClassName={fieldClassName('state', 'text-left justify-between')}
                showSearch={true}
              />
              <div className="min-h-[20px] mt-1">
                {showFieldError('state') && <p className="text-red-500 text-xs font-medium leading-tight">{errors.state.message}</p>}
              </div>
            </div>

            {/* City */}
            <div>
              <div className="flex items-center h-5 mb-1.5">
                <p className="text-xs text-text-secondary font-medium">City <span className="text-red-500">*</span></p>
              </div>
              <CustomSelect
                options={getCitiesForState(watch('state'))}
                value={watch('city') || ''}
                onChange={(val) => setValue('city', val, { shouldValidate: true, shouldDirty: true })}
                placeholder={watch('state') ? "Select City" : "Select State First"}
                buttonClassName={fieldClassName('city', 'text-left justify-between')}
                showSearch={true}
              />
              <div className="min-h-[20px] mt-1">
                {showFieldError('city') && <p className="text-red-500 text-xs font-medium leading-tight">{errors.city.message}</p>}
              </div>
            </div>

            {/* Pincode */}
            <div >
              <div className="flex items-center h-5 mb-1.5">
                <p className="text-xs text-text-secondary font-medium">Pincode <span className="text-red-500">*</span></p>
              </div>
              <input {...register('pincode')} placeholder="E.g. 560102" className={fieldClassName('pincode')} maxLength="6" onInput={(e) => { let val = e.target.value.replace(/\D/g, ''); e.target.value = val.slice(0, 6); }} />
              <div className="min-h-[20px] mt-1">
                {showFieldError('pincode') && <p className="text-red-500 text-xs font-medium leading-tight">{errors.pincode.message}</p>}
              </div>
            </div>

            {/* Password */}
            <div className="md:col-start-1">
              <div className="flex items-center h-5 mb-1.5">
                <p className="text-xs text-text-secondary font-medium flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-500" />
                  <span>Password <span className="text-red-500">*</span></span>
                </p>
              </div>
              <PasswordInput {...register('password')} placeholder="Min 8 characters" className={fieldClassName('password')} maxLength="30" />
              <div className="min-h-[20px] mt-1">
                {showFieldError('password') && <p className="text-red-500 text-xs font-medium leading-tight">{errors.password.message}</p>}
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <div className="flex items-center h-5 mb-1.5">
                <p className="text-xs text-text-secondary font-medium flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-500" />
                  <span>Confirm Password <span className="text-red-500">*</span></span>
                </p>
              </div>
              <PasswordInput {...register('confirmPassword')} placeholder="Retype password" className={fieldClassName('confirmPassword')} maxLength="30" />
              <div className="min-h-[20px] mt-1">
                {showFieldError('confirmPassword') && <p className="text-red-500 text-xs font-medium leading-tight">{errors.confirmPassword.message}</p>}
              </div>
            </div>



            {/* Operating Days Section */}
            <div className="md:col-span-2">
              <p className="text-xs text-text-secondary mb-2.5 font-medium flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span>Operating Days <span className="text-red-500">*</span></span>
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {weekDays.map((day) => (
                  <label
                    key={day}
                    className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 cursor-pointer border select-none transition-all duration-200
                        ${watch('operatingDays')?.includes(day)
                        ? 'bg-primary/10 border-primary/40 text-primary font-medium'
                        : 'bg-slate-900/40 border-slate-800/80 text-text-secondary hover:border-slate-700/60 hover:bg-slate-850'
                      }`}
                  >
                    <input
                      type="checkbox"
                      value={day}
                      {...register('operatingDays')}
                      className="w-3.5 h-3.5 rounded border-slate-800 bg-slate-950 text-primary focus:ring-primary/50 accent-primary"
                    />
                    <span>{day}</span>
                  </label>
                ))}
              </div>
              <div className="min-h-[20px] mt-1">
                {showFieldError('operatingDays') && <p className="text-red-500 text-xs font-medium leading-tight">{errors.operatingDays.message}</p>}
              </div>
            </div>

            {/* Operating Hours */}
            <div className="md:col-span-2">
              <p className="text-xs text-text-secondary mb-1.5 font-medium flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>Operating Hours <span className="text-red-500">*</span></span>
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-text-secondary block mb-0.5">Opening</span>
                  <TimeInput
                    fieldHour="operatingOpenHour"
                    fieldMinute="operatingOpenMinute"
                    fieldAmpm="operatingOpenAmpm"
                    register={register}
                    setValue={setValue}
                    watch={watch}
                  />
                </div>
                <div>
                  <span className="text-[10px] text-text-secondary block mb-0.5">Closing</span>
                  <TimeInput
                    fieldHour="operatingCloseHour"
                    fieldMinute="operatingCloseMinute"
                    fieldAmpm="operatingCloseAmpm"
                    register={register}
                    setValue={setValue}
                    watch={watch}
                  />
                </div>
              </div>
              <div className="min-h-[20px] mt-1">
                {(showFieldError('operatingOpenHour') || showFieldError('operatingCloseHour')) && (
                  <p className="text-red-500 text-xs font-medium leading-tight">Operating hours are required</p>
                )}
              </div>
            </div>

            {/* Collapsible Social Media Links */}
            <div className="md:col-span-2 border border-slate-800 rounded-xl overflow-hidden bg-slate-900/20 hover:border-slate-750 transition-colors">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between px-5 py-3 text-left font-semibold text-xs text-text-secondary hover:text-text-primary hover:bg-slate-900/40 transition-all select-none"
              >
                <div className="flex items-center gap-2">
                  <LinkIcon className="w-3.5 h-3.5 text-primary" />
                  <span>Social Media Links</span>
                </div>
                {showAdvanced ? <ChevronUp className="w-4 h-4 text-text-secondary" /> : <ChevronDown className="w-4 h-4 text-text-secondary" />}
              </button>

              {showAdvanced && (
                <div className="p-5 border-t border-slate-800/60 bg-slate-950/20 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                  <div>
                    <p className="text-xs text-text-secondary mb-1">Website URL <span className="text-[10px] text-text-secondary">(Optional)</span></p>
                    <input {...register('websiteUrl')} placeholder="E.g. https://yoursite.com" className={fieldClassName('websiteUrl')} />
                    <div className="min-h-[20px] mt-1">
                      {showFieldError('websiteUrl') && <p className="text-red-500 text-xs font-medium leading-tight">{errors.websiteUrl.message}</p>}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-text-secondary mb-1">Instagram URL <span className="text-[10px] text-text-secondary">(Optional)</span></p>
                    <input {...register('instagramUrl')} placeholder="E.g. https://instagram.com/gym" className={fieldClassName('instagramUrl')} />
                    <div className="min-h-[20px] mt-1">
                      {showFieldError('instagramUrl') && <p className="text-red-500 text-xs font-medium leading-tight">{errors.instagramUrl.message}</p>}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-xs text-text-secondary mb-1">Facebook URL <span className="text-[10px] text-text-secondary">(Optional)</span></p>
                    <input {...register('facebookUrl')} placeholder="E.g. https://facebook.com/gym" className={fieldClassName('facebookUrl')} />
                    <div className="min-h-[20px] mt-1">
                      {showFieldError('facebookUrl') && <p className="text-red-500 text-xs font-medium leading-tight">{errors.facebookUrl.message}</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: OWNER DETAILS */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <h3 className="text-lg font-bold text-text-primary mb-1">Owner Details</h3>
              <p className="text-xs text-slate-400">Manage owner credentials.</p>
            </div>

            {/* OWNER DETAILS FIELDS */}
            <div className="border border-slate-800/80 rounded-2xl p-5 bg-slate-900/10 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-2">
                <div>
                  <p className="text-xs text-text-secondary mb-1.5 font-medium">Owner Full Name <span className="text-red-500">*</span></p>
                  <input {...register('name')} placeholder="E.g. Alexander Walker" className={fieldClassName('name')} maxLength="35" onInput={(e) => { e.target.value = e.target.value.replace(/[^a-zA-Z\s]/g, ''); }} />
                  <div className="min-h-[20px] mt-1">
                    {showFieldError('name') && <p className="text-red-500 text-xs font-medium leading-tight">{errors.name.message}</p>}
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1.5 select-none">
                    <span className="text-xs text-text-secondary font-medium">Personal Mobile Number <span className="text-red-500">*</span></span>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={syncOwnerMobile}
                        onChange={(e) => setSyncOwnerMobile(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-slate-800 bg-slate-950 text-primary focus:ring-primary/50 accent-primary"
                      />
                      <span className="text-[10px] text-primary font-bold hover:text-primary-hover transition-colors uppercase tracking-wider">
                        [ Same as Gym ]
                      </span>
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      {...register('mobileNo')}
                      type="tel"
                      placeholder="10-digit mobile number"
                      className={fieldClassName('mobileNo', syncOwnerMobile ? 'bg-slate-900/30 border-primary/20 text-text-secondary cursor-not-allowed pr-24' : '')}
                      onInput={handlePhoneInput}
                      maxLength="10"
                      readOnly={syncOwnerMobile}
                    />
                    {syncOwnerMobile && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-primary/10 border border-primary/20 text-primary text-[9px] font-extrabold px-2 py-0.5 rounded-full select-none tracking-widest">
                        <Check className="w-2.5 h-2.5 stroke-[3px]" />
                        SYNCED
                      </div>
                    )}
                  </div>
                  {syncOwnerMobile && <p className="text-[10px] text-text-secondary mt-1">Using Gym Contact Number</p>}
                  {showFieldError('mobileNo') && <p className="text-red-500 text-xs mt-1 font-medium">{errors.mobileNo.message}</p>}
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs text-text-secondary mb-1.5 font-medium">Personal Email <span className="text-red-500">*</span></p>
                  <input {...register('mailId')} type="email" placeholder="E.g. alex@gmail.com" className={fieldClassName('mailId')} maxLength="50" />
                  <div className="min-h-[20px] mt-1">
                    {showFieldError('mailId') && <p className="text-red-500 text-xs font-medium leading-tight">{errors.mailId.message}</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: BILLING & BRANDING */}
        {step === 3 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-2 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="md:col-span-2 mb-2">
              <h3 className="text-lg font-bold text-text-primary mb-1">Billing & Branding</h3>
              <p className="text-xs text-slate-400">Configure client invoice settings and customize branding details.</p>
            </div>

            {/* Billing ID */}
            <div>
              <div className="flex items-center h-5 mb-1.5">
                <p className="text-xs text-text-secondary font-medium">Billing ID <span className="text-red-500">*</span></p>
              </div>
              <input
                {...register('billingIdPrefix')}
                placeholder="E.g. INV"
                className={fieldClassName('billingIdPrefix', 'uppercase font-bold tracking-widest')}
                maxLength="5"
              />
              <div className="min-h-[20px] mt-1">
                {showFieldError('billingIdPrefix') ? (
                  <p className="text-red-500 text-xs font-medium leading-tight">{errors.billingIdPrefix.message}</p>
                ) : (
                  <p className="text-[10px] text-text-secondary leading-tight">Shorthand for invoice records (e.g. INV-0001).</p>
                )}
              </div>
            </div>

            {/* Helpdesk Contact */}
            <div>
              <div className="flex justify-between items-center h-5 mb-1.5 select-none">
                <span className="text-xs text-text-secondary font-medium">Helpdesk Contact <span className="text-red-500">*</span></span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncHelpContact}
                    onChange={(e) => setSyncHelpContact(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-800 bg-slate-950 text-primary focus:ring-primary/50 accent-primary"
                  />
                  <span className="text-[10px] text-primary font-bold hover:text-primary-hover transition-colors uppercase tracking-wider">
                    [ Use Gym Contact ]
                  </span>
                </label>
              </div>
              <div className="relative">
                <input
                  {...register('helpContact')}
                  type="tel"
                  placeholder="Support / Helpdesk number"
                  className={fieldClassName('helpContact', syncHelpContact ? 'bg-slate-900/30 border-primary/20 text-text-secondary cursor-not-allowed pr-24' : '')}
                  onInput={handlePhoneInput}
                  maxLength="10"
                  readOnly={syncHelpContact}
                />
                {syncHelpContact && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-primary/10 border border-primary/20 text-primary text-[9px] font-extrabold px-2 py-0.5 rounded-full select-none tracking-widest">
                    <Check className="w-2.5 h-2.5 stroke-[3px]" />
                    SYNCED
                  </div>
                )}
              </div>
              <div className="min-h-[20px] mt-1">
                {showFieldError('helpContact') && <p className="text-red-500 text-xs font-medium leading-tight">{errors.helpContact.message}</p>}
              </div>
            </div>

            {/* Address on Invoice */}
            <div>
              <div className="flex justify-between items-center h-5 mb-1.5 select-none">
                <span className="text-xs text-text-secondary font-medium">Address on Invoice <span className="text-red-500">*</span></span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncAddress}
                    onChange={(e) => setSyncAddress(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-800 bg-slate-950 text-primary focus:ring-primary/50 accent-primary"
                  />
                  <span className="text-[10px] text-primary font-bold hover:text-primary-hover transition-colors uppercase tracking-wider">
                    [ Same as Gym Address ]
                  </span>
                </label>
              </div>
              <div className="relative">
                <textarea
                  {...register('addressOnBill')}
                  placeholder="Billing address for invoices"
                  className={fieldClassName('addressOnBill', `h-20 resize-none ${syncAddress ? 'bg-slate-900/30 border-primary/20 text-text-secondary cursor-not-allowed pr-24' : ''}`)}
                  maxLength="35"
                  readOnly={syncAddress}
                />
                {syncAddress && (
                  <div className="absolute right-3 top-4 flex items-center gap-1 bg-primary/10 border border-primary/20 text-primary text-[9px] font-extrabold px-2 py-0.5 rounded-full select-none tracking-widest">
                    <Check className="w-2.5 h-2.5 stroke-[3px]" />
                    SYNCED
                  </div>
                )}
              </div>
              <div className="min-h-[20px] mt-1">
                {showFieldError('addressOnBill') && <p className="text-red-500 text-xs font-medium leading-tight">{errors.addressOnBill.message}</p>}
              </div>
            </div>

            {/* Gym Logo */}
            <div>
              <div className="flex items-center h-5 mb-1.5">
                <p className="text-xs text-text-secondary font-medium">Gym Logo <span className="text-text-secondary font-normal">(Optional)</span></p>
              </div>
              {logoPreview ? (
                <div className="relative border border-slate-800 rounded-xl px-4 py-2 bg-slate-900/30 flex items-center gap-3 h-20 group animate-in fade-in duration-200">
                  <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-750 bg-black flex items-center justify-center shrink-0">
                    <img src={logoPreview} alt="Logo Preview" className="w-full h-full object-contain p-1" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-200 truncate">{logoName}</p>
                    <p className="text-[10px] text-text-secondary mt-0.5">Ready for upload</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg transition-colors cursor-pointer"
                    title="Remove logo"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`flex items-center justify-center gap-3 border border-dashed rounded-xl h-20 bg-slate-900/20 cursor-pointer hover:bg-slate-900/40 transition-all select-none ${isDragActive ? 'border-primary bg-primary/5' : 'border-slate-800 hover:border-primary/40'}`}
                >
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0] || null;
                      handleLogoFile(file);
                    }}
                  />
                  <UploadCloud className={`w-6 h-6 transition-transform ${isDragActive ? 'text-primary scale-110' : 'text-slate-500'}`} />
                  <div className="text-left">
                    <span className="text-xs font-semibold text-slate-300 block">
                      {isDragActive ? 'Drop image here' : 'Drag & drop logo, or browse'}
                    </span>
                    <p className="text-[10px] text-text-secondary mt-0.5">Supports PNG, JPG, JPEG, WEBP up to 5MB</p>
                  </div>
                </label>
              )}
              <div className="min-h-[20px] mt-1">
                {logoError && <p className="text-red-500 text-xs font-medium leading-tight">{logoError}</p>}
              </div>
            </div>

            {/* Regards Text */}
            <div>
              <div className="flex items-center h-5 mb-1.5">
                <p className="text-xs text-text-secondary font-medium">Regards Text <span className="text-red-500">*</span></p>
              </div>
              <input {...register('regards')} placeholder="Regards, Team Gym" className={fieldClassName('regards')} maxLength="35" />
              <div className="min-h-[20px] mt-1">
                {showFieldError('regards') ? (
                  <p className="text-red-500 text-xs font-medium leading-tight">{errors.regards.message}</p>
                ) : (
                  <p className="text-[10px] text-text-secondary leading-tight">Automatically generated from Gym Name, but customizable.</p>
                )}
              </div>
            </div>



          </div>
        )}

        {/* Form Actions Button Row */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-800/80 mt-8">
          {step > 1 ? (
            <Button
              type="button"
              variant="secondary"
              onClick={handlePrev}
              disabled={loading}
              className="px-5 py-2.5 text-xs uppercase tracking-wider font-bold rounded-lg"
            >
              Back
            </Button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <Button
              type="button"
              onClick={handleNext}
              className="px-6 py-2.5 text-xs uppercase tracking-wider font-bold rounded-lg shadow-lg"
              isLoading={loading}
            >
              Save & Continue
            </Button>
          ) : (
            <Button
              type="button"
              onClick={async () => {
                setLoading(true);
                const contactFields = ['helpContact'];
                for (const field of contactFields) {
                  const value = (values[field] || '').trim();
                  if (value && /^\d{10}$/.test(value)) {
                    try {
                      await api.post('/auth/check-exists', { phone: value });
                      clearErrors(field);
                    } catch (err) {
                      if (err.response?.status === 409) {
                        setError(field, { type: 'manual', message: 'Phone number already exists', shouldFocus: false });
                        setLoading(false);
                        toast.error('Phone number already exists');
                        return;
                      }
                    }
                  }
                }
                const valid = await trigger(stepRequiredFields[step]);
                if (valid) {
                  handleSubmit(onSubmit)();
                } else {
                  setLoading(false);
                  toast.error('Please fill all the mandatory fields before submitting.');
                }
              }}
              isLoading={loading}
              className="px-6 py-2.5 text-xs uppercase tracking-wider font-bold rounded-lg shadow-xl"
            >
              Launch Gym Dashboard
            </Button>
          )}
        </div>
      </form>

      <div className="mt-8 text-center text-xs text-slate-400 border-t border-slate-900 pt-5">
        Already have an account?
        <Link to="/login" className="text-primary hover:text-primary-hover font-semibold ml-1.5 transition-colors">
          Login here &rarr;
        </Link>
      </div>
    </div>
  );
};

export default GymRegister;
