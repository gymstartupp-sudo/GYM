import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'react-toastify';
import { Menu, X } from 'lucide-react';
import Button from '../../components/Button';
import ClientSidebar from '../../components/ClientSidebar';
import ClientRenewModal from '../../components/ClientRenewModal';

const getPendingPayment = (clientDoc) => {
  if (!clientDoc || !clientDoc.paymentHistory || clientDoc.paymentHistory.length === 0) return null;

  const sortedPayments = [...clientDoc.paymentHistory].sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));

  const seenWindows = new Set();
  let pendingPayment = null;

  for (const p of sortedPayments) {
    const startDateStr = p.startDate ? new Date(p.startDate).toISOString().split('T')[0] : '';
    const windowKey = `${p.planId}_${startDateStr}`;

    if (seenWindows.has(windowKey)) continue;
    seenWindows.add(windowKey);

    if (p.status !== 'paid') {
      pendingPayment = p;
      break;
    }
  }
  return pendingPayment;
};

const ClientPayments = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) {
        setIsSidebarOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/client/profile');
      setProfile(res.data.data);
    } catch (error) {
      toast.error('Failed to load payments ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  if (loading || !profile) {
    return (
      <div className={`flex bg-dark h-screen overflow-hidden text-white ${isMobile ? 'flex-col' : 'flex-row'}`}>
        {isMobile && (
          <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 z-40 shrink-0">
            <span className="text-white font-bold text-base tracking-tight">GymPro</span>
          </header>
        )}
        <ClientSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} isMobile={isMobile} />
        <div className="flex-1 flex justify-center items-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  const pendingPmt = getPendingPayment(profile);

  return (
    <div className={`flex bg-dark h-screen overflow-hidden ${isMobile ? 'flex-col' : 'flex-row'}`}>
      {/* MOBILE HEADER BAR */}
      {isMobile && (
        <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 z-40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent flex justify-center items-center font-bold text-sm text-white shadow-md">
              {user?.avatar || 'C'}
            </div>
            <div>
              <span className="text-white font-bold text-base tracking-tight truncate max-w-[120px] inline-block">{user?.personalInfo?.name}</span>
              <span className="text-xs text-gray-500 block -mt-1 uppercase tracking-wider truncate max-w-[120px]">{user?.gymName}</span>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 border border-gray-700 rounded-lg text-white hover:bg-gray-800 transition-colors"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </header>
      )}

      {/* MOBILE DRAWER BACKDROP */}
      {isMobile && isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-45 transition-opacity"
        />
      )}

      <ClientSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} isMobile={isMobile} />

      <div className="flex-1 overflow-y-auto p-4 md:p-8 md:pt-10 space-y-8 scrollbar-hide">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">Payment Ledger</h1>
            <p className="text-gray-400 mt-2 text-base md:text-lg">View your past gym payments and clear outstanding balances.</p>
          </div>
          <div>
            <Button type="button" onClick={() => setShowRenewModal(true)} className="shadow-lg shadow-primary/20">
              {pendingPmt ? 'Pay Pending Dues' : 'Renew Membership'}
            </Button>
          </div>
        </div>

        {/* Payment History Ledger */}
        <div className="card space-y-6 bg-gray-900 border-gray-800 rounded-2xl p-6 md:p-8 shadow-xl">
          <h2 className="text-xl font-semibold text-white border-b border-gray-800 pb-4 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" /> Payment History
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-800">
                  <th className="p-4">Receipt No</th>
                  <th className="p-4">Plan Name</th>
                  <th className="p-4">Payment Method</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {!profile.paymentHistory || profile.paymentHistory.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-gray-500">
                      No payment records found.
                    </td>
                  </tr>
                ) : (
                  profile.paymentHistory.map((pmt) => (
                    <tr key={pmt._id || pmt.paymentId} className="hover:bg-gray-800/30 transition-colors text-sm text-gray-300">
                      <td className="p-4 font-semibold text-white">{pmt.paymentId || 'N/A'}</td>
                      <td className="p-4">{pmt.planName || 'Custom'}</td>
                      <td className="p-4 uppercase text-xs">{pmt.paymentMethod || 'cash'}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                          pmt.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                        }`}>
                          {pmt.status}
                        </span>
                      </td>
                      <td className="p-4">
                        {pmt.paymentDate ? new Date(pmt.paymentDate).toLocaleDateString('en-GB') : 'N/A'}
                      </td>
                      <td className="p-4 font-black text-white">₹{pmt.paidAmount?.toLocaleString('en-IN') || 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ClientRenewModal 
        isOpen={showRenewModal} 
        onClose={() => setShowRenewModal(false)} 
        profile={profile} 
        onSuccess={fetchProfile} 
      />
    </div>
  );
};

export default ClientPayments;
