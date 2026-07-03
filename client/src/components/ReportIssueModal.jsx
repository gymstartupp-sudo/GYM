import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Bug, Zap, CreditCard, Users, CalendarCheck, MessageSquare,
  DollarSign, HelpCircle, AlertTriangle, Upload, Trash2,
  CheckCircle2, Ticket, Image, Film, Mail, Phone, Loader2
} from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';

const CATEGORIES = [
  { label: 'Bug', icon: Bug, color: '#ef4444' },
  { label: 'Feature Request', icon: Zap, color: '#6366f1' },
  { label: 'Billing', icon: CreditCard, color: '#f59e0b' },
  { label: 'Member Management', icon: Users, color: '#10b981' },
  { label: 'WhatsApp Notifications', icon: MessageSquare, color: '#22c55e' },
  { label: 'Payments', icon: DollarSign, color: '#8b5cf6' },
  { label: 'Other', icon: HelpCircle, color: '#6b7280' },
];

// Detect browser/OS info
const getTechInfo = () => {
  const ua = navigator.userAgent;
  let browser = 'Unknown';
  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('OPR') || ua.includes('Opera')) browser = 'Opera';

  let os = 'Unknown';
  if (ua.includes('Windows NT')) os = 'Windows';
  else if (ua.includes('Mac OS X')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  return {
    browser,
    operatingSystem: os,
    resolution: `${window.screen.width}x${window.screen.height}`,
    currentPage: window.location.pathname
  };
};

