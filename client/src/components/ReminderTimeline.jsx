import React from 'react';
import { Check, AlertTriangle } from 'lucide-react';

const ReminderTimeline = ({ client, onCircleClick }) => {
  const expiryStatus = client?.expiryReminderStatus || 'none';
  const expiredStatus = client?.expiredReminderStatus || 'none';

  const getCircle = (status, type) => {
    if (status === 'sent') {
      return (
        <div
          className="relative group/circle"
          onClick={(e) => { e.stopPropagation(); onCircleClick?.(client, type); }}
        >
          <div className="w-4 h-4 rounded-full bg-success/20 text-success flex items-center justify-center cursor-pointer hover:bg-success/30 transition-colors border border-success/30">
            <Check size={10} strokeWidth={3} />
          </div>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-surface-elevated border border-border rounded-lg shadow-xl text-xs whitespace-nowrap opacity-0 group-hover/circle:opacity-100 pointer-events-none transition-opacity z-50">
            <p className="font-semibold text-text-primary">{type === 'expiry' ? 'Expiring Soon' : 'Expired'} Reminder</p>
            <p className="text-success font-medium">Status: Sent</p>
            <p className="text-text-muted">Sent: {new Date(client?.[type === 'expiry' ? 'expiryReminderSentAt' : 'expiredReminderSentAt']).toLocaleDateString('en-GB').replace(/\//g, '-')} {new Date(client?.[type === 'expiry' ? 'expiryReminderSentAt' : 'expiredReminderSentAt']).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
          </div>
        </div>
      );
    }

    if (status === 'failed') {
      return (
        <div
          className="relative group/circle"
          onClick={(e) => { e.stopPropagation(); onCircleClick?.(client, type); }}
        >
          <div className="w-4 h-4 rounded-full bg-danger/20 text-danger flex items-center justify-center cursor-pointer hover:bg-danger/30 transition-colors border border-danger/30">
            <AlertTriangle size={10} strokeWidth={3} />
          </div>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-surface-elevated border border-border rounded-lg shadow-xl text-xs whitespace-nowrap opacity-0 group-hover/circle:opacity-100 pointer-events-none transition-opacity z-50">
            <p className="font-semibold text-text-primary">{type === 'expiry' ? 'Expiring Soon' : 'Expired'} Reminder</p>
            <p className="text-danger font-medium">Status: Failed</p>
          </div>
        </div>
      );
    }

    return (
      <div
        className="relative group/circle"
        onClick={(e) => { e.stopPropagation(); onCircleClick?.(client, type); }}
      >
        <div className="w-4 h-4 rounded-full border-2 border-text-muted/30 flex items-center justify-center cursor-pointer hover:border-text-muted/60 transition-colors bg-surface-divider">
          <div className="w-1.5 h-1.5 rounded-full bg-text-muted/30" />
        </div>
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-surface-elevated border border-border rounded-lg shadow-xl text-xs whitespace-nowrap opacity-0 group-hover/circle:opacity-100 pointer-events-none transition-opacity z-50">
          <p className="font-semibold text-text-primary">{type === 'expiry' ? 'Expiring Soon' : 'Expired'} Reminder</p>
          <p className="text-text-muted font-medium">Status: Pending</p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex items-center gap-0 cursor-pointer" onClick={() => onCircleClick?.(client, 'both')}>
      {getCircle(expiryStatus, 'expiry')}
      <div className="w-4 h-0.5 bg-border" />
      {getCircle(expiredStatus, 'expired')}
    </div>
  );
};

export default React.memo(ReminderTimeline);
