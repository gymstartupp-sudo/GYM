import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import Button from '../components/Button';
import ClientForm from '../components/ClientForm';

const ClientRegister = () => {
    const [successData, setSuccessData] = useState(null);

    const handleSuccess = (data) => {
        setSuccessData(data);
    };

    if (successData) {
        return (
            <div className="w-full max-w-lg relative z-10 backdrop-blur-md bg-surface-card/90 border border-border text-center py-10 px-8 rounded-2xl shadow-2xl">
                 <div className="flex justify-center mb-6">
                     <CheckCircle size={80} className="text-emerald-500" />
                 </div>
                 <h2 className="text-3xl font-bold text-text-primary mb-2">Account Created!</h2>
                 <p className="text-text-secondary font-medium mb-6">Your Gym: <span className="text-text-primary font-bold">{successData.gymName}</span></p>

                 <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mt-6 text-left mb-8">
                     <p className="text-yellow-400 font-medium text-sm">Your membership request has been sent to the gym owner for approval.</p>
                     <p className="text-text-secondary text-sm mt-1">Your Client ID will be generated after approval. You can log in once the owner activates your request.</p>
                 </div>
                 
                 <Link to="/login" className="block w-full">
                     <Button className="w-full text-lg py-3">Return to Login</Button>
                 </Link>
            </div>
        );
    }

    return (
        <div className="w-full max-w-3xl relative z-10 backdrop-blur-md bg-surface-card/90 border border-border p-8 rounded-2xl shadow-2xl">
            <h2 className="text-3xl font-bold text-center text-text-primary mb-8">Client Registration</h2>
            
            <ClientForm mode="self" onSuccess={handleSuccess} />

            <div className="mt-6 text-center text-text-secondary text-sm">
               Already a member? <Link to="/login" className="text-primary hover:underline ml-1">Login here</Link>
            </div>
        </div>
    );
};

export default ClientRegister;
