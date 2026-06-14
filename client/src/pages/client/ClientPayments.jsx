import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { toast } from 'react-toastify';
import { FileText, CheckCircle2, X } from 'lucide-react';
import Button from '../../components/Button';
import ClientRenewModal from '../../components/ClientRenewModal';
import { calculateEndDate } from '../../utils/membership';

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
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

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

  const getLogoUrl = () => {
    const gymInfo = profile?.gym;
    if (!gymInfo?.billingInfo?.logo) return null;
    const backendUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace('/api', '');
    return `${backendUrl}${gymInfo.billingInfo.logo}`;
  };

  const getBalance = (p) => {
    if (p.remainingBalance !== undefined) return p.remainingBalance;
    if (p.amount === 0) return 0;
    const total = Number(p.invoiceAmount || p.amount) || 0;
    const paid = Number(p.totalPaid || p.paidAmount) || 0;
    return Math.max(0, total - paid);
  };

  const isPaymentCleared = (payment) => {
    if (!payment || payment.status !== 'partial' || !profile?.paymentHistory) return false;
    return profile.paymentHistory.some(p => 
      p.planId === payment.planId &&
      new Date(p.startDate).getTime() === new Date(payment.startDate).getTime() &&
      p.status === 'paid'
    );
  };

  const getStatusBadge = (payment) => {
    const status = typeof payment === 'object' ? payment.status : payment;
    if (!status || status === 'paid') return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-widest">PAID</span>;
    
    if (status === 'partial' && typeof payment === 'object') {
      if (isPaymentCleared(payment)) {
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-widest flex items-center justify-center gap-1 w-fit mx-auto">
            <CheckCircle2 size={10} className="text-emerald-400 shrink-0" />
            PARTIAL (CLEARED)
          </span>
        );
      }
    }
    
    if (status === 'partial') return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-widest">PARTIALLY</span>;
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase tracking-widest">OVERDUE</span>;
  };

  const getBillingPeriod = (payment) => {
    if (!payment.startDate) return null;
    try {
      const duration = payment.planDurationMonths || 1;
      const startDateObj = new Date(payment.startDate);
      const endDateStr = calculateEndDate(payment.startDate, duration);
      const endDateObj = new Date(endDateStr);
      return `${startDateObj.toLocaleDateString('en-GB').replace(/\//g, '-')} - ${endDateObj.toLocaleDateString('en-GB').replace(/\//g, '-')}`;
    } catch (e) {
      return null;
    }
  };

  if (loading || !profile) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const pendingPmt = getPendingPayment(profile);
  const gymInfo = profile.gym;

  return (
    <>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-text-primary tracking-tight">Payment Ledger</h1>
            <p className="text-text-secondary mt-2 text-base md:text-lg">View your past gym payments and clear outstanding balances.</p>
          </div>
          <div>
            <Button type="button" onClick={() => setShowRenewModal(true)} className="shadow-lg shadow-primary/20">
              {pendingPmt ? 'Pay Pending Dues' : 'Renew Membership'}
            </Button>
          </div>
        </div>

        {/* Payment History Ledger */}
        <div className="bg-surface-divider/80 rounded-2xl border border-border overflow-hidden shadow-2xl backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
              <thead>
                <tr className="bg-surface-divider/80 border-b border-border text-text-secondary text-[11px] font-black tracking-widest uppercase">
                  <th className="p-5">Receipt Info</th>
                  <th className="p-5">Plan</th>
                  <th className="p-5">Mode</th>
                  <th className="p-5 text-right">Plan Amount</th>
                  <th className="p-5 text-right">Paid Now</th>
                  <th className="p-5 text-right">Total Paid</th>
                  <th className="p-5 text-right">Remaining Balance</th>
                  <th className="p-5 text-center">Status</th>
                  <th className="p-5 text-center">Bill</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {!profile.paymentHistory || profile.paymentHistory.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-20 text-text-muted">
                      No payment records found.
                    </td>
                  </tr>
                ) : (
                  profile.paymentHistory.map((pmt) => (
                    <tr key={pmt._id || pmt.paymentId} className="hover:bg-surface-divider/80 transition-all group">
                      <td className="p-5">
                        <p className="font-bold text-text-primary text-sm">{pmt.paymentId || 'N/A'}</p>
                        <p className="text-[10px] text-text-muted mt-0.5">
                          {new Date(pmt.paymentDate || pmt.createdAt || pmt.date).toLocaleDateString('en-GB').replace(/\//g, '-')}
                        </p>
                      </td>
                      <td className="p-5">
                        <span className="text-text-secondary text-xs font-medium block">{pmt.planName || 'Custom'}</span>
                        {pmt.startDate && (() => {
                          const period = getBillingPeriod(pmt);
                          return period ? (
                            <span className="text-[10px] text-text-muted mt-0.5 block font-medium">
                              {period}
                            </span>
                          ) : null;
                        })()}
                      </td>
                      <td className="p-5">
                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${pmt.paymentMethod === 'cash' ? 'text-emerald-400 bg-emerald-400/5' : 'text-blue-400 bg-blue-400/5'}`}>
                          {pmt.paymentMethod || pmt.mode || 'cash'}
                        </span>
                      </td>
                      <td className="p-5 text-right text-text-primary font-bold text-sm">₹{pmt.invoiceAmount || pmt.amount || 0}</td>
                      <td className="p-5 text-right text-blue-400 font-bold text-sm">₹{pmt.paidNow || pmt.paidAmount || 0}</td>
                      <td className="p-5 text-right text-emerald-400 font-bold text-sm">₹{pmt.totalPaid || pmt.paidAmount || 0}</td>
                      <td className="p-5 text-right text-rose-500 font-bold text-sm">₹{pmt.remainingBalance !== undefined ? pmt.remainingBalance : (pmt.amount - (pmt.paidAmount || 0))}</td>
                      <td className="p-5 text-center">
                        {getStatusBadge(pmt)}
                        {pmt.status === 'partial' && !isPaymentCleared(pmt) && pmt.dueDate && (
                          <div className="mt-1 text-[10px] text-text-muted font-medium">
                            Due: {new Date(pmt.dueDate).toLocaleDateString('en-GB').replace(/\//g, '-')}
                          </div>
                        )}
                      </td>
                      <td className="p-5 text-center">
                        <button 
                          onClick={() => { setSelectedPayment(pmt); setShowReceiptModal(true); }}
                          className="p-2 rounded-lg text-text-secondary hover:text-primary hover:bg-primary/10 transition-all"
                          title="View Bill"
                        >
                          <FileText size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      <ClientRenewModal 
        isOpen={showRenewModal} 
        onClose={() => setShowRenewModal(false)} 
        profile={profile} 
        onSuccess={fetchProfile} 
      />

      {/* Receipt / Bill Modal */}
      {showReceiptModal && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-white text-gray-900 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 print-invoice-container my-8 relative">
            {/* Actions Header (Hidden in print) */}
            <div className="no-print p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">Invoice Preview</span>
              <div className="flex gap-2">
                <button 
                  onClick={() => window.print()} 
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-text-primary text-xs font-bold rounded-lg hover:brightness-95 transition-all shadow-sm"
                >
                  Print Invoice
                </button>
                <button 
                  onClick={() => setShowReceiptModal(false)} 
                  className="p-1.5 text-text-secondary hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-all"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Invoice Printable Body */}
            <div className="p-5 space-y-4">
              {/* Header: Gym Info */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-gray-200">
                <div className="flex items-center gap-2.5">
                  {getLogoUrl() ? (
                    <img 
                      src={getLogoUrl()} 
                      alt={gymInfo?.gymName || "Gym Logo"} 
                      className="w-12 h-12 object-contain rounded-lg border border-gray-100" 
                    />
                  ) : (
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center font-black text-primary text-lg">
                      {(gymInfo?.gymName || "G").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h2 className="text-lg font-black uppercase tracking-tight text-gray-900">{gymInfo?.gymName || "Gym Workspace"}</h2>
                    <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider">Gym ID: {gymInfo?.gymId || "N/A"}</p>
                  </div>
                </div>
                
                <div className="text-left sm:text-right text-[11px] text-gray-600 space-y-0.5">
                  <p className="font-bold text-gray-900">Address:</p>
                  <p className="max-w-[200px] leading-snug whitespace-pre-line">{gymInfo?.billingInfo?.addressOnBill || gymInfo?.address || "Address details"}</p>
                  {gymInfo?.billingInfo?.helpContact && (
                    <p className="font-medium">Support: +91 {gymInfo.billingInfo.helpContact}</p>
                  )}
                  {(gymInfo?.billingInfo?.gst || gymInfo?.gst) && (
                    <p className="font-bold text-primary">GSTIN: {gymInfo?.billingInfo?.gst || gymInfo?.gst}</p>
                  )}
                </div>
              </div>

              {/* Middle Section: Meta & Client details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4 border-b border-gray-200 text-xs">
                <div>
                  <h4 className="font-black text-text-secondary uppercase tracking-widest mb-1 text-[9px]">Billed To (Client Details)</h4>
                  <p className="font-bold text-gray-900 text-sm">{profile.personalInfo?.name}</p>
                  <p className="text-text-muted font-medium mt-0.5">Client ID: {profile.clientId}</p>
                </div>
                <div className="text-left sm:text-right">
                  <h4 className="font-black text-text-secondary uppercase tracking-widest mb-1 text-[9px]">Invoice Info</h4>
                  <p className="font-bold text-gray-900">Invoice No: {selectedPayment.paymentId}</p>
                  <p className="text-text-muted font-medium mt-0.5">Date: {new Date(selectedPayment.paymentDate || selectedPayment.createdAt || selectedPayment.date).toLocaleDateString('en-GB').replace(/\//g, '-')}</p>
                  <p className="mt-1">{getStatusBadge(selectedPayment)}</p>
                </div>
              </div>

              {/* Subscription Details Table */}
              <div className="space-y-2">
                <h4 className="text-[9px] font-black text-text-secondary uppercase tracking-widest">Membership Details</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-text-muted font-bold uppercase tracking-wider border-b border-gray-200">
                        <th className="p-2.5">Plan Name / Description</th>
                        <th className="p-2.5 text-center">Payment Method</th>
                        <th className="p-2.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-100 text-gray-800">
                        <td className="p-2.5 font-semibold">
                          {selectedPayment.planName} Subscription
                          {selectedPayment.startDate && (
                            <span className="block text-[10px] text-text-muted font-normal mt-0.5">
                              Period: {new Date(selectedPayment.startDate).toLocaleDateString('en-GB').replace(/\//g, '-')} to {selectedPayment.dueDate ? new Date(selectedPayment.dueDate).toLocaleDateString('en-GB').replace(/\//g, '-') : 'Expiry'}
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-center font-bold uppercase tracking-wider text-slate-700">
                          {selectedPayment.paymentMethod === 'cash' ? 'Cash' : 'Online'}
                        </td>
                        <td className="p-2.5 text-right font-black text-gray-900">
                          ₹{selectedPayment.paidNow || selectedPayment.paidAmount || 0}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment Summary */}
              {(() => {
                const paidNow = selectedPayment.paidNow || selectedPayment.paidAmount || 0;
                const planAmt = selectedPayment.invoiceAmount || selectedPayment.amount || 0;
                const showSummary = paidNow < planAmt;
                if (!showSummary) return null;
                return (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1.5 text-xs">
                    <h4 className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">Payment Summary</h4>
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">Plan Amount:</span>
                      <span className="font-bold text-gray-900">₹{planAmt}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">Paid Now:</span>
                      <span className="font-bold text-blue-600">₹{paidNow}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">Total Paid:</span>
                      <span className="font-bold text-emerald-600">₹{selectedPayment.totalPaid || selectedPayment.paidAmount || 0}</span>
                    </div>
                    <div className="flex justify-between pt-1.5 border-t border-amber-300">
                      <span className="text-gray-800 font-bold">Balance Due:</span>
                      <span className="font-black text-rose-600">₹{selectedPayment.remainingBalance !== undefined ? selectedPayment.remainingBalance : getBalance(selectedPayment)}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Footer: Greetings & Regards */}
              <div className="pt-4 border-t border-gray-200 text-center space-y-2">
                {gymInfo?.billingInfo?.greetingText && (
                  <p className="text-[11px] text-text-muted font-medium italic">"{gymInfo.billingInfo.greetingText}"</p>
                )}
                <div className="text-[10px] text-text-secondary">
                  <p className="font-bold text-gray-900">{gymInfo?.billingInfo?.regards || `Regards, Team ${gymInfo?.gymName || 'GymPro'}`}</p>
                  <p className="mt-0.5 font-medium">Thank you for your business!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ClientPayments;
