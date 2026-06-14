import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import Button from '../components/Button';
import PasswordInput from '../components/PasswordInput';
import ThemeToggle from '../components/ThemeToggle';
import { LogIn } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../utils/api';

const LoginPage = () => {
    const [formData, setFormData] = useState({});
    const { login } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    // Removed handleGymIdBlur since the unified login no longer requires explicit client toggling and pre-fetching in this context

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Mobile validation if loginId looks like a phone number (numeric)
        const loginId = formData.loginId || '';
        if (/^\d+$/.test(loginId)) {
            if (!/^[6-9]\d{9}$/.test(loginId)) {
                return toast.error("Enter a valid 10-digit mobile number starting with 6-9");
            }
        }

        setLoading(true);
        try {
            const res = await api.post('/auth/login', { loginId, password: formData.password });
            const { token, role, data } = res.data;

            // Reconstruct logic based on provided role by the unified endpoint
            const roleForApp = role === 'superadmin' ? 'superadmin' : role;
            login(token, roleForApp, data);

            if (role === 'owner') navigate('/owner');
            else if (role === 'client') navigate('/client');
            else navigate('/admin');

            toast.success("Welcome Back!");
        } catch (error) {
            toast.error(error.response?.data?.message || "Invalid credentials");
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

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <input name="loginId" value={formData.loginId || ''} placeholder="Email or Phone Number" onChange={handleChange} required className="input-field" maxLength="50" />
                        <PasswordInput name="password" value={formData.password || ''} placeholder="Password" onChange={handleChange} required className="input-field w-full" maxLength="20" />
                    </div>
                    <Button type="submit" isLoading={loading} className="w-full text-lg shadow-lg shadow-primary/20">Login to Platform</Button>
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
