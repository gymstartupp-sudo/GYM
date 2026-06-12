import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { toast } from 'react-toastify';
import Button from '../../components/Button';
import { Plus, Trash2, Edit2, X, ChevronDown, ChevronUp, Eye } from 'lucide-react';

// ─── Plan Detail Modal ──────────────────────────────────────────────────────
const PlanDetailModal = ({ plan, onClose }) => {
  if (!plan) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-start p-6 border-b border-gray-800">
          <div>
            <h2 className="text-2xl font-bold text-white">{plan.name}</h2>
            <p className="text-primary text-sm mt-1">{plan.durationMonths} month{plan.durationMonths !== 1 ? 's' : ''} plan</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors mt-1 ml-4">
            <X size={22} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-center bg-gray-800/60 rounded-lg p-4">
            <span className="text-gray-400 text-sm uppercase tracking-wider">Price</span>
            <span className="text-primary text-2xl font-black">₹{plan.price?.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between items-center bg-gray-800/60 rounded-lg p-4">
            <span className="text-gray-400 text-sm uppercase tracking-wider">Duration</span>
            <span className="text-white font-semibold">{plan.durationMonths} Month{plan.durationMonths !== 1 ? 's' : ''}</span>
          </div>
          <div className="bg-gray-800/60 rounded-lg p-4">
            <p className="text-gray-400 text-sm uppercase tracking-wider mb-2">Description</p>
            <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
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
        className="text-blue-400 hover:text-blue-300 bg-gray-800 hover:bg-gray-700 p-1.5 rounded-lg transition-colors"
      >
        <Edit2 size={14} />
      </button>
      <button
        onClick={() => onDelete(plan._id)}
        title="Delete plan"
        className="text-red-400 hover:text-red-300 bg-gray-800 hover:bg-gray-700 p-1.5 rounded-lg transition-colors"
      >
        <Trash2 size={14} />
      </button>
    </div>

    {/* Duration badge */}
    <span className="inline-block text-xs font-semibold bg-primary/10 text-primary border border-primary/20 rounded-full px-3 py-1 mb-4 w-fit">
      {plan.durationMonths}M Plan
    </span>

    <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
    <p className="text-primary text-3xl font-black mb-6">
      ₹{plan.price?.toLocaleString('en-IN')}
      <span className="text-sm text-gray-400 font-normal"> / {plan.durationMonths} mo</span>
    </p>

    {/* View Details button — description hidden by default */}
    <button
      onClick={() => onViewDetails(plan)}
      className="mt-auto w-full flex items-center justify-center gap-2 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm font-medium border border-gray-700 hover:border-gray-600"
    >
      <Eye size={15} /> View Details
    </button>
  </div>
);

// ─── Create / Edit Modal ────────────────────────────────────────────────────
const PlanFormModal = ({ editingPlan, onClose, onSuccess }) => {
  const [isCustom, setIsCustom] = useState(editingPlan?.isCustom ?? false);
  const [standardType, setStandardType] = useState('');
  const [formData, setFormData] = useState({
    name: editingPlan?.name || '',
    durationMonths: editingPlan?.durationMonths || '',
    price: editingPlan?.price || '',
    description: editingPlan?.description || ''
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
    const custom = category === 'Custom';
    setIsCustom(custom);
    setStandardType('');
    if (!custom) {
      setFormData(prev => ({ ...prev, name: '', durationMonths: '' }));
    }
  };

  const handleStandardSelect = (e) => {
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
    if (formData.name.trim().length > 25) {
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
    if (formData.description && formData.description.length > 150) {
      toast.error("Plan description cannot exceed 150 characters");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...formData, isCustom };
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
      <div className="bg-gray-900 border border-gray-700 w-full max-w-md rounded-xl shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white">{editingPlan ? 'Edit Plan' : 'Create New Plan'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Plan Category */}
          <div>
            <label className="text-xs text-gray-400 mb-2 block uppercase tracking-wider">Plan Category *</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleCategoryChange('Standard')}
                className={`py-2 px-4 rounded-lg border text-sm font-medium transition-all ${!isCustom ? 'bg-primary border-primary text-black' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'}`}
              >
                Standard
              </button>
              <button
                type="button"
                onClick={() => handleCategoryChange('Custom')}
                className={`py-2 px-4 rounded-lg border text-sm font-medium transition-all ${isCustom ? 'bg-primary border-primary text-black' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'}`}
              >
                Custom
              </button>
            </div>
          </div>

          {!isCustom ? (
            <div>
              <label className="text-xs text-gray-400 mb-1 block uppercase tracking-wider">Select Standard Plan *</label>
              <select 
                value={standardType} 
                onChange={handleStandardSelect} 
                required={!isCustom}
                className="input-field appearance-none cursor-pointer"
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
              <label className="text-xs text-gray-400 mb-1 block uppercase tracking-wider">Plan Name *</label>
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
              <label className="text-xs text-gray-400 mb-1 block uppercase tracking-wider">Duration (Months) *</label>
              <input 
                name="durationMonths" 
                value={formData.durationMonths} 
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                onChange={(e) => {
                  // Strip non-digits
                  const raw = e.target.value.replace(/\D/g, '');
                  // Enforce max 2 digits
                  const clamped = raw.slice(0, 2);
                  setFormData(prev => ({ ...prev, durationMonths: clamped }));
                  validateField('durationMonths', clamped);
                }}
                required 
                readOnly={!isCustom}
                className={`input-field ${!isCustom ? 'opacity-50 cursor-not-allowed bg-gray-800' : ''}`} 
                placeholder="1-12" 
              />
              {errors.durationMonths && <p className="text-red-500 text-xs mt-1">{errors.durationMonths}</p>}
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block uppercase tracking-wider">Price (₹) *</label>
              <input 
                name="price" 
                value={formData.price} 
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                onChange={(e) => {
                  // Strip non-digits
                  const raw = e.target.value.replace(/\D/g, '');
                  // Enforce max 5 digits
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
            <label className="text-xs text-gray-400 mb-1 block uppercase tracking-wider">Description (Optional)</label>
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
    <div className="flex bg-dark h-screen overflow-hidden">
      <></>
      <div className="flex-1 overflow-y-auto p-8 pt-10">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Gym Plans</h1>
            <p className="text-gray-400 mt-1">Manage your membership packages.</p>
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
          <div className="card bg-gray-900 border-gray-800 text-center py-16 text-gray-400">
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
      </div>

      {showFormModal && (
        <PlanFormModal
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
