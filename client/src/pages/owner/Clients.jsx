import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../utils/api';
import { toast } from 'react-toastify';
import { Search, Filter, Plus, X, ChevronDown, Check } from 'lucide-react';
import Button from '../../components/Button';
import ClientForm from '../../components/ClientForm';
import ClientCard from '../../components/ClientCard';
import ConfirmModal from '../../components/ConfirmModal';
import ReminderDetailsModal from '../../components/ReminderDetailsModal';
import { getPlanStatus } from '../../utils/membership';
import Pagination from '../../components/Pagination';
import { useAuth } from '../../context/AuthContext';

// ─── Status options config ───────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: 'All', label: 'All Status' },
  { value: 'Upcoming', label: 'Upcoming', dot: 'bg-primary' },
  { value: 'Active', label: 'Active', dot: 'bg-success' },
  { value: 'Expiring Soon', label: 'Expiring Soon', dot: 'bg-warning' },
  { value: 'Dues', label: 'Dues', dot: 'bg-danger' },
  { value: 'Expired', label: 'Expired', dot: 'bg-text-muted' },
];

const REMINDER_OPTIONS = [
  { value: 'All', label: 'All Reminders' },
  { value: 'Reminder Pending', label: 'Reminder Pending', dot: 'bg-text-muted' },
  { value: 'Reminder Sent', label: 'Reminder Sent', dot: 'bg-success' },
  { value: 'Expired Reminder Sent', label: 'Expired Reminder Sent', dot: 'bg-warning' },
];

