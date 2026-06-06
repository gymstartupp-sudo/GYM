import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { toast } from 'react-toastify';
import Button from '../../components/Button';

// ─── Constants ───────────────────────────────────────────────────────────────
const disabledInputClass = 'input-field bg-gray-800/60 text-gray-500 cursor-not-allowed';
const errorInputClass    = 'border-red-500 focus:ring-red-500/50 shadow-[0_0_8px_rgba(239,68,68,0.2)]';
const phoneRegex         = /^[6-9]\d{9}$/;
const emailRegex         = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── Helper: Build form state from API data ──────────────────────────────────
const buildFormState = (data) => {
  const socialLinks = data?.gym?.socialMediaLinks || [];
  const getSocialLink = (platform) => socialLinks.find((item) => item.platform === platform)?.url || '';

  return {
    gym: {
      ...data.gym,
      billingInfo: {
        allowPartialPayments: true,
        ...data.gym?.billingInfo
      },
      operatingDaysText: (data.gym?.operatingDays || []).join(', '),
      operatingOpen: data.gym?.operatingHours?.open || '',
      operatingClose: data.gym?.operatingHours?.close || '',
      instagramUrl: getSocialLink('instagram'),
      facebookUrl: getSocialLink('facebook'),
      websiteUrl: getSocialLink('website')
    },
    owner: data.owner
  };
};

// ─── Component: Profile Section wrapper ──────────────────────────────────────
const ProfileSection = ({ title, editing, onEdit, onCancel, onSave, saving, children }) => (
  <div className="card space-y-5 bg-gray-900 border-gray-800">
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-gray-800 pb-4">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <div className="flex gap-2">
        {editing ? (
          <>
            <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
            <Button type="button" onClick={onSave} isLoading={saving}>Save</Button>
          </>
        ) : (
          <Button type="button" variant="secondary" onClick={onEdit}>Edit</Button>
        )}
      </div>
    </div>
    {children}
  </div>
);

// ─── Component: Reusable Field ───────────────────────────────────────────────
const Field = ({ label, value, onChange, disabled = false, textarea = false, type = "text", error, maxLength, onInput }) => {
  const Component = textarea ? 'textarea' : 'input';
  const baseClass = `input-field ${textarea ? 'h-24 resize-none' : ''}`;
  const statusClass = disabled ? 'bg-gray-800/60 text-gray-500 cursor-not-allowed' : (error ? errorInputClass : '');

  return (
    <label className="space-y-1 block group">
      <div className="flex justify-between items-center">
        <span className="text-xs uppercase tracking-wider text-gray-500 group-focus-within:text-primary transition-colors font-medium">{label}</span>
        {maxLength && !disabled && (
          <span className={`text-[10px] ${(value?.length || 0) >= maxLength ? 'text-orange-400' : 'text-gray-600'}`}>
            {value?.length || 0}/{maxLength}
          </span>
        )}
      </div>
      <Component
        type={textarea ? undefined : type}
        value={value || ''}
        onChange={onChange}
        onInput={onInput}
        disabled={disabled}
        maxLength={maxLength}
        className={`${baseClass} ${statusClass}`.trim()}
      />
      {error && !disabled && <p className="text-red-500 text-[11px] mt-1 italic">{error}</p>}
    </label>
  );
};

