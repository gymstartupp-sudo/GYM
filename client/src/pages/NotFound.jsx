import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { AlertTriangle, Home, ArrowLeft } from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();

  const handleBackToDashboard = () => {
    if (!user) {
      navigate('/');
      return;
    }

    if (role === 'owner') {
      navigate('/owner/dashboard');
    } else if (role === 'client') {
      navigate('/client');
    } else if (role === 'superadmin' || role === 'developer') {
      navigate('/admin');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-surface-primary flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center bg-surface-card border border-border rounded-2xl p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="w-20 h-20 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center mx-auto text-primary">
          <AlertTriangle size={42} className="animate-pulse" />
        </div>

        <div className="space-y-2">
          <h1 className="text-6xl font-black text-primary tracking-tight">404</h1>
          <h2 className="text-xl font-bold text-text-primary">Page Not Found</h2>
          <p className="text-sm text-text-secondary">
            The page you are looking for doesn't exist, has been removed, or is temporarily unavailable.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => navigate(-1)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-surface-primary hover:bg-surface-secondary border border-border text-text-primary rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Go Back</span>
          </button>

          <button
            onClick={handleBackToDashboard}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary/90 text-black font-bold rounded-xl text-sm transition-all duration-200 shadow-lg shadow-primary/20 cursor-pointer"
          >
            <Home size={16} />
            <span>{user ? 'Dashboard' : 'Home'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
