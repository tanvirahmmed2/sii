'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
  FiEdit3,
  FiCalendar,
  FiUsers,
  FiDollarSign,
  FiCheckCircle,
  FiAlertCircle,
  FiLayers,
  FiSave,
  FiArrowLeft,
  FiRefreshCw,
  FiExternalLink,
  FiInfo,
  FiEye,
  FiUserCheck,
  FiClock,
  FiFileText
} from 'react-icons/fi';

function CircularUpdateContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const domain = params?.domain || '';
  const apiBase = domain ? `/api/${domain}` : '/api';
  const initialId = searchParams.get('id') || '';

  const [circulars, setCirculars] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedId, setSelectedId] = useState(initialId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCircular, setSelectedCircular] = useState(null);

  // Form State
  const [form, setForm] = useState({
    title: '',
    circular_number: '',
    class_id: '',
    session_id: '',
    start_date: '',
    end_date: '',
    exam_date: '',
    min_age: '',
    max_age: '',
    capacity: 100,
    status: 'open',
    is_published: true,
    fee_title: 'Application Form Fee',
    fee_amount: 500,
    fee_currency: 'BDT',
    late_fee: 0,
    description: '',
  });

  // Populate form with circular data
  const populateForm = useCallback((circ) => {
    setSelectedCircular(circ);
    if (!circ) return;

    setForm({
      title: circ.title || '',
      circular_number: circ.circular_number || '',
      class_id: circ.class_id ? String(circ.class_id) : '',
      session_id: circ.session_id ? String(circ.session_id) : '',
      start_date: circ.start_date ? new Date(circ.start_date).toISOString().split('T')[0] : '',
      end_date: circ.end_date ? new Date(circ.end_date).toISOString().split('T')[0] : '',
      exam_date: circ.exam_date ? new Date(circ.exam_date).toISOString().split('T')[0] : '',
      min_age: circ.min_age !== null && circ.min_age !== undefined ? String(circ.min_age) : '',
      max_age: circ.max_age !== null && circ.max_age !== undefined ? String(circ.max_age) : '',
      capacity: circ.capacity || 100,
      status: circ.status || 'open',
      is_published: circ.is_published !== undefined ? Boolean(circ.is_published) : true,
      fee_title: circ.fee_title || 'Application Form Fee',
      fee_amount: circ.fee_amount !== undefined ? circ.fee_amount : 500,
      fee_currency: circ.fee_currency || 'BDT',
      late_fee: circ.late_fee !== undefined ? circ.late_fee : 0,
      description: circ.description || '',
    });
  }, []);

  // Fetch all circulars & metadata
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/staff/panel/admissions`);
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }
      const data = await res.json();
      if (data.success) {
        const list = data.circulars || [];
        setCirculars(list);
        setClasses(data.classes || []);
        setSessions(data.sessions || []);

        if (list.length > 0) {
          const match = initialId
            ? list.find((c) => String(c.id) === String(initialId))
            : list[0];

          const target = match || list[0];
          setSelectedId(String(target.id));
          populateForm(target);
        }
      } else {
        toast.error(data.error || 'Failed to load admission circulars.');
      }
    } catch (err) {
      console.error('Error loading circulars:', err);
      toast.error('Network error loading admission circulars.');
    } finally {
      setLoading(false);
    }
  }, [apiBase, initialId, populateForm]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle circular selection change
  const handleSelectCircular = (id) => {
    setSelectedId(id);
    const found = circulars.find((c) => String(c.id) === String(id));
    if (found) {
      populateForm(found);
      router.replace(`/staff-panel/admission-circular-update?id=${id}`);
    }
  };

  // Form input change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Submit update
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedId) {
      toast.error('Please select an admission circular to update.');
      return;
    }

    if (!form.title.trim()) {
      toast.error('Circular title is required.');
      return;
    }

    if (!form.start_date || !form.end_date) {
      toast.error('Application start and end dates are required.');
      return;
    }

    if (new Date(form.start_date) > new Date(form.end_date)) {
      toast.error('Start date cannot be after end date.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: parseInt(selectedId, 10),
        title: form.title.trim(),
        circular_number: form.circular_number.trim() || undefined,
        class_id: form.class_id ? parseInt(form.class_id, 10) : null,
        session_id: form.session_id ? parseInt(form.session_id, 10) : null,
        start_date: form.start_date,
        end_date: form.end_date,
        exam_date: form.exam_date || null,
        min_age: form.min_age ? parseInt(form.min_age, 10) : null,
        max_age: form.max_age ? parseInt(form.max_age, 10) : null,
        capacity: form.capacity ? parseInt(form.capacity, 10) : 100,
        status: form.status,
        is_published: Boolean(form.is_published),
        fee_title: form.fee_title.trim() || 'Application Form Fee',
        fee_amount: parseFloat(form.fee_amount) || 0,
        fee_currency: form.fee_currency || 'BDT',
        late_fee: parseFloat(form.late_fee) || 0,
        description: form.description ? form.description.trim() : null,
      };

      const res = await fetch(`${apiBase}/staff/panel/admissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'Admission circular updated successfully!');
        // Refresh circulars in state
        setCirculars((prev) =>
          prev.map((c) => (String(c.id) === String(selectedId) ? { ...c, ...payload } : c))
        );
        setSelectedCircular((prev) => ({ ...prev, ...payload }));
      } else {
        toast.error(data.error || 'Failed to update circular.');
      }
    } catch (err) {
      console.error('Save error:', err);
      toast.error('An error occurred while saving circular updates.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full p-12 text-center space-y-3">
        <FiRefreshCw className="w-6 h-6 animate-spin text-sky-600 dark:text-sky-400 mx-auto" />
        <p className="text-xs text-slate-500 dark:text-slate-400">Loading admission circular information...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5">
      {/* Top Action Bar & Circular Selector */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1 max-w-lg space-y-1">
          <label className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
            Select Circular to Update
          </label>
          <select
            value={selectedId}
            onChange={(e) => handleSelectCircular(e.target.value)}
            className="w-full text-xs font-medium px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-sky-500 cursor-pointer"
          >
            {circulars.length === 0 ? (
              <option value="">No circulars found</option>
            ) : (
              circulars.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.circular_number || `ID: ${c.id}`}) — {c.status?.toUpperCase()}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/staff-panel/admission-circulars"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <FiArrowLeft className="w-3.5 h-3.5" />
            Circulars List
          </Link>

          {selectedId && (
            <>
              <Link
                href={`/staff-panel/admission-applicants?circular_id=${selectedId}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 transition"
              >
                <FiUsers className="w-3.5 h-3.5" />
                Applicants ({selectedCircular?.total_applicants || 0})
              </Link>
              <Link
                href="/staff-panel/admission-result"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition"
              >
                <FiUserCheck className="w-3.5 h-3.5" />
                Merit Results
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Selected Circular KPI Banner */}
      {selectedCircular && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-400">Total Applicants</span>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
              {selectedCircular.total_applicants || 0}
            </div>
            <span className="text-[10px] text-slate-500">Capacity: {selectedCircular.capacity || 100} seats</span>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-amber-500">Pending Review</span>
            <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
              {selectedCircular.pending_applicants || 0}
            </div>
            <span className="text-[10px] text-slate-500">Awaiting evaluation</span>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-emerald-500">Selected / Merit</span>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {selectedCircular.selected_applicants || 0}
            </div>
            <span className="text-[10px] text-slate-500">Eligible for admission</span>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-sky-500">Enrolled Students</span>
            <div className="text-xl font-bold text-sky-600 dark:text-sky-400 mt-0.5">
              {selectedCircular.enrolled_applicants || 0}
            </div>
            <span className="text-[10px] text-slate-500">Completed admission</span>
          </div>
        </div>
      )}

      {/* Main Edit Form Workstation */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 shadow-2xs space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FiEdit3 className="text-sky-600 dark:text-sky-400" />
              Circular Configuration &amp; Criteria
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Update intake circular details, application deadline, fees, and age requirements.
            </p>
          </div>

          <button
            type="submit"
            disabled={saving || !selectedId}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white transition shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            <FiSave className={`w-3.5 h-3.5 ${saving ? 'animate-spin' : ''}`} />
            {saving ? 'Saving Changes...' : 'Save Circular Updates'}
          </button>
        </div>

        {/* Section 1: Core Details */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">1. Core Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Circular Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="e.g., Grade 6 General Admission 2026-2027"
                required
                className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Circular Code / Number
              </label>
              <input
                type="text"
                name="circular_number"
                value={form.circular_number}
                onChange={handleChange}
                placeholder="e.g., CIR-2026-001"
                className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Target Class / Grade
              </label>
              <select
                name="class_id"
                value={form.class_id}
                onChange={handleChange}
                className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-sky-500 cursor-pointer"
              >
                <option value="">General / All Classes</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Academic Session
              </label>
              <select
                name="session_id"
                value={form.session_id}
                onChange={handleChange}
                className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-sky-500 cursor-pointer"
              >
                <option value="">Current Session</option>
                {sessions.map((sess) => (
                  <option key={sess.id} value={sess.id}>
                    {sess.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Intake Capacity (Seats)
              </label>
              <input
                type="number"
                name="capacity"
                value={form.capacity}
                onChange={handleChange}
                min="1"
                placeholder="100"
                className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Timeline & Dates */}
        <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">2. Timeline &amp; Dates</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Application Start Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                name="start_date"
                value={form.start_date}
                onChange={handleChange}
                required
                className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Application End Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                name="end_date"
                value={form.end_date}
                onChange={handleChange}
                required
                className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Admission Exam / Viva Date (Optional)
              </label>
              <input
                type="date"
                name="exam_date"
                value={form.exam_date}
                onChange={handleChange}
                className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Eligibility & Age Limits */}
        <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">3. Age Eligibility Criteria</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Minimum Age (Years)
              </label>
              <input
                type="number"
                name="min_age"
                value={form.min_age}
                onChange={handleChange}
                min="3"
                max="30"
                placeholder="e.g., 10"
                className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-sky-500"
              />
              <p className="text-[10px] text-slate-400">Leave blank if no minimum age restriction.</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Maximum Age (Years)
              </label>
              <input
                type="number"
                name="max_age"
                value={form.max_age}
                onChange={handleChange}
                min="3"
                max="35"
                placeholder="e.g., 14"
                className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-sky-500"
              />
              <p className="text-[10px] text-slate-400">Leave blank if no maximum age ceiling.</p>
            </div>
          </div>
        </div>

        {/* Section 4: Application Fee & Gateway Routing */}
        <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">4. Application Fee Structure</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Fee Title
              </label>
              <input
                type="text"
                name="fee_title"
                value={form.fee_title}
                onChange={handleChange}
                placeholder="Application Form Fee"
                className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Fee Amount <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                name="fee_amount"
                value={form.fee_amount}
                onChange={handleChange}
                min="0"
                step="0.01"
                placeholder="500.00"
                required
                className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-sky-500 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Currency
              </label>
              <select
                name="fee_currency"
                value={form.fee_currency}
                onChange={handleChange}
                className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-sky-500 cursor-pointer font-mono"
              >
                <option value="BDT">BDT (৳)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Late Submission Fee
              </label>
              <input
                type="number"
                name="late_fee"
                value={form.late_fee}
                onChange={handleChange}
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-sky-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 5: Status & Visibility */}
        <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">5. Status &amp; Visibility</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Intake Status
              </label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-sky-500 cursor-pointer"
              >
                <option value="open">Open (Accepting Applications)</option>
                <option value="closed">Closed (Intake Ended)</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className="flex items-center space-x-2 pt-6">
              <input
                type="checkbox"
                id="is_published"
                name="is_published"
                checked={form.is_published}
                onChange={handleChange}
                className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300 dark:border-slate-700 cursor-pointer"
              />
              <label htmlFor="is_published" className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                Publish on Public Website (Visible to applicants)
              </label>
            </div>
          </div>
        </div>

        {/* Section 6: Instructions & Guidelines */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">6. Guidelines &amp; Instructions</h3>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={5}
            placeholder="Enter instructions for candidates, required documents, photo specifications, exam syllabus, etc..."
            className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-sky-500 font-sans"
          />
        </div>

        {/* Bottom Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Link
            href="/staff-panel/admission-circulars"
            className="px-4 py-2 rounded text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={saving || !selectedId}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white transition shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <FiSave className={`w-3.5 h-3.5 ${saving ? 'animate-spin' : ''}`} />
            {saving ? 'Updating Circular...' : 'Save Circular Updates'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AdmissionCircularUpdatePage() {
  return (
    <Suspense
      fallback={
        <div className="w-full p-12 text-center text-xs text-slate-500 space-y-2">
          <FiRefreshCw className="w-5 h-5 animate-spin mx-auto text-sky-600" />
          <p>Loading circular editor workstation...</p>
        </div>
      }
    >
      <CircularUpdateContent />
    </Suspense>
  );
}
