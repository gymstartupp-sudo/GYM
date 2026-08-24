import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../utils/api';
import Button from '../components/Button';
import ThemeToggle from '../components/ThemeToggle';

const OtpVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const email = queryParams.get('email') || '';
  const phone = queryParams.get('phone') || '';

  const [otp, setOtp] = useState(new Array(6).fill(''));
  const [expireTime, setExpireTime] = useState(300); // 5 minutes for both email and phone
  const [resendCooldown, setResendCooldown] = useState(60); // 60 seconds cooldown
  const [attemptsRemaining, setAttemptsRemaining] = useState(5);
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(false);

  const inputRefs = useRef([]);

  // Auto-redirect if no context
  useEffect(() => {
    if (!email && !phone) {
      toast.error('Invalid request context. Starting over.');
      navigate('/forgot-password');
    }
  }, [email, phone, navigate]);

  // Expire timer decrement
  useEffect(() => {
    if (expireTime <= 0) return;
    const timer = setInterval(() => {
      setExpireTime((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [expireTime]);

  // Resend cooldown timer decrement
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleChange = (element, index) => {
    const value = element.value;
    if (isNaN(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1); // take the last char
    setOtp(newOtp);

    // Auto-focus next box
    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    // Backspace logic to delete and move back
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1].focus();
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim();
    if (pasteData.length === 6 && /^\d+$/.test(pasteData)) {
      const pasteOtp = pasteData.split('');
      setOtp(pasteOtp);
      inputRefs.current[5].focus();
    }
  };

  const formatTimer = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (locked) {
      toast.error('Verification locked. Please request a new code.');
      return;
    }
    if (expireTime <= 0) {
      toast.error('Verification code expired. Please request a new code.');
      return;
    }

    const code = otp.join('');
    if (code.length !== 6) return;

    setLoading(true);
    try {
      await api.post('/auth/verify-reset-otp', { 
        email: email || undefined, 
        phone: phone || undefined, 
        otp: code 
      });
      toast.success('Code verified successfully.');
      if (email) {
        navigate(`/reset-password?email=${encodeURIComponent(email)}`);
      } else {
        navigate(`/reset-password?phone=${encodeURIComponent(phone)}`);
      }
    } catch (error) {
      const serverErr = error.response?.data;
      if (serverErr?.message?.includes('locked')) {
        setLocked(true);
        setAttemptsRemaining(0);
      } else {
        setAttemptsRemaining((prev) => {
          const nextVal = prev > 1 ? prev - 1 : 0;
          if (nextVal === 0) setLocked(true);
          return nextVal;
        });
      }
      toast.error(serverErr?.message || 'Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    try {
      const res = await api.post('/auth/resend-reset-otp', { 
        email: email || undefined, 
        phone: phone || undefined 
      });
      toast.success(res.data?.message || 'A new verification code has been sent.');
      setOtp(new Array(6).fill(''));
      setExpireTime(300);
      setResendCooldown(60);
      setAttemptsRemaining(5);
      setLocked(false);
      inputRefs.current[0].focus();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isOtpComplete = otp.every((val) => val !== '');

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-primary py-12 px-4 sm:px-6 lg:px-8 bg-[url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center bg-no-repeat bg-blend-overlay bg-black/80 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle className="w-10 h-10" />
      </div>
      <div className="max-w-md w-full space-y-8 backdrop-blur-md bg-surface-card/90 p-6 sm:p-10 rounded-2xl border border-border shadow-2xl">
        <div>
          <h2 className="mt-2 text-center text-2xl sm:text-4xl font-extrabold text-text-primary tracking-tight flex items-center justify-center gap-2.5 sm:gap-3 whitespace-nowrap">
            <ShieldCheck className="text-primary shrink-0 w-7 h-7 sm:w-9 sm:h-9" /> Verify Code
          </h2>
          <p className="mt-3 text-center text-sm text-text-secondary">
            Enter the 6-digit verification code sent to: <strong className="text-text-primary">{email || phone}</strong>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleVerify}>
          <div className="space-y-4">
            <div className="flex justify-center gap-2" onPaste={handlePaste}>
              {otp.map((data, index) => (
                <input
                  key={index}
                  type="text"
                  maxLength="1"
                  ref={(el) => (inputRefs.current[index] = el)}
                  value={data}
                  disabled={loading || locked || expireTime <= 0}
                  onChange={(e) => handleChange(e.target, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className="w-12 h-14 text-center text-2xl font-bold rounded-xl border border-border bg-surface-secondary text-text-primary focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all disabled:opacity-50"
                />
              ))}
            </div>

            <div className="flex justify-between items-center text-xs font-semibold px-1">
              <span className={expireTime <= 0 ? 'text-red-500 font-bold' : 'text-text-secondary'}>
                {expireTime > 0 ? `Code expires in: ${formatTimer(expireTime)}` : 'Code expired'}
              </span>
              <span className={attemptsRemaining <= 2 ? 'text-red-400 font-bold' : 'text-text-secondary'}>
                {locked ? 'Verification locked' : `Attempts remaining: ${attemptsRemaining}`}
              </span>
            </div>

            <Button
              type="submit"
              isLoading={loading}
              disabled={!isOtpComplete || locked || expireTime <= 0}
              className="w-full text-lg shadow-lg shadow-primary/20 bg-primary hover:bg-primary-hover text-[var(--btn-primary-text)] font-extrabold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Verify Code
            </Button>
          </div>
        </form>

        <div className="flex flex-col items-center gap-4 mt-6 pt-6 border-t border-border">
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0 || loading}
            className="flex items-center gap-2 text-sm font-bold text-primary hover:text-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {resendCooldown > 0 ? `Resend Code in ${resendCooldown}s` : 'Resend Code'}
          </button>

          <Link to="/forgot-password" className="font-bold text-text-secondary hover:text-text-primary transition-colors flex items-center gap-2 text-sm">
            <ArrowLeft size={16} /> Request New Code
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OtpVerification;
