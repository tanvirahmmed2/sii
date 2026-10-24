'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

export default function StudentAssignmentsPage() {
  const { getApiEndpoint } = useTenantWebsite();
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
      const res = await fetch(getApiEndpoint('student/assignments'));
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
  }, [getApiEndpoint]);

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
      const res = await fetch(getApiEndpoint('student/assignments'), {
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
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded inline-block mb-1">
            Academic Coursework
          </span>
          <h1 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
            Course Assignments &amp; Homework Tasks
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Review assignment deadlines, upload solutions, and track grading feedback.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchAssignments}
          className="px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer self-start sm:self-auto"
        >
          Refresh Roster
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3.5 space-y-0.5">
          <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 tracking-wider">Total Coursework</span>
          <div className="text-lg font-semibold text-slate-900 dark:text-white">{totalCount}</div>
          <span className="text-[11px] text-slate-500 font-mono">Current academic session</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3.5 space-y-0.5">
          <span className="text-[10px] uppercase font-semibold text-amber-600 dark:text-amber-400 tracking-wider">Pending Dues</span>
          <div className="text-lg font-semibold text-amber-600 dark:text-amber-400">{pendingCount}</div>
          <span className="text-[11px] text-slate-500">Requires submission</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3.5 space-y-0.5">
          <span className="text-[10px] uppercase font-semibold text-primary tracking-wider">Submitted</span>
          <div className="text-lg font-semibold text-primary">{submittedCount}</div>
          <span className="text-[11px] text-slate-500">Awaiting teacher grading</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3.5 space-y-0.5">
          <span className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400 tracking-wider">Evaluated</span>
          <div className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">{gradedCount}</div>
          <span className="text-[11px] text-slate-500">Scores published</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <input
          type="text"
          placeholder="Search by topic, subject, or teacher..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:max-w-md px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-primary"
        />

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden focus:border-primary cursor-pointer"
          >
            <option value="all">All Assignments ({totalCount})</option>
            <option value="pending">Pending ({pendingCount})</option>
            <option value="submitted">Submitted ({submittedCount})</option>
            <option value="graded">Graded ({gradedCount})</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Subject &amp; Instructor</th>
                <th className="py-2.5 px-3">Topic &amp; Overview</th>
                <th className="py-2.5 px-3">Due Date</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Marks / Score</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400 font-medium">
                    Loading coursework assignments...
                  </td>
                </tr>
              ) : filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400 font-medium">
                    No coursework assignments found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredAssignments.map((a) => {
                  const isOverdue = !a.is_submitted && new Date(a.submission_date) < new Date();
                  return (
                    <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {a.subject_name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {a.teacher_name || 'Assigned Instructor'}
                        </div>
                      </td>

                      <td className="py-3 px-3 max-w-xs">
                        <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                          {a.topic_name}
                        </div>
                        {a.description && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {a.description}
                          </div>
                        )}
                        {a.pdf_url && (
                          <a
                            href={a.pdf_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] font-medium text-primary hover:underline mt-0.5 inline-block"
                          >
                            Attachment Document
                          </a>
                        )}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap font-mono text-slate-700 dark:text-slate-300">
                        {a.submission_date ? new Date(a.submission_date).toLocaleDateString('en-GB') : 'N/A'}
                        {isOverdue && (
                          <span className="block text-[10px] font-semibold text-rose-600 dark:text-rose-400 uppercase">
                            Overdue
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        {a.is_submitted ? (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                              a.submission_status === 'graded'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                                : 'bg-primary/10 text-primary border border-primary/20'
                            }`}
                          >
                            {a.submission_status === 'graded' ? 'Graded' : 'Submitted'}
                          </span>
                        ) : (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                              isOverdue
                                ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
                                : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
                            }`}
                          >
                            Pending
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        {a.submission_status === 'graded' ? (
                          <div>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-sm font-mono">
                              {a.marks_obtained !== null ? a.marks_obtained : '--'}
                            </span>
                            {a.feedback && (
                              <div className="text-[10px] text-slate-400 italic">
                                &ldquo;{a.feedback}&rdquo;
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Under Review</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openSubmitModal(a)}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                            a.is_submitted
                              ? 'border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                              : 'bg-primary hover:bg-primary-dark text-white shadow-xs'
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
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md max-w-lg w-full p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                  {selectedAssignment.subject_name}
                </span>
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white mt-0.5">
                  {selectedAssignment.topic_name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAssignment(null)}
                className="px-2 py-1 rounded text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>

            {selectedAssignment.submission_status === 'graded' && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-md space-y-1">
                <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                  Grade Awarded: {selectedAssignment.marks_obtained} Marks
                </div>
                {selectedAssignment.feedback && (
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                    Feedback: &ldquo;{selectedAssignment.feedback}&rdquo;
                  </p>
                )}
              </div>
            )}

            <form onSubmit={handleSubmissionSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Written Response / Explanation
                </label>
                <textarea
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                  rows={4}
                  placeholder="Type your assignment answers, solution summary, or methodology here..."
                  className="w-full text-xs p-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Attachment Link (PDF, Google Drive, or Cloud Link)
                </label>
                <input
                  type="url"
                  value={submissionUrl}
                  onChange={(e) => setSubmissionUrl(e.target.value)}
                  placeholder="https://drive.google.com/... or https://..."
                  className="w-full text-xs px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-primary font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedAssignment(null)}
                  className="px-3.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-md bg-primary hover:bg-primary-dark text-white text-xs font-medium transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
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
