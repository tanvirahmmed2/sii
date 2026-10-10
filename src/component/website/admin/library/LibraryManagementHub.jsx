'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function LibraryManagementHub({ isOfficer = false }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/library/stats')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setStats(data.stats);
      })
      .catch((err) => console.error('Error loading library stats:', err))
      .finally(() => setLoading(false));
  }, []);

  const basePath = isOfficer ? '/officer/library' : '/staff-panel';

  return (
    <div className="w-full space-y-4">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          Library Management Subsystem
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Integrated catalog accessioning, student &amp; faculty borrowing circulation, shelf capacity monitoring, and stock control.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            Total Catalog Titles
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-slate-900 dark:text-white font-mono">
              {stats?.total_titles ?? '—'}
            </span>
            <span className="text-[10px] font-medium text-slate-500">Titles</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            Available on Shelves
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
              {stats?.total_available_copies ?? '—'}
            </span>
            <span className="text-[10px] font-medium text-slate-400">
              of {stats?.total_inventory_copies ?? '—'} total copies
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            Active Student Loans
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-blue-600 dark:text-blue-400 font-mono">
              {stats?.active_student_loans ?? '—'}
            </span>
            <span className="text-[10px] font-medium text-rose-600 dark:text-rose-400">
              {stats?.overdue_student_loans ? `${stats.overdue_student_loans} overdue` : '0 overdue'}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            Active Faculty Loans
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-purple-600 dark:text-purple-400 font-mono">
              {stats?.active_teacher_loans ?? '—'}
            </span>
            <span className="text-[10px] font-medium text-rose-600 dark:text-rose-400">
              {stats?.overdue_teacher_loans ? `${stats.overdue_teacher_loans} overdue` : '0 overdue'}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Launchpad Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Setup Cards */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-3">
          <h3 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
            Setup &amp; Entities
          </h3>
          <div className="space-y-1.5 text-xs">
            <Link
              href={isOfficer ? '/officer/library' : '/staff-panel/library-book-category'}
              className="flex items-center justify-between p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              <span>Book Categories</span>
              <span className="font-mono text-[11px] text-slate-400">{stats?.total_categories ?? 0}</span>
            </Link>
            <Link
              href={isOfficer ? '/officer/library' : '/staff-panel/library-book-writer'}
              className="flex items-center justify-between p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              <span>Authors &amp; Writers</span>
              <span className="font-mono text-[11px] text-slate-400">{stats?.total_writers ?? 0}</span>
            </Link>
            <Link
              href={isOfficer ? '/officer/library' : '/staff-panel/library-books-publishers'}
              className="flex items-center justify-between p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              <span>Publishers</span>
              <span className="font-mono text-[11px] text-slate-400">{stats?.total_publishers ?? 0}</span>
            </Link>
            <Link
              href={isOfficer ? '/officer/library' : '/staff-panel/library-bookshelf'}
              className="flex items-center justify-between p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              <span>Shelf Locations &amp; Capacity</span>
              <span className="font-mono text-[11px] text-slate-400">{stats?.total_shelves ?? 0} racks</span>
            </Link>
          </div>
        </div>

        {/* Catalog & Inventory */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-3">
          <h3 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
            Books &amp; Stock
          </h3>
          <div className="space-y-1.5 text-xs">
            <Link
              href={isOfficer ? '/officer/library' : '/staff-panel/library-books'}
              className="flex items-center justify-between p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              <span>All Catalogued Books</span>
              <span className="font-mono text-[11px] text-slate-400">{stats?.total_titles ?? 0} titles</span>
            </Link>
            <div className="p-2 rounded bg-slate-50 dark:bg-slate-800/40 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Out of Stock Titles:</span>
                <span className="font-semibold text-rose-600">{stats?.out_of_stock_titles ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Available Physical Books:</span>
                <span className="font-semibold text-emerald-600">{stats?.total_available_copies ?? 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Circulation Desks */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-3">
          <h3 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
            Circulation Desks
          </h3>
          <div className="space-y-1.5 text-xs">
            <Link
              href={isOfficer ? '/officer/library' : '/staff-panel/library-student-issue'}
              className="flex items-center justify-between p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              <span>Student Book Issue Desk</span>
              <span className="font-mono text-[11px] text-blue-600">{stats?.active_student_loans ?? 0} active</span>
            </Link>
            <Link
              href={isOfficer ? '/officer/library' : '/staff-panel/library-student-return'}
              className="flex items-center justify-between p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              <span>Student Book Return Desk</span>
              <span className="font-mono text-[11px] text-slate-400">{stats?.student_return_logs ?? 0} logs</span>
            </Link>
            <Link
              href={isOfficer ? '/officer/library' : '/staff-panel/library-teacher-issue'}
              className="flex items-center justify-between p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              <span>Faculty Book Issue Desk</span>
              <span className="font-mono text-[11px] text-purple-600">{stats?.active_teacher_loans ?? 0} active</span>
            </Link>
            <Link
              href={isOfficer ? '/officer/library' : '/staff-panel/library-teacher-return'}
              className="flex items-center justify-between p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              <span>Faculty Book Return Desk</span>
              <span className="font-mono text-[11px] text-slate-400">{stats?.teacher_return_logs ?? 0} logs</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
