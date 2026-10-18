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
  FiCheck,
  FiX,
  FiArrowLeft,
  FiList,
  FiCheckCircle,
  FiLock,
  FiMapPin,
  FiBriefcase,
  FiFileText,
  FiCopy
} from 'react-icons/fi';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const GENDERS = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' }
];

const DEPARTMENTS = [
  { value: 'Administration', label: 'Administration' },
  { value: 'Accounts', label: 'Accounts & Finance' },
  { value: 'Hall', label: 'Hall & Dormitory' },
  { value: 'Library', label: 'Library & Archival' },
  { value: 'Club', label: 'Student Clubs & Activities' },
  { value: 'Hostel', label: 'Hostel Management' },
  { value: 'Inventory', label: 'Inventory & Procurement' },
  { value: 'General', label: 'General Administration' }
];

const RELIGIONS = ['Islam', 'Hinduism', 'Christianity', 'Buddhism', 'Other'];

export default function OfficerRegistrationPage() {
  const params = useParams();
  const router = useRouter();
  const domain = params?.domain || '';

  const fileInputRef = useRef(null);

  // Available payroll scales
  const [payrolls, setPayrolls] = useState([]);
  const [loadingPayrolls, setLoadingPayrolls] = useState(true);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department: 'Administration',
    designation: 'Officer',
    nid_number: '',
    gender: 'male',
    blood_group: 'O+',
    date_of_birth: '',
    religion: 'Islam',
    address: '',
    permanent_address: '',
    joining_date: new Date().toISOString().split('T')[0],
    payroll_id: '',
    photo_url: '',
    photo_id: '',
    password: '',
    bio: '',
    is_active: true
  });

  // Uploading and photo states
  const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

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

  // Fetch officer payroll scales
  useEffect(() => {
    async function loadPayrolls() {
      if (!domain) return;
      try {
        setLoadingPayrolls(true);
        const res = await fetch(`/api/${domain}/staff/panel/officer-payrolls`);
        const data = await res.json();
        if (data.success && Array.isArray(data.payrolls)) {
          setPayrolls(data.payrolls.filter((p) => p.is_active));
        }
      } catch (err) {
        console.error('Failed to load officer payroll scales:', err);
      } finally {
        setLoadingPayrolls(false);
      }
    }
    loadPayrolls();
  }, [domain]);

  // Selected payroll details
  const selectedPayroll = payrolls.find((p) => String(p.id) === String(formData.payroll_id));

  // Handle Photo selection
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, WEBP).', true);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size exceeds 5MB limit.', true);
      return;
    }

    setSelectedPhotoFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPhotoPreview(objectUrl);
  };

  const handleRemovePhoto = () => {
    setSelectedPhotoFile(null);
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
      setPhotoPreview('');
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Form input change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showToast('Officer full name is required.', true);
      return;
    }
    if (!formData.email.trim()) {
      showToast('Officer email address is required.', true);
      return;
    }
    if (!formData.phone.trim()) {
      showToast('Officer phone number is required.', true);
      return;
    }
    if (!formData.department) {
      showToast('Department placement is required.', true);
      return;
    }

    try {
      setSubmitting(true);

      const submissionData = new FormData();
      submissionData.append('name', formData.name.trim());
      submissionData.append('email', formData.email.trim());
      submissionData.append('phone', formData.phone.trim());
      submissionData.append('department', formData.department);
      submissionData.append('designation', formData.designation.trim() || 'Officer');
      submissionData.append('nid_number', formData.nid_number.trim());
      submissionData.append('gender', formData.gender);
      submissionData.append('blood_group', formData.blood_group || '');
      submissionData.append('date_of_birth', formData.date_of_birth || '');
      submissionData.append('religion', formData.religion || '');
      submissionData.append('address', formData.address.trim());
      submissionData.append('permanent_address', formData.permanent_address.trim());
      submissionData.append('joining_date', formData.joining_date || '');
      submissionData.append('bio', formData.bio.trim());
      submissionData.append('is_active', formData.is_active);

      // Direct payroll assignment: sends selected payroll scale ID
      if (formData.payroll_id) {
        submissionData.append('payroll_id', formData.payroll_id);
      }

      if (formData.password) {
        submissionData.append('password', formData.password);
      }

      if (selectedPhotoFile) {
        submissionData.append('file', selectedPhotoFile);
      }

      const res = await fetch(`/api/${domain}/staff/panel/officers`, {
        method: 'POST',
        body: submissionData
      });

      const data = await res.json();

      if (data.success) {
        showToast('Officer registered successfully!');
        setSuccessData(data);
      } else {
        showToast(data.error || 'Failed to register officer.', true);
      }
    } catch (err) {
      console.error('Registration error:', err);
      showToast('An error occurred during submission. Please check network.', true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (successData?.verificationUrl) {
      navigator.clipboard.writeText(successData.verificationUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleResetForm = () => {
    setSuccessData(null);
    handleRemovePhoto();
    setFormData({
      name: '',
      email: '',
      phone: '',
      department: 'Administration',
      designation: 'Officer',
      nid_number: '',
      gender: 'male',
      blood_group: 'O+',
      date_of_birth: '',
      religion: 'Islam',
      address: '',
      permanent_address: '',
      joining_date: new Date().toISOString().split('T')[0],
      payroll_id: '',
      photo_url: '',
      photo_id: '',
      password: '',
      bio: '',
      is_active: true
    });
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-16">
      {/* Toast Notifications */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white text-sm font-medium rounded-lg shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <FiCheck className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
      {toastError && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 bg-rose-600 text-white text-sm font-medium rounded-lg shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <FiX className="w-4 h-4 shrink-0" />
          <span>{toastError}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <Link href={`/${domain}/staff-panel`} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Staff Portal
            </Link>
            <span>/</span>
            <Link href={`/${domain}/staff-panel/officer-list`} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Officers
            </Link>
            <span>/</span>
            <span className="text-slate-800 dark:text-slate-200 font-medium">New Registration</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <FiUserPlus className="text-indigo-600 dark:text-indigo-400 w-6 h-6" />
            Officer Registration
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Enroll an administrative officer and directly assign an institutional payroll scale.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/${domain}/staff-panel/officer-list`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 text-xs font-medium shadow-xs transition"
          >
            <FiList className="w-3.5 h-3.5" />
            Officer Roster
          </Link>
          <Link
            href={`/${domain}/staff-panel/officer-payroll`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 text-xs font-medium shadow-xs transition"
          >
            <FiDollarSign className="w-3.5 h-3.5" />
            Payroll Scales
          </Link>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successData && (
        <div className="p-5 rounded-xl border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/90 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-100 shadow-xs space-y-4">
          <div className="flex items-start gap-3">
            <FiCheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-semibold text-base text-emerald-900 dark:text-emerald-100">
                Officer {successData.officer?.name} registered successfully!
              </h3>
              <p className="text-xs text-emerald-800 dark:text-emerald-200">
                A verification invitation link has been generated. The officer can use this link to establish their password and verify their account.
              </p>
            </div>
          </div>

          {successData.verificationUrl && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-emerald-200/60 dark:border-emerald-900/60">
              <input
                type="text"
                readOnly
                value={successData.verificationUrl}
                className="w-full text-xs font-mono px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 text-slate-800 dark:text-slate-200 select-all"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium shrink-0 cursor-pointer transition shadow-2xs"
              >
                {copiedLink ? <FiCheck className="w-3.5 h-3.5" /> : <FiCopy className="w-3.5 h-3.5" />}
                {copiedLink ? 'Copied' : 'Copy Link'}
              </button>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Link
              href={`/${domain}/staff-panel/officer-list`}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition cursor-pointer shadow-2xs"
            >
              Go to Officer List →
            </Link>
            <button
              type="button"
              onClick={handleResetForm}
              className="px-4 py-2 rounded-lg border border-emerald-400 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/40 text-xs font-medium transition cursor-pointer"
            >
              Register Another Officer
            </button>
          </div>
        </div>
      )}

      {/* Main Full-Page Form (NO POPUP MODAL) */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 Cols wide on desktop): Personal & Institutional Profile */}
          <div className="lg:col-span-2 space-y-6">
            {/* Card 1: Core Identification */}
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <FiUser className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-sm font-semibold text-slate-800 dark:text-white uppercase tracking-wider">
                  1. Personal Information
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Officer Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Mohammad Rafiqul Islam"
                    required
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Official Email <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <FiMail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="officer@campus.edu"
                      required
                      className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Contact Phone */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Primary Contact Phone <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <FiPhone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+880 1711 000000"
                      required
                      className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* NID Number */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    National ID (NID / Smart Card)
                  </label>
                  <input
                    type="text"
                    name="nid_number"
                    value={formData.nid_number}
                    onChange={handleChange}
                    placeholder="e.g. 19901234567890123"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Date of Birth
                  </label>
                  <div className="relative">
                    <FiCalendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="date"
                      name="date_of_birth"
                      value={formData.date_of_birth}
                      onChange={handleChange}
                      className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Gender
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    {GENDERS.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Blood Group */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Blood Group
                  </label>
                  <select
                    name="blood_group"
                    value={formData.blood_group}
                    onChange={handleChange}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Blood Group</option>
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Religion */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Religion
                  </label>
                  <select
                    name="religion"
                    value={formData.religion}
                    onChange={handleChange}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    {RELIGIONS.map((rel) => (
                      <option key={rel} value={rel}>
                        {rel}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Card 2: Department, Designation & Joining */}
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <FiBriefcase className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-sm font-semibold text-slate-800 dark:text-white uppercase tracking-wider">
                  2. Department & Administrative Designation
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Department Selection */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Department Unit <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    required
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept.value} value={dept.value}>
                        {dept.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Designation */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Designation Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="designation"
                    value={formData.designation}
                    onChange={handleChange}
                    placeholder="e.g. Accounts Officer / Librarian"
                    required
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Joining Date */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Date of Joining
                  </label>
                  <input
                    type="date"
                    name="joining_date"
                    value={formData.joining_date}
                    onChange={handleChange}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Card 3: Address & Bio */}
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <FiMapPin className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-sm font-semibold text-slate-800 dark:text-white uppercase tracking-wider">
                  3. Address & Biography
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Current / Present Address
                  </label>
                  <textarea
                    rows={2}
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Campus quarters, flat, road, city..."
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Permanent Address
                  </label>
                  <textarea
                    rows={2}
                    name="permanent_address"
                    value={formData.permanent_address}
                    onChange={handleChange}
                    placeholder="Village, postal code, district..."
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Professional Biography & Responsibilities
                  </label>
                  <textarea
                    rows={3}
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    placeholder="Brief summary of duties, responsibilities, or administrative background..."
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Direct Payroll Scale Assignment & Photo */}
          <div className="space-y-6">
            {/* Card 4: DIRECT PAYROLL SCALE ASSIGNMENT (NO SEPARATE SALARY STEP) */}
            <div className="p-5 rounded-xl border-2 border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/20 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-indigo-100 dark:border-indigo-950">
                <div className="flex items-center gap-2">
                  <FiDollarSign className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Payroll Scale Assignment
                    </h2>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Direct mapping (no separate salary entry required)
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Direct Sync
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Assign Officer Payroll Scale
                </label>
                <select
                  name="payroll_id"
                  value={formData.payroll_id}
                  onChange={handleChange}
                  className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- No Scale Assigned (0.00) --</option>
                  {loadingPayrolls ? (
                    <option disabled>Loading payroll scales...</option>
                  ) : (
                    payrolls.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.grade_code || 'STANDARD'}) — Net: {Number(p.net_salary || 0).toLocaleString()} ৳
                      </option>
                    ))
                  )}
                </select>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Select grade scale to automatically link salary components upon creation.
                </p>
              </div>

              {/* Live Payroll Breakdown Preview */}
              {selectedPayroll ? (
                <div className="p-3.5 rounded-lg border border-indigo-200/80 dark:border-indigo-800/80 bg-white/90 dark:bg-slate-800/90 space-y-2.5 text-xs animate-in fade-in duration-200">
                  <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700 pb-2">
                    <span>Grade Scale:</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400">
                      {selectedPayroll.grade_code || selectedPayroll.title}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-y-1.5 text-slate-600 dark:text-slate-300 text-[11px]">
                    <span>Basic Salary:</span>
                    <span className="text-right font-mono font-medium">
                      {Number(selectedPayroll.basic_salary || 0).toLocaleString()} ৳
                    </span>

                    <span>House Rent:</span>
                    <span className="text-right font-mono">
                      +{Number(selectedPayroll.house_rent || 0).toLocaleString()} ৳
                    </span>

                    <span>Medical Allowance:</span>
                    <span className="text-right font-mono">
                      +{Number(selectedPayroll.medical_allowance || 0).toLocaleString()} ৳
                    </span>

                    <span>Transport / Other:</span>
                    <span className="text-right font-mono">
                      +{(Number(selectedPayroll.transport_allowance || 0) + Number(selectedPayroll.other_allowance || 0)).toLocaleString()} ৳
                    </span>

                    <span className="text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-700">Gross Monthly:</span>
                    <span className="text-right font-mono font-semibold pt-1 border-t border-slate-100 dark:border-slate-700 text-slate-900 dark:text-white">
                      {Number(selectedPayroll.gross_salary || 0).toLocaleString()} ৳
                    </span>

                    <span className="text-rose-600 dark:text-rose-400">Total Deductions:</span>
                    <span className="text-right font-mono text-rose-600 dark:text-rose-400">
                      -{Number(selectedPayroll.total_deductions || 0).toLocaleString()} ৳
                    </span>
                  </div>

                  <div className="p-2.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between text-emerald-800 dark:text-emerald-300 font-bold">
                    <span>Net Monthly Pay:</span>
                    <span className="font-mono text-sm">
                      {Number(selectedPayroll.net_salary || 0).toLocaleString()} ৳
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-center text-xs text-slate-500 dark:text-slate-400">
                  No payroll scale selected. Officer can be assigned to a scale later or choose one above.
                </div>
              )}
            </div>

            {/* Card 5: Profile Photo Upload */}
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <FiUpload className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-sm font-semibold text-slate-800 dark:text-white uppercase tracking-wider">
                  Officer Photo
                </h2>
              </div>

              <div className="flex flex-col items-center justify-center text-center">
                {photoPreview ? (
                  <div className="relative group mb-3">
                    <img
                      src={photoPreview}
                      alt="Officer Preview"
                      className="w-32 h-32 rounded-xl object-cover border-2 border-indigo-500 shadow-md"
                    />
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="absolute -top-2 -right-2 p-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-md transition cursor-pointer"
                      title="Remove Photo"
                    >
                      <FiTrash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-8 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition bg-slate-50/50 dark:bg-slate-800/30"
                  >
                    <div className="p-3 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                      <FiUpload className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Click to choose officer photo
                    </span>
                    <span className="text-[10px] text-slate-400">
                      PNG, JPG, WEBP up to 5MB
                    </span>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
              </div>
            </div>

            {/* Card 6: Account Access & Status */}
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <FiLock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-sm font-semibold text-slate-800 dark:text-white uppercase tracking-wider">
                  Account Credentials
                </h2>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Temporary Initial Password
                </label>
                <input
                  type="text"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Auto-generated if left blank"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  The officer will configure their permanent password through the verification link.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200 block">
                    Active Officer Status
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    Allow login and active duty upon verification
                  </span>
                </div>
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <Link
            href={`/${domain}/staff-panel/officer-list`}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition cursor-pointer"
          >
            <FiArrowLeft className="w-3.5 h-3.5" />
            Cancel & Return to List
          </Link>

          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md transition disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Registering Officer & Assigning Payroll...
              </>
            ) : (
              <>
                <FiUserPlus className="w-4 h-4" />
                Register Officer & Link Payroll
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
