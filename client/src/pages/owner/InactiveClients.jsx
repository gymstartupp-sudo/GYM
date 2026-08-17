import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../utils/api';
import { toast } from 'react-toastify';
import { Search, Filter, Plus, X, ChevronDown, Check } from 'lucide-react';
import Button from '../../components/Button';
import ClientForm from '../../components/ClientForm';
import ClientCard from '../../components/ClientCard';
import ClientDetail from './ClientDetail';
import PaymentModal from '../../components/PaymentModal';
import ConfirmModal from '../../components/ConfirmModal';
import Pagination from '../../components/Pagination';

// ─── Status options config ───────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: 'All', label: 'All Status' },
  { value: 'Upcoming', label: 'Upcoming', dot: 'bg-blue-500' },
  { value: 'Active', label: 'Active', dot: 'bg-emerald-500' },
  { value: 'Expiring Soon', label: 'Expiring Soon', dot: 'bg-warning' },
  { value: 'Dues', label: 'Dues', dot: 'bg-red-500' },
  { value: 'Expired', label: 'Expired', dot: 'bg-gray-500' },
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

// ─── Main Inactive Clients Page ──────────────────────────────────────────────────
const InactiveClients = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [clients, setClients] = useState([]);
  const [plans, setPlans] = useState([]);
  const [allPayments, setAllPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  // Reset page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterPlan]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formInstanceKey, setFormInstanceKey] = useState(0);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [viewClientId, setViewClientId] = useState(null);
  const [duesClient, setDuesClient] = useState(null);
  const [reactivateClientId, setReactivateClientId] = useState(null);
  const [reactivateClientName, setReactivateClientName] = useState('');

  // Delete confirmation modal states
  const [deleteClientId, setDeleteClientId] = useState(null);
  const [deleteClientName, setDeleteClientName] = useState('');

  // Payment Renewal Modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedClientForRenewal, setSelectedClientForRenewal] = useState(null);

  // Fetch plans and payments once
  useEffect(() => {
    Promise.all([
      api.get('/plan'),
      api.get('/payment')
    ]).then(([plansRes, paymentsRes]) => {
      setPlans(plansRes.data.data || []);
      setAllPayments(paymentsRes.data.data || []);
    }).catch(() => { });
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
      const res = await api.get(`/client/inactive?${params.toString()}`);
      setClients(res.data.data || []);
    } catch {
      toast.error('Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterPlan]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  // Modal helpers
  const closeAddModal = () => {
    setShowAddModal(false);
    setFormInstanceKey(k => k + 1);
    setIsFormDirty(false);
  };

  const handleReactivate = async (client) => {
    // Determine status - use the same logic as ClientCard for consistency
    const currentPlan = client?.memberships?.find(p => {
      const t = new Date();
      t.setHours(0, 0, 0, 0);
      const s = new Date(p.startDate);
      s.setHours(0, 0, 0, 0);
      const e = new Date(p.endDate);
      e.setHours(0, 0, 0, 0);
      return t >= s && t <= e;
    }) || (client?.membership?.startDate ? client.membership : null);

    let status = 'Expired';
    if (currentPlan) {
      const t = new Date();
      t.setHours(0, 0, 0, 0);
      const s = new Date(currentPlan.startDate);
      s.setHours(0, 0, 0, 0);
      const e = new Date(currentPlan.endDate);
      e.setHours(0, 0, 0, 0);
      if (t < s) status = 'Upcoming';
      else if (t > e) status = 'Expired';
      else status = 'Active';
    }

    // CASE 1: Active, Upcoming, Expiring Soon (Expiring Soon is a subset of Active in this check) -> Show confirmation
    if (status === 'Active' || status === 'Upcoming') {
      setReactivateClientId(client._id);
      setReactivateClientName(client.personalInfo.name);
    }
    // CASE 2: Expired -> Open Record Payment for renewal
    else {
      setSelectedClientForRenewal(client);
      setShowPaymentModal(true);
    }
  };

  const confirmReactivate = async () => {
    if (!reactivateClientId) return;
    try {
      await api.put(`/client/${reactivateClientId}/reactivate`);
      toast.success('Client reactivated successfully');
      setReactivateClientId(null);
      setReactivateClientName('');
      fetchClients();
    } catch {
      toast.error('Failed to reactivate client');
    }
  };

  const handleRenewalSave = async (paymentData) => {
    try {
      if (paymentData._isUpdate && paymentData._paymentId) {
        // Update existing pending payment
        const additionalAmount = Number(paymentData.paidAmount) || 0;
        if (additionalAmount <= 0) {
          setShowPaymentModal(false);
          return;
        }
        await api.put(`/payment/${paymentData._paymentId}`, {
          additionalAmount,
          paymentMethod: paymentData.paymentMethod
        });
        toast.success('Payment updated successfully');
      } else {
        // New payment / renewal
        await api.post('/payment', paymentData);
        // Reactivate client
        await api.put(`/client/${selectedClientForRenewal._id}/reactivate`);
        toast.success('Membership renewed and client reactivated');
      }
      setShowPaymentModal(false);
      setSelectedClientForRenewal(null);
      fetchClients();
      // Refresh payments
      api.get('/payment').then(res => setAllPayments(res.data.data || [])).catch(() => { });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to process payment');
      throw error;
    }
  };

  const handleDelete = async (client) => {
    setDeleteClientId(client._id);
    setDeleteClientName(client.personalInfo.name);
  };

  const confirmDelete = async () => {
    if (!deleteClientId) return;
    try {
      await api.delete(`/client/${deleteClientId}`);
      toast.success('Client deleted successfully');
      setDeleteClientId(null);
      setDeleteClientName('');
      fetchClients();
    } catch (error) {
      toast.error('Failed to delete client');
    }
  };

  // Client-side search on top of server-side status+plan filter
  const filteredClients = clients.filter(c =>
    c.personalInfo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.clientId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.personalInfo.mobileNo.includes(searchTerm)
  );

  const paginatedClients = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredClients.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredClients, currentPage]);

  const hasStatusFilter = filterStatus !== 'All';
  const hasPlanFilter = filterPlan !== 'All';
  const activeFilterCount = (hasStatusFilter ? 1 : 0) + (hasPlanFilter ? 1 : 0);

  const clearAll = () => { setFilterStatus('All'); setFilterPlan('All'); };

  return (
    <div className="p-8 pt-10">

      {/* ── Page Header ── */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">Inactive Clients</h1>
          <p className="text-text-secondary mt-1">Manage deactivated gym members.</p>
        </div>
      </div>

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
          <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_2fr_1fr_1fr_1.8fr] gap-2 px-4 py-4 bg-surface-secondary/80 border-b border-border text-xs font-semibold text-text-secondary uppercase tracking-wider">
            <div>Client Info</div><div className="text-center">Mobile No</div><div className="text-center">Plan</div><div className="text-center">Duration</div><div className="text-center">Days Left</div><div className="text-center">Status</div><div className="text-right">Actions</div>
          </div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-4 border-b border-border/50">
              <div className="w-10 h-10 bg-surface-divider rounded-xl animate-pulse shrink-0"></div>
              <div className="flex-1 grid grid-cols-[2fr_1fr_1fr_2fr_1fr_1fr_1.8fr] gap-2 items-center">
                <div><div className="h-4 w-24 bg-surface-divider rounded animate-pulse mb-1"></div><div className="h-3 w-16 bg-surface-divider rounded animate-pulse"></div></div>
                <div className="h-4 w-20 bg-surface-divider rounded animate-pulse mx-auto"></div>
                <div className="h-4 w-16 bg-surface-divider rounded animate-pulse mx-auto"></div>
                <div className="h-4 w-28 bg-surface-divider rounded animate-pulse mx-auto"></div>
                <div className="h-4 w-10 bg-surface-divider rounded animate-pulse mx-auto"></div>
                <div className="h-5 w-14 bg-surface-divider rounded-full animate-pulse mx-auto"></div>
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
          <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_2fr_1fr_1fr_1.8fr] gap-2 px-4 py-4 bg-surface-secondary/80 border-b border-border text-xs font-semibold text-text-secondary uppercase tracking-wider sticky top-0 z-10 backdrop-blur-sm">
            <div>Client Info</div>
            <div className="text-center">Mobile No</div>
            <div className="text-center">Plan</div>
            <div className="text-center">Duration</div>
            <div className="text-center">Days Left</div>
            <div className="text-center">Status</div>
            <div className="text-right">Actions</div>
          </div>
          <div className="flex flex-col">
            {paginatedClients.map(client => (
              <ClientCard
                key={client._id}
                client={client}
                onView={(c) => setViewClientId(c._id)}
                showReactivate={true}
                onReactivate={handleReactivate}
                onDuesClick={setDuesClient}
                onDelete={handleDelete}
                deleteLabel="Delete"
                hideReminders
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

      {/* View Client Modal */}
      {viewClientId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative bg-surface-secondary border border-border/50 rounded-xl w-full max-w-4xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border flex justify-between items-center shrink-0">
              <h2 className="text-lg font-bold text-text-primary">Client Details</h2>
              <button onClick={() => setViewClientId(null)} className="text-text-secondary hover:text-text-primary transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="overflow-y-auto custom-scrollbar flex-1">
              <ClientDetail clientId={viewClientId} onClose={() => { setViewClientId(null); fetchClients(); }} />
            </div>
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

              <Button
                onClick={() => {
                  const client = duesClient;
                  setDuesClient(null);
                  setSelectedClientForRenewal(client);
                  setShowPaymentModal(true);
                }}
                className="w-full !py-4 text-base font-bold shadow-xl shadow-primary/20"
              >
                Collect Payment
              </Button>
            </div>
          </div>
        );
      })()}

      {/* ── Renewal Payment Modal ── */}
      {showPaymentModal && selectedClientForRenewal && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => { setShowPaymentModal(false); setSelectedClientForRenewal(null); }}
          onSave={handleRenewalSave}
          clientData={selectedClientForRenewal}
          lockClient={true}
          plans={plans}
          payments={allPayments}
        />
      )}

      <ConfirmModal
        isOpen={!!reactivateClientId}
        onCancel={() => { setReactivateClientId(null); setReactivateClientName(''); }}
        onConfirm={confirmReactivate}
        title="Reactivate Client"
        message={`Are you sure you want to reactivate ${reactivateClientName}?`}
        confirmLabel="Reactivate"
      />

      <ConfirmModal
        isOpen={!!deleteClientId}
        onCancel={() => { setDeleteClientId(null); setDeleteClientName(''); }}
        onConfirm={confirmDelete}
        title="Delete Client"
        message="Are you sure you want to delete this client? Their historical records will be preserved. If they register again with the same phone number or email, their previous details can be retrieved automatically."
        confirmLabel="Delete"
        danger
      />

    </div>
  );
};

export default InactiveClients;
