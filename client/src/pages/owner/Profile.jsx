import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { toast } from 'react-toastify';
import Button from '../../components/Button';

// ─── Constants ───────────────────────────────────────────────────────────────
const disabledInputClass = 'input-field bg-gray-800/60 text-gray-500 cursor-not-allowed';
const errorInputClass    = 'border-red-500 focus:ring-red-500/50 shadow-[0_0_8px_rgba(239,68,68,0.2)]';
const phoneRegex         = /^[6-9]\d{9}$/;
const emailRegex         = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = ['00', '15', '30', '45'];

const parseTime = (timeStr) => {
  if (!timeStr) return { hour: '6', minute: '00', ampm: 'AM' };
  const str = timeStr.trim().toUpperCase();
  const matchColon = str.match(/^(\d+):(\d+)\s*(AM|PM)$/);
  if (matchColon) {
    return {
      hour: String(parseInt(matchColon[1], 10)),
      minute: matchColon[2],
      ampm: matchColon[3]
    };
  }
  const matchNoColon = str.match(/^(\d+)\s*(AM|PM)$/);
  if (matchNoColon) {
    return {
      hour: String(parseInt(matchNoColon[1], 10)),
      minute: '00',
      ampm: matchNoColon[2]
    };
  }
  return { hour: '6', minute: '00', ampm: 'AM' };
};

const buildTimeStr = (hour, minute, ampm) => {
  if (!hour) return '';
  return `${hour}:${minute || '00'} ${ampm || 'AM'}`;
};

// ─── Helper: Build form state from API data ──────────────────────────────────
const buildFormState = (data) => {
  const socialLinks = data?.gym?.socialMediaLinks || [];
  const getSocialLink = (platform) => socialLinks.find((item) => item.platform === platform)?.url || '';

  const openTimeParsed = parseTime(data.gym?.operatingHours?.open);
  const closeTimeParsed = parseTime(data.gym?.operatingHours?.close);

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
      operatingOpenHour: openTimeParsed.hour,
      operatingOpenMinute: openTimeParsed.minute,
      operatingOpenAmpm: openTimeParsed.ampm,
      operatingCloseHour: closeTimeParsed.hour,
      operatingCloseMinute: closeTimeParsed.minute,
      operatingCloseAmpm: closeTimeParsed.ampm,
      instagramUrl: getSocialLink('instagram'),
      facebookUrl: getSocialLink('facebook'),
      websiteUrl: getSocialLink('website')
    },
    owner: data.owner
  };
};

