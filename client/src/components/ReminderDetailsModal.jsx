import React from 'react';
import { createPortal } from 'react-dom';
import { X, Check, AlertTriangle, Clock } from 'lucide-react';

const ReminderDetailsModal = ({ isOpen, onClose, client }) => {
  if (!isOpen || !client) return null;

  const name = client?.personalInfo?.name || 'Client';
  const clientId = client?.clientId || 'N/A';
  const mobile = client?.personalInfo?.mobileNo || '-';
  const planName = client?.membership?.planName || 'No Plan';
  const daysLeft = client?.membership?.daysLeft ?? '-';
  const startDate = client?.membership?.startDate;
  const endDate = client?.membership?.endDate;

  const expiryStatus = client?.expiryReminderStatus || 'none';
  const expirySentAt = client?.expiryReminderSentAt;
  const expiryError = client?.expiryReminderError;

  const expiredStatus = client?.expiredReminderStatus || 'none';
  const expiredSentAt = client?.expiredReminderSentAt;
  const expiredError = client?.expiredReminderError;

  const fmt = (date) => {
    if (!date) return null;
    const d = new Date(date);
    return {
      date: d.toLocaleDateString('en-GB').replace(/\//g, '-'),
      time: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })
    };
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-GB').replace(/\//g, '-');
  };

  const expirySent = fmt(expirySentAt);
  const expiredSent = fmt(expiredSentAt);

  const StatusBadge = ({ status }) => {
    if (status === 'sent') return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-success/15 text-success border border-success/20">
        <Check size={10} /> Sent
      </span>
    );
    if (status === 'failed') return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-danger/15 text-danger border border-danger/20">
        <AlertTriangle size={10} /> Failed
      </span>
    );
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-divider text-text-muted border border-border">
        <Clock size={10} /> Pending
      </span>
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: 'var(--overlay)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div
        className="bg-surface-secondary border border-border rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg border border-primary/20">
              {name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary">{name}</h2>
              <p className="text-xs text-text-muted font-mono">{clientId}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-divider rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-5">
          {/* Client Info */}
          <div className="grid grid-cols-3 gap-3 mb-5 p-3 bg-surface-divider/50 rounded-xl border border-border/50">
            <div>
              <p className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Mobile</p>
              <p className="text-sm font-semibold text-text-primary">{mobile}</p>
            </div>
            <div>
              <p className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Plan</p>
              <p className="text-sm font-semibold text-text-primary">{planName}</p>
            </div>
            <div>
              <p className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Days Left</p>
              <p className="text-sm font-semibold text-text-primary">{daysLeft}</p>
            </div>
          </div>

          {/* Vertical Timeline */}
          <div className="relative pl-5">
            {/* Vertical line */}
            <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-border" />

            {/* Step 1: Membership Active */}
            <div className="relative flex items-start gap-3 mb-5">
              <div className="relative z-10 w-4 h-4 rounded-full bg-success/20 text-success flex items-center justify-center border border-success/30 shrink-0">
                <Check size={9} strokeWidth={3} />
              </div>
              <div className="flex-1 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-text-primary">Membership Active</p>
                </div>
                <span className="text-xs text-text-secondary font-medium">{formatDate(startDate)}</span>
              </div>
            </div>

            {/* Step 2: Expiring Soon Reminder */}
            <div className="relative flex items-start gap-3 mb-5">
              <div className="relative z-10 shrink-0">
                {expiryStatus === 'sent' ? (
                  <div className="w-4 h-4 rounded-full bg-success/20 text-success flex items-center justify-center border border-success/30">
                    <Check size={9} strokeWidth={3} />
                  </div>
                ) : expiryStatus === 'failed' ? (
                  <div className="w-4 h-4 rounded-full bg-danger/20 text-danger flex items-center justify-center border border-danger/30">
                    <AlertTriangle size={9} strokeWidth={3} />
                  </div>
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-text-muted/30 flex items-center justify-center bg-surface-divider">
                    <div className="w-1.5 h-1.5 rounded-full bg-text-muted/30" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-text-primary">Expiring Soon Reminder</p>
                  <StatusBadge status={expiryStatus} />
                </div>
                {expiryStatus === 'sent' && expirySent && (
                  <p className="text-xs text-text-muted mt-1">{expirySent.date} {expirySent.time}</p>
                )}
                {expiryStatus === 'failed' && (
                  <p className="text-xs text-danger mt-1">{expiryError || 'Delivery failed'}</p>
                )}
                {expiryStatus === 'none' && (
                  <p className="text-xs text-text-muted mt-1 italic">Not yet triggered</p>
                )}
              </div>
            </div>

            {/* Step 3: Membership Expired */}
            <div className="relative flex items-start gap-3 mb-5">
              <div className="relative z-10 w-4 h-4 rounded-full bg-success/20 text-success flex items-center justify-center border border-success/30 shrink-0">
                <Check size={9} strokeWidth={3} />
              </div>
              <div className="flex-1 flex items-center justify-between">
                <p className="text-sm font-bold text-text-primary">Membership Expired</p>
                <span className="text-xs text-text-secondary font-medium">{formatDate(endDate)}</span>
              </div>
            </div>

            {/* Step 4: Expired Reminder */}
            <div className="relative flex items-start gap-3">
              <div className="relative z-10 shrink-0">
                {expiredStatus === 'sent' ? (
                  <div className="w-4 h-4 rounded-full bg-success/20 text-success flex items-center justify-center border border-success/30">
                    <Check size={9} strokeWidth={3} />
                  </div>
                ) : expiredStatus === 'failed' ? (
                  <div className="w-4 h-4 rounded-full bg-danger/20 text-danger flex items-center justify-center border border-danger/30">
                    <AlertTriangle size={9} strokeWidth={3} />
                  </div>
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-text-muted/30 flex items-center justify-center bg-surface-divider">
                    <div className="w-1.5 h-1.5 rounded-full bg-text-muted/30" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-text-primary">Expired Reminder</p>
                  <StatusBadge status={expiredStatus} />
                </div>
                {expiredStatus === 'sent' && expiredSent && (
                  <p className="text-xs text-text-muted mt-1">{expiredSent.date} {expiredSent.time}</p>
                )}
                {expiredStatus === 'failed' && (
                  <p className="text-xs text-danger mt-1">{expiredError || 'Delivery failed'}</p>
                )}
                {expiredStatus === 'none' && (
                  <p className="text-xs text-text-muted mt-1 italic">Not yet triggered</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ReminderDetailsModal;
