import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import api from '../utils/api';
import { toast } from 'react-toastify';
import Button from './Button';
import PasswordInput from './PasswordInput';
import { useAuth } from '../context/AuthContext';
import PaymentModal from './PaymentModal';
import CustomDatePicker from './CustomDatePicker';

const phoneError = 'Enter a valid 10-digit Indian mobile number';
const phoneRegex = /^[6-9]\d{9}$/;
const passwordError = 'Password must be at least 8 characters with 1 uppercase and 1 number';

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

const getValidationSchema = (mode) => yup.object({
  gymId: mode === 'self' ? yup.string().trim().required('Gym ID is required').matches(/^[A-Z]{3}-\d{2}$/, 'Format: PREFIX-01') : yup.string().nullable(),
  gymName: mode === 'self' ? yup.string().trim().required('Gym Name is required') : yup.string().nullable(),
  name: yup.string().trim().required('Name is required').max(25, 'Max 25 chars'),
  gender: yup.string().required('Gender is required'),
  email: yup.string().trim().email('Please enter a valid email address').required('Email is required'),
  dob: yup.date()
    .typeError('Enter a valid date of birth (DD-MM-YYYY)')
    .required('Date of birth is required')
    .max(new Date("9999-12-31"), 'Year cannot exceed 4 digits')
    .min(getMinDobDate(), 'Enter a valid date of birth (max 100 years old)')
    .test('age', 'Must be at least 14 years old', function (value) {
      if (!value || isNaN(new Date(value).getTime())) return false;
      const today = new Date();
      const birthDate = new Date(value);
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age >= 14;
    }),
  mobileNo: yup.string().matches(phoneRegex, phoneError).required(phoneError),
  address: yup.string().trim().required('Address is required').max(100, 'Max 100 chars'),
  emergencyContact: yup.string().matches(phoneRegex, phoneError).required(phoneError).notOneOf([yup.ref('mobileNo')], 'Must be different from Mobile Number'),
  medicalCondition: yup.string().trim().nullable(),
  planId: yup.string().nullable(),
  startDate: yup.date()
    .typeError('Enter a valid start date (DD-MM-YYYY)')
    .required('Start date is required')
    .min(getMinStartDate(), 'Start date cannot be more than 30 days in the past')
    .max(getMaxStartDate(), 'Start date cannot be more than 90 days in the future'),
  planType: yup.string().required('Membership plan is required'),
  password: ['self', 'owner'].includes(mode)
    ? yup.string().min(8, passwordError).max(20, 'Max 20 chars').matches(/^(?=.*[A-Z])(?=.*\d).+$/, passwordError).required(passwordError)
    : yup.string().nullable(),
  confirmPassword: ['self', 'owner'].includes(mode)
    ? yup.string().max(20, 'Max 20 chars').oneOf([yup.ref('password')], 'Passwords do not match').required('Please confirm your password')
    : yup.string().nullable()
});

const selfStepOneFields = ['gymId', 'gymName', 'name', 'gender', 'email', 'dob', 'mobileNo', 'address', 'emergencyContact'];
const selfStepTwoFields = ['planType', 'startDate', 'password', 'confirmPassword'];
const ownerRequiredFields = ['name', 'gender', 'email', 'dob', 'mobileNo', 'address', 'emergencyContact', 'password', 'confirmPassword', 'planType', 'startDate'];

