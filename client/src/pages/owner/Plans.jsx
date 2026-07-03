import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { toast } from 'react-toastify';
import Button from '../../components/Button';
import { Plus, Trash2, Edit2, X, ChevronDown, ChevronUp, Eye, Users } from 'lucide-react';

// ─── Plan Detail Modal ──────────────────────────────────────────────────────
const PlanDetailModal = ({ plan, onClose }) => {
  if (!plan) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-surface-secondary border border-border rounded-xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-start p-6 border-b border-border">
          <div>
            <h2 className="text-2xl font-bold text-text-primary">{plan.name}</h2>
            <p className="text-primary text-sm mt-1">{plan.durationMonths} month{plan.durationMonths !== 1 ? 's' : ''} plan</p>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors mt-1 ml-4">
            <X size={22} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-center bg-surface-hover/60 rounded-xl p-4 border border-border/70">
            <span className="text-text-secondary text-sm uppercase tracking-wider">Price</span>
            <span className="text-primary text-2xl font-black">₹{plan.price?.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between items-center bg-surface-hover/60 rounded-xl p-4 border border-border/70">
            <span className="text-text-secondary text-sm uppercase tracking-wider">Duration</span>
            <span className="text-text-primary font-semibold">{plan.durationMonths} Month{plan.durationMonths !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex justify-between items-center bg-surface-hover/60 rounded-xl p-4 border border-border/70">
            <span className="text-text-secondary text-sm uppercase tracking-wider">Partial Payment Due Limit</span>
            <span className="text-text-primary font-semibold">{plan.partialPaymentDueDays ?? 15} Day{(plan.partialPaymentDueDays ?? 15) !== 1 ? 's' : ''}</span>
          </div>
          <div className="bg-surface-hover/60 rounded-xl p-4 border border-border/70">
            <p className="text-text-secondary text-sm uppercase tracking-wider mb-2">Description</p>
            <p className="text-text-primary text-sm leading-relaxed whitespace-pre-wrap">
              {plan.description?.trim() || 'No description provided for this plan.'}
            </p>
          </div>
        </div>
        <div className="p-6 pt-0">
          <Button variant="secondary" onClick={onClose} className="w-full">Close</Button>
        </div>
      </div>
    </div>
  );
};

// ─── Plan Card ──────────────────────────────────────────────────────────────
const PlanCard = ({ plan, onEdit, onDelete, onViewDetails }) => (
  <div className="card relative flex flex-col group border-primary/20 hover:border-primary/50 transition-all duration-300 hover:shadow-primary/10 hover:shadow-xl">
    {/* Hover actions */}
    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      <button
        onClick={() => onEdit(plan)}
        title="Edit plan"
        className="text-blue-400 hover:text-blue-300 bg-surface-divider hover:bg-surface-hover p-1.5 rounded-lg transition-colors"
      >
        <Edit2 size={14} />
      </button>
      <button
        onClick={() => onDelete(plan._id)}
        title="Delete plan"
        className="text-red-400 hover:text-red-300 bg-surface-divider hover:bg-surface-hover p-1.5 rounded-lg transition-colors"
      >
        <Trash2 size={14} />
      </button>
    </div>

    {/* Header info */}
    <div className="flex items-center gap-2 mb-4">
      <span className="inline-block text-xs font-semibold bg-primary/10 text-primary border border-primary/20 rounded-full px-3 py-1 w-fit">
        {plan.durationMonths}M Plan
      </span>
      <span className="text-xs font-medium text-text-secondary bg-surface-divider border border-border px-2.5 py-1 rounded-full flex items-center gap-1.5" title="Clients using this plan">
        <Users size={12} className="text-primary" /> {plan.clientCount || 0} client{plan.clientCount !== 1 ? 's' : ''}
      </span>
    </div>

    <h3 className="text-xl font-bold text-text-primary mb-1">{plan.name}</h3>
    <p className="text-primary text-3xl font-black mb-6">
      ₹{plan.price?.toLocaleString('en-IN')}
      <span className="text-sm text-text-secondary font-normal"> / {plan.durationMonths} mo</span>
    </p>

    {/* View Details button — description hidden by default */}
    <button
      onClick={() => onViewDetails(plan)}
      className="mt-auto w-full flex items-center justify-center gap-2 py-2.5 bg-surface-divider hover:bg-surface-hover text-text-primary rounded-lg transition-colors text-sm font-medium border border-border hover:border-gray-600"
    >
      <Eye size={15} /> View Details
    </button>
  </div>
);

// ─── Create / Edit Modal ────────────────────────────────────────────────────
const PlanFormModal = ({ plans = [], editingPlan, onClose, onSuccess }) => {
  const [isCustom, setIsCustom] = useState(editingPlan?.isCustom ?? false);
  const [standardType, setStandardType] = useState('');
  const [formData, setFormData] = useState({
    name: editingPlan?.name || '',
    durationMonths: editingPlan?.durationMonths || '',
    price: editingPlan?.price || '',
    description: editingPlan?.description || '',
    partialPaymentDueDays: editingPlan?.partialPaymentDueDays ?? 15
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const validateField = (name, val) => {
    let errMessage = '';
    if (name === 'name') {
      if (val.trim().length > 25) {
        errMessage = 'Plan name cannot exceed 25 characters';
      }
    } else if (name === 'durationMonths') {
      const num = Number(val);
      if (val !== '') {
        if (isNaN(num) || !Number.isInteger(num) || num < 1) {
          errMessage = 'Duration must be a whole number between 1 and 12';
        } else if (num > 12) {
          errMessage = 'Duration cannot exceed 12 months';
        }
      }
    } else if (name === 'price') {
      const num = Number(val);
      if (val !== '') {
        if (isNaN(num) || num < 0) {
          errMessage = 'Enter a valid price';
        } else if (num >= 100000) {
          errMessage = 'Plan price must be under ₹1,00,000';
        }
      }
    } else if (name === 'partialPaymentDueDays') {
      const num = Number(val);
      if (val !== '') {
        if (isNaN(num) || !Number.isInteger(num) || num < 1) {
          errMessage = 'Due days must be a positive whole number';
        } else if (num > 90) {
          errMessage = 'Due days cannot exceed 90 days';
        }
      }
    } else if (name === 'description') {
      if (val.length > 150) {
        errMessage = 'Plan description cannot exceed 150 characters';
      }
    }

    setErrors(prev => {
      const newErr = { ...prev };
      if (errMessage) {
        newErr[name] = errMessage;
      } else {
        delete newErr[name];
      }
      return newErr;
    });
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    validateField(name, value);
  };

  useEffect(() => {
    if (editingPlan && !editingPlan.isCustom) {
      setStandardType(editingPlan.name);
    }
  }, [editingPlan]);

  const handleCategoryChange = (category) => {
    if (editingPlan?.isAssigned) return;
    const custom = category === 'Custom';
    setIsCustom(custom);
    setStandardType('');
    if (!custom) {
      setFormData(prev => ({ ...prev, name: '', durationMonths: '' }));
    }
  };

  const handleStandardSelect = (e) => {
    if (editingPlan?.isAssigned) return;
    const type = e.target.value;
    setStandardType(type);
    let name = '';
    let duration = '';

    switch (type) {
      case 'Monthly': name = 'Monthly'; duration = 1; break;
      case 'Quarterly': name = 'Quarterly'; duration = 3; break;
      case 'Half-Yearly': name = 'Half-Yearly'; duration = 6; break;
      case 'Yearly': name = 'Yearly'; duration = 12; break;
      default: break;
    }

    setFormData(prev => ({ ...prev, name, durationMonths: duration }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (Object.keys(errors).length > 0) {
      toast.error("Please fix validation errors first");
      return;
    }

    // Input Normalization
    const cleanName = formData.name.trim().replace(/\s+/g, ' ');
    if (cleanName.length > 25) {
      toast.error("Plan name cannot exceed 25 characters");
      return;
    }
    if (Number(formData.durationMonths) > 12) {
      toast.error("Plan duration cannot exceed 12 months");
      return;
    }
    if (Number(formData.price) >= 100000) {
      toast.error("Plan price must be under 1 Lakh");
      return;
    }
    if (formData.partialPaymentDueDays !== '') {
      const dueDaysNum = Number(formData.partialPaymentDueDays);
      if (isNaN(dueDaysNum) || !Number.isInteger(dueDaysNum) || dueDaysNum < 1 || dueDaysNum > 90) {
        toast.error("Partial payment due limit must be a whole number between 1 and 90 days");
        return;
      }
    }
    if (formData.description && formData.description.length > 150) {
      toast.error("Plan description cannot exceed 150 characters");
      return;
    }

    // Protect historical membership changes on submit
    if (editingPlan && editingPlan.isAssigned) {
      const isCustomChanged = isCustom !== editingPlan.isCustom;
      const durationChanged = Number(formData.durationMonths) !== editingPlan.durationMonths;
      if (isCustomChanged || durationChanged) {
        toast.error('This membership plan has already been assigned to clients and its duration or type cannot be changed.');
        return;
      }
    }

    // Case-Insensitive Duplicate Name check
    const normalizedName = cleanName.toLowerCase();
    const nameConflict = plans.some(p => {
      if (editingPlan && p._id === editingPlan._id) return false;
      const pNorm = p.name.trim().replace(/\s+/g, ' ').toLowerCase();
      return pNorm === normalizedName;
    });
    if (nameConflict) {
      toast.error(`A membership plan named "${cleanName}" already exists. Please choose another name.`);
      return;
    }

    // Duplicate Standard Duration check
    if (!isCustom) {
      const durationConflict = plans.some(p => {
        if (editingPlan && p._id === editingPlan._id) return false;
        return !p.isCustom && Number(p.durationMonths) === Number(formData.durationMonths);
      });
      if (durationConflict) {
        toast.error(`A standard ${formData.durationMonths} Month membership plan already exists. Only one active standard plan is allowed for each duration.`);
        return;
      }
    }

    setSaving(true);
    try {
      const payload = { 
        ...formData, 
        name: cleanName, 
        isCustom,
        partialPaymentDueDays: formData.partialPaymentDueDays ? Number(formData.partialPaymentDueDays) : 15
      };
      if (editingPlan) {
        await api.put(`/plan/${editingPlan._id}`, payload);
        toast.success('Plan updated');
      } else {
        await api.post('/plan', payload);
        toast.success('Plan created');
      }
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || (editingPlan ? 'Failed to update plan' : 'Failed to create plan'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-surface-secondary border border-border w-full max-w-md rounded-xl shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-border">
          <h2 className="text-xl font-bold text-text-primary">{editingPlan ? 'Edit Plan' : 'Create New Plan'}</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Assigned Locked Banner */}
          {editingPlan?.isAssigned && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-xs text-yellow-500 flex items-start gap-2 leading-relaxed mb-2">
              <span className="font-bold uppercase tracking-wider shrink-0 mt-0.5 border border-yellow-500/40 rounded px-1 text-[9px] bg-yellow-500/10">Locked</span>
              <span>This membership plan has already been assigned to clients. Its duration and type cannot be changed because they are part of historical membership records.</span>
            </div>
          )}

          {/* Plan Category */}
          <div>
            <label className="text-xs text-text-secondary mb-2 block uppercase tracking-wider">Plan Category *</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleCategoryChange('Standard')}
                disabled={editingPlan?.isAssigned}
                className={`py-2 px-4 rounded-lg border text-sm font-medium transition-all ${!isCustom ? 'bg-primary border-primary text-black' : 'bg-surface-divider border-border text-text-secondary hover:border-gray-600'} ${editingPlan?.isAssigned ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Standard
              </button>
              <button
                type="button"
                onClick={() => handleCategoryChange('Custom')}
                disabled={editingPlan?.isAssigned}
                className={`py-2 px-4 rounded-lg border text-sm font-medium transition-all ${isCustom ? 'bg-primary border-primary text-black' : 'bg-surface-divider border-border text-text-secondary hover:border-gray-600'} ${editingPlan?.isAssigned ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Custom
              </button>
            </div>
          </div>

          {!isCustom ? (
            <div>
              <label className="text-xs text-text-secondary mb-1 block uppercase tracking-wider">Select Standard Plan *</label>
              <select 
                value={standardType} 
                onChange={handleStandardSelect} 
                required={!isCustom}
                disabled={editingPlan?.isAssigned}
                className={`input-field appearance-none cursor-pointer ${editingPlan?.isAssigned ? 'opacity-50 cursor-not-allowed bg-surface-divider' : ''}`}
              >
                <option value="">-- Choose Plan --</option>
                <option value="Monthly">Monthly (1 Month)</option>
                <option value="Quarterly">Quarterly (3 Months)</option>
                <option value="Half-Yearly">Half-Yearly (6 Months)</option>
                <option value="Yearly">Yearly (12 Months)</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="text-xs text-text-secondary mb-1 block uppercase tracking-wider">Plan Name *</label>
              <input 
                name="name" 
                value={formData.name} 
                onChange={handleChange} 
                required 
                className="input-field" 
                placeholder="e.g. Special Offer" 
                maxLength="25"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-text-secondary mb-1 block uppercase tracking-wider">Duration (Months) *</label>
              <input 
                name="durationMonths" 
                value={formData.durationMonths} 
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                onChange={(e) => {
                  if (editingPlan?.isAssigned) return;
                  const raw = e.target.value.replace(/\D/g, '');
                  const clamped = raw.slice(0, 2);
                  setFormData(prev => ({ ...prev, durationMonths: clamped }));
                  validateField('durationMonths', clamped);
                }}
                required 
                readOnly={!isCustom || editingPlan?.isAssigned}
                className={`input-field ${(!isCustom || editingPlan?.isAssigned) ? 'opacity-50 cursor-not-allowed bg-surface-divider' : ''}`} 
                placeholder="1-12" 
              />
              {errors.durationMonths && <p className="text-red-500 text-xs mt-1">{errors.durationMonths}</p>}
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-1 block uppercase tracking-wider">Price (₹) *</label>
              <input 
                name="price" 
                value={formData.price} 
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '');
                  const clamped = raw.slice(0, 5);
                  setFormData(prev => ({ ...prev, price: clamped }));
                  validateField('price', clamped);
                }}
                required 
                className="input-field" 
                placeholder="e.g. 1500" 
              />
              {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
            </div>
          </div>

          <div>
            <label className="text-xs text-text-secondary mb-1 block uppercase tracking-wider">Partial Payment Due Limit (Days) *</label>
            <input 
              name="partialPaymentDueDays" 
              value={formData.partialPaymentDueDays} 
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, '');
                const clamped = raw.slice(0, 2);
                setFormData(prev => ({ ...prev, partialPaymentDueDays: clamped }));
                validateField('partialPaymentDueDays', clamped);
              }}
              required 
              className="input-field" 
              placeholder="e.g. 15" 
            />
            {errors.partialPaymentDueDays && <p className="text-red-500 text-xs mt-1">{errors.partialPaymentDueDays}</p>}
          </div>

          <div>
            <label className="text-xs text-text-secondary mb-1 block uppercase tracking-wider">Description (Optional)</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="input-field h-24 resize-none"
              placeholder="Features included in this plan..."
              maxLength="150"
            />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" isLoading={saving}>{editingPlan ? 'Update Plan' : 'Create Plan'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main Plans Page ────────────────────────────────────────────────────────
const Plans = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [detailPlan, setDetailPlan] = useState(null);

  const fetchPlans = async () => {
    try {
      const res = await api.get('/plan');
      setPlans(res.data.data || []);
    } catch {
      toast.error('Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPlans(); }, []);

  const handleEdit = (plan) => { setEditingPlan(plan); setShowFormModal(true); };
  const handleCreateNew = () => { setEditingPlan(null); setShowFormModal(true); };
  const handleFormSuccess = () => { setShowFormModal(false); setEditingPlan(null); fetchPlans(); };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to deactivate this plan?')) {
      try {
        await api.delete(`/plan/${id}`);
        toast.success('Plan removed');
        fetchPlans();
      } catch {
        toast.error('Failed to remove plan');
      }
    }
  };

  return (
    <div className="p-8 pt-10">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text-primary tracking-tight">Gym Plans</h1>
            <p className="text-text-secondary mt-1">Manage your membership packages.</p>
          </div>
          <Button onClick={handleCreateNew} className="gap-2">
            <Plus size={18} /> Create Plan
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : plans.length === 0 ? (
          <div className="card bg-surface-secondary border-border text-center py-16 text-text-secondary">
            <p className="font-medium">No plans yet</p>
            <p className="text-sm mt-1 text-gray-600">Click "Create Plan" to add your first membership plan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map(plan => (
              <PlanCard
                key={plan._id}
                plan={plan}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onViewDetails={setDetailPlan}
              />
            ))}
          </div>
        )}

      {showFormModal && (
        <PlanFormModal
          plans={plans}
          editingPlan={editingPlan}
          onClose={() => { setShowFormModal(false); setEditingPlan(null); }}
          onSuccess={handleFormSuccess}
        />
      )}

      {detailPlan && (
        <PlanDetailModal
          plan={detailPlan}
          onClose={() => setDetailPlan(null)}
        />
      )}
    </div>
  );
};

export default Plans;
