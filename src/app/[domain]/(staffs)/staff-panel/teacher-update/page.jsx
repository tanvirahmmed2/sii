/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  FiEdit2,
  FiUser,
  FiMail,
  FiPhone,
  FiCalendar,
  FiDollarSign,
  FiAward,
  FiUpload,
  FiTrash2,
  FiCheck,
  FiX,
  FiArrowLeft,
  FiList,
  FiRefreshCw,
  FiMapPin,
  FiBookOpen
} from 'react-icons/fi';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const GENDERS = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' }
];

function TeacherUpdateContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const domain = params?.domain || '';
  const initialTeacherId = searchParams.get('id') || '';

  const fileInputRef = useRef(null);

  // All teachers list (for selector if no id given)
  const [allTeachers, setAllTeachers] = useState([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState(initialTeacherId);

  // Designations
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    email: '',
    number: '',
    emergency_contact: '',
    gender: 'male',
    blood_group: '',
    date_of_birth: '',
    religion: '',
    address: '',
    permanent_address: '',
    joining_date: '',
    salary: '',
    designation_id: '',
    photo_url: '',
    photo_id: '',
    password: '',
    is_active: true
  });

  // Toast feedback
  const [toastMessage, setToastMessage] = useState(null);
  const [toastError, setToastError] = useState(null);

  const showToast = useCallback((msg, isErr = false) => {
    if (isErr) {
      setToastError(msg);
      setTimeout(() => setToastError(null), 4000);
    } else {
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 3000);
    }
  }, []);

  // Fetch designations
  useEffect(() => {
    async function loadDesignations() {
      if (!domain) return;
      try {
        const res = await fetch(`/api/${domain}/staff/panel/teacher/designations`);
        const data = await res.json();
        if (data.success) {
          setDesignations(data.designations || []);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadDesignations();
  }, [domain]);

  // Fetch teachers roster for selector
  useEffect(() => {
    async function loadTeachers() {
      if (!domain) return;
      try {
        const res = await fetch(`/api/${domain}/staff/panel/teacher?limit=100`);
        const data = await res.json();
        if (data.success) {
          setAllTeachers(data.teachers || []);
          if (!selectedTeacherId && data.teachers && data.teachers.length > 0) {
            setSelectedTeacherId(String(data.teachers[0].id));
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadTeachers();
  }, [domain, selectedTeacherId]);

  // Fetch single teacher data
  const loadTeacherDetails = useCallback(async (tId) => {
    if (!domain || !tId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/${domain}/staff/panel/teacher?id=${tId}`);
      const data = await res.json();
      if (data.success && data.teacher) {
        const t = data.teacher;
        setFormData({
          id: t.id,
          name: t.name || '',
          email: t.email || '',
          number: t.number || '',
          emergency_contact: t.emergency_contact || '',
          gender: t.gender || 'male',
          blood_group: t.blood_group || '',
          date_of_birth: t.date_of_birth ? t.date_of_birth.split('T')[0] : '',
          religion: t.religion || '',
          address: t.address || '',
          permanent_address: t.permanent_address || '',
          joining_date: t.joining_date ? t.joining_date.split('T')[0] : '',
          salary: t.salary !== null && t.salary !== undefined ? String(t.salary) : '',
          designation_id: t.designation_id ? String(t.designation_id) : '',
          photo_url: t.photo_url || '',
          photo_id: t.photo_id || '',
          password: '',
          is_active: Boolean(t.is_active)
        });
      } else {
        showToast(data.error || 'Failed to load teacher profile.', true);
      }
    } catch (err) {
      console.error(err);
      showToast('Error fetching teacher profile.', true);
    } finally {
      setLoading(false);
    }
  }, [domain, showToast]);

  useEffect(() => {
    if (selectedTeacherId) {
      loadTeacherDetails(selectedTeacherId);
    }
  }, [selectedTeacherId, loadTeacherDetails]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Photo upload
  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingPhoto(true);
      const data = new FormData();
      data.append('file', file);
      data.append('folder', 'teacher_photos');

      const res = await fetch(`/api/${domain}/staff/panel/upload`, {
        method: 'POST',
        body: data
      });
      const json = await res.json();

      if (json.success && json.url) {
        setFormData((prev) => ({
          ...prev,
          photo_url: json.url,
          photo_id: json.publicId || json.image_id || ''
        }));
        showToast('Photo uploaded.');
      } else {
        showToast(json.error || 'Failed to upload photo.', true);
      }
    } catch (err) {
      console.error(err);
      showToast('Error uploading photo.', true);
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removePhoto = () => {
    setFormData((prev) => ({ ...prev, photo_url: '', photo_id: '' }));
  };

  // Submit update
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showToast('Name is required.', true);
      return;
    }
    if (!formData.email.trim()) {
      showToast('Email is required.', true);
      return;
    }
    if (!formData.number.trim()) {
      showToast('Phone number is required.', true);
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        designation_id: formData.designation_id ? Number(formData.designation_id) : null,
        salary: formData.salary ? parseFloat(formData.salary) : 0
      };

      const res = await fetch(`/api/${domain}/staff/panel/teacher`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        showToast('Teacher profile updated successfully!');
        loadTeacherDetails(formData.id);
      } else {
        showToast(data.error || 'Failed to update teacher.', true);
      }
    } catch (err) {
      console.error(err);
      showToast('Error connecting to server.', true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded shadow-lg text-xs font-medium animate-in fade-in slide-in-from-top-2">
          <FiCheck className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}
      {toastError && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-rose-600 text-white px-4 py-2.5 rounded shadow-lg text-xs font-medium animate-in fade-in slide-in-from-top-2">
          <FiX className="w-4 h-4" />
          <span>{toastError}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href={`/${domain}/staff-panel/teacher-list`} className="hover:text-slate-900 dark:hover:text-white flex items-center gap-1">
              <FiArrowLeft className="w-3.5 h-3.5" />
              <span>Teacher Directory</span>
            </Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Update Teacher Profile</span>
          </div>
          <h1 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FiEdit2 className="w-5 h-5 text-blue-600" />
            <span>Teacher Profile Editor</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Modify faculty credentials, designated institutional rank, contact records, and portal accessibility.
          </p>
        </div>

        {/* Quick links & selector */}
        <div className="flex flex-wrap items-center gap-2">
          {allTeachers.length > 0 && (
            <select
              value={selectedTeacherId}
              onChange={(e) => {
                setSelectedTeacherId(e.target.value);
                router.push(`/${domain}/staff-panel/teacher-update?id=${e.target.value}`);
              }}
              className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            >
              {allTeachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.designation_title || 'No rank'})
                </option>
              ))}
            </select>
          )}

          <Link
            href={`/${domain}/staff-panel/teacher-qualifications?teacher_id=${selectedTeacherId}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <FiAward className="w-3.5 h-3.5" />
            <span>Qualifications</span>
          </Link>

          <Link
            href={`/${domain}/staff-panel/teacher-assign?teacher_id=${selectedTeacherId}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <FiBookOpen className="w-3.5 h-3.5" />
            <span>Subject Routine</span>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded">
          <FiRefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
          <span>Loading teacher profile data...</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Section 1: Personal & Contact */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
              <FiUser className="w-4 h-4 text-blue-600" />
              <span>1. Personal & Contact Information</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Photo Box */}
              <div className="md:col-span-1 flex flex-col items-center justify-center p-4 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-center">
                {formData.photo_url ? (
                  <div className="relative group w-32 h-32 rounded-lg overflow-hidden border-2 border-slate-300 dark:border-slate-700 shadow-sm">
                    <img
                      src={formData.photo_url}
                      alt="Teacher preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity text-xs gap-1"
                    >
                      <FiTrash2 className="w-4 h-4 text-rose-400" />
                      <span>Remove</span>
                    </button>
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-lg bg-slate-200 dark:bg-slate-800 flex flex-col items-center justify-center text-slate-400">
                    <FiUser className="w-12 h-12" />
                    <span className="text-[10px] mt-1 font-medium">No Photo</span>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />

                <button
                  type="button"
                  disabled={uploadingPhoto}
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50"
                >
                  <FiUpload className="w-3.5 h-3.5" />
                  <span>{uploadingPhoto ? 'Uploading...' : 'Change Photo'}</span>
                </button>
              </div>

              {/* Input Fields */}
              <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Contact Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    name="number"
                    value={formData.number}
                    onChange={handleInputChange}
                    className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Emergency Contact
                  </label>
                  <input
                    type="text"
                    name="emergency_contact"
                    value={formData.emergency_contact}
                    onChange={handleInputChange}
                    className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Gender
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300 cursor-pointer"
                  >
                    {GENDERS.map((g) => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Blood Group
                  </label>
                  <select
                    name="blood_group"
                    value={formData.blood_group}
                    onChange={handleInputChange}
                    className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300 cursor-pointer"
                  >
                    <option value="">Select blood group</option>
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    name="date_of_birth"
                    value={formData.date_of_birth}
                    onChange={handleInputChange}
                    className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Religion
                  </label>
                  <input
                    type="text"
                    name="religion"
                    value={formData.religion}
                    onChange={handleInputChange}
                    className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Reset Portal Password (Optional)
                  </label>
                  <input
                    type="password"
                    name="password"
                    placeholder="Leave blank to keep current"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300"
                  />
                </div>
              </div>
            </div>

            {/* Addresses */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <FiMapPin className="w-3 h-3 text-slate-400" />
                  <span>Present Address</span>
                </label>
                <textarea
                  rows={2}
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300 resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <FiMapPin className="w-3 h-3 text-slate-400" />
                  <span>Permanent Address</span>
                </label>
                <textarea
                  rows={2}
                  name="permanent_address"
                  value={formData.permanent_address}
                  onChange={handleInputChange}
                  className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Institutional & Designation Details */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
              <FiAward className="w-4 h-4 text-emerald-600" />
              <span>2. Institutional Role & Employment</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Designation / Rank
                </label>
                <select
                  name="designation_id"
                  value={formData.designation_id}
                  onChange={handleInputChange}
                  className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300 cursor-pointer"
                >
                  <option value="">-- No Designation (Unassigned) --</option>
                  {designations.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title} {d.display_order ? `(#${d.display_order})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Joining Date
                </label>
                <input
                  type="date"
                  name="joining_date"
                  value={formData.joining_date}
                  onChange={handleInputChange}
                  className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Basic Monthly Salary
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  name="salary"
                  value={formData.salary}
                  onChange={handleInputChange}
                  className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300"
                />
              </div>

              <div className="flex flex-col justify-center pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                    className="rounded border-slate-300 text-slate-900 focus:ring-0 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">Active Faculty Status</span>
                </label>
                <p className="text-[10px] text-slate-400 mt-0.5 ml-6">Controls portal authentication access</p>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-2xs">
            <Link
              href={`/${domain}/staff-panel/teacher-list`}
              className="px-4 py-2 rounded text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2 rounded text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white disabled:opacity-50 transition shadow-sm cursor-pointer"
            >
              <FiCheck className="w-4 h-4" />
              <span>{submitting ? 'Updating Profile...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function TeacherUpdatePage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-400">
          <FiRefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
          <span>Loading teacher update form...</span>
        </div>
      }
    >
      <TeacherUpdateContent />
    </Suspense>
  );
}
