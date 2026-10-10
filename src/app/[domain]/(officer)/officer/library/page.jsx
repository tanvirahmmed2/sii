'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';

export default function OfficerLibraryPage() {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'books' | 'shelves' | 'students' | 'faculty'
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  // Tab Data States
  const [books, setBooks] = useState([]);
  const [shelves, setShelves] = useState([]);
  const [studentCirc, setStudentCirc] = useState([]);
  const [teacherCirc, setTeacherCirc] = useState([]);

  // Search & Pagination per tab
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, booksRes, shelvesRes, studentRes, teacherRes] = await Promise.all([
        fetch('/api/library/stats').then((r) => r.json()),
        fetch('/api/library/books?limit=100').then((r) => r.json()),
        fetch('/api/library/shelves?limit=100').then((r) => r.json()),
        fetch('/api/library/student-circulation?limit=100').then((r) => r.json()),
        fetch('/api/library/teacher-circulation?limit=100').then((r) => r.json()),
      ]);

      if (statsRes.success) setStats(statsRes.stats);
      if (booksRes.success) setBooks(booksRes.books || []);
      if (shelvesRes.success) setShelves(shelvesRes.shelves || []);
      if (studentRes.success) setStudentCirc(studentRes.issues || []);
      if (teacherRes.success) setTeacherCirc(teacherRes.issues || []);
    } catch {
      setFeedback({ type: 'error', message: 'Network error while loading officer library statistics.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    setCurrentPage(1);
    setSearchTerm('');
  }, [activeTab, pageSize]);

  // Tab Records & Pagination
  const activeDataset = useMemo(() => {
    if (activeTab === 'books') return books;
    if (activeTab === 'shelves') return shelves;
    if (activeTab === 'students') return studentCirc;
    if (activeTab === 'faculty') return teacherCirc;
    return [];
  }, [activeTab, books, shelves, studentCirc, teacherCirc]);

  const filteredDataset = useMemo(() => {
    if (!searchTerm) return activeDataset;
    const term = searchTerm.toLowerCase();
    return activeDataset.filter((item) => {
      if (activeTab === 'books') {
        return item.title?.toLowerCase().includes(term) || item.isbn?.toLowerCase().includes(term) || item.writer_name?.toLowerCase().includes(term);
      }
      if (activeTab === 'shelves') {
        return item.shelf_name?.toLowerCase().includes(term) || item.shelf_code?.toLowerCase().includes(term) || item.room?.toLowerCase().includes(term);
      }
      if (activeTab === 'students') {
        return item.student_name?.toLowerCase().includes(term) || item.student_reg?.toLowerCase().includes(term) || item.book_title?.toLowerCase().includes(term);
      }
      if (activeTab === 'faculty') {
        return item.teacher_name?.toLowerCase().includes(term) || item.book_title?.toLowerCase().includes(term) || item.teacher_email?.toLowerCase().includes(term);
      }
      return true;
    });
  }, [activeDataset, searchTerm, activeTab]);

  const totalItems = filteredDataset.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedDataset = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDataset.slice(start, start + pageSize);
  }, [filteredDataset, currentPage, pageSize]);

  return (
    <div className="w-full space-y-4">
      {/* Title */}
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-white">
            Officer Library Operations Portal
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Operational center for catalog titles, inventory copies, rack allocations, and student/faculty borrowing desks.
          </p>
        </div>
        <button
          onClick={loadInitialData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
        >
          <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh Data
        </button>
      </div>

      {feedback && (
        <div className="p-2.5 rounded text-xs bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
          {feedback.message}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Catalog Titles</p>
          <div className="text-lg font-semibold text-slate-900 dark:text-white font-mono mt-0.5">
            {stats ? stats.total_books : books.length}
          </div>
          <span className="text-[10px] text-slate-500">Accession Items</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Total Copies</p>
          <div className="text-lg font-semibold text-slate-900 dark:text-white font-mono mt-0.5">
            {stats ? stats.total_copies : '—'}
          </div>
          <span className="text-[10px] text-slate-500">Physical Stock</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Available</p>
          <div className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
            {stats ? stats.available_copies : '—'}
          </div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400">On Shelves</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Borrowed</p>
          <div className="text-lg font-semibold text-blue-600 dark:text-blue-400 font-mono mt-0.5">
            {stats ? stats.borrowed_copies : '—'}
          </div>
          <span className="text-[10px] text-blue-600 dark:text-blue-400">In Circulation</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Overdue</p>
          <div className="text-lg font-semibold text-rose-600 dark:text-rose-400 font-mono mt-0.5">
            {stats ? (Number(stats.student_overdue_issues || 0) + Number(stats.teacher_overdue_issues || 0)) : '—'}
          </div>
          <span className="text-[10px] text-rose-600 dark:text-rose-400">Late Returns</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Racks</p>
          <div className="text-lg font-semibold text-slate-900 dark:text-white font-mono mt-0.5">
            {stats ? stats.total_shelves : shelves.length}
          </div>
          <span className="text-[10px] text-slate-500">Cap: {stats?.total_shelf_capacity || '—'}</span>
        </div>
      </div>

      {/* Direct Desk Shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        <Link
          href="/officer/library/books"
          className="p-2.5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-500 transition block group shadow-2xs"
        >
          <div className="font-semibold text-xs text-slate-900 dark:text-white group-hover:text-blue-600">
            Catalog &amp; Stock →
          </div>
          <span className="text-[10px] text-slate-500">Add titles &amp; adjust stock</span>
        </Link>
        <Link
          href="/officer/library/shelves"
          className="p-2.5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-500 transition block group shadow-2xs"
        >
          <div className="font-semibold text-xs text-slate-900 dark:text-white group-hover:text-blue-600">
            Racks &amp; Shelves →
          </div>
          <span className="text-[10px] text-slate-500">Track book capacity</span>
        </Link>
        <Link
          href="/officer/library/student-circulation"
          className="p-2.5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-500 transition block group shadow-2xs"
        >
          <div className="font-semibold text-xs text-slate-900 dark:text-white group-hover:text-blue-600">
            Student Desk →
          </div>
          <span className="text-[10px] text-slate-500">Issue &amp; returns check-in</span>
        </Link>
        <Link
          href="/officer/library/teacher-circulation"
          className="p-2.5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-500 transition block group shadow-2xs"
        >
          <div className="font-semibold text-xs text-slate-900 dark:text-white group-hover:text-blue-600">
            Faculty Desk →
          </div>
          <span className="text-[10px] text-slate-500">Teacher borrowing</span>
        </Link>
        <Link
          href="/officer/library/setup"
          className="p-2.5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-500 transition block group shadow-2xs"
        >
          <div className="font-semibold text-xs text-slate-900 dark:text-white group-hover:text-blue-600">
            Classifications →
          </div>
          <span className="text-[10px] text-slate-500">Categories &amp; authors</span>
        </Link>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-medium space-x-6">
        {[
          { key: 'overview', label: 'Executive Ledger' },
          { key: 'books', label: `Books Catalog (${books.length})` },
          { key: 'shelves', label: `Shelf Racks (${shelves.length})` },
          { key: 'students', label: `Student Loans (${studentCirc.length})` },
          { key: 'faculty', label: `Faculty Loans (${teacherCirc.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`pb-2.5 transition-colors border-b-2 cursor-pointer ${
              activeTab === tab.key
                ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Interactive Table Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-2xs overflow-hidden space-y-0">
        {/* Toolbar */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
              {activeTab === 'overview'
                ? 'Recent Operations Activity'
                : activeTab === 'books'
                ? 'Catalog Titles'
                : activeTab === 'shelves'
                ? 'Library Shelves'
                : activeTab === 'students'
                ? 'Student Borrowing Records'
                : 'Faculty Borrowing Records'}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
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
              <option value={50}>50 / page</option>
            </select>
          </div>
        </div>

        {/* Content Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {activeTab === 'books' && (
                  <>
                    <th className="py-2.5 px-3">Title &amp; ISBN</th>
                    <th className="py-2.5 px-3">Author &amp; Category</th>
                    <th className="py-2.5 px-3">Shelf Location</th>
                    <th className="py-2.5 px-3 text-center">Available / Total</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </>
                )}

                {activeTab === 'shelves' && (
                  <>
                    <th className="py-2.5 px-3">Rack &amp; Code</th>
                    <th className="py-2.5 px-3">Location</th>
                    <th className="py-2.5 px-3 text-center">Occupancy</th>
                    <th className="py-2.5 px-3 text-center">Books / Cap</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </>
                )}

                {(activeTab === 'students' || activeTab === 'faculty' || activeTab === 'overview') && (
                  <>
                    <th className="py-2.5 px-3">Borrower</th>
                    <th className="py-2.5 px-3">Book Title</th>
                    <th className="py-2.5 px-3">Issue Date</th>
                    <th className="py-2.5 px-3">Due Date</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Return Date</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-500">
                    Loading records...
                  </td>
                </tr>
              ) : activeTab === 'overview' ? (
                // Combined recent overview
                studentCirc.slice(0, pageSize).map((iss) => (
                  <tr key={'stu-' + iss.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900 dark:text-white">{iss.student_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">Student • Reg: {iss.student_reg || 'N/A'}</div>
                    </td>
                    <td className="py-2.5 px-3">{iss.book_title}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px]">{iss.issue_date}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px]">{iss.due_date}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium border ${iss.status === 'returned' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                        {iss.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-[11px] text-slate-500">
                      {iss.actual_return_date ? new Date(iss.actual_return_date).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))
              ) : paginatedDataset.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-500">
                    No records found matching criteria.
                  </td>
                </tr>
              ) : activeTab === 'books' ? (
                paginatedDataset.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900 dark:text-white">{b.title}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{b.isbn || 'No ISBN'}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div>{b.writer_name || '—'}</div>
                      <div className="text-[10px] text-slate-400">{b.category_name}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-mono text-[11px]">{b.shelf_name || b.shelf_location || 'Unassigned'}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono">
                      <span className="text-emerald-600 font-semibold">{b.available_copies}</span> / {b.total_copies}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Link href="/officer/library/books" className="text-blue-600 hover:underline text-xs">
                        Manage →
                      </Link>
                    </td>
                  </tr>
                ))
              ) : activeTab === 'shelves' ? (
                paginatedDataset.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900 dark:text-white">{s.shelf_name}</div>
                      <div className="text-[10px] font-mono text-slate-400">{s.shelf_code}</div>
                    </td>
                    <td className="py-2.5 px-3">Room {s.room || '—'} • Floor {s.floor || '—'}</td>
                    <td className="py-2.5 px-3 text-center font-mono">
                      {Math.round(s.occupancy_percentage || 0)}%
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono">
                      {s.total_books_count || 0} / {s.capacity}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Link href="/officer/library/shelves" className="text-blue-600 hover:underline text-xs">
                        Manage →
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                paginatedDataset.map((iss) => (
                  <tr key={iss.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {activeTab === 'students' ? iss.student_name : iss.teacher_name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {activeTab === 'students' ? `Reg: ${iss.student_reg || 'N/A'}` : iss.teacher_email || 'Faculty'}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">{iss.book_title}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px]">{iss.issue_date}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px]">{iss.due_date}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium border ${iss.status === 'returned' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                        {iss.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-[11px] text-slate-500">
                      {iss.actual_return_date ? new Date(iss.actual_return_date).toLocaleDateString() : 'In Loan'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {activeTab !== 'overview' && (
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
        )}
      </div>
    </div>
  );
}
