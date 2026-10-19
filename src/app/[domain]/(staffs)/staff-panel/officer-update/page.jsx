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
  FiUpload,
  FiTrash2,
  FiCheck,
  FiX,
  FiArrowLeft,
  FiList,
  FiRefreshCw,
  FiMapPin,
  FiBriefcase,
  FiLock,
  FiCheckCircle
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

function OfficerUpdateContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const domain = params?.domain || '';
  const initialOfficerId = searchParams.get('id') || '';

  const fileInputRef = useRef(null);

  // All officers list (for selector if no id given)
  const [allOfficers, setAllOfficers] = useState([]);
  const [selectedOfficerId, setSelectedOfficerId] = useState(initialOfficerId);

  // Payroll scales
  const [payrolls, setPayrolls] = useState([]);
  const [loadingPayrolls, setLoadingPayrolls] = useState(true);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [resendingInvite, setResendingInvite] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    email: '',
    phone: '',
    department: 'Administration',
    designation: 'Officer',
    nid_number: '',
    gender: 'male',
    blood_group: '',
    date_of_birth: '',
    religion: '',
    address: '',
    permanent_address: '',
    joining_date: '',
    payroll_id: '',
    photo_url: '',
    photo_id: '',
    password: '',
    bio: '',
    is_active: true,
    is_registered: false
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

  // Fetch all officers (for switching) and payroll scales
  useEffect(() => {
    async function loadData() {
      if (!domain) return;
      try {
        setLoadingPayrolls(true);
        const [officersRes, payrollsRes] = await Promise.all([
          fetch(`/api/${domain}/staff/panel/officers?limit=100`),
          fetch(`/api/${domain}/staff/panel/officer-payrolls`)
        ]);

        const offData = await officersRes.json();
        const payData = await payrollsRes.json();

        if (offData.success && Array.isArray(offData.officers)) {
          setAllOfficers(offData.officers);
          if (!selectedOfficerId && offData.officers.length > 0) {
            setSelectedOfficerId(String(offData.officers[0].id));
          }
        }

        if (payData.success && Array.isArray(payData.payrolls)) {
          setPayrolls(payData.payrolls.filter((p) => p.is_active));
        }
      } catch (err) {
        console.error('Failed to load initial data:', err);
      } finally {
        setLoadingPayrolls(false);
      }
    }
    loadData();
  }, [domain, selectedOfficerId]);

  // Load selected officer profile details
  const loadOfficerProfile = useCallback(
    async (officerId) => {
      if (!domain || !officerId) return;
      try {
        setLoading(true);
        const res = await fetch(`/api/${domain}/staff/panel/officers?id=${officerId}`);
        const data = await res.json();

        if (data.success && data.officer) {
          const off = data.officer;
          setFormData({
            id: off.id,
            name: off.name || '',
            email: off.email || '',
            phone: off.phone || '',
            department: off.department || 'Administration',
            designation: off.designation || 'Officer',
            nid_number: off.nid_number || '',
            gender: off.gender || 'male',
            blood_group: off.blood_group || '',
            date_of_birth: off.date_of_birth ? off.date_of_birth.split('T')[0] : '',
            religion: off.religion || '',
            address: off.address || '',
            permanent_address: off.permanent_address || '',
            joining_date: off.joining_date ? off.joining_date.split('T')[0] : '',
            payroll_id: off.payroll_id ? String(off.payroll_id) : '',
            photo_url: off.photo_url || '',
            photo_id: off.photo_id || '',
            password: '',
            bio: off.bio || '',
            is_active: Boolean(off.is_active),
            is_registered: Boolean(off.is_registered)
          });
          setPhotoPreview(off.photo_url || '');
          setSelectedPhotoFile(null);
        } else {
          showToast(data.error || 'Failed to load officer details.', true);
        }
      } catch (err) {
        console.error('Error loading officer:', err);
        showToast('Network error loading officer details.', true);
      } finally {
        setLoading(false);
      }
    },
    [domain, showToast]
  );

  useEffect(() => {
    if (selectedOfficerId) {
      loadOfficerProfile(selectedOfficerId);
    }
  }, [selectedOfficerId, loadOfficerProfile]);

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
    setPhotoPreview('');
    setFormData((prev) => ({ ...prev, photo_url: '', photo_id: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Selected payroll details
  const selectedPayroll = payrolls.find((p) => String(p.id) === String(formData.payroll_id));

  // Submit update
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
      showToast('Officer contact number is required.', true);
      return;
    }

    try {
      setSubmitting(true);

      const submissionData = new FormData();
      submissionData.append('id', formData.id);
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

      // Direct payroll assignment: sends selected payroll scale ID or 'none' to remove
      submissionData.append('payroll_id', formData.payroll_id ? formData.payroll_id : 'none');

      if (formData.password && formData.password.trim()) {
        submissionData.append('password', formData.password.trim());
      }

      if (selectedPhotoFile) {
        submissionData.append('file', selectedPhotoFile);
      } else if (!photoPreview && !formData.photo_url) {
        submissionData.append('photo_url', '');
        submissionData.append('photo_id', '');
      }

      const res = await fetch(`/api/${domain}/staff/panel/officers`, {
        method: 'PUT',
        body: submissionData
      });

      const data = await res.json();

      if (data.success) {
        showToast('Officer profile and payroll updated successfully!');
        if (data.officer) {
          setFormData((prev) => ({
            ...prev,
            ...data.officer,
            payroll_id: data.officer.payroll_id ? String(data.officer.payroll_id) : '',
            password: ''
          }));
          if (data.officer.photo_url) {
            setPhotoPreview(data.officer.photo_url);
          }
        }
      } else {
        showToast(data.error || 'Failed to update officer profile.', true);
      }
    } catch (err) {
      console.error('Update error:', err);
      showToast('Error saving officer profile. Please check network.', true);
    } finally {
      setSubmitting(false);
    }
  };

  // Resend invitation
  const handleResendInvite = async () => {
    if (!formData.id) return;
    try {
      setResendingInvite(true);
      const res = await fetch(`/api/${domain}/staff/panel/officers/resend-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ officerId: formData.id })
      });
      const data = await res.json();

      if (data.success) {
        showToast('Fresh verification link dispatched to officer’s email.');
      } else {
        showToast(data.error || 'Failed to resend invite.', true);
      }
    } catch (err) {
      console.error(err);
      showToast('Network error resending invite.', true);
    } finally {
      setResendingInvite(false);
    }
  };

  return (
    <div className="w-full space-y-6 pb-16">
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
            <span className="text-slate-800 dark:text-slate-200 font-medium">Update Officer</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <FiEdit2 className="text-indigo-600 dark:text-indigo-400 w-6 h-6" />
            Update Officer Profile & Payroll
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Modify credentials, department unit, designation, and directly adjust assigned payroll scale.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/${domain}/staff-panel/officer-list`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium shadow-xs transition"
          >
            <FiList className="w-3.5 h-3.5" />
            Officer Roster
          </Link>
          <Link
            href={`/${domain}/staff-panel/officer-registration`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-xs transition"
          >
            <FiUser className="w-3.5 h-3.5" />
            Register New
          </Link>
        </div>
      </div>

      {/* Officer Selector Toolbar */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1 max-w-md">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Select Officer to Edit
          </label>
          <select
            value={selectedOfficerId}
            onChange={(e) => {
              setSelectedOfficerId(e.target.value);
              router.replace(`/${domain}/staff-panel/officer-update?id=${e.target.value}`);
            }}
            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            {allOfficers.map((off) => (
              <option key={off.id} value={off.id}>
                {off.name} ({off.designation || 'Officer'} - {off.department || 'General'}) — #{off.id}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          {!formData.is_registered && formData.id && (
            <button
              type="button"
              onClick={handleResendInvite}
              disabled={resendingInvite}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs font-semibold hover:bg-amber-100 transition cursor-pointer disabled:opacity-50"
            >
              <FiMail className="w-3.5 h-3.5" />
              {resendingInvite ? 'Sending...' : 'Resend Verification Invite'}
            </button>
          )}

          <button
            type="button"
            onClick={() => loadOfficerProfile(selectedOfficerId)}
            disabled={loading}
            className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Reload Record"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <div className="inline-flex items-center gap-2 text-xs">
            <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            Loading officer profile...
          </div>
        </div>
      ) : !formData.id ? (
        <div className="p-12 text-center border rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400">
          Select an officer from the dropdown above to begin editing.
        </div>
      ) : (
        /* Main Full-Page Update Form (NO POPUP MODAL) */
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Personal & Institutional Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Card 1: Core Personal Information */}
              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <FiUser className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h2 className="text-sm font-semibold text-slate-800 dark:text-white uppercase tracking-wider">
                    1. Personal Details
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* NID */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      National ID (NID)
                    </label>
                    <input
                      type="text"
                      name="nid_number"
                      value={formData.nid_number}
                      onChange={handleChange}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* DOB */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      name="date_of_birth"
                      value={formData.date_of_birth}
                      onChange={handleChange}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
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

              {/* Card 2: Department & Designation */}
              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <FiBriefcase className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h2 className="text-sm font-semibold text-slate-800 dark:text-white uppercase tracking-wider">
                    2. Department Placement & Designation
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Department */}
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
                      required
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
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
                      Present Address
                    </label>
                    <textarea
                      rows={2}
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none"
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
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Officer Biography & Responsibilities
                    </label>
                    <textarea
                      rows={3}
                      name="bio"
                      value={formData.bio}
                      onChange={handleChange}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Direct Payroll Scale & Photo & Account */}
            <div className="space-y-6">
              {/* Card 4: DIRECT PAYROLL SCALE ASSIGNMENT (NO SEPARATE SALARY STEP) */}
              <div className="p-5 rounded-xl border-2 border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/20 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-indigo-100 dark:border-indigo-950">
                  <div className="flex items-center gap-2">
                    <FiDollarSign className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                        Direct Payroll Scale
                      </h2>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Synchronized with officer salary automatically
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    Direct Sync
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Select Payroll Scale
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
                </div>

                {/* Live Payroll Breakdown */}
                {selectedPayroll ? (
                  <div className="p-3.5 rounded-lg border border-indigo-200/80 dark:border-indigo-800/80 bg-white/90 dark:bg-slate-800/90 space-y-2.5 text-xs animate-in fade-in duration-200">
                    <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700 pb-2">
                      <span>Grade Code:</span>
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
                    No payroll scale selected. Choose a scale above to assign or update.
                  </div>
                )}
              </div>

              {/* Card 5: Profile Photo Replace */}
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
                        alt="Officer"
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
                      className="w-full py-8 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition bg-slate-50/50 dark:bg-slate-800/30"
                    >
                      <FiUpload className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Upload / Replace Photo
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

                  {photoPreview && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium cursor-pointer"
                    >
                      Change Photo
                    </button>
                  )}
                </div>
              </div>

              {/* Card 6: Password Reset & Status */}
              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <FiLock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h2 className="text-sm font-semibold text-slate-800 dark:text-white uppercase tracking-wider">
                    Security & Account Status
                  </h2>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Reset Password (Optional)
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Leave blank to keep current password"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200 block">
                      Account Active Status
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Toggle officer login and access permissions
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
              Back to Officers List
            </Link>

            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md transition disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving Changes...
                </>
              ) : (
                <>
                  <FiCheck className="w-4 h-4" />
                  Save Officer Profile & Payroll
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function OfficerUpdatePage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-slate-400">
          <div className="inline-flex items-center gap-2 text-xs">
            <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            Loading officer editor...
          </div>
        </div>
      }
    >
      <OfficerUpdateContent />
    </Suspense>
  );
}
