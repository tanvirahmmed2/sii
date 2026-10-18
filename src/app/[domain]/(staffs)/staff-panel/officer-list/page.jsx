/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FiUsers,
  FiUserPlus,
  FiDollarSign,
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiEye,
  FiRefreshCw,
  FiCheck,
  FiX,
  FiMail,
  FiPhone,
  FiCalendar,
  FiBriefcase,
  FiCreditCard,
  FiShield,
  FiAlertCircle
} from 'react-icons/fi';

const DEPARTMENTS = [
  'All',
  'Administration',
  'Accounts',
  'Hall',
  'Library',
  'Club',
  'Hostel',
  'Inventory',
  'General'
];

export default function OfficerListPage() {
  const params = useParams();
  const router = useRouter();
  const domain = params?.domain || '';

  const [officers, setOfficers] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    inactive: 0,
    departments: 0
  });

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });

  // Inline delete state (NO POPUP MODAL)
  const [inlineDeleteId, setInlineDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // In-page quick view drawer (NO POPUP MODAL)
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
  const [selectedOfficer, setSelectedOfficer] = useState(null);
  const [resendingId, setResendingId] = useState(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState(null);
  const [toastError, setToastError] = useState(null);

  const showToast = useCallback((msg, isErr = false) => {
    if (isErr) {
      setToastError(msg);
      setTimeout(() => setToastError(null), 4000);
    } else {
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 3000);
    }
  }, []);

  // Fetch officers roster
  const fetchOfficers = useCallback(async () => {
    if (!domain) return;
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (searchTerm) queryParams.set('search', searchTerm);
      if (selectedDepartment && selectedDepartment !== 'All') {
        queryParams.set('department', selectedDepartment);
      }
      if (selectedStatus && selectedStatus !== 'all') {
        queryParams.set('status', selectedStatus);
      }
      queryParams.set('page', String(page));
      queryParams.set('limit', '50');

      const res = await fetch(`/api/${domain}/staff/panel/officers?${queryParams.toString()}`);
      const data = await res.json();

      if (data.success) {
        setOfficers(data.officers || []);
        if (data.pagination) setPagination(data.pagination);
        if (data.stats) setStats(data.stats);
      } else {
        showToast(data.error || 'Failed to load officers.', true);
      }
    } catch (err) {
      console.error('Failed to fetch officers:', err);
      showToast('Network error loading officers roster.', true);
    } finally {
      setLoading(false);
    }
  }, [domain, searchTerm, selectedDepartment, selectedStatus, page, showToast]);

  useEffect(() => {
    fetchOfficers();
  }, [fetchOfficers]);

  // Handle inline delete
  const handleDeleteOfficer = async (id, name) => {
    try {
      setDeletingId(id);
      const res = await fetch(`/api/${domain}/staff/panel/officers?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (data.success) {
        showToast(`Officer ${name} removed successfully.`);
        setInlineDeleteId(null);
        if (selectedOfficer?.id === id) {
          setViewDrawerOpen(false);
          setSelectedOfficer(null);
        }
        fetchOfficers();
      } else {
        showToast(data.error || 'Failed to delete officer.', true);
      }
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Error deleting officer.', true);
    } finally {
      setDeletingId(null);
    }
  };

  // Resend invitation link
  const handleResendInvite = async (officerId) => {
    try {
      setResendingId(officerId);
      const res = await fetch(`/api/${domain}/staff/panel/officers/resend-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ officerId })
      });
      const data = await res.json();

      if (data.success) {
        showToast('Fresh verification invitation dispatched to officer’s email.');
      } else {
        showToast(data.error || 'Failed to resend invitation.', true);
      }
    } catch (err) {
      console.error('Error resending invite:', err);
      showToast('Error resending verification invite.', true);
    } finally {
      setResendingId(null);
    }
  };

  const handleOpenDrawer = (officer) => {
    setSelectedOfficer(officer);
    setViewDrawerOpen(true);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-16">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white text-sm font-medium rounded-lg shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <FiCheck className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
      {toastError && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 bg-rose-600 text-white text-sm font-medium rounded-lg shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <FiX className="w-4 h-4 shrink-0" />
          <span>{toastError}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <Link href={`/${domain}/staff-panel`} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Staff Portal
            </Link>
            <span>/</span>
            <span className="text-slate-800 dark:text-slate-200 font-medium">Officers Roster</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <FiUsers className="text-indigo-600 dark:text-indigo-400 w-6 h-6" />
            Administrative Officers Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage administrative officers, assigned department placements, and direct payroll scales.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href={`/${domain}/staff-panel/officer-payroll`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium shadow-xs transition"
          >
            <FiDollarSign className="w-4 h-4 text-emerald-600" />
            Officer Payroll Scales
          </Link>

          <Link
            href={`/${domain}/staff-panel/officer-registration`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <FiUserPlus className="w-4 h-4" />
            Register New Officer
          </Link>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total Officers
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {stats.total || officers.length}
            </span>
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
              Enrolled
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Active On-Duty
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {stats.active || 0}
            </span>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              Verified
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Pending Setup
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {stats.pending || 0}
            </span>
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
              Invitation Sent
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Units / Depts
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {stats.departments || DEPARTMENTS.length - 1}
            </span>
            <span className="text-xs font-medium text-slate-500">
              Operational
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <FiSearch className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, email, phone, designation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Department Filter */}
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept === 'All' ? 'All Departments' : dept}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active (Verified)</option>
              <option value="pending">Pending Verification</option>
              <option value="inactive">Inactive</option>
            </select>

            {/* Refresh */}
            <button
              type="button"
              onClick={fetchOfficers}
              disabled={loading}
              className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Refresh Roster"
            >
              <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Officers Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Officer Profile</th>
                <th className="py-3 px-4">Department & Role</th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-4">Direct Payroll Scale</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2 text-xs">
                      <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      Loading officers directory...
                    </div>
                  </td>
                </tr>
              ) : officers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <FiUsers className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      No officers found
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {searchTerm || selectedDepartment !== 'All' || selectedStatus !== 'all'
                        ? 'Try clearing your filters or search query.'
                        : 'Register an officer to populate this roster.'}
                    </p>
                  </td>
                </tr>
              ) : (
                officers.map((officer) => (
                  <React.Fragment key={officer.id}>
                    <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                      {/* Officer Profile */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {officer.photo_url ? (
                            <img
                              src={officer.photo_url}
                              alt={officer.name}
                              className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-sm border border-indigo-200 dark:border-indigo-800">
                              {officer.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-white block hover:text-indigo-600 cursor-pointer" onClick={() => handleOpenDrawer(officer)}>
                              {officer.name}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              ID: #{officer.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Department & Role */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {officer.department || 'General'}
                          </span>
                          <span className="text-xs text-slate-700 dark:text-slate-200 block font-medium">
                            {officer.designation || 'Officer'}
                          </span>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5 text-slate-600 dark:text-slate-300">
                          <div className="flex items-center gap-1.5 text-xs">
                            <FiMail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{officer.email}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <FiPhone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{officer.phone}</span>
                          </div>
                        </div>
                      </td>

                      {/* Direct Payroll Scale */}
                      <td className="py-3 px-4">
                        {officer.payroll_id ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                              <span className="text-indigo-600 dark:text-indigo-400">
                                {officer.payroll_title || 'Payroll Scale'}
                              </span>
                              {officer.payroll_grade_code && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-mono">
                                  {officer.payroll_grade_code}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                              Net: {Number(officer.payroll_net_salary || officer.salary || 0).toLocaleString()} ৳ /mo
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">
                            No payroll assigned
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {officer.is_active && officer.is_registered ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active
                          </span>
                        ) : !officer.is_registered ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-100/80 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Pending Setup
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick View Drawer */}
                          <button
                            type="button"
                            onClick={() => handleOpenDrawer(officer)}
                            className="p-1.5 rounded-md text-slate-600 dark:text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            title="Quick View Officer"
                          >
                            <FiEye className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Profile */}
                          <Link
                            href={`/${domain}/staff-panel/officer-update?id=${officer.id}`}
                            className="p-1.5 rounded-md text-slate-600 dark:text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            title="Edit Officer & Payroll"
                          >
                            <FiEdit2 className="w-3.5 h-3.5" />
                          </Link>

                          {/* ID Card */}
                          <Link
                            href={`/${domain}/staff-panel/officer-id-card`}
                            className="p-1.5 rounded-md text-slate-600 dark:text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            title="Officer ID Card"
                          >
                            <FiCreditCard className="w-3.5 h-3.5" />
                          </Link>

                          {/* Resend Invite (if pending) */}
                          {!officer.is_registered && (
                            <button
                              type="button"
                              onClick={() => handleResendInvite(officer.id)}
                              disabled={resendingId === officer.id}
                              className="p-1.5 rounded-md text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition cursor-pointer disabled:opacity-50"
                              title="Resend Activation Invite"
                            >
                              <FiMail className={`w-3.5 h-3.5 ${resendingId === officer.id ? 'animate-pulse' : ''}`} />
                            </button>
                          )}

                          {/* Inline Delete trigger */}
                          <button
                            type="button"
                            onClick={() => setInlineDeleteId(inlineDeleteId === officer.id ? null : officer.id)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                            title="Delete Officer"
                          >
                            <FiTrash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Inline Delete Confirmation Row (NO POPUP MODAL) */}
                    {inlineDeleteId === officer.id && (
                      <tr className="bg-rose-50/90 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900/60 animate-in fade-in duration-150">
                        <td colSpan={6} className="py-3 px-4">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200">
                              <FiAlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                              <span className="text-xs font-semibold">
                                Delete officer {officer.name}? This will remove all associated salary records and login sessions permanently.
                              </span>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-auto">
                              <button
                                type="button"
                                onClick={() => setInlineDeleteId(null)}
                                className="px-3 py-1 rounded-md text-xs font-medium border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteOfficer(officer.id, officer.name)}
                                disabled={deletingId === officer.id}
                                className="px-3.5 py-1 rounded-md text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition shadow-2xs cursor-pointer disabled:opacity-50"
                              >
                                {deletingId === officer.id ? 'Deleting...' : 'Confirm Delete'}
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-xs text-slate-500">
            <span>
              Showing {(page - 1) * pagination.limit + 1} to {Math.min(page * pagination.limit, pagination.total)} of {pagination.total} officers
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Previous
              </button>
              <span className="px-2 font-mono font-medium">
                {page} / {pagination.totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* In-Page Quick View Slide Drawer (NO POPUP MODAL) */}
      {viewDrawerOpen && selectedOfficer && (
        <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/40 backdrop-blur-2xs transition-opacity animate-in fade-in duration-200">
          <div className="w-full max-w-md h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-6 overflow-y-auto space-y-6 shadow-2xl">
            {/* Drawer Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                {selectedOfficer.photo_url ? (
                  <img
                    src={selectedOfficer.photo_url}
                    alt={selectedOfficer.name}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-2xs"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-lg">
                    {selectedOfficer.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {selectedOfficer.name}
                  </h3>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                    {selectedOfficer.designation} — {selectedOfficer.department}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewDrawerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Direct Payroll Status */}
            <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-950 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Assigned Payroll Scale:
                </span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                  {selectedOfficer.payroll_title || 'None'}
                </span>
              </div>
              {selectedOfficer.payroll_grade_code && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Grade Code:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {selectedOfficer.payroll_grade_code}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-indigo-200/50 dark:border-indigo-900/50 font-bold text-emerald-700 dark:text-emerald-400">
                <span>Net Monthly Salary:</span>
                <span className="font-mono text-sm">
                  {Number(selectedOfficer.payroll_net_salary || selectedOfficer.salary || 0).toLocaleString()} ৳
                </span>
              </div>
            </div>

            {/* Officer Details */}
            <div className="space-y-3 text-xs">
              <h4 className="font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">
                Profile Information
              </h4>

              <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300">
                <span className="text-slate-400">Email:</span>
                <span className="font-medium text-right break-all">{selectedOfficer.email}</span>

                <span className="text-slate-400">Phone:</span>
                <span className="font-medium text-right">{selectedOfficer.phone}</span>

                <span className="text-slate-400">Joining Date:</span>
                <span className="font-medium text-right font-mono">{selectedOfficer.joining_date || 'N/A'}</span>

                <span className="text-slate-400">NID Number:</span>
                <span className="font-medium text-right font-mono">{selectedOfficer.nid_number || 'N/A'}</span>

                <span className="text-slate-400">Gender / Blood:</span>
                <span className="font-medium text-right">
                  {selectedOfficer.gender || 'male'} / {selectedOfficer.blood_group || 'N/A'}
                </span>

                <span className="text-slate-400">Address:</span>
                <span className="font-medium text-right">{selectedOfficer.address || 'N/A'}</span>
              </div>

              {selectedOfficer.bio && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-slate-400 block">Bio & Responsibilities:</span>
                  <p className="text-slate-700 dark:text-slate-300 text-xs bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg">
                    {selectedOfficer.bio}
                  </p>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <Link
                href={`/${domain}/staff-panel/officer-update?id=${selectedOfficer.id}`}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition"
              >
                <FiEdit2 className="w-3.5 h-3.5" />
                Edit Full Profile
              </Link>
              <button
                type="button"
                onClick={() => setViewDrawerOpen(false)}
                className="px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
