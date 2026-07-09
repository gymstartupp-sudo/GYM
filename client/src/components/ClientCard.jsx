import React from 'react';
import { Eye, RefreshCw, Trash2 } from 'lucide-react';
import Button from './Button';
import ReminderTimeline from './ReminderTimeline';
import { calculateDaysLeft, formatDisplayDate, getPlanStatus } from '../utils/membership';
import { planStatusStyles, paymentStatusStyles } from '../utils/statusStyles';

const ClientCard = ({ client, onView, onRenew, onReactivate, onDuesClick, onReminderClick, onDelete, deleteLabel, showRenew = false, showReactivate = false, hideStatus = false, hideReminders = false }) => {
  const name = client?.personalInfo?.name || 'Client';
  const avatarText = client?.avatar || name.charAt(0).toUpperCase();

  const currentPlan = client?.memberships?.find(p => {
    const s = getPlanStatus(p);
    return s === 'active';
  }) || (client?.membership?.startDate ? client.membership : null);

  const planStatus = currentPlan ? getPlanStatus(currentPlan) : 'expired';
  const paymentStatus = client?.paymentStatus || 'paid';

  const dynamicDaysLeft = calculateDaysLeft(currentPlan?.startDate, currentPlan?.endDate);
  const daysLeft = dynamicDaysLeft !== null ? dynamicDaysLeft : '-';

  const isReadOnly = localStorage.getItem('role') === 'superadmin' && !!sessionStorage.getItem('viewGymId');

  return (
    <div className="grid-table-row bg-surface-card border-b border-border hover:bg-white/[0.02] transition-colors group">
      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_2fr_1fr_1fr_1fr] gap-4 md:gap-2 items-center text-sm">

        <div className="flex gap-3 items-center min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-lg border border-primary/20 shrink-0 shadow-inner group-hover:bg-primary group-hover:text-black transition-all duration-300">
            {avatarText}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-text-primary truncate group-hover:text-primary transition-colors">{name}</h3>
            <p className="text-xs text-text-muted truncate">{client?.clientId || 'Pending ID'}</p>
          </div>
        </div>

        <div className="flex items-center md:block">
          <span className="w-24 md:hidden text-text-muted text-xs font-semibold uppercase">Mobile: </span>
          <p className="text-text-primary truncate">{client?.personalInfo?.mobileNo || '-'}</p>
        </div>

        <div className="flex items-center md:block">
          <span className="w-24 md:hidden text-text-muted text-xs font-semibold uppercase">Plan: </span>
          <p className="text-text-primary truncate">{currentPlan?.planName || 'No Active Plan'}</p>
        </div>

        <div className="flex md:flex-col items-center md:items-start gap-2 md:gap-0">
          <span className="w-24 md:hidden text-text-muted text-xs font-semibold uppercase">Duration: </span>
          <div className="flex flex-col">
            <p className="text-text-secondary text-xs text-nowrap">Start: {formatDisplayDate(currentPlan?.startDate)}</p>
            <p className="text-text-secondary text-xs text-nowrap">End: {formatDisplayDate(currentPlan?.endDate)}</p>
          </div>
        </div>

        <div className="flex items-center md:block">
          <span className="w-24 md:hidden text-text-muted text-xs font-semibold uppercase">Days Left: </span>
          <p className="text-text-primary font-medium">{daysLeft}</p>
        </div>

        {!hideStatus && (
          <div className="flex items-center md:block">
            <span className="w-24 md:hidden text-text-muted text-xs font-semibold uppercase">Status: </span>
            <div className="flex flex-col gap-1">
              <span className={`${planStatusStyles[planStatus] || 'badge-danger'}`}>
                {planStatus}
              </span>
              {paymentStatus !== 'paid' && (
                <span
                  onClick={(e) => { e.stopPropagation(); if (!isReadOnly) onDuesClick?.(client); }}
                  className={`transition-transform active:scale-95 ${paymentStatusStyles[paymentStatus]} ${isReadOnly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                >
                  Dues
                </span>
              )}
            </div>
          </div>
        )}

        <div className={`flex gap-2 items-center justify-start md:justify-end shrink-0 mt-2 md:mt-0 ${hideStatus ? 'md:col-span-2' : ''}`}>
          {!hideReminders && <ReminderTimeline client={client} onCircleClick={isReadOnly ? undefined : onReminderClick} />}

          <button type="button" onClick={(e) => { e.stopPropagation(); onView?.(client); }} className="p-2 bg-surface-divider text-text-secondary hover:text-[var(--btn-primary-text)] hover:bg-primary rounded-lg transition-all duration-200 border border-border" title="View client">
            <Eye size={16} />
          </button>

          {showReactivate && onReactivate && !isReadOnly && (
            <Button type="button" variant="success" onClick={(e) => { e.stopPropagation(); onReactivate?.(client); }} className="!px-3 !py-1.5 text-xs">
              <RefreshCw size={14} /> Reactivate
            </Button>
          )}

          {showRenew && onRenew && !isReadOnly && (
            <Button type="button" variant="primary" onClick={(e) => { e.stopPropagation(); onRenew?.(client); }} className="!px-3 !py-1.5 text-xs">
              <RefreshCw size={14} /> Renew
            </Button>
          )}

          {onDelete && !isReadOnly && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(client); }}
              className="p-2 bg-surface-divider text-text-secondary hover:text-[var(--btn-primary-text)] hover:bg-danger rounded-lg transition-all duration-200 border border-border"
              title={deleteLabel || 'Delete'}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default React.memo(ClientCard);
