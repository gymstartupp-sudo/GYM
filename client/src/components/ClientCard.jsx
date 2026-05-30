import React from 'react';
import { Eye, RefreshCw, Trash2 } from 'lucide-react';
import Button from './Button';
import { calculateDaysLeft, formatDisplayDate, getPlanStatus } from '../utils/membership';

const planStatusStyles = {
  Active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  Upcoming: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  Expired: 'bg-gray-500/10 text-gray-400 border border-gray-700/50',
};

const paymentStatusStyles = {
  paid: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  partial: 'bg-red-500/10 text-red-400 border border-red-500/20', // Changed to red for Dues
  overdue: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const ClientCard = ({ client, onView, onDelete, onRenew, onReactivate, onDuesClick, showRenew = false, showReactivate = false, hideStatus = false, deleteLabel = "Deactivate" }) => {
  const name = client?.personalInfo?.name || 'Client';
  const avatarText = client?.avatar || name.charAt(0).toUpperCase();
  
  // Calculate dynamic status based on dates
  const currentPlan = client?.memberships?.find(p => {
    const s = getPlanStatus(p);
    return s === 'Active';
  }) || (client?.membership?.startDate ? client.membership : null);
  
  const planStatus = currentPlan ? getPlanStatus(currentPlan) : 'Expired';
  const paymentStatus = client?.paymentStatus || 'paid';

  const dynamicDaysLeft = calculateDaysLeft(currentPlan?.startDate, currentPlan?.endDate);
  const daysLeft = dynamicDaysLeft !== null ? dynamicDaysLeft : '-';

  return (
    <div className="bg-gray-900 border-b border-gray-800 hover:bg-gray-800/50 hover:shadow-sm transition-all duration-200 px-4 py-3">
      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_2fr_1fr_1fr_1fr] gap-4 md:gap-2 items-center text-sm">
        
        {/* Client Info */}
        <div className="flex gap-3 items-center min-w-0">
          <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold shrink-0">
            {avatarText}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-white truncate">{name}</h3>
            <p className="text-xs text-gray-400 truncate">{client?.clientId || 'Pending ID'}</p>
          </div>
        </div>

        {/* Mobile */}
        <div className="flex items-center md:block">
          <span className="w-24 md:hidden text-gray-500 text-xs font-semibold uppercase">Mobile: </span>
          <p className="text-white truncate">{client?.personalInfo?.mobileNo || '-'}</p>
        </div>

        {/* Plan */}
        <div className="flex items-center md:block">
          <span className="w-24 md:hidden text-gray-500 text-xs font-semibold uppercase">Plan: </span>
          <p className="text-white truncate">{currentPlan?.planName || 'No Active Plan'}</p>
        </div>

        {/* Duration */}
        <div className="flex md:flex-col items-center md:items-start gap-2 md:gap-0">
          <span className="w-24 md:hidden text-gray-500 text-xs font-semibold uppercase">Duration: </span>
          <div className="flex flex-col">
            <p className="text-gray-300 text-xs text-nowrap">Start: {formatDisplayDate(currentPlan?.startDate)}</p>
            <p className="text-gray-300 text-xs text-nowrap">End: {formatDisplayDate(currentPlan?.endDate)}</p>
          </div>
        </div>

        {/* Days Left */}
        <div className="flex items-center md:block">
          <span className="w-24 md:hidden text-gray-500 text-xs font-semibold uppercase">Days Left: </span>
          <p className="text-white font-medium">{daysLeft}</p>
        </div>

        {/* Status */}
        {!hideStatus && (
          <div className="flex items-center md:block">
            <span className="w-24 md:hidden text-gray-500 text-xs font-semibold uppercase">Status: </span>
            <div className="flex flex-col gap-1">
              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase whitespace-nowrap text-center ${planStatusStyles[planStatus]}`}>
                {planStatus}
              </span>
              {paymentStatus !== 'paid' && (
                <span 
                  onClick={(e) => { e.stopPropagation(); onDuesClick?.(client); }}
                  className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase whitespace-nowrap text-center cursor-pointer transition-transform active:scale-95 ${paymentStatusStyles[paymentStatus]}`}
                >
                  Dues
                </span>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className={`flex gap-2 justify-start md:justify-end shrink-0 mt-2 md:mt-0 ${hideStatus ? 'md:col-span-2' : ''}`}>
          <Button type="button" variant="secondary" onClick={(e) => { e.stopPropagation(); onView?.(client); }} className="!px-3 !py-1.5 text-xs">
            <Eye size={14} /> View
          </Button>

          {showReactivate && onReactivate && (
            <Button type="button" variant="secondary" onClick={(e) => { e.stopPropagation(); onReactivate?.(client); }} className="!px-3 !py-1.5 text-xs text-emerald-400 border-emerald-500/20 hover:border-emerald-400 hover:text-emerald-300">
              <RefreshCw size={14} /> Reactivate
            </Button>
          )}

          {showRenew && onRenew && (
            <Button type="button" variant="secondary" onClick={(e) => { e.stopPropagation(); onRenew?.(client); }} className="!px-3 !py-1.5 text-xs text-blue-400 border-blue-500/20 hover:border-blue-400 hover:text-blue-300">
              <RefreshCw size={14} /> Renew
            </Button>
          )}

          {onDelete && (
            <Button type="button" variant="secondary" onClick={(e) => { e.stopPropagation(); onDelete?.(client); }} className="!px-3 !py-1.5 text-xs text-red-400 border-red-500/20 hover:border-red-400 hover:text-red-300">
              <Trash2 size={14} /> {deleteLabel}
            </Button>
          )}
        </div>
        
      </div>
    </div>
  );
};

export default React.memo(ClientCard);
