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
  const [method, setMethod] = useState('email'); // 'email' or 'whatsapp'

  const { register, handleSubmit, formState: { errors }, setError, clearErrors } = useForm({
    defaultValues: { email: '', phone: '' }
  });

  const onSubmit = async (data) => {
    clearErrors();
    if (method === 'email') {
      if (!data.email) {
        setError('email', { type: 'manual', message: 'Email is required' });
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        setError('email', { type: 'manual', message: 'Enter a valid email address' });
        return;
      }
    } else {
      if (!data.phone) {
        setError('phone', { type: 'manual', message: 'Phone number is required' });
        return;
      }
      if (!/^[6-9]\d{9}$/.test(data.phone)) {
        setError('phone', { type: 'manual', message: 'Enter a valid 10-digit Indian mobile number' });
        return;
      }
    }

    setLoading(true);
    try {
      if (method === 'email') {
        const res = await api.post('/auth/forgot-password', { email: data.email });
        toast.success(res.data?.message || 'Verification code sent if account exists.');
        navigate(`/verify-otp?email=${encodeURIComponent(data.email)}`);
      } else {
        const res = await api.post('/auth/forgot-password', { phone: data.phone });
        toast.success(res.data?.message || 'Verification code sent if account exists.');
        navigate(`/verify-otp?phone=${encodeURIComponent(data.phone)}`);
      }
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
      <div className="max-w-md w-full space-y-8 backdrop-blur-md bg-surface-card/90 p-10 rounded-2xl border border-border shadow-2xl">
        <div>
          <h2 className="mt-2 text-center text-4xl font-extrabold text-text-primary tracking-tight flex items-center justify-center gap-3">
            <KeyRound className="text-primary" size={36} /> Forgot Password
          </h2>
          <p className="mt-3 text-center text-sm text-text-secondary">
            Select verification method and enter credentials to reset your password.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-4">
            {/* Verification Method Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider">
                Verification Method
              </label>
              <div className="flex gap-6 p-1">
                <label className="flex items-center gap-2.5 text-text-primary text-sm font-bold cursor-pointer hover:text-primary transition-colors">
                  <input
                    type="radio"
                    name="method"
                    value="email"
                    checked={method === 'email'}
                    onChange={() => {
                      setMethod('email');
                      clearErrors();
                    }}
                    className="w-4 h-4 text-primary focus:ring-primary border-border bg-surface-secondary cursor-pointer"
                  />
                  Email
                </label>
                <label className="flex items-center gap-2.5 text-text-primary text-sm font-bold cursor-pointer hover:text-primary transition-colors">
                  <input
                    type="radio"
                    name="method"
                    value="whatsapp"
                    checked={method === 'whatsapp'}
                    onChange={() => {
                      setMethod('whatsapp');
                      clearErrors();
                    }}
                    className="w-4 h-4 text-primary focus:ring-primary border-border bg-surface-secondary cursor-pointer"
                  />
                  Phone (WhatsApp)
                </label>
              </div>
            </div>

            {method === 'email' ? (
              <div>
                <input
                  type="email"
                  placeholder="Email Address"
                  {...register('email')}
                  className={`input-field hover:border-primary/50 ${errors.email ? 'border-red-500/80 focus:ring-red-500/30 text-red-200' : 'focus:border-primary focus:ring-primary'}`}
                />
                <div className="min-h-[20px] mt-1">
                  {errors.email && <p className="text-red-500 text-xs font-medium leading-tight">{errors.email.message}</p>}
                </div>
              </div>
            ) : (
              <div>
                <input
                  type="tel"
                  placeholder="10-digit Phone Number"
                  {...register('phone')}
                  className={`input-field hover:border-primary/50 ${errors.phone ? 'border-red-500/80 focus:ring-red-500/30 text-red-200' : 'focus:border-primary focus:ring-primary'}`}
                  maxLength="10"
                />
                <div className="min-h-[20px] mt-1">
                  {errors.phone && <p className="text-red-500 text-xs font-medium leading-tight">{errors.phone.message}</p>}
                </div>
              </div>
            )}

            <Button
              type="submit"
              isLoading={loading}
              className="w-full text-lg shadow-lg shadow-primary/20 bg-primary hover:bg-primary-hover text-[var(--btn-primary-text)] font-extrabold"
            >
              Send Code
            </Button>
          </div>
        </form>

        <div className="text-sm mt-6 pt-6 border-t border-border flex justify-center">
          <Link to="/login" className="font-bold text-primary hover:text-primary-hover transition-colors flex items-center gap-2">
            <ArrowLeft size={16} /> Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