const ClientForm = ({ mode = 'self', onSuccess, onCancel, showCancel = false, onDirtyChange }) => {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingGym, setFetchingGym] = useState(false);
  const [step, setStep] = useState(1);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingClientData, setPendingClientData] = useState(null);

  const isOwner = mode === 'owner';

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
    resolver: yupResolver(getValidationSchema(mode)),
    defaultValues: {
      gymId: isOwner ? user?.gymId || '' : '',
      gymName: isOwner ? user?.gymName || '' : '',
      medicalCondition: '',
      planType: ''
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

        const res = await api.post('/client', payload);
        onSuccess?.(res.data.data);
      } else {
        const payload = {
          gymId: data.gymId,
          name: data.name,
          gender: data.gender,
          email: data.email,
          dob: data.dob,
          mobileNo: data.mobileNo,
          address: data.address,
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
        onSuccess?.({ gymName: data.gymName });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalSubmit = async (paymentData) => {
    setLoading(true);
    try {
      const payload = {
        ...pendingClientData,
        payment: paymentData
      };
      const res = await api.post('/client', payload);
      toast.success('Client added with payment successfully');
      onSuccess?.(res.data.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create client and payment');
      throw error; // Re-throw to let PaymentModal handle loading state
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = async () => {
    const isValid = await trigger(selfStepOneFields);

    if (isValid) {
      setLoading(true);
      try {
        await api.post('/auth/check-exists', { email: values.email, phone: values.mobileNo });
        setStep(2);
      } catch (err) {
        if (err.response?.status === 409) {
          toast.error(err.response.data.message);
          if (err.response.data.message.toLowerCase().includes('email')) {
            setError('email', { type: 'manual', message: 'Email already exists' });
          } else {
            setError('mobileNo', { type: 'manual', message: 'Phone number already exists' });
          }
        }
      } finally {
        setLoading(false);
      }
    } else {
      toast.error('Please fix errors to proceed.');
    }
  };

  const handleOwnerSubmit = async () => {
    const isValid = await trigger(ownerRequiredFields);

    if (isValid) {
      const data = watch();
      const payload = {
        personalInfo: {
          name: data.name,
          dob: data.dob,
          gender: data.gender,
          address: data.address,
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
      toast.error('Please fix the highlighted errors before submitting.');
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
            onBlur={fetchGymName}
            className={fieldClassName('gymId', 'uppercase')}
            maxLength="6"
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
        <input {...register('name')} placeholder="Full Name" className={fieldClassName('name')} maxLength="25" />
        {showFieldError('name') && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
      </div>

      <div>
        <p className="text-xs text-text-secondary mb-1">Gender <span className="text-red-500">*</span></p>
        <select {...register('gender')} className={fieldClassName('gender', 'text-text-secondary bg-surface-secondary')}>
          <option value="">Select Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
        {showFieldError('gender') && <p className="text-red-500 text-xs mt-1">{errors.gender.message}</p>}
      </div>

      <div>
        <p className="text-xs text-text-secondary mb-1">Email <span className="text-red-500">*</span></p>
        <input {...register('email')} type="email" placeholder="Email Address" className={fieldClassName('email')} />
        {showFieldError('email') && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
      </div>

      <div>
        <p className="text-xs text-text-secondary mb-1">Date of Birth <span className="text-red-500">*</span></p>
        <CustomDatePicker
          {...register('dob')}
          className={fieldClassName('dob', 'text-text-secondary')}
        />
        {showFieldError('dob') && <p className="text-red-500 text-xs mt-1">{errors.dob.message}</p>}
      </div>

      <div>
        <p className="text-xs text-text-secondary mb-1">Mobile Number <span className="text-red-500">*</span></p>
        <input {...register('mobileNo')} type="tel" placeholder="10-digit mobile number" className={fieldClassName('mobileNo')} onInput={(e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10) }} maxLength="10" />
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

      <div className="md:col-span-2">
        <p className="text-xs text-text-secondary mb-1">Medical Condition (Optional)</p>
        <textarea {...register('medicalCondition')} placeholder="Any medical condition or injury history" className="input-field h-20 resize-none" maxLength="100" />
      </div>

      {isOwner && (
        <>
          <div>
            <p className="text-xs text-text-secondary mb-1">Password <span className="text-red-500">*</span></p>
            <PasswordInput {...register('password')} placeholder="Create password" className={fieldClassName('password')} maxLength="20" />
            {showFieldError('password') && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>
          <div>
            <p className="text-xs text-text-secondary mb-1">Confirm Password <span className="text-red-500">*</span></p>
            <PasswordInput {...register('confirmPassword')} placeholder="Confirm password" className={fieldClassName('confirmPassword')} maxLength="20" />
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
        <select
          {...register('planType')}
          className={fieldClassName('planType', 'text-text-secondary bg-surface-secondary')}
          onChange={(e) => {
            const val = e.target.value;
            setValue('planType', val);
            setValue('planId', val);
          }}
        >
          <option value="">Select a plan</option>
          {plans.map((plan) => (
            <option key={plan._id} value={plan._id}>
              {plan.name} ({plan.durationMonths} months)
            </option>
          ))}

        </select>
        {showFieldError('planType') && <p className="text-red-500 text-xs mt-1">{errors.planType.message}</p>}
        {!isOwner && plans.length === 0 && <p className="text-yellow-500 text-xs mt-1">Verify the Gym ID first to load that gym&apos;s plans.</p>}
      </div>

      <div>
        <p className="text-xs text-text-secondary mb-1">Membership Start Date <span className="text-red-500">*</span></p>
        <CustomDatePicker
          {...register('startDate')}
          className={fieldClassName('startDate', 'text-text-secondary')}
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
            <PasswordInput {...register('password')} placeholder="Create password" className={fieldClassName('password')} maxLength="20" />
            {showFieldError('password') && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>
          <div>
            <p className="text-xs text-text-secondary mb-1">Confirm Password <span className="text-red-500">*</span></p>
            <PasswordInput {...register('confirmPassword')} placeholder="Confirm password" className={fieldClassName('confirmPassword')} maxLength="20" />
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
            <Button type="button" isLoading={loading} className="ml-auto w-full md:w-auto" onClick={isOwner ? handleOwnerSubmit : () => { handleSubmit(onSubmit)() }}>
              {isOwner ? 'Add Client' : 'Submit Membership Request'}
            </Button>
          )}
        </div>
      </form>

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSave={handleFinalSubmit}
        clientData={pendingClientData}
        planData={plans.find(p => p._id === values.planId)}
      />
    </>
  );
};

export default ClientForm;
