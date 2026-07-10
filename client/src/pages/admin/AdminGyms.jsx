import React, { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import { toast } from 'react-toastify';
import { AdminSidebar } from '../../components/AdminSidebar';
import { useNavigate } from 'react-router-dom';
import { Menu, X, Eye, Users, Power, Trash2, AlertTriangle, Building2, Calendar, Phone, Mail, MapPin, Tag, Clock } from 'lucide-react';

// ─── Shared style tokens ──────────────────────────────────────────────────────
const COLORS = {
  bg: '#111111',
  card: '#1A1A1A',
  border: 'rgba(255,255,255,0.08)',
  accent: '#FFD54F',
  success: '#10B981',
  danger: '#EF4444',
};

// ─── Gym Profile Modal ────────────────────────────────────────────────────────
const GymProfileModal = ({ gymId, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get(`/admin/gym/${gymId}/profile`);
        setData(res.data.data);
      } catch {
        toast.error('Failed to load gym profile');
        onClose();
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [gymId]);

  if (!data && !loading) return null;

  const gym = data?.gym || {};
  const owner = data?.owner || {};
  const stats = data?.stats || {};

  const operatingDays = (gym.operatingDays || []).join(', ') || '—';
  const openTime = gym.operatingHours?.open || '—';
  const closeTime = gym.operatingHours?.close || '—';
  const regDate = gym.createdAt
    ? new Date(gym.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border shadow-2xl"
        style={{ background: COLORS.card, borderColor: COLORS.border }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b" style={{ background: COLORS.card, borderColor: COLORS.border }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg" style={{ background: '#FFD54F20', color: COLORS.accent }}>
              {gym.gymName?.charAt(0) || 'G'}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{gym.gymName || '—'}</h2>
              <p className="text-xs" style={{ color: '#888' }}>{gym.gymId}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: `${COLORS.accent} transparent transparent transparent` }} />
          </div>
        ) : (
          <div className="p-6 space-y-6">

            {/* Registration & Status */}
            <Section title="Registration">
              <InfoRow icon={<Calendar size={14} />} label="Registered On" value={regDate} />
              <InfoRow icon={<Building2 size={14} />} label="Gym ID" value={gym.gymId} />
              <InfoRow icon={<Tag size={14} />} label="Gym Type" value={gym.gymType || '—'} />
              <InfoRow icon={<Tag size={14} />} label="Tagline" value={gym.tagline || '—'} />
              <InfoRow icon={<Tag size={14} />} label="Status" value={
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={gym.isActive ? { background: '#10B98120', color: COLORS.success } : { background: '#EF444420', color: COLORS.danger }}>
                  {gym.isActive ? 'Active' : 'Inactive'}
                </span>
              } />
            </Section>

            {/* Contact */}
            <Section title="Contact Details">
              <InfoRow icon={<Mail size={14} />} label="Email" value={gym.gymEmail || '—'} />
              <InfoRow icon={<Phone size={14} />} label="Contact" value={gym.gymContact || '—'} />

              <InfoRow icon={<MapPin size={14} />} label="Address" value={gym.address || '—'} />
              <InfoRow icon={<MapPin size={14} />} label="City" value={gym.city || '—'} />
              <InfoRow icon={<MapPin size={14} />} label="State" value={gym.state || '—'} />
              <InfoRow icon={<MapPin size={14} />} label="Pincode" value={gym.pincode || '—'} />
              <InfoRow icon={<Tag size={14} />} label="GST Number" value={gym.billingInfo?.gst || gym.gst || '—'} />
            </Section>

            {/* Owner */}
            <Section title="Ownership">
              <InfoRow icon={<Users size={14} />} label="Owner Name" value={owner.name || '—'} />
              <InfoRow icon={<Phone size={14} />} label="Owner Mobile" value={owner.mobileNo || '—'} />
              <InfoRow icon={<Mail size={14} />} label="Owner Email" value={owner.mailId || '—'} />
            </Section>

            {/* Operating */}
            <Section title="Operating Details">
              <InfoRow icon={<Calendar size={14} />} label="Operating Days" value={operatingDays} />
              <InfoRow icon={<Clock size={14} />} label="Open Time" value={openTime} />
              <InfoRow icon={<Clock size={14} />} label="Close Time" value={closeTime} />
            </Section>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Delete Confirmation Modal ────────────────────────────────────────────────
const DeleteGymModal = ({ gym, profileData, onClose, onConfirm, isDeleting }) => {
  const stats = profileData?.stats || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-md rounded-2xl border shadow-2xl p-6"
        style={{ background: COLORS.card, borderColor: '#EF444440' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Warning Icon */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: '#EF444420' }}>
            <AlertTriangle size={32} style={{ color: COLORS.danger }} />
          </div>
          <h2 className="text-xl font-black text-white mb-2">Delete Gym?</h2>
          <p className="text-sm px-2" style={{ color: '#ccc' }}>
            Are you sure you want to permanently delete this gym and all associated data?
          </p>
        </div>

        {/* Gym info */}
        <div className="rounded-xl p-3 mb-4 text-center border" style={{ background: '#111', borderColor: COLORS.border }}>
          <p className="font-bold text-white">{gym.gymName}</p>
          <p className="text-xs mt-0.5" style={{ color: '#888' }}>{gym.gymId}</p>
        </div>

        {/* Impact stats */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="rounded-xl p-3 text-center border" style={{ background: '#111', borderColor: COLORS.border }}>
            <p className="text-xl font-black" style={{ color: COLORS.danger }}>{stats.totalClients ?? '...'}</p>
            <p className="text-[11px]" style={{ color: '#888' }}>Clients</p>
          </div>
          <div className="rounded-xl p-3 text-center border" style={{ background: '#111', borderColor: COLORS.border }}>
            <p className="text-xl font-black" style={{ color: COLORS.danger }}>{stats.totalPayments ?? '...'}</p>
            <p className="text-[11px]" style={{ color: '#888' }}>Payments</p>
          </div>
        </div>

        {/* What will be removed */}
        <div className="rounded-xl p-4 mb-6 border" style={{ background: '#1a0a0a', borderColor: '#EF444430' }}>
          <p className="text-xs font-bold mb-2" style={{ color: COLORS.danger }}>The following data will be removed:</p>
          <ul className="space-y-1">
            {['Gym details', 'All Clients', 'All Plans', 'All Payments', 'All Expenses', 'All Feedbacks', 'Owner record'].map(item => (
              <li key={item} className="flex items-center gap-2 text-xs" style={{ color: '#ccc' }}>
                <span style={{ color: COLORS.danger }}>•</span> {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors hover:bg-white/5 disabled:opacity-50"
            style={{ borderColor: COLORS.border, color: '#ccc' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all hover:brightness-90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: COLORS.danger, color: '#fff' }}
          >
            {isDeleting ? 'Deleting...' : 'Delete Permanently'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const Section = ({ title, children }) => (
  <div>
    <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#555' }}>{title}</p>
    <div className="rounded-xl border divide-y" style={{ borderColor: COLORS.border, divideColor: COLORS.border }}>
      {children}
    </div>
  </div>
);

const InfoRow = ({ icon, label, value }) => (
  <div className="flex items-start gap-3 px-4 py-3">
    <span className="mt-0.5 shrink-0" style={{ color: '#666' }}>{icon}</span>
    <span className="text-xs w-28 shrink-0" style={{ color: '#888' }}>{label}</span>
    <span className="text-xs text-white break-all">{value || '—'}</span>
  </div>
);

// ─── Action Button ────────────────────────────────────────────────────────────
const ActionBtn = ({ onClick, color, outline, children, title }) => {
  const baseStyle = {
    padding: '5px 10px',
    borderRadius: '8px',
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer',
    border: '1.5px solid',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
  };
  if (outline) {
    return (
      <button title={title} style={{ ...baseStyle, borderColor: color, color, background: 'transparent' }}
        onClick={onClick}
        onMouseEnter={e => { e.currentTarget.style.background = color + '20'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
        {children}
      </button>
    );
  }
  return (
    <button title={title} style={{ ...baseStyle, borderColor: color, background: color, color: '#fff' }}
      onClick={onClick}
      onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(0.88)'; }}
      onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)'; }}>
      {children}
    </button>
  );
};

// ─── Main AdminGyms Component ─────────────────────────────────────────────────
const AdminGyms = () => {
  const [gyms, setGyms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Modals
  const [profileGym, setProfileGym] = useState(null);            // full gym object
  const [profileData, setProfileData] = useState(null);          // cached for delete modal
  const [deleteGym, setDeleteGym] = useState(null);              // gym object
  const [isDeleting, setIsDeleting] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setIsSidebarOpen(false);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchGyms = useCallback(async () => {
    try {
      const res = await api.get('/admin/gyms');
      setGyms(res.data.data);
    } catch {
      toast.error('Failed to load gyms');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchGyms(); }, [fetchGyms]);

  const toggleStatus = async (gym) => {
    try {
      await api.put(`/admin/gym/${gym._id}/status`);
      toast.success(`${gym.gymName} ${gym.isActive ? 'deactivated' : 'activated'}`);
      fetchGyms();
    } catch {
      toast.error('Failed to update status');
    }
  };

  // Fetch profile and open delete modal
  const openDeleteModal = async (gym) => {
    setDeleteGym(gym);
    // Also try to fetch profile data so we show client/payment counts
    try {
      const res = await api.get(`/admin/gym/${gym._id}/profile`);
      setProfileData(res.data.data);
    } catch {
      setProfileData(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteGym) return;
    setIsDeleting(true);
    try {
      await api.delete(`/admin/gym/${deleteGym._id}`);
      toast.success(`${deleteGym.gymName} deleted permanently`);
      setDeleteGym(null);
      setProfileData(null);
      fetchGyms();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete gym');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={`flex bg-surface-primary h-screen overflow-hidden ${isMobile ? 'flex-col' : 'flex-row'}`}>
      {/* MOBILE HEADER */}
      {isMobile && (
        <header className="h-16 bg-surface-secondary border-b border-border flex items-center justify-between px-6 z-40 shrink-0">
          <span className="text-primary font-bold text-base tracking-tight">Super Admin</span>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 border border-border rounded-lg text-text-primary hover:bg-surface-divider transition-colors"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </header>
      )}

      {isMobile && isSidebarOpen && (
        <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-45 transition-opacity" />
      )}

      <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} isMobile={isMobile} />

      <div className="flex-1 overflow-y-auto p-4 md:p-8 md:pt-10">
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary mb-8 tracking-tight">All Vendor Gyms</h1>

        <div className="bg-card rounded-xl border border-border overflow-x-auto shadow-lg">
          <table className="w-full text-left border-collapse min-w-[620px]">
            <thead>
              <tr className="bg-surface-hover/50 border-b border-border text-text-secondary text-xs tracking-wider uppercase">
                <th className="p-4 font-medium">Gym Details</th>
                <th className="p-4 font-medium">Contact</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan="4" className="text-center p-10 text-text-muted">Loading...</td></tr>
              ) : gyms.length === 0 ? (
                <tr><td colSpan="4" className="text-center p-10 text-text-muted">No gyms found.</td></tr>
              ) : gyms.map(gym => (
                <tr key={gym._id} className="hover:bg-surface-divider/40 transition-colors">
                  {/* Gym Details */}
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-base shrink-0"
                        style={{ background: '#FFD54F18', color: COLORS.accent }}>
                        {gym.gymName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-text-primary text-sm">{gym.gymName}</p>
                        <p className="text-xs text-text-secondary">{gym.gymId}</p>
                      </div>
                    </div>
                  </td>

                  {/* Contact */}
                  <td className="p-4 text-sm text-text-secondary">{gym.gymContact}</td>

                  {/* Status badge */}
                  <td className="p-4">
                    <span className="px-2.5 py-1 text-xs rounded-full font-semibold"
                      style={gym.isActive
                        ? { background: '#10B98118', color: COLORS.success }
                        : { background: '#EF444418', color: COLORS.danger }
                      }>
                      {gym.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2 flex-wrap">
                      {/* View Profile — blue outline */}
                      <ActionBtn
                        outline
                        color="#60A5FA"
                        title="View profile"
                        onClick={() => setProfileGym(gym)}
                      >
                        <span className="flex items-center gap-1"><Eye size={11} />Profile</span>
                      </ActionBtn>

                      {/* View Gym Dashboard read-only — yellow outline */}
                      <ActionBtn
                        outline
                        color={COLORS.accent}
                        title="View Gym Dashboard"
                        onClick={() => navigate(`/admin/gyms/${gym.gymId}/view`)}
                      >
                        <span className="flex items-center gap-1"><Eye size={11} />View</span>
                      </ActionBtn>

                      {/* Deactivate/Activate */}
                      <ActionBtn
                        color={gym.isActive ? COLORS.danger : COLORS.success}
                        title={gym.isActive ? 'Deactivate gym' : 'Activate gym'}
                        onClick={() => toggleStatus(gym)}
                      >
                        <span className="flex items-center gap-1">
                          <Power size={11} />
                          {gym.isActive ? 'Deactivate' : 'Activate'}
                        </span>
                      </ActionBtn>

                      {/* Delete — solid red */}
                      <ActionBtn
                        color={COLORS.danger}
                        title="Delete gym permanently"
                        onClick={() => openDeleteModal(gym)}
                      >
                        <span className="flex items-center gap-1"><Trash2 size={11} />Delete</span>
                      </ActionBtn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gym Profile Modal */}
      {profileGym && (
        <GymProfileModal gymId={profileGym._id} onClose={() => setProfileGym(null)} />
      )}

      {/* Delete Confirmation Modal */}
      {deleteGym && (
        <DeleteGymModal
          gym={deleteGym}
          profileData={profileData}
          onClose={() => { if (!isDeleting) { setDeleteGym(null); setProfileData(null); } }}
          onConfirm={confirmDelete}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
};

export default AdminGyms;
