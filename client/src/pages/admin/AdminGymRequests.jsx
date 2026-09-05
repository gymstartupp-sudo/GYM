import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import api from '../../utils/api';
import { toast } from 'react-toastify';
import {
  X, Eye, Check, AlertTriangle, Building2,
  Calendar, Phone, Mail, MapPin, Tag, Clock, Search, ShieldCheck
} from 'lucide-react';
import Pagination from '../../components/Pagination';
import { sortOperatingDays } from '../../utils/membership';

// Section helper for Profile Modal
const Section = ({ title, children }) => (
  <div className="space-y-2">
    <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">{title}</h3>
    <div className="rounded-xl border border-border bg-surface-secondary/50 p-4 space-y-3">
      {children}
    </div>
  </div>
);

// InfoRow helper for Profile Modal
const InfoRow = ({ icon, label, value }) => (
  <div className="flex items-center justify-between text-sm">
    <div className="flex items-center gap-2 text-text-secondary">
      <span className="text-text-muted">{icon}</span>
      <span>{label}</span>
    </div>
    <span className="font-medium text-text-primary text-right max-w-[60%] truncate">{value}</span>
  </div>
);

// Detailed Gym Request Modal
const GymRequestModal = ({ gym, onClose, onApprove, onReject, isProcessing }) => {
  if (!gym) return null;

  const owner = gym.owner || {};
  const operatingDays = sortOperatingDays(gym.operatingDays || []).join(', ') || '—';
  const openTime = gym.operatingHours?.open || '—';
  const closeTime = gym.operatingHours?.close || '—';
  const regDate = gym.createdAt
    ? new Date(gym.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border shadow-2xl bg-surface-secondary border-border"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-border bg-surface-secondary/95 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-black text-lg">
              {gym.gymLogo ? (
                <img src={gym.gymLogo} alt={gym.gymName} className="w-full h-full object-cover rounded-xl" />
              ) : (
                gym.gymName?.charAt(0) || 'G'
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary">{gym.gymName || '—'}</h2>
              <p className="text-xs text-amber-400 flex items-center gap-1 font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                Pending Approval • Gym ID: {gym.gymId}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-divider transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <Section title="Registration Overview">
            <InfoRow icon={<Calendar size={14} />} label="Registered On" value={regDate} />
            <InfoRow icon={<Building2 size={14} />} label="Gym ID" value={gym.gymId} />
            <InfoRow icon={<Tag size={14} />} label="Gym Type" value={gym.gymType || '—'} />
            <InfoRow icon={<Tag size={14} />} label="Tagline" value={gym.tagline || '—'} />
            <InfoRow icon={<ShieldCheck size={14} />} label="Status" value={
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Pending Approval
              </span>
            } />
          </Section>

          <Section title="Owner Details">
            <InfoRow icon={<Building2 size={14} />} label="Owner Name" value={owner.name || gym.ownerName || '—'} />
            <InfoRow icon={<Phone size={14} />} label="Owner Mobile" value={owner.mobile || gym.ownerPhone || '—'} />
            <InfoRow icon={<Mail size={14} />} label="Owner Email" value={owner.email || gym.ownerEmail || '—'} />
          </Section>

          <Section title="Location & Contact">
            <InfoRow icon={<Mail size={14} />} label="Gym Email" value={gym.gymEmail || '—'} />
            <InfoRow icon={<Phone size={14} />} label="Gym Contact" value={gym.gymContact || '—'} />
            <InfoRow icon={<MapPin size={14} />} label="Address" value={gym.address || '—'} />
            <InfoRow icon={<MapPin size={14} />} label="City / State" value={`${gym.city || '—'}, ${gym.state || '—'} (${gym.pincode || '—'})`} />
            <InfoRow icon={<Tag size={14} />} label="GST Number" value={gym.billingInfo?.gst || gym.gst || '—'} />
          </Section>

          <Section title="Operating Schedule">
            <InfoRow icon={<Calendar size={14} />} label="Operating Days" value={operatingDays} />
            <InfoRow icon={<Clock size={14} />} label="Working Hours" value={`${openTime} - ${closeTime}`} />
          </Section>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 z-10 flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-surface-secondary/95 backdrop-blur-md">
          <button
            onClick={onReject}
            disabled={isProcessing}
            className="px-4 py-2 rounded-xl text-sm font-bold text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-colors disabled:opacity-50"
          >
            Reject Request
          </button>
          <button
            onClick={onApprove}
            disabled={isProcessing}
            className="px-5 py-2 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <Check size={16} />
            <span>Approve & Activate Gym</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const AdminGymRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [actionId, setActionId] = useState(null);
  const [actionType, setActionType] = useState(null);

  const [selectedGym, setSelectedGym] = useState(null);
  const [rejectModalGym, setRejectModalGym] = useState(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/requests');
      setRequests(res.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load gym requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter(r =>
      (r.gymName && r.gymName.toLowerCase().includes(q)) ||
      (r.gymId && r.gymId.toLowerCase().includes(q)) ||
      (r.ownerName && r.ownerName.toLowerCase().includes(q)) ||
      (r.ownerEmail && r.ownerEmail.toLowerCase().includes(q)) ||
      (r.ownerPhone && r.ownerPhone.includes(q)) ||
      (r.city && r.city.toLowerCase().includes(q))
    );
  }, [requests, search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const paginatedRequests = useMemo(() => {
    const startIndex = (currentPage - 1) * 10;
    return filteredRequests.slice(startIndex, startIndex + 10);
  }, [filteredRequests, currentPage]);

  const handleApprove = async (gym) => {
    setActionId(gym._id);
    setActionType('approve');
    try {
      const res = await api.put(`/admin/gym/${gym._id}/approve`);
      toast.success(res.data?.message || `Gym "${gym.gymName}" approved and workspace activated!`);
      if (selectedGym?._id === gym._id) {
        setSelectedGym(null);
      }
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve gym');
    } finally {
      setActionId(null);
      setActionType(null);
    }
  };

  const handleRejectConfirm = async (gym) => {
    setActionId(gym._id);
    setActionType('reject');
    try {
      const res = await api.delete(`/admin/gym/${gym._id}/reject`);
      toast.success(res.data?.message || `Gym request for "${gym.gymName}" rejected.`);
      setRejectModalGym(null);
      if (selectedGym?._id === gym._id) {
        setSelectedGym(null);
      }
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject gym');
    } finally {
      setActionId(null);
      setActionType(null);
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight flex items-center gap-3">
            <span>Pending Gym Approvals</span>
            {requests.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20">
                {requests.length} pending
              </span>
            )}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Review registration applications, verify details, and initialize isolated workspaces.
          </p>
        </div>

        {/* Search Box */}
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search gym by name, ID, or owner..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-surface-secondary border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none text-text-primary focus:border-primary transition-colors"
          />
        </div>
      </div>

      {loading ? (
        <div className="bg-card rounded-xl border border-border overflow-x-auto shadow-lg animate-pulse">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-surface-hover/50 border-b border-border text-text-secondary text-xs tracking-wider uppercase">
                <th className="p-4 font-medium">Gym Info</th>
                <th className="p-4 font-medium">Owner Contact</th>
                <th className="p-4 font-medium text-center">Request Date</th>
                <th className="p-4 font-medium text-center">Status</th>
                <th className="p-4 font-medium text-right pr-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {[...Array(5)].map((_, i) => (
                <tr key={i}>
                  <td className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-surface-divider rounded-xl animate-pulse shrink-0"></div>
                      <div>
                        <div className="h-4 w-24 bg-surface-divider rounded animate-pulse mb-1"></div>
                        <div className="h-3 w-16 bg-surface-divider rounded animate-pulse"></div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="h-4 w-24 bg-surface-divider rounded animate-pulse"></div>
                  </td>
                  <td className="p-4 text-center">
                    <div className="h-4 w-20 bg-surface-divider rounded animate-pulse mx-auto"></div>
                  </td>
                  <td className="p-4 text-center">
                    <div className="h-5 w-16 bg-surface-divider rounded-full animate-pulse mx-auto"></div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="h-8 w-48 bg-surface-divider rounded-lg animate-pulse ml-auto"></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="card bg-surface-secondary border-border text-center py-16 text-text-secondary">
          <Clock size={48} className="mx-auto mb-4 opacity-20 text-amber-400" />
          <p className="text-lg font-medium text-text-primary">No pending gym requests</p>
          <p className="text-sm mt-1 text-text-muted">
            {search ? 'No gym registration requests match your search.' : 'New gym registration requests will appear here for verification and activation.'}
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-x-auto shadow-lg">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="bg-surface-hover/50 border-b border-border text-text-secondary text-xs tracking-wider uppercase">
                <th className="p-4 font-medium">Gym Info</th>
                <th className="p-4 font-medium">Owner Contact</th>
                <th className="p-4 font-medium text-center">Request Date</th>
                <th className="p-4 font-medium text-center">Status</th>
                <th className="p-4 font-medium text-right pr-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedRequests.map((gym) => (
                <tr key={gym._id} className="hover:bg-surface-divider/40 transition-colors group">
                  {/* Gym Info */}
                  <td className="p-4">
                    <div className="flex gap-3 items-center min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-black text-lg border border-amber-500/20 shrink-0 shadow-inner overflow-hidden">
                        {gym.gymLogo ? (
                          <img src={gym.gymLogo} alt={gym.gymName} className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          gym.gymName?.charAt(0) || 'G'
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-text-primary truncate group-hover:text-primary transition-colors">{gym.gymName}</h3>
                        <p className="text-xs text-text-muted truncate">
                          ID: <span className="font-mono text-amber-400">{gym.gymId}</span>
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Owner Contact */}
                  <td className="p-4">
                    <div className="min-w-0">
                      <p className="font-medium text-text-primary truncate">{gym.ownerName || '—'}</p>
                      <p className="text-xs text-text-muted truncate">{gym.ownerPhone}</p>
                    </div>
                  </td>

                  {/* Request Date */}
                  <td className="p-4 text-center">
                    <p className="text-text-primary font-medium text-sm">
                      {new Date(gym.createdAt).toLocaleDateString('en-GB').replace(/\//g, '-')}
                    </p>
                  </td>

                  {/* Status */}
                  <td className="p-4 text-center">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20 text-[10px] font-bold uppercase tracking-wider">
                      Pending
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="p-4 text-right">
                    <div className="flex gap-2 items-center justify-end shrink-0">
                      <button
                        onClick={() => setSelectedGym(gym)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-surface-card hover:bg-surface-divider text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1"
                      >
                        <Eye size={14} />
                        <span className="hidden xl:inline">VIEW</span>
                      </button>
                      <button
                        onClick={() => setRejectModalGym(gym)}
                        disabled={actionId !== null}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        <X size={14} />
                        <span className="hidden xl:inline">REJECT</span>
                      </button>
                      <button
                        onClick={() => handleApprove(gym)}
                        disabled={actionId !== null}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 flex items-center gap-1 transition-all disabled:opacity-50"
                      >
                        {actionId === gym._id && actionType === 'approve' ? (
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Check size={14} />
                        )}
                        <span className="hidden xl:inline">APPROVE</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredRequests.length > 10 && (
            <div className="p-4 border-t border-border">
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(filteredRequests.length / 10)}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      )}

      {/* Gym Request Detail Modal */}
      {selectedGym && (
        <GymRequestModal
          gym={selectedGym}
          onClose={() => setSelectedGym(null)}
          onApprove={() => handleApprove(selectedGym)}
          onReject={() => {
            setRejectModalGym(selectedGym);
          }}
          isProcessing={actionId !== null}
        />
      )}

      {/* Reject Confirmation Modal */}
      {rejectModalGym && (
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ background: 'var(--overlay)', backdropFilter: 'blur(6px)' }}
            onClick={() => setRejectModalGym(null)}
          >
            <div
              className="relative w-full max-w-md rounded-2xl border shadow-2xl animate-in fade-in zoom-in-95 duration-200 bg-surface-secondary border-border p-8 flex flex-col items-center text-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setRejectModalGym(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-divider transition-all duration-200"
              >
                <X size={18} />
              </button>

              {/* Icon */}
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 shadow-lg bg-red-500/10 border border-red-500/20">
                <AlertTriangle size={30} className="text-red-400" />
              </div>

              {/* Title */}
              <h2 className="text-xl font-bold mb-3 text-text-primary">
                Reject Gym Request?
              </h2>

              {/* Message */}
              <p className="text-sm leading-relaxed mb-6 text-text-secondary">
                Are you sure you want to reject the registration request for <span className="text-text-primary font-semibold">{rejectModalGym.gymName}</span>? This will permanently delete the application.
              </p>

              {/* Divider */}
              <div className="w-full border-t border-border mb-6" />

              {/* Buttons */}
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setRejectModalGym(null)}
                  className="flex-1 py-2.5 px-5 rounded-xl text-sm font-semibold border border-border text-text-secondary hover:bg-surface-divider hover:text-text-primary transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRejectConfirm(rejectModalGym)}
                  disabled={actionId !== null}
                  className="flex-1 py-2.5 px-5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/20 transition-all duration-200 disabled:opacity-50"
                >
                  {actionId === rejectModalGym._id && actionType === 'reject' ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Reject'
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      )}
    </>
  );
};

export default AdminGymRequests;
