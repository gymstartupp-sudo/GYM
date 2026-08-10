import React, { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import api from '../utils/api';
import { toast } from 'react-toastify';
import Button from './Button';
import PasswordInput from './PasswordInput';
import { useAuth } from '../context/AuthContext';
import PaymentModal from './PaymentModal';
import { formatDateToYYYYMMDD } from '../utils/dateInput';
import CustomDatePicker from './CustomDatePicker';
import {
  DATE_RULES,
  DOB_MESSAGES,
  getDateYearValidationError,
  getDobYearBounds,
  toDateInputString,
  validateDob,
} from '../utils/dateInput';


import { STATES_LIST, getCitiesForState } from '../utils/indianStatesCities';

const phoneError = 'Enter a valid 10-digit Indian mobile number';
const phoneRegex = /^[6-9]\d{9}$/;
const passwordError = 'Password must be at least 8 characters with 1 uppercase, 1 number, and 1 special character';
const gmailError = 'Email address must end with @gmail.com';
const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;

const CustomSelect = ({ value, onChange, options, placeholder, errorClassName = '', className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
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

  const selectedOption = options.find(o => String(o.value) === String(value));

  return (
    <div className="relative" ref={containerRef}>
      <div
        className={`${className} cursor-pointer flex justify-between items-center ${errorClassName} ${isOpen ? 'border-primary ring-1 ring-primary/50' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        tabIndex={0}
      >
        <span className={selectedOption ? '' : 'text-text-muted'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6" /></svg>
      </div>
      {isOpen && (
        <ul className="absolute z-50 w-full mt-1 bg-surface-card border border-border rounded-lg shadow-xl max-h-60 overflow-auto">
          {options.map((option) => (
            <li
              key={option.value}
              className={`px-4 py-2.5 cursor-pointer transition-colors border border-transparent rounded-md text-text-primary hover:bg-surface-hover hover:text-primary hover:border-primary ${String(value) === String(option.value) ? 'font-medium bg-surface-hover/50' : ''}`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const getMinStartDate = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - 30);
  return d;
};

const getMaxStartDate = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  d.setDate(d.getDate() + 90);
  return d;
};

const getMinDobDate = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 100);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getValidationSchema = (mode, isRestoring = false) => {
  if (isRestoring) {
    return yup.object({
      gymId: mode === 'self' ? yup.string().trim().required('Gym ID is required').max(8, 'Max 8 chars') : yup.string().nullable(),
      gymName: mode === 'self' ? yup.string().trim().required('Gym Name is required') : yup.string().nullable(),
      planId: yup.string().nullable(),
      startDate: yup.date()
        .typeError('Start date is required')
        .transform((val, orig) => (orig === '' || orig === null || orig === undefined ? null : val))
        .nullable()
        .required('Start date is required')
        .test('validYear', 'Enter a valid date.', (value) => {
          if (!value) return true;
          return !getDateYearValidationError(toDateInputString(value));
        })
        .max(getMaxStartDate(), 'Start date cannot be more than 90 days in the future'),
      planType: yup.string().required('Membership plan is required'),
      password: ['self', 'owner'].includes(mode)
        ? yup.string().min(8, passwordError).max(50, 'Max 50 chars').matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=\[\]{};':"\\|,.<>/?]).+$/, passwordError).required(passwordError)
        : yup.string().nullable(),
      confirmPassword: ['self', 'owner'].includes(mode)
        ? yup.string().max(50, 'Max 50 chars').oneOf([yup.ref('password')], 'Passwords do not match').required('Please confirm your password')
        : yup.string().nullable()
    });
  }

  return yup.object({
    gymId: mode === 'self' ? yup.string().trim().required('Gym ID is required').max(8, 'Max 8 chars') : yup.string().nullable(),
    gymName: mode === 'self' ? yup.string().trim().required('Gym Name is required') : yup.string().nullable(),
    name: yup.string().trim().required('Name is required').matches(/^[a-zA-Z\s]+$/, 'Only letters and spaces are allowed').max(50, 'Max 50 chars'),
    gender: yup.string().required('Gender is required'),
    email: yup.string().trim().email('Please enter a valid email address').matches(gmailRegex, gmailError).max(50, 'Email cannot exceed 50 characters').required('Email is required'),
    dob: yup.date()
      .typeError('Date of birth is required')
      .transform((val, orig) => (orig === '' || orig === null || orig === undefined ? null : val))
      .nullable()
      .required('Date of birth is required')
      .test('dobValidation', function (value) {
        if (!value) return this.createError({ message: 'Date of birth is required' });
        const error = validateDob(toDateInputString(value));
        if (error) return this.createError({ message: error });
        return true;
      }),

    mobileNo: yup.string().matches(phoneRegex, phoneError).required(phoneError),
    address: yup.string().trim().required('Address is required').max(100, 'Max 100 chars'),
    city: yup.string().trim().required('City is required').max(25, 'Max 25 chars'),
    state: yup.string().trim().required('State is required').max(25, 'Max 25 chars'),
    pincode: yup.string().matches(/^\d{6}$/, 'Pincode must be exactly 6 digits').required('Pincode is required'),
    emergencyContact: yup.string().matches(phoneRegex, phoneError).required(phoneError).notOneOf([yup.ref('mobileNo')], 'Must be different from Mobile Number'),
    medicalCondition: yup.string().trim().max(100, 'Max 100 chars').nullable(),
    planId: yup.string().nullable(),
    startDate: yup.date()
      .typeError('Start date is required')
      .transform((val, orig) => (orig === '' || orig === null || orig === undefined ? null : val))
      .nullable()
      .required('Start date is required')
      .test('validYear', 'Enter a valid date.', (value) => {
        if (!value) return true;
        return !getDateYearValidationError(toDateInputString(value));
      })
      .max(getMaxStartDate(), 'Start date cannot be more than 90 days in the future'),
    planType: yup.string().required('Membership plan is required'),
    password: ['self', 'owner'].includes(mode)
      ? yup.string().min(8, passwordError).max(50, 'Max 50 chars').matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=\[\]{};':"\\|,.<>/?]).+$/, passwordError).required(passwordError)
      : yup.string().nullable(),
    confirmPassword: ['self', 'owner'].includes(mode)
      ? yup.string().max(50, 'Max 50 chars').oneOf([yup.ref('password')], 'Passwords do not match').required('Please confirm your password')
      : yup.string().nullable()
  });
};

const selfStepOneFields = ['gymId', 'gymName', 'name', 'gender', 'email', 'dob', 'mobileNo', 'address', 'city', 'state', 'pincode', 'emergencyContact'];
const selfStepTwoFields = ['planType', 'startDate', 'password', 'confirmPassword'];
const ownerRequiredFields = ['name', 'gender', 'email', 'dob', 'mobileNo', 'address', 'city', 'state', 'pincode', 'emergencyContact', 'password', 'confirmPassword', 'planType', 'startDate'];

const ClientForm = ({ mode = 'self', onSuccess, onCancel, showCancel = false, onDirtyChange }) => {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingGym, setFetchingGym] = useState(false);
  const [step, setStep] = useState(1);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingClientData, setPendingClientData] = useState(null);
  const [duplicateModal, setDuplicateModal] = useState(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoringClientId, setRestoringClientId] = useState(null);

  const isOwner = mode === 'owner';

  const dateResolver = useCallback(async (data, context, options) => {
    const result = await yupResolver(getValidationSchema(mode, isRestoring))(data, context, options);
    if (result.values) {
      ['dob', 'startDate'].forEach((key) => {
        if (result.values[key] instanceof Date) {
          result.values[key] = formatDateToYYYYMMDD(result.values[key]);
        }
      });
    }
    return result;
  }, [mode, isRestoring]);

  const {
    register,
    trigger,
    handleSubmit,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors, touchedFields, isSubmitted, isDirty }
  } = useForm({
    resolver: dateResolver,
    defaultValues: {
      gymId: isOwner ? user?.gymId || '' : '',
      gymName: isOwner ? user?.gymName || '' : '',
      medicalCondition: '',
      planType: '',
      planId: ''
    },
    mode: 'onChange',
    reValidateMode: 'onChange'
  });

  const values = watch();
  const watchGymId = watch('gymId');
  const watchGymName = watch('gymName');

  useEffect(() => {
    if (onDirtyChange) {
      onDirtyChange(isDirty || Object.keys(touchedFields).length > 0);
    }
  }, [isDirty, touchedFields, onDirtyChange]);

  useEffect(() => {
    if (!isOwner && watchGymId && watchGymId.trim().length >= 3) {
      const delayDebounceFn = setTimeout(() => {
        fetchGymName();
      }, 500);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [watchGymId, isOwner]);

  useEffect(() => {
    if (isOwner && user?.gymId) {
      fetchPlans(user.gymId);
    }
  }, [isOwner, user?.gymId]);

  const fetchPlans = async (targetGymId) => {
    try {
      const res = await api.get(`/plan/public/${targetGymId}`);
      setPlans(res.data.data || []);
    } catch (error) {
      setPlans([]);
      toast.error('Failed to load membership plans');
    }
  };

  const fetchGymName = async () => {
    if (isOwner || !watchGymId?.trim()) {
      return;
    }

    setFetchingGym(true);

    try {
      const normalizedGymId = watchGymId.trim().toUpperCase();
      const res = await api.get(`/gym/public/${normalizedGymId}`);
      const foundName = res.data.data.gymName;

      setValue('gymId', normalizedGymId, { shouldValidate: true, shouldDirty: true });
      setValue('gymName', foundName, { shouldValidate: true, shouldDirty: true });
      clearErrors(['gymId', 'gymName']);
      fetchPlans(normalizedGymId);
    } catch (error) {
      setValue('gymName', '', { shouldValidate: true });
      setPlans([]);
      setError('gymId', { type: 'manual', message: 'Gym ID not found' });
      setError('gymName', { type: 'manual', message: 'Gym Name is required' });
    } finally {
      setFetchingGym(false);
    }
  };

  const showFieldError = (field) => Boolean(errors[field]);
  const fieldClassName = (field, extra = '') => `input-field ${extra} ${showFieldError(field) ? 'border-red-500' : ''}`.trim();

  const dobField = register('dob');
  const startDateField = register('startDate');
  const { minYear: dobMinYear, maxYear: dobMaxYear } = getDobYearBounds();

  const handleDateFieldChange = (field, e) => {
    setValue(field, e.target.value, { shouldValidate: true, shouldDirty: true });
  };

  const handleDateBlur = (field, e) => {
    const val = e.target.value || '';
    const parts = val.split('-');
    if (parts.length === 3) {
      const [d, m, y] = parts;
      if (d.length === 2 && m.length === 2 && y.length === 4 && /^\d+$/.test(d) && /^\d+$/.test(m) && /^\d+$/.test(y)) {
        const iso = `${y}-${m}-${d}`;
        setValue(field, iso, { shouldValidate: true });
      }
    }
  };

  const handleDateValidationError = (field, message) => {
    if (message) {
      setError(field, { type: 'manual', message });
    } else {
      clearErrors(field);
    }
  };

  const checkDuplicate = async (field, fieldValue) => {
    const value = (fieldValue || values[field] || '').trim();
    if (isRestoring || !value) return;
    if (field === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return;
    if (field === 'mobileNo' && !/^\d{10}$/.test(value)) return;

    try {
      const payload = {
        ...(field === 'email' ? { email: value } : { phone: value }),
        gymId: values.gymId
      };
      await api.post('/auth/check-exists', payload);
      clearErrors(field);
    } catch (err) {
      if (err.response?.status === 409) {
        const data = err.response.data;
        if (data.exists) {
          setDuplicateModal({
            type: data.isDeleted ? 'deleted' : 'active',
            isExpired: data.isExpired,
            client: {
              personalInfo: {
                name: values.name || '',
                mobileNo: values.mobileNo,
                email: values.email
              },
              deletedAt: data.deletedAt
            }
          });
        }
        setError(field, { type: 'manual', message: field === 'email' ? 'Email already exists' : 'Phone number already exists' });
      }
    }
  };

  const hasValue = (field) => {
    const value = values[field];

    if (Array.isArray(value)) {
      return value.length > 0;
    }

    if (field === 'customMonths' && values.planType !== 'Custom') return true;
    return value !== undefined && value !== null && String(value).trim() !== '';
  };

  const hasErrorsForFields = (fields) => fields.some((field) => Boolean(errors[field]));

  const selfStepOneDisabled = fetchingGym || selfStepOneFields.some((field) => !hasValue(field)) || hasErrorsForFields(selfStepOneFields);
  const selfStepTwoDisabled = fetchingGym || selfStepTwoFields.some((field) => !hasValue(field)) || hasErrorsForFields(selfStepTwoFields);
  const ownerSubmitDisabled = fetchingGym || ownerRequiredFields.some((field) => !hasValue(field)) || hasErrorsForFields(ownerRequiredFields);

  const onSubmit = async (data) => {
    setLoading(true);

    try {
      if (isOwner) {
        const payload = {
          personalInfo: {
            name: data.name,
            dob: data.dob,
            gender: data.gender,
            address: data.address,
            city: data.city,
            state: data.state,
            pincode: data.pincode,
            email: data.email,
            mobileNo: data.mobileNo,
            emergencyContact: data.emergencyContact,
            medicalCondition: data.medicalCondition?.trim() || ''
          },
          password: data.password,
          membership: {
            planId: data.planId,
            startDate: data.startDate,
            planType: data.planType
          }
        };

        if (isRestoring) {
          const res = await api.put('/client/restore/by-contact', {
            email: data.email,
            phone: data.mobileNo,
            membership: payload.membership
          });
          toast.success('Client restored successfully');
          onSuccess?.(res.data.data, 'restore');
        } else {
          const res = await api.post('/client', payload);
          onSuccess?.(res.data.data, 'create');
        }
      } else {
        if (isRestoring) {
          toast.info('Account already exists for this contact. Please log in to your account or contact your gym owner.');
          setLoading(false);
          return;
        } else {
          const payload = {
            gymId: data.gymId,
            name: data.name,
            gender: data.gender,
            email: data.email,
            dob: data.dob,
            mobileNo: data.mobileNo,
            address: data.address,
            city: data.city,
            state: data.state,
            pincode: data.pincode,
            emergencyContact: data.emergencyContact,
            medicalCondition: data.medicalCondition?.trim() || '',
            password: data.password,
            confirmPassword: data.confirmPassword,
            planId: data.planId,
            startDate: data.startDate,
            planType: data.planType
          };

          await api.post('/auth/client/register', payload);
          toast.success('Registration submitted for approval');
          onSuccess?.({ gymName: data.gymName }, 'create');
        }
      }
    } catch (error) {
      const errMsg = error.response?.data?.message || 'Action failed';
      const detailErrors = error.response?.data?.errors;
      const detailError = error.response?.data?.error;

      if (detailErrors && Array.isArray(detailErrors)) {
        toast.error(`${errMsg}: ${detailErrors.join(', ')}`);
      } else if (detailError && typeof detailError === 'object') {
        const errorKeys = Object.keys(detailError);
        const detailedMsg = errorKeys.map(k => `${k.split('.').pop()}: ${detailError[k]}`).join(', ');
        toast.error(`${errMsg} (${detailedMsg})`);
      } else {
        toast.error(errMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const onInvalid = () => {
    toast.error('Please fill all the mandatory fields before submitting.');
  };

  const handleFinalSubmit = async (paymentData) => {
    setLoading(true);
    try {
      const payload = {
        ...pendingClientData,
        membership: {
          ...pendingClientData.membership,
          startDate: paymentData.startDate
        },
        payment: paymentData
      };

      if (isRestoring) {
        const res = await api.put('/client/restore/by-contact', {
          email: values.email,
          phone: values.mobileNo,
          membership: payload.membership,
          payment: payload.payment
        });
        toast.success('Client restored and payment recorded');
        onSuccess?.(res.data.data, 'restore');
      } else {
        const res = await api.post('/client', payload);
        toast.success('Client added with payment successfully');
        onSuccess?.(res.data.data, 'create');
      }
    } catch (error) {
      const errMsg = error.response?.data?.message || 'Failed to create client and payment';
      const detailErrors = error.response?.data?.errors;
      const detailError = error.response?.data?.error;

      if (detailErrors && Array.isArray(detailErrors)) {
        toast.error(`${errMsg}: ${detailErrors.join(', ')}`);
      } else if (detailError && typeof detailError === 'object') {
        const errorKeys = Object.keys(detailError);
        const detailedMsg = errorKeys.map(k => `${k.split('.').pop()}: ${detailError[k]}`).join(', ');
        toast.error(`${errMsg} (${detailedMsg})`);
      } else {
        toast.error(errMsg);
      }
      throw error; // Re-throw to let PaymentModal handle loading state
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = async () => {
    const emailVal = values.email?.trim();
    const phoneVal = values.mobileNo?.trim();
    if (!isRestoring && (emailVal || phoneVal)) {
      try {
        await api.post('/auth/check-exists', { email: emailVal, phone: phoneVal, gymId: values.gymId });
        clearErrors(['email', 'mobileNo']);
      } catch (err) {
        if (err.response?.status === 409) {
          const data = err.response.data;
          if (data.exists) {
            setDuplicateModal({
              type: data.isDeleted ? 'deleted' : 'active',
              isExpired: data.isExpired,
              client: {
                personalInfo: {
                  name: values.name || '',
                  mobileNo: values.mobileNo,
                  email: values.email
                },
                deletedAt: data.deletedAt
              }
            });
          } else {
            toast.error(data.message || 'Duplicate detected');
            if (data.message?.toLowerCase().includes('email')) {
              setError('email', { type: 'manual', message: 'Email already exists' });
            } else {
              setError('mobileNo', { type: 'manual', message: 'Phone number already exists' });
            }
          }
          return;
        }
      }
    }

    const isValid = await trigger(selfStepOneFields);
    if (isValid) {
      setStep(2);
    } else {
      toast.error('Please fill all the mandatory fields before submitting.');
    }
  };

  const handleOwnerSubmit = async () => {
    const emailVal = values.email?.trim();
    const phoneVal = values.mobileNo?.trim();
    if (!isRestoring && (emailVal || phoneVal)) {
      try {
        await api.post('/auth/check-exists', { email: emailVal, phone: phoneVal, gymId: values.gymId });
        clearErrors(['email', 'mobileNo']);
      } catch (err) {
        if (err.response?.status === 409) {
          const data = err.response.data;
          if (data.exists) {
            setDuplicateModal({
              type: data.isDeleted ? 'deleted' : 'active',
              isExpired: data.isExpired,
              client: {
                personalInfo: {
                  name: values.name || '',
                  mobileNo: values.mobileNo,
                  email: values.email
                },
                deletedAt: data.deletedAt
              }
            });
          } else {
            toast.error(data.message || 'Duplicate detected');
            if (data.message?.toLowerCase().includes('email')) {
              setError('email', { type: 'manual', message: 'Email already exists' });
            } else {
              setError('mobileNo', { type: 'manual', message: 'Phone number already exists' });
            }
          }
          return;
        }
      }
    }

    const isValid = await trigger(ownerRequiredFields);
    if (isValid) {
      const data = watch();
      const payload = {
        personalInfo: {
          name: data.name,
          dob: data.dob,
          gender: data.gender,
          address: data.address,
          city: data.city,
          state: data.state,
          pincode: data.pincode,
          email: data.email,
          mobileNo: data.mobileNo,
          emergencyContact: data.emergencyContact,
          medicalCondition: data.medicalCondition?.trim() || ''
        },
        password: data.password,
        membership: {
          planId: data.planId,
          startDate: data.startDate,
          planType: data.planType
        }
      };

      setPendingClientData(payload);
      setShowPaymentModal(true);
    } else {
      toast.error('Please fill all the mandatory fields before submitting.');
    }
  };

  const renderGymContext = () => {
    if (isOwner) {
      return (
        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-text-secondary mb-1">Gym ID</p>
            <input value={user?.gymId || ''} readOnly className="input-field bg-surface-divider/70 text-text-secondary cursor-not-allowed" />
          </div>
          <div>
            <p className="text-xs text-text-secondary mb-1">Gym Name</p>
            <input value={user?.gymName || ''} readOnly className="input-field bg-surface-divider/70 text-text-secondary cursor-not-allowed" />
          </div>
        </div>
      );
    }

    return (
      <>
        <div>
          <p className="text-xs text-text-secondary mb-1">Gym ID <span className="text-red-500">*</span></p>
          <input
            {...register('gymId')}
            placeholder="Enter Gym ID (e.g. NEX-01)"
            className={fieldClassName('gymId', 'uppercase')}
            maxLength="8"
          />
          {fetchingGym && <p className="text-xs text-primary mt-1">Verifying gym...</p>}
          {showFieldError('gymId') && <p className="text-red-500 text-xs mt-1">{errors.gymId.message}</p>}
        </div>
        <div>
          <p className="text-xs text-text-secondary mb-1">Gym Name</p>
          <input
            {...register('gymName')}
            readOnly
            className={`input-field ${watchGymName ? 'bg-surface-divider/70 text-text-secondary border-emerald-500/30' : 'bg-surface-divider/70 text-text-muted'}`}
          />
          {showFieldError('gymName') && <p className="text-red-500 text-xs mt-1">{errors.gymName.message}</p>}
        </div>
      </>
    );
  };

  const renderPersonalInfo = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in">
      <div className="md:col-span-2">
        <h3 className="text-xl text-text-primary my-2 border-b border-border pb-2">Personal Info</h3>
      </div>

      {renderGymContext()}

      <div>
        <p className="text-xs text-text-secondary mb-1">Full Name <span className="text-red-500">*</span></p>
        <input {...register('name')} placeholder="Full Name" className={fieldClassName('name')} maxLength="50" onInput={(e) => { e.target.value = e.target.value.replace(/[^a-zA-Z\s]/g, ''); }} />
        {showFieldError('name') && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
      </div>

      <div>
        <p className="text-xs text-text-secondary mb-1">Gender <span className="text-red-500">*</span></p>
        <CustomSelect
          value={watch('gender')}
          onChange={(val) => setValue('gender', val, { shouldValidate: true, shouldDirty: true })}
          options={[
            { label: 'Male', value: 'Male' },
            { label: 'Female', value: 'Female' },
            { label: 'Other', value: 'Other' }
          ]}
          placeholder="Select Gender"
          className={fieldClassName('gender', 'focus:border-primary focus:ring-primary/50')}
        />
        {showFieldError('gender') && <p className="text-red-500 text-xs mt-1">{errors.gender.message}</p>}
      </div>

      <div>
        <p className="text-xs text-text-secondary mb-1">Email <span className="text-red-500">*</span></p>
        <input {...register('email')} type="email" placeholder="Email Address" className={fieldClassName('email')} maxLength="50" onBlur={(e) => { register('email').onBlur(e); checkDuplicate('email', e.target.value); }} />
        {showFieldError('email') && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
      </div>

      <div>
        <p className="text-xs text-text-secondary mb-1">Date of Birth <span className="text-red-500">*</span></p>
        <CustomDatePicker
          name={dobField.name}
          ref={dobField.ref}
          onBlur={(e) => handleDateBlur('dob', e)}
          value={toDateInputString(values.dob)}
          validationRule={DATE_RULES.DOB}
          minDate={`${dobMinYear}-01-01`}
          maxDate={`${dobMaxYear}-12-31`}
          className={fieldClassName('dob', 'text-text-secondary')}
          onChange={(e) => {
            dobField.onChange(e);
            handleDateFieldChange('dob', e);
          }}
          onValidationError={(message) => handleDateValidationError('dob', message)}
        />
        {showFieldError('dob') && <p className="text-red-500 text-xs mt-1">{errors.dob.message}</p>}
      </div>

      <div>
        <p className="text-xs text-text-secondary mb-1">Mobile Number <span className="text-red-500">*</span></p>
        <input {...register('mobileNo')} type="tel" placeholder="10-digit mobile number" className={fieldClassName('mobileNo')} onInput={(e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10) }} maxLength="10" onBlur={(e) => { register('mobileNo').onBlur(e); checkDuplicate('mobileNo', e.target.value); }} />
        {showFieldError('mobileNo') && <p className="text-red-500 text-xs mt-1">{errors.mobileNo.message}</p>}
      </div>

      <div>
        <p className="text-xs text-text-secondary mb-1">Emergency Contact <span className="text-red-500">*</span></p>
        <input {...register('emergencyContact')} type="tel" placeholder="10-digit emergency contact" className={fieldClassName('emergencyContact')} onInput={(e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10) }} maxLength="10" />
        {showFieldError('emergencyContact') && <p className="text-red-500 text-xs mt-1">{errors.emergencyContact.message}</p>}
      </div>

      <div className="md:col-span-2">
        <p className="text-xs text-text-secondary mb-1">Address <span className="text-red-500">*</span></p>
        <textarea {...register('address')} placeholder="Residential address" className={fieldClassName('address', 'h-20 resize-none')} maxLength="100" />
        {showFieldError('address') && <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>}
      </div>

      <div>
        <p className="text-xs text-text-secondary mb-1">State <span className="text-red-500">*</span></p>
        <CustomSelect
          value={watch('state') || ''}
          onChange={(val) => {
            setValue('state', val, { shouldValidate: true, shouldDirty: true });
            const availableCities = getCitiesForState(val);
            const currentCity = watch('city');
            if (!availableCities.includes(currentCity)) {
              setValue('city', availableCities[0] || '', { shouldValidate: true, shouldDirty: true });
            }
          }}
          options={STATES_LIST.map(s => ({ label: s, value: s }))}
          placeholder="Select State"
          className={fieldClassName('state', 'focus:border-primary focus:ring-primary/50')}
        />
        {showFieldError('state') && <p className="text-red-500 text-xs mt-1">{errors.state.message}</p>}
      </div>

      <div>
        <p className="text-xs text-text-secondary mb-1">City <span className="text-red-500">*</span></p>
        <CustomSelect
          value={watch('city') || ''}
          onChange={(val) => setValue('city', val, { shouldValidate: true, shouldDirty: true })}
          options={getCitiesForState(watch('state')).map(c => ({ label: c, value: c }))}
          placeholder={watch('state') ? "Select City" : "Select State First"}
          className={fieldClassName('city', 'focus:border-primary focus:ring-primary/50')}
        />
        {showFieldError('city') && <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>}
      </div>


      <div className="md:col-start-1">
        <p className="text-xs text-text-secondary mb-1">Pincode <span className="text-red-500">*</span></p>
        <input {...register('pincode')} placeholder="E.g. 560102" className={fieldClassName('pincode')} maxLength="6" onInput={(e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6) }} />
        {showFieldError('pincode') && <p className="text-red-500 text-xs mt-1">{errors.pincode.message}</p>}
      </div>

      <div className="md:col-span-2">
        <p className="text-xs text-text-secondary mb-1">Medical Condition (Optional)</p>
        <textarea {...register('medicalCondition')} placeholder="Any medical condition or injury history" className="input-field h-20 resize-none" maxLength="100" />
      </div>

      {isOwner && (
        <>
          <div>
            <p className="text-xs text-text-secondary mb-1">Password <span className="text-red-500">*</span></p>
            <PasswordInput {...register('password')} placeholder="Create password" className={fieldClassName('password')} maxLength="50" />
            {showFieldError('password') && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>
          <div>
            <p className="text-xs text-text-secondary mb-1">Confirm Password <span className="text-red-500">*</span></p>
            <PasswordInput {...register('confirmPassword')} placeholder="Confirm password" className={fieldClassName('confirmPassword')} maxLength="50" />
            {showFieldError('confirmPassword') && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
          </div>
        </>
      )}
    </div>
  );

  const renderMembershipInfo = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in">
      <div className="md:col-span-2">
        <h3 className="text-xl text-text-primary mb-2 border-b border-border pb-2">Membership Plan</h3>
      </div>

      <div className="md:col-span-2">
        <p className="text-xs text-text-secondary mb-1">Membership Plan <span className="text-red-500">*</span></p>
        <CustomSelect
          value={watch('planType')}
          onChange={(val) => {
            setValue('planType', val, { shouldValidate: true, shouldDirty: true });
            setValue('planId', val, { shouldValidate: true, shouldDirty: true });
          }}
          options={plans.map(p => ({ label: `${p.name} (${p.durationMonths} months)`, value: String(p._id) }))}
          placeholder="Select a plan"
          className={fieldClassName('planType', 'text-text-secondary bg-surface-secondary')}
        />
        {showFieldError('planType') && <p className="text-red-500 text-xs mt-1">{errors.planType.message}</p>}
        {!isOwner && plans.length === 0 && <p className="text-yellow-500 text-xs mt-1">Verify the Gym ID first to load that gym&apos;s plans.</p>}
      </div>

      <div>
        <p className="text-xs text-text-secondary mb-1">Membership Start Date <span className="text-red-500">*</span></p>
        <CustomDatePicker
          name={startDateField.name}
          ref={startDateField.ref}
          onBlur={(e) => handleDateBlur('startDate', e)}
          value={toDateInputString(values.startDate)}
          validationRule={DATE_RULES.REGISTRATION_START}
          maxDate={getMaxStartDate()}
          className={fieldClassName('startDate', 'text-text-secondary')}
          onChange={(e) => {
            startDateField.onChange(e);
            handleDateFieldChange('startDate', e);
          }}
          onValidationError={(message) => handleDateValidationError('startDate', message)}
        />
        {showFieldError('startDate') && <p className="text-red-500 text-xs mt-1">{errors.startDate.message}</p>}
      </div>

      {!isOwner && (
        <>
          <div className="md:col-span-2 border-t border-border pt-4 mt-2">
            <h3 className="text-lg text-text-primary mb-3">Security</h3>
          </div>
          <div>
            <p className="text-xs text-text-secondary mb-1">Password <span className="text-red-500">*</span></p>
            <PasswordInput {...register('password')} placeholder="Create password" className={fieldClassName('password')} maxLength="50" />
            {showFieldError('password') && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>
          <div>
            <p className="text-xs text-text-secondary mb-1">Confirm Password <span className="text-red-500">*</span></p>
            <PasswordInput {...register('confirmPassword')} placeholder="Confirm password" className={fieldClassName('confirmPassword')} maxLength="50" />
            {showFieldError('confirmPassword') && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
          </div>
        </>
      )}
    </div>
  );

  const submitDisabled = isOwner ? ownerSubmitDisabled : selfStepTwoDisabled;

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left">
        {(!isOwner && step === 1) || isOwner ? renderPersonalInfo() : null}
        {(!isOwner && step === 2) || isOwner ? renderMembershipInfo() : null}

        <div className="flex justify-between pt-6 border-t border-border mt-6 !mt-8">
          {!isOwner && step === 2 ? (
            <Button type="button" variant="secondary" onClick={() => setStep(1)}>Back</Button>
          ) : showCancel ? (
            <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
          ) : (
            <div></div>
          )}

          {!isOwner && step === 1 ? (
            <Button type="button" onClick={handleNextStep} className="ml-auto" isLoading={loading}>
              Next
            </Button>
          ) : (
            <Button type="button" isLoading={loading} className="ml-auto w-full md:w-auto" onClick={isOwner ? handleOwnerSubmit : () => { handleSubmit(onSubmit, onInvalid)() }}>
              {isOwner ? 'Add Client' : 'Submit Membership Request'}
            </Button>
          )}
        </div>
      </form>

      <PaymentModal
        isOpen={showPaymentModal && pendingClientData !== null}
        onClose={() => {
          setShowPaymentModal(false);
          setPendingClientData(null);
        }}
        onSave={handleFinalSubmit}
        clientData={pendingClientData}
        planData={plans.find(p => p._id === values.planId)}
        plans={plans}
      />

      {duplicateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-surface-secondary border border-border rounded-xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 relative">
            <h2 className="text-xl font-bold text-text-primary mb-3 text-center">
              {duplicateModal.type === 'active' ? 'Client Already Exists' : 'Client Previously Deleted'}
            </h2>
            
            <p className="text-sm text-text-secondary mb-5 text-center">
              {duplicateModal.type === 'active'
                ? 'A client with this phone number already exists.'
                : 'A client with this phone number was previously deleted.'}
            </p>

            <div className="bg-surface-divider/50 border border-border/50 rounded-xl p-4 mb-5 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-text-secondary font-medium">Name</span>
                <span className="text-text-primary font-bold">
                  {duplicateModal.client.personalInfo?.name || duplicateModal.client.name}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-text-secondary font-medium">Phone Number</span>
                <span className="text-text-primary font-bold">
                  {duplicateModal.client.personalInfo?.mobileNo || duplicateModal.client.phone}
                </span>
              </div>
              {duplicateModal.type === 'deleted' && duplicateModal.client.deletedAt && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-text-secondary font-medium">Deleted On</span>
                  <span className="text-text-primary font-bold">
                    {new Date(duplicateModal.client.deletedAt).toLocaleDateString('en-GB').replace(/\//g, '-')}
                  </span>
                </div>
              )}
            </div>

            {duplicateModal.type === 'deleted' && (
              <p className="text-sm text-text-primary font-semibold mb-5 text-center">
                Would you like to restore this client instead of creating a new one?
              </p>
            )}

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDuplicateModal(null)}
              >
                Cancel
              </Button>
              {duplicateModal.type === 'active' ? (
                <Button
                  type="button"
                  onClick={() => {
                    setDuplicateModal(null);
                    onCancel?.();
                    if (isOwner) {
                      const searchVal = values.mobileNo || values.email || '';
                      navigate(`/owner/clients?search=${encodeURIComponent(searchVal)}`);
                    } else {
                      navigate('/login');
                    }
                  }}
                >
                  {isOwner ? 'View Client' : 'Login Here'}
                </Button>
              ) : (
                <Button
                  type="button"
                  className="bg-primary hover:bg-primary/90 text-black font-bold"
                  onClick={async () => {
                    if (duplicateModal.isExpired) {
                      clearErrors(['email', 'mobileNo']);
                      setIsRestoring(true);
                      setDuplicateModal(null);
                      if (!isOwner) {
                        setStep(2);
                      }
                      toast.info('Restoring client details. Please select a plan and set a password to complete registration.');
                    } else {
                      try {
                        if (isOwner) {
                          await api.put('/client/restore/by-contact', {
                            email: values.email,
                            phone: values.mobileNo
                          });
                          toast.success('Client restored successfully.');
                          setDuplicateModal(null);
                          onCancel?.();
                          const searchVal = values.mobileNo || values.email || '';
                          navigate(`/owner/clients?search=${encodeURIComponent(searchVal)}`);
                        } else {
                          toast.info('Please log in with your existing credentials or contact your gym owner.');
                          setDuplicateModal(null);
                          navigate('/login');
                        }
                      } catch (err) {
                        toast.error('Failed to restore client.');
                      }
                    }
                  }}
                >
                  Restore Client
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ClientForm;
