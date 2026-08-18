import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { toast } from 'react-toastify';
import { FileText, CheckCircle2, X, Download, Printer, Phone, Mail } from 'lucide-react';
import Button from '../../components/Button';
import ClientRenewModal from '../../components/ClientRenewModal';
import { calculateEndDate } from '../../utils/membership';
import Tooltip from '../../components/Tooltip';

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
  const [downloadingId, setDownloadingId] = useState(null);

  const downloadInvoice = async (payment) => {
    setDownloadingId(payment._id);
    try {
      const response = await api.get(`/payment/${payment._id}/pdf`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice_${payment.paymentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("Invoice downloaded successfully");
    } catch (err) {
      toast.error("Failed to download invoice");
    } finally {
      setDownloadingId(null);
    }
  };

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
    const logo = gymInfo?.gymLogo || gymInfo?.billingInfo?.logo;
    if (!logo) return null;
    if (logo.startsWith('http://') || logo.startsWith('https://')) {
      return logo;
    }
    const backendUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace('/api', '');
    return `${backendUrl}${logo}`;
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

  const getInvoicePeriod = (payment) => {
    if (!payment.startDate) return '—';
    const relatedM = profile.memberships?.find(m =>
      (m.planId?._id || m.planId)?.toString() === (payment.planId?._id || payment.planId)?.toString() &&
      new Date(m.startDate).getTime() === new Date(payment.startDate).getTime()
    ) || (
        (profile.membership?.planId?._id || profile.membership?.planId)?.toString() === (payment.planId?._id || payment.planId)?.toString() &&
          new Date(profile.membership?.startDate).getTime() === new Date(payment.startDate).getTime() ? profile.membership : null
      );
    const startStr = new Date(payment.startDate).toLocaleDateString('en-GB').replace(/\//g, '-');
    if (relatedM?.endDate) {
      return `${startStr} to ${new Date(relatedM.endDate).toLocaleDateString('en-GB').replace(/\//g, '-')}`;
    }

    // Fallback: calculate using calculateEndDate
    try {
      const duration = payment.planDurationMonths || 1;
      const endDateStr = calculateEndDate(payment.startDate, duration);
      if (endDateStr) {
        return `${startStr} to ${new Date(endDateStr).toLocaleDateString('en-GB').replace(/\//g, '-')}`;
      }
    } catch (e) {
      console.error(e);
    }
    return `${startStr} to Expiry`;
  };

  const getClientDisplayId = (clientId) => {
    return profile?.clientId || 'N/A';
  };

  const getClientMemberSince = (clientId) => {
    if (!profile?.createdAt) return 'Jan 2024';
    return new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
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
                <th className="p-5 text-center">Plan</th>
                <th className="p-5 text-center">Mode</th>
                <th className="p-5 text-center">Plan Amount</th>
                <th className="p-5 text-center">Paid Now</th>
                <th className="p-5 text-center">Total Paid</th>
                <th className="p-5 text-center">Remaining Balance</th>
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
                    </td>                     <td className="p-5 text-center">
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
                    <td className="p-5 text-center">
                      <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${pmt.paymentMethod === 'cash' ? 'text-emerald-400 bg-emerald-400/5' : 'text-blue-400 bg-blue-400/5'}`}>
                        {pmt.paymentMethod || pmt.mode || 'cash'}
                      </span>
                    </td>
                    <td className="p-5 text-center text-text-primary font-bold text-sm">₹{pmt.invoiceAmount || pmt.amount || 0}</td>
                    <td className="p-5 text-center text-blue-400 font-bold text-sm">₹{pmt.paidNow || pmt.paidAmount || 0}</td>
                    <td className="p-5 text-center text-emerald-400 font-bold text-sm">₹{pmt.totalPaid || pmt.paidAmount || 0}</td>
                    <td className="p-5 text-center text-rose-500 font-bold text-sm">₹{pmt.remainingBalance !== undefined ? pmt.remainingBalance : (pmt.amount - (pmt.paidAmount || 0))}</td>
                    <td className="p-5 text-center">
                      {getStatusBadge(pmt)}
                      {pmt.status === 'partial' && !isPaymentCleared(pmt) && pmt.dueDate && (
                        <div className="mt-1 text-[10px] text-text-muted font-medium">
                          Due: {new Date(pmt.dueDate).toLocaleDateString('en-GB').replace(/\//g, '-')}
                        </div>
                      )}
                    </td>
                    <td className="p-5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Tooltip content="View Invoice">
                          <button
                            type="button"
                            onClick={() => { setSelectedPayment(pmt); setShowReceiptModal(true); }}
                            className="p-2 rounded-lg text-text-secondary hover:text-primary hover:bg-primary/10 transition-all"
                          >
                            <FileText size={16} />
                          </button>
                        </Tooltip>
                        <Tooltip content="Download Invoice">
                          <button
                            type="button"
                            disabled={downloadingId === pmt._id}
                            onClick={() => downloadInvoice(pmt)}
                            className="p-2 rounded-lg text-text-secondary hover:text-emerald-400 hover:bg-emerald-500/10 transition-all disabled:opacity-50"
                          >
                            <Download size={16} />
                          </button>
                        </Tooltip>
                      </div>
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
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md print:hidden"
            onClick={() => setShowReceiptModal(false)}
          />

          {/* Modal content wrapper */}
          <div
            className="flex min-h-full items-start justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowReceiptModal(false); }}
          >
            <div className="bg-white text-gray-900 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 print-invoice-container my-6 relative z-10">
              {/* Actions Header (sticky, hidden in print) */}
              <div className="print:hidden sticky top-0 z-10 p-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Invoice Preview</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-gray-900 text-xs font-bold rounded-lg hover:brightness-95 transition-all shadow-sm"
                  >
                    <Printer size={13} />
                    Print
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReceiptModal(false)}
                    className="p-1.5 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-200 transition-all"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Invoice Printable Body */}
              <div className="p-5 space-y-4">
                {/* Header: Gym & Invoice Details */}
                <div className="flex justify-between items-start gap-3 pb-4 border-b border-gray-200">
                  {/* Gym Details on Left */}
                  <div className="flex items-start gap-2.5">
                    {getLogoUrl() ? (
                      <img
                        src={getLogoUrl()}
                        alt={gymInfo?.gymName || "Gym Logo"}
                        className="w-11 h-11 object-contain rounded-lg border border-gray-100"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center font-black text-primary text-lg">
                        {(gymInfo?.gymName || "G").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="pt-0.5">
                      <h2 className="text-base font-black uppercase tracking-tight text-gray-900 leading-none">{gymInfo?.gymName || "LIK GYM"}</h2>
                      {gymInfo?.tagline && (
                        <p className="text-[10px] text-gray-500 mt-0.5 font-medium">{gymInfo.tagline}</p>
                      )}
                      <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider mt-1">Gym ID: {gymInfo?.gymId || "N/A"}</p>
                      <p className="text-[10px] text-gray-600 max-w-[220px] leading-relaxed whitespace-pre-line mt-0.5">
                        {gymInfo?.billingInfo?.addressOnBill || gymInfo?.address || ""}
                      </p>
                    </div>
                  </div>

                  {/* Invoice Meta on Right */}
                  <div className="text-right">
                    <div className="mb-1.5">
                      {selectedPayment.status === 'paid' || (selectedPayment.remainingBalance !== undefined ? selectedPayment.remainingBalance : (selectedPayment.amount - (selectedPayment.paidAmount || 0))) === 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-widest">Paid</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-widest">Partially Paid</span>
                      )}
                    </div>
                    <h3 className="text-sm font-black text-gray-900">Invoice No : {selectedPayment.paymentId}</h3>
                    <p className="text-[10px] text-text-muted mt-0.5">Date: {new Date(selectedPayment.paymentDate || selectedPayment.createdAt || selectedPayment.date).toLocaleDateString('en-GB').replace(/\//g, '-')}</p>
                  </div>
                </div>

                {/* Billed To & Payment Details */}
                <div className="grid grid-cols-2 gap-4 text-xs pb-2">
                  <div>
                    <h4 className="font-bold text-amber-600 uppercase tracking-wider mb-1.5 text-[9px]">Billed To</h4>
                    <p className="font-black text-gray-900 text-sm">{selectedPayment.clientName || profile.personalInfo?.name}</p>
                    <p className="text-text-secondary mt-0.5">Client ID: {getClientDisplayId(selectedPayment.clientId)}</p>
                    <p className="text-text-muted mt-0.5">Member since: {getClientMemberSince(selectedPayment.clientId)}</p>
                  </div>
                  <div className="text-right">
                    <h4 className="font-bold text-amber-600 uppercase tracking-wider mb-1.5 text-[9px]">Payment Details</h4>
                    <p className="text-text-secondary">Method: <strong className="text-gray-900 uppercase font-black">{selectedPayment.paymentMethod || 'CASH'}</strong></p>
                    <p className="text-text-secondary mt-0.5">Status: <span className="font-bold text-gray-900">{selectedPayment.status === 'partial' ? 'Installment Plan' : 'Full Payment'}</span></p>
                  </div>
                </div>

                {/* Table of Subscription Details */}
                <div className="space-y-2">
                  <h4 className="text-[9px] font-black text-amber-600 uppercase tracking-wider">Membership Details</h4>
                  <div className="overflow-hidden border border-gray-100 rounded-lg">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-text-muted font-bold uppercase tracking-wider border-b border-gray-100">
                          <th className="p-2.5">Membership Details</th>
                          <th className="p-2.5 text-center">Period</th>
                          <th className="p-2.5 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="text-gray-800">
                          <td className="p-3 align-top">
                            <p className="font-black text-gray-900 text-sm">{selectedPayment.planName} Subscription</p>
                            <p className="text-[10px] text-text-muted mt-0.5 leading-relaxed max-w-xs">
                              Premium access to all gym facilities and equipment.
                            </p>
                          </td>
                          <td className="p-3 text-center align-top font-medium text-gray-700 whitespace-nowrap">
                            {getInvoicePeriod(selectedPayment)}
                          </td>
                          <td className="p-3 text-right align-top font-black text-gray-900 text-sm">
                            ₹{Number(selectedPayment.paidNow || selectedPayment.paidAmount || 0).toFixed(2)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Quote and Payment Summary Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  {/* Quote card */}
                  <div className="bg-blue-50/40 border border-blue-100/50 rounded-lg p-3">
                    <h4 className="text-[9px] font-black text-amber-600 uppercase tracking-wider">Membership Note</h4>
                    <p className="text-[10px] text-gray-600 leading-relaxed font-semibold italic mt-1">
                      "Discipline is the bridge between goals and accomplishment. Thank you for staying dedicated to your fitness journey."
                    </p>
                  </div>

                  {/* Financial Calculations */}
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between py-0.5">
                      <span className="text-gray-500 font-medium">Plan Amount</span>
                      <span className="font-bold text-gray-900">₹{Number(selectedPayment.invoiceAmount || selectedPayment.amount || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-gray-500 font-medium">Paid Now</span>
                      <span className="font-bold text-blue-600">₹{Number(selectedPayment.paidNow || selectedPayment.paidAmount || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-gray-500 font-medium">Total Paid</span>
                      <span className="font-bold text-emerald-600">₹{Number(selectedPayment.totalPaid || selectedPayment.paidAmount || 0).toFixed(2)}</span>
                    </div>
                    <div className="border-t border-gray-200 my-1"></div>
                    <div className="flex justify-between py-1 items-baseline">
                      <span className="text-gray-900 font-black text-sm">Balance Due</span>
                      <span className="font-black text-rose-600 text-sm">₹{Number(selectedPayment.remainingBalance !== undefined && selectedPayment.remainingBalance !== null ? selectedPayment.remainingBalance : (selectedPayment.amount - (selectedPayment.paidAmount || 0))).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Footer: Greetings & Contact info */}
                <div className="pt-3 border-t border-gray-200 text-center space-y-2">
                  <div>
                    <p className="text-xs font-black text-gray-900">{gymInfo?.billingInfo?.regards || "Thank you for your business!"}</p>
                    <p className="text-[10px] text-text-muted font-medium mt-0.5">
                      For any inquiries regarding this invoice or your membership, please reach out to our dedicated support team.
                    </p>
                  </div>
                  <div className="flex justify-center items-center gap-5 text-[10px] text-gray-600 font-bold">
                    <div className="flex items-center gap-1">
                      <Phone size={11} className="text-amber-600" />
                      <span>+91 {gymInfo?.billingInfo?.helpContact || "9865327412"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Mail size={11} className="text-amber-600" />
                      <span>{gymInfo?.gymEmail || "support@likgym.com"}</span>
                    </div>
                  </div>
                  <p className="text-[8px] text-text-muted font-black tracking-widest uppercase">
                    © 2024 {gymInfo?.gymName || "LIK GYM"} MANAGEMENT SYSTEM. ALL RIGHTS RESERVED.
                  </p>
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
