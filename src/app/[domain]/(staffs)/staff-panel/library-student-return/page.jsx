'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';

export default function LibraryStudentReturnPage() {
  const [issues, setIssues] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'issued' | 'returned' | 'overdue'
  const [feedback, setFeedback] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Return Processing Modal
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [targetIssue, setTargetIssue] = useState(null);
  const [fineAmount, setFineAmount] = useState('0');
  const [fineStatus, setFineStatus] = useState('none'); // 'none' | 'pending' | 'paid' | 'waived'
  const [conditionNote, setConditionNote] = useState('Good condition, verified intact.');
  const [submitting, setSubmitting] = useState(false);

  // Details Modal
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Delete Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadIssues = useCallback(async () => {
    setLoading(true);
    try {
      const url = `/api/library/student-circulation?search=${encodeURIComponent(searchTerm)}&status=${statusFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setIssues(data.issues || []);
        if (data.metrics) setMetrics(data.metrics);
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to load student return records.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error while loading student return records.' });
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    loadIssues();
  }, [loadIssues]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, pageSize]);

  // Client filtering & pagination
  const filteredIssues = useMemo(() => {
    return issues.filter((iss) => {
      const matchSearch =
        !searchTerm ||
        (iss.student_name && iss.student_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (iss.student_reg && iss.student_reg.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (iss.book_title && iss.book_title.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (iss.book_isbn && iss.book_isbn.toLowerCase().includes(searchTerm.toLowerCase()));

      const isOverdue = iss.status === 'overdue' || (iss.status === 'issued' && new Date(iss.due_date) < new Date());
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'issued' && iss.status === 'issued') ||
        (statusFilter === 'returned' && iss.status === 'returned') ||
        (statusFilter === 'overdue' && isOverdue);

      return matchSearch && matchStatus;
    });
  }, [issues, searchTerm, statusFilter]);

  const totalItems = filteredIssues.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedIssues = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredIssues.slice(start, start + pageSize);
  }, [filteredIssues, currentPage, pageSize]);

  const handleOpenReturnModal = (iss) => {
    setTargetIssue(iss);
    const isOverdue = new Date(iss.due_date) < new Date();
    if (isOverdue) {
      const diffTime = Math.abs(new Date() - new Date(iss.due_date));
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setFineAmount((diffDays * 5).toString()); // Suggested 5 BDT per day overdue
      setFineStatus('pending');
    } else {
      setFineAmount('0');
      setFineStatus('none');
    }
    setConditionNote('Good condition, verified intact.');
    setReturnModalOpen(true);
  };

  const handleSubmitReturn = async (e) => {
    e.preventDefault();
    if (!targetIssue) return;

    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/library/student-circulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'return',
          issue_id: targetIssue.id,
          fine_amount: parseFloat(fineAmount) || 0,
          fine_status: fineStatus,
          condition_note: conditionNote,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: 'success',
          message: `Book "${targetIssue.book_title}" returned successfully by ${targetIssue.student_name}. Available stock restored: ${data.updated_stock?.available_copies}.`
        });
        setReturnModalOpen(false);
        setTargetIssue(null);
        loadIssues();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to process return.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error while processing return.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteIssue = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/library/student-circulation?id=${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: data.message || 'Record deleted successfully.' });
        setDeleteTarget(null);
        loadIssues();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to delete record.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error deleting circulation record.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Page Header */}
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-white">
            Student Book Return Desk
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Process student volume check-ins, inspect physical conditions, assess late fines, and increment available stock.
          </p>
        </div>
        <button
          onClick={loadIssues}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
        >
          <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh Desk
        </button>
      </div>

      {/* Alert Feedback */}
      {feedback && (
        <div
          className={`px-3 py-2 text-xs rounded border flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="ml-2 font-bold cursor-pointer opacity-70 hover:opacity-100">
            &times;
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            Total Issues
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-slate-900 dark:text-white font-mono">
              {metrics.total_issues || issues.length}
            </span>
            <span className="text-[10px] font-medium text-slate-500">Student loans</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            Awaiting Return
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-blue-600 dark:text-blue-400 font-mono">
              {metrics.active_issues || 0}
            </span>
            <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">Currently borrowed</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            Overdue Loans
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-amber-600 dark:text-amber-400 font-mono">
              {metrics.overdue_issues || 0}
            </span>
            <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">Past due date</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            Completed Returns
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
              {metrics.returned_count || 0}
            </span>
            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">Stock incremented</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded shadow-2xs">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by student, reg, book title, ISBN..."
              className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-slate-400 text-slate-900 dark:text-white"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1.5 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                &times;
              </button>
            )}
          </div>

          <div className="flex items-center space-x-1 border border-slate-200 dark:border-slate-700 rounded p-0.5 bg-slate-50 dark:bg-slate-800 text-xs">
            {[
              { id: 'all', label: 'All Records' },
              { id: 'issued', label: 'Issued' },
              { id: 'overdue', label: 'Overdue' },
              { id: 'returned', label: 'Returned' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                  statusFilter === f.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Show:</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-slate-800 dark:text-slate-200"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {/* Return Records Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-3">Student</th>
                <th className="py-2.5 px-3">Book Title &amp; ISBN</th>
                <th className="py-2.5 px-3">Issue Date</th>
                <th className="py-2.5 px-3">Due Date</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Return Info</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading return circulation records...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedIssues.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-500">
                    No circulation records found matching the current search criteria.
                  </td>
                </tr>
              ) : (
                paginatedIssues.map((iss) => {
                  const isOverdue =
                    iss.status === 'overdue' || (iss.status === 'issued' && new Date(iss.due_date) < new Date());
                  const isReturned = iss.status === 'returned';

                  return (
                    <tr key={iss.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-900 dark:text-white">
                          {iss.student_name || 'Student #' + iss.student_id}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Reg: {iss.student_reg || 'N/A'} {iss.student_roll ? `• Roll: ${iss.student_roll}` : ''}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-900 dark:text-white max-w-[220px] truncate" title={iss.book_title}>
                          {iss.book_title}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          ISBN: {iss.book_isbn || 'N/A'} {iss.book_shelf ? `• Rack: ${iss.book_shelf}` : ''}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                        {iss.issue_date ? new Date(iss.issue_date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`font-mono text-[11px] ${
                            isOverdue && !isReturned
                              ? 'text-rose-600 dark:text-rose-400 font-semibold'
                              : 'text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {iss.due_date ? new Date(iss.due_date).toLocaleDateString() : 'N/A'}
                        </span>
                        {isOverdue && !isReturned && (
                          <div className="text-[10px] text-rose-500 font-medium">Overdue</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {isReturned ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            Returned
                          </span>
                        ) : isOverdue ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            Overdue Hold
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            Issued
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {isReturned ? (
                          <div className="text-[11px]">
                            <span className="font-mono text-emerald-600 dark:text-emerald-400">
                              {iss.actual_return_date ? new Date(iss.actual_return_date).toLocaleDateString() : 'Yes'}
                            </span>
                            {Number(iss.fine_amount) > 0 && (
                              <div className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">
                                Fine: ৳{iss.fine_amount} ({iss.fine_status})
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">— In loan</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right space-x-1 whitespace-nowrap">
                        {!isReturned ? (
                          <button
                            onClick={() => handleOpenReturnModal(iss)}
                            className="px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded hover:bg-emerald-100 transition-colors cursor-pointer"
                          >
                            Receive Book
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedRecord(iss);
                              setDetailsModalOpen(true);
                            }}
                            className="px-2 py-1 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            Receipt
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteTarget(iss)}
                          className="px-2 py-1 text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 rounded hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                          title="Delete entry"
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

        {/* Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-3.5 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-700 dark:text-slate-300">{totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span> to{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-300">{Math.min(currentPage * pageSize, totalItems)}</span> of{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-300">{totalItems}</span> records
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              Previous
            </button>
            <span className="px-2 font-medium text-slate-700 dark:text-slate-300">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Receive / Return Book Modal */}
      {returnModalOpen && targetIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Process Student Book Return
              </h2>
              <button
                onClick={() => setReturnModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitReturn} className="p-4 space-y-3.5 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="font-semibold text-slate-900 dark:text-white">
                  {targetIssue.book_title}
                </div>
                <div className="text-[11px] text-slate-500">
                  Student: <span className="font-medium text-slate-700 dark:text-slate-300">{targetIssue.student_name}</span> (Reg: {targetIssue.student_reg || 'N/A'})
                </div>
                <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span>Due: {targetIssue.due_date ? new Date(targetIssue.due_date).toLocaleDateString() : 'N/A'}</span>
                  {new Date(targetIssue.due_date) < new Date() && (
                    <span className="text-rose-600 dark:text-rose-400 font-semibold">Overdue Assessment</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Physical Condition Inspection
                </label>
                <input
                  type="text"
                  value={conditionNote}
                  onChange={(e) => setConditionNote(e.target.value)}
                  placeholder="e.g. Good condition, pages intact, minor cover wear"
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-slate-400 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Overdue / Damage Fine (৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={fineAmount}
                    onChange={(e) => setFineAmount(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-slate-400 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Fine Payment Status
                  </label>
                  <select
                    value={fineStatus}
                    onChange={(e) => setFineStatus(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 text-slate-900 dark:text-white"
                  >
                    <option value="none">None (0.00)</option>
                    <option value="pending">Pending Collection</option>
                    <option value="paid">Paid &amp; Cleared</option>
                    <option value="waived">Waived by Admin</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setReturnModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-medium disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {submitting ? 'Restoring Stock...' : 'Confirm Return & Restore Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return Receipt Details Modal */}
      {detailsModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Circulation Return Receipt
              </h2>
              <button
                onClick={() => setDetailsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>
            <div className="p-4 space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
              <div>
                <span className="text-[10px] uppercase text-slate-400 block">Book Title</span>
                <span className="font-semibold text-slate-900 dark:text-white">{selectedRecord.book_title}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block">Student</span>
                  <span className="font-medium text-slate-900 dark:text-white">{selectedRecord.student_name}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block">Reg Number</span>
                  <span className="font-mono">{selectedRecord.student_reg || 'N/A'}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block">Issue Date</span>
                  <span className="font-mono">{selectedRecord.issue_date ? new Date(selectedRecord.issue_date).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block">Return Date</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">{selectedRecord.actual_return_date ? new Date(selectedRecord.actual_return_date).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 block">Condition Note</span>
                <span>{selectedRecord.condition_note || 'None recorded'}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block">Fine Assessment</span>
                  <span className="font-mono font-semibold">৳{selectedRecord.fine_amount || '0'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block">Fine Status</span>
                  <span className="uppercase text-[11px] font-medium">{selectedRecord.fine_status || 'none'}</span>
                </div>
              </div>
              <div className="pt-2 text-right">
                <button
                  onClick={() => setDetailsModalOpen(false)}
                  className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 text-xs font-medium cursor-pointer"
                >
                  Close Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl p-4 text-xs space-y-3">
            <h2 className="text-sm font-semibold text-rose-600 dark:text-rose-400">
              Delete Circulation Record
            </h2>
            <p className="text-slate-600 dark:text-slate-300">
              Are you sure you want to delete this circulation record for book{' '}
              <strong className="text-slate-900 dark:text-white">"{deleteTarget.book_title}"</strong>?
              If this book was actively issued, removing the issue will restore the catalog copy.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteIssue}
                disabled={submitting}
                className="px-3.5 py-1.5 rounded bg-rose-600 hover:bg-rose-700 text-white font-medium disabled:opacity-50 cursor-pointer"
              >
                {submitting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