// ─── Main Profile Page ───────────────────────────────────────────────────────
const Profile = () => {
  const [profile, setProfile]     = useState(null);
  const [formState, setFormState] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [editingSection, setEditingSection] = useState('');
  const [savingSection, setSavingSection]   = useState('');
  const [errors, setErrors]       = useState({});

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await api.get('/gym/profile');
      setProfile(res.data.data);
      setFormState(buildFormState(res.data.data));
    } catch (error) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  const setSectionValue = (section, key, value) => {
    setFormState(curr => ({ ...curr, [section]: { ...curr[section], [key]: value } }));
    // Clear error when user types
    if (errors[key]) setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const cancelSection = () => {
    setFormState(buildFormState(profile));
    setEditingSection('');
    setErrors({});
  };

  const validateSection = (section) => {
    const newErrors = {};
    const gym = formState.gym;
    const owner = formState.owner;

    if (section === 'gym') {
      if (!gym.gymName?.trim()) newErrors.gymName = 'Gym name is required';
      else if (gym.gymName.length > 20) newErrors.gymName = 'Max 20 characters';

      if (gym.gymType?.length > 20) newErrors.gymType = 'Max 20 characters';
      if (gym.tagline?.length > 20) newErrors.tagline = 'Max 20 characters';
      if (gym.location?.length > 20) newErrors.location = 'Max 20 characters';

      if (!gym.gymEmail?.trim()) newErrors.gymEmail = 'Email is required';
      else if (!emailRegex.test(gym.gymEmail)) newErrors.gymEmail = 'Enter a valid email address';

      if (!gym.gymContact?.trim()) newErrors.gymContact = 'Contact is required';
      else if (!phoneRegex.test(gym.gymContact)) newErrors.gymContact = 'Enter a valid Indian mobile number';

      if (!gym.address?.trim()) newErrors.address = 'Address is required';
      else if (gym.address.length > 100) newErrors.address = 'Max 100 characters';
    }

    if (section === 'owner') {
      if (!owner.name?.trim()) newErrors.ownerName = 'Owner name is required';
      else if (owner.name.length > 20) newErrors.ownerName = 'Max 20 characters';

      if (!owner.mobileNo?.trim()) newErrors.ownerMobile = 'Mobile number is required';
      else if (!phoneRegex.test(owner.mobileNo)) newErrors.ownerMobile = 'Enter a valid Indian mobile number';

      if (!owner.mailId?.trim()) newErrors.ownerEmail = 'Email is required';
      else if (!emailRegex.test(owner.mailId)) newErrors.ownerEmail = 'Enter a valid email address';
    }

    if (section === 'reminder') {
      const rs = gym.reminderSettings || {};
      if (rs.whatsappNumber && !phoneRegex.test(rs.whatsappNumber)) newErrors.whatsapp = 'Enter a valid Indian mobile number';
      if (rs.phoneNumber && !phoneRegex.test(rs.phoneNumber)) newErrors.smsPhone = 'Enter a valid Indian mobile number';
      if (rs.gmail && !emailRegex.test(rs.gmail)) newErrors.reminderEmail = 'Enter a valid email address';
    }

    if (section === 'billing') {
      const bi = gym.billingInfo || {};
      if (!bi.billingIdPrefix?.trim()) newErrors.billPrefix = 'Prefix is required';
      if (bi.helpContact && !phoneRegex.test(bi.helpContact)) newErrors.billHelp = 'Enter a valid Indian mobile number';
      if (bi.regards?.length > 20) newErrors.billRegards = 'Max 20 characters';
      if (bi.greetingText?.length > 20) newErrors.billGreeting = 'Max 20 characters';
      if (bi.addressOnBill?.length > 100) newErrors.billAddress = 'Max 100 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveSection = async (section) => {
    if (!validateSection(section)) {
      toast.error('Please fix the errors before saving');
      return;
    }

    setSavingSection(section);
    try {
      const payload = {};
      if (section === 'gym') {
        payload.gymData = {
          gymName: formState.gym.gymName,
          gst: formState.gym.gst,
          tagline: formState.gym.tagline,
          address: formState.gym.address,
          location: formState.gym.location,
          gymEmail: formState.gym.gymEmail,
          gymContact: formState.gym.gymContact,
          gymType: formState.gym.gymType,
          socialMediaLinks: [
            { platform: 'instagram', url: formState.gym.instagramUrl },
            { platform: 'facebook', url: formState.gym.facebookUrl },
            { platform: 'website', url: formState.gym.websiteUrl }
          ].filter(i => i.url),
          operatingDays: (formState.gym.operatingDaysText || '').split(',').map(i => i.trim()).filter(Boolean),
          operatingHours: { open: formState.gym.operatingOpen, close: formState.gym.operatingClose }
        };
      }
      if (section === 'owner') {
        payload.ownerData = {
          name: formState.owner.name,
          mobileNo: formState.owner.mobileNo,
          mailId: formState.owner.mailId
        };
      }
      if (section === 'reminder') {
        payload.gymData = {
          reminderSettings: {
            whatsappNumber: formState.gym.reminderSettings?.whatsappNumber,
            phoneNumber:    formState.gym.reminderSettings?.phoneNumber,
            gmail:          formState.gym.reminderSettings?.gmail
          }
        };
      }
      if (section === 'billing') {
        payload.gymData = { billingInfo: { ...formState.gym.billingInfo } };
      }

      const res = await api.put('/gym/profile', payload);
      const data = res.data.data;
      const updatedProfile = { gym: data.gym || profile.gym, owner: data.owner || profile.owner };
      
      setProfile(updatedProfile);
      setFormState(buildFormState(updatedProfile));
      setEditingSection('');
      setErrors({});
      toast.success('Profile updated successfully');
    } catch (error) {
      const serverError = error.response?.data;
      if (serverError?.field) {
        setErrors(prev => ({ ...prev, [serverError.field]: serverError.message }));
        toast.error(serverError.message);
      } else {
        toast.error(serverError?.message || 'Failed to update profile');
      }
    } finally {
      setSavingSection('');
    }
  };

  if (loading || !formState) {
    return (
      <div className="flex bg-dark h-screen overflow-hidden">
        <div className="flex-1 flex justify-center items-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex bg-dark h-screen overflow-hidden">
      <div className="flex-1 overflow-y-auto p-8 pt-10 space-y-8 scrollbar-hide">
        <div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">Gym Settings</h1>
          <p className="text-gray-400 mt-2 text-lg">Manage your gym establishment, ownership, and platform configuration.</p>
        </div>

        {/* ── Section: Gym establishment ── */}
        <ProfileSection title="Establishment Details" editing={editingSection === 'gym'} onEdit={() => setEditingSection('gym')} onCancel={cancelSection} onSave={() => saveSection('gym')} saving={savingSection === 'gym'}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Field label="Gym ID" value={formState.gym.gymId} disabled />
            <Field label="Client ID Prefix" value={formState.gym.gymIdPrefix} disabled />
            <Field label="Gym Name *" value={formState.gym.gymName} disabled={editingSection !== 'gym'} maxLength={20} error={errors.gymName} onChange={e => setSectionValue('gym', 'gymName', e.target.value)} />
            <Field label="Gym Type" value={formState.gym.gymType} disabled={editingSection !== 'gym'} maxLength={20} error={errors.gymType} onChange={e => setSectionValue('gym', 'gymType', e.target.value)} />
            <Field label="Location *" value={formState.gym.location} disabled={editingSection !== 'gym'} maxLength={20} error={errors.location} onChange={e => setSectionValue('gym', 'location', e.target.value)} />
            <Field label="Tagline" value={formState.gym.tagline} disabled={editingSection !== 'gym'} maxLength={20} error={errors.tagline} onChange={e => setSectionValue('gym', 'tagline', e.target.value)} />
            <Field label="Gym Email *" value={formState.gym.gymEmail} type="email" disabled={editingSection !== 'gym'} error={errors.gymEmail} onChange={e => setSectionValue('gym', 'gymEmail', e.target.value)} />
            <Field label="Gym Contact *" value={formState.gym.gymContact} type="tel" disabled={editingSection !== 'gym'} error={errors.gymContact} onChange={e => setSectionValue('gym', 'gymContact', e.target.value)} />
            <Field label="GST Number" value={formState.gym.gst} disabled={editingSection !== 'gym'} onChange={e => setSectionValue('gym', 'gst', e.target.value)} />
            <Field label="Operating Days" value={formState.gym.operatingDaysText} disabled={editingSection !== 'gym'} onChange={e => setSectionValue('gym', 'operatingDaysText', e.target.value)} />
            <Field label="Instagram URL" value={formState.gym.instagramUrl} disabled={editingSection !== 'gym'} onChange={e => setSectionValue('gym', 'instagramUrl', e.target.value)} />
            <Field label="Facebook URL" value={formState.gym.facebookUrl} disabled={editingSection !== 'gym'} onChange={e => setSectionValue('gym', 'facebookUrl', e.target.value)} />
            <Field label="Website URL" value={formState.gym.websiteUrl} disabled={editingSection !== 'gym'} onChange={e => setSectionValue('gym', 'websiteUrl', e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Open Time" value={formState.gym.operatingOpen} disabled={editingSection !== 'gym'} onChange={e => setSectionValue('gym', 'operatingOpen', e.target.value)} />
              <Field label="Close Time" value={formState.gym.operatingClose} disabled={editingSection !== 'gym'} onChange={e => setSectionValue('gym', 'operatingClose', e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Field label="Establishment Address *" value={formState.gym.address} textarea disabled={editingSection !== 'gym'} maxLength={100} error={errors.address} onChange={e => setSectionValue('gym', 'address', e.target.value)} />
            </div>
          </div>
        </ProfileSection>

        {/* ── Section: Ownership ── */}
        <ProfileSection title="Ownership Details" editing={editingSection === 'owner'} onEdit={() => setEditingSection('owner')} onCancel={cancelSection} onSave={() => saveSection('owner')} saving={savingSection === 'owner'}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Field label="Owner Full Name *" value={formState.owner?.name} disabled={editingSection !== 'owner'} maxLength={20} error={errors.ownerName} onChange={e => setSectionValue('owner', 'name', e.target.value)} />
            <Field label="Mobile Number *" value={formState.owner?.mobileNo} type="tel" disabled={editingSection !== 'owner'} error={errors.ownerMobile} onChange={e => setSectionValue('owner', 'mobileNo', e.target.value)} />
            <Field label="Email Address *" value={formState.owner?.mailId} type="email" disabled={editingSection !== 'owner'} error={errors.ownerEmail} onChange={e => setSectionValue('owner', 'mailId', e.target.value)} />
          </div>
        </ProfileSection>

        {/* ── Section: Messaging ── */}
        <ProfileSection title="Reminder & Notifications" editing={editingSection === 'reminder'} onEdit={() => setEditingSection('reminder')} onCancel={cancelSection} onSave={() => saveSection('reminder')} saving={savingSection === 'reminder'}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Field label="WhatsApp Number" value={formState.gym.reminderSettings?.whatsappNumber} type="tel" disabled={editingSection !== 'reminder'} error={errors.whatsapp} onChange={e => setFormState(c => ({ ...c, gym: { ...c.gym, reminderSettings: { ...c.gym.reminderSettings, whatsappNumber: e.target.value } } }))} />
            <Field label="SMS Phone Number" value={formState.gym.reminderSettings?.phoneNumber} type="tel" disabled={editingSection !== 'reminder'} error={errors.smsPhone} onChange={e => setFormState(c => ({ ...c, gym: { ...c.gym, reminderSettings: { ...c.gym.reminderSettings, phoneNumber: e.target.value } } }))} />
            <Field label="System Sender Email" value={formState.gym.reminderSettings?.gmail} type="email" disabled={editingSection !== 'reminder'} error={errors.reminderEmail} onChange={e => setFormState(c => ({ ...c, gym: { ...c.gym, reminderSettings: { ...c.gym.reminderSettings, gmail: e.target.value } } }))} />
          </div>
        </ProfileSection>

        {/* ── Section: Billing ── */}
        <ProfileSection title="Invoicing & Billing" editing={editingSection === 'billing'} onEdit={() => setEditingSection('billing')} onCancel={cancelSection} onSave={() => saveSection('billing')} saving={savingSection === 'billing'}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Field label="Billing ID Prefix *" value={formState.gym.billingInfo?.billingIdPrefix} disabled={editingSection !== 'billing'} maxLength={5} error={errors.billPrefix} onChange={e => setFormState(c => ({ ...c, gym: { ...c.gym, billingInfo: { ...c.gym.billingInfo, billingIdPrefix: e.target.value } } }))} />
            <Field label="Helpdesk Contact" value={formState.gym.billingInfo?.helpContact} type="tel" disabled={editingSection !== 'billing'} error={errors.billHelp} onChange={e => setFormState(c => ({ ...c, gym: { ...c.gym, billingInfo: { ...c.gym.billingInfo, helpContact: e.target.value } } }))} />
            <Field label="Register GST" value={formState.gym.billingInfo?.gst} disabled={editingSection !== 'billing'} onChange={e => setFormState(c => ({ ...c, gym: { ...c.gym, billingInfo: { ...c.gym.billingInfo, gst: e.target.value } } }))} />
            <Field label="Logo File Path" value={formState.gym.billingInfo?.logo} disabled />
            <div className="md:col-span-2">
              <Field label="Address On Invoice" value={formState.gym.billingInfo?.addressOnBill} textarea disabled={editingSection !== 'billing'} maxLength={100} error={errors.billAddress} onChange={e => setFormState(c => ({ ...c, gym: { ...c.gym, billingInfo: { ...c.gym.billingInfo, addressOnBill: e.target.value } } }))} />
            </div>
            <Field label="Regards Name" value={formState.gym.billingInfo?.regards} disabled={editingSection !== 'billing'} maxLength={20} error={errors.billRegards} onChange={e => setFormState(c => ({ ...c, gym: { ...c.gym, billingInfo: { ...c.gym.billingInfo, regards: e.target.value } } }))} />
            <Field label="Greeting Footer" value={formState.gym.billingInfo?.greetingText} disabled={editingSection !== 'billing'} maxLength={20} error={errors.billGreeting} onChange={e => setFormState(c => ({ ...c, gym: { ...c.gym, billingInfo: { ...c.gym.billingInfo, greetingText: e.target.value } } }))} />
            <div className="flex items-center justify-between p-4 bg-gray-800/40 border border-gray-800 rounded-xl md:col-span-2">
              <div className="space-y-1 pr-4">
                <span className="text-xs uppercase tracking-wider text-gray-500 font-medium block">Allow Partial Payments</span>
                <span className="text-xs text-gray-400">If disabled, client payments must be paid in full; due date and installments will not be prompt.</span>
              </div>
              <button
                type="button"
                disabled={editingSection !== 'billing'}
                onClick={() => {
                  const currentVal = formState.gym.billingInfo?.allowPartialPayments !== false;
                  setFormState(c => ({
                    ...c,
                    gym: {
                      ...c.gym,
                      billingInfo: {
                        ...c.gym.billingInfo,
                        allowPartialPayments: !currentVal
                      }
                    }
                  }));
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-gray-900 ${
                  (formState.gym.billingInfo?.allowPartialPayments !== false) ? 'bg-primary' : 'bg-gray-700'
                } ${editingSection === 'billing' ? 'cursor-pointer' : 'opacity-65 cursor-not-allowed'}`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    (formState.gym.billingInfo?.allowPartialPayments !== false) ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </ProfileSection>
      </div>
    </div>
  );
};

export default Profile;
