'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';

export default function ManagementLibraryPage() {
  const [stats, setStats] = useState(null);
  const [recentStudentCirc, setRecentStudentCirc] = useState([]);
  const [recentTeacherCirc, setRecentTeacherCirc] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active ledger tab & pagination
  const [activeLedgerTab, setActiveLedgerTab] = useState('student'); // 'student' | 'teacher'
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, studentRes, teacherRes] = await Promise.all([
        fetch('/api/library/stats'),
        fetch('/api/library/student-circulation?limit=100'),
        fetch('/api/library/teacher-circulation?limit=100'),
      ]);

      const [statsData, studentData, teacherData] = await Promise.all([
        statsRes.json(),
        studentRes.json(),
        teacherRes.json(),
      ]);

      if (statsData.success) setStats(statsData.stats);
      if (studentData.success) setRecentStudentCirc(studentData.issues || []);
      if (teacherData.success) setRecentTeacherCirc(teacherData.issues || []);
    } catch {
      setError('Network error while retrieving library management dashboard metrics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeLedgerTab, pageSize, searchTerm]);

  const activeRecords = activeLedgerTab === 'student' ? recentStudentCirc : recentTeacherCirc;

  const filteredRecords = useMemo(() => {
    if (!searchTerm) return activeRecords;
    const term = searchTerm.toLowerCase();
    return activeRecords.filter((rec) => {
      const titleMatch = rec.book_title && rec.book_title.toLowerCase().includes(term);
      const nameMatch = activeLedgerTab === 'student'
        ? (rec.student_name && rec.student_name.toLowerCase().includes(term)) || (rec.student_reg && rec.student_reg.toLowerCase().includes(term))
        : (rec.teacher_name && rec.teacher_name.toLowerCase().includes(term)) || (rec.teacher_email && rec.teacher_email.toLowerCase().includes(term));
      return titleMatch || nameMatch;
    });
  }, [activeRecords, searchTerm, activeLedgerTab]);

  const totalItems = filteredRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-white">
            Library Management &amp; Executive Hub
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Central operational overview for campus library inventory, shelf rack capacities, circulation metrics, and quick desk access.
          </p>
        </div>
        <button
          onClick={loadDashboardData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
        >
          <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh Statistics
        </button>
      </div>

      {error && (
        <div className="p-2.5 rounded text-xs bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
          {error}
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Catalog Titles</p>
          <div className="text-lg font-semibold text-slate-900 dark:text-white font-mono mt-0.5">
            {stats ? stats.total_books : '—'}
          </div>
          <span className="text-[10px] text-slate-500">Unique accessions</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Total Copies</p>
          <div className="text-lg font-semibold text-slate-900 dark:text-white font-mono mt-0.5">
            {stats ? stats.total_copies : '—'}
          </div>
          <span className="text-[10px] text-slate-500">Physical volumes</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Available on Shelf</p>
          <div className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
            {stats ? stats.available_copies : '—'}
          </div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Ready to borrow</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Books Borrowed</p>
          <div className="text-lg font-semibold text-blue-600 dark:text-blue-400 font-mono mt-0.5">
            {stats ? stats.borrowed_copies : '—'}
          </div>
          <span className="text-[10px] text-blue-600 dark:text-blue-400">Active loans</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Overdue Holds</p>
          <div className="text-lg font-semibold text-rose-600 dark:text-rose-400 font-mono mt-0.5">
            {stats ? (Number(stats.student_overdue_issues || 0) + Number(stats.teacher_overdue_issues || 0)) : '—'}
          </div>
          <span className="text-[10px] text-rose-600 dark:text-rose-400">Past return deadline</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Shelf Racks</p>
          <div className="text-lg font-semibold text-slate-900 dark:text-white font-mono mt-0.5">
            {stats ? stats.total_shelves || '—' : '—'}
          </div>
          <span className="text-[10px] text-slate-500">Capacity: {stats?.total_shelf_capacity || 0}</span>
        </div>
      </div>

      {/* Operational Desks Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs space-y-3">
        <h2 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
          Dedicated Workstation Desks
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <Link
            href="/staff-panel/library-books"
            className="p-3 rounded border border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800 transition block group"
          >
            <div className="font-semibold text-xs text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center justify-between">
              <span>Books &amp; Catalog</span>
              <span className="text-[10px] font-mono text-slate-400">→</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Add catalog titles, ISBN, barcodes, call numbers, and adjust stock copies.
            </p>
          </Link>

          <Link
            href="/staff-panel/library-bookshelf"
            className="p-3 rounded border border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800 transition block group"
          >
            <div className="font-semibold text-xs text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center justify-between">
              <span>Book Shelves &amp; Racks</span>
              <span className="text-[10px] font-mono text-slate-400">→</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Manage physical shelf racks, room locations, capacities, and live occupancy bars.
            </p>
          </Link>

          <Link
            href="/staff-panel/library-student-issue"
            className="p-3 rounded border border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800 transition block group"
          >
            <div className="font-semibold text-xs text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center justify-between">
              <span>Student Issue Desk</span>
              <span className="text-[10px] font-mono text-slate-400">→</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Autocomplete student checkouts, due date enforcement, and stock decrement.
            </p>
          </Link>

          <Link
            href="/staff-panel/library-student-return"
            className="p-3 rounded border border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800 transition block group"
          >
            <div className="font-semibold text-xs text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center justify-between">
              <span>Student Return Desk</span>
              <span className="text-[10px] font-mono text-slate-400">→</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Check in returned volumes, inspect physical condition, assess fines, restore stock.
            </p>
          </Link>

          <Link
            href="/staff-panel/library-teacher-issue"
            className="p-3 rounded border border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800 transition block group"
          >
            <div className="font-semibold text-xs text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center justify-between">
              <span>Faculty Issue Desk</span>
              <span className="text-[10px] font-mono text-slate-400">→</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Issue syllabus and reference books to faculty members with custom borrowing windows.
            </p>
          </Link>

          <Link
            href="/staff-panel/library-teacher-return"
            className="p-3 rounded border border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800 transition block group"
          >
            <div className="font-semibold text-xs text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center justify-between">
              <span>Faculty Return Desk</span>
              <span className="text-[10px] font-mono text-slate-400">→</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Process faculty check-ins and return logs, incrementing shelf inventory.
            </p>
          </Link>

          <Link
            href="/staff-panel/library-book-category"
            className="p-3 rounded border border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800 transition block group"
          >
            <div className="font-semibold text-xs text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center justify-between">
              <span>Book Categories</span>
              <span className="text-[10px] font-mono text-slate-400">→</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Subject classifications, Dewey decimal sections, and genre taxonomies.
            </p>
          </Link>

          <Link
            href="/staff-panel/library-book-writer"
            className="p-3 rounded border border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800 transition block group"
          >
            <div className="font-semibold text-xs text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center justify-between">
              <span>Writers &amp; Authors</span>
              <span className="text-[10px] font-mono text-slate-400">→</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Author registry, biographies, nationalities, and linked publication records.
            </p>
          </Link>
        </div>
      </div>

      {/* Circulation Ledger */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-2xs overflow-hidden">
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
              Circulation Ledger Activity
            </h3>
            <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded p-0.5 bg-slate-50 dark:bg-slate-800 text-xs">
              <button
                onClick={() => setActiveLedgerTab('student')}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  activeLedgerTab === 'student'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Students ({recentStudentCirc.length})
              </button>
              <button
                onClick={() => setActiveLedgerTab('teacher')}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  activeLedgerTab === 'teacher'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Faculty ({recentTeacherCirc.length})
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder={`Search ${activeLedgerTab} circulation...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden"
            />
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="text-xs px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              <option value={5}>5 / page</option>
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-3">Borrower</th>
                <th className="py-2.5 px-3">Book Title</th>
                <th className="py-2.5 px-3">Issue Date</th>
                <th className="py-2.5 px-3">Due Date</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Return / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-500">
                    Loading circulation ledger records...
                  </td>
                </tr>
              ) : paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-500">
                    No circulation activity records found.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((item) => {
                  const isOverdue = item.status === 'overdue' || (item.status === 'issued' && new Date(item.due_date) < new Date());
                  const isReturned = item.status === 'returned';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-900 dark:text-white">
                          {activeLedgerTab === 'student' ? item.student_name : item.teacher_name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {activeLedgerTab === 'student'
                            ? `Reg: ${item.student_reg || 'N/A'}`
                            : item.teacher_email || item.teacher_phone || 'Faculty'}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-900 dark:text-white max-w-[200px] truncate">
                          {item.book_title}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {item.book_isbn ? `ISBN: ${item.book_isbn}` : ''}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {item.issue_date ? new Date(item.issue_date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px]">
                        <span className={isOverdue && !isReturned ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-slate-600 dark:text-slate-400'}>
                          {item.due_date ? new Date(item.due_date).toLocaleDateString() : 'N/A'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {isReturned ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            Returned
                          </span>
                        ) : isOverdue ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            Overdue
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            Issued
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {isReturned ? (
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                            {item.actual_return_date ? new Date(item.actual_return_date).toLocaleDateString() : 'Restored'}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Pending return</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
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
    </div>
  );
}