// ─── Custom Dropdown (replaces native <select> for Dark-theme compatibility) ──
const CustomDropdown = ({ value, onChange, options, placeholder = 'Select...' }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.find(o => o.value === value);
  const isFiltered = value !== 'All' && value !== options[0]?.value;

  return (
    <div ref={ref} className="relative min-w-[160px]">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md border text-sm font-medium transition-all cursor-pointer
          ${isFiltered
            ? 'bg-primary/10 border-primary/50 text-primary'
            : 'bg-surface-divider border-border text-text-secondary hover:border-gray-500 hover:text-text-primary'
          }`}
      >
        <span className="flex items-center gap-2 truncate">
          {selected?.dot && <span className={`w-2 h-2 rounded-full shrink-0 ${selected.dot}`} />}
          {selected?.label || placeholder}
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown list */}
      {open && (
        <div className="absolute top-full mt-1 left-0 w-full z-50 bg-surface-secondary border border-border rounded-lg shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm text-left transition-colors
                ${opt.value === value
                  ? 'bg-primary/15 text-primary'
                  : 'text-text-secondary hover:bg-surface-divider hover:text-text-primary'
                }`}
            >
              <span className="flex items-center gap-2">
                {opt.dot && <span className={`w-2 h-2 rounded-full shrink-0 ${opt.dot}`} />}
                {opt.label}
              </span>
              {opt.value === value && <Check size={13} className="shrink-0 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Filter badge chip ────────────────────────────────────────────────────────
const FilterBadge = ({ label, onClear }) => (
  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/20 text-primary border border-primary/40">
    {label}
    <button onClick={onClear} className="hover:text-text-primary transition-colors leading-none">
      <X size={11} />
    </button>
  </span>
);

// ─── Main Clients Page ────────────────────────────────────────────────────────
const Clients = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { role } = useAuth();
  const isReadOnly = role === 'superadmin' && !!sessionStorage.getItem('viewGymId');

  const queryParams = new URLSearchParams(location.search);
  const initialStatus = queryParams.get('status') || 'All';
  const initialSearch = queryParams.get('search') || '';

  const [clients, setClients] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [duesClient, setDuesClient] = useState(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [filterStatus, setFilterStatus] = useState(initialStatus);
  const [filterPlan, setFilterPlan] = useState('All');
  const [filterReminder, setFilterReminder] = useState('All');
  const [reminderModalClient, setReminderModalClient] = useState(null);
  const [reminderModalTab, setReminderModalTab] = useState('both');

  // Sync filter and search with URL changes
  useEffect(() => {
    const s = new URLSearchParams(location.search).get('status');
    if (s) setFilterStatus(s);
    const searchVal = new URLSearchParams(location.search).get('search');
    if (searchVal !== null) setSearchTerm(searchVal);
  }, [location.search]);

  // Reset page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterPlan, filterReminder]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formInstanceKey, setFormInstanceKey] = useState(0);
  const [isFormDirty, setIsFormDirty] = useState(false);

  // Fetch plans once (for the plan filter dropdown)
  useEffect(() => {
    api.get('/plan')
      .then(res => setPlans(res.data.data || []))
      .catch(() => { });
  }, []);

  // Build plan options dynamically from fetched plans
  const planOptions = [
    { value: 'All', label: 'All Plans' },
    ...plans.map(p => ({ value: p.name, label: p.name }))
  ];

  // Fetch clients whenever either filter changes
  const fetchClients = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'All') params.append('status', filterStatus);
      if (filterPlan !== 'All') params.append('planName', filterPlan);
      if (filterReminder !== 'All') params.append('reminder', filterReminder);
      const res = await api.get(`/client?${params.toString()}`);
      const fetched = res.data.data || [];
      // Filter out pending clients from the main clients list
      setClients(fetched.filter(c => c.membership?.status !== 'pending' && c.membership?.status !== 'Pending'));
    } catch {
      toast.error('Failed to fetch clients');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [filterStatus, filterPlan, filterReminder]);

  useEffect(() => {
    fetchClients(true);

    const interval = setInterval(() => {
      fetchClients(false);
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, [fetchClients]);

  // Modal helpers
  const closeAddModal = () => {
    setShowAddModal(false);
    setFormInstanceKey(k => k + 1);
    setIsFormDirty(false);
  };

  // Client-side search and sorting based on days left ascending
  const filteredClients = useMemo(() => {
    // 1. Filter
    const term = searchTerm.toLowerCase();
    const list = term
      ? clients.filter(c =>
        c.personalInfo?.name?.toLowerCase().includes(term) ||
        (c.clientId || '').toLowerCase().includes(term) ||
        c.personalInfo?.mobileNo?.includes(term)
      )
      : [...clients];

    // 2. Sort by remaining days left ascending
    const getDaysLeft = (client) => {
      const currentPlan = client?.memberships?.find(p => {
        const s = getPlanStatus(p);
        return s === 'active';
      }) || (client?.membership?.startDate ? client.membership : null);

      if (!currentPlan || !currentPlan.endDate) {
        return Infinity;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endDate = new Date(currentPlan.endDate);
      endDate.setHours(0, 0, 0, 0);

      if (Number.isNaN(endDate.getTime())) {
        return Infinity;
      }

      return Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    };

    return list.sort((a, b) => getDaysLeft(a) - getDaysLeft(b));
  }, [clients, searchTerm]);

  const paginatedClients = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredClients.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredClients, currentPage]);

  const hasStatusFilter = filterStatus !== 'All';
  const hasPlanFilter = filterPlan !== 'All';
  const hasReminderFilter = filterReminder !== 'All';
  const activeFilterCount = (hasStatusFilter ? 1 : 0) + (hasPlanFilter ? 1 : 0) + (hasReminderFilter ? 1 : 0);

  const clearAll = () => { setFilterStatus('All'); setFilterPlan('All'); setFilterReminder('All'); };

  return (
    <div className="p-4 md:p-8 md:pt-10">

        {/* ── Page Header ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight">Clients</h1>
            <p className="text-text-secondary mt-1 text-sm md:text-base">Manage and monitor all your gym members.</p>
          </div>
          {!isReadOnly && (
            <Button onClick={() => setShowAddModal(true)} className="gap-2 w-full sm:w-auto justify-center">
              <Plus size={18} /> Add Client
            </Button>
          )}
        </div>

        {/* ── Add Client Modal ── */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-surface-secondary border border-border rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto relative shadow-2xl animate-in zoom-in-95 duration-200">
              <button type="button" onClick={() => closeAddModal()} className="absolute top-6 right-6 text-text-secondary hover:text-text-primary transition-colors z-10">
                <X size={24} />
              </button>
              <div className="p-8">
                <h2 className="text-2xl font-bold text-text-primary mb-6 border-b border-border pb-4">Enroll New Client</h2>
                <ClientForm
                  key={formInstanceKey}
                  mode="owner"
                  showCancel
                  onCancel={() => closeAddModal()}
                  onDirtyChange={setIsFormDirty}
                  onSuccess={(client, actionType) => {
                    closeAddModal();
                    if (actionType === 'restore') {
                      toast.success('Client restored successfully');
                    } else {
                      toast.success('Client added successfully');
                    }
                    fetchClients();
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Search + Filter Bar ── */}
        <div className="card mb-3 flex flex-col gap-3 bg-surface-secondary border-border relative z-20 overflow-visible">
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">

            {/* Search */}
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={17} />
              <input
                type="text"
                placeholder="Search by name, ID or phone..."
                className="input-field pl-10 w-full"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <Filter size={15} className="text-text-muted" />

              {/* Status */}
              <CustomDropdown
                value={filterStatus}
                onChange={setFilterStatus}
                options={STATUS_OPTIONS}
                placeholder="All Status"
              />

              {/* Plan */}
              <CustomDropdown
                value={filterPlan}
                onChange={setFilterPlan}
                options={planOptions}
                placeholder="All Plans"
              />

              {/* Reminder */}
              <CustomDropdown
                value={filterReminder}
                onChange={setFilterReminder}
                options={REMINDER_OPTIONS}
                placeholder="All Reminders"
              />

              {/* Clear all */}
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAll}
                  className="text-xs text-text-secondary hover:text-text-primary transition-colors underline underline-offset-2 whitespace-nowrap"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {/* ── Active filter badges ── */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-border/60">
              <span className="text-xs text-text-muted">Filtering by:</span>
              {hasStatusFilter && (
                <FilterBadge
                  label={`Status: ${STATUS_OPTIONS.find(o => o.value === filterStatus)?.label}`}
                  onClear={() => setFilterStatus('All')}
                />
              )}
              {hasPlanFilter && (
                <FilterBadge
                  label={`Plan: ${filterPlan}`}
                  onClear={() => setFilterPlan('All')}
                />
              )}
              {hasReminderFilter && (
                <FilterBadge
                  label={`Reminder: ${REMINDER_OPTIONS.find(o => o.value === filterReminder)?.label}`}
                  onClear={() => setFilterReminder('All')}
                />
              )}
            </div>
          )}
        </div>

        {/* Result count */}
        <p className="text-xs text-text-muted mb-4 px-1">
          {loading ? 'Loading...' : `${filteredClients.length} client${filteredClients.length !== 1 ? 's' : ''} found`}
        </p>

        {/* ── Client list ── */}
        {loading ? (
          <div className="card p-0 bg-surface-secondary border border-border rounded-xl overflow-hidden shadow-lg">
            <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_2fr_1fr_1fr_1fr] gap-2 px-4 py-4 bg-surface-secondary/80 border-b border-border text-xs font-semibold text-text-secondary uppercase tracking-wider">
              <div>Client Info</div><div>Mobile No</div><div>Plan</div><div>Duration</div><div>Days Left</div><div>Status</div><div className="text-right">Actions</div>
            </div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-4 border-b border-border/50">
                <div className="w-10 h-10 bg-surface-divider rounded-xl animate-pulse shrink-0"></div>
                <div className="flex-1 grid grid-cols-[2fr_1fr_1fr_2fr_1fr_1fr_1fr] gap-2 items-center">
                  <div><div className="h-4 w-24 bg-surface-divider rounded animate-pulse mb-1"></div><div className="h-3 w-16 bg-surface-divider rounded animate-pulse"></div></div>
                  <div className="h-4 w-20 bg-surface-divider rounded animate-pulse"></div>
                  <div className="h-4 w-16 bg-surface-divider rounded animate-pulse"></div>
                  <div className="h-4 w-28 bg-surface-divider rounded animate-pulse"></div>
                  <div className="h-4 w-10 bg-surface-divider rounded animate-pulse"></div>
                  <div className="h-5 w-14 bg-surface-divider rounded-full animate-pulse"></div>
                  <div className="h-7 w-16 bg-surface-divider rounded-lg animate-pulse ml-auto"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="card bg-surface-secondary border-border text-center py-16 text-text-secondary">
            <Filter size={36} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No clients found</p>
            <p className="text-sm mt-1 text-gray-600">Try adjusting your filters or search.</p>
          </div>
        ) : (
          <div className="card p-0 bg-surface-secondary border border-border rounded-xl overflow-hidden shadow-lg">
            {/* Table header */}
            <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_2fr_1fr_1fr_1fr] gap-2 px-4 py-4 bg-surface-secondary/80 border-b border-border text-xs font-semibold text-text-secondary uppercase tracking-wider sticky top-0 z-10 backdrop-blur-sm">
              <div>Client Info</div>
              <div>Mobile No</div>
              <div>Plan</div>
              <div>Duration</div>
              <div>Days Left</div>
              <div>Status</div>
              <div className="text-right">Actions</div>
            </div>
            <div className="flex flex-col">
              {paginatedClients.map(client => (
                <ClientCard
                  key={client._id}
                  client={client}
                  onView={(c) => navigate(`/owner/clients/${c._id}`)}
                  onDuesClick={setDuesClient}
                  onReminderClick={(c, tab) => { setReminderModalClient(c); setReminderModalTab(tab); }}
                />
              ))}
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(filteredClients.length / itemsPerPage)}
              onPageChange={setCurrentPage}
            />
          </div>
        )}

        {/* ── Dues Modal ── */}
        {duesClient && (() => {
          const activeDuesMembership = duesClient.memberships?.find(m => {
            const finalPrice = m.finalPrice || 0;
            const totalPaid = m.totalPaid || 0;
            return (finalPrice - totalPaid) > 0;
          }) || duesClient.memberships?.[0] || duesClient.membership || {};

          const finalPrice = activeDuesMembership.finalPrice || 0;
          const totalPaid = activeDuesMembership.totalPaid || 0;
          const balance = finalPrice - totalPaid;

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-surface-secondary border border-border rounded-xl w-full max-w-sm p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
                <button onClick={() => setDuesClient(null)} className="absolute top-4 right-4 text-text-secondary hover:text-text-primary transition-colors">
                  <X size={20} />
                </button>

                <div className="flex flex-col items-center mb-6 pt-2">
                  <div className="w-20 h-20 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center font-black text-3xl mb-4 border-2 border-red-500/20 shadow-inner">
                    {duesClient.avatar || duesClient.personalInfo?.name.charAt(0).toUpperCase()}
                  </div>
                  <h3 className="text-2xl font-black text-text-primary text-center leading-tight mb-1">{duesClient.personalInfo?.name}</h3>
                  <p className="text-text-muted font-mono text-sm uppercase tracking-tighter mb-3">{duesClient.clientId || 'ABC-XX'}</p>
                  <div className="flex flex-col items-center gap-1 opacity-80">
                    <p className="text-text-secondary text-sm font-medium">{duesClient.personalInfo?.mobileNo}</p>
                    <p className="text-text-muted text-xs truncate max-w-[200px]">{duesClient.personalInfo?.email}</p>
                  </div>
                </div>

                <div className="space-y-4 mb-8 bg-surface-divider/50 p-4 rounded-xl border border-border/50">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-text-secondary font-medium">Plan Name</span>
                    <span className="text-text-primary font-bold">{activeDuesMembership.planName || 'No Plan'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-text-secondary font-medium">Billing Period</span>
                    <span className="text-text-primary font-bold">
                      {activeDuesMembership.startDate ? `${new Date(activeDuesMembership.startDate).toLocaleDateString('en-GB').replace(/\//g, '-')} - ${new Date(activeDuesMembership.endDate).toLocaleDateString('en-GB').replace(/\//g, '-')}` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-text-secondary font-medium">Total Amount</span>
                    <span className="text-text-primary font-bold">₹{finalPrice}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-text-secondary font-medium">Paid Amount</span>
                    <span className="text-emerald-400 font-bold">₹{totalPaid}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm pt-3 border-t border-border">
                    <span className="text-text-secondary font-medium">Balance Dues</span>
                    <span className="text-red-400 font-black text-lg">₹{balance}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-text-secondary font-medium">Due Date</span>
                    <span className="text-text-primary font-bold">{activeDuesMembership.dueDate ? new Date(activeDuesMembership.dueDate).toLocaleDateString('en-GB').replace(/\//g, '-') : 'N/A'}</span>
                  </div>
                </div>

                <Button onClick={() => { setDuesClient(null); navigate('/owner/clients-payment', { state: { showPaymentModal: true, client: duesClient } }); }} className="w-full !py-4 text-base font-bold shadow-xl shadow-primary/20">
                  Collect Payment
                </Button>
              </div>
            </div>
          );
        })()}

        {/* ── Reminder Details Modal ── */}
        <ReminderDetailsModal
          isOpen={!!reminderModalClient}
          onClose={() => { setReminderModalClient(null); setReminderModalTab('both'); }}
          client={reminderModalClient}
          activeTab={reminderModalTab}
        />

      </div>
  );
};

export default Clients;
