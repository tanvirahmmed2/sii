'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';

export default function PayrollsScaleManager({ roleType = 'teacher', title, subtitle }) {
  const isTeacher = roleType === 'teacher';
  const apiEndpoint = isTeacher ? '/api/staff/panel/teacher-payrolls' : '/api/staff/panel/officer-payrolls';

  const defaultTitle = isTeacher ? 'Teacher Payroll Scales' : 'Officer Payroll Scales';
  const defaultSubtitle = isTeacher
    ? 'Standard salary grade scales and allowance configurations for academic staff.'
    : 'Standard salary grade scales and allowance configurations for administrative officers.';

  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: string }

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    grade_code: '',
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
  });

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

  const openCreateModal = () => {
    setEditingPayroll(null);
    setFormData({
      title: '',
      grade_code: '',
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
    });
    setModalOpen(true);
  };

  const openEditModal = (p) => {
    setEditingPayroll(p);
    setFormData({
      title: p.title || '',
      grade_code: p.grade_code || '',
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
    setModalOpen(true);
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
        setModalOpen(false);
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

  const handleDelete = async (id, scaleTitle) => {
    if (!window.confirm(`Are you sure you want to delete scale "${scaleTitle}"?`)) return;
    try {
      const res = await fetch(`${apiEndpoint}?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: data.message });
        fetchPayrolls();
      } else {
        setFeedback({ type: 'error', message: data.message || 'Failed to delete scale.' });
      }
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Network error deleting scale.' });
    }
  };

  // Metrics
  const metrics = useMemo(() => {
    const total = payrolls.length;
    const active = payrolls.filter((p) => p.is_active).length;
    const totalAssigned = payrolls.reduce((acc, p) => acc + (parseInt(p.assigned_teachers_count || p.assigned_officers_count || 0, 10)), 0);
    const avgNet = total > 0 ? (payrolls.reduce((acc, p) => acc + parseFloat(p.net_salary || 0), 0) / total) : 0;
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
        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 rounded transition-colors shadow-2xs"
        >
          + New Payroll Scale
        </button>
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
            <button onClick={() => setFeedback(null)} className="font-semibold text-slate-500 hover:text-slate-700 ml-2">
              ×
            </button>
          </div>
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Total Scales</p>
          <p className="text-lg font-semibold font-mono text-slate-900 dark:text-white mt-1">{metrics.total}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Active Scales</p>
          <p className="text-lg font-semibold font-mono text-emerald-600 dark:text-emerald-400 mt-1">{metrics.active}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Assigned Staff</p>
          <p className="text-lg font-semibold font-mono text-blue-600 dark:text-blue-400 mt-1">{metrics.totalAssigned}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Average Net</p>
          <p className="text-lg font-semibold font-mono text-slate-900 dark:text-white mt-1">
            ৳{metrics.avgNet.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-2.5">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by scale title or grade code..."
          className="w-full max-w-sm text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 focus:outline-none focus:border-slate-400 text-slate-900 dark:text-white"
        />
        <span className="text-[11px] text-slate-500 font-mono whitespace-nowrap">
          {payrolls.length} record{payrolls.length === 1 ? '' : 's'}
        </span>
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
                <td colSpan={10} className="py-8 text-center text-slate-400">
                  Loading payroll scales...
                </td>
              </tr>
            ) : payrolls.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-slate-400">
                  No payroll scales found. Click "+ New Payroll Scale" to create one.
                </td>
              </tr>
            ) : (
              payrolls.map((p) => {
                const totalAllowances =
                  (parseFloat(p.house_rent) || 0) +
                  (parseFloat(p.medical_allowance) || 0) +
                  (parseFloat(p.transport_allowance) || 0) +
                  (parseFloat(p.other_allowance) || 0);
                const assignedCount = parseInt(p.assigned_teachers_count || p.assigned_officers_count || 0, 10);

                return (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                      {p.title}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">
                      {p.grade_code || '—'}
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
                    <td className="py-2.5 px-3 font-mono text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      ৳{Number(p.net_salary).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {assignedCount}
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
                    <td className="py-2.5 px-3 text-right space-x-1.5">
                      <button
                        onClick={() => openEditModal(p)}
                        className="px-2 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(p.id, p.title)}
                        className="px-2 py-1 text-[11px] font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {editingPayroll ? `Edit Scale: ${editingPayroll.title}` : `Create New ${isTeacher ? 'Teacher' : 'Officer'} Payroll Scale`}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 space-y-4 text-xs">
              {/* Primary Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Scale Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Senior Lecturer Scale-1"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 focus:outline-none focus:border-slate-400 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Grade Code
                  </label>
                  <input
                    type="text"
                    value={formData.grade_code}
                    onChange={(e) => setFormData({ ...formData, grade_code: e.target.value })}
                    placeholder="e.g. T-GR01"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 focus:outline-none focus:border-slate-400 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Basic Salary */}
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Basic Salary (৳) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.basic_salary}
                  onChange={(e) => setFormData({ ...formData, basic_salary: e.target.value })}
                  placeholder="0.00"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 focus:outline-none focus:border-slate-400 text-slate-900 dark:text-white font-mono"
                />
              </div>

              {/* Allowances Section */}
              <div className="border border-slate-200 dark:border-slate-800 rounded p-3 bg-slate-50/50 dark:bg-slate-800/30 space-y-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Allowances</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">House Rent</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.house_rent}
                      onChange={(e) => setFormData({ ...formData, house_rent: e.target.value })}
                      placeholder="0.00"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Medical</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.medical_allowance}
                      onChange={(e) => setFormData({ ...formData, medical_allowance: e.target.value })}
                      placeholder="0.00"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Transport</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.transport_allowance}
                      onChange={(e) => setFormData({ ...formData, transport_allowance: e.target.value })}
                      placeholder="0.00"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Other Allowance</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.other_allowance}
                      onChange={(e) => setFormData({ ...formData, other_allowance: e.target.value })}
                      placeholder="0.00"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Deductions Section */}
              <div className="border border-slate-200 dark:border-slate-800 rounded p-3 bg-slate-50/50 dark:bg-slate-800/30 space-y-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Deductions</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Provident Fund (PF)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.provident_fund}
                      onChange={(e) => setFormData({ ...formData, provident_fund: e.target.value })}
                      placeholder="0.00"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Tax Deduction</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.tax_deduction}
                      onChange={(e) => setFormData({ ...formData, tax_deduction: e.target.value })}
                      placeholder="0.00"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Other Deductions</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.other_deductions}
                      onChange={(e) => setFormData({ ...formData, other_deductions: e.target.value })}
                      placeholder="0.00"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Live Computation Bar */}
              <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-center font-mono">
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase">Gross Salary</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    ৳{calculatedValues.gross.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-rose-500 uppercase">Total Deduct</span>
                  <span className="font-semibold text-rose-600 dark:text-rose-400">
                    -৳{calculatedValues.deductions.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-emerald-600 uppercase font-semibold">Net Payable</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    ৳{calculatedValues.net.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Notes & Active Status */}
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Notes / Description
                  </label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Optional details regarding eligibility or pay structure..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 focus:outline-none focus:border-slate-400 text-slate-900 dark:text-white"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="scale_is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                  />
                  <label htmlFor="scale_is_active" className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                    Scale is active and available for assignment
                  </label>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 rounded transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingPayroll ? 'Save Changes' : 'Create Scale'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
