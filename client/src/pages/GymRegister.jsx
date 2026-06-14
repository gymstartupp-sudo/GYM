import React, { useMemo, useState, useEffect } from 'react';
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
  UploadCloud
} from 'lucide-react';

const phoneError = 'Enter a valid 10-digit Indian mobile number';
const phoneRegex = /^[6-9]\d{9}$/;
const passwordError = 'Password must be at least 8 characters with 1 uppercase and 1 number';
const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const handlePhoneInput = (e) => {
  let val = e.target.value.replace(/\D/g, '');
  e.target.value = val.slice(0, 10);
};

// TimeInput: stores time as "H:MM AM" / "H:MM PM" directly — no 24h conversion
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = ['00', '15', '30', '45'];

const TimeInput = ({ fieldHour, fieldMinute, fieldAmpm, register, setValue, watch }) => {
  return (
    <div className="flex items-center gap-1 bg-slate-900/60 border border-slate-800 rounded-lg p-1.5 hover:border-slate-700/80 transition-colors">
      <select
        {...register(fieldHour)}
        onChange={e => setValue(fieldHour, e.target.value)}
        className="bg-transparent text-slate-200 text-sm focus:outline-none cursor-pointer flex-1 text-center py-1 select-none"
      >
        {HOURS.map(h => <option key={h} className="bg-slate-950" value={h}>{h}</option>)}
      </select>
      <span className="text-slate-500 font-bold select-none">:</span>
      <select
        {...register(fieldMinute)}
        onChange={e => setValue(fieldMinute, e.target.value)}
        className="bg-transparent text-slate-200 text-sm focus:outline-none cursor-pointer flex-1 text-center py-1 select-none"
      >
        {MINUTES.map(m => <option key={m} className="bg-slate-950" value={m}>{m}</option>)}
      </select>
      <select
        {...register(fieldAmpm)}
        onChange={e => setValue(fieldAmpm, e.target.value)}
        className="bg-transparent text-slate-300 font-medium text-xs focus:outline-none cursor-pointer w-14 text-center py-1 px-1 bg-slate-800 rounded select-none border border-slate-700/50"
      >
        <option className="bg-slate-950" value="AM">AM</option>
        <option className="bg-slate-950" value="PM">PM</option>
      </select>
    </div>
  );
};

const optionalUrl = yup.string().trim().test(
  'optional-url',
  'Please enter a valid URL',
  (value) => !value || /^https?:\/\/.+/i.test(value)
);

const schema = yup.object({
  gymIdPrefix: yup.string().trim().required('Gym ID prefix is required').max(3, 'Max 3 chars').matches(/^[A-Z]{3}$/, 'Exactly 3 uppercase letters'),
  gymName: yup.string().trim().required('Gym name is required').max(25, 'Max 25 chars'),
  gymEmail: yup.string().trim().email('Please enter a valid email address').required('Gym email is required'),
  gymContact: yup.string().matches(phoneRegex, phoneError).required(phoneError),
  address: yup.string().trim().required('Address is required').max(100, 'Max 100 chars'),
  location: yup.string().trim().required('Location is required').max(20, 'Max 20 chars'),
  gst: yup.string().trim().nullable(),
  gymType: yup.string().trim().nullable().max(20, 'Max 20 chars'),
  tagline: yup.string().trim().nullable().max(20, 'Max 20 chars'),
  instagramUrl: optionalUrl,
  facebookUrl: optionalUrl,
  websiteUrl: optionalUrl,
  operatingDays: yup.array().of(yup.string()).nullable(),
  operatingOpenHour: yup.string().nullable(),
  operatingOpenMinute: yup.string().nullable(),
  operatingOpenAmpm: yup.string().nullable(),
  operatingCloseHour: yup.string().nullable(),
  operatingCloseMinute: yup.string().nullable(),
  operatingCloseAmpm: yup.string().nullable(),
  password: yup.string().min(8, passwordError).max(20, 'Max 20 chars').matches(/^(?=.*[A-Z])(?=.*\d).+$/, passwordError).required(passwordError),
  confirmPassword: yup.string().max(20, 'Max 20 chars').oneOf([yup.ref('password')], 'Passwords do not match').required('Please confirm your password'),
  name: yup.string().trim().required('Owner name is required').max(25, 'Max 25 chars'),
  mobileNo: yup.string().matches(phoneRegex, phoneError).required(phoneError),
  mailId: yup.string().trim().email('Please enter a valid email address').required('Email is required'),
  whatsappNumber: yup.string().matches(phoneRegex, phoneError).required(phoneError),
  phoneNumber: yup.string().matches(phoneRegex, phoneError).required(phoneError),
  gmail: yup.string().trim().email('Please enter a valid email address').required('Email is required'),
  billingIdPrefix: yup.string().trim().required('Billing prefix is required').max(5, 'Max 5 chars').matches(/^[A-Za-z0-9]+$/, 'Alphanumeric only'),
  helpContact: yup.string().matches(phoneRegex, phoneError).required(phoneError),
  addressOnBill: yup.string().trim().required('Billing address is required').max(100, 'Max 100 chars'),
  regards: yup.string().trim().required('Regards text is required').max(20, 'Max 20 chars'),
  greetingText: yup.string().trim().required('Greeting text is required').max(20, 'Max 20 chars'),
  invoiceSupportEmail: yup.string().trim().email('Please enter a valid email address').nullable(),
  logo: yup.mixed().nullable()
});