const ReportIssueModal = ({ isOpen, onClose, gymName = '' }) => {
  const { user } = useAuth();
  const [step, setStep] = useState('form'); // 'form' | 'success'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [ticketId, setTicketId] = useState('');

  // Auto-fetched contact info
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [gymId, setGymId] = useState('');
  const [isFetchingProfile, setIsFetchingProfile] = useState(false);

  const [form, setForm] = useState({
    category: '',
    title: '',
    description: '',
  });
  const [screenshots, setScreenshots] = useState([]);
  const [videoFile, setVideoFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const screenshotInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  // Auto-fetch gym profile for email, phone, owner name
  useEffect(() => {
    if (!isOpen) return;
    setStep('form');
    setError('');
    setForm({ category: '', title: '', description: '' });
    setScreenshots([]);
    setVideoFile(null);

    const fetchProfile = async () => {
      setIsFetchingProfile(true);
      try {
        const res = await api.get('/gym/profile');
        const { gym, owner } = res.data.data || {};
        setOwnerEmail(owner?.mailId || gym?.gymEmail || '');
        setOwnerPhone(owner?.mobileNo || gym?.gymContact || '');
        setOwnerName(owner?.name || '');
        setGymId(gym?.gymId || user?.gymId || '');
      } catch {
        // fallback to JWT claims
        setOwnerEmail(user?.email || '');
        setOwnerPhone('');
        setOwnerName('');
        setGymId(user?.gymId || '');
      } finally {
        setIsFetchingProfile(false);
      }
    };

    fetchProfile();
  }, [isOpen, user]);

  const addScreenshots = useCallback((files) => {
    const imgs = Array.from(files).filter(f => f.type.startsWith('image/'));
    const remaining = 5 - screenshots.length;
    const toAdd = imgs.slice(0, remaining).map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: `${Date.now()}-${Math.random()}`
    }));
    setScreenshots(prev => [...prev, ...toAdd]);
  }, [screenshots.length]);

  const removeScreenshot = (id) => {
    setScreenshots(prev => {
      const item = prev.find(s => s.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter(s => s.id !== id);
    });
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    addScreenshots(e.dataTransfer.files);
  }, [addScreenshots]);

  const handleSubmit = async () => {
    if (!form.category) return setError('Please select a category.');
    if (!form.title.trim()) return setError('Please enter an issue title.');
    if (!form.description.trim()) return setError('Please describe the issue.');
    if (form.description.trim().length < 20) return setError('Description must be at least 20 characters.');

    setError('');
    setIsSubmitting(true);

    try {
      const techInfo = getTechInfo();
      const fd = new FormData();
      fd.append('category', form.category);
      fd.append('title', form.title.trim());
      fd.append('description', form.description.trim());
      fd.append('severity', 'Medium'); // default, not user-facing
      fd.append('ownerEmail', ownerEmail);
      fd.append('ownerName', ownerName);
      fd.append('ownerPhone', ownerPhone);
      fd.append('gymName', gymName || user?.gymName || '');
      fd.append('gymId', gymId);
      fd.append('browser', techInfo.browser);
      fd.append('operatingSystem', techInfo.operatingSystem);
      fd.append('resolution', techInfo.resolution);
      fd.append('currentPage', techInfo.currentPage);
      fd.append('appVersion', '1.0.0');

      screenshots.forEach(s => fd.append('screenshots', s.file));
      if (videoFile) fd.append('video', videoFile);

      const res = await api.post('/issues', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setTicketId(res.data.data?.ticketId || 'TKT-XXXXXX');
      setStep('success');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const inputStyle = {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-xl rounded-2xl border shadow-2xl flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-300"
        style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-color)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-6 py-4 border-b shrink-0"
          style={{ borderColor: 'var(--border-color)', background: 'rgba(99,102,241,0.06)' }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.35)' }}
          >
            <Bug size={17} className="text-indigo-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-text-primary">Report an Issue</p>
            <p className="text-[10px] text-text-muted">Our team will review and respond shortly</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary transition-colors"
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 custom-scrollbar">
          {step === 'success' ? (
            <div className="flex flex-col items-center justify-center p-10 text-center gap-5">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ background: 'rgba(34,197,94,0.12)', border: '2px solid rgba(34,197,94,0.3)' }}>
                <CheckCircle2 size={38} className="text-emerald-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-text-primary mb-1">Issue Submitted!</h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Your issue has been submitted successfully.<br />
                  Our support team will review it shortly.
                </p>
              </div>
              <div className="w-full max-w-xs rounded-xl p-4 flex items-center gap-3"
                style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)' }}>
                <Ticket size={20} className="text-indigo-400 shrink-0" />
                <div className="text-left">
                  <p className="text-[10px] text-text-muted uppercase tracking-widest">Ticket ID</p>
                  <p className="text-lg font-black text-indigo-300 tracking-wider">{ticketId}</p>
                </div>
              </div>
              <p className="text-xs text-text-muted">Save this ticket ID for future reference.</p>
              <button onClick={onClose}
                className="px-8 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', boxShadow: '0 4px 14px rgba(99,102,241,0.35)' }}>
                Done
              </button>
            </div>
          ) : (
            <div className="p-6 space-y-6">

              {/* Contact Info (auto-fetched, read-only) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-2">
                    Contact Email
                  </label>
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border"
                    style={{ ...inputStyle, opacity: 0.8 }}>
                    {isFetchingProfile
                      ? <Loader2 size={13} className="animate-spin text-text-muted" />
                      : <Mail size={13} className="text-emerald-400 shrink-0" />
                    }
                    <span className="text-sm text-text-primary truncate">{ownerEmail || '—'}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-2">
                    Contact Phone
                  </label>
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border"
                    style={{ ...inputStyle, opacity: 0.8 }}>
                    {isFetchingProfile
                      ? <Loader2 size={13} className="animate-spin text-text-muted" />
                      : <Phone size={13} className="text-blue-400 shrink-0" />
                    }
                    <span className="text-sm text-text-primary">{ownerPhone || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-3">
                  Issue Category <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map(({ label, icon: Icon, color }) => {
                    const selected = form.category === label;
                    return (
                      <button key={label} type="button"
                        onClick={() => setForm(p => ({ ...p, category: label }))}
                        className="flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all duration-200 text-sm font-medium"
                        style={{
                          background: selected ? `${color}18` : 'var(--bg-secondary)',
                          borderColor: selected ? color : 'var(--border-color)',
                          color: selected ? color : 'var(--text-secondary)',
                          boxShadow: selected ? `0 0 0 1px ${color}40` : 'none'
                        }}>
                        <Icon size={15} style={{ color: selected ? color : 'var(--text-muted)', flexShrink: 0 }} />
                        <span className="leading-tight">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-2">
                  Issue Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="Brief summary of the issue..."
                  maxLength={150}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                  style={inputStyle}
                  onFocus={e => e.currentTarget.style.borderColor = '#6366f1'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-2">
                  Detailed Description <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Describe the issue in detail. Steps to reproduce, expected vs actual behavior..."
                  rows={4}
                  maxLength={3000}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all resize-none custom-scrollbar"
                  style={inputStyle}
                  onFocus={e => e.currentTarget.style.borderColor = '#6366f1'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                />
                <p className="text-right text-[10px] text-text-muted mt-1">{form.description.length}/3000</p>
              </div>

              {/* Screenshots */}
              <div>
                <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-2">
                  Attach Screenshots <span className="text-text-muted font-normal">(optional, max 5)</span>
                </label>
                <div
                  ref={dropZoneRef}
                  onDrop={handleDrop}
                  onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onClick={() => screenshots.length < 5 && screenshotInputRef.current?.click()}
                  className="rounded-xl border-2 border-dashed p-5 text-center transition-all duration-200 cursor-pointer"
                  style={{
                    borderColor: isDragging ? '#6366f1' : 'var(--border-color)',
                    background: isDragging ? 'rgba(99,102,241,0.06)' : 'var(--bg-secondary)',
                  }}
                >
                  <input ref={screenshotInputRef} type="file" accept="image/*" multiple className="hidden"
                    onChange={e => addScreenshots(e.target.files)} />
                  <Upload size={20} className="mx-auto mb-2 text-text-muted" />
                  <p className="text-xs text-text-secondary">
                    {isDragging ? 'Drop images here' : 'Drag & drop or click to upload'}
                  </p>
                  <p className="text-[10px] text-text-muted mt-1">PNG, JPG, GIF up to 20MB each</p>
                </div>

                {screenshots.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {screenshots.map(s => (
                      <div key={s.id} className="relative group rounded-xl overflow-hidden aspect-video border"
                        style={{ borderColor: 'var(--border-color)' }}>
                        <img src={s.preview} alt="" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => removeScreenshot(s.id)}
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Trash2 size={16} className="text-red-400" />
                        </button>
                      </div>
                    ))}
                    {screenshots.length < 5 && (
                      <button type="button" onClick={() => screenshotInputRef.current?.click()}
                        className="aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors"
                        style={{ borderColor: 'var(--border-color)' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = '#6366f1'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}>
                        <Image size={16} className="text-text-muted" />
                        <span className="text-[10px] text-text-muted">Add more</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Video */}
              <div>
                <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-2">
                  Video Upload <span className="text-text-muted font-normal">(optional)</span>
                </label>
                {!videoFile ? (
                  <button type="button" onClick={() => videoInputRef.current?.click()}
                    className="w-full rounded-xl border-2 border-dashed p-4 flex items-center justify-center gap-2 text-sm text-text-muted transition-colors"
                    style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#6366f1'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}>
                    <Film size={16} />
                    Attach a video (MP4, WebM up to 20MB)
                  </button>
                ) : (
                  <div className="flex items-center gap-3 p-3 rounded-xl border"
                    style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                    <Film size={16} className="text-indigo-400 shrink-0" />
                    <span className="text-sm text-text-primary flex-1 truncate">{videoFile.name}</span>
                    <button type="button" onClick={() => setVideoFile(null)} className="text-red-400 hover:text-red-300">
                      <X size={14} />
                    </button>
                  </div>
                )}
                <input ref={videoInputRef} type="file" accept="video/*" className="hidden"
                  onChange={e => setVideoFile(e.target.files[0] || null)} />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl text-sm"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
                  <AlertTriangle size={14} className="shrink-0" />
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'form' && (
          <div className="px-6 py-4 border-t shrink-0 flex items-center justify-between gap-3"
            style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}>
            <p className="text-[10px] text-text-muted">
              Tech info (browser, OS) is auto-captured.
            </p>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', boxShadow: '0 4px 14px rgba(99,102,241,0.35)' }}
              onMouseEnter={e => !isSubmitting && (e.currentTarget.style.filter = 'brightness(1.1)')}
              onMouseLeave={e => e.currentTarget.style.filter = ''}
            >
              {isSubmitting ? (
                <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Submitting...</>
              ) : (
                <><Bug size={15} />Submit Issue</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default ReportIssueModal;
