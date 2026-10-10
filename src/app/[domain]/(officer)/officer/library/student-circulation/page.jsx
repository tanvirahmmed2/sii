'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';

export default function OfficerStudentCirculationPage() {
  const [issues, setIssues] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'issued' | 'overdue' | 'returned'
  const [feedback, setFeedback] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Issue Modal
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [targetSearch, setTargetSearch] = useState('');
  const [targetList, setTargetList] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);

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
  const [targetIssue, setTargetIssue] = useState(null);
  const [fineAmount, setFineAmount] = useState('0');
  const [fineStatus, setFineStatus] = useState('none');
  const [conditionNote, setConditionNote] = useState('Good condition, verified intact.');

  // Delete Modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);

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
        setFeedback({ type: 'error', message: data.error || 'Failed to load circulation records.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error while loading student circulation.' });
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

  // Autocomplete Student Search
  useEffect(() => {
    if (!issueModalOpen) return;
    const fetchStudents = async () => {
      try {
        const res = await fetch(`/api/library/search-targets?type=students&q=${encodeURIComponent(targetSearch)}`);
        const data = await res.json();
        if (data.success) setTargetList(data.targets || []);
      } catch (err) {
        console.error('Error searching students:', err);
      }
    };
    const timer = setTimeout(fetchStudents, 250);
    return () => clearTimeout(timer);
  }, [targetSearch, issueModalOpen]);

  // Autocomplete Book Search
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

  const filteredIssues = useMemo(() => {
    return issues.filter((iss) => {
      const matchSearch =
        !searchTerm ||
        iss.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        iss.student_reg?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        iss.book_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        iss.book_isbn?.toLowerCase().includes(searchTerm.toLowerCase());
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

  const handleOpenIssueModal = () => {
    setSelectedStudent(null);
    setTargetSearch('');
    setSelectedBook(null);
    setBookSearch('');
    setRemarks('');
    const d = new Date();
    d.setDate(d.getDate() + 14);
    setDueDate(d.toISOString().split('T')[0]);
    setIssueModalOpen(true);
  };

  const handleSubmitIssue = async (e) => {
    e.preventDefault();
    if (!selectedStudent || !selectedBook) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/library/student-circulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'issue',
          student_id: selectedStudent.id,
          book_id: selectedBook.id,
          due_date: dueDate,
          remarks,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: `Book issued successfully to ${selectedStudent.name}.` });
        setIssueModalOpen(false);
        loadIssues();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to issue book.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error while issuing book.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenReturnModal = (iss) => {
    setTargetIssue(iss);
    const isOverdue = new Date(iss.due_date) < new Date();
    if (isOverdue) {
      const diffDays = Math.ceil(Math.abs(new Date() - new Date(iss.due_date)) / (1000 * 60 * 60 * 24));
      setFineAmount((diffDays * 5).toString());
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
        setFeedback({ type: 'success', message: 'Book returned and stock restored.' });
        setReturnModalOpen(false);
        loadIssues();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to process return.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error while returning book.' });
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
        setFeedback({ type: 'success', message: 'Record deleted successfully.' });
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
          <div className="flex items-center gap-2">
            <Link href="/officer/library" className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
              ← Officer Library
            </Link>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-xs font-semibold text-slate-900 dark:text-white">Student Circulation</span>
          </div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-white mt-1">
            Officer Student Circulation Desk
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Issue library catalog books to enrolled students, inspect returns, record overdue penalties, and restore shelf stock.
          </p>
        </div>
        <button
          onClick={handleOpenIssueModal}
          className="px-3.5 py-1.5 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition cursor-pointer self-start sm:self-auto shadow-2xs"
        >
          + Issue Book to Student
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Total Loans</p>
          <div className="text-lg font-semibold text-slate-900 dark:text-white font-mono mt-1">{metrics.total_issues || issues.length}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Active Loans</p>
          <div className="text-lg font-semibold text-blue-600 dark:text-blue-400 font-mono mt-1">{metrics.active_issues || 0}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Overdue</p>
          <div className="text-lg font-semibold text-rose-600 dark:text-rose-400 font-mono mt-1">{metrics.overdue_issues || 0}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Returned</p>
          <div className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 font-mono mt-1">{metrics.returned_count || 0}</div>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-2.5 rounded text-xs flex items-center justify-between border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-[10px] font-semibold underline ml-2 cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Toolbar & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Search student, reg, book title, ISBN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Records</option>
              <option value="issued">Issued Only</option>
              <option value="overdue">Overdue Only</option>
              <option value="returned">Returned Only</option>
            </select>

            <button
              onClick={loadIssues}
              className="px-2.5 py-1.5 rounded text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2">Student</th>
                <th className="px-3 py-2">Book Title</th>
                <th className="px-3 py-2">Issue Date</th>
                <th className="px-3 py-2">Due Date</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-xs text-slate-400">
                    Loading student circulation records...
                  </td>
                </tr>
              ) : paginatedIssues.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-xs text-slate-400">
                    No circulation records found.
                  </td>
                </tr>
              ) : (
                paginatedIssues.map((iss) => {
                  const isOverdue = iss.status === 'overdue' || (iss.status === 'issued' && new Date(iss.due_date) < new Date());
                  const isReturned = iss.status === 'returned';

                  return (
                    <tr key={iss.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-slate-900 dark:text-white">{iss.student_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">Reg: {iss.student_reg || 'N/A'}</div>
                      </td>

                      <td className="px-3 py-2.5">
                        <div className="font-medium text-slate-900 dark:text-white max-w-[200px] truncate">{iss.book_title}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {iss.book_isbn ? `ISBN: ${iss.book_isbn}` : ''} {iss.book_shelf ? `• Rack: ${iss.book_shelf}` : ''}
                        </div>
                      </td>

                      <td className="px-3 py-2.5 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {iss.issue_date ? new Date(iss.issue_date).toLocaleDateString() : 'N/A'}
                      </td>

                      <td className="px-3 py-2.5 font-mono text-[11px]">
                        <span className={isOverdue && !isReturned ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-slate-700 dark:text-slate-300'}>
                          {iss.due_date ? new Date(iss.due_date).toLocaleDateString() : 'N/A'}
                        </span>
                      </td>

                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium border ${
                            isReturned
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                              : isOverdue
                              ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
                              : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800'
                          }`}
                        >
                          {isReturned ? 'Returned' : isOverdue ? 'Overdue' : 'Issued'}
                        </span>
                      </td>

                      <td className="px-3 py-2.5 text-right space-x-1 whitespace-nowrap">
                        {!isReturned && (
                          <button
                            onClick={() => handleOpenReturnModal(iss)}
                            className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 cursor-pointer"
                          >
                            Receive
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteTarget(iss)}
                          className="px-2 py-0.5 rounded text-[10px] font-medium border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
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

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          <div>
            Showing {totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, totalItems)} of {totalItems} loans
          </div>
          <div className="flex items-center gap-1.5 font-mono">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Previous
            </button>
            <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded font-semibold text-slate-900 dark:text-white">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Next
            </button>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="ml-2 text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              <option value={5}>5 / page</option>
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>
        </div>
      </div>

      {/* Issue Modal */}
      {issueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded max-w-lg w-full p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Issue Book to Student</h3>
              <button onClick={() => setIssueModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleSubmitIssue} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">Select Student</label>
                {selectedStudent ? (
                  <div className="p-2 rounded bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-blue-900 dark:text-blue-200">{selectedStudent.name}</span>
                      <span className="text-[11px] text-blue-700 dark:text-blue-300 font-mono ml-2">Reg: {selectedStudent.registration_no}</span>
                    </div>
                    <button type="button" onClick={() => setSelectedStudent(null)} className="text-[11px] text-rose-600 hover:underline cursor-pointer">Change</button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      placeholder="Type student name or reg..."
                      value={targetSearch}
                      onChange={(e) => setTargetSearch(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                    {targetList.length > 0 && (
                      <div className="mt-1 max-h-32 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 text-xs">
                        {targetList.map((s) => (
                          <div key={s.id} onClick={() => { setSelectedStudent(s); setTargetList([]); }} className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex justify-between">
                            <span>{s.name}</span>
                            <span className="font-mono text-slate-500">{s.registration_no}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">Select In-Stock Book</label>
                {selectedBook ? (
                  <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-emerald-900 dark:text-emerald-200">{selectedBook.title}</span>
                      <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-mono ml-2">Stock: {selectedBook.available_copies}</span>
                    </div>
                    <button type="button" onClick={() => setSelectedBook(null)} className="text-[11px] text-rose-600 hover:underline cursor-pointer">Change</button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      placeholder="Type book title, ISBN..."
                      value={bookSearch}
                      onChange={(e) => setBookSearch(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                    {bookList.length > 0 && (
                      <div className="mt-1 max-h-32 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 text-xs">
                        {bookList.map((b) => (
                          <div key={b.id} onClick={() => { setSelectedBook(b); setBookList([]); }} className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex justify-between">
                            <span>{b.title}</span>
                            <span className="font-mono text-emerald-600">Stock: {b.available_copies}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">Remarks</label>
                  <input
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setIssueModalOpen(false)} className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs cursor-pointer">Cancel</button>
                <button type="submit" disabled={submitting} className="px-3.5 py-1.5 rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-medium cursor-pointer">
                  {submitting ? 'Issuing...' : 'Issue Book'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {returnModalOpen && targetIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Process Student Return</h3>
              <button onClick={() => setReturnModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer">&times;</button>
            </div>
            <form onSubmit={handleSubmitReturn} className="p-4 space-y-3 text-xs">
              <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <div className="font-semibold text-slate-900 dark:text-white">{targetIssue.book_title}</div>
                <div className="text-slate-500 text-[11px]">Student: {targetIssue.student_name} (Reg: {targetIssue.student_reg || 'N/A'})</div>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">Condition Note</label>
                <input
                  type="text"
                  value={conditionNote}
                  onChange={(e) => setConditionNote(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 text-slate-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">Fine (৳)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={fineAmount}
                    onChange={(e) => setFineAmount(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 font-mono text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">Fine Status</label>
                  <select
                    value={fineStatus}
                    onChange={(e) => setFineStatus(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 text-slate-900 dark:text-white"
                  >
                    <option value="none">None</option>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="waived">Waived</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setReturnModalOpen(false)} className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer">Cancel</button>
                <button type="submit" disabled={submitting} className="px-3.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-medium cursor-pointer">
                  {submitting ? 'Restoring Stock...' : 'Confirm Return'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded max-w-sm w-full p-4 shadow-xl space-y-3">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Delete Issue Record?</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Are you sure you want to delete loan record for <strong>{deleteTarget.book_title}</strong> issued to <strong>{deleteTarget.student_name}</strong>?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button onClick={() => setDeleteTarget(null)} className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs cursor-pointer">Cancel</button>
              <button onClick={handleDeleteIssue} disabled={submitting} className="px-3.5 py-1.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium cursor-pointer">
                {submitting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
