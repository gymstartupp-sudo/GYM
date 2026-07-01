import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import Button from '../components/Button';
import PasswordInput from '../components/PasswordInput';
import ThemeToggle from '../components/ThemeToggle';
import { LogIn } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../utils/api';

const LoginPage = () => {
    const [formData, setFormData] = useState({});
    const [errors, setErrors] = useState({});
    const { login } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const reason = searchParams.get('reason');
        if (reason === 'suspended') {
            toast.error('Your account or associated gym has been suspended. Please contact the administrator.');
        } else if (reason === 'expired') {
            toast.error('Your session has expired. Please login again.');
        }
    }, [searchParams]);

    const isPhone = (val) => /^\d+$/.test(val);
    const isValidPhone = (val) => /^[6-9]\d{9}$/.test(val);
    const isValidEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) && val.length <= 50;

    const validateLoginId = (value) => {
        if (!value) return '';
        if (isPhone(value)) {
            if (value.length < 10) return 'Enter a valid 10-digit Indian mobile number';
            if (!isValidPhone(value)) return 'Enter a valid 10-digit Indian mobile number';
        } else {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address';
            if (value.length > 25) return 'Email cannot exceed 25 characters';
        }
        return '';
    };

    const validatePassword = (value) => {
        if (!value) return '';
        if (value.length > 20) return 'Password cannot exceed 20 characters';
        return '';
    };

    const isFormValid = useMemo(() => {
        const loginId = (formData.loginId || '').trim();
        const password = formData.password || '';
        if (!loginId || !password) return false;
        return validateLoginId(loginId) === '' && validatePassword(password) === '';
    }, [formData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        let newValue = value;

        if (name === 'loginId') {
            const firstChar = value.charAt(0);
            if (/\d/.test(firstChar)) {
                newValue = value.replace(/\D/g, '').slice(0, 10);
            } else if (/[a-zA-Z]/.test(firstChar)) {
                newValue = value.replace(/[^a-zA-Z0-9@._+\-]/g, '').slice(0, 25);
            }
        }

        if (name === 'password' && value.length > 20) return;

        setFormData(prev => ({ ...prev, [name]: newValue }));

        if (errors[name]) {
            setErrors(prev => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
        }

        if (newValue && newValue.trim()) {
            const errorMsg = name === 'loginId' ? validateLoginId(newValue) : validatePassword(newValue);
            if (errorMsg) {
                setErrors(prev => ({ ...prev, [name]: errorMsg }));
            }
        }
    };

    const handleBlur = (e) => {
        const { name, value } = e.target;
        const trimmed = (value || '').trim();
        if (!trimmed) return;
        const errorMsg = name === 'loginId' ? validateLoginId(trimmed) : validatePassword(trimmed);
        if (errorMsg) {
            setErrors(prev => ({ ...prev, [name]: errorMsg }));
        } else {
            setErrors(prev => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const loginId = (formData.loginId || '').trim();
        const newErrors = {};

        if (!loginId) {
            newErrors.loginId = 'Please enter your email or phone number';
        } else {
            const loginIdError = validateLoginId(loginId);
            if (loginIdError) newErrors.loginId = loginIdError;
        }

        if (!formData.password) {
            newErrors.password = 'Please enter your password';
        } else {
            const pwError = validatePassword(formData.password);
            if (pwError) newErrors.password = pwError;
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setErrors({});
        setLoading(true);
        try {
            const res = await api.post('/auth/login', { loginId, password: formData.password });
            const { token, role, data } = res.data;

            const roleForApp = role === 'superadmin' ? 'superadmin' : role;
            login(token, roleForApp, data);

            const redirectUrl = searchParams.get('redirect');
            if (redirectUrl) {
                navigate(redirectUrl, { replace: true });
            } else if (role === 'owner') navigate('/owner');
            else if (role === 'client') navigate('/client');
            else navigate('/admin');

            toast.success("Welcome Back!");
        } catch (error) {
            if (!error.response) {
                toast.error("Network error: Server is unreachable. Please try again.");
            } else {
                toast.error(error.response.data?.message || "Invalid credentials");
            }
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
                    <h2 className="mt-2 mr-2 text-center text-4xl font-extrabold text-text-primary tracking-tight flex items-center justify-center gap-3">
                        <LogIn className="text-primary" size={36} />Welcome
                    </h2>
                    <p className="mt-3 ml-8 text-center text-sm text-text-secondary">Log in to your portal</p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit} noValidate>
                    <div className="space-y-4">
                        <div>
                            <input
                                name="loginId"
                                value={formData.loginId || ''}
                                placeholder="Email or Phone Number"
                                onChange={handleChange}
                                onBlur={handleBlur}
                                required
                                className={`input-field ${errors.loginId ? 'border-red-500/80 focus:ring-red-500/30 text-red-200' : ''}`}
                                maxLength="25"
                            />
                            <div className="min-h-[20px] mt-1">
                                {errors.loginId && <p className="text-red-500 text-xs font-medium leading-tight">{errors.loginId}</p>}
                            </div>
                        </div>
                        <div>
                            <PasswordInput
                                name="password"
                                value={formData.password || ''}
                                placeholder="Password"
                                onChange={handleChange}
                                onBlur={handleBlur}
                                required
                                className={`input-field w-full ${errors.password ? 'border-red-500/80 focus:ring-red-500/30 text-red-200' : ''}`}
                                maxLength="20"
                            />
                            <div className="min-h-[20px] mt-1">
                                {errors.password && <p className="text-red-500 text-xs font-medium leading-tight">{errors.password}</p>}
                            </div>
                        </div>
                    </div>
                    <Button
                        type="submit"
                        isLoading={loading}
                        className="w-full text-lg shadow-lg shadow-primary/20"
                    >
                        Login to Platform
                    </Button>
                </form>

                <div className="flex justify-between text-sm mt-6 pt-6 border-t border-border">
                    <span className="text-text-secondary">Don't have an account?</span>
                    <div className="flex gap-4">
                        <Link to="/register" className="font-bold text-primary hover:text-success transition-colors">Register as Gym or Client</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
