'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FiSearch,
  FiCheckCircle,
  FiXCircle,
  FiFileText,
  FiEdit2,
  FiTrash2,
  FiUsers,
  FiClock,
  FiPrinter,
  FiPlus,
  FiAlertCircle,
  FiX
} from 'react-icons/fi';

export default function ExamAdmitCardsPage() {
  const [candidates, setCandidates] = useState([]);
  const [meta, setMeta] = useState({ classes: [], exams: [] });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExam, setSelectedExam] = useState('all');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCand, setEditingCand] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const [formData, setFormData] = useState({
    id: '',
    candidate_status: 'approved',
    admit_card_number: '',
    remarks: '',
    auto_generate_admit: false
  });

  // Load Metadata
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
        }
      } catch (err) {
        console.error('Failed to load metadata:', err);
      }
    }
    loadMeta();
  }, []);

  const fetchCandidates = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      });
      if (searchTerm) params.append('search', searchTerm);
      if (selectedExam !== 'all') params.append('exam_id', selectedExam);
      if (selectedClass !== 'all') params.append('class_id', selectedClass);
      if (selectedStatus !== 'all') params.append('candidate_status', selectedStatus);

      const res = await fetch(`/api/exams/candidates?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCandidates(data.candidates || []);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      }
    } catch (err) {
      console.error('Error fetching candidates:', err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedExam, selectedClass, selectedStatus]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCandidates(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchCandidates]);

  const handleOpenEdit = (cand) => {
    setEditingCand(cand);
    setFormData({
      id: cand.id,
      candidate_status: cand.candidate_status || 'pending',
      admit_card_number: cand.admit_card_number || '',
      remarks: cand.remarks || '',
      auto_generate_admit: false
    });
    setIsModalOpen(true);
  };

  const handleQuickStatus = async (id, status, autoAdmit = false) => {
    try {
      const res = await fetch('/api/exams/candidates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          candidate_status: status,
          auto_generate_admit: autoAdmit
        })
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        fetchCandidates(pagination.page);
      } else {
        alert(resData.error || 'Action failed');
      }
    } catch (err) {
      alert('Error updating candidate');
    }
  };

  const handleSaveModal = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/exams/candidates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const resData = await res.json();
      if (!res.ok || !resData.success) {
        setFeedback({ type: 'error', text: resData.error || 'Failed to update candidate.' });
      } else {
        setFeedback({ type: 'success', text: resData.message || 'Candidate updated successfully.' });
        setTimeout(() => {
          setIsModalOpen(false);
          setFeedback(null);
          fetchCandidates(pagination.page);
        }, 700);
      }
    } catch (err) {
      setFeedback({ type: 'error', text: 'Network connection error.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete candidate registration for "${name}"?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/exams/candidates?id=${id}`, { method: 'DELETE' });
      const resData = await res.json();
      if (res.ok && resData.success) {
        fetchCandidates(pagination.page);
      } else {
        alert(resData.error || 'Failed to delete candidate.');
      }
    } catch (err) {
      alert('Error deleting candidate.');
    }
  };

  // KPI counts
  const approvedCount = candidates.filter(c => c.candidate_status === 'approved').length;
  const admitIssuedCount = candidates.filter(c => c.candidate_status === 'admit_issued').length;
  const pendingCount = candidates.filter(c => c.candidate_status === 'pending').length;

  return (
    <div className="w-full space-y-4">
      {/* Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Total Candidates</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">{pagination.total}</span>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Total Enrolled</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Admit Cards Issued</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">{admitIssuedCount}</span>
            <span className="text-[11px] font-medium text-slate-500">Admit Active</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Approved Candidates</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-blue-600 dark:text-blue-400 font-mono">{approvedCount}</span>
            <span className="text-[11px] font-medium text-blue-600/80">Ready for Admit</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Pending Review</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-amber-600 dark:text-amber-400 font-mono">{pendingCount}</span>
            <span className="text-[11px] font-medium text-amber-600/80">Action needed</span>
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
                placeholder="Search student, roll, or admit card..."
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
              <option value="all">All Candidate Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="admit_issued">Admit Issued</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* High-Density Data Table */}
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2.5">Candidate / Student</th>
                <th className="px-3 py-2.5">Roll & Registration</th>
                <th className="px-3 py-2.5">Examination</th>
                <th className="px-3 py-2.5">Class / Session</th>
                <th className="px-3 py-2.5">Admit Card No</th>
                <th className="px-3 py-2.5">Fee Status</th>
                <th className="px-3 py-2.5">Candidate Status</th>
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-3 py-8 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading exam candidates...</span>
                    </div>
                  </td>
                </tr>
              ) : candidates.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-3 py-8 text-center text-slate-400">
                    No candidates found matching your search criteria.
                  </td>
                </tr>
              ) : (
                candidates.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-3 py-2.5">
                      <div className="font-semibold text-slate-900 dark:text-white">{row.student_name || 'Student #' + row.student_id}</div>
                      <div className="text-[10px] text-slate-400 font-mono">ID: {row.student_id}</div>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px]">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">Roll: {row.roll_no || 'N/A'}</div>
                      <div className="text-slate-400 text-[10px]">Reg: {row.registration_no || 'N/A'}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-slate-900 dark:text-slate-100">{row.exam_name}</div>
                      <div className="text-[10px] text-slate-400">{row.exam_term}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{row.class_name}</span>
                      <div className="text-[10px] text-slate-400">{row.session_name}</div>
                    </td>
                    <td className="px-3 py-2.5 font-mono font-bold">
                      {row.admit_card_number ? (
                        <span className="text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded text-[10px] border border-indigo-200 dark:border-indigo-800">
                          {row.admit_card_number}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[10px]">Not Issued</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                        row.payment_status === 'paid'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                          : row.payment_status === 'partially_paid'
                          ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
                          : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
                      }`}>
                        {row.payment_status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                        row.candidate_status === 'admit_issued'
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800'
                          : row.candidate_status === 'approved'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                          : row.candidate_status === 'rejected'
                          ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
                          : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
                      }`}>
                        {row.candidate_status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap space-x-1">
                      {row.candidate_status !== 'admit_issued' && (
                        <button
                          onClick={() => handleQuickStatus(row.id, 'admit_issued', true)}
                          title="Generate & Issue Admit Card"
                          className="px-2 py-1 rounded text-[10px] font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer"
                        >
                          Issue Admit
                        </button>
                      )}
                      {row.candidate_status === 'pending' && (
                        <button
                          onClick={() => handleQuickStatus(row.id, 'approved')}
                          title="Approve Candidate"
                          className="px-2 py-1 rounded text-[10px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer"
                        >
                          Approve
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenEdit(row)}
                        title="Edit / Review"
                        className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 transition cursor-pointer"
                      >
                        <FiEdit2 className="text-xs" />
                      </button>
                      <button
                        onClick={() => handleDelete(row.id, row.student_name)}
                        title="Delete Candidate"
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
            Showing {candidates.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
          </span>
          <div className="flex items-center gap-1 font-mono">
            <button
              onClick={() => fetchCandidates(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>
            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded font-bold text-slate-900 dark:text-white">
              {pagination.page} / {pagination.totalPages || 1}
            </span>
            <button
              onClick={() => fetchCandidates(pagination.page + 1)}
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
                Review Candidate Registration
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <FiX className="text-lg" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-6 space-y-4">
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

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  {editingCand?.student_name}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Exam: <strong className="text-slate-700 dark:text-slate-300">{editingCand?.exam_name}</strong>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Class: {editingCand?.class_name} | Roll: {editingCand?.roll_no}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Candidate Status *
                </label>
                <select
                  value={formData.candidate_status}
                  onChange={(e) => setFormData({ ...formData, candidate_status: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="admit_issued">Admit Card Issued</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Admit Card Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. ADM-2026-0012"
                  value={formData.admit_card_number}
                  onChange={(e) => setFormData({ ...formData, admit_card_number: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Staff Remarks
                </label>
                <textarea
                  rows="2"
                  placeholder="Verification remarks or approval notes..."
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                ></textarea>
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
                  {submitting ? 'Saving...' : 'Update Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
