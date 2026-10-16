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
  FiMapPin,
  FiLayers
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

  // Available designations, departments & payroll scales
  const [designations, setDesignations] = useState([]);
  const [loadingDesignations, setLoadingDesignations] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [payrolls, setPayrolls] = useState([]);
  const [loadingPayrolls, setLoadingPayrolls] = useState(true);

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
    payroll_id: '',
    department_id: '',
    designation_id: '',
    photo_url: '',
    photo_id: '',
    password: '',
    is_active: false
  });

  // Multiple Qualifications rows
  const [qualifications, setQualifications] = useState([
    { degree: '', institute: '', board: '', passing_year: '', result: '' }
  ]);

  // Uploading and photo states
  const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
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

  // Fetch designations, departments & payroll scales
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

    async function loadDepartments() {
      if (!domain) return;
      try {
        setLoadingDepartments(true);
        const res = await fetch(`/api/${domain}/staff/panel/departments`);
        const data = await res.json();
        if (data.success && Array.isArray(data.departments)) {
          setDepartments(data.departments);
          if (data.departments.length > 0) {
            setFormData((prev) => ({ ...prev, department_id: String(data.departments[0].id) }));
          }
        }
      } catch (err) {
        console.error('Failed to load departments:', err);
      } finally {
        setLoadingDepartments(false);
      }
    }

    async function loadPayrolls() {
      if (!domain) return;
      try {
        setLoadingPayrolls(true);
        const res = await fetch(`/api/${domain}/staff/panel/teacher-payrolls`);
        const data = await res.json();
        if (data.success && Array.isArray(data.payrolls)) {
          setPayrolls(data.payrolls.filter((p) => p.is_active));
        }
      } catch (err) {
        console.error('Failed to load payroll scales:', err);
      } finally {
        setLoadingPayrolls(false);
      }
    }

    loadDesignations();
    loadDepartments();
    loadPayrolls();
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

  // Photo select (Local preview only - does not upload to Cloudinary until teacher record exists)
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, WebP).', true);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size exceeds 5MB limit.', true);
      return;
    }

    // Revoke previous object URL if any
    if (photoPreview && photoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview);
    }

    setSelectedPhotoFile(file);
    const localUrl = URL.createObjectURL(file);
    setPhotoPreview(localUrl);
    setFormData((prev) => ({
      ...prev,
      photo_url: localUrl,
      photo_id: ''
    }));
    showToast('Photo selected. It will be uploaded after teacher record is created.');
  };

  const removePhoto = () => {
    if (photoPreview && photoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview);
    }
    setSelectedPhotoFile(null);
    setPhotoPreview('');
    setFormData((prev) => ({ ...prev, photo_url: '', photo_id: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Form submission: 1. Create table row first -> 2. Upload photo to Cloudinary and link to table
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

    if (!formData.department_id) {
      showToast('Department is required. Every teacher must belong to an academic department.', true);
      return;
    }

    // Filter out blank qualification rows
    const validQuals = qualifications.filter(
      (q) => q.degree && q.degree.trim() && q.institute && q.institute.trim()
    );

    try {
      setSubmitting(true);

      const postData = new FormData();
      Object.keys(formData).forEach((key) => {
        if (key === 'department_id') postData.append('department_id', Number(formData.department_id));
        else if (key === 'designation_id') postData.append('designation_id', formData.designation_id ? Number(formData.designation_id) : '');
        else if (key === 'payroll_id') {
          if (formData.payroll_id) postData.append('payroll_id', Number(formData.payroll_id));
        }
        else if (key === 'salary') { /* Connected via website_teacher_payrolls */ }
        else if (formData[key] !== null && formData[key] !== undefined) postData.append(key, formData[key]);
      });
      postData.append('qualifications', JSON.stringify(validQuals));

      if (selectedPhotoFile) {
        postData.append('photo', selectedPhotoFile);
      }

      const res = await fetch(`/api/${domain}/staff/panel/teacher`, {
        method: 'POST',
        body: postData
      });
      const data = await res.json();

      if (!data.success || !data.teacher?.id) {
        showToast(data.error || 'Failed to register teacher.', true);
        return;
      }

      showToast(data.message || `Teacher "${formData.name}" registered successfully! Verification email dispatched.`);
      setTimeout(() => {
        router.push(`/${domain}/staff-panel/teacher-list`);
      }, 1500);
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
                disabled={uploadingPhoto || submitting}
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50"
              >
                <FiUpload className="w-3.5 h-3.5" />
                <span>{selectedPhotoFile ? 'Change Photo' : 'Select Photo'}</span>
              </button>
              <p className="text-[10px] text-slate-400 mt-1">
                {selectedPhotoFile ? 'Selected — ready to save' : 'Recommended: 300x300 JPG or PNG'}
              </p>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <FiLayers className="w-3.5 h-3.5 text-blue-600" />
                <span>Department <span className="text-rose-500">*</span></span>
              </label>
              <select
                name="department_id"
                required
                value={formData.department_id}
                onChange={handleInputChange}
                className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300 cursor-pointer"
              >
                <option value="">-- Choose Department --</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} {d.code ? `(${d.code})` : ''}
                  </option>
                ))}
              </select>
              {departments.length === 0 && !loadingDepartments && (
                <p className="text-[10px] text-amber-600 mt-1">
                  No departments found.{' '}
                  <Link href={`/${domain}/staff-panel/departments`} className="underline font-semibold">
                    Create a department first
                  </Link>
                </p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <FiAward className="w-3.5 h-3.5 text-emerald-600" />
                <span>Designation / Rank <span className="text-rose-500">*</span></span>
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
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <FiDollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Payroll Scale / Grade</span>
                </span>
                <Link
                  href={`/${domain}/staff-panel/teacher-payrolls`}
                  target="_blank"
                  className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Manage Scales
                </Link>
              </label>
              <select
                name="payroll_id"
                value={formData.payroll_id}
                onChange={handleInputChange}
                className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300 cursor-pointer"
              >
                <option value="">-- No Payroll Scale (Unassigned) --</option>
                {payrolls.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({p.grade_code || 'Scale'}) — Basic: ৳{Number(p.basic_salary).toLocaleString()}
                  </option>
                ))}
              </select>
              {payrolls.length === 0 && !loadingPayrolls && (
                <p className="text-[10px] text-amber-600 mt-1">
                  No payroll scales found.{' '}
                  <Link href={`/${domain}/staff-panel/teacher-payrolls`} className="underline font-semibold">
                    Create in Payroll
                  </Link>
                </p>
              )}
            </div>

            <div className="flex flex-col justify-center pt-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                <span className="text-xs font-semibold text-slate-900 dark:text-white">Status: Inactive (Pending)</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Verification link is emailed on creation. Account automatically activates once verified.
              </p>
            </div>
          </div>

          {/* Connected Payroll Scale Details Breakdown */}
          {(() => {
            const selectedPayroll = payrolls.find((p) => String(p.id) === String(formData.payroll_id));
            if (!selectedPayroll) return null;
            return (
              <div className="mt-3 p-3 rounded border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/70 dark:border-emerald-800/40 pb-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-emerald-950 dark:text-emerald-300 text-xs">
                      {selectedPayroll.title}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-200/60 dark:bg-emerald-800/50 text-emerald-800 dark:text-emerald-200">
                      {selectedPayroll.grade_code || 'STANDARD'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs flex-wrap">
                    <span className="text-slate-600 dark:text-slate-300">
                      Gross: <strong className="text-slate-900 dark:text-white">৳{Number(selectedPayroll.gross_salary || 0).toLocaleString()}</strong>
                    </span>
                    <span className="text-slate-400">|</span>
                    <span className="text-rose-600 dark:text-rose-400">
                      Deductions: <strong>-৳{Number(selectedPayroll.total_deductions || 0).toLocaleString()}</strong>
                    </span>
                    <span className="text-slate-400">|</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                      Net Monthly: ৳{Number(selectedPayroll.net_salary || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                  <div>
                    <span className="block text-[10px] uppercase text-slate-400">Basic</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">৳{Number(selectedPayroll.basic_salary || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase text-slate-400">House Rent</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">৳{Number(selectedPayroll.house_rent || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase text-slate-400">Medical</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">৳{Number(selectedPayroll.medical_allowance || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase text-slate-400">Transport</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">৳{Number(selectedPayroll.transport_allowance || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase text-slate-400">Other Allow.</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">৳{Number(selectedPayroll.other_allowance || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase text-slate-400">PF Ded.</span>
                    <span className="font-medium text-rose-600 dark:text-rose-400">৳{Number(selectedPayroll.provident_fund || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase text-slate-400">Tax Ded.</span>
                    <span className="font-medium text-rose-600 dark:text-rose-400">৳{Number(selectedPayroll.tax_deduction || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            );
          })()}
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
