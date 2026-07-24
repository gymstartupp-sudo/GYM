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

const schema = yup.object().shape({
  email: yup.string().required('Email is required').email('Enter a valid email address'),
});

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data) => {
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
      <div className="max-w-md w-full space-y-8 backdrop-blur-md bg-surface-card/90 p-10 rounded-2xl border border-border shadow-2xl">
        <div>
          <h2 className="mt-2 text-center text-4xl font-extrabold text-text-primary tracking-tight flex items-center justify-center gap-3">
            <KeyRound className="text-primary" size={36} /> Forgot Password
          </h2>
          <p className="mt-3 text-center text-sm text-text-secondary">
            Enter your email and we'll send you a 6-digit OTP code to verify your identity.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-4">
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
