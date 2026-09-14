import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import api from '../../utils/api';
import { toast } from 'react-toastify';
import { Plus, Edit2, Trash2, X, Users, Search, Eye } from 'lucide-react';
import Button from '../../components/Button';
import CustomDatePicker from '../../components/CustomDatePicker';
import {
  DATE_RULES,
  getDateYearValidationError,
  getDobYearBounds,
  toDateInputString,
  validateDob,
} from '../../utils/dateInput';

const phoneError = 'Enter a valid 10-digit Indian mobile number';
const phoneRegex = /^[6-9]\d{9}$/;
const gmailError = 'Email address must end with @gmail.com';
const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;

const schema = yup.object({
  name: yup.string().trim().required('Name is required').matches(/^[a-zA-Z\s]+$/, 'Only letters and spaces are allowed').max(35, 'Max 35 chars'),
  role: yup.string().trim().required('Role is required').matches(/^[a-zA-Z\s]+$/, 'Only letters and spaces are allowed').max(35, 'Max 35 chars'),
  phone: yup.string().matches(phoneRegex, phoneError).required(phoneError),
  email: yup.string().trim().email('Please enter a valid email address').matches(gmailRegex, gmailError).max(50, 'Email cannot exceed 50 characters').required('Email is required'),
  dob: yup.date()
    .typeError('Date of birth is required')
    .transform((val, orig) => (orig === '' || orig === null || orig === undefined ? null : val))
    .nullable()
    .required('Date of birth is required')
    .test('dobValidation', function (value) {
      if (!value) return this.createError({ message: 'Date of birth is required' });
      const error = validateDob(toDateInputString(value));
      if (error) return this.createError({ message: error });
      return true;
    }),
  salary: yup.number().min(0, 'Salary must be positive').typeError('Salary must be a valid number').required('Salary is required').transform((v, o) => (o === '' || o === null) ? null : v),
  address: yup.string().trim().max(100, 'Max 100 chars').required('Address is required')
});

