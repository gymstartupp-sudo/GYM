import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { Lock, ArrowLeft, Check, X, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../utils/api';
import Button from '../components/Button';
import ThemeToggle from '../components/ThemeToggle';

const schema = yup.object().shape({
  password: yup.string()
    .required('New Password is required')
    .min(8, 'Must be at least 8 characters')
    .matches(/[A-Z]/, 'Must contain one uppercase letter')
    .matches(/[a-z]/, 'Must contain one lowercase letter')
    .matches(/\d/, 'Must contain one number')
    .matches(/[@$!%*?&]/, 'Must contain one special character'),
  confirmPassword: yup.string()
    .required('Confirm Password is required')
    .oneOf([yup.ref('password'), null], 'Passwords must match'),
});

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const email = queryParams.get('email') || '';

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    mode: 'onChange',
  });

  const passwordVal = watch('password', '');

  // Auto-redirect if no email
  useEffect(() => {
    if (!email) {
      toast.error('Invalid request context. Starting over.');
      navigate('/forgot-password');
    }
  }, [email, navigate]);

  // Password criteria checklist
  const criteria = [
    { label: 'At least 8 characters', met: passwordVal.length >= 8 },
    { label: 'One uppercase letter (A-Z)', met: /[A-Z]/.test(passwordVal) },
    { label: 'One lowercase letter (a-z)', met: /[a-z]/.test(passwordVal) },
    { label: 'One number (0-9)', met: /\d/.test(passwordVal) },
    { label: 'One special character (@$!%*?&)', met: /[@$!%*?&]/.test(passwordVal) },
  ];

  const metCount = criteria.filter(c => c.met).length;

  const getStrengthText = () => {
    if (passwordVal.length === 0) return { label: 'None', color: 'text-text-muted', barColor: 'bg-transparent' };
    if (metCount <= 2) return { label: 'Weak', color: 'text-red-500', barColor: 'bg-red-500' };
    if (metCount <= 4) return { label: 'Medium', color: 'text-orange-500', barColor: 'bg-orange-500' };
    return { label: 'Strong', color: 'text-emerald-500', barColor: 'bg-emerald-500' };
  };

  const strength = getStrengthText();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', {
        email,
        password: data.password,
      });
      toast.success(res.data?.message || 'Password changed successfully. Please login.');
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reset password. Please try again.');
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
            <Lock className="text-primary" size={36} /> Reset Password
          </h2>
          <p className="mt-3 text-center text-sm text-text-secondary">
            Set your new login credentials below.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-4">
            {/* New Password */}
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="New Password"
                {...register('password')}
                className={`input-field pr-10 hover:border-primary/50 ${errors.password ? 'border-red-500/80 focus:ring-red-500/30 text-red-200' : 'focus:border-primary focus:ring-primary'}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {passwordVal && (
              <div className="space-y-2 p-3 bg-surface-secondary border border-border rounded-xl">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-text-secondary">Password Strength:</span>
                  <span className={`font-bold ${strength.color}`}>{strength.label}</span>
                </div>
                <div className="h-1.5 w-full bg-surface-divider rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${strength.barColor}`}
                    style={{ width: `${(metCount / 5) * 100}%` }}
                  />
                </div>
                <div className="space-y-1 mt-2">
                  {criteria.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10px] text-text-secondary font-medium">
                      {c.met ? (
                        <Check size={10} className="text-emerald-500" />
                      ) : (
                        <X size={10} className="text-red-500" />
                      )}
                      <span className={c.met ? 'text-text-primary' : 'text-text-muted'}>{c.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Confirm Password */}
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm New Password"
                {...register('confirmPassword')}
                className={`input-field pr-10 hover:border-primary/50 ${errors.confirmPassword ? 'border-red-500/80 focus:ring-red-500/30 text-red-200' : 'focus:border-primary focus:ring-primary'}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="min-h-[20px] -mt-2">
              {errors.confirmPassword && <p className="text-red-500 text-xs font-medium leading-tight">{errors.confirmPassword.message}</p>}
            </div>

            <Button
              type="submit"
              isLoading={loading}
              className="w-full text-lg shadow-lg shadow-primary/20 bg-primary hover:bg-primary-hover text-[var(--btn-primary-text)] font-extrabold"
            >
              Reset Password
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

export default ResetPassword;
