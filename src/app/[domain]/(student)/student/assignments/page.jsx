'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
  FiBookOpen,
  FiFileText,
  FiCalendar,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiUploadCloud,
  FiDownload,
  FiSearch,
  FiFilter,
  FiEye,
  FiRefreshCw,
  FiX,
  FiAward
} from 'react-icons/fi';

export default function StudentAssignmentsPage() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, pending, submitted, graded

  // Modal State for Submission
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissionText, setSubmissionText] = useState('');
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch assignments from API
  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/student/assignments');
      if (res.ok) {
        const data = await res.json();
        setAssignments(data.assignments || data.payload?.assignments || []);
      } else {
        toast.error('Failed to load assignments.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error loading assignments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const openSubmitModal = (assign) => {
    setSelectedAssignment(assign);
    setSubmissionText(assign.submission_text || '');
    setSubmissionUrl(assign.submission_file_url || '');
  };

  const handleSubmissionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAssignment) return;

    if (!submissionText.trim() && !submissionUrl.trim()) {
      toast.error('Please enter your response or attach a solution link.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/student/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignment_id: selectedAssignment.id,
          submission_text: submissionText.trim(),
          file_url: submissionUrl.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Assignment solution submitted successfully!');
        setSelectedAssignment(null);
        fetchAssignments();
      } else {
        toast.error(data.error || 'Failed to submit assignment.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error submitting assignment.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered assignments
  const filteredAssignments = assignments.filter((a) => {
    const matchesSearch =
      a.topic_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.subject_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.teacher_name?.toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'pending') return matchesSearch && !a.is_submitted;
    if (statusFilter === 'submitted') return matchesSearch && a.is_submitted && a.submission_status !== 'graded';
    if (statusFilter === 'graded') return matchesSearch && a.submission_status === 'graded';
    return matchesSearch;
  });

  const totalCount = assignments.length;
  const pendingCount = assignments.filter((a) => !a.is_submitted).length;
  const submittedCount = assignments.filter((a) => a.is_submitted && a.submission_status !== 'graded').length;
  const gradedCount = assignments.filter((a) => a.submission_status === 'graded').length;

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
            Academic Coursework
          </span>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            My Course Assignments
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            View homework, project deadlines, upload solutions, and track grading feedback.
          </p>
        </div>

        <button
          onClick={fetchAssignments}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition"
        >
          <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh List
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-slate-400">Total Coursework</span>
          <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{totalCount}</div>
          <span className="text-[10px] text-slate-500">Current session</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-amber-500">Pending Dues</span>
          <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">{pendingCount}</div>
          <span className="text-[10px] text-slate-500">Needs submission</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-sky-500">Submitted</span>
          <div className="text-xl font-bold text-sky-600 dark:text-sky-400 mt-0.5">{submittedCount}</div>
          <span className="text-[10px] text-slate-500">Awaiting grade</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-emerald-500">Graded</span>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{gradedCount}</div>
          <span className="text-[10px] text-slate-500">Marks published</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
          <input
            type="text"
            placeholder="Search by topic, subject, or teacher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Statuses ({totalCount})</option>
            <option value="pending">Pending ({pendingCount})</option>
            <option value="submitted">Submitted ({submittedCount})</option>
            <option value="graded">Graded ({gradedCount})</option>
          </select>
        </div>
      </div>

      {/* Main High-Density Assignments Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="py-3 px-4">Subject &amp; Teacher</th>
                <th className="py-3 px-4">Topic &amp; Instructions</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Marks / Score</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <FiRefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
                    Loading coursework assignments...
                  </td>
                </tr>
              ) : filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No coursework assignments found matching your filter.
                  </td>
                </tr>
              ) : (
                filteredAssignments.map((a) => {
                  const isOverdue = !a.is_submitted && new Date(a.submission_date) < new Date();
                  return (
                    <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {a.subject_name}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {a.teacher_name || 'Assigned Instructor'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                          {a.topic_name}
                        </div>
                        {a.description && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                            {a.description}
                          </div>
                        )}
                        {a.pdf_url && (
                          <a
                            href={a.pdf_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 mt-0.5 underline"
                          >
                            <FiDownload className="w-3 h-3" /> Question Attachment
                          </a>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono text-slate-700 dark:text-slate-300">
                          {a.submission_date ? new Date(a.submission_date).toLocaleDateString() : 'N/A'}
                        </div>
                        {isOverdue && (
                          <span className="text-[10px] font-bold text-rose-500 uppercase">
                            Overdue
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {a.is_submitted ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              a.submission_status === 'graded'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                                : 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-400'
                            }`}
                          >
                            <FiCheckCircle className="w-3 h-3" />
                            {a.submission_status === 'graded' ? 'Graded' : 'Submitted'}
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              isOverdue
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
                            }`}
                          >
                            <FiClock className="w-3 h-3" />
                            Pending
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {a.submission_status === 'graded' ? (
                          <div>
                            <span className="font-bold text-emerald-600 text-sm font-mono">
                              {a.marks_obtained !== null ? a.marks_obtained : '--'}
                            </span>
                            {a.feedback && (
                              <div className="text-[10px] text-slate-400 italic">
                                &ldquo;{a.feedback}&rdquo;
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Pending Review</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => openSubmitModal(a)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                            a.is_submitted
                              ? 'border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                          }`}
                        >
                          {a.is_submitted ? 'View / Resubmit' : 'Submit Solution'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submission Modal */}
      {selectedAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald-600">
                  {selectedAssignment.subject_name}
                </span>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">
                  {selectedAssignment.topic_name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedAssignment(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {selectedAssignment.submission_status === 'graded' && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-1">
                <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <FiAward className="w-4 h-4" /> Grade Awarded: {selectedAssignment.marks_obtained} Marks
                </div>
                {selectedAssignment.feedback && (
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                    Feedback: &ldquo;{selectedAssignment.feedback}&rdquo;
                  </p>
                )}
              </div>
            )}

            <form onSubmit={handleSubmissionSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Written Response / Explanation
                </label>
                <textarea
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                  rows={4}
                  placeholder="Type your assignment answers, solution summary, or methodology here..."
                  className="w-full text-xs p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Attachment Link (PDF / Google Drive / GitHub)
                </label>
                <input
                  type="url"
                  value={submissionUrl}
                  onChange={(e) => setSubmissionUrl(e.target.value)}
                  placeholder="https://drive.google.com/... or https://..."
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedAssignment(null)}
                  className="px-4 py-2 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm disabled:opacity-50"
                >
                  <FiUploadCloud className={`w-3.5 h-3.5 ${submitting ? 'animate-spin' : ''}`} />
                  {submitting ? 'Submitting...' : 'Confirm Submission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
