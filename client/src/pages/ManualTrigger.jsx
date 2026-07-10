import React, { useState } from 'react';
import api from '../utils/api';
import { toast } from 'react-toastify';
import { FiPlay, FiCheckCircle, FiAlertCircle, FiLoader } from 'react-icons/fi';

const ManualTrigger = () => {
  const [loading, setLoading] = useState(false);

  const handleTrigger = async () => {
    try {
      setLoading(true);
      const res = await api.post('/trigger/reminders');
      
      if (res.data.success) {
        toast.success(res.data.message || 'Reminder job executed successfully!');
      } else {
        toast.error(res.data.message || 'Failed to execute reminder job.');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error triggering reminder job. Check console.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-primary p-6 md:p-10 flex flex-col items-center justify-center">
      <div className="bg-surface-secondary border border-border-primary rounded-xl shadow-xl p-8 max-w-lg w-full text-center">
        <div className="mx-auto w-16 h-16 bg-primary/10 text-primary flex items-center justify-center rounded-full mb-6">
          <FiPlay size={32} className={loading ? "animate-pulse" : ""} />
        </div>
        
        <h1 className="text-2xl font-bold text-text-primary mb-2">
          Manual Job Trigger
        </h1>
        <p className="text-text-secondary mb-8">
          Click the button below to manually execute the daily WhatsApp expiry reminders job for all clients.
        </p>

        <button
          onClick={handleTrigger}
          disabled={loading}
          className={`w-full py-4 px-6 rounded-lg font-bold text-white uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2
            ${loading 
              ? 'bg-primary/50 cursor-not-allowed' 
              : 'bg-primary hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98]'
            }`}
        >
          {loading ? (
            <>
              <FiLoader className="animate-spin" size={20} />
              Running Job...
            </>
          ) : (
            <>
              <FiPlay size={20} />
              Run Reminder Job
            </>
          )}
        </button>

        <div className="mt-8 text-left bg-surface-primary p-4 rounded-lg border border-border-primary">
          <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <FiAlertCircle className="text-primary" /> How it works
          </h3>
          <ul className="text-xs text-text-secondary space-y-2">
            <li className="flex gap-2">
              <FiCheckCircle className="text-emerald-500 shrink-0 mt-0.5" />
              <span>Checks all active clients for expiring or expired memberships.</span>
            </li>
            <li className="flex gap-2">
              <FiCheckCircle className="text-emerald-500 shrink-0 mt-0.5" />
              <span>Sends WhatsApp messages via Twilio for 3 days left or expired status.</span>
            </li>
            <li className="flex gap-2">
              <FiCheckCircle className="text-emerald-500 shrink-0 mt-0.5" />
              <span>Logs the complete execution details in the backend console.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ManualTrigger;
