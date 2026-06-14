import React from 'react';
import { Phone, Mail, Clock } from 'lucide-react';
import { getPlanStatus } from '../utils/membership';

const planStatusConfig = {
  active: { badge: 'badge-active', label: 'Active' },
  expired: { badge: 'badge-danger', label: 'Expired' },
  upcoming: { badge: 'badge-info', label: 'Upcoming' },
  expiring_soon: { badge: 'badge-warning', label: 'Expiring Soon' },
};

const paymentStatusConfig = {
  paid: { badge: 'badge-active', label: 'Paid' },
  partial: { badge: 'badge-warning', label: 'Partially Paid' },
  overdue: { badge: 'badge-danger', label: 'Payment Overdue' },
};

const ClientProfileHeader = ({ client, compact = false, showStatus = true }) => {
  if (!client) return null;

  const currentPlan = client?.memberships?.find(p => getPlanStatus(p) === 'active') || client.membership;
  const planStatus = currentPlan?.startDate ? getPlanStatus(currentPlan) : 'expired';
  const paymentStatus = client.paymentStatus || 'paid';

  const pStatus = planStatusConfig[planStatus] || planStatusConfig.expired;
  const payStatus = paymentStatusConfig[paymentStatus] || paymentStatusConfig.paid;
  const name = client.personalInfo?.name || 'Unknown';
  const avatar = client.avatar;

  if (compact) {
    return (
      <div className="bg-surface-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all duration-200 group relative overflow-hidden">
        <div className="flex gap-5 items-center">
          <div className="w-16 h-16 rounded-xl bg-surface-divider text-primary flex items-center justify-center text-3xl font-bold border border-border shrink-0">
            {avatar && avatar.length > 1 ? (
              <img src={avatar} alt={name} className="w-full h-full object-cover rounded-xl" />
            ) : (
              name.charAt(0).toUpperCase()
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3 mb-2">
              <h4 className="font-bold text-text-primary text-xl leading-none tracking-tight group-hover:text-primary transition-colors truncate">{name}</h4>
              {showStatus && (
                <div className="flex gap-2">
                  <span className={pStatus.badge}>{pStatus.label}</span>
                  {paymentStatus !== 'paid' && (
                    <span className={payStatus.badge}>{payStatus.label}</span>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-text-secondary">
              <div className="flex items-center gap-2 text-[11px] font-medium">
                <Clock size={14} className="text-primary shrink-0" />
                <span className="label-text !text-[9px]">ID:</span>
                <span className="text-text-primary">{client.clientId || 'PENDING'}</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-medium">
                <Phone size={14} className="text-primary shrink-0" />
                <span className="text-text-primary">{client.personalInfo?.mobileNo}</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-medium">
                <Mail size={14} className="text-primary shrink-0" />
                <span className="text-text-primary truncate max-w-[150px]">{client.personalInfo?.email}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card mb-8 overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
        <div className="w-24 h-24 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-4xl font-bold border border-primary/20 overflow-hidden shrink-0">
          {avatar && avatar.length > 1 ? (
            <img src={avatar} alt={name} className="w-full h-full object-cover" />
          ) : (
            name.charAt(0).toUpperCase()
          )}
        </div>

        <div className="flex-1 space-y-2 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-text-primary tracking-tight leading-none truncate">
              {name}
            </h1>
            {showStatus && (
              <div className="flex gap-2">
                <span className={pStatus.badge}>Plan: {pStatus.label}</span>
                <span className={payStatus.badge}>Payment: {payStatus.label}</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-y-2 gap-x-6">
            <div className="flex items-center gap-2 text-text-secondary text-sm">
              <Clock size={16} className="text-primary/60" />
              <span>ID: <span className="text-text-primary font-medium">{client.clientId || 'NOT ASSIGNED'}</span></span>
            </div>
            <div className="flex items-center gap-2 text-text-secondary text-sm">
              <Phone size={16} className="text-primary/60" />
              <span className="text-text-primary font-medium">{client.personalInfo?.mobileNo}</span>
            </div>
            <div className="flex items-center gap-2 text-text-secondary text-sm">
              <Mail size={16} className="text-primary/60" />
              <span className="text-text-primary font-medium">{client.personalInfo?.email}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientProfileHeader;
