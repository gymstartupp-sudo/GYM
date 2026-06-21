import React from 'react';
import { Check, AlertTriangle } from 'lucide-react';

const configs = {
  membership: [
    { key: 'expiry', label: 'Expiring Soon', statusField: 'expiryReminderStatus', timeField: 'expiryReminderSentAt' },
    { key: 'expired', label: 'Expired', statusField: 'expiredReminderStatus', timeField: 'expiredReminderSentAt' }
  ],
  pending: [
    { key: 'reminder1', label: '3 Days Before Due', statusField: 'overdueReminders.reminder1.status', timeField: 'overdueReminders.reminder1.sentAt' },
    { key: 'reminder2', label: 'Due Date Reminder', statusField: 'overdueReminders.reminder2.status', timeField: 'overdueReminders.reminder2.sentAt' }
  ],
  overdue: [
    { key: 'reminder1', label: '3 Days Before Due', statusField: 'overdueReminders.reminder1.status', timeField: 'overdueReminders.reminder1.sentAt' },
    { key: 'reminder2', label: 'Due Date Reminder', statusField: 'overdueReminders.reminder2.status', timeField: 'overdueReminders.reminder2.sentAt' },
    { key: 'reminder3', label: '3 Days After Due', statusField: 'overdueReminders.reminder3.status', timeField: 'overdueReminders.reminder3.sentAt' }
  ]
};

const ReminderTimeline = ({ client, mode = 'membership', onCircleClick }) => {
  const getNestedField = (obj, path) => {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  };

  const currentMode = configs[mode] || configs.membership;

  const getCircle = (item) => {
    const status = getNestedField(client, item.statusField) || 'none';
    const sentAt = getNestedField(client, item.timeField);

    if (status === 'sent') {
      return (
        <div
          className="relative group/circle"
          onClick={(e) => { e.stopPropagation(); onCircleClick?.(client, item.key); }}
        >
          <div className="w-4 h-4 rounded-full bg-success/20 text-success flex items-center justify-center cursor-pointer hover:bg-success/30 transition-colors border border-success/30">
            <Check size={10} strokeWidth={3} />
          </div>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-surface-elevated border border-border rounded-lg shadow-xl text-xs whitespace-nowrap opacity-0 group-hover/circle:opacity-100 pointer-events-none transition-opacity z-50">
            <p className="font-semibold text-text-primary">{item.label} Reminder</p>
            <p className="text-success font-medium">Status: Sent</p>
            {sentAt && (
              <p className="text-text-muted">
                Sent: {new Date(sentAt).toLocaleDateString('en-GB').replace(/\//g, '-')} {new Date(sentAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </p>
            )}
          </div>
        </div>
      );
    }

    if (status === 'failed') {
      const errorMsg = getNestedField(client, item.statusField.replace('.status', '.error')) || 'Twilio send error';
      return (
        <div
          className="relative group/circle"
          onClick={(e) => { e.stopPropagation(); onCircleClick?.(client, item.key); }}
        >
          <div className="w-4 h-4 rounded-full bg-danger/20 text-danger flex items-center justify-center cursor-pointer hover:bg-danger/30 transition-colors border border-danger/30">
            <AlertTriangle size={10} strokeWidth={3} />
          </div>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-surface-elevated border border-border rounded-lg shadow-xl text-xs whitespace-nowrap opacity-0 group-hover/circle:opacity-100 pointer-events-none transition-opacity z-50">
            <p className="font-semibold text-text-primary">{item.label} Reminder</p>
            <p className="text-danger font-medium">Status: Failed</p>
            {errorMsg && <p className="text-rose-400 max-w-xs text-[10px] whitespace-normal mt-0.5">{errorMsg}</p>}
          </div>
        </div>
      );
    }

    return (
      <div
        className="relative group/circle"
        onClick={(e) => { e.stopPropagation(); onCircleClick?.(client, item.key); }}
      >
        <div className="w-4 h-4 rounded-full border-2 border-text-muted/30 flex items-center justify-center cursor-pointer hover:border-text-muted/60 transition-colors bg-surface-divider">
          <div className="w-1.5 h-1.5 rounded-full bg-text-muted/30" />
        </div>
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-surface-elevated border border-border rounded-lg shadow-xl text-xs whitespace-nowrap opacity-0 group-hover/circle:opacity-100 pointer-events-none transition-opacity z-50">
          <p className="font-semibold text-text-primary">{item.label} Reminder</p>
          <p className="text-text-muted font-medium">Status: Pending</p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex items-center gap-0 cursor-pointer" onClick={() => onCircleClick?.(client, 'both')}>
      {currentMode.map((item, idx) => (
        <React.Fragment key={item.key}>
          {getCircle(item)}
          {idx < currentMode.length - 1 && <div className="w-4 h-0.5 bg-border" />}
        </React.Fragment>
      ))}
    </div>
  );
};

export default React.memo(ReminderTimeline);
