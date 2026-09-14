import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import api from '../../utils/api';
import { toast } from 'react-toastify';
import { Plus, Trash2, X, Search, UserPlus, Edit2 } from 'lucide-react';
import Button from '../../components/Button';

const phoneError = 'Enter a valid 10-digit Indian mobile number';
const phoneRegex = /^[0-9]{10}$/; // Simple 10-digit check

const schema = yup.object({
  name: yup.string().trim().required('Name is required').matches(/^[a-zA-Z\s]+$/, 'Only letters and spaces are allowed').max(35, 'Max 35 chars'),
  phone: yup.string().matches(phoneRegex, phoneError).required(phoneError)
});

const Leads = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { name: '', phone: '' },
    mode: 'onChange'
  });

  const fetchLeads = async () => {
    try {
      const res = await api.get('/leads');
      setLeads(res.data.data || []);
    } catch (error) {
      toast.error('Failed to load leads list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleOpenModal = () => {
    reset({ name: '', phone: '' });
    setEditId(null);
    setIsModalOpen(true);
  };

  const handleEdit = (lead) => {
    reset({ name: lead.name, phone: lead.phone });
    setEditId(lead._id);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    reset({ name: '', phone: '' });
    setEditId(null);
  };

  const onSubmit = async (data) => {
    setIsSaving(true);
    try {
      if (editId) {
        await api.put(`/leads/${editId}`, data);
        toast.success('Lead updated successfully');
      } else {
        await api.post('/leads', data);
        toast.success('Lead added successfully');
      }
      handleCloseModal();
      fetchLeads();
    } catch (error) {
      if (error.response?.data?.errors) {
        error.response.data.errors.forEach(err => toast.error(err.message));
      } else {
        toast.error(error.response?.data?.message || `Failed to ${editId ? 'update' : 'add'} lead`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (id) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await api.delete(`/leads/${deleteConfirmId}`);
      toast.success('Lead deleted successfully');
      setDeleteConfirmId(null);
      fetchLeads();
    } catch (error) {
      toast.error('Failed to delete lead');
      setDeleteConfirmId(null);
    }
  };

  const filteredLeads = leads.filter(l => 
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.phone.includes(searchTerm)
  );

  return (
    <div className="p-4 sm:p-8 pt-10 h-full w-full max-w-[1600px] mx-auto animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">Leads Management</h1>
          <p className="text-text-secondary mt-1">Track potential clients who inquired about gym details.</p>
        </div>
        <Button onClick={handleOpenModal} className="flex items-center gap-2 shadow-lg shadow-primary/20">
          <Plus size={18} />
          Add New Lead
        </Button>
      </div>

      <div className="card bg-surface-secondary border-border p-4 mb-6 relative z-10">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <UserPlus className="text-primary" size={20} />
            All Leads
          </h2>
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-surface-card border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-text-primary focus:border-primary focus:outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      <div className="card bg-surface-secondary border-border p-0 overflow-hidden relative z-0">
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="text-center py-12 bg-surface-card border border-border border-dashed rounded-xl">
            <p className="text-text-secondary font-medium">No leads found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wider text-text-muted">
                  <th className="pb-3 pr-4 font-semibold pl-4">Name</th>
                  <th className="pb-3 px-4 font-semibold text-center">Mobile Number</th>
                  <th className="pb-3 px-4 font-semibold text-center">Added Date</th>
                  <th className="pb-3 font-semibold text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredLeads.map((l) => {
                  const avatarText = l.name ? l.name.charAt(0).toUpperCase() : 'L';
                  return (
                    <tr key={l._id} className="hover:bg-surface-card transition-colors group">
                      <td className="py-3 pl-4 pr-4">
                        <div className="flex gap-3 items-center min-w-0 w-full">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-lg border border-primary/20 shrink-0 shadow-inner group-hover:bg-primary group-hover:text-black transition-all duration-300">
                            {avatarText}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <h3 className="font-semibold text-text-primary truncate group-hover:text-primary transition-colors">{l.name}</h3>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center align-middle">
                        <p className="text-sm font-medium text-text-secondary">{l.phone}</p>
                      </td>
                      <td className="py-3 px-4 text-center align-middle">
                        <p className="text-sm font-medium text-text-secondary">
                          {new Date(l.createdAt).toLocaleDateString('en-GB').replace(/\//g, '-')}
                        </p>
                      </td>
                      <td className="py-3 text-right align-middle pr-4">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleEdit(l)} className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded transition-colors" title="Edit">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDeleteClick(l._id)} className="p-1.5 text-red-400 hover:bg-red-400/10 rounded transition-colors" title="Remove">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Lead Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCloseModal}></div>
          <div className="relative w-full max-w-sm bg-surface-secondary border border-border rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                {editId ? <Edit2 className="text-primary" /> : <UserPlus className="text-primary" />} 
                {editId ? 'Edit Lead' : 'Add New Lead'}
              </h2>
              <button onClick={handleCloseModal} className="text-text-secondary hover:text-text-primary transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit, () => { toast.error('Please fill all the mandatory fields correctly.'); })} className="space-y-4" noValidate>
              <div>
                <p className="text-xs text-text-secondary mb-1">Name <span className="text-red-500">*</span></p>
                <input {...register('name')} onInput={(e) => { e.target.value = e.target.value.replace(/[^a-zA-Z\s]/g, ''); }} maxLength="35" className={`input-field w-full ${errors.name ? 'border-red-500' : ''}`} />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>
              
              <div>
                <p className="text-xs text-text-secondary mb-1">Mobile Number <span className="text-red-500">*</span></p>
                <input {...register('phone')} type="tel" onInput={(e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10); }} maxLength="10" className={`input-field w-full ${errors.phone ? 'border-red-500' : ''}`} />
                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="secondary" className="flex-1" onClick={handleCloseModal}>Cancel</Button>
                <Button type="submit" className="flex-1" isLoading={isSaving}>{editId ? 'Save Changes' : 'Add Lead'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)}></div>
          <div className="relative w-full max-w-sm bg-surface-secondary border border-border rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-text-primary mb-2">Delete Lead</h3>
            <p className="text-text-secondary mb-6 text-sm">Are you sure you want to delete this lead? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setDeleteConfirmId(null)} className="flex-1">
                Cancel
              </Button>
              <Button type="button" onClick={confirmDelete} className="flex-1 bg-red-500 hover:bg-red-600 text-white border-transparent">
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leads;