const stepRequiredFields = {
  1: ['gymIdPrefix', 'gymName', 'gymEmail', 'gymContact', 'address', 'location'],
  2: ['name', 'mobileNo', 'mailId', 'password', 'confirmPassword', 'whatsappNumber', 'phoneNumber', 'gmail'],
  3: ['billingIdPrefix', 'helpContact', 'addressOnBill', 'regards', 'greetingText']
};

const stepAllFields = {
  1: ['gymIdPrefix', 'gymName', 'gymEmail', 'gymContact', 'address', 'location', 'gst', 'gymType', 'tagline', 'instagramUrl', 'facebookUrl', 'websiteUrl', 'operatingDays', 'operatingOpenHour', 'operatingOpenMinute', 'operatingOpenAmpm', 'operatingCloseHour', 'operatingCloseMinute', 'operatingCloseAmpm'],
  2: ['name', 'mobileNo', 'mailId', 'password', 'confirmPassword', 'whatsappNumber', 'phoneNumber', 'gmail'],
  3: ['billingIdPrefix', 'helpContact', 'addressOnBill', 'regards', 'greetingText', 'invoiceSupportEmail', 'logo']
};

const GymRegister = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [logoName, setLogoName] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  // Smart Sync toggles (Defaulting to true for frictionless "one-click" experience)
  const [syncWhatsapp, setSyncWhatsapp] = useState(true);
  const [syncSms, setSyncSms] = useState(true);
  const [syncEmail, setSyncEmail] = useState(true);
  const [syncAddress, setSyncAddress] = useState(true);
  const [syncHelpContact, setSyncHelpContact] = useState(true);

  const {
    register,
    trigger,
    handleSubmit,
    watch,
    setValue,
    setError,
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
    mode: 'onTouched',
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

  // SMS Sync
  useEffect(() => {
    if (syncSms && gymContact) {
      setValue('phoneNumber', gymContact, { shouldValidate: isSubmitted });
    }
  }, [gymContact, syncSms, setValue, isSubmitted]);

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

  // Regards & Greeting Auto-Generation
  useEffect(() => {
    if (gymName) {
      if (!touchedFields.regards && !errors.regards) {
        setValue('regards', `Regards, Team ${gymName}`);
      }
      if (!touchedFields.greetingText && !errors.greetingText) {
        setValue('greetingText', `Thank you for training with ${gymName}.`);
      }
    }
  }, [gymName, setValue, touchedFields.regards, touchedFields.greetingText, errors.regards, errors.greetingText]);

  const showFieldError = (field) => Boolean(errors[field]);

  const fieldClassName = (field, extra = '') => {
    const isError = showFieldError(field);
    return `input-field bg-slate-900/50 border border-slate-800 text-slate-200 placeholder-slate-500 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${extra}
      ${isError
        ? 'border-red-500/80 focus:ring-red-500/30 text-red-200 shadow-[0_0_8px_rgba(239,68,68,0.25)]'
        : 'focus:ring-blue-500/30 focus:border-blue-500/50 hover:border-slate-700/60'
      }`.trim();
  };

  const isFieldFilled = (field) => {
    const value = values[field];
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return value !== undefined && value !== null && String(value).trim() !== '';
  };

  const isStepDisabled = useMemo(() => {
    const requiredFields = stepRequiredFields[step];
    const fieldsForErrors = stepAllFields[step];
    const hasMissingRequired = requiredFields.some((field) => !isFieldFilled(field));
    const hasStepErrors = fieldsForErrors.some((field) => Boolean(errors[field]));

    return hasMissingRequired || hasStepErrors || loading;
  }, [errors, loading, step, values]);

  const handleNext = async () => {
    const isStepValid = await trigger(stepRequiredFields[step]);

    if (isStepValid) {
      if (step === 1) {
        setLoading(true);
        try {
          await api.post('/auth/check-exists', { email: values.gymEmail, phone: values.gymContact });
          setStep((currentStep) => currentStep + 1);
        } catch (err) {
          if (err.response?.status === 409) {
            toast.error(err.response.data.message);
            if (err.response.data.message.toLowerCase().includes('email')) {
              setError('gymEmail', { type: 'manual', message: 'Email already exists' });
            } else {
              setError('gymContact', { type: 'manual', message: 'Phone number already exists' });
            }
          }
        } finally {
          setLoading(false);
        }
      } else {
        setStep((currentStep) => currentStep + 1);
      }
    } else {
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
        gymIdPrefix: data.gymIdPrefix,
        gymName: data.gymName,
        gymEmail: data.gymEmail,
        gymContact: data.gymContact,
        address: data.address,
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
        phoneNumber: data.phoneNumber,
        gmail: data.gmail,
        billingIdPrefix: data.billingIdPrefix,
        helpContact: data.helpContact,
        addressOnBill: data.addressOnBill,
        regards: data.regards,
        greetingText: data.greetingText,
        invoiceSupportEmail: data.invoiceSupportEmail || '',
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
      navigate('/registration-success', { state: { gymId } });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-black py-16 px-4">
      <div className="card w-full max-w-2xl relative z-10 backdrop-blur-xl bg-slate-950/80 border border-slate-800/80 shadow-2xl p-8 rounded-2xl">

        {/* Glow effect */}
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl -z-10"></div>
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl -z-10"></div>

        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-text-primary tracking-tight mb-2">Gym Registration</h2>
          <p className="text-sm text-slate-400">Set up your premium SaaS gym workspace in three fast steps.</p>
        </div>

        {/* Modern Stepper */}
        <div className="mb-10 select-none">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-1/2 left-0 w-full h-[2px] bg-slate-800 -translate-y-1/2 -z-10 rounded-full"></div>
            <div
              className="absolute top-1/2 left-0 h-[2px] bg-gradient-to-r from-blue-500 to-indigo-500 -translate-y-1/2 -z-10 rounded-full transition-all duration-500 ease-out"
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
                          ? 'bg-blue-600 border-blue-500 text-text-primary shadow-[0_0_12px_rgba(59,130,246,0.4)] scale-110'
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="md:col-span-2 mb-2">
                <h3 className="text-lg font-bold text-text-primary mb-1">Gym Information</h3>
                <p className="text-xs text-slate-400">Tell us about your gym business.</p>
              </div>

              {/* LEFT COLUMN */}
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-400 mb-1.5 font-medium">Client ID  <span className="text-red-500">*</span></p>
                  <input
                    {...register('gymIdPrefix')}
                    placeholder="E.g. DNB"
                    className={fieldClassName('gymIdPrefix', 'uppercase font-semibold tracking-wider')}
                    maxLength="3"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">This 3-letter prefix will prefix all member IDs (e.g. DNB-01).</p>
                  {showFieldError('gymIdPrefix') && <p className="text-red-500 text-xs mt-1 font-medium">{errors.gymIdPrefix.message}</p>}
                </div>

                <div>
                  <p className="text-xs text-slate-400 mb-1.5 font-medium">Gym Email <span className="text-red-500">*</span></p>
                  <input {...register('gymEmail')} type="email" placeholder="E.g. contact@fitness.com" className={fieldClassName('gymEmail')} />
                  {showFieldError('gymEmail') && <p className="text-red-500 text-xs mt-1 font-medium">{errors.gymEmail.message}</p>}
                </div>

                <div>
                  <p className="text-xs text-slate-400 mb-1.5 font-medium">Address <span className="text-red-500">*</span></p>
                  <textarea
                    {...register('address')}
                    placeholder="E.g. Plot 15, Sector 4, HSR Layout"
                    className={fieldClassName('address', 'h-20 resize-none')}
                    maxLength="100"
                  />
                  {showFieldError('address') && <p className="text-red-500 text-xs mt-1 font-medium">{errors.address.message}</p>}
                </div>

                <div>
                  <p className="text-xs text-slate-400 mb-1.5 font-medium">Gym Type <span className="text-slate-500 font-normal">(Optional)</span></p>
                  <input {...register('gymType')} placeholder="E.g. CrossFit Studio, Gym" className={fieldClassName('gymType')} maxLength="20" />
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-400 mb-1.5 font-medium">Gym Name <span className="text-red-500">*</span></p>
                  <input {...register('gymName')} placeholder="E.g. Titan Fitness" className={fieldClassName('gymName')} maxLength="25" />
                  {showFieldError('gymName') && <p className="text-red-500 text-xs mt-1 font-medium">{errors.gymName.message}</p>}
                </div>

                <div>
                  <p className="text-xs text-slate-400 mb-1.5 font-medium">Gym Contact Number <span className="text-red-500">*</span></p>
                  <input
                    {...register('gymContact')}
                    type="tel"
                    placeholder="E.g. 9876543210"
                    className={fieldClassName('gymContact')}
                    onInput={handlePhoneInput}
                    maxLength="10"
                  />
                  {showFieldError('gymContact') && <p className="text-red-500 text-xs mt-1 font-medium">{errors.gymContact.message}</p>}
                </div>

                <div>
                  <p className="text-xs text-slate-400 mb-1.5 font-medium">Location <span className="text-red-500">*</span></p>
                  <input {...register('location')} placeholder="E.g. Bangalore" className={fieldClassName('location')} maxLength="20" />
                  {showFieldError('location') && <p className="text-red-500 text-xs mt-1 font-medium">{errors.location.message}</p>}
                </div>

                <div>
                  <p className="text-xs text-slate-400 mb-1.5 font-medium flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <span>Operating Hours <span className="text-slate-500 font-normal">(Optional)</span></span>
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-500 block mb-0.5">Opening</span>
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
                      <span className="text-[10px] text-slate-500 block mb-0.5">Closing</span>
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
                </div>
              </div>

              {/* Operating Days Section */}
              <div className="md:col-span-2">
                <p className="text-xs text-slate-400 mb-2.5 font-medium flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-400" />
                  <span>Operating Days</span>
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {weekDays.map((day) => (
                    <label
                      key={day}
                      className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 cursor-pointer border select-none transition-all duration-200
                        ${watch('operatingDays')?.includes(day)
                          ? 'bg-blue-600/10 border-blue-500/40 text-blue-300 font-medium'
                          : 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:border-slate-700/60 hover:bg-slate-850'
                        }`}
                    >
                      <input
                        type="checkbox"
                        value={day}
                        {...register('operatingDays')}
                        className="w-3.5 h-3.5 rounded border-slate-800 bg-slate-950 text-blue-500 focus:ring-blue-500/50 accent-blue-500"
                      />
                      <span>{day}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Collapsible Advanced Business Details Section */}
              <div className="md:col-span-2 border border-slate-800 rounded-xl overflow-hidden bg-slate-900/20 hover:border-slate-750 transition-colors">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full flex items-center justify-between px-5 py-3 text-left font-semibold text-xs text-slate-400 hover:text-text-primary hover:bg-slate-900/40 transition-all select-none"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                    <span>Advanced Business Details</span>
                  </div>
                  {showAdvanced ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                </button>

                {showAdvanced && (
                  <div className="p-5 border-t border-slate-800/60 bg-slate-950/20 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">GST Number <span className="text-[10px] text-slate-500">(Optional)</span></p>
                      <input {...register('gst')} placeholder="E.g. 22AAAAA0000A1Z5" className={fieldClassName('gst')} />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Tagline <span className="text-[10px] text-slate-500">(Optional)</span></p>
                      <input {...register('tagline')} placeholder="E.g. Unleash the beast" className={fieldClassName('tagline')} maxLength="20" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Website URL <span className="text-[10px] text-slate-500">(Optional)</span></p>
                      <input {...register('websiteUrl')} placeholder="E.g. https://yoursite.com" className={fieldClassName('websiteUrl')} />
                      {showFieldError('websiteUrl') && <p className="text-red-500 text-xs mt-1">{errors.websiteUrl.message}</p>}
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Instagram URL <span className="text-[10px] text-slate-500">(Optional)</span></p>
                      <input {...register('instagramUrl')} placeholder="E.g. https://instagram.com/gym" className={fieldClassName('instagramUrl')} />
                      {showFieldError('instagramUrl') && <p className="text-red-500 text-xs mt-1">{errors.instagramUrl.message}</p>}
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-xs text-slate-400 mb-1">Facebook URL <span className="text-[10px] text-slate-500">(Optional)</span></p>
                      <input {...register('facebookUrl')} placeholder="E.g. https://facebook.com/gym" className={fieldClassName('facebookUrl')} />
                      {showFieldError('facebookUrl') && <p className="text-red-500 text-xs mt-1">{errors.facebookUrl.message}</p>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: OWNER & COMMUNICATION */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h3 className="text-lg font-bold text-text-primary mb-1">Owner & Communication</h3>
                <p className="text-xs text-slate-400">Manage owner credentials and automated reminder settings.</p>
              </div>

              {/* SECTION A: OWNER DETAILS */}
              <div className="border border-slate-800/80 rounded-2xl p-5 bg-slate-900/10 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                  <User className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-bold text-slate-200">Section A: Owner Details</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-400 mb-1.5 font-medium">Owner Full Name <span className="text-red-500">*</span></p>
                    <input {...register('name')} placeholder="E.g. Alexander Walker" className={fieldClassName('name')} maxLength="25" />
                    {showFieldError('name') && <p className="text-red-500 text-xs mt-1 font-medium">{errors.name.message}</p>}
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1.5 font-medium">Personal Mobile Number <span className="text-red-500">*</span></p>
                    <input
                      {...register('mobileNo')}
                      type="tel"
                      placeholder="10-digit mobile number"
                      className={fieldClassName('mobileNo')}
                      onInput={handlePhoneInput}
                      maxLength="10"
                    />
                    {showFieldError('mobileNo') && <p className="text-red-500 text-xs mt-1 font-medium">{errors.mobileNo.message}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-xs text-slate-400 mb-1.5 font-medium">Personal Email <span className="text-red-500">*</span></p>
                    <input {...register('mailId')} type="email" placeholder="E.g. alex@gmail.com" className={fieldClassName('mailId')} />
                    {showFieldError('mailId') && <p className="text-red-500 text-xs mt-1 font-medium">{errors.mailId.message}</p>}
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1.5 font-medium flex items-center gap-1">
                      <Lock className="w-3 h-3 text-slate-500" />
                      <span>Password <span className="text-red-500">*</span></span>
                    </p>
                    <PasswordInput {...register('password')} placeholder="Min 8 characters" className={fieldClassName('password')} maxLength="20" />
                    {showFieldError('password') && <p className="text-red-500 text-xs mt-1 font-medium">{errors.password.message}</p>}
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1.5 font-medium flex items-center gap-1">
                      <Lock className="w-3 h-3 text-slate-500" />
                      <span>Confirm Password <span className="text-red-500">*</span></span>
                    </p>
                    <PasswordInput {...register('confirmPassword')} placeholder="Retype password" className={fieldClassName('confirmPassword')} maxLength="20" />
                    {showFieldError('confirmPassword') && <p className="text-red-500 text-xs mt-1 font-medium">{errors.confirmPassword.message}</p>}
                  </div>
                </div>
              </div>

              {/* SECTION B: COMMUNICATION SETTINGS */}
              <div className="border border-slate-800/80 rounded-2xl p-5 bg-slate-900/10 space-y-4">
                <div className="pb-1 border-b border-slate-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="w-4 h-4 text-indigo-400" />
                    <span className="text-sm font-bold text-slate-200">Section B: Communication Settings</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal">These details are used for automated reminders, membership expiry alerts, and payment notifications.</p>
                </div>

                <div className="space-y-4">

                  {/* WhatsApp Number Field */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5 select-none">
                      <span className="text-xs text-slate-400 font-medium">WhatsApp Business Number <span className="text-red-500">*</span></span>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={syncWhatsapp}
                          onChange={(e) => setSyncWhatsapp(e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-slate-800 bg-slate-950 text-blue-500 focus:ring-blue-500/50 accent-blue-500"
                        />
                        <span className="text-[10px] text-blue-400 font-bold hover:text-blue-300 transition-colors uppercase tracking-wider">
                          [ Use Gym Contact Number ]
                        </span>
                      </label>
                    </div>
                    <div className="relative">
                      <input
                        {...register('whatsappNumber')}
                        type="tel"
                        placeholder="10-digit WhatsApp number"
                        className={fieldClassName('whatsappNumber', syncWhatsapp ? 'bg-slate-900/30 border-blue-500/20 text-slate-400 cursor-not-allowed pr-24' : '')}
                        onInput={handlePhoneInput}
                        maxLength="10"
                        readOnly={syncWhatsapp}
                      />
                      {syncWhatsapp && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-extrabold px-2 py-0.5 rounded-full select-none tracking-widest">
                          <Check className="w-2.5 h-2.5 stroke-[3px]" />
                          SYNCED
                        </div>
                      )}
                    </div>
                    {syncWhatsapp && <p className="text-[10px] text-slate-500 mt-1">Using details from Gym Information</p>}
                    {showFieldError('whatsappNumber') && <p className="text-red-500 text-xs mt-1 font-medium">{errors.whatsappNumber.message}</p>}
                  </div>

                  {/* SMS Source Number Field */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5 select-none">
                      <span className="text-xs text-slate-400 font-medium">SMS Source Number <span className="text-red-500">*</span></span>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={syncSms}
                          onChange={(e) => setSyncSms(e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-slate-800 bg-slate-950 text-blue-500 focus:ring-blue-500/50 accent-blue-500"
                        />
                        <span className="text-[10px] text-blue-400 font-bold hover:text-blue-300 transition-colors uppercase tracking-wider">
                          [ Same as Gym Contact Number ]
                        </span>
                      </label>
                    </div>
                    <div className="relative">
                      <input
                        {...register('phoneNumber')}
                        type="tel"
                        placeholder="10-digit SMS number"
                        className={fieldClassName('phoneNumber', syncSms ? 'bg-slate-900/30 border-blue-500/20 text-slate-400 cursor-not-allowed pr-24' : '')}
                        onInput={handlePhoneInput}
                        maxLength="10"
                        readOnly={syncSms}
                      />
                      {syncSms && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-extrabold px-2 py-0.5 rounded-full select-none tracking-widest">
                          <Check className="w-2.5 h-2.5 stroke-[3px]" />
                          SYNCED
                        </div>
                      )}
                    </div>
                    {syncSms && <p className="text-[10px] text-slate-500 mt-1">Using details from Gym Information</p>}
                    {showFieldError('phoneNumber') && <p className="text-red-500 text-xs mt-1 font-medium">{errors.phoneNumber.message}</p>}
                  </div>

                  {/* Sender Email Field */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5 select-none">
                      <span className="text-xs text-slate-400 font-medium">Sender Email <span className="text-red-500">*</span></span>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={syncEmail}
                          onChange={(e) => setSyncEmail(e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-slate-800 bg-slate-950 text-blue-500 focus:ring-blue-500/50 accent-blue-500"
                        />
                        <span className="text-[10px] text-blue-400 font-bold hover:text-blue-300 transition-colors uppercase tracking-wider">
                          [ Use Gym Email ]
                        </span>
                      </label>
                    </div>
                    <div className="relative">
                      <input
                        {...register('gmail')}
                        type="email"
                        placeholder="Email address used for reminders"
                        className={fieldClassName('gmail', syncEmail ? 'bg-slate-900/30 border-blue-500/20 text-slate-400 cursor-not-allowed pr-24' : '')}
                        readOnly={syncEmail}
                      />
                      {syncEmail && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-extrabold px-2 py-0.5 rounded-full select-none tracking-widest">
                          <Check className="w-2.5 h-2.5 stroke-[3px]" />
                          SYNCED
                        </div>
                      )}
                    </div>
                    {syncEmail && <p className="text-[10px] text-slate-500 mt-1">Using details from Gym Information</p>}
                    {showFieldError('gmail') && <p className="text-red-500 text-xs mt-1 font-medium">{errors.gmail.message}</p>}
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* STEP 3: BILLING & BRANDING */}
          {step === 3 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="md:col-span-2 mb-2">
                <h3 className="text-lg font-bold text-text-primary mb-1">Billing & Branding</h3>
                <p className="text-xs text-slate-400">Configure client invoice settings and customize branding details.</p>
              </div>

              {/* LEFT COLUMN */}
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-400 mb-1.5 font-medium">Billing ID <span className="text-red-500">*</span></p>
                  <input
                    {...register('billingIdPrefix')}
                    placeholder="E.g. INV"
                    className={fieldClassName('billingIdPrefix', 'uppercase font-bold tracking-widest')}
                    maxLength="5"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Shorthand for invoice records (e.g. INV-0001).</p>
                  {showFieldError('billingIdPrefix') && <p className="text-red-500 text-xs mt-1 font-medium">{errors.billingIdPrefix.message}</p>}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5 select-none">
                    <span className="text-xs text-slate-400 font-medium">Address on Invoice <span className="text-red-500">*</span></span>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={syncAddress}
                        onChange={(e) => setSyncAddress(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-slate-800 bg-slate-950 text-blue-500 focus:ring-blue-500/50 accent-blue-500"
                      />
                      <span className="text-[10px] text-blue-400 font-bold hover:text-blue-300 transition-colors uppercase tracking-wider">
                        [ Same as Gym Address ]
                      </span>
                    </label>
                  </div>
                  <div className="relative">
                    <textarea
                      {...register('addressOnBill')}
                      placeholder="Billing address for invoices"
                      className={fieldClassName('addressOnBill', `h-20 resize-none ${syncAddress ? 'bg-slate-900/30 border-blue-500/20 text-slate-400 cursor-not-allowed pr-24' : ''}`)}
                      maxLength="100"
                      readOnly={syncAddress}
                    />
                    {syncAddress && (
                      <div className="absolute right-3 top-4 flex items-center gap-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-extrabold px-2 py-0.5 rounded-full select-none tracking-widest">
                        <Check className="w-2.5 h-2.5 stroke-[3px]" />
                        SYNCED
                      </div>
                    )}
                  </div>
                  {showFieldError('addressOnBill') && <p className="text-red-500 text-xs mt-1 font-medium">{errors.addressOnBill.message}</p>}
                </div>

                <div>
                  <p className="text-xs text-slate-400 mb-1.5 font-medium">Regards Text <span className="text-red-500">*</span></p>
                  <input {...register('regards')} placeholder="Regards, Team Gym" className={fieldClassName('regards')} maxLength="20" />
                  <p className="text-[10px] text-slate-500 mt-1">Automatically generated from Gym Name, but customizable.</p>
                  {showFieldError('regards') && <p className="text-red-500 text-xs mt-1 font-medium">{errors.regards.message}</p>}
                </div>

                <div>
                  <p className="text-xs text-slate-400 mb-1.5 font-medium">Gym Logo <span className="text-slate-500 font-normal">(Optional)</span></p>
                  <label className="block border border-dashed border-slate-800 rounded-xl px-4 py-4 bg-slate-900/20 cursor-pointer hover:border-blue-500/40 hover:bg-slate-900/40 transition-all text-center">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      {...register('logo')}
                      onChange={(event) => {
                        const file = event.target.files?.[0] || null;
                        setValue('logo', event.target.files, { shouldDirty: true });
                        setLogoName(file ? file.name : '');
                      }}
                    />
                    <UploadCloud className="w-6 h-6 text-slate-500 mx-auto mb-1.5" />
                    <span className="text-xs font-semibold text-slate-300 block">{logoName || 'Upload Logo Image'}</span>
                    <p className="text-[10px] text-slate-500 mt-1">Supports PNG, JPG up to 5MB</p>
                  </label>
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1.5 select-none">
                    <span className="text-xs text-slate-400 font-medium">Helpdesk Contact <span className="text-red-500">*</span></span>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={syncHelpContact}
                        onChange={(e) => setSyncHelpContact(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-slate-800 bg-slate-950 text-blue-500 focus:ring-blue-500/50 accent-blue-500"
                      />
                      <span className="text-[10px] text-blue-400 font-bold hover:text-blue-300 transition-colors uppercase tracking-wider">
                        [ Use Gym Contact ]
                      </span>
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      {...register('helpContact')}
                      type="tel"
                      placeholder="Support / Helpdesk number"
                      className={fieldClassName('helpContact', syncHelpContact ? 'bg-slate-900/30 border-blue-500/20 text-slate-400 cursor-not-allowed pr-24' : '')}
                      onInput={handlePhoneInput}
                      maxLength="10"
                      readOnly={syncHelpContact}
                    />
                    {syncHelpContact && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-extrabold px-2 py-0.5 rounded-full select-none tracking-widest">
                        <Check className="w-2.5 h-2.5 stroke-[3px]" />
                        SYNCED
                      </div>
                    )}
                  </div>
                  {showFieldError('helpContact') && <p className="text-red-500 text-xs mt-1 font-medium">{errors.helpContact.message}</p>}
                </div>

                <div>
                  <p className="text-xs text-slate-400 mb-1.5 font-medium">Greeting Message <span className="text-red-500">*</span></p>
                  <input {...register('greetingText')} placeholder="E.g. Thank you for training with us" className={fieldClassName('greetingText')} maxLength="20" />
                  <p className="text-[10px] text-slate-500 mt-1">Greeting shown at bottom of client dashboard.</p>
                  {showFieldError('greetingText') && <p className="text-red-500 text-xs mt-1 font-medium">{errors.greetingText.message}</p>}
                </div>

                <div>
                  <p className="text-xs text-slate-400 mb-1.5 font-medium">Invoice Support Email <span className="text-slate-500 font-normal">(Optional)</span></p>
                  <input
                    {...register('invoiceSupportEmail')}
                    type="email"
                    placeholder="E.g. billing@gym.com"
                    className={fieldClassName('invoiceSupportEmail')}
                  />
                  <p className="text-[10px] text-slate-500 mt-1">If client invoices have dedicated support email.</p>
                  {showFieldError('invoiceSupportEmail') && <p className="text-red-500 text-xs mt-1 font-medium">{errors.invoiceSupportEmail.message}</p>}
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
                disabled={isStepDisabled}
              >
                Save & Continue
              </Button>
            ) : (
              <Button
                type="button"
                onClick={async () => {
                  const valid = await trigger(stepRequiredFields[step]);
                  if (valid) handleSubmit(onSubmit)();
                }}
                isLoading={loading}
                disabled={isStepDisabled}
                className="px-6 py-2.5 text-xs uppercase tracking-wider font-bold rounded-lg shadow-xl"
              >
                Launch Gym Dashboard
              </Button>
            )}
          </div>
        </form>

        <div className="mt-8 text-center text-xs text-slate-400 border-t border-slate-900 pt-5">
          Already have an account?
          <Link to="/login" className="text-blue-400 hover:text-blue-300 font-semibold ml-1.5 transition-colors">
            Login here &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
};

export default GymRegister;
