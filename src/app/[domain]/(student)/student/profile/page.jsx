'use client';

import React, { useEffect, useState } from 'react';
import TenantLoader from 'src/component/tenant/TenantLoader';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

const StudentProfilePage = () => {
  const { getApiEndpoint } = useTenantWebsite();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [configuredFields, setConfiguredFields] = useState([]);
  const [dynamicValues, setDynamicValues] = useState({});

  const [form, setForm] = useState({
    // Read-only credentials
    registration_number: '',
    roll: '',
    class_name: '',
    section_name: '',
    session_name: '',
    email: '',
    birth_certificate_number: '',

    // Editable personal details
    name: '',
    phone: '',
    date_of_birth: '',
    gender: 'Male',
    blood_group: '',
    religion: 'Islam',

    // Editable address details
    present_address: '',
    permanent_address: '',
    city: '',
    district: '',
    upazila: '',
    postal_code: '',

    // Editable parents & guardian details
    father_name: '',
    father_occupation: '',
    father_phone: '',
    father_nid: '',
    mother_name: '',
    mother_occupation: '',
    mother_phone: '',
    mother_nid: '',
    guardian_name: '',
    guardian_relation: 'Father',
    guardian_phone: '',

    // Academic background
    past_school_name: '',
    past_school_class: '',
    past_school_result: '',
    special_note: '',

    // Media
    image: '',

    // Password change
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiEndpoint('student/profile'));
      const data = await res.json();
      if (res.ok && data.success) {
        const payload = data.payload || data.paylod || data;
        const s = payload.student || {};
        const addr = payload.address || {};
        const g = payload.guardian || {};

        if (payload.fields && Array.isArray(payload.fields)) {
          setConfiguredFields(payload.fields);
        }

        setForm({
          registration_number: s.registration_number || s.registration_no || '',
          roll: s.roll ? String(s.roll) : '',
          class_name: s.class_name || 'N/A',
          section_name: s.section_name || 'N/A',
          session_name: s.session_name || 'N/A',
          email: s.email || '',
          birth_certificate_number: s.info_data?.birth_certificate_number || '',

          name: s.name || '',
          phone: s.phone || s.number || '',
          date_of_birth: s.date_of_birth ? new Date(s.date_of_birth).toISOString().split('T')[0] : '',
          gender: s.gender || 'Male',
          blood_group: s.blood_group || '',
          religion: s.religion || '',

          present_address: s.present_address || addr.present_address || s.address || '',
          permanent_address: s.permanent_address || addr.permanent_address || '',
          city: addr.city || '',
          district: addr.district || '',
          upazila: addr.upazila || '',
          postal_code: addr.postal_code || '',

          father_name: s.father_name || g.father_name || '',
          father_occupation: s.father_occupation || g.father_occupation || '',
          father_phone: s.father_phone || g.father_phone || '',
          father_nid: s.father_nid || g.father_nid || '',
          mother_name: s.mother_name || g.mother_name || '',
          mother_occupation: s.mother_occupation || g.mother_occupation || '',
          mother_phone: s.mother_phone || g.mother_phone || '',
          mother_nid: s.mother_nid || g.mother_nid || '',
          guardian_name: s.guardian_name || g.guardian_name || '',
          guardian_relation: s.guardian_relation || g.guardian_relation || 'Father',
          guardian_phone: s.guardian_phone || g.guardian_phone || '',

          past_school_name: s.past_school_name || '',
          past_school_class: s.past_school_class || '',
          past_school_result: s.past_school_result || '',
          special_note: s.special_note || '',
          image: s.photo_url || s.image || '',

          current_password: '',
          new_password: '',
          confirm_password: '',
        });

        // Populate dynamic values if present in info_data / guardian / address
        const mergedCustom = {
          ...(s.info_data || {}),
          ...(addr.data || {}),
          ...(g.data || {}),
        };
        setDynamicValues(mergedCustom);
      } else {
        toast.error('Failed to load student profile.');
      }
    } catch {
      toast.error('Network error loading profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [getApiEndpoint]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, image: reader.result }));
      toast.success('Photo selected! Click "Save Changes" to apply.');
    };
    reader.readAsDataURL(file);
  };

  const handleDynamicChange = (fieldKey, val) => {
    setDynamicValues((prev) => ({ ...prev, [fieldKey]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.new_password) {
      if (!form.current_password) {
        toast.error('Please enter your current password to set a new password.');
        return;
      }
      if (form.new_password !== form.confirm_password) {
        toast.error('New password and confirmation do not match.');
        return;
      }
      if (form.new_password.length < 6) {
        toast.error('New password must be at least 6 characters.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch(getApiEndpoint('student/profile'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          date_of_birth: form.date_of_birth || null,
          gender: form.gender,
          blood_group: form.blood_group,
          religion: form.religion,
          present_address: form.present_address,
          permanent_address: form.permanent_address,
          city: form.city,
          district: form.district,
          upazila: form.upazila,
          postal_code: form.postal_code,
          father_name: form.father_name,
          father_occupation: form.father_occupation,
          father_phone: form.father_phone,
          father_nid: form.father_nid,
          mother_name: form.mother_name,
          mother_occupation: form.mother_occupation,
          mother_phone: form.mother_phone,
          mother_nid: form.mother_nid,
          guardian_name: form.guardian_name,
          guardian_relation: form.guardian_relation,
          guardian_phone: form.guardian_phone,
          past_school_name: form.past_school_name,
          past_school_class: form.past_school_class,
          past_school_result: form.past_school_result,
          special_note: form.special_note,
          photo_url: form.image || undefined,
          current_password: form.current_password || undefined,
          new_password: form.new_password || undefined,
          custom_fields: dynamicValues,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'Profile updated successfully.');
        setForm((prev) => ({
          ...prev,
          current_password: '',
          new_password: '',
          confirm_password: '',
        }));
        fetchProfile();
      } else {
        throw new Error(data.error || 'Failed to update profile.');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderScopedFields = (targetScope) => {
    const fieldsToRender = configuredFields.filter(
      (f) => (f.target_scope || 'info') === targetScope
    );
    if (fieldsToRender.length === 0) return null;

    return (
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
        <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
          Custom Fields ({targetScope})
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {fieldsToRender.map((f) => {
            const val = dynamicValues[f.field_key] || '';
            const label = f.label_translations?.en || f.field_name || f.field_key;

            if (f.field_type === 'select') {
              const options = Array.isArray(f.options) ? f.options : [];
              return (
                <div key={f.id || f.field_key} className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {label} {f.is_required && '*'}
                  </label>
                  <select
                    value={val}
                    onChange={(e) => handleDynamicChange(f.field_key, e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
                  >
                    <option value="">-- Select {label} --</option>
                    {options.map((opt, oIdx) => (
                      <option key={oIdx} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              );
            }

            return (
              <div key={f.id || f.field_key} className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {label} {f.is_required && '*'}
                </label>
                <input
                  type={f.field_type === 'date' ? 'date' : f.field_type === 'number' ? 'number' : 'text'}
                  value={val}
                  onChange={(e) => handleDynamicChange(f.field_key, e.target.value)}
                  placeholder={f.placeholder || ''}
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return <TenantLoader fullScreen={false} />;
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4 pb-8">
      {/* Page Header */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 gap-2">
        <div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-white">
            Student Profile Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Review your academic enrollment credentials and update personal contact information.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-3.5 py-1.5 rounded-md bg-primary hover:bg-primary-dark text-white text-xs font-medium cursor-pointer shadow-xs transition disabled:opacity-50"
          >
            {submitting ? 'Saving Changes...' : 'Save Profile Changes'}
          </button>
        </div>
      </div>

      {/* Profile Overview Card */}
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 sm:p-5 flex flex-col md:flex-row items-center gap-4">
        <div className="w-16 h-16 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-sm font-semibold text-slate-600 dark:text-slate-300 shrink-0 overflow-hidden relative">
          {form.image ? (
            <img src={form.image} alt={form.name} className="w-full h-full object-cover" />
          ) : (
            form.name.slice(0, 2).toUpperCase() || 'ST'
          )}
        </div>

        <div className="flex-1 text-center md:text-left space-y-1">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{form.name}</h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
              Verified Student
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-xs text-slate-500 dark:text-slate-400 font-mono">
            <span>Reg: <strong className="text-slate-700 dark:text-slate-300">{form.registration_number}</strong></span>
            <span>Class: {form.class_name} ({form.section_name})</span>
            {form.roll && <span>Roll: #{form.roll}</span>}
          </div>
        </div>

        <label className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium transition cursor-pointer shrink-0">
          Upload Photo
          <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
        </label>
      </div>

      {/* Read-Only Academic Box */}
      <div className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-md p-4 space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Institutional Academic Credentials (Read-Only)
          </span>
          <span className="text-[10px] text-slate-400">Locked by Administration</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
          <div>
            <span className="text-[10px] text-slate-400 block mb-0.5">Enrolled Class</span>
            <input
              type="text"
              disabled
              value={form.class_name}
              className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-slate-500 cursor-not-allowed"
            />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block mb-0.5">Enrolled Section</span>
            <input
              type="text"
              disabled
              value={form.section_name}
              className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-slate-500 cursor-not-allowed"
            />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block mb-0.5">Assigned Roll</span>
            <input
              type="text"
              disabled
              value={form.roll ? `#${form.roll}` : 'N/A'}
              className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-slate-500 cursor-not-allowed"
            />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block mb-0.5">Institutional Email</span>
            <input
              type="email"
              disabled
              value={form.email}
              className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-slate-500 cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* Editable Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Personal Details */}
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 sm:p-5 space-y-3">
          <div className="pb-1 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
              1. Personal Details
            </h3>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Full Legal Name *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Contact Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Date of Birth</label>
                <input
                  type="date"
                  value={form.date_of_birth}
                  onChange={(e) => setForm((p) => ({ ...p, date_of_birth: e.target.value }))}
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Gender</label>
                <select
                  value={form.gender}
                  onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value }))}
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Blood Group</label>
                <select
                  value={form.blood_group}
                  onChange={(e) => setForm((p) => ({ ...p, blood_group: e.target.value }))}
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
                >
                  <option value="">-- Select --</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
            </div>

            {/* Dynamic fields with target_scope = info */}
            {renderScopedFields('info')}
          </div>
        </div>

        {/* Address Information */}
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 sm:p-5 space-y-3">
          <div className="pb-1 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
              2. Residential Address
            </h3>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Present Address *</label>
              <textarea
                rows={2}
                value={form.present_address}
                onChange={(e) => setForm((p) => ({ ...p, present_address: e.target.value }))}
                placeholder="House, Road, Area, Ward"
                className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Permanent Address</label>
              <textarea
                rows={2}
                value={form.permanent_address}
                onChange={(e) => setForm((p) => ({ ...p, permanent_address: e.target.value }))}
                placeholder="Leave blank if same as present address"
                className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">City / District</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                  placeholder="e.g. Dhaka"
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Postal Code</label>
                <input
                  type="text"
                  value={form.postal_code}
                  onChange={(e) => setForm((p) => ({ ...p, postal_code: e.target.value }))}
                  placeholder="e.g. 1216"
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary font-mono"
                />
              </div>
            </div>

            {/* Dynamic fields with target_scope = addresses */}
            {renderScopedFields('addresses')}
          </div>
        </div>

        {/* Parents & Guardians Details */}
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 sm:p-5 space-y-3">
          <div className="pb-1 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
              3. Parents &amp; Guardian Details
            </h3>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Father Name</label>
                <input
                  type="text"
                  value={form.father_name}
                  onChange={(e) => setForm((p) => ({ ...p, father_name: e.target.value }))}
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Father Phone</label>
                <input
                  type="tel"
                  value={form.father_phone}
                  onChange={(e) => setForm((p) => ({ ...p, father_phone: e.target.value }))}
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Mother Name</label>
                <input
                  type="text"
                  value={form.mother_name}
                  onChange={(e) => setForm((p) => ({ ...p, mother_name: e.target.value }))}
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Mother Phone</label>
                <input
                  type="tel"
                  value={form.mother_phone}
                  onChange={(e) => setForm((p) => ({ ...p, mother_phone: e.target.value }))}
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary font-mono"
                />
              </div>
            </div>

            {/* Dynamic fields with target_scope = guardians */}
            {renderScopedFields('guardians')}
          </div>
        </div>

        {/* Security & Password */}
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 sm:p-5 space-y-3">
          <div className="pb-1 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
              4. Password &amp; Workstation Security
            </h3>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Current Password</label>
              <input
                type="password"
                placeholder="Enter current password to set new password..."
                value={form.current_password}
                onChange={(e) => setForm((p) => ({ ...p, current_password: e.target.value }))}
                className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">New Password</label>
                <input
                  type="password"
                  placeholder="Min 6 characters"
                  value={form.new_password}
                  onChange={(e) => setForm((p) => ({ ...p, new_password: e.target.value }))}
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Confirm Password</label>
                <input
                  type="password"
                  placeholder="Confirm password"
                  value={form.confirm_password}
                  onChange={(e) => setForm((p) => ({ ...p, confirm_password: e.target.value }))}
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Submit */}
      <div className="w-full flex justify-end pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-1.5 rounded-md bg-primary hover:bg-primary-dark text-white text-xs font-medium cursor-pointer shadow-xs transition disabled:opacity-50"
        >
          {submitting ? 'Saving Changes...' : 'Save Profile Changes'}
        </button>
      </div>
    </form>
  );
};

export default StudentProfilePage;
