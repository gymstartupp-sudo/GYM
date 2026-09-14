import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../utils/api';
import Button from '../../components/Button';
import { Lock, Save, ShieldCheck } from 'lucide-react';

const AVAILABLE_TABS = [
  'Dashboard', 'Leads', 'Clients', 'Inactive Clients', 'Plans',
  'Clients Payment', 'Dues', 'Payment Ledger', 'Requests', 'Feedback', 'Staff', 'Custom Messages'
];

export default function AccessControl() {
  const [allowedTabs, setAllowedTabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAccessControl();
  }, []);

  const fetchAccessControl = async () => {
    try {
      const res = await api.get('/gym/access-control');
      setAllowedTabs(res.data.data || []);
    } catch (error) {
      toast.error('Failed to load access controls');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (tab) => {
    setAllowedTabs(prev =>
      prev.includes(tab)
        ? prev.filter(t => t !== tab)
        : [...prev, tab]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/gym/access-control', { allowedTabs });
      toast.success('Access controls updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update access controls');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 border-b border-border pb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-primary/10 rounded-xl">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Access Control</h1>
            <p className="text-text-secondary text-sm mt-1">Configure which tabs are available for the normal gym account login.</p>
          </div>
        </div>
      </div>

      <div className="bg-surface-secondary border border-border rounded-2xl overflow-hidden mb-8">
        <div className="p-5 border-b border-border bg-surface-card flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-text-secondary" />
            <h2 className="text-lg font-semibold text-text-primary">Allowed Features</h2>
          </div>
          <Button onClick={handleSave} isLoading={saving} className="gap-2">
            <Save size={16} />
            Save Changes
          </Button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {AVAILABLE_TABS.map(tab => {
            const isAllowed = allowedTabs.includes(tab);
            return (
              <label
                key={tab}
                className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-200 select-none ${isAllowed
                    ? 'bg-primary/5 border-primary/30 hover:border-primary/50'
                    : 'bg-surface-card border-border hover:border-slate-700'
                  }`}
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={isAllowed}
                  onChange={() => handleToggle(tab)}
                />
                <div className={`relative flex items-center justify-center w-5 h-5 rounded-md border transition-colors ${isAllowed ? 'bg-primary border-primary' : 'bg-transparent border-slate-600'
                  }`}>
                  {isAllowed && (
                    <svg className="w-3.5 h-3.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className={`font-medium text-sm ${isAllowed ? 'text-primary' : 'text-text-secondary'}`}>
                  {tab}
                </span>
              </label>
            );
          })}
        </div>
      </div>


    </div>
  );
}
