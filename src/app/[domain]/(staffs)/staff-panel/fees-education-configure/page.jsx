'use client';

import React, { useState, useEffect } from 'react';
import {
  FiDollarSign,
  FiPlus,
  FiFilter,
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiCheckCircle,
  FiAlertCircle,
  FiRefreshCw,
  FiX,
  FiLayers,
  FiCalendar,
  FiClock,
  FiCheck,
} from 'react-icons/fi';

export default function FeesEducationConfigurePage() {
  const [fees, setFees] = useState([]);
  const [meta, setMeta] = useState({ classes: [], sessions: [], feeTypes: [], frequencies: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFee, setEditingFee] = useState(null);
  const [formData, setFormData] = useState({
    class_id: '',
    session_id: '',
    fee_title: '',
    fee_type: 'tuition',
    frequency: 'monthly',
    amount: '',
    late_fee: '0',
    due_day_of_month: '10',
    description: '',
    status: 'active',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [metaRes, feesRes] = await Promise.all([
        fetch('/api/fees/education/meta'),
        fetch('/api/fees/education'),
      ]);

      if (metaRes.ok) {
        const metaJson = await metaRes.json();
        if (metaJson.success) {
          setMeta({
            classes: metaJson.classes || [],
            sessions: metaJson.sessions || [],
            feeTypes: metaJson.feeTypes || [],
            frequencies: metaJson.frequencies || [],
          });
        }
      }

      if (feesRes.ok) {
        const feesJson = await feesRes.json();
        if (feesJson.success) {
          setFees(feesJson.data || []);
        }
      }
    } catch (err) {
      console.error('Error loading fee configuration data:', err);
      showFeedback('error', 'Network error loading fee configuration data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleOpenModal = (fee = null) => {
    if (fee) {
      setEditingFee(fee);
      setFormData({
        class_id: fee.class_id || '',
        session_id: fee.session_id || '',
        fee_title: fee.fee_title || '',
        fee_type: fee.fee_type || 'tuition',
        frequency: fee.frequency || 'monthly',
        amount: fee.amount || '',
        late_fee: fee.late_fee || '0',
        due_day_of_month: fee.due_day_of_month || '10',
        description: fee.description || '',
        status: fee.status || 'active',
      });
    } else {
      setEditingFee(null);
      setFormData({
        class_id: meta.classes[0]?.id || '',
        session_id: meta.sessions[0]?.id || '',
        fee_title: '',
        fee_type: 'tuition',
        frequency: 'monthly',
        amount: '',
        late_fee: '0',
        due_day_of_month: '10',
        description: '',
        status: 'active',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingFee(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.class_id) {
      showFeedback('error', 'Please select a class.');
      return;
    }
    if (!formData.fee_title.trim()) {
      showFeedback('error', 'Please enter a fee title.');
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) < 0) {
      showFeedback('error', 'Please enter a valid fee amount.');
      return;
    }

    setSaving(true);
    try {
      const url = '/api/fees/education';
      const method = editingFee ? 'PUT' : 'POST';
      const payload = editingFee ? { ...formData, id: editingFee.id } : formData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resJson = await res.json();
      if (res.ok && resJson.success) {
        showFeedback('success', resJson.message || 'Saved successfully.');
        handleCloseModal();
        loadData();
      } else {
        showFeedback('error', resJson.error || 'Failed to save fee structure.');
      }
    } catch (err) {
      console.error('Error saving fee:', err);
      showFeedback('error', 'Network error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this fee configuration?')) return;
    try {
      const res = await fetch(`/api/fees/education?id=${id}`, { method: 'DELETE' });
      const resJson = await res.json();
      if (res.ok && resJson.success) {
        showFeedback('success', resJson.message || 'Fee configuration removed.');
        loadData();
      } else {
        showFeedback('error', resJson.error || 'Failed to delete.');
      }
    } catch (err) {
      showFeedback('error', 'Network error deleting fee structure.');
    }
  };

  const handleToggleStatus = async (fee) => {
    const nextStatus = fee.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await fetch('/api/fees/education', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: fee.id, status: nextStatus }),
      });
      const resJson = await res.json();
      if (res.ok && resJson.success) {
        showFeedback('success', `Status updated to ${nextStatus}.`);
        loadData();
      } else {
        showFeedback('error', resJson.error || 'Failed to update status.');
      }
    } catch (err) {
      showFeedback('error', 'Network error toggling status.');
    }
  };

  // Filtered List
  const filteredFees = fees.filter((f) => {
    const matchSearch =
      !searchTerm ||
      f.fee_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.class_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.fee_type?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchClass = selectedClass === 'all' || String(f.class_id) === String(selectedClass);
    const matchStatus = selectedStatus === 'all' || f.status === selectedStatus;
    return matchSearch && matchClass && matchStatus;
  });

  // KPI calculations
  const totalConfigs = fees.length;
  const activeConfigs = fees.filter((f) => f.status === 'active').length;
  const totalClassesConfigured = new Set(fees.map((f) => f.class_id)).size;
  const avgAmount =
    totalConfigs > 0 ? fees.reduce((sum, f) => sum + parseFloat(f.amount || 0), 0) / totalConfigs : 0;

  return (
    <div className="w-full space-y-6 max-w-7xl mx-auto pb-10">
      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-sm shadow-xs transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <FiCheckCircle className="text-emerald-600 text-lg" /> : <FiAlertCircle className="text-rose-600 text-lg" />}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="cursor-pointer opacity-70 hover:opacity-100">
            <FiX />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
            <FiDollarSign /> Academic Financial Configuration
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Education Fees Configuration
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Configure standard monthly tuition fees, admission charges, session fees, and late fine rules per academic class.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer"
          >
            <FiPlus className="text-base" /> Configure New Fee
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Fee Tariffs</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white font-mono">{totalConfigs}</span>
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-full">
              Structures
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Tariffs</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">{activeConfigs}</span>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
              Enforced
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Covered Classes</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white font-mono">{totalClassesConfigured}</span>
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full">
              Classes
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Average Fee</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white font-mono">৳{avgAmount.toFixed(0)}</span>
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
              Per Rule
            </span>
          </div>
        </div>
      </div>

      {/* Main Workstation */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
        {/* Controls Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by fee title, class, or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs sm:text-sm pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <option value="all">All Classes</option>
              {meta.classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.class_name}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <button
              onClick={loadData}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              title="Refresh"
            >
              <FiRefreshCw className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Table Area */}
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-xs text-slate-400 font-medium">Loading configured fee structures...</p>
          </div>
        ) : filteredFees.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            <FiLayers className="text-3xl text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No education fee configurations found</p>
            <p className="text-xs text-slate-400 mt-0.5">Click "Configure New Fee" above to establish fee tariffs for your classes.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Fee Title & Type</th>
                  <th className="py-3 px-4">Target Class</th>
                  <th className="py-3 px-4">Frequency</th>
                  <th className="py-3 px-4 text-right">Standard Amount</th>
                  <th className="py-3 px-4 text-right">Late Fine</th>
                  <th className="py-3 px-4 text-center">Due Day</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                {filteredFees.map((fee) => (
                  <tr key={fee.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <span>{fee.fee_title}</span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {fee.fee_type}
                        </span>
                      </div>
                      {fee.description && (
                        <p className="text-xs text-slate-400 font-normal mt-0.5 line-clamp-1">{fee.description}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50">
                        {fee.class_name}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-600 dark:text-slate-300 capitalize">
                      {fee.frequency}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white text-right font-mono">
                      ৳{parseFloat(fee.amount).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-rose-600 dark:text-rose-400 text-right font-mono text-xs">
                      {parseFloat(fee.late_fee || 0) > 0 ? `+৳${parseFloat(fee.late_fee).toFixed(2)}` : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-center text-xs font-semibold text-slate-500 font-mono">
                      {fee.due_day_of_month}th
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleToggleStatus(fee)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                          fee.status === 'active'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'
                        }`}
                        title="Click to toggle status"
                      >
                        {fee.status === 'active' ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenModal(fee)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <FiEdit2 className="text-sm" />
                        </button>
                        <button
                          onClick={() => handleDelete(fee.id)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <FiTrash2 className="text-sm" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create or Edit Fee Configuration */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editingFee ? 'Edit Fee Configuration' : 'Configure New Education Fee'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Define fee rules, rates, and collection terms for this class.
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <FiX className="text-lg" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Academic Class <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.class_id}
                    onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                    className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                    required
                  >
                    <option value="">Select Class</option>
                    {meta.classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.class_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Academic Session
                  </label>
                  <select
                    value={formData.session_id}
                    onChange={(e) => setFormData({ ...formData, session_id: e.target.value })}
                    className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">All Sessions (General)</option>
                    {meta.sessions.map((sess) => (
                      <option key={sess.id} value={sess.id}>
                        {sess.session_name} {sess.is_current ? '(Current)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Fee Title / Descriptor <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Monthly Tuition Fee, Admission Fee, Science Lab Fee"
                  value={formData.fee_title}
                  onChange={(e) => setFormData({ ...formData, fee_title: e.target.value })}
                  className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Fee Category
                  </label>
                  <select
                    value={formData.fee_type}
                    onChange={(e) => setFormData({ ...formData, fee_type: e.target.value })}
                    className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {meta.feeTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Frequency
                  </label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {meta.frequencies.map((freq) => (
                      <option key={freq.id} value={freq.id}>
                        {freq.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Amount (৳) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="1500.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Late Fine (৳)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="50.00"
                    value={formData.late_fee}
                    onChange={(e) => setFormData({ ...formData, late_fee: e.target.value })}
                    className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Due Day of Month
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    placeholder="10"
                    value={formData.due_day_of_month}
                    onChange={(e) => setFormData({ ...formData, due_day_of_month: e.target.value })}
                    className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Description / Remarks
                </label>
                <textarea
                  rows="2"
                  placeholder="Additional notes for students regarding this fee..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {saving ? 'Saving...' : editingFee ? 'Save Changes' : 'Create Fee Structure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
