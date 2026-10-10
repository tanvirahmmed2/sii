'use client';

import React, { useState, useEffect, useCallback } from 'react';

export default function LibraryCirculationWorkstation({ targetType = 'student', defaultTab = 'all' }) {
  const isStudent = targetType === 'student';
  const apiBase = isStudent
    ? '/api/library/student-circulation'
    : '/api/library/teacher-circulation';

  const [activeTab, setActiveTab] = useState(defaultTab); // 'all' | 'issued' | 'overdue' | 'returned'
  const [issues, setIssues] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [feedback, setFeedback] = useState(null);

  // Issue Modal
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [targetSearch, setTargetSearch] = useState('');
  const [targetList, setTargetList] = useState([]);
  const [selectedTarget, setSelectedTarget] = useState(null);

  const [bookSearch, setBookSearch] = useState('');
  const [bookList, setBookList] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);

  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [remarks, setRemarks] = useState('');

  // Return Modal
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [currentIssueForReturn, setCurrentIssueForReturn] = useState(null);
  const [fineAmount, setFineAmount] = useState('0.00');
  const [fineStatus, setFineStatus] = useState('none');
  const [conditionNote, setConditionNote] = useState('');

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Load Issues
  const loadCirculation = useCallback(async () => {
    setLoading(true);
    try {
      const url = `${apiBase}?search=${encodeURIComponent(searchTerm)}&status=${activeTab}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setIssues(data.issues || []);
        if (data.metrics) setMetrics(data.metrics);
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to load circulation records.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error while loading circulation records.' });
    } finally {
      setLoading(false);
    }
  }, [apiBase, searchTerm, activeTab]);

  useEffect(() => {
    loadCirculation();
  }, [loadCirculation]);

  // Autocomplete Target Search
  useEffect(() => {
    if (!issueModalOpen) return;
    const fetchTargets = async () => {
      try {
        const type = isStudent ? 'students' : 'teachers';
        const res = await fetch(`/api/library/search-targets?type=${type}&q=${encodeURIComponent(targetSearch)}`);
        const data = await res.json();
        if (data.success) setTargetList(data.targets || []);
      } catch (err) {
        console.error('Error searching targets:', err);
      }
    };
    const timer = setTimeout(fetchTargets, 250);
    return () => clearTimeout(timer);
  }, [targetSearch, issueModalOpen, isStudent]);

  // Autocomplete Book Search (In-Stock Only)
  useEffect(() => {
    if (!issueModalOpen) return;
    const fetchBooks = async () => {
      try {
        const res = await fetch(`/api/library/search-targets?type=books&in_stock_only=true&q=${encodeURIComponent(bookSearch)}`);
        const data = await res.json();
        if (data.success) setBookList(data.targets || []);
      } catch (err) {
        console.error('Error searching books:', err);
      }
    };
    const timer = setTimeout(fetchBooks, 250);
    return () => clearTimeout(timer);
  }, [bookSearch, issueModalOpen]);

  const handleOpenIssueModal = () => {
    setSelectedTarget(null);
    setTargetSearch('');
    setSelectedBook(null);
    setBookSearch('');
    setRemarks('');
    const d = new Date();
    d.setDate(d.getDate() + 14);
    setDueDate(d.toISOString().split('T')[0]);
    setIssueModalOpen(true);
  };

  const handleOpenReturnModal = (issue) => {
    setCurrentIssueForReturn(issue);
    const overdueDays = issue.days_overdue || 0;
    // Suggest fine: $5 / 5 BDT per overdue day if overdue
    const suggestedFine = overdueDays > 0 ? (overdueDays * 5).toFixed(2) : '0.00';
    setFineAmount(suggestedFine);
    setFineStatus(overdueDays > 0 ? 'pending' : 'none');
    setConditionNote('Good condition');
    setReturnModalOpen(true);
  };

  const handleSubmitIssue = async (e) => {
    e.preventDefault();
    if (!selectedTarget) {
      setFeedback({ type: 'error', message: `Please select a valid ${isStudent ? 'student' : 'teacher'}.` });
      return;
    }
    if (!selectedBook) {
      setFeedback({ type: 'error', message: 'Please select an available book to issue.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    const payload = {
      action: 'issue',
      book_id: selectedBook.id,
      due_date: dueDate,
      remarks,
      ...(isStudent ? { student_id: selectedTarget.id } : { teacher_id: selectedTarget.id }),
    };

    try {
      const res = await fetch(apiBase, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: 'success',
          message: `Book "${selectedBook.title}" issued successfully to ${selectedTarget.name}. Remaining available stock: ${data.updated_stock?.available_copies}.`
        });
        setIssueModalOpen(false);
        loadCirculation();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to issue book.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error while submitting issue.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReturn = async (e) => {
    e.preventDefault();
    if (!currentIssueForReturn) return;

    setSubmitting(true);
    setFeedback(null);

    const payload = {
      action: 'return',
      issue_id: currentIssueForReturn.id,
      fine_amount: parseFloat(fineAmount) || 0.00,
      fine_status: fineStatus,
      condition_note: conditionNote,
    };

    try {
      const res = await fetch(apiBase, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: 'success',
          message: `Book "${currentIssueForReturn.book_title}" returned successfully. Available stock restored to ${data.updated_stock?.available_copies}.`
        });
        setReturnModalOpen(false);
        loadCirculation();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to process return.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error while submitting return.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteIssue = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${apiBase}?id=${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: data.message || 'Issue record deleted.' });
        setDeleteTarget(null);
        loadCirculation();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to delete issue.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error during deletion.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            Total {isStudent ? 'Student' : 'Faculty'} Loans
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-slate-900 dark:text-white font-mono">
              {metrics.total_issues || 0}
            </span>
            <span className="text-[10px] font-medium text-slate-500">All-Time</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            Active Issued Loans
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-blue-600 dark:text-blue-400 font-mono">
              {metrics.active_issues || 0}
            </span>
            <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">On Loan</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            Overdue Loans
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-rose-600 dark:text-rose-400 font-mono">
              {metrics.overdue_issues || 0}
            </span>
            <span className="text-[10px] font-medium text-rose-600 dark:text-rose-400">Action Required</span>
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
            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">Returned</span>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3 rounded text-xs border flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-[10px] uppercase font-mono font-bold hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <input
              type="text"
              placeholder={`Search loans by book title, ISBN, or ${isStudent ? 'student name / reg #' : 'teacher name'}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400 transition"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="inline-flex rounded border border-slate-300 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800 text-xs">
              {[
                { key: 'all', label: 'All' },
                { key: 'issued', label: 'Issued' },
                { key: 'overdue', label: 'Overdue' },
                { key: 'returned', label: 'Returned' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                    activeTab === tab.key
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleOpenIssueModal}
              className="px-3 py-1.5 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition-colors cursor-pointer shrink-0"
            >
              + Issue Book to {isStudent ? 'Student' : 'Teacher'}
            </button>
          </div>
        </div>

        {/* High-Density Circulation Table */}
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2.5">Book Title & Accession</th>
                <th className="px-3 py-2.5">{isStudent ? 'Student Borrower' : 'Teacher Borrower'}</th>
                <th className="px-3 py-2.5">Issued By</th>
                <th className="px-3 py-2.5">Issue Date</th>
                <th className="px-3 py-2.5">Due Date</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-slate-400">
                    Loading circulation logs...
                  </td>
                </tr>
              ) : issues.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-slate-400">
                    No circulation records found in this view.
                  </td>
                </tr>
              ) : (
                issues.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-slate-900 dark:text-white">{row.book_title}</div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {row.book_isbn && <span>ISBN: {row.book_isbn} </span>}
                        {row.book_shelf && <span>Shelf: {row.book_shelf}</span>}
                      </div>
                    </td>

                    <td className="px-3 py-2.5">
                      {isStudent ? (
                        <div>
                          <div className="font-medium text-slate-900 dark:text-white">
                            {row.student_name || 'Student'}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">
                            Reg: {row.registration_no} {row.roll_no ? `| Roll: ${row.roll_no}` : ''}
                            {row.class_name ? ` (${row.class_name})` : ''}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="font-medium text-slate-900 dark:text-white">
                            {row.teacher_name || 'Faculty Member'}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">
                            {row.teacher_email || row.teacher_phone || ''}
                          </div>
                        </div>
                      )}
                    </td>

                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400 text-[11px]">
                      <div>{row.issued_by_name || 'Staff'}</div>
                      <div className="text-[9px] uppercase font-mono text-slate-400">
                        {row.issued_by_type}
                      </div>
                    </td>

                    <td className="px-3 py-2.5 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                      {row.issue_date ? String(row.issue_date).slice(0, 10) : '—'}
                    </td>

                    <td className="px-3 py-2.5 font-mono text-[11px]">
                      <div className={row.computed_status === 'overdue' ? 'text-rose-600 font-semibold' : 'text-slate-600 dark:text-slate-400'}>
                        {row.due_date ? String(row.due_date).slice(0, 10) : '—'}
                      </div>
                      {row.computed_status === 'overdue' && (
                        <div className="text-[10px] text-rose-500 font-mono">
                          +{row.days_overdue} days overdue
                        </div>
                      )}
                    </td>

                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium border ${
                          row.computed_status === 'returned'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                            : row.computed_status === 'overdue'
                            ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
                            : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800'
                        }`}
                      >
                        {row.computed_status === 'returned'
                          ? 'Returned'
                          : row.computed_status === 'overdue'
                          ? 'Overdue'
                          : 'Issued'}
                      </span>
                    </td>

                    <td className="px-3 py-2.5 text-right space-x-1.5 whitespace-nowrap">
                      {row.status !== 'returned' ? (
                        <button
                          onClick={() => handleOpenReturnModal(row)}
                          className="px-2.5 py-0.5 rounded text-[11px] font-medium bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                        >
                          Return Book
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-mono">
                          Ret. {String(row.actual_return_date || row.return_date || '').slice(0, 10)}
                        </span>
                      )}
                      <button
                        onClick={() => setDeleteTarget(row)}
                        className="px-1.5 py-0.5 rounded text-[11px] text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                        title="Delete Record"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Count */}
        <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
          Showing {issues.length} circulation records
        </div>
      </div>

      {/* Issue Book Modal */}
      {issueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded max-w-lg w-full p-4 shadow-lg space-y-3 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Issue Book to {isStudent ? 'Student' : 'Teacher'}
              </h3>
              <button
                onClick={() => setIssueModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitIssue} className="space-y-3">
              {/* Target Autocomplete */}
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Step 1: Select {isStudent ? 'Student' : 'Faculty Member'} *
                </label>
                {selectedTarget ? (
                  <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-white">
                        {selectedTarget.name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {isStudent
                          ? `Reg: ${selectedTarget.registration_no} | Class: ${selectedTarget.class_name || 'N/A'}`
                          : `${selectedTarget.email || selectedTarget.phone || ''}`}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedTarget(null)}
                      className="text-xs text-rose-600 hover:underline cursor-pointer"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <input
                      type="text"
                      placeholder={`Type to search ${isStudent ? 'registration no, roll, name...' : 'faculty name, email, phone...'}`}
                      value={targetSearch}
                      onChange={(e) => setTargetSearch(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                    <div className="max-h-36 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-800">
                      {targetList.length === 0 ? (
                        <div className="p-2 text-[11px] text-slate-400 text-center">
                          {targetSearch ? 'No matches found.' : 'Start typing to search borrower...'}
                        </div>
                      ) : (
                        targetList.map((t) => (
                          <div
                            key={t.id}
                            onClick={() => setSelectedTarget(t)}
                            className="p-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer flex items-center justify-between"
                          >
                            <div>
                              <div className="font-medium text-slate-900 dark:text-white">{t.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {isStudent ? `Reg: ${t.registration_no}` : t.email || t.phone}
                              </div>
                            </div>
                            <span className="text-[10px] text-blue-600 font-medium">Select</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Book Autocomplete */}
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Step 2: Select Available Book Title *
                </label>
                {selectedBook ? (
                  <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-white">
                        {selectedBook.title}
                      </div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                        Available Stock: {selectedBook.available_copies} / {selectedBook.total_copies}
                        {selectedBook.shelf_location ? ` | Shelf: ${selectedBook.shelf_location}` : ''}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedBook(null)}
                      className="text-xs text-rose-600 hover:underline cursor-pointer"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <input
                      type="text"
                      placeholder="Type book title, ISBN, or shelf location..."
                      value={bookSearch}
                      onChange={(e) => setBookSearch(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                    <div className="max-h-36 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-800">
                      {bookList.length === 0 ? (
                        <div className="p-2 text-[11px] text-slate-400 text-center">
                          {bookSearch ? 'No available books found.' : 'Start typing to search available books...'}
                        </div>
                      ) : (
                        bookList.map((b) => (
                          <div
                            key={b.id}
                            onClick={() => setSelectedBook(b)}
                            className="p-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer flex items-center justify-between"
                          >
                            <div>
                              <div className="font-medium text-slate-900 dark:text-white">{b.title}</div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                Avail: {b.available_copies}/{b.total_copies} | {b.shelf_location || 'Shelf N/A'}
                              </div>
                            </div>
                            <span className="text-[10px] text-emerald-600 font-medium">Select</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Due Date & Remarks */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Remarks / Condition
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Clean copy, Term 1 loan"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-[11px] text-blue-800 dark:text-blue-300">
                Notice: Issuing this title will automatically reduce its available shelf stock by 1 copy.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIssueModalOpen(false)}
                  className="px-3 py-1.5 rounded text-xs border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedTarget || !selectedBook}
                  className="px-3 py-1.5 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Issuing...' : 'Issue Book'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return Book Modal */}
      {returnModalOpen && currentIssueForReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded max-w-md w-full p-4 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Process Book Return
              </h3>
              <button
                onClick={() => setReturnModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-200 dark:border-slate-800 text-xs space-y-1">
              <div className="font-semibold text-slate-900 dark:text-white">
                {currentIssueForReturn.book_title}
              </div>
              <div className="text-slate-600 dark:text-slate-400">
                Borrower: <strong>{isStudent ? currentIssueForReturn.student_name : currentIssueForReturn.teacher_name}</strong>
              </div>
              <div className="text-[11px] font-mono text-slate-500">
                Due: {String(currentIssueForReturn.due_date).slice(0, 10)}
                {currentIssueForReturn.days_overdue > 0 && (
                  <span className="text-rose-600 font-bold ml-2">
                    ({currentIssueForReturn.days_overdue} days overdue)
                  </span>
                )}
              </div>
            </div>

            <form onSubmit={handleSubmitReturn} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Fine Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={fineAmount}
                    onChange={(e) => setFineAmount(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Fine Status
                  </label>
                  <select
                    value={fineStatus}
                    onChange={(e) => setFineStatus(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="none">No Fine</option>
                    <option value="pending">Pending Collection</option>
                    <option value="paid">Collected (Paid)</option>
                    <option value="waived">Waived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Book Condition Assessment
                </label>
                <input
                  type="text"
                  value={conditionNote}
                  onChange={(e) => setConditionNote(e.target.value)}
                  placeholder="e.g. Intact, Minor spine wear, Missing cover"
                  className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="p-2.5 rounded bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-[11px] text-emerald-800 dark:text-emerald-300">
                Notice: Processing return will immediately increment the available inventory copies by 1 and mark the loan completed.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setReturnModalOpen(false)}
                  className="px-3 py-1.5 rounded text-xs border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3 py-1.5 rounded text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Processing...' : 'Confirm Return'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded max-w-sm w-full p-4 shadow-lg space-y-3">
            <h3 className="text-sm font-semibold text-rose-600 dark:text-rose-400">
              Confirm Loan Record Deletion
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Are you sure you want to delete this issue record for <strong>{deleteTarget.book_title}</strong>?
            </p>
            {deleteTarget.status !== 'returned' && (
              <div className="p-2 rounded bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 text-[11px]">
                Note: Since this book was not yet returned, the copy will automatically be restored to available inventory.
              </div>
            )}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-3 py-1.5 rounded text-xs border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDeleteIssue}
                className="px-3 py-1.5 rounded text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
