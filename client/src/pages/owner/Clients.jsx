import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../utils/api';
import { toast } from 'react-toastify';
import { Search, Filter, Plus, X, ChevronDown, Check } from 'lucide-react';
import Button from '../../components/Button';
import ClientForm from '../../components/ClientForm';
import ClientCard from '../../components/ClientCard';

// ─── Status options config ───────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: 'All', label: 'All Status' },
  { value: 'Upcoming', label: 'Upcoming', dot: 'bg-blue-500' },
  { value: 'Active', label: 'Active', dot: 'bg-emerald-500' },
  { value: 'Expiring Soon', label: 'Expiring Soon', dot: 'bg-warning' },
  { value: 'Dues', label: 'Dues', dot: 'bg-red-500' },
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
            : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white'
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
        <div className="absolute top-full mt-1 left-0 w-full z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm text-left transition-colors
                ${opt.value === value
                  ? 'bg-primary/15 text-primary'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
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
    <button onClick={onClear} className="hover:text-white transition-colors leading-none">
      <X size={11} />
    </button>
  </span>
);

// ─── Main Clients Page ────────────────────────────────────────────────────────
const Clients = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [clients, setClients] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [duesClient, setDuesClient] = useState(null);

  // Get status from URL if present
  const queryParams = new URLSearchParams(location.search);
  const initialStatus = queryParams.get('status') || 'All';

  const [filterStatus, setFilterStatus] = useState(initialStatus);
  const [filterPlan, setFilterPlan] = useState('All');

  // Sync filter with URL changes
  useEffect(() => {
    const s = new URLSearchParams(location.search).get('status');
    if (s) setFilterStatus(s);
  }, [location.search]);
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
  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'All') params.append('status', filterStatus);
      if (filterPlan !== 'All') params.append('planName', filterPlan);
      const res = await api.get(`/client?${params.toString()}`);
      setClients(res.data.data || []);
    } catch {
      toast.error('Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterPlan]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  // Modal helpers
  const closeAddModal = (force = false) => {
    if (!force && isFormDirty) {
      if (!window.confirm('You have unsaved changes. Are you sure you want to close?')) return;
    }
    setShowAddModal(false);
    setFormInstanceKey(k => k + 1);
    setIsFormDirty(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to deactivate this client?')) {
      try {
        await api.put(`/client/${id}/deactivate`);
        toast.success('Client deactivated');
        fetchClients();
      } catch {
        toast.error('Failed to deactivate');
      }
    }
  };

  // Client-side search on top of server-side status+plan filter
  const filteredClients = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (!term) return clients;
    return clients.filter(c =>
      c.personalInfo?.name?.toLowerCase().includes(term) ||
      (c.clientId || '').toLowerCase().includes(term) ||
      c.personalInfo?.mobileNo?.includes(term)
    );
  }, [clients, searchTerm]);

  const hasStatusFilter = filterStatus !== 'All';
  const hasPlanFilter = filterPlan !== 'All';
  const activeFilterCount = (hasStatusFilter ? 1 : 0) + (hasPlanFilter ? 1 : 0);

  const clearAll = () => { setFilterStatus('All'); setFilterPlan('All'); };

  return (
    <div className="flex bg-dark h-screen overflow-hidden">
      <></>
      <div className="flex-1 overflow-y-auto p-4 md:p-8 md:pt-10">

        {/* ── Page Header ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Clients</h1>
            <p className="text-gray-400 mt-1 text-sm md:text-base">Manage and monitor all your gym members.</p>
          </div>
          <Button onClick={() => setShowAddModal(true)} className="gap-2 w-full sm:w-auto justify-center">
            <Plus size={18} /> Add Client
          </Button>
        </div>

        {/* ── Add Client Modal ── */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto relative shadow-2xl animate-in zoom-in-95 duration-200">
              <button type="button" onClick={() => closeAddModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors z-10">
                <X size={24} />
              </button>
              <div className="p-8">
                <h2 className="text-2xl font-bold text-white mb-6 border-b border-gray-800 pb-4">Enroll New Client</h2>
                <ClientForm
                  key={formInstanceKey}
                  mode="owner"
                  showCancel
                  onCancel={() => closeAddModal(false)}
                  onDirtyChange={setIsFormDirty}
                  onSuccess={() => {
                    closeAddModal(true);
                    toast.success('Client added successfully');
                    fetchClients();
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Search + Filter Bar ── */}
        <div className="card mb-3 flex flex-col gap-3 bg-gray-900 border-gray-800 relative z-20 overflow-visible">
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">

            {/* Search */}
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={17} />
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
              <Filter size={15} className="text-gray-500" />

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

              {/* Clear all */}
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAll}
                  className="text-xs text-gray-400 hover:text-white transition-colors underline underline-offset-2 whitespace-nowrap"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {/* ── Active filter badges ── */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-gray-800/60">
              <span className="text-xs text-gray-500">Filtering by:</span>
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
            </div>
          )}
        </div>

        {/* Result count */}
        <p className="text-xs text-gray-500 mb-4 px-1">
          {loading ? 'Loading...' : `${filteredClients.length} client${filteredClients.length !== 1 ? 's' : ''} found`}
        </p>

        {/* ── Client list ── */}
        {loading ? (
          <div className="card p-0 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-lg">
            <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_2fr_1fr_1fr_1fr] gap-2 px-4 py-4 bg-gray-900/80 border-b border-gray-800 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              <div>Client Info</div><div>Mobile No</div><div>Plan</div><div>Duration</div><div>Days Left</div><div>Status</div><div className="text-right">Actions</div>
            </div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-4 border-b border-gray-800/50">
                <div className="w-10 h-10 bg-gray-800 rounded-xl animate-pulse shrink-0"></div>
                <div className="flex-1 grid grid-cols-[2fr_1fr_1fr_2fr_1fr_1fr_1fr] gap-2 items-center">
                  <div><div className="h-4 w-24 bg-gray-800 rounded animate-pulse mb-1"></div><div className="h-3 w-16 bg-gray-800 rounded animate-pulse"></div></div>
                  <div className="h-4 w-20 bg-gray-800 rounded animate-pulse"></div>
                  <div className="h-4 w-16 bg-gray-800 rounded animate-pulse"></div>
                  <div className="h-4 w-28 bg-gray-800 rounded animate-pulse"></div>
                  <div className="h-4 w-10 bg-gray-800 rounded animate-pulse"></div>
                  <div className="h-5 w-14 bg-gray-800 rounded-full animate-pulse"></div>
                  <div className="h-7 w-16 bg-gray-800 rounded-lg animate-pulse ml-auto"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="card bg-gray-900 border-gray-800 text-center py-16 text-gray-400">
            <Filter size={36} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No clients found</p>
            <p className="text-sm mt-1 text-gray-600">Try adjusting your filters or search.</p>
          </div>
        ) : (
          <div className="card p-0 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-lg">
            {/* Table header */}
            <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_2fr_1fr_1fr_1fr] gap-2 px-4 py-4 bg-gray-900/80 border-b border-gray-800 text-xs font-semibold text-gray-400 uppercase tracking-wider sticky top-0 z-10 backdrop-blur-sm">
              <div>Client Info</div>
              <div>Mobile No</div>
              <div>Plan</div>
              <div>Duration</div>
              <div>Days Left</div>
              <div>Status</div>
              <div className="text-right">Actions</div>
            </div>
            <div className="flex flex-col">
              {filteredClients.map(client => (
                <ClientCard
                  key={client._id}
                  client={client}
                  onView={(c) => navigate(`/owner/clients/${c._id}`)}
                  onDelete={selected => handleDelete(selected._id)}
                  onDuesClick={setDuesClient}
                />
              ))}
            </div>
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
              <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-sm p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
                <button onClick={() => setDuesClient(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
                  <X size={20} />
                </button>
                
                <div className="flex flex-col items-center mb-6 pt-2">
                  <div className="w-20 h-20 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center font-black text-3xl mb-4 border-2 border-red-500/20 shadow-inner">
                    {duesClient.avatar || duesClient.personalInfo?.name.charAt(0).toUpperCase()}
                  </div>
                  <h3 className="text-2xl font-black text-white text-center leading-tight mb-1">{duesClient.personalInfo?.name}</h3>
                  <p className="text-gray-500 font-mono text-sm uppercase tracking-tighter mb-3">{duesClient.clientId || 'ABC-XX'}</p>
                  <div className="flex flex-col items-center gap-1 opacity-80">
                    <p className="text-gray-400 text-sm font-medium">{duesClient.personalInfo?.mobileNo}</p>
                    <p className="text-gray-500 text-xs truncate max-w-[200px]">{duesClient.personalInfo?.email}</p>
                  </div>
                </div>

                <div className="space-y-4 mb-8 bg-gray-800/20 p-4 rounded-xl border border-gray-800/50">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400 font-medium">Plan Name</span>
                    <span className="text-white font-bold">{activeDuesMembership.planName || 'No Plan'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400 font-medium">Billing Period</span>
                    <span className="text-white font-bold">
                      {activeDuesMembership.startDate ? `${new Date(activeDuesMembership.startDate).toLocaleDateString('en-GB')} - ${new Date(activeDuesMembership.endDate).toLocaleDateString('en-GB')}` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400 font-medium">Total Amount</span>
                    <span className="text-white font-bold">₹{finalPrice}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400 font-medium">Paid Amount</span>
                    <span className="text-emerald-400 font-bold">₹{totalPaid}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm pt-3 border-t border-gray-800">
                    <span className="text-gray-400 font-medium">Balance Dues</span>
                    <span className="text-red-400 font-black text-lg">₹{balance}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400 font-medium">Due Date</span>
                    <span className="text-white font-bold">{activeDuesMembership.dueDate ? new Date(activeDuesMembership.dueDate).toLocaleDateString('en-GB') : 'N/A'}</span>
                  </div>
                </div>

                <Button onClick={() => { setDuesClient(null); navigate('/owner/clients-payment', { state: { showPaymentModal: true, client: duesClient } }); }} className="w-full !py-4 text-base font-bold shadow-xl shadow-primary/20">
                  Collect Payment
                </Button>
              </div>
            </div>
          );
        })()}

      </div>
    </div>
  );
};

export default Clients;