// ─── Component: Profile Section wrapper ──────────────────────────────────────
const ProfileSection = ({ title, children }) => (
  <div className="card space-y-5 bg-gray-900 border-gray-800 rounded-2xl p-6 md:p-8 shadow-xl">
    <div className="border-b border-gray-800 pb-4">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
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

// ─── Component: Reusable TimeField ───────────────────────────────────────────
const TimeField = ({ label, hour, minute, ampm, disabled, onHourChange, onMinuteChange, onAmpmChange }) => {
  return (
    <div className="space-y-1 block group">
      <span className="text-xs uppercase tracking-wider text-gray-500 font-medium block">
        {label}
      </span>
      <div className={`flex items-center gap-1 bg-gray-900 border rounded-lg p-1.5 transition-colors ${
        disabled 
          ? 'bg-gray-800/60 border-gray-800 text-gray-500 cursor-not-allowed' 
          : 'border-gray-800 hover:border-gray-750 focus-within:border-primary/50'
      }`}>
        <select
          value={hour || '6'}
          disabled={disabled}
          onChange={onHourChange}
          className="bg-transparent text-slate-200 text-sm focus:outline-none cursor-pointer flex-1 text-center py-1 select-none disabled:text-gray-500 disabled:cursor-not-allowed"
        >
          {HOURS.map(h => <option key={h} className="bg-slate-950 text-slate-200" value={h}>{h}</option>)}
        </select>
        <span className="text-slate-500 font-bold select-none">:</span>
        <select
          value={minute || '00'}
          disabled={disabled}
          onChange={onMinuteChange}
          className="bg-transparent text-slate-200 text-sm focus:outline-none cursor-pointer flex-1 text-center py-1 select-none disabled:text-gray-500 disabled:cursor-not-allowed"
        >
          {MINUTES.map(m => <option key={m} className="bg-slate-950 text-slate-200" value={m}>{m}</option>)}
        </select>
        <select
          value={ampm || 'AM'}
          disabled={disabled}
          onChange={onAmpmChange}
          className={`bg-transparent text-slate-300 font-medium text-xs focus:outline-none cursor-pointer w-14 text-center py-1 px-1 bg-slate-800 rounded select-none border border-slate-700/50 disabled:bg-gray-850 disabled:border-transparent disabled:text-gray-500 disabled:cursor-not-allowed`}
        >
          <option className="bg-slate-950 text-slate-200" value="AM">AM</option>
          <option className="bg-slate-950 text-slate-200" value="PM">PM</option>
        </select>
      </div>
    </div>
  );
};

// ─── Main Profile Page ───────────────────────────────────────────────────────
const Profile = () => {
  const [profile, setProfile]     = useState(null);
  const [formState, setFormState] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving]   = useState(false);
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

  const validateSingleField = (key, value) => {
    let errMsg = '';
    if (key === 'gymName' || key === 'name') {
      if (!value?.trim()) errMsg = 'Name is required';
      else if (value.length > 25) errMsg = 'Max 25 characters';
    } else if (key === 'gymType' || key === 'tagline' || key === 'location' || key === 'regards' || key === 'greetingText') {
      if (value && value.length > 20) errMsg = 'Max 20 characters';
    } else if (key === 'gymEmail' || key === 'gmail' || key === 'mailId') {
      if (!value?.trim()) errMsg = 'Email is required';
      else if (!emailRegex.test(value)) errMsg = 'Enter a valid email address';
    } else if (key === 'gymContact' || key === 'mobileNo' || key === 'whatsappNumber' || key === 'phoneNumber' || key === 'helpContact') {
      if (!value?.trim()) {
        if (['gymContact', 'mobileNo'].includes(key)) errMsg = 'Contact number is required';
      } else if (!phoneRegex.test(value)) {
        errMsg = 'Enter a valid 10-digit Indian mobile number';
      }
    } else if (key === 'address' || key === 'addressOnBill') {
      if (!value?.trim()) {
        if (key === 'address') errMsg = 'Address is required';
      } else if (value.length > 100) {
        errMsg = 'Max 100 characters';
      }
    } else if (key === 'billingIdPrefix') {
      if (!value?.trim()) errMsg = 'Prefix is required';
    }

    // Map keys to errors object keys
    const errMap = {
      gymName: 'gymName',
      gymType: 'gymType',
      tagline: 'tagline',
      location: 'location',
      gymEmail: 'gymEmail',
      gymContact: 'gymContact',
      address: 'address',
      name: 'ownerName',
      mobileNo: 'ownerMobile',
      mailId: 'ownerEmail',
      whatsappNumber: 'whatsapp',
      phoneNumber: 'smsPhone',
      gmail: 'reminderEmail',
      billingIdPrefix: 'billPrefix',
      helpContact: 'billHelp',
      regards: 'billRegards',
      greetingText: 'billGreeting',
      addressOnBill: 'billAddress'
    };

    const errKey = errMap[key];
    if (errKey) {
      setErrors(prev => {
        const newErr = { ...prev };
        if (errMsg) newErr[errKey] = errMsg;
        else delete newErr[errKey];
        return newErr;
      });
    }
  };

  const setSectionValue = (section, key, value, subkey = null) => {
    setFormState(curr => {
      if (subkey) {
        return {
          ...curr,
          [section]: {
            ...curr[section],
            [key]: {
              ...curr[section][key],
              [subkey]: value
            }
          }
        };
      } else {
        return {
          ...curr,
          [section]: {
            ...curr[section],
            [key]: value
          }
        };
      }
    });

    const valKey = subkey || key;
    validateSingleField(valKey, value);
  };

  const cancelEditing = () => {
    setFormState(buildFormState(profile));
    setIsEditing(false);
    setErrors({});
  };

  const validateAll = () => {
    const newErrors = {};
    const gym = formState.gym;
    const owner = formState.owner;

    // Gym validations
    if (!gym.gymName?.trim()) newErrors.gymName = 'Gym name is required';
    else if (gym.gymName.length > 25) newErrors.gymName = 'Max 25 characters';

    if (gym.gymType?.length > 20) newErrors.gymType = 'Max 20 characters';
    if (gym.tagline?.length > 20) newErrors.tagline = 'Max 20 characters';
    if (gym.location?.length > 20) newErrors.location = 'Max 20 characters';

    if (!gym.gymEmail?.trim()) newErrors.gymEmail = 'Email is required';
    else if (!emailRegex.test(gym.gymEmail)) newErrors.gymEmail = 'Enter a valid email address';

    if (!gym.gymContact?.trim()) newErrors.gymContact = 'Contact is required';
    else if (!phoneRegex.test(gym.gymContact)) newErrors.gymContact = 'Enter a valid 10-digit Indian mobile number';

    if (!gym.address?.trim()) newErrors.address = 'Address is required';
    else if (gym.address.length > 100) newErrors.address = 'Max 100 characters';

    // Owner validations
    if (!owner.name?.trim()) newErrors.ownerName = 'Owner name is required';
    else if (owner.name.length > 25) newErrors.ownerName = 'Max 25 characters';

    if (!owner.mobileNo?.trim()) newErrors.ownerMobile = 'Mobile number is required';
    else if (!phoneRegex.test(owner.mobileNo)) newErrors.ownerMobile = 'Enter a valid 10-digit Indian mobile number';

    if (!owner.mailId?.trim()) newErrors.ownerEmail = 'Email is required';
    else if (!emailRegex.test(owner.mailId)) newErrors.ownerEmail = 'Enter a valid email address';

    // Reminder validations
    const rs = gym.reminderSettings || {};
    if (rs.whatsappNumber && !phoneRegex.test(rs.whatsappNumber)) newErrors.whatsapp = 'Enter a valid 10-digit Indian mobile number';
    if (rs.phoneNumber && !phoneRegex.test(rs.phoneNumber)) newErrors.smsPhone = 'Enter a valid 10-digit Indian mobile number';
    if (rs.gmail && !emailRegex.test(rs.gmail)) newErrors.reminderEmail = 'Enter a valid email address';

    // Billing validations
    const bi = gym.billingInfo || {};
    if (!bi.billingIdPrefix?.trim()) newErrors.billPrefix = 'Prefix is required';
    if (bi.helpContact && !phoneRegex.test(bi.helpContact)) newErrors.billHelp = 'Enter a valid 10-digit Indian mobile number';
    if (bi.regards?.length > 20) newErrors.billRegards = 'Max 20 characters';
    if (bi.greetingText?.length > 20) newErrors.billGreeting = 'Max 20 characters';
    if (bi.addressOnBill?.length > 100) newErrors.billAddress = 'Max 100 characters';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveAllProfile = async () => {
    if (!validateAll()) {
      toast.error('Please fix the errors before saving');
      return;
    }

    setIsSaving(true);
    try {
      const openStr = buildTimeStr(
        formState.gym.operatingOpenHour,
        formState.gym.operatingOpenMinute,
        formState.gym.operatingOpenAmpm
      );
      const closeStr = buildTimeStr(
        formState.gym.operatingCloseHour,
        formState.gym.operatingCloseMinute,
        formState.gym.operatingCloseAmpm
      );

      const payload = {
        gymData: {
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
          operatingDays: formState.gym.operatingDays || [],
          operatingHours: { open: openStr, close: closeStr },
          reminderSettings: {
            whatsappNumber: formState.gym.reminderSettings?.whatsappNumber,
            phoneNumber:    formState.gym.reminderSettings?.phoneNumber,
            gmail:          formState.gym.reminderSettings?.gmail
          },
          billingInfo: { ...formState.gym.billingInfo }
        },
        ownerData: {
          name: formState.owner.name,
          mobileNo: formState.owner.mobileNo,
          mailId: formState.owner.mailId
        }
      };

      const res = await api.put('/gym/profile', payload);
      const data = res.data.data;
      const updatedProfile = { gym: data.gym || profile.gym, owner: data.owner || profile.owner };
      
      setProfile(updatedProfile);
      setFormState(buildFormState(updatedProfile));
      setIsEditing(false);
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
      setIsSaving(false);
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-white tracking-tight">Gym Settings</h1>
            <p className="text-gray-400 mt-2 text-lg">Manage your gym establishment, ownership, and platform configuration.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            {isEditing ? (
              <>
                <Button type="button" variant="secondary" onClick={cancelEditing} disabled={isSaving}>Cancel</Button>
                <Button type="button" onClick={saveAllProfile} isLoading={isSaving}>Save Changes</Button>
              </>
            ) : (
              <Button type="button" onClick={() => setIsEditing(true)}>Edit Profile</Button>
            )}
          </div>
        </div>

        {/* ── Section: Gym establishment ── */}
        <ProfileSection title="Establishment Details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Field label="Gym ID" value={formState.gym.gymId} disabled />
            <Field label="Client ID Prefix" value={formState.gym.gymIdPrefix} disabled />
            <Field label="Gym Name *" value={formState.gym.gymName} disabled={!isEditing} maxLength={25} error={errors.gymName} onChange={e => setSectionValue('gym', 'gymName', e.target.value)} />
            <Field label="Gym Type" value={formState.gym.gymType} disabled={!isEditing} maxLength={20} error={errors.gymType} onChange={e => setSectionValue('gym', 'gymType', e.target.value)} />
            <Field label="Location *" value={formState.gym.location} disabled={!isEditing} maxLength={20} error={errors.location} onChange={e => setSectionValue('gym', 'location', e.target.value)} />
            <Field label="Tagline" value={formState.gym.tagline} disabled={!isEditing} maxLength={20} error={errors.tagline} onChange={e => setSectionValue('gym', 'tagline', e.target.value)} />
            <Field label="Gym Email *" value={formState.gym.gymEmail} type="email" disabled={!isEditing} error={errors.gymEmail} onChange={e => setSectionValue('gym', 'gymEmail', e.target.value)} />
            <Field label="Gym Contact *" value={formState.gym.gymContact} type="tel" disabled={!isEditing} error={errors.gymContact} maxLength={10} onInput={e => e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10)} onChange={e => setSectionValue('gym', 'gymContact', e.target.value)} />
            <Field label="GST Number" value={formState.gym.gst} disabled={!isEditing} onChange={e => setSectionValue('gym', 'gst', e.target.value)} />
            
            {/* Operating Days */}
            <div className="md:col-span-2">
              <span className="text-xs uppercase tracking-wider text-gray-500 font-medium block mb-2">Operating Days</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                  const isChecked = (formState.gym.operatingDays || []).includes(day);
                  return (
                    <label
                      key={day}
                      className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 border select-none transition-all duration-200 ${
                        !isEditing ? 'opacity-85 cursor-not-allowed bg-gray-900/40 border-gray-800/80 text-gray-500' : 'cursor-pointer bg-slate-900/40 border-slate-800/80 text-slate-400 hover:border-slate-700/60'
                      } ${
                        isChecked && isEditing ? 'bg-primary/10 border-primary/40 text-primary font-medium' : ''
                      } ${
                        isChecked && !isEditing ? 'bg-primary/5 border-primary/20 text-primary/60 font-medium' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        disabled={!isEditing}
                        checked={isChecked}
                        onChange={(e) => {
                          let days = [...(formState.gym.operatingDays || [])];
                          if (e.target.checked) {
                            days.push(day);
                          } else {
                            days = days.filter(d => d !== day);
                          }
                          setFormState(c => ({
                            ...c,
                            gym: {
                              ...c.gym,
                              operatingDays: days,
                              operatingDaysText: days.join(', ')
                            }
                          }));
                        }}
                        className="w-3.5 h-3.5 rounded border-slate-800 bg-slate-950 text-primary focus:ring-primary/50 accent-primary disabled:opacity-50"
                      />
                      <span>{day}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <Field label="Instagram URL" value={formState.gym.instagramUrl} disabled={!isEditing} onChange={e => setSectionValue('gym', 'instagramUrl', e.target.value)} />
            <Field label="Facebook URL" value={formState.gym.facebookUrl} disabled={!isEditing} onChange={e => setSectionValue('gym', 'facebookUrl', e.target.value)} />
            <Field label="Website URL" value={formState.gym.websiteUrl} disabled={!isEditing} onChange={e => setSectionValue('gym', 'websiteUrl', e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <TimeField
                label="Open Time"
                hour={formState.gym.operatingOpenHour}
                minute={formState.gym.operatingOpenMinute}
                ampm={formState.gym.operatingOpenAmpm}
                disabled={!isEditing}
                onHourChange={e => setSectionValue('gym', 'operatingOpenHour', e.target.value)}
                onMinuteChange={e => setSectionValue('gym', 'operatingOpenMinute', e.target.value)}
                onAmpmChange={e => setSectionValue('gym', 'operatingOpenAmpm', e.target.value)}
              />
              <TimeField
                label="Close Time"
                hour={formState.gym.operatingCloseHour}
                minute={formState.gym.operatingCloseMinute}
                ampm={formState.gym.operatingCloseAmpm}
                disabled={!isEditing}
                onHourChange={e => setSectionValue('gym', 'operatingCloseHour', e.target.value)}
                onMinuteChange={e => setSectionValue('gym', 'operatingCloseMinute', e.target.value)}
                onAmpmChange={e => setSectionValue('gym', 'operatingCloseAmpm', e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <Field label="Establishment Address *" value={formState.gym.address} textarea disabled={!isEditing} maxLength={100} error={errors.address} onChange={e => setSectionValue('gym', 'address', e.target.value)} />
            </div>
          </div>
        </ProfileSection>

        {/* ── Section: Ownership ── */}
        <ProfileSection title="Ownership Details">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Field label="Owner Full Name *" value={formState.owner?.name} disabled={!isEditing} maxLength={25} error={errors.ownerName} onChange={e => setSectionValue('owner', 'name', e.target.value)} />
            <Field label="Mobile Number *" value={formState.owner?.mobileNo} type="tel" disabled={!isEditing} error={errors.ownerMobile} maxLength={10} onInput={e => e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10)} onChange={e => setSectionValue('owner', 'mobileNo', e.target.value)} />
            <Field label="Email Address *" value={formState.owner?.mailId} type="email" disabled={!isEditing} error={errors.ownerEmail} onChange={e => setSectionValue('owner', 'mailId', e.target.value)} />
          </div>
        </ProfileSection>

        {/* ── Section: Messaging ── */}
        <ProfileSection title="Reminder & Notifications">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Field label="WhatsApp Number" value={formState.gym.reminderSettings?.whatsappNumber} type="tel" disabled={!isEditing} error={errors.whatsapp} maxLength={10} onInput={e => e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10)} onChange={e => setSectionValue('gym', 'reminderSettings', e.target.value, 'whatsappNumber')} />
            <Field label="SMS Phone Number" value={formState.gym.reminderSettings?.phoneNumber} type="tel" disabled={!isEditing} error={errors.smsPhone} maxLength={10} onInput={e => e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10)} onChange={e => setSectionValue('gym', 'reminderSettings', e.target.value, 'phoneNumber')} />
            <Field label="System Sender Email" value={formState.gym.reminderSettings?.gmail} type="email" disabled={!isEditing} error={errors.reminderEmail} onChange={e => setSectionValue('gym', 'reminderSettings', e.target.value, 'gmail')} />
          </div>
        </ProfileSection>

        {/* ── Section: Billing ── */}
        <ProfileSection title="Invoicing & Billing">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Field label="Billing ID Prefix *" value={formState.gym.billingInfo?.billingIdPrefix} disabled={!isEditing} maxLength={5} error={errors.billPrefix} onChange={e => setSectionValue('gym', 'billingInfo', e.target.value, 'billingIdPrefix')} />
            <Field label="Helpdesk Contact" value={formState.gym.billingInfo?.helpContact} type="tel" disabled={!isEditing} error={errors.billHelp} maxLength={10} onInput={e => e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10)} onChange={e => setSectionValue('gym', 'billingInfo', e.target.value, 'helpContact')} />
            <Field label="Register GST" value={formState.gym.billingInfo?.gst} disabled={!isEditing} onChange={e => setSectionValue('gym', 'billingInfo', e.target.value, 'gst')} />
            <Field label="Logo File Path" value={formState.gym.billingInfo?.logo} disabled />
            <div className="md:col-span-2">
              <Field label="Address On Invoice" value={formState.gym.billingInfo?.addressOnBill} textarea disabled={!isEditing} maxLength={100} error={errors.billAddress} onChange={e => setSectionValue('gym', 'billingInfo', e.target.value, 'addressOnBill')} />
            </div>
            <Field label="Regards Name" value={formState.gym.billingInfo?.regards} disabled={!isEditing} maxLength={20} error={errors.billRegards} onChange={e => setSectionValue('gym', 'billingInfo', e.target.value, 'regards')} />
            <Field label="Greeting Footer" value={formState.gym.billingInfo?.greetingText} disabled={!isEditing} maxLength={20} error={errors.billGreeting} onChange={e => setSectionValue('gym', 'billingInfo', e.target.value, 'greetingText')} />

          </div>
        </ProfileSection>
      </div>
    </div>
  );
};

export default Profile;
