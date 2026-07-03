import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AdminSidebar } from '../../components/AdminSidebar';
import Pagination from '../../components/Pagination';
import {
  Ticket, Search, Eye, CheckCircle, AlertCircle,
  X, Download, ChevronLeft, ChevronRight as ChevronRightIcon,
  Bug, Building2, User, Mail, Phone, Monitor, Globe,
  Maximize2, MapPin, Calendar, FileText, RefreshCw, Filter,
  Loader2, Image as ImageIcon
} from 'lucide-react';
import api from '../../utils/api';
import { toast } from 'react-toastify';
import { createPortal } from 'react-dom';

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = ['Bug', 'Feature Request', 'Billing', 'Member Management', 'WhatsApp Notifications', 'Payments', 'Other'];

const STATUS_CONFIG = {
  'Open':                 { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', dot: '#ef4444' },
  'In Progress':          { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', dot: '#f59e0b' },
  'Waiting for Customer': { color: '#6366f1', bg: 'rgba(99,102,241,0.12)', dot: '#6366f1' },
  'Resolved':             { color: '#10b981', bg: 'rgba(16,185,129,0.12)', dot: '#10b981' },
  'Closed':               { color: '#6b7280', bg: 'rgba(107,114,128,0.12)', dot: '#6b7280' },
};

const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace('/api', '');

const getImgSrc = (src) => {
  if (!src) return '';
  if (src.startsWith('http')) return src;
  const normalized = src.replace(/\\/g, '/');
  const part = normalized.includes('uploads/') ? normalized.split('uploads/').pop() : normalized.replace(/^\//, '');
  return `${BASE_URL}/uploads/${part}`;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['Open'];
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
      {status}
    </span>
  );
};

const CategoryBadge = ({ category }) => (
  <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
    style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}>
    {category}
  </span>
);

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Format date and time matching the user's reference: DD/MM/YYYY HH:MM:SS
const formatDateTimeLong = (d) => {
  if (!d) return '—';
  const dateObj = new Date(d);
  const pad = (n) => String(n).padStart(2, '0');
  const dateStr = `${pad(dateObj.getDate())}/${pad(dateObj.getMonth() + 1)}/${dateObj.getFullYear()}`;
  const timeStr = `${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}:${pad(dateObj.getSeconds())}`;
  return (
    <div className="text-center">
      <p className="text-xs text-text-primary font-bold">{dateStr}</p>
      <p className="text-[11px] text-text-muted font-semibold mt-0.5">{timeStr}</p>
    </div>
  );
};

// ─── Centered Issue Detail Modal (Redesigned) ──────────────────────────────────
const IssueDetailModal = ({ ticket, isOpen, onClose, onStatusChange }) => {
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [markingResolved, setMarkingResolved] = useState(false);
  const [activeScreenshotIdx, setActiveScreenshotIdx] = useState(0);
  const isResolved = ticket?.status === 'Resolved' || ticket?.status === 'Closed';

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setActiveScreenshotIdx(0);
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!ticket || !isOpen) return null;

  const handleToggleResolved = async () => {
    const newStatus = isResolved ? 'Open' : 'Resolved';
    setMarkingResolved(true);
    try {
      await api.put(`/issues/${ticket._id}/status`, { status: newStatus });
      onStatusChange(ticket._id, newStatus);
      toast.success(`Ticket marked as ${newStatus}`);
    } catch {
      toast.error('Failed to update status');
    } finally {
      setMarkingResolved(false);
    }
  };

  const InfoCard = ({ icon: Icon, label, value, iconColor }) => (
    <div className="flex items-center gap-4 p-4 rounded-xl border"
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: 'rgba(255,255,255,0.03)' }}>
        <Icon size={16} style={{ color: iconColor || 'var(--text-muted)' }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-black text-text-muted uppercase tracking-widest leading-none">{label}</p>
        <p className="text-sm text-text-primary font-bold truncate mt-1.5">{value || '—'}</p>
      </div>
    </div>
  );

  const TechCard = ({ icon: Icon, label, value, renderValue }) => (
    <div className="flex flex-col items-center justify-center text-center p-4 rounded-xl border"
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
      <Icon size={16} className="text-text-muted mb-2.5" />
      <p className="text-[9px] font-black text-text-muted uppercase tracking-widest leading-none mb-2">{label}</p>
      {renderValue ? renderValue() : <p className="text-xs text-text-primary font-bold">{value || '—'}</p>}
    </div>
  );

  const screenshotsCount = ticket.screenshots?.length || 0;
  const activeScreenshotSrc = screenshotsCount > 0 ? getImgSrc(ticket.screenshots[activeScreenshotIdx]) : null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-6"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      
      {/* Modal Container */}
      <div className="relative w-full max-w-4xl rounded-2xl border shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
        style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-color)' }}
        onClick={e => e.stopPropagation()}>
        
        {/* Close Button Top Right */}
        <button onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-[rgba(255,255,255,0.06)] transition-all z-10">
          <X size={18} />
        </button>

        {/* Modal Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar space-y-7">
          
          {/* Header Info */}
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs font-black tracking-wider text-text-muted uppercase">{ticket.ticketId}</span>
              <StatusBadge status={ticket.status} />
              <CategoryBadge category={ticket.category} />
            </div>
            <h2 className="text-2xl font-black text-text-primary mt-2">{ticket.title}</h2>
          </div>

          {/* Gym Information Section */}
          <div>
            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-3">Gym Information</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoCard icon={Building2} label="Gym ID" value={ticket.gymId} iconColor="#818cf8" />
              <InfoCard icon={Building2} label="Gym Name" value={ticket.gymName} iconColor="#34d399" />
              <InfoCard icon={User} label="Owner Name" value={ticket.ownerName} iconColor="#60a5fa" />
              <InfoCard icon={Mail} label="Email" value={ticket.ownerEmail} iconColor="#a78bfa" />
              <div className="md:col-span-2">
                <InfoCard icon={Phone} label="Phone" value={ticket.ownerPhone} iconColor="#f43f5e" />
              </div>
            </div>
          </div>

          {/* Issue Description Section */}
          <div>
            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-3">Issue Description</p>
            <div className="p-4 rounded-xl border border-l-4 text-sm text-text-primary leading-relaxed whitespace-pre-wrap"
              style={{
                background: 'var(--bg-secondary)',
                borderColor: 'var(--border-color)',
                borderLeftColor: '#6366f1'
              }}>
              {ticket.description}
            </div>
          </div>

          {/* Technical Info Section */}
          <div>
            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-3">Technical Info</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <TechCard icon={Globe} label="Browser" value={ticket.browser} />
              <TechCard icon={Monitor} label="OS" value={ticket.operatingSystem} />
              <TechCard icon={Maximize2} label="Resolution" value={ticket.resolution} />
              <TechCard icon={Calendar} label="Submitted At" renderValue={() => formatDateTimeLong(ticket.createdAt)} />
            </div>
          </div>

          {/* Screenshots Section */}
          {screenshotsCount > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">
                  Screenshots ({screenshotsCount})
                </p>
                {screenshotsCount > 1 && (
                  <button onClick={() => setLightboxSrc(activeScreenshotSrc)}
                    className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1">
                    View All <Maximize2 size={11} />
                  </button>
                )}
              </div>

              {/* Active Image Preview Box */}
              <div className="relative group rounded-xl overflow-hidden border bg-black/40 cursor-pointer"
                style={{ borderColor: 'var(--border-color)', aspectRatio: '16/9' }}
                onClick={() => setLightboxSrc(activeScreenshotSrc)}>
                <img
                  src={activeScreenshotSrc}
                  alt={`Screenshot Preview`}
                  className="w-full h-full object-contain"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <div className="px-4 py-2 rounded-xl bg-black/60 border border-white/10 text-white text-xs font-semibold flex items-center gap-1.5">
                    <Maximize2 size={13} /> Click to zoom
                  </div>
                </div>
              </div>

              {/* Mini thumbnails selector if multiple images */}
              {screenshotsCount > 1 && (
                <div className="flex items-center gap-2 mt-3 overflow-x-auto py-1">
                  {ticket.screenshots.map((src, idx) => {
                    const isActive = idx === activeScreenshotIdx;
                    return (
                      <button key={idx} onClick={() => setActiveScreenshotIdx(idx)}
                        className="w-20 aspect-video rounded-lg overflow-hidden border-2 shrink-0 transition-all"
                        style={{ borderColor: isActive ? '#6366f1' : 'transparent' }}>
                        <img src={getImgSrc(src)} className="w-full h-full object-cover" alt="" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Video Section */}
          {ticket.video && (
            <div>
              <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-3">Video Attachment</p>
              <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border-color)' }}>
                <video src={getImgSrc(ticket.video)} controls className="w-full max-h-60" style={{ background: '#000' }} />
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t flex items-center justify-end gap-3 shrink-0"
          style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}>
          <button onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-text-secondary transition-all border border-transparent"
            style={{ border: '1px solid var(--border-color)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            Cancel
          </button>
          
          <button
            onClick={handleToggleResolved}
            disabled={markingResolved}
            className="flex items-center gap-2 py-2.5 px-6 rounded-xl text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed text-white"
            style={{
              background: isResolved ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #10b981, #059669)',
              boxShadow: isResolved ? '0 4px 12px rgba(245,158,11,0.2)' : '0 4px 12px rgba(16,185,129,0.2)'
            }}>
            {markingResolved
              ? <Loader2 size={13} className="animate-spin" />
              : <CheckCircle size={13} />
            }
            {isResolved ? 'Mark Open' : 'Mark Resolved'}
          </button>
        </div>
      </div>

      {/* Lightbox Overlay */}
      {lightboxSrc && (
        <div className="fixed inset-0 z-[99999] bg-black/92 flex items-center justify-center p-4"
          onClick={() => setLightboxSrc(null)}>
          <button className="absolute top-4 right-4 p-2.5 rounded-full text-white transition-all hover:bg-white/10"
            onClick={() => setLightboxSrc(null)}>
            <X size={20} />
          </button>
          <a href={lightboxSrc} download target="_blank" rel="noopener noreferrer"
            className="absolute top-4 right-14 p-2.5 rounded-full text-white transition-all hover:bg-white/10"
            onClick={e => e.stopPropagation()}>
            <Download size={18} />
          </a>
          <img src={lightboxSrc} alt="Screenshot Zoomed" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
            onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>,
    document.body
  );
};

// ─── Main Support Tickets Page ────────────────────────────────────────────────
const AdminIssues = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({ total: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const LIMIT = 15;

  const [filters, setFilters] = useState({ search: '', category: '', status: '' });
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimer = useRef(null);

  const [selectedTicket, setSelectedTicket] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleSearchChange = (val) => {
    setFilters(p => ({ ...p, search: val }));
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setDebouncedSearch(val); setPage(1); }, 400);
  };

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/issues/stats');
      setStats(res.data.data);
    } catch {}
  }, []);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (filters.category) params.set('category', filters.category);
      if (filters.status) params.set('status', filters.status);

      const res = await api.get(`/issues?${params}`);
      setTickets(res.data.data || []);
      setTotal(res.data.total || 0);
      setPages(res.data.pages || 1);
    } catch {
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, filters.category, filters.status]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const handleStatusChange = (id, newStatus) => {
    setTickets(prev => prev.map(t => t._id === id ? { ...t, status: newStatus } : t));
    fetchStats();
    if (selectedTicket && selectedTicket._id === id) {
      setSelectedTicket(prev => ({ ...prev, status: newStatus }));
    }
  };

  const openModal = async (ticket) => {
    try {
      const res = await api.get(`/issues/${ticket._id}`);
      setSelectedTicket(res.data.data);
      setModalOpen(true);
    } catch {
      toast.error('Failed to load ticket details');
    }
  };

  const isMobile = window.innerWidth < 768;
  const hasFilters = filters.category || filters.status || filters.search;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} isMobile={isMobile} />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}>
          <div className="flex items-center gap-3">
            {isMobile && (
              <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg text-text-muted hover:text-text-primary">
                <Filter size={18} />
              </button>
            )}
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}>
              <Ticket size={18} className="text-indigo-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-text-primary">Support Tickets</h1>
              <p className="text-[11px] text-text-muted">{total} ticket{total !== 1 ? 's' : ''} total</p>
            </div>
          </div>
          <button onClick={() => { fetchTickets(); fetchStats(); }}
            className="p-2 rounded-xl text-text-muted hover:text-text-primary transition-colors"
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = ''}
            title="Refresh">
            <RefreshCw size={16} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          
          {/* Stats Header */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {[
              { label: 'Total Tickets', value: stats.total, color: '#6366f1', bg: 'rgba(99,102,241,0.12)', icon: Ticket },
              { label: 'Resolved', value: stats.resolved, color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: CheckCircle },
            ].map(({ label, value, color, bg, icon: Icon }) => (
              <div key={label} className="rounded-2xl border p-5 flex items-center gap-4 transition-all"
                style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: bg, border: `1px solid ${color}30` }}>
                  <Icon size={22} style={{ color }} />
                </div>
                <div>
                  <p className="text-3xl font-black" style={{ color }}>{value}</p>
                  <p className="text-xs text-text-muted font-medium mt-0.5">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Filter Bar */}
          <div className="rounded-2xl border p-4 mb-5" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input type="text" placeholder="Search ticket ID, gym, title..."
                  value={filters.search}
                  onChange={e => handleSearchChange(e.target.value)}
                  className="w-full rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none"
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  onFocus={e => e.currentTarget.style.borderColor = '#6366f1'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--border-color)'} />
              </div>
              <select value={filters.category}
                onChange={e => { setFilters(p => ({ ...p, category: e.target.value })); setPage(1); }}
                className="rounded-xl px-3 py-2.5 text-sm outline-none cursor-pointer"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                <option value="">All Categories</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={filters.status}
                onChange={e => { setFilters(p => ({ ...p, status: e.target.value })); setPage(1); }}
                className="rounded-xl px-3 py-2.5 text-sm outline-none cursor-pointer"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                <option value="">All Statuses</option>
                <option value="Open">Open</option>
                <option value="Resolved">Resolved</option>
              </select>
              {hasFilters && (
                <button onClick={() => { setFilters({ search: '', category: '', status: '' }); setDebouncedSearch(''); setPage(1); }}
                  className="rounded-xl px-3 py-2.5 text-xs font-bold flex items-center gap-1.5"
                  style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}>
                  <X size={12} /> Clear
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl border bg-[var(--bg-secondary)] overflow-hidden" style={{ borderColor: 'var(--border-color)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--bg-hover)', borderBottom: '1px solid var(--border-color)' }}>
                    {['Ticket ID', 'Gym ID & Name', 'Issue Title', 'Category', 'Status', 'Date', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] font-black text-text-muted uppercase tracking-widest whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} className="px-4 py-4">
                            <div className="h-4 rounded-lg animate-pulse" style={{ background: 'var(--bg-hover)', width: j === 2 ? '160px' : '90px' }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : tickets.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                            style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
                            <Ticket size={28} className="text-indigo-400 opacity-40" />
                          </div>
                          <p className="text-text-secondary font-semibold">No tickets found</p>
                          <p className="text-xs text-text-muted">
                            {hasFilters ? 'Try adjusting your filters' : 'No support tickets have been submitted yet'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    tickets.map(t => (
                      <tr key={t._id} className="transition-colors border-b" style={{ borderColor: 'var(--border-color)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}>
                        <td className="px-4 py-3.5">
                          <span className="font-black text-indigo-400 text-xs tracking-wider">{t.ticketId}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                              style={{ background: 'rgba(99,102,241,0.1)' }}>
                              <Building2 size={11} className="text-indigo-400" />
                            </div>
                            <div>
                              <p className="text-text-primary font-bold text-xs">{t.gymId || '—'}</p>
                              <p className="text-text-muted text-[10px]">{t.gymName}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 max-w-[200px]">
                          <p className="text-text-primary text-sm truncate">{t.title}</p>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <CategoryBadge category={t.category} />
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <StatusBadge status={t.status} />
                        </td>
                        <td className="px-4 py-3.5 text-text-muted text-xs whitespace-nowrap">
                          {formatDate(t.createdAt)}
                        </td>
                        <td className="px-4 py-3.5">
                          <button onClick={() => openModal(t)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                            style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.22)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,102,241,0.12)'}>
                            <Eye size={13} /> View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Component */}
            <Pagination
              currentPage={page}
              totalPages={pages}
              onPageChange={setPage}
            />
          </div>
        </div>
      </main>

      {/* Centered Ticket Modal */}
      <IssueDetailModal
        ticket={selectedTicket}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
};

export default AdminIssues;
