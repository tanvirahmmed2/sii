'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FiPlus,
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiAward,
  FiCheckCircle,
  FiAlertCircle,
  FiX
} from 'react-icons/fi';

export default function ExamGradePage() {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const [formData, setFormData] = useState({
    grade_name: '',
    point_numeric: '5.00',
    mark_from: '80.00',
    mark_to: '100.00',
    comment: 'Outstanding',
    status: 'active'
  });

  const fetchGrades = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      });
      if (searchTerm) params.append('search', searchTerm);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);

      const res = await fetch(`/api/exams/grades?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setGrades(data.grades || []);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      }
    } catch (err) {
      console.error('Error fetching grades:', err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedStatus]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchGrades(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchGrades]);

  const handleOpenCreate = () => {
    setEditingGrade(null);
    setFormData({
      grade_name: '',
      point_numeric: '5.00',
      mark_from: '80.00',
      mark_to: '100.00',
      comment: 'Outstanding',
      status: 'active'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (grade) => {
    setEditingGrade(grade);
    setFormData({
      grade_name: grade.grade_name || '',
      point_numeric: grade.point_numeric || '0.00',
      mark_from: grade.mark_from || '0.00',
      mark_to: grade.mark_to || '0.00',
      comment: grade.comment || '',
      status: grade.status || 'active'
    });
    setIsModalOpen(true);
  };

  const handleSaveGrade = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const url = '/api/exams/grades';
      const method = editingGrade ? 'PUT' : 'POST';
      const payload = editingGrade ? { ...formData, id: editingGrade.id } : formData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        setFeedback({ type: 'error', text: resData.error || 'Failed to save grade scale.' });
      } else {
        setFeedback({ type: 'success', text: resData.message || 'Grade scale saved successfully.' });
        setTimeout(() => {
          setIsModalOpen(false);
          setFeedback(null);
          fetchGrades(pagination.page);
        }, 800);
      }
    } catch (err) {
      setFeedback({ type: 'error', text: 'Network connection error.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete grade scale "${name}"?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/exams/grades?id=${id}`, { method: 'DELETE' });
      const resData = await res.json();
      if (res.ok && resData.success) {
        fetchGrades(pagination.page);
      } else {
        alert(resData.error || 'Failed to delete grade.');
      }
    } catch (err) {
      alert('Error deleting grade.');
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Configured Grades</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">{pagination.total}</span>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Standard Scales</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Top Scale</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400 font-mono">
              {grades[0]?.grade_name || 'A+'} ({grades[0]?.point_numeric || '5.00'})
            </span>
            <span className="text-[11px] font-medium text-slate-500">Max GPA Point</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Passing Threshold</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-amber-600 dark:text-amber-400 font-mono">33.00%</span>
            <span className="text-[11px] font-medium text-amber-600/80">Standard Pass</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">System Rule</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">GPA-5</span>
            <span className="text-[11px] font-medium text-emerald-600/80">Active Framework</span>
          </div>
        </div>
      </div>

      {/* Main Workstation Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs space-y-4">
        {/* Action & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <FiSearch className="absolute left-3 top-2.5 text-slate-400 text-xs" />
              <input
                type="text"
                placeholder="Search grade name or comment..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400 transition"
              />
            </div>

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
              <FiPlus className="text-sm" /> Add Grade Scale
            </button>
          </div>
        </div>

        {/* High-Density Data Table */}
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2.5">Grade Name</th>
                <th className="px-3 py-2.5">Grade Point (GPA)</th>
                <th className="px-3 py-2.5">Mark Range (From - To)</th>
                <th className="px-3 py-2.5">Remarks / Evaluation</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-3 py-8 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading grade scales...</span>
                    </div>
                  </td>
                </tr>
              ) : grades.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-3 py-8 text-center text-slate-400">
                    No grade scales defined yet. Click &quot;Add Grade Scale&quot; to configure your institution&apos;s grading criteria.
                  </td>
                </tr>
              ) : (
                grades.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-3 py-2.5">
                      <span className="font-bold text-slate-900 dark:text-white px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs font-mono">
                        {row.grade_name}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {parseFloat(row.point_numeric).toFixed(2)}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                      {parseFloat(row.mark_from).toFixed(1)}% — {parseFloat(row.mark_to).toFixed(1)}%
                    </td>
                    <td className="px-3 py-2.5 font-medium text-slate-600 dark:text-slate-300">
                      {row.comment || '—'}
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
                        title="Edit Grade"
                        className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 transition cursor-pointer"
                      >
                        <FiEdit2 className="text-xs" />
                      </button>
                      <button
                        onClick={() => handleDelete(row.id, row.grade_name)}
                        title="Delete Grade"
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
            Showing {grades.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
          </span>
          <div className="flex items-center gap-1 font-mono">
            <button
              onClick={() => fetchGrades(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>
            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded font-bold text-slate-900 dark:text-white">
              {pagination.page} / {pagination.totalPages || 1}
            </span>
            <button
              onClick={() => fetchGrades(pagination.page + 1)}
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
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {editingGrade ? 'Edit Grade Scale' : 'Add Grade Scale'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <FiX className="text-lg" />
              </button>
            </div>

            <form onSubmit={handleSaveGrade} className="p-6 space-y-4">
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

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Grade Symbol / Name * (e.g. A+, A, B)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. A+"
                  value={formData.grade_name}
                  onChange={(e) => setFormData({ ...formData, grade_name: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white uppercase font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Grade Point (GPA) * (e.g. 5.00, 4.00, 0.00)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 5.00"
                  value={formData.point_numeric}
                  onChange={(e) => setFormData({ ...formData, point_numeric: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mark From (%) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    placeholder="e.g. 80.0"
                    value={formData.mark_from}
                    onChange={(e) => setFormData({ ...formData, mark_from: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mark To (%) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    placeholder="e.g. 100.0"
                    value={formData.mark_to}
                    onChange={(e) => setFormData({ ...formData, mark_to: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Evaluation / Comment (e.g. Outstanding, Pass, Fail)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Outstanding"
                  value={formData.comment}
                  onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Scale Status
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
                  {submitting ? 'Saving...' : editingGrade ? 'Update Grade' : 'Save Grade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
