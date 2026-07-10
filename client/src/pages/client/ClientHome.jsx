import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../utils/api';
import { toast } from 'react-toastify';
import { Sparkles, Clock, MapPin, Phone, Mail, Calendar } from 'lucide-react';
import Button from '../../components/Button';
import ClientRenewModal from '../../components/ClientRenewModal';
import { calculateDaysLeft, formatDisplayDate } from '../../utils/membership';

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

const ClientHome = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const fetchProfile = async () => {
    try {
      const res = await api.get('/client/profile');
      setProfile(res.data.data);
    } catch (error) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (!loading && profile && searchParams.get('renew') === 'true') {
      setShowRenewModal(true);
      setSearchParams({}, { replace: true });
    }
  }, [loading, profile, searchParams, setSearchParams]);

  const getDaysLeftDisplay = () => {
    const membership = profile?.membership;
    if (!membership) return '-';
    const calcDb = calculateDaysLeft(membership.startDate, membership.endDate);
    const computedValue = calcDb !== null ? calcDb : (membership.daysLeft ?? '-');
    if (typeof computedValue === 'string' && computedValue.includes('Starts in')) return computedValue;
    if (membership.status === 'expired' || membership.status === 'overdue') return 'Expired';
    return `${computedValue} days left`;
  };

  if (loading || !profile) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const pendingPmt = getPendingPayment(profile);

  return (
    <>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-text-primary tracking-tight flex items-center gap-3">
            Client Dashboard <Sparkles className="text-primary animate-pulse" size={24} />
          </h1>
          <p className="text-text-secondary mt-2 text-base md:text-lg">Welcome back! Review your active gym memberships below.</p>
        </div>
        <div>
          <Button type="button" onClick={() => setShowRenewModal(true)} className="shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform">
            {pendingPmt ? 'Pay Pending Dues' : 'Renew Membership'}
          </Button>
        </div>
      </div>

      {pendingPmt && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 md:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-6 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="space-y-1">
            <h3 className="text-md font-bold text-amber-400">Outstanding Balance Pending</h3>
            <p className="text-text-secondary text-xs">
              Please clear your pending balance of <span className="text-text-primary font-bold">₹{pendingPmt.remainingBalance}</span> before renewing your membership.
            </p>
          </div>
          <Button type="button" onClick={() => setShowRenewModal(true)} className="bg-amber-500 hover:bg-amber-600 text-gray-950 font-black text-xs uppercase tracking-widest shrink-0">
            Pay Pending Balance
          </Button>
        </div>
      )}

      <div className="card space-y-6 bg-surface-secondary border-border shadow-xl rounded-2xl p-6 md:p-8 mt-6">
        <h2 className="text-xl font-semibold text-text-primary border-b border-border pb-4 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-primary" /> Membership Info
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <div className="bg-surface-divider/80 rounded-xl p-5 border border-border shadow-inner hover:border-primary/30 transition-all duration-300 hover:translate-y-[-2px]">
            <p className="text-xs text-text-muted uppercase font-bold tracking-widest mb-2">Active Plan</p>
            <p className="text-text-primary text-lg font-semibold">{profile.membership?.planName || 'N/A'}</p>
          </div>
          <div className="bg-surface-divider/80 rounded-xl p-5 border border-border shadow-inner hover:border-primary/30 transition-all duration-300 hover:translate-y-[-2px]">
            <p className="text-xs text-text-muted uppercase font-bold tracking-widest mb-2">Total Duration</p>
            <p className="text-text-primary text-lg font-semibold">{profile.membership?.durationMonths ? `${profile.membership.durationMonths} Months` : 'N/A'}</p>
          </div>
          <div className="bg-primary/5 rounded-xl p-5 border border-primary/20 shadow-inner hover:border-primary/30 transition-all duration-300 hover:translate-y-[-2px]">
            <p className="text-xs text-text-muted uppercase font-bold tracking-widest mb-2 text-primary/70">Remaining Days</p>
            <p className="text-text-primary text-lg font-bold">{getDaysLeftDisplay()}</p>
          </div>
          <div className="bg-surface-divider/80 rounded-xl p-5 border border-border shadow-inner hover:border-primary/30 transition-all duration-300 hover:translate-y-[-2px]">
            <p className="text-xs text-text-secondary uppercase font-bold tracking-widest mb-2">Start Date</p>
            <p className="text-text-primary text-lg font-semibold">{formatDisplayDate(profile.membership?.startDate)}</p>
          </div>
          <div className="bg-surface-divider/80 rounded-xl p-5 border border-border shadow-inner hover:border-primary/30 transition-all duration-300 hover:translate-y-[-2px]">
            <p className="text-xs text-text-secondary uppercase font-bold tracking-widest mb-2">End Date</p>
            <p className="text-text-primary text-lg font-semibold">{formatDisplayDate(profile.membership?.endDate)}</p>
          </div>
          <div className="bg-surface-divider/80 rounded-xl p-5 border border-border shadow-inner hover:border-primary/30 transition-all duration-300 hover:translate-y-[-2px]">
            <p className="text-xs text-text-secondary uppercase font-bold tracking-widest mb-2">Member Status</p>
            <p className={`text-lg font-bold uppercase ${profile.membership?.status === 'active' ? 'text-emerald-400' : 'text-orange-400'}`}>
              {profile.membership?.status?.replace('_', ' ') || 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {profile.gym && (
        <div className="card space-y-6 bg-surface-secondary border-border shadow-xl rounded-2xl p-6 md:p-8 hover:shadow-2xl transition-all duration-300 animate-in fade-in duration-500">
          <h2 className="text-xl font-semibold text-text-primary border-b border-border pb-4 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" /> Gym Timings & Info
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <div className="bg-surface-divider/80 rounded-xl p-5 border border-border shadow-inner hover:border-primary/30 transition-all duration-300 hover:translate-y-[-2px]">
              <p className="text-xs text-text-muted uppercase font-bold tracking-widest mb-2">Gym Name</p>
              <p className="text-text-primary text-lg font-bold">{profile.gym.gymName || profile.gymName || 'N/A'}</p>
              {profile.gym.tagline && <p className="text-xs text-text-secondary mt-1 italic">"{profile.gym.tagline}"</p>}
            </div>

            <div className="bg-surface-divider/80 rounded-xl p-5 border border-border shadow-inner hover:border-primary/30 transition-all duration-300 hover:translate-y-[-2px]">
              <p className="text-xs text-text-muted uppercase font-bold tracking-widest mb-2 flex items-center gap-1.5">
                <Clock size={14} className="text-primary" /> Timings
              </p>
              {profile.gym.operatingHours ? (
                <p className="text-text-primary text-lg font-semibold">
                  {profile.gym.operatingHours.open || 'N/A'} - {profile.gym.operatingHours.close || 'N/A'}
                </p>
              ) : (
                <p className="text-text-primary text-lg font-semibold">N/A</p>
              )}
              {profile.gym.operatingDays && profile.gym.operatingDays.length > 0 && (
                <p className="text-xs text-text-secondary mt-1 flex items-center gap-1">
                  <Calendar size={12} /> {profile.gym.operatingDays.join(', ')}
                </p>
              )}
            </div>

            <div className="bg-surface-divider/80 rounded-xl p-5 border border-border shadow-inner hover:border-primary/30 transition-all duration-300 hover:translate-y-[-2px]">
              <p className="text-xs text-text-muted uppercase font-bold tracking-widest mb-2 flex items-center gap-1.5">
                <Phone size={14} className="text-primary" /> Contact
              </p>
              <p className="text-text-primary text-lg font-semibold">{profile.gym.gymContact || 'N/A'}</p>
              {profile.gym.gymEmail && (
                <p className="text-xs text-text-secondary mt-1 flex items-center gap-1 truncate">
                  <Mail size={12} /> {profile.gym.gymEmail}
                </p>
              )}
            </div>

            <div className="bg-surface-divider/80 rounded-xl p-5 border border-border shadow-inner hover:border-primary/30 transition-all duration-300 hover:translate-y-[-2px]">
              <p className="text-xs text-text-muted uppercase font-bold tracking-widest mb-2 flex items-center gap-1.5">
                <MapPin size={14} className="text-primary" /> Location
              </p>
              <p className="text-text-primary text-sm font-semibold line-clamp-2 leading-snug">{profile.gym.address || 'N/A'}</p>
              <p className="text-text-primary text-sm font-semibold line-clamp-2 leading-snug">{profile.gym.city || 'N/A'}</p>
            </div>
          </div>
        </div>
      )}

      <ClientRenewModal
        isOpen={showRenewModal}
        onClose={() => setShowRenewModal(false)}
        profile={profile}
        onSuccess={fetchProfile}
      />
    </>
  );
};

export default ClientHome;
