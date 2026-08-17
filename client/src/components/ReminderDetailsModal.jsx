import React from 'react';
import { createPortal } from 'react-dom';
import { X, Check, AlertTriangle, Clock } from 'lucide-react';
import { calculateDaysLeft, getPlanStatus } from '../utils/membership';

const ReminderDetailsModal = ({ isOpen, onClose, client, activeTab }) => {
  if (!isOpen || !client) return null;

  const currentPlan = client?.memberships?.find(p => {
    const s = getPlanStatus(p);
    return s === 'active';
  }) || (client?.membership?.startDate ? client.membership : null);

  const name = client?.personalInfo?.name || 'Client';
  const clientId = client?.clientId || 'N/A';
  const mobile = client?.personalInfo?.mobileNo || '-';
  const planName = currentPlan?.planName || 'No Plan';
  
  const dynamicDaysLeft = calculateDaysLeft(currentPlan?.startDate, currentPlan?.endDate);
  const daysLeft = dynamicDaysLeft !== null ? dynamicDaysLeft : '-';

  const startDate = currentPlan?.startDate;
  const endDate = currentPlan?.endDate;

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

  // Retrieve memberships details for dues
  const membershipsWithDues = client.memberships?.filter(m => (m.finalPrice - m.totalPaid) > 0) || [];
  const hasDues = membershipsWithDues.length > 0 || client.paymentStatus === 'partial' || client.paymentStatus === 'overdue';
  const hasPaymentHistory = client?.hasPartialPayment === true || hasDues;

  const outstandingMembership = [...(client.memberships || [])]
    .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
    .find(m => (m.finalPrice - m.totalPaid) > 0);

  const duesPlanName = outstandingMembership?.planName || planName;
  const duesStartDate = outstandingMembership?.startDate || startDate;
  const duesDueDate = outstandingMembership?.dueDate;
  const duesFinalPrice = outstandingMembership?.finalPrice || 0;
  const duesTotalPaid = outstandingMembership?.totalPaid || 0;
  const duesBalance = duesFinalPrice - duesTotalPaid;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDateNorm = endDate ? (() => { const d = new Date(endDate); d.setHours(0, 0, 0, 0); return d; })() : null;
  const startDateNorm = startDate ? (() => { const d = new Date(startDate); d.setHours(0, 0, 0, 0); return d; })() : null;
  const isMembershipExpired = endDateNorm ? today > endDateNorm : false;
  const isMembershipActive = startDateNorm ? today >= startDateNorm : false;

  const getStepStatus = (stepObj) => {
    if (stepObj?.status === 'sent' || stepObj?.status === 'failed') return stepObj.status;
    if (client.overdueReminders?.workflowCompleted) return 'skipped';
    return stepObj?.status || 'none';
  };

  const StatusBadge = ({ status }) => {
    if (status === 'sent' || status === 'success') return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-success/15 text-success border border-success/20">
        <Check size={10} /> Sent
      </span>
    );
    if (status === 'failed') return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-danger/15 text-danger border border-danger/20">
        <AlertTriangle size={10} /> Failed
      </span>
    );
    if (status === 'skipped') return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-divider text-text-muted border border-border">
        Skipped
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
          <div className={`grid ${hasDues ? 'grid-cols-4' : 'grid-cols-3'} gap-3 mb-5 p-3 bg-surface-divider/50 rounded-xl border border-border/50`}>
            <div>
              <p className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Mobile</p>
              <p className="text-sm font-semibold text-text-primary">{mobile}</p>
            </div>
            <div>
              <p className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Plan</p>
              <p className="text-sm font-semibold text-text-primary">{hasDues ? duesPlanName : planName}</p>
            </div>
            <div>
              <p className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Days Left</p>
              <p className="text-sm font-semibold text-text-primary">{daysLeft}</p>
            </div>
            {hasDues && (
              <div>
                <p className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Outstanding</p>
                <p className="text-sm font-semibold text-text-primary text-amber-500">₹{duesBalance}</p>
              </div>
            )}
          </div>

          {/* Timeline */}
          {hasPaymentHistory && (
            <div className="mb-8">
              <h3 className="text-sm font-bold text-text-primary mb-4 px-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span> Payment Reminders
              </h3>
              <div className="relative pl-5">
                <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-border" />

                {/* Step 1: Partial Payment Created */}
                <div className="relative flex items-start gap-3 mb-5">
                  <div className="relative z-10 w-4 h-4 rounded-full bg-success/20 text-success flex items-center justify-center border border-success/30 shrink-0">
                    <Check size={9} strokeWidth={3} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-text-primary">Partial Payment Created</p>
                      <span className="text-xs text-text-secondary font-medium">{formatDate(duesStartDate)}</span>
                    </div>
                    <p className="text-xs text-text-muted mt-1">
                      {hasDues ? (
                        <>Paid: <span className="text-emerald-500 font-bold">₹{duesTotalPaid}</span> | Remaining: <span className="text-primary font-bold">₹{duesBalance}</span> | Due: <span className="text-amber-500 font-medium">{formatDate(duesDueDate)}</span></>
                      ) : (
                        <>Originally Paid: <span className="text-emerald-500 font-bold">₹{duesTotalPaid}</span> | Due: <span className="text-amber-500 font-medium">{formatDate(duesDueDate)}</span></>
                      )}
                    </p>
                  </div>
                </div>

                {/* Step 2: Overdue Reminder 1 (3 days before due date) */}
                <div className="relative flex items-start gap-3 mb-5">
                  <div className="relative z-10 shrink-0">
                    {getStepStatus(client.overdueReminders?.reminder1) === 'sent' ? (
                      <div className="w-4 h-4 rounded-full bg-success/20 text-success flex items-center justify-center border border-success/30">
                        <Check size={9} strokeWidth={3} />
                      </div>
                    ) : getStepStatus(client.overdueReminders?.reminder1) === 'failed' ? (
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
                      <p className="text-sm font-bold text-text-primary">Overdue Reminder 1</p>
                      <StatusBadge status={getStepStatus(client.overdueReminders?.reminder1)} />
                    </div>
                    {getStepStatus(client.overdueReminders?.reminder1) === 'sent' && (
                      <p className="text-xs text-text-muted mt-1">
                        {formatDate(client.overdueReminders.reminder1.sentAt)} {fmt(client.overdueReminders.reminder1.sentAt)?.time}
                      </p>
                    )}
                    {getStepStatus(client.overdueReminders?.reminder1) === 'failed' && (
                      <p className="text-xs text-danger mt-1">{client.overdueReminders.reminder1.error || 'Delivery failed'}</p>
                    )}
                    {getStepStatus(client.overdueReminders?.reminder1) === 'skipped' && (
                      <p className="text-xs text-text-muted mt-1 italic">Not required (Dues were cleared)</p>
                    )}
                    {getStepStatus(client.overdueReminders?.reminder1) === 'none' && (
                      <p className="text-xs text-text-muted mt-1 italic">Pending (Triggered 3 days before due date)</p>
                    )}
                  </div>
                </div>

                {/* Step 3: Overdue Reminder 2 (on due date) */}
                <div className="relative flex items-start gap-3 mb-5">
                  <div className="relative z-10 shrink-0">
                    {getStepStatus(client.overdueReminders?.reminder2) === 'sent' ? (
                      <div className="w-4 h-4 rounded-full bg-success/20 text-success flex items-center justify-center border border-success/30">
                        <Check size={9} strokeWidth={3} />
                      </div>
                    ) : getStepStatus(client.overdueReminders?.reminder2) === 'failed' ? (
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
                      <p className="text-sm font-bold text-text-primary">Overdue Reminder 2</p>
                      <StatusBadge status={getStepStatus(client.overdueReminders?.reminder2)} />
                    </div>
                    {getStepStatus(client.overdueReminders?.reminder2) === 'sent' && (
                      <p className="text-xs text-text-muted mt-1">
                        {formatDate(client.overdueReminders.reminder2.sentAt)} {fmt(client.overdueReminders.reminder2.sentAt)?.time}
                      </p>
                    )}
                    {getStepStatus(client.overdueReminders?.reminder2) === 'failed' && (
                      <p className="text-xs text-danger mt-1">{client.overdueReminders.reminder2.error || 'Delivery failed'}</p>
                    )}
                    {getStepStatus(client.overdueReminders?.reminder2) === 'skipped' && (
                      <p className="text-xs text-text-muted mt-1 italic">Not required (Dues were cleared)</p>
                    )}
                    {getStepStatus(client.overdueReminders?.reminder2) === 'none' && (
                      <p className="text-xs text-text-muted mt-1 italic">Pending (Triggered on due date)</p>
                    )}
                  </div>
                </div>

                {/* Step 4: Overdue Reminder 3 (3 days after due date) */}
                <div className="relative flex items-start gap-3 mb-5">
                  <div className="relative z-10 shrink-0">
                    {getStepStatus(client.overdueReminders?.reminder3) === 'sent' ? (
                      <div className="w-4 h-4 rounded-full bg-success/20 text-success flex items-center justify-center border border-success/30">
                        <Check size={9} strokeWidth={3} />
                      </div>
                    ) : getStepStatus(client.overdueReminders?.reminder3) === 'failed' ? (
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
                      <p className="text-sm font-bold text-text-primary">Overdue Reminder 3</p>
                      <StatusBadge status={getStepStatus(client.overdueReminders?.reminder3)} />
                    </div>
                    {getStepStatus(client.overdueReminders?.reminder3) === 'sent' && (
                      <p className="text-xs text-text-muted mt-1">
                        {formatDate(client.overdueReminders.reminder3.sentAt)} {fmt(client.overdueReminders.reminder3.sentAt)?.time}
                      </p>
                    )}
                    {getStepStatus(client.overdueReminders?.reminder3) === 'failed' && (
                      <p className="text-xs text-danger mt-1">{client.overdueReminders.reminder3.error || 'Delivery failed'}</p>
                    )}
                    {getStepStatus(client.overdueReminders?.reminder3) === 'skipped' && (
                      <p className="text-xs text-text-muted mt-1 italic">Not required (Dues were cleared)</p>
                    )}
                    {getStepStatus(client.overdueReminders?.reminder3) === 'none' && (
                      <p className="text-xs text-text-muted mt-1 italic">Pending (Triggered 3 days after due date)</p>
                    )}
                  </div>
                </div>

                {/* Step 5: Dues Payment Status */}
                <div className="relative flex items-start gap-3">
                  <div className="relative z-10 shrink-0">
                    {client.overdueReminders?.workflowCompleted ? (
                      <div className="w-4 h-4 rounded-full bg-success/20 text-success flex items-center justify-center border border-success/30">
                        <Check size={9} strokeWidth={3} />
                      </div>
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-text-muted/30 flex items-center justify-center bg-surface-divider">
                        <div className="w-1.5 h-1.5 rounded-full bg-text-muted/30" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-text-primary">
                        {client.overdueReminders?.workflowCompleted ? 'Dues Cleared' : 'Dues Outstanding'}
                      </p>
                      {client.overdueReminders?.workflowCompleted ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-success/15 text-success border border-success/20">
                          Paid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/20">
                          Unpaid
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-muted mt-1">
                      {client.overdueReminders?.workflowCompleted
                        ? 'The pending balance was paid in full.'
                        : `Remaining balance of ₹${duesBalance} is still outstanding.`}
                    </p>
                  </div>
                </div>

                {/* Manual Reminders Section */}
                {client.overdueReminders?.manualReminders?.filter(r => r.executionSource === 'Manual Reminder').length > 0 && (
                  <div className="mt-6 border-t border-border pt-4">
                    <h4 className="text-[10px] font-black uppercase text-text-muted mb-3 tracking-widest">Manual Reminders History</h4>
                    <div className="space-y-2">
                      {client.overdueReminders.manualReminders
                        .filter(r => r.executionSource === 'Manual Reminder')
                        .map((r, i) => (
                          <div key={i} className="flex justify-between items-center bg-surface-divider/40 p-2.5 rounded-lg border border-border/50 text-xs">
                            <div className="flex items-center gap-2">
                              <StatusBadge status={r.status} />
                              {r.error && <span className="text-[10px] text-red-400 font-medium ml-1">{r.error}</span>}
                            </div>
                            <span className="text-text-muted">{formatDate(r.sentAt)} {fmt(r.sentAt)?.time}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Standard Membership Expiry Timeline */}
          <div>
            <h3 className="text-sm font-bold text-text-primary mb-4 px-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary"></span> Membership Reminders
            </h3>
            <div className="relative pl-5">
              {/* Vertical line */}
              <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-border" />

              {/* Step 1: Membership Active */}
              <div className="relative flex items-start gap-3 mb-5">
                <div className="relative z-10 shrink-0">
                  {isMembershipActive ? (
                    <div className="w-4 h-4 rounded-full bg-success/20 text-success flex items-center justify-center border border-success/30">
                      <Check size={9} strokeWidth={3} />
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-text-muted/30 flex items-center justify-center bg-surface-divider">
                      <div className="w-1.5 h-1.5 rounded-full bg-text-muted/30" />
                    </div>
                  )}
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
                    <p className="text-sm font-bold text-text-primary">
                      {hasDues ? 'Expiring Soon Reminder + Pending Balance' : 'Expiring Soon Reminder'}
                    </p>
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
                <div className="relative z-10 shrink-0">
                  {isMembershipExpired ? (
                    <div className="w-4 h-4 rounded-full bg-success/20 text-success flex items-center justify-center border border-success/30">
                      <Check size={9} strokeWidth={3} />
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-text-muted/30 flex items-center justify-center bg-surface-divider">
                      <div className="w-1.5 h-1.5 rounded-full bg-text-muted/30" />
                    </div>
                  )}
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
                    <p className="text-sm font-bold text-text-primary">
                      {hasDues ? 'Expired Reminder + Pending Balance' : 'Expired Reminder'}
                    </p>
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
      </div>
    </div>,
    document.body
  );
};

export default ReminderDetailsModal;