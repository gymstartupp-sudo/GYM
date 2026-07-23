import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import Button from '../components/Button';
import PasswordInput from '../components/PasswordInput';
import ThemeToggle from '../components/ThemeToggle';
import { LogIn, ChevronDown, Check } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../utils/api';

const CustomPortalDropdown = ({ selectedGym, onSelect, gyms }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const formatGymLabel = (g) => {
        if (!g) return '-- Choose Gym / Portal --';
        const gymIdPrefix = g.gymId && g.gymId !== 'admin' ? `${g.gymId}:` : '';
        const roleLabel = g.role === 'client' ? 'Member' : g.role === 'owner' ? 'Owner' : 'Super Admin';
        return `${gymIdPrefix}${g.gymName} (${roleLabel})`;
    };

    return (
        <div ref={ref} className="relative w-full">
            <button
                type="button"
                onClick={() => setOpen(prev => !prev)}
                className="input-field w-full bg-surface-card border border-border text-text-primary rounded-lg p-3 flex items-center justify-between cursor-pointer focus:ring-primary focus:border-primary font-bold text-left shadow-sm"
            >
                <span className="truncate">{selectedGym ? formatGymLabel(selectedGym) : '-- Choose Gym / Portal --'}</span>
                <ChevronDown
                    size={18}
                    className={`shrink-0 transition-transform duration-200 text-primary ${open ? 'rotate-180' : ''}`}
                />
            </button>

            {open && (
                <div className="absolute top-full mt-1 left-0 w-full z-50 bg-surface-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 max-h-60 overflow-y-auto">
                    {gyms.map((g) => {
                        const isSelected = selectedGym && selectedGym.gymId === g.gymId && selectedGym.role === g.role;
                        const labelText = formatGymLabel(g);
                        return (
                            <button
                                key={`${g.gymId}-${g.role}`}
                                type="button"
                                onClick={() => { onSelect(g); setOpen(false); }}
                                className={`w-full flex items-center justify-between gap-2 px-4 py-3 text-sm text-left transition-colors font-bold ${
                                    isSelected
                                        ? 'bg-primary text-black'
                                        : 'text-text-primary hover:bg-primary hover:text-black'
                                }`}
                            >
                                <span className="truncate">{labelText}</span>
                                {isSelected && <Check size={16} className="shrink-0 text-black font-extrabold" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const LoginPage = () => {
    const [formData, setFormData] = useState({});
    const [errors, setErrors] = useState({});
    const { login } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(false);

    // Step state for multi-step login flow
    const [step, setStep] = useState('loginId');
    const [gyms, setGyms] = useState([]);
    const [selectedGym, setSelectedGym] = useState(null);
    const [loadingGyms, setLoadingGyms] = useState(false);

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

    const handleFindGyms = async () => {
        const loginId = (formData.loginId || '').trim();
        if (!loginId) {
            setErrors({ loginId: 'Please enter your email or phone number' });
            return;
        }

        const loginIdError = validateLoginId(loginId);
        if (loginIdError) {
            setErrors({ loginId: loginIdError });
            return;
        }

        setErrors({});
        setLoadingGyms(true);
        try {
            const res = await api.post('/auth/find-gyms', { loginId });
            const foundGyms = res.data.gyms;
            setGyms(foundGyms);

            if (foundGyms.length === 1) {
                setSelectedGym(foundGyms[0]);
                setStep('password');
            } else if (foundGyms.length > 1) {
                setStep('selectGym');
            }
        } catch (error) {
            if (!error.response) {
                toast.error("Network error: Server is unreachable. Please try again.");
            } else if (error.response.status === 404) {
                setErrors({ loginId: "No account found matching this email or phone number" });
            } else {
                toast.error(error.response.data?.message || "An error occurred");
            }
        } finally {
            setLoadingGyms(false);
        }
    };

    const handleBackToLoginId = () => {
        setFormData(prev => ({ ...prev, password: '' }));
        setSelectedGym(null);
        setGyms([]);
        setStep('loginId');
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        if (step === 'loginId') {
            handleFindGyms();
        } else if (step === 'selectGym') {
            if (selectedGym) setStep('password');
        } else if (step === 'password') {
            handleSubmit();
        }
    };

    const handleSubmit = async () => {
        const loginId = (formData.loginId || '').trim();
        const newErrors = {};

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
            const res = await api.post('/auth/login', { 
                loginId, 
                password: formData.password,
                gymId: selectedGym?.gymId,
                role: selectedGym?.role
            });
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

                <form className="mt-8 space-y-6" onSubmit={handleFormSubmit} noValidate>
                    {step === 'loginId' && (
                        <div className="space-y-4 animate-in fade-in duration-300">
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
                            <Button
                                type="submit"
                                isLoading={loadingGyms}
                                className="w-full text-lg shadow-lg shadow-primary/20"
                            >
                                Next
                            </Button>
                        </div>
                    )}

                    {step === 'selectGym' && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
                                    Multiple Accounts Found
                                </label>
                                <p className="text-xs text-text-muted mb-3 leading-relaxed">
                                    Please select which gym or portal account you want to access:
                                </p>
                                <CustomPortalDropdown
                                    selectedGym={selectedGym}
                                    onSelect={(g) => setSelectedGym(g)}
                                    gyms={gyms}
                                />
                            </div>
                            <div className="flex gap-3">
                                <Button
                                    type="button"
                                    onClick={handleBackToLoginId}
                                    variant="secondary"
                                    className="flex-1 text-sm font-bold py-2.5"
                                >
                                    Back
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={!selectedGym}
                                    className="flex-1 text-lg shadow-lg shadow-primary/20"
                                >
                                    Continue
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 'password' && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            {selectedGym && (
                                <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 text-center">
                                    <p className="text-[9px] font-black text-primary uppercase tracking-widest">Accessing Portal</p>
                                    <p className="text-base font-extrabold text-text-primary mt-0.5">{selectedGym.gymName}</p>
                                    {selectedGym.gymId && selectedGym.gymId !== 'admin' && (
                                        <p className="text-[11px] font-bold text-amber-500 tracking-wider mt-0.5">Gym ID: {selectedGym.gymId}</p>
                                    )}
                                    <p className="text-[10px] text-text-secondary uppercase tracking-wider mt-0.5">
                                        Role: {selectedGym.role === 'client' ? 'Gym Member' : selectedGym.role === 'owner' ? 'Owner Admin' : 'Super Admin'}
                                    </p>
                                </div>
                            )}
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
                            <div className="flex gap-3">
                                <Button
                                    type="button"
                                    onClick={() => {
                                        if (gyms.length > 1) {
                                            setStep('selectGym');
                                        } else {
                                            handleBackToLoginId();
                                        }
                                    }}
                                    variant="secondary"
                                    className="flex-1 text-sm font-bold py-2.5"
                                >
                                    Back
                                </Button>
                                <Button
                                    type="submit"
                                    isLoading={loading}
                                    className="flex-1 text-lg shadow-lg shadow-primary/20"
                                >
                                    Login
                                </Button>
                            </div>
                        </div>
                    )}
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
