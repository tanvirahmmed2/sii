'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';

export default function PayrollsScaleManager({ roleType = 'teacher', title, subtitle }) {
  const isTeacher = roleType === 'teacher';
  const params = useParams();
  const domain = params?.domain || '';

  const apiEndpoint = domain
    ? `/api/${domain}/staff/panel/${isTeacher ? 'teacher-payrolls' : 'officer-payrolls'}`
    : `/api/staff/panel/${isTeacher ? 'teacher-payrolls' : 'officer-payrolls'}`;

  const defaultTitle = isTeacher ? 'Teacher Payroll Scales' : 'Officer Payroll Scales';
  const defaultSubtitle = isTeacher
    ? 'Standard salary grade scales and allowance configurations for academic staff.'
    : 'Standard salary grade scales and allowance configurations for administrative officers.';

  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: string }

  // In-page form state (NO POPUP MODAL)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState(null);
  const [saving, setSaving] = useState(false);
  const formRef = useRef(null);

  // Inline delete confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Form state
  const initialFormData = {
    title: '',
    basic_salary: '',
    house_rent: '',
    medical_allowance: '',
    transport_allowance: '',
    other_allowance: '',
    provident_fund: '',
    tax_deduction: '',
    other_deductions: '',
    notes: '',
    is_active: true,
  };

  const [formData, setFormData] = useState(initialFormData);

  // Fetch payrolls
  const fetchPayrolls = useCallback(async () => {
    try {
      setLoading(true);
      const url = `${apiEndpoint}${searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setPayrolls(data.payrolls || []);
      } else {
        setFeedback({ type: 'error', message: data.message || 'Failed to load payroll scales.' });
      }
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Network error loading payroll scales.' });
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint, searchTerm]);

  useEffect(() => {
    fetchPayrolls();
  }, [fetchPayrolls]);

  // Calculations
  const calculatedValues = useMemo(() => {
    const basic = Math.max(0, parseFloat(formData.basic_salary) || 0);
    const houseRent = Math.max(0, parseFloat(formData.house_rent) || 0);
    const medical = Math.max(0, parseFloat(formData.medical_allowance) || 0);
    const transport = Math.max(0, parseFloat(formData.transport_allowance) || 0);
    const otherAllow = Math.max(0, parseFloat(formData.other_allowance) || 0);

    const pf = Math.max(0, parseFloat(formData.provident_fund) || 0);
    const tax = Math.max(0, parseFloat(formData.tax_deduction) || 0);
    const otherDeduct = Math.max(0, parseFloat(formData.other_deductions) || 0);

    const gross = basic + houseRent + medical + transport + otherAllow;
    const deductions = pf + tax + otherDeduct;
    const net = Math.max(0, gross - deductions);

    return { basic, gross, deductions, net };
  }, [formData]);

  // Preview generated grade code
  const previewGradeCode = useMemo(() => {
    const raw = formData.title?.trim() || '';
    if (!raw) return 'AUTO-SLUG';
    return (
      raw
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .toUpperCase()
        .slice(0, 50) || 'AUTO-SLUG'
    );
  }, [formData.title]);

  // In-page form triggers
  const openCreateForm = () => {
    setEditingPayroll(null);
    setFormData(initialFormData);
    setIsFormOpen(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const openEditForm = (p) => {
    setEditingPayroll(p);
    setFormData({
      title: p.title || '',
      basic_salary: p.basic_salary || '',
      house_rent: p.house_rent || '',
      medical_allowance: p.medical_allowance || '',
      transport_allowance: p.transport_allowance || '',
      other_allowance: p.other_allowance || '',
      provident_fund: p.provident_fund || '',
      tax_deduction: p.tax_deduction || '',
      other_deductions: p.other_deductions || '',
      notes: p.notes || '',
      is_active: Boolean(p.is_active),
    });
    setIsFormOpen(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const cancelForm = () => {
    setIsFormOpen(false);
    setEditingPayroll(null);
    setFormData(initialFormData);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const payload = {
        ...formData,
        id: editingPayroll ? editingPayroll.id : undefined,
      };

      const res = await fetch(apiEndpoint, {
        method: editingPayroll ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: data.message });
        setIsFormOpen(false);
        setEditingPayroll(null);
        setFormData(initialFormData);
        fetchPayrolls();
      } else {
        setFeedback({ type: 'error', message: data.message || 'Operation failed.' });
      }
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Network error occurred while saving.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      setDeletingId(id);
      const res = await fetch(`${apiEndpoint}?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: data.message });
        setDeleteConfirmId(null);
        fetchPayrolls();
      } else {
        setFeedback({ type: 'error', message: data.message || 'Failed to delete scale.' });
      }
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Network error deleting scale.' });
    } finally {
      setDeletingId(null);
    }
  };

  // Metrics
  const metrics = useMemo(() => {
    const total = payrolls.length;
    const active = payrolls.filter((p) => p.is_active).length;
    const totalAssigned = payrolls.reduce(
      (acc, p) => acc + parseInt(p.assigned_teachers_count || p.assigned_officers_count || 0, 10),
      0
    );
    const avgNet =
      total > 0
        ? payrolls.reduce((acc, p) => acc + parseFloat(p.net_salary || 0), 0) / total
        : 0;
    return { total, active, totalAssigned, avgNet };
  }, [payrolls]);

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-white">
            {title || defaultTitle}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {subtitle || defaultSubtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isFormOpen ? (
            <button
              onClick={openCreateForm}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 rounded transition-colors shadow-2xs cursor-pointer"
            >
              <span>＋</span>
              <span>New Payroll Scale</span>
            </button>
          ) : (
            <button
              onClick={cancelForm}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition cursor-pointer"
            >
              <span>✕</span>
              <span>Close Form</span>
            </button>
          )}
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-3 text-xs rounded border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex justify-between items-center">
            <span>{feedback.message}</span>
            <button
              onClick={() => setFeedback(null)}
              className="font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Total Scales</p>
          <p className="text-lg font-semibold font-mono text-slate-900 dark:text-white mt-1">
            {metrics.total}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Active Scales</p>
          <p className="text-lg font-semibold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {metrics.active}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
            {isTeacher ? 'Assigned Teachers' : 'Assigned Staff'}
          </p>
          <p className="text-lg font-semibold font-mono text-blue-600 dark:text-blue-400 mt-1">
            {metrics.totalAssigned}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Average Net Pay</p>
          <p className="text-lg font-semibold font-mono text-slate-900 dark:text-white mt-1">
            ৳{metrics.avgNet.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {/* IN-PAGE WORKSTATION FORM (NO POPUP MODAL) */}
      {isFormOpen && (
        <div
          ref={formRef}
          className="bg-white dark:bg-slate-900 border-2 border-slate-900/10 dark:border-slate-700 rounded-lg p-5 shadow-xs space-y-4 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{editingPayroll ? '✏️' : '📋'}</span>
                <span>
                  {editingPayroll
                    ? `Edit Scale: ${editingPayroll.title}`
                    : `Create New ${isTeacher ? 'Teacher' : 'Officer'} Payroll Scale`}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Configure grade code, base salary, institutional allowances, and statutory deductions.
              </p>
            </div>
            <button
              type="button"
              onClick={cancelForm}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              Cancel ✕
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-4 text-xs">
            {/* Primary Info */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Scale Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Senior Lecturer Grade 9"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400 text-slate-900 dark:text-white text-xs"
              />
              <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                <span>Grade Code (Auto-generated via slugify):</span>
                <span className="font-mono px-1.5 py-0.2 rounded font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                  {previewGradeCode}
                </span>
              </div>
            </div>

            {/* Basic Salary */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded border border-slate-200 dark:border-slate-700/80">
              <label className="block text-[11px] font-bold text-slate-900 dark:text-white mb-1">
                Basic Monthly Salary (৳) *
              </label>
              <div className="relative max-w-sm">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">৳</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.basic_salary}
                  onChange={(e) => setFormData({ ...formData, basic_salary: e.target.value })}
                  placeholder="0.00"
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded pl-7 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400 text-slate-900 dark:text-white font-mono font-bold text-sm"
                />
              </div>
            </div>

            {/* Allowances Section */}
            <div className="border border-slate-200 dark:border-slate-800 rounded p-3.5 bg-slate-50/40 dark:bg-slate-800/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Allowances
                </p>
                <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400 font-semibold">
                  +৳{(calculatedValues.gross - calculatedValues.basic).toLocaleString()} Total
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1">House Rent</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.house_rent}
                    onChange={(e) => setFormData({ ...formData, house_rent: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1">Medical</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.medical_allowance}
                    onChange={(e) => setFormData({ ...formData, medical_allowance: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1">Transport</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.transport_allowance}
                    onChange={(e) => setFormData({ ...formData, transport_allowance: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1">Other Allowance</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.other_allowance}
                    onChange={(e) => setFormData({ ...formData, other_allowance: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Deductions Section */}
            <div className="border border-slate-200 dark:border-slate-800 rounded p-3.5 bg-slate-50/40 dark:bg-slate-800/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                  Deductions
                </p>
                <span className="text-[11px] font-mono text-rose-600 dark:text-rose-400 font-semibold">
                  -৳{calculatedValues.deductions.toLocaleString()} Total
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                    Provident Fund (PF)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.provident_fund}
                    onChange={(e) => setFormData({ ...formData, provident_fund: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1">Tax Deduction</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.tax_deduction}
                    onChange={(e) => setFormData({ ...formData, tax_deduction: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1">Other Deductions</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.other_deductions}
                    onChange={(e) => setFormData({ ...formData, other_deductions: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Live Computation Bar */}
            <div className="grid grid-cols-3 gap-3 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-center font-mono">
              <div className="p-1">
                <span className="block text-[10px] text-slate-500 uppercase font-semibold">Gross Salary</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  ৳{calculatedValues.gross.toLocaleString()}
                </span>
              </div>
              <div className="p-1 border-x border-slate-200 dark:border-slate-700">
                <span className="block text-[10px] text-rose-500 uppercase font-semibold">Total Deductions</span>
                <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                  -৳{calculatedValues.deductions.toLocaleString()}
                </span>
              </div>
              <div className="p-1">
                <span className="block text-[10px] text-emerald-600 uppercase font-bold">Net Payable</span>
                <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                  ৳{calculatedValues.net.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Notes & Active Status */}
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes / Description
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional details regarding qualifications, grade step, or eligibility..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400 text-slate-900 dark:text-white text-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="scale_is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400 cursor-pointer"
                />
                <label
                  htmlFor="scale_is_active"
                  className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Scale is active and available for {isTeacher ? 'teacher' : 'officer'} assignments
                </label>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={cancelForm}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded border border-slate-300 dark:border-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 rounded transition-colors disabled:opacity-50 min-w-[110px] flex items-center justify-center cursor-pointer shadow-xs"
              >
                {saving ? (
                  <div className="loader loader-sm loader-white" />
                ) : editingPayroll ? (
                  'Update Scale'
                ) : (
                  'Create Scale'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-2.5">
        <div className="relative w-full max-w-sm">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by scale title or grade code..."
            className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 focus:outline-none focus:border-slate-400 text-slate-900 dark:text-white"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isFormOpen && (
            <button
              onClick={openCreateForm}
              className="px-2.5 py-1 text-xs font-semibold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded cursor-pointer"
            >
              ＋ Add Scale
            </button>
          )}
          <span className="text-[11px] text-slate-500 font-mono whitespace-nowrap">
            {payrolls.length} scale{payrolls.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* Table of Scales */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded overflow-x-auto shadow-2xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold text-[11px]">
              <th className="py-2.5 px-3">Scale Title</th>
              <th className="py-2.5 px-3">Grade Code</th>
              <th className="py-2.5 px-3 font-mono text-right">Basic</th>
              <th className="py-2.5 px-3 font-mono text-right">Allowances</th>
              <th className="py-2.5 px-3 font-mono text-right">Gross</th>
              <th className="py-2.5 px-3 font-mono text-right">Deductions</th>
              <th className="py-2.5 px-3 font-mono text-right">Net Payable</th>
              <th className="py-2.5 px-3 text-center">Assigned</th>
              <th className="py-2.5 px-3 text-center">Status</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
            {loading ? (
              <tr>
                <td colSpan={10} className="py-12 text-center">
                  <div className="flex justify-center items-center py-2">
                    <div className="loader loader-sm" />
                  </div>
                </td>
              </tr>
            ) : payrolls.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center space-y-2">
                  <p className="text-slate-400">
                    No payroll scales found matching your criteria.
                  </p>
                  <button
                    onClick={openCreateForm}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Click here to create your first payroll scale
                  </button>
                </td>
              </tr>
            ) : (
              payrolls.map((p) => {
                const totalAllowances =
                  (parseFloat(p.house_rent) || 0) +
                  (parseFloat(p.medical_allowance) || 0) +
                  (parseFloat(p.transport_allowance) || 0) +
                  (parseFloat(p.other_allowance) || 0);
                const assignedCount = parseInt(
                  p.assigned_teachers_count || p.assigned_officers_count || 0,
                  10
                );
                const isConfirmingDelete = deleteConfirmId === p.id;

                return (
                  <tr
                    key={p.id}
                    className={`transition-colors ${
                      editingPayroll?.id === p.id
                        ? 'bg-blue-50/50 dark:bg-blue-950/20'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                      <div>{p.title}</div>
                      {p.notes && (
                        <div className="text-[10px] text-slate-400 font-normal truncate max-w-xs" title={p.notes}>
                          {p.notes}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-mono text-[11px] px-1.5 py-0.5 rounded font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                        {p.grade_code || '—'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-right">
                      ৳{Number(p.basic_salary).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-right text-slate-600 dark:text-slate-400">
                      ৳{totalAllowances.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-right font-medium text-slate-900 dark:text-white">
                      ৳{Number(p.gross_salary).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-right text-rose-600 dark:text-rose-400">
                      -৳{Number(p.total_deductions).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-right font-bold text-emerald-600 dark:text-emerald-400">
                      ৳{Number(p.net_salary).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {assignedCount} {isTeacher ? 'teachers' : 'officers'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                          p.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                            : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                        }`}
                      >
                        {p.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {isConfirmingDelete ? (
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-[10px] text-rose-600 font-semibold mr-1">Confirm?</span>
                          <button
                            onClick={() => handleDelete(p.id)}
                            disabled={deletingId === p.id}
                            className="px-2 py-0.5 text-[10px] font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded transition cursor-pointer disabled:opacity-50"
                          >
                            {deletingId === p.id ? 'Deleting...' : 'Yes, Delete'}
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-1.5 py-0.5 text-[10px] text-slate-500 hover:text-slate-700 rounded border border-slate-300 dark:border-slate-700 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditForm(p)}
                            className="px-2 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(p.id)}
                            className="px-2 py-1 text-[11px] font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
