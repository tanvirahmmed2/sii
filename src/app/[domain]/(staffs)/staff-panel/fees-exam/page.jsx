'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  FiPlus,
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiDollarSign,
  FiCalendar,
  FiCheckCircle,
  FiAlertCircle,
  FiX
} from 'react-icons/fi';

export default function FeesExamPage() {
  const [fees, setFees] = useState([]);
  const [meta, setMeta] = useState({ classes: [], exams: [] });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExam, setSelectedExam] = useState('all');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFee, setEditingFee] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const [formData, setFormData] = useState({
    exam_id: '',
    class_id: '',
    fee_title: '',
    amount: '500.00',
    late_fee: '50.00',
    due_date: '',
    description: '',
    status: 'active'
  });

  // Fetch metadata
  useEffect(() => {
    async function loadMeta() {
      try {
        const res = await fetch('/api/exams/meta');
        if (res.ok) {
          const data = await res.json();
          setMeta({
            classes: data.classes || [],
            exams: data.exams || []
          });
          if (data.exams?.length > 0 && !formData.exam_id) {
            setFormData(prev => ({
              ...prev,
              exam_id: data.exams[0].id,
              class_id: data.exams[0].class_id || ''
            }));
          }
        }
      } catch (err) {
        console.error('Failed to load metadata:', err);
      }
    }
    loadMeta();
  }, []);

  const fetchFees = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      });
      if (searchTerm) params.append('search', searchTerm);
      if (selectedExam !== 'all') params.append('exam_id', selectedExam);
      if (selectedClass !== 'all') params.append('class_id', selectedClass);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);

      const res = await fetch(`/api/exams/fees?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setFees(data.fees || []);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      }
    } catch (err) {
      console.error('Error fetching exam fees:', err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedExam, selectedClass, selectedStatus]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFees(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchFees]);

  const handleOpenCreate = () => {
    setEditingFee(null);
    setFormData({
      exam_id: meta.exams[0]?.id || '',
      class_id: meta.exams[0]?.class_id || meta.classes[0]?.id || '',
      fee_title: 'Exam Registration Fee',
      amount: '500.00',
      late_fee: '50.00',
      due_date: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
      description: '',
      status: 'active'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (fee) => {
    setEditingFee(fee);
    setFormData({
      exam_id: fee.exam_id || '',
      class_id: fee.class_id || '',
      fee_title: fee.fee_title || '',
      amount: fee.amount || '0.00',
      late_fee: fee.late_fee || '0.00',
      due_date: fee.due_date ? fee.due_date.split('T')[0] : '',
      description: fee.description || '',
      status: fee.status || 'active'
    });
    setIsModalOpen(true);
  };

  const handleSaveFee = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const url = '/api/exams/fees';
      const method = editingFee ? 'PUT' : 'POST';
      const payload = editingFee ? { ...formData, id: editingFee.id } : formData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        setFeedback({ type: 'error', text: resData.error || 'Failed to save exam fee.' });
      } else {
        setFeedback({ type: 'success', text: resData.message || 'Fee configuration saved successfully.' });
        setTimeout(() => {
          setIsModalOpen(false);
          setFeedback(null);
          fetchFees(pagination.page);
        }, 800);
      }
    } catch (err) {
      setFeedback({ type: 'error', text: 'Network connection error.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete fee rule "${title}"?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/exams/fees?id=${id}`, { method: 'DELETE' });
      const resData = await res.json();
      if (res.ok && resData.success) {
        fetchFees(pagination.page);
      } else {
        alert(resData.error || 'Failed to delete fee.');
      }
    } catch (err) {
      alert('Error deleting fee.');
    }
  };

  // Metrics
  const totalCollected = fees.reduce((sum, f) => sum + (parseFloat(f.total_collected) || 0), 0);
  const activeRules = fees.filter(f => f.status === 'active').length;

  return (
    <div className="w-full space-y-4">
      {/* Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Fee Rules Defined</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">{pagination.total}</span>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">All Exams</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Active Rules</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">{activeRules}</span>
            <span className="text-[11px] font-medium text-slate-500">Applicable</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Total Collected (BDT)</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400 font-mono">৳{totalCollected.toFixed(2)}</span>
            <span className="text-[11px] font-medium text-indigo-600/80">Cleared</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Payment Records</p>
          <div className="flex items-baseline justify-between mt-1">
            <Link href="/staff-panel/payment-exam-list" className="text-xs font-semibold text-blue-600 hover:underline">
              View All Payments &rarr;
            </Link>
            <span className="text-[11px] font-medium text-slate-500">Ledger</span>
          </div>
        </div>
      </div>

      {/* Main Workstation Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs space-y-4">
        {/* Action & Filter Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative min-w-[200px] flex-1 max-w-xs">
              <FiSearch className="absolute left-3 top-2.5 text-slate-400 text-xs" />
              <input
                type="text"
                placeholder="Search fee title or exam..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400 transition"
              />
            </div>

            <select
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Examinations</option>
              {meta.exams.map(ex => (
                <option key={ex.id} value={ex.id}>{ex.name} ({ex.term})</option>
              ))}
            </select>

            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Classes</option>
              {meta.classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer shadow-xs"
            >
              <FiPlus className="text-sm" /> Configure Exam Fee
            </button>
          </div>
        </div>

        {/* High-Density Data Table */}
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2.5">Fee Title</th>
                <th className="px-3 py-2.5">Examination</th>
                <th className="px-3 py-2.5">Applicable Class</th>
                <th className="px-3 py-2.5 font-mono text-right">Fee Amount</th>
                <th className="px-3 py-2.5 font-mono text-right">Late Fine</th>
                <th className="px-3 py-2.5">Due Date</th>
                <th className="px-3 py-2.5 text-center">Paid Collections</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="9" className="px-3 py-8 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading exam fees...</span>
                    </div>
                  </td>
                </tr>
              ) : fees.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-3 py-8 text-center text-slate-400">
                    No fee configurations found. Click &quot;Configure Exam Fee&quot; to add fees for examinations.
                  </td>
                </tr>
              ) : (
                fees.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-3 py-2.5">
                      <div className="font-semibold text-slate-900 dark:text-white">{row.fee_title}</div>
                      {row.description && <div className="text-[10px] text-slate-400 line-clamp-1">{row.description}</div>}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-slate-800 dark:text-slate-200">
                      <div>{row.exam_name}</div>
                      <div className="text-[10px] text-slate-400">{row.exam_term}</div>
                    </td>
                    <td className="px-3 py-2.5 font-medium text-slate-600 dark:text-slate-300">
                      {row.class_name || 'All Assigned Classes'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                      ৳{parseFloat(row.amount).toFixed(2)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-500 dark:text-slate-400">
                      ৳{parseFloat(row.late_fee || 0).toFixed(2)}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-[11px] font-mono text-slate-600 dark:text-slate-300">
                      {row.due_date ? new Date(row.due_date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <Link
                        href={`/staff-panel/payment-exam-list?fee_id=${row.id}`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition"
                      >
                        ৳{parseFloat(row.total_collected || 0).toFixed(2)} ({row.paid_payments_count} paid)
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                        row.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                          : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap space-x-1">
                      <button
                        onClick={() => handleOpenEdit(row)}
                        title="Edit Fee Rule"
                        className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 transition cursor-pointer"
                      >
                        <FiEdit2 className="text-xs" />
                      </button>
                      <button
                        onClick={() => handleDelete(row.id, row.fee_title)}
                        title="Delete Fee Rule"
                        className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                      >
                        <FiTrash2 className="text-xs" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Micro Pagination Footer */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
          <span>
            Showing {fees.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
          </span>
          <div className="flex items-center gap-1 font-mono">
            <button
              onClick={() => fetchFees(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>
            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded font-bold text-slate-900 dark:text-white">
              {pagination.page} / {pagination.totalPages || 1}
            </span>
            <button
              onClick={() => fetchFees(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {editingFee ? 'Edit Exam Fee Rule' : 'Configure New Exam Fee'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <FiX className="text-lg" />
              </button>
            </div>

            <form onSubmit={handleSaveFee} className="p-6 space-y-4">
              {feedback && (
                <div className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${
                  feedback.type === 'error'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                }`}>
                  {feedback.type === 'error' ? <FiAlertCircle /> : <FiCheckCircle />}
                  <span>{feedback.text}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Select Examination *
                  </label>
                  <select
                    required
                    value={formData.exam_id}
                    onChange={(e) => {
                      const ex = meta.exams.find(item => String(item.id) === e.target.value);
                      setFormData({
                        ...formData,
                        exam_id: e.target.value,
                        class_id: ex?.class_id || formData.class_id
                      });
                    }}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="">Select Exam</option>
                    {meta.exams.map(ex => (
                      <option key={ex.id} value={ex.id}>{ex.name} ({ex.term})</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Fee Title / Description *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Annual Exam Registration Fee"
                    value={formData.fee_title}
                    onChange={(e) => setFormData({ ...formData, fee_title: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Applicable Class
                  </label>
                  <select
                    value={formData.class_id}
                    onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="">Exam&apos;s Default Class</option>
                    {meta.classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Fee Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Fee Amount (BDT) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="500.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Late Fine / Penalty (BDT)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.late_fee}
                    onChange={(e) => setFormData({ ...formData, late_fee: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Due Date
                  </label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Notes / Terms
                  </label>
                  <textarea
                    rows="2"
                    placeholder="Payment terms, bank deposit instructions, or waiver details..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  ></textarea>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingFee ? 'Update Fee Rule' : 'Save Fee Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
