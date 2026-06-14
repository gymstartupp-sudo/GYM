import React, { useState } from 'react';
import GymRegister from './GymRegister';
import ClientRegister from './ClientRegister';

const RegisterPage = () => {
    const [role, setRole] = useState('owner');

    return (
        <div className="min-h-screen relative pt-6 bg-surface-primary">
            <div className="flex justify-center z-20 relative px-4">
                <div className="flex bg-surface-secondary rounded-lg p-1.5 border border-border w-full max-w-sm">
                    <button 
                        onClick={() => setRole('owner')} 
                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${role === 'owner' ? 'bg-primary text-text-primary shadow-lg' : 'text-text-secondary hover:text-text-primary'}`}
                    >
                        Gym Owner
                    </button>
                    <button 
                        onClick={() => setRole('client')} 
                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${role === 'client' ? 'bg-primary text-text-primary shadow-lg' : 'text-text-secondary hover:text-text-primary'}`}
                    >
                        Client
                    </button>
                </div>
            </div>

            <div className="relative -mt-16">
                {role === 'owner' ? <GymRegister /> : <ClientRegister />}
            </div>
        </div>
    );
};

export default RegisterPage;
