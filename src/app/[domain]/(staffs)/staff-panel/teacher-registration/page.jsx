/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FiUserPlus,
  FiUser,
  FiMail,
  FiPhone,
  FiCalendar,
  FiDollarSign,
  FiAward,
  FiUpload,
  FiTrash2,
  FiPlus,
  FiCheck,
  FiX,
  FiArrowLeft,
  FiList,
  FiCheckCircle,
  FiLock,
  FiMapPin
} from 'react-icons/fi';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const GENDERS = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' }
];

export default function TeacherRegistrationPage() {
  const params = useParams();
  const router = useRouter();
  const domain = params?.domain || '';

  const fileInputRef = useRef(null);

  // Available designations
  const [designations, setDesignations] = useState([]);
  const [loadingDesignations, setLoadingDesignations] = useState(true);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    number: '',
    emergency_contact: '',
    gender: 'male',
    blood_group: 'O+',
    date_of_birth: '',
    religion: 'Islam',
    address: '',
    permanent_address: '',
    joining_date: new Date().toISOString().split('T')[0],
    salary: '',
    designation_id: '',
    photo_url: '',
    photo_id: '',
    password: '',
    is_active: true
  });

  // Multiple Qualifications rows
  const [qualifications, setQualifications] = useState([
    { degree: '', institute: '', board: '', passing_year: '', result: '' }
  ]);

  // Uploading state
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Feedback Toasts
  const [toastMessage, setToastMessage] = useState(null);
  const [toastError, setToastError] = useState(null);

  const showToast = useCallback((msg, isErr = false) => {
    if (isErr) {
      setToastError(msg);
      setTimeout(() => setToastError(null), 4500);
    } else {
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 3500);
    }
  }, []);

  // Fetch designations
  useEffect(() => {
    async function loadDesignations() {
      if (!domain) return;
      try {
        setLoadingDesignations(true);
        const res = await fetch(`/api/${domain}/staff/panel/teacher/designations`);
        const data = await res.json();
        if (data.success && Array.isArray(data.designations)) {
          setDesignations(data.designations);
          if (data.designations.length > 0) {
            setFormData((prev) => ({ ...prev, designation_id: String(data.designations[0].id) }));
          }
        }
      } catch (err) {
        console.error('Failed to load designations:', err);
      } finally {
        setLoadingDesignations(false);
      }
    }
    loadDesignations();
  }, [domain]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Qualifications list handlers
  const handleQualChange = (index, field, value) => {
    setQualifications((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addQualificationRow = () => {
    setQualifications((prev) => [
      ...prev,
      { degree: '', institute: '', board: '', passing_year: '', result: '' }
    ]);
  };

  const removeQualificationRow = (index) => {
    setQualifications((prev) => prev.filter((_, i) => i !== index));
  };

  // Photo upload
  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, WebP).', true);
      return;
    }

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
        showToast('Teacher photo uploaded successfully!');
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

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showToast('Teacher full name is required.', true);
      return;
    }
    if (!formData.email.trim()) {
      showToast('Teacher email address is required.', true);
      return;
    }
    if (!formData.number.trim()) {
      showToast('Teacher phone number is required.', true);
      return;
    }

    // Filter out blank qualification rows
    const validQuals = qualifications.filter(
      (q) => q.degree && q.degree.trim() && q.institute && q.institute.trim()
    );

    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        designation_id: formData.designation_id ? Number(formData.designation_id) : null,
        salary: formData.salary ? parseFloat(formData.salary) : 0,
        qualifications: validQuals
      };

      const res = await fetch(`/api/${domain}/staff/panel/teacher`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        showToast(data.message || `Teacher "${formData.name}" registered successfully! Verification email dispatched.`);
        setTimeout(() => {
          router.push(`/${domain}/staff-panel/teacher-list`);
        }, 1800);
      } else {
        showToast(data.error || 'Failed to register teacher.', true);
      }
    } catch (err) {
      console.error(err);
      showToast('Network error while registering teacher.', true);
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

      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href={`/${domain}/staff-panel/teacher-list`} className="hover:text-slate-900 dark:hover:text-white flex items-center gap-1">
              <FiArrowLeft className="w-3.5 h-3.5" />
              <span>Teacher Directory</span>
            </Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">New Teacher Onboarding</span>
          </div>
          <h1 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FiUserPlus className="w-5 h-5 text-blue-600" />
            <span>Teacher Registration Studio</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Register new institutional faculty members, assign designations, and configure academic qualifications.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/${domain}/staff-panel/teacher-designations`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <FiAward className="w-3.5 h-3.5" />
            <span>Manage Designations</span>
          </Link>
          <Link
            href={`/${domain}/staff-panel/teacher-list`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition"
          >
            <FiList className="w-3.5 h-3.5" />
            <span>View All Teachers</span>
          </Link>
        </div>
      </div>

      {/* Main Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Section 1: Basic Information & Profile Photo */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
            <FiUser className="w-4 h-4 text-blue-600" />
            <span>1. Personal & Contact Information</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Left: Profile Photo Card */}
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
                <span>{uploadingPhoto ? 'Uploading...' : 'Upload Photo'}</span>
              </button>
              <p className="text-[10px] text-slate-400 mt-1">Recommended: 300x300 JPG or PNG</p>
            </div>

            {/* Right: Personal Details Inputs */}
            <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  name="name"
                  placeholder="e.g. Dr. Mohammad Rahaman"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300"
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
                  placeholder="e.g. m.rahaman@school.edu"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Primary Phone Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  name="number"
                  placeholder="e.g. +880 1712 345678"
                  value={formData.number}
                  onChange={handleInputChange}
                  className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Emergency Contact
                </label>
                <input
                  type="text"
                  name="emergency_contact"
                  placeholder="Spouse or Guardian phone"
                  value={formData.emergency_contact}
                  onChange={handleInputChange}
                  className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300"
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
                  placeholder="e.g. Islam, Hinduism, Christianity"
                  value={formData.religion}
                  onChange={handleInputChange}
                  className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Initial Demo Password (Optional)
                </label>
                <input
                  type="password"
                  name="password"
                  placeholder="Leave blank for auto-generated demo password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  A verification link will be emailed to the teacher to confirm their profile and set their personal password.
                </p>
              </div>
            </div>
          </div>

          {/* Present and Permanent Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <FiMapPin className="w-3 h-3 text-slate-400" />
                <span>Present / Residential Address</span>
              </label>
              <textarea
                rows={2}
                name="address"
                placeholder="House, Road, Area, City..."
                value={formData.address}
                onChange={handleInputChange}
                className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300 resize-none"
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
                placeholder="Village / Town, Post Office, Upazila / District..."
                value={formData.permanent_address}
                onChange={handleInputChange}
                className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Institutional & Employment Details */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
            <FiAward className="w-4 h-4 text-emerald-600" />
            <span>2. Institutional Role & Employment</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                Designation / Rank <span className="text-rose-500">*</span>
              </label>
              <select
                name="designation_id"
                required
                value={formData.designation_id}
                onChange={handleInputChange}
                className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300 cursor-pointer"
              >
                <option value="">-- Choose Designation --</option>
                {designations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title} {d.display_order ? `(#${d.display_order})` : ''}
                  </option>
                ))}
              </select>
              {designations.length === 0 && !loadingDesignations && (
                <p className="text-[10px] text-amber-600 mt-1">
                  No designations found.{' '}
                  <Link href={`/${domain}/staff-panel/teacher-designations`} className="underline">
                    Create one first
                  </Link>
                </p>
              )}
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
                Basic Monthly Salary (BDT / Currency)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                name="salary"
                placeholder="e.g. 35000.00"
                value={formData.salary}
                onChange={handleInputChange}
                className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300"
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
              <p className="text-[10px] text-slate-400 mt-0.5 ml-6">Eligible for class routines and portal login</p>
            </div>
          </div>
        </div>

        {/* Section 3: Academic Qualifications */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <FiCheckCircle className="w-4 h-4 text-purple-600" />
              <span>3. Educational Degrees & Qualifications (Optional)</span>
            </h2>

            <button
              type="button"
              onClick={addQualificationRow}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <FiPlus className="w-3 h-3" />
              <span>Add Degree</span>
            </button>
          </div>

          <div className="space-y-3">
            {qualifications.map((qual, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 items-end"
              >
                <div className="sm:col-span-3">
                  <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Degree / Certificate
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. M.Sc in Mathematics"
                    value={qual.degree}
                    onChange={(e) => handleQualChange(idx, 'degree', e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Institute / University
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dhaka University"
                    value={qual.institute}
                    onChange={(e) => handleQualChange(idx, 'institute', e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Board / Department
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Science"
                    value={qual.board}
                    onChange={(e) => handleQualChange(idx, 'board', e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Passing Year
                  </label>
                  <input
                    type="number"
                    min="1950"
                    max="2035"
                    placeholder="e.g. 2018"
                    value={qual.passing_year}
                    onChange={(e) => handleQualChange(idx, 'passing_year', e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    GPA / Result
                  </label>
                  <input
                    type="text"
                    placeholder="3.85"
                    value={qual.result}
                    onChange={(e) => handleQualChange(idx, 'result', e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-1 flex justify-end">
                  {qualifications.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeQualificationRow(idx)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition"
                      title="Remove Degree"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Form Submission Actions */}
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
            <span>{submitting ? 'Registering Teacher...' : 'Complete Teacher Registration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