const Staff = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [viewingStaff, setViewingStaff] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const { register, handleSubmit, reset, watch, setValue, setError, clearErrors, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      name: '', role: '', phone: '', email: '', dob: '', address: '', salary: ''
    },
    mode: 'onChange'
  });

  const dobField = register('dob');
  const values = watch();
  const { minYear: dobMinYear, maxYear: dobMaxYear } = getDobYearBounds();

  const handleDateBlur = (field, e) => {
    const val = e.target.value || '';
    const parts = val.split('-');
    if (parts.length === 3) {
      const [d, m, y] = parts;
      if (d.length === 2 && m.length === 2 && y.length === 4 && /^\d+$/.test(d) && /^\d+$/.test(m) && /^\d+$/.test(y)) {
        const iso = `${y}-${m}-${d}`;
        setValue(field, iso, { shouldValidate: true });
      }
    }
  };

  const handleDateValidationError = (field, message) => {
    if (message) {
      setError(field, { type: 'manual', message });
    } else {
      clearErrors(field);
    }
  };

  const fetchStaff = async () => {
    try {
      const res = await api.get('/staff');
      setStaff(res.data.data);
    } catch (error) {
      toast.error('Failed to load staff list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleOpenModal = (staffMember = null) => {
    if (staffMember) {
      setEditingStaff(staffMember);
      reset({
        name: staffMember.name || '',
        role: staffMember.role || '',
        phone: staffMember.phone || '',
        email: staffMember.email || '',
        dob: staffMember.dob ? new Date(staffMember.dob).toISOString().split('T')[0] : '',
        address: staffMember.address || '',
        salary: staffMember.salary || ''
      });
    } else {
      setEditingStaff(null);
      reset({ name: '', role: '', phone: '', email: '', dob: '', address: '', salary: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingStaff(null);
    reset();
  };

  const onSubmit = async (data) => {
    setIsSaving(true);
    try {
      const payload = { ...data, salary: data.salary ? Number(data.salary) : 0 };
      if (editingStaff) {
        await api.put(`/staff/${editingStaff._id}`, payload);
        toast.success('Staff updated successfully');
      } else {
        await api.post('/staff', payload);
        toast.success('Staff added successfully');
      }
      handleCloseModal();
      fetchStaff();
    } catch (error) {
      if (error.response?.data?.errors) {
        error.response.data.errors.forEach(err => toast.error(err.message));
      } else {
        toast.error(error.response?.data?.message || 'Failed to save staff');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to remove this staff member?')) {
      try {
        await api.delete(`/staff/${id}`);
        toast.success('Staff removed');
        fetchStaff();
      } catch (error) {
        toast.error('Failed to remove staff');
      }
    }
  };

  const filteredStaff = staff.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.phone.includes(searchTerm)
  );

  return (
    <div className="p-4 md:p-8 md:pt-10 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-text-primary tracking-tight flex items-center gap-3">
            Staff Management
          </h1>
          <p className="text-text-secondary mt-2 text-base md:text-lg">Manage your gym employees and trainers.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="flex items-center gap-2">
          <Plus size={18} /> Add Staff
        </Button>
      </div>

      <div className="card space-y-6 bg-surface-secondary border-border shadow-xl rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <Users className="text-primary" /> Active Staff
          </h2>
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
            <input
              type="text"
              placeholder="Search by name, role, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-surface-card border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-text-primary focus:border-primary focus:outline-none transition-colors"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="text-center py-12 bg-surface-card border border-border border-dashed rounded-xl">
            <p className="text-text-secondary font-medium">No staff members found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wider text-text-muted">
                  <th className="pb-3 pr-4 font-semibold">Name</th>
                  <th className="pb-3 px-4 font-semibold text-center">Role</th>
                  <th className="pb-3 px-4 font-semibold text-center">Contact</th>
                  <th className="pb-3 px-4 font-semibold text-center">Salary</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredStaff.map((s) => {
                  const avatarText = s.name ? s.name.charAt(0).toUpperCase() : 'S';
                  return (
                    <tr key={s._id} className="hover:bg-surface-card transition-colors group">
                      <td className="py-3 pr-4">
                        <div className="flex gap-3 items-center min-w-0 w-full">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-lg border border-primary/20 shrink-0 shadow-inner group-hover:bg-primary group-hover:text-black transition-all duration-300">
                            {avatarText}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <h3 className="font-semibold text-text-primary truncate group-hover:text-primary transition-colors">{s.name}</h3>
                            {s.email && <p className="text-xs text-text-muted truncate">{s.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center align-middle">
                        <span className="inline-block px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                          {s.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center align-middle">
                        <p className="text-sm font-medium text-text-secondary">{s.phone}</p>
                      </td>
                      <td className="py-3 px-4 text-center align-middle">
                        <p className="text-sm font-bold text-text-primary">₹{s.salary?.toLocaleString('en-IN')}</p>
                      </td>
                      <td className="py-3 text-right align-middle">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setViewingStaff(s)} className="p-1.5 text-green-400 hover:bg-green-400/10 rounded transition-colors" title="View">
                            <Eye size={16} />
                          </button>
                          <button onClick={() => handleOpenModal(s)} className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded transition-colors" title="Edit">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete(s._id)} className="p-1.5 text-red-400 hover:bg-red-400/10 rounded transition-colors" title="Remove">
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCloseModal}></div>
          <div className="relative w-full max-w-lg bg-surface-secondary border border-border rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Users className="text-primary" /> {editingStaff ? 'Edit Staff Details' : 'Add New Staff'}
              </h2>
              <button onClick={handleCloseModal} className="text-text-secondary hover:text-text-primary transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit, () => { toast.error('Please fill all the mandatory fields correctly.'); })} className="space-y-4" noValidate>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-text-secondary mb-1">Name <span className="text-red-500">*</span></p>
                  <input {...register('name')} onInput={(e) => { e.target.value = e.target.value.replace(/[^a-zA-Z\s]/g, ''); }} maxLength="35" className={`input-field ${errors.name ? 'border-red-500' : ''}`} />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <p className="text-xs text-text-secondary mb-1">Role <span className="text-red-500">*</span></p>
                  <input {...register('role')} onInput={(e) => { e.target.value = e.target.value.replace(/[^a-zA-Z\s]/g, ''); }} placeholder="e.g. Trainer, Manager" maxLength="35" className={`input-field ${errors.role ? 'border-red-500' : ''}`} />
                  {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role.message}</p>}
                </div>
                <div>
                  <p className="text-xs text-text-secondary mb-1">Mobile Number <span className="text-red-500">*</span></p>
                  <input {...register('phone')} type="tel" onInput={(e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10); }} maxLength="10" className={`input-field ${errors.phone ? 'border-red-500' : ''}`} />
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
                </div>
                <div>
                  <p className="text-xs text-text-secondary mb-1">Email <span className="text-red-500">*</span></p>
                  <input type="email" {...register('email')} maxLength="50" className={`input-field ${errors.email ? 'border-red-500' : ''}`} />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                </div>
                <div>
                  <p className="text-xs text-text-secondary mb-1">Date of Birth <span className="text-red-500">*</span></p>
                  <CustomDatePicker
                    name={dobField.name}
                    ref={dobField.ref}
                    onBlur={(e) => handleDateBlur('dob', e)}
                    value={toDateInputString(values.dob)}
                    validationRule={DATE_RULES.DOB}
                    minDate={`${dobMinYear}-01-01`}
                    maxDate={`${dobMaxYear}-12-31`}
                    placeholder="dd-mm-yyyy"
                    className={`input-field text-text-secondary ${errors.dob ? 'border-red-500' : ''}`}
                    onChange={(e) => {
                      dobField.onChange(e);
                      setValue('dob', e.target.value, { shouldValidate: true, shouldDirty: true });
                    }}
                    onValidationError={(message) => handleDateValidationError('dob', message)}
                  />
                  {errors.dob && <p className="text-red-500 text-xs mt-1">{errors.dob.message}</p>}
                </div>
                <div>
                  <p className="text-xs text-text-secondary mb-1">Salary (₹) <span className="text-red-500">*</span></p>
                  <input type="number" min="0" step="1" {...register('salary')} onInput={(e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 5); }} maxLength="5" className={`input-field ${errors.salary ? 'border-red-500' : ''}`} />
                  {errors.salary && <p className="text-red-500 text-xs mt-1">{errors.salary.message}</p>}
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-text-secondary mb-1">Address <span className="text-red-500">*</span></p>
                  <textarea {...register('address')} rows={2} maxLength="100" className={`input-field h-20 resize-none ${errors.address ? 'border-red-500' : ''}`} />
                  {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="secondary" onClick={handleCloseModal}>Cancel</Button>
                <Button type="submit" isLoading={isSaving}>{editingStaff ? 'Update Staff' : 'Add Staff'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Staff Modal */}
      {viewingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setViewingStaff(null)}></div>
          <div className="relative w-full max-w-lg bg-surface-secondary border border-border rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                Staff Details
              </h2>
              <button onClick={() => setViewingStaff(null)} className="text-text-secondary hover:text-text-primary transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4 border-b border-border pb-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-3xl border border-primary/20 shadow-inner">
                  {viewingStaff.name ? viewingStaff.name.charAt(0).toUpperCase() : 'S'}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-text-primary">{viewingStaff.name}</h3>
                  <span className="inline-block mt-1 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                    {viewingStaff.role}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-text-secondary mb-1">Mobile Number</p>
                  <p className="font-medium text-text-primary">{viewingStaff.phone}</p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary mb-1">Email</p>
                  <p className="font-medium text-text-primary">{viewingStaff.email || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary mb-1">Date of Birth</p>
                  <p className="font-medium text-text-primary">
                    {viewingStaff.dob ? new Date(viewingStaff.dob).toLocaleDateString('en-GB').replace(/\//g, '-') : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary mb-1">Salary</p>
                  <p className="font-bold text-text-primary">₹{viewingStaff.salary?.toLocaleString('en-IN')}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-text-secondary mb-1">Address</p>
                  <p className="font-medium text-text-primary">{viewingStaff.address}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-6 mt-4 border-t border-border">
              <Button type="button" onClick={() => setViewingStaff(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Staff;
