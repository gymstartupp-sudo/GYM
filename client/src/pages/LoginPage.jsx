import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import Button from '../components/Button';
import PasswordInput from '../components/PasswordInput';
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
                className="input-field w-full bg-surface-card border border-border hover:border-primary/50 text-text-primary rounded-lg p-3 flex items-center justify-between cursor-pointer focus:ring-primary focus:border-primary font-bold text-left shadow-sm transition-colors duration-200"
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
                                className={`w-full flex items-center justify-between gap-2 px-4 py-3 text-sm text-left transition-colors font-bold hover:bg-primary hover:text-black ${
                                    isSelected
                                        ? 'text-primary'
                                        : 'text-text-primary'
                                }`}
                            >
                                <span className="truncate">{labelText}</span>
                                {isSelected && <Check size={16} className="shrink-0 font-extrabold" />}
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

    // Gym matching state for dynamic lookup
    const [gyms, setGyms] = useState([]);
    const [selectedGym, setSelectedGym] = useState(null);
    const [loadingGyms, setLoadingGyms] = useState(false);
    const [fetchedLoginId, setFetchedLoginId] = useState('');

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

    const triggerGymsFetch = async (id) => {
        const trimmed = (id || '').trim();
        if (!trimmed) return;
        if (validateLoginId(trimmed) !== '') return;
        if (trimmed === fetchedLoginId) return;

        setFetchedLoginId(trimmed);
        setLoadingGyms(true);
        try {
            const res = await api.post('/auth/find-gyms', { loginId: trimmed });
            const foundGyms = res.data.gyms;
            setGyms(foundGyms);
            if (foundGyms.length === 1) {
                setSelectedGym(foundGyms[0]);
            } else if (foundGyms.length > 1) {
                const savedGymStr = localStorage.getItem('lastLoginGym');
                let matchedGym = null;
                if (savedGymStr) {
                    try {
                        const savedGym = JSON.parse(savedGymStr);
                        matchedGym = foundGyms.find(g => g.gymId === savedGym.gymId && g.role === savedGym.role);
                    } catch (e) {
                        console.error("Error parsing saved gym", e);
                    }
                }

                if (matchedGym) {
                    setSelectedGym(matchedGym);
                } else {
                    setSelectedGym(null);
                }
            } else {
                setSelectedGym(null);
            }
            // Clear any previous error on loginId
            setErrors(prev => {
                const next = { ...prev };
                delete next.loginId;
                return next;
            });
        } catch (error) {
            setGyms([]);
            setSelectedGym(null);
            // Silently swallow search/not-found errors to keep layout clean.
            // Errors will be reported properly when user tries to click Login.
            if (error.response && error.response.status !== 404) {
                toast.error(error.response?.data?.message || "An error occurred fetching accounts");
            }
        } finally {
            setLoadingGyms(false);
        }
    };

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

            // Reset matching state if user changes input
            if (newValue.trim() !== fetchedLoginId) {
                setGyms([]);
                setSelectedGym(null);
                setFetchedLoginId('');
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
            } else if (name === 'loginId') {
                // Auto trigger fetch when login ID is valid
                const trimmed = newValue.trim();
                if (isPhone(trimmed)) {
                    if (trimmed.length === 10) {
                        triggerGymsFetch(trimmed);
                    }
                } else if (isValidEmail(trimmed)) {
                    triggerGymsFetch(trimmed);
                }
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
            if (name === 'loginId') {
                triggerGymsFetch(trimmed);
            }
        }
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        
        const loginId = (formData.loginId || '').trim();
        if (!loginId) {
            setErrors(prev => ({ ...prev, loginId: 'Please enter your email or phone number' }));
            return;
        }

        const loginIdError = validateLoginId(loginId);
        if (loginIdError) {
            setErrors(prev => ({ ...prev, loginId: loginIdError }));
            return;
        }

        // If we haven't fetched gyms yet or if it is currently loading, fetch them first
        if (!fetchedLoginId || fetchedLoginId !== loginId) {
            setLoadingGyms(true);
            try {
                const res = await api.post('/auth/find-gyms', { loginId });
                const foundGyms = res.data.gyms;
                setGyms(foundGyms);
                setFetchedLoginId(loginId);
                
                if (foundGyms.length === 1) {
                    const singleGym = foundGyms[0];
                    setSelectedGym(singleGym);
                    await executeLogin(loginId, formData.password, singleGym);
                } else if (foundGyms.length > 1) {
                    const savedGymStr = localStorage.getItem('lastLoginGym');
                    let matchedGym = null;
                    if (savedGymStr) {
                        try {
                            const savedGym = JSON.parse(savedGymStr);
                            matchedGym = foundGyms.find(g => g.gymId === savedGym.gymId && g.role === savedGym.role);
                        } catch (e) {}
                    }

                    if (matchedGym) {
                        setSelectedGym(matchedGym);
                        await executeLogin(loginId, formData.password, matchedGym);
                    } else {
                        setSelectedGym(null);
                        setErrors(prev => ({ ...prev, gym: 'Please select a gym from the dropdown' }));
                        toast.warn("Multiple accounts found. Please select your gym.");
                    }
                } else {
                    setSelectedGym(null);
                }
            } catch (error) {
                setGyms([]);
                setSelectedGym(null);
                if (error.response && error.response.status === 404) {
                    setErrors(prev => ({ ...prev, loginId: "No account found matching this email or phone number" }));
                } else {
                    toast.error(error.response?.data?.message || "An error occurred");
                }
            } finally {
                setLoadingGyms(false);
            }
            return;
        }

        // If multiple gyms are found but user hasn't selected one
        if (gyms.length > 1 && !selectedGym) {
            setErrors(prev => ({ ...prev, gym: 'Please select a gym from the dropdown' }));
            toast.warn("Please select a gym from the dropdown");
            return;
        }

        // Proceed to submit
        await executeLogin(loginId, formData.password, selectedGym);
    };

    const executeLogin = async (loginId, password, gym) => {
        const newErrors = {};

        if (!password) {
            newErrors.password = 'Please enter your password';
        } else {
            const pwError = validatePassword(password);
            if (pwError) newErrors.password = pwError;
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(prev => ({ ...prev, ...newErrors }));
            return;
        }

        setErrors(prev => {
            const next = { ...prev };
            delete next.password;
            delete next.gym;
            return next;
        });
        setLoading(true);
        try {
            const res = await api.post('/auth/login', { 
                loginId, 
                password,
                gymId: gym?.gymId,
                role: gym?.role
            });
            const { token, role, data } = res.data;

            const roleForApp = role === 'superadmin' ? 'superadmin' : role;
            login(token, roleForApp, data);

            if (gym) {
                localStorage.setItem('lastLoginGym', JSON.stringify({ gymId: gym.gymId, role: gym.role }));
            }

            const redirectUrl = searchParams.get('redirect');
            if (redirectUrl) {
                navigate(redirectUrl, { replace: true });
            } else if (role === 'owner') navigate('/owner');
            else if (role === 'client') navigate('/client');
            else navigate('/admin');

            if (role === 'client') {
                const name = data?.personalInfo?.name || 'Member';
                toast.success(`Welcome ${name}`);
            } else {
                toast.success("Welcome Back!");
            }
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
        <div className="dark min-h-screen flex items-center justify-center bg-surface-primary py-12 px-4 sm:px-6 lg:px-8 bg-[url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center bg-no-repeat bg-blend-overlay bg-black/80 relative">
            <div className="max-w-md w-full space-y-8 backdrop-blur-md bg-surface-card/90 p-10 rounded-2xl border border-border shadow-2xl">
                <div>
                    <h2 className="mt-2 text-center text-4xl font-extrabold text-text-primary tracking-tight flex items-center justify-center gap-3">
                        <LogIn className="text-primary" size={36} />Welcome
                    </h2>
                    <p className="mt-3 text-center text-sm text-text-secondary">Log in to your portal</p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleFormSubmit} noValidate>
                    <div className="space-y-4">
                        <div className="relative">
                            <input
                                name="loginId"
                                value={formData.loginId || ''}
                                placeholder="Email or Phone Number"
                                onChange={handleChange}
                                onBlur={handleBlur}
                                required
                                className={`input-field pr-4 hover:border-primary/50 ${errors.loginId ? 'border-red-500/80 focus:ring-red-500/30' : 'focus:border-primary focus:ring-primary'}`}
                                maxLength="25"
                            />
                            <div className="min-h-[20px] mt-1">
                                {errors.loginId && <p className="text-red-500 text-xs font-medium leading-tight">{errors.loginId}</p>}
                            </div>
                        </div>

                        {gyms.length > 1 && (
                            <div className="space-y-2 animate-in fade-in duration-300">
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider">
                                    Select Gym / Portal
                                </label>
                                <CustomPortalDropdown
                                    selectedGym={selectedGym}
                                    onSelect={(g) => {
                                        setSelectedGym(g);
                                        setErrors(prev => {
                                            const next = { ...prev };
                                            delete next.gym;
                                            return next;
                                        });
                                    }}
                                    gyms={gyms}
                                />
                                <div className="min-h-[20px] mt-1">
                                    {errors.gym && <p className="text-red-500 text-xs font-medium leading-tight">{errors.gym}</p>}
                                </div>
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
                                className={`input-field w-full hover:border-primary/50 ${errors.password ? 'border-red-500/80 focus:ring-red-500/30' : 'focus:border-primary focus:ring-primary'}`}
                                maxLength="20"
                            />
                            <div className="flex justify-between items-start mt-1">
                                <div className="min-h-[20px] flex-1">
                                    {errors.password && <p className="text-red-500 text-xs font-medium leading-tight">{errors.password}</p>}
                                </div>
                                <Link 
                                    to="/forgot-password" 
                                    className="text-xs text-primary hover:text-primary-hover font-bold transition-colors block ml-2 h-5"
                                >
                                    Forgot Password?
                                </Link>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            isLoading={loading}
                            className="w-full text-lg shadow-lg shadow-primary/20 bg-primary hover:bg-primary-hover text-[var(--btn-primary-text)] font-extrabold"
                        >
                            Login to Platform
                        </Button>
                    </div>
                </form>

                <div className="flex justify-between text-sm mt-6 pt-6 border-t border-border">
                    <span className="text-text-secondary">Don't have an account?</span>
                    <div className="flex gap-4">
                        <Link to="/register" className="font-bold text-primary hover:text-primary-hover transition-colors">Register as Gym or Client</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
