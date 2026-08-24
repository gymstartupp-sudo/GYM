import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { KeyRound, ArrowLeft } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../utils/api';
import Button from '../components/Button';
import ThemeToggle from '../components/ThemeToggle';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors }, setError, clearErrors } = useForm({
    defaultValues: { email: '' }
  });

  const onSubmit = async (data) => {
    clearErrors();
    if (!data.email) {
      setError('email', { type: 'manual', message: 'Email is required' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      setError('email', { type: 'manual', message: 'Enter a valid email address' });
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email: data.email });
      toast.success(res.data?.message || 'Verification code sent if account exists.');
      navigate(`/verify-otp?email=${encodeURIComponent(data.email)}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-primary py-12 px-4 sm:px-6 lg:px-8 bg-[url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center bg-no-repeat bg-blend-overlay bg-black/80 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle className="w-10 h-10" />
      </div>
      <div className="max-w-md w-full space-y-8 backdrop-blur-md bg-surface-card/90 p-6 sm:p-10 rounded-2xl border border-border shadow-2xl">
        <div>
          <h2 className="mt-2 text-center text-2xl sm:text-4xl font-extrabold text-text-primary tracking-tight flex items-center justify-center gap-2.5 sm:gap-3 whitespace-nowrap">
            <KeyRound className="text-primary shrink-0 w-7 h-7 sm:w-9 sm:h-9" /> Forgot Password
          </h2>
          <p className="mt-3 text-center text-sm text-text-secondary">
            Enter your registered email address to receive a password reset verification code.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-4">
            <div>
              <input
                type="email"
                placeholder="Email Address"
                {...register('email')}
                className={`input-field hover:border-primary/50 ${errors.email ? 'border-red-500/80 focus:ring-red-500/30' : 'focus:border-primary focus:ring-primary'}`}
              />
              <div className="min-h-[20px] mt-1">
                {errors.email && <p className="text-red-500 text-xs font-medium leading-tight">{errors.email.message}</p>}
              </div>
            </div>

            <Button
              type="submit"
              isLoading={loading}
              className="w-full text-lg shadow-lg shadow-primary/20 bg-primary hover:bg-primary-hover text-[var(--btn-primary-text)] font-extrabold"
            >
              Send Code
            </Button>
          </div>
        </form>

        <div className="flex items-center justify-between mt-6">
          <Link to="/login" className="font-bold text-text-secondary hover:text-text-primary transition-colors flex items-center gap-2 text-sm">
            <ArrowLeft size={16} /> Back to Login
          </Link>
        </div>

      </div>
    </div>
  );
};

export default ForgotPassword;
