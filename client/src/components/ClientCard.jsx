import React from 'react';
import { Eye, RefreshCw, Trash2 } from 'lucide-react';
import Button from './Button';
import Tooltip from './Tooltip';
import ReminderTimeline from './ReminderTimeline';
import { calculateDaysLeft, formatDisplayDate, getPlanStatus } from '../utils/membership';
import { planStatusStyles, paymentStatusStyles } from '../utils/statusStyles';
import { useAuth } from '../context/AuthContext';

const ClientCard = ({ client, onView, onRenew, onReactivate, onDuesClick, onReminderClick, onDelete, deleteLabel, showRenew = false, showReactivate = false, hideStatus = false, hideReminders = false }) => {
  const { role } = useAuth();
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

  const isReadOnly = role === 'superadmin' && !!sessionStorage.getItem('viewGymId');

  return (
    <tr className="flex flex-col md:table-row bg-surface-secondary md:bg-surface-card border border-border md:border-0 md:border-b hover:bg-white/[0.02] transition-colors group mb-4 md:mb-0 rounded-xl md:rounded-none overflow-hidden">
      <td className="p-4 md:align-middle flex items-center md:table-cell border-b border-border/50 md:border-0 bg-surface-card md:bg-transparent rounded-t-xl md:rounded-none">
        <div className="flex gap-3 items-center min-w-0 w-full">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-lg border border-primary/20 shrink-0 shadow-inner group-hover:bg-primary group-hover:text-black transition-all duration-300">
            {avatarText}
          </div>
          <div className="flex flex-col min-w-0">
            <h3 className="font-semibold text-text-primary truncate group-hover:text-primary transition-colors">{name}</h3>
            <p className="text-xs text-text-muted truncate">{client?.clientId || 'Pending ID'}</p>
          </div>
        </div>
      </td>

      <td className="p-4 md:align-middle flex justify-between items-center md:table-cell border-b border-border/10 md:border-0 md:text-center">
        <span className="md:hidden text-[11px] font-bold text-text-muted uppercase tracking-wider">Mobile:</span>
        <p className="text-text-primary truncate text-sm font-medium">{client?.personalInfo?.mobileNo || '-'}</p>
      </td>

      <td className="p-4 md:align-middle flex justify-between items-center md:table-cell border-b border-border/10 md:border-0 md:text-center">
        <span className="md:hidden text-[11px] font-bold text-text-muted uppercase tracking-wider">Plan:</span>
        <p className="text-text-primary truncate text-sm font-medium">{currentPlan?.planName || 'No Active Plan'}</p>
      </td>

      <td className="p-4 md:align-middle flex justify-between items-center md:table-cell border-b border-border/10 md:border-0 md:text-center">
        <span className="md:hidden text-[11px] font-bold text-text-muted uppercase tracking-wider">Duration:</span>
        <div className="flex flex-col text-left md:inline-block">
          <p className="text-text-secondary text-xs md:text-nowrap">
            <span className="inline-block w-[40px]">Start</span> : {formatDisplayDate(currentPlan?.startDate)}
          </p>
          <p className="text-text-secondary text-xs md:text-nowrap">
            <span className="inline-block w-[40px]">End</span> : {formatDisplayDate(currentPlan?.endDate)}
          </p>
        </div>
      </td>

      <td className="p-4 md:align-middle flex justify-between items-center md:table-cell border-b border-border/10 md:border-0 md:text-center">
        <span className="md:hidden text-[11px] font-bold text-text-muted uppercase tracking-wider">Days Left:</span>
        <p className="text-text-primary font-bold md:font-medium text-sm">{daysLeft}</p>
      </td>

      {!hideStatus && (
        <td className="p-4 md:align-middle flex justify-between items-center md:table-cell border-b border-border/10 md:border-0 md:text-center">
          <span className="md:hidden text-[11px] font-bold text-text-muted uppercase tracking-wider">Status:</span>
          <div className="flex flex-row md:flex-col gap-1.5 md:gap-1 items-center justify-end md:justify-center">
            <span className={`inline-block ${planStatusStyles[planStatus] || 'badge-danger'}`}>
              {planStatus}
            </span>
            {paymentStatus !== 'paid' && (
              <span
                onClick={(e) => { e.stopPropagation(); if (!isReadOnly) onDuesClick?.(client); }}
                className={`inline-block transition-transform active:scale-95 ${paymentStatusStyles[paymentStatus]} ${isReadOnly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
              >
                Dues
              </span>
            )}
          </div>
        </td>
      )}

      <td className={`p-4 md:align-middle flex justify-between items-center md:table-cell md:text-right md:pr-4`} colSpan={hideStatus ? 2 : 1}>
        <span className="md:hidden text-[11px] font-bold text-text-muted uppercase tracking-wider">Actions:</span>
        <div className="flex gap-2 items-center justify-end shrink-0">
          {!hideReminders && <ReminderTimeline client={client} onCircleClick={onReminderClick} />}

          <Tooltip content="View client">
            <button type="button" onClick={(e) => { e.stopPropagation(); onView?.(client); }} className="p-2 bg-surface-divider text-text-secondary hover:text-[var(--btn-primary-text)] hover:bg-primary rounded-lg transition-all duration-200 border border-border">
              <Eye size={16} />
            </button>
          </Tooltip>

          {showReactivate && onReactivate && !isReadOnly && (
            <Tooltip content="Reactivate client">
              <Button type="button" variant="success" onClick={(e) => { e.stopPropagation(); onReactivate?.(client); }} className="!px-3 !py-1.5 md:!p-2 lg:!px-3 lg:!py-1.5 text-xs flex items-center justify-center gap-1">
                <RefreshCw size={14} />
                <span className="hidden xl:inline">Reactivate</span>
              </Button>
            </Tooltip>
          )}

          {showRenew && onRenew && !isReadOnly && (
            <Tooltip content="Renew membership">
              <Button type="button" variant="primary" onClick={(e) => { e.stopPropagation(); onRenew?.(client); }} className="!px-3 !py-1.5 md:!p-2 lg:!px-3 lg:!py-1.5 text-xs flex items-center justify-center gap-1">
                <RefreshCw size={14} />
                <span className="hidden xl:inline">Renew</span>
              </Button>
            </Tooltip>
          )}

          {onDelete && !isReadOnly && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(client); }}
              className="p-2 bg-surface-divider text-text-secondary hover:text-[var(--btn-primary-text)] hover:bg-danger rounded-lg transition-all duration-200 border border-border"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};

export default React.memo(ClientCard);
