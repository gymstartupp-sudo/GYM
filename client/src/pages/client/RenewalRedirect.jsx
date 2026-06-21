import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const RenewalRedirect = () => {
  const { clientId } = useParams();
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    if (user && role === 'client') {
      navigate('/client?renew=true', { replace: true });
    } else if (user && role === 'owner') {
      navigate('/owner/dues', { replace: true });
    } else {
      navigate(`/login?redirect=/client/renew/${clientId}`, { replace: true });
    }
  }, [user, role, loading, clientId, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-primary">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
};

export default RenewalRedirect;
