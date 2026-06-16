import React, { useState } from 'react';
import GymRegister from './GymRegister';
import ClientRegister from './ClientRegister';
import ThemeToggle from '../components/ThemeToggle';

const RegisterPage = () => {
    const [role, setRole] = useState('owner');

    return (
        <div className="min-h-screen flex flex-col items-center justify-start bg-[url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center bg-no-repeat bg-blend-overlay bg-black/80 py-12 px-4 relative">
            <div className="absolute top-4 right-4 z-30">
                <ThemeToggle className="w-10 h-10" />
            </div>

            <div className="flex justify-center z-20 relative w-full max-w-sm mb-8">
                <div className="flex backdrop-blur-md bg-surface-card/60 rounded-xl p-1.5 border border-border/50 w-full shadow-lg">
                    <button 
                        onClick={() => setRole('owner')} 
                        className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-300 ${role === 'owner' ? 'bg-primary text-text-primary shadow-lg shadow-primary/20 scale-105' : 'text-text-secondary hover:text-text-primary'}`}
                    >
                        Gym Owner
                    </button>
                    <button 
                        onClick={() => setRole('client')} 
                        className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-300 ${role === 'client' ? 'bg-primary text-text-primary shadow-lg shadow-primary/20 scale-105' : 'text-text-secondary hover:text-text-primary'}`}
                    >
                        Client
                    </button>
                </div>
            </div>

            <div className="w-full max-w-3xl flex justify-center z-10">
                {role === 'owner' ? <GymRegister /> : <ClientRegister />}
            </div>
        </div>
    );
};

export default RegisterPage;
