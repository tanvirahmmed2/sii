/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FiUsers,
  FiUserPlus,
  FiAward,
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
  FiDollarSign,
  FiBookOpen,
  FiLayers
} from 'react-icons/fi';

export default function TeacherListPage() {
  const params = useParams();
  const router = useRouter();
  const domain = params?.domain || '';

  const [teachers, setTeachers] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [stats, setStats] = useState({
    total_teachers: 0,
    active_teachers: 0,
    inactive_teachers: 0,
    total_designations: 0
  });

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDesignation, setSelectedDesignation] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Quick View Modal
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

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

  // Fetch designations for filter dropdown
  useEffect(() => {
    async function loadDesignations() {
      if (!domain) return;
      try {
        const res = await fetch(`/api/${domain}/staff/panel/teacher/designations`);
        const data = await res.json();
        if (data.success) {
          setDesignations(data.designations || []);
        }
      } catch (err) {
        console.error('Failed to load designations:', err);
      }
    }
    loadDesignations();
  }, [domain]);

  // Fetch teachers roster
  const fetchTeachers = useCallback(async () => {
    if (!domain) return;
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: '50',
      });
      if (searchTerm.trim()) queryParams.set('search', searchTerm.trim());
      if (selectedDesignation !== 'all') queryParams.set('designation_id', selectedDesignation);
      if (selectedStatus !== 'all') queryParams.set('status', selectedStatus);

      const res = await fetch(`/api/${domain}/staff/panel/teacher?${queryParams.toString()}`);
      const data = await res.json();

      if (data.success) {
        setTeachers(data.teachers || []);
        if (data.pagination) setPagination(data.pagination);
        if (data.stats) setStats(data.stats);
      } else {
        showToast(data.error || 'Failed to load teachers roster.', true);
      }
    } catch (err) {
      console.error(err);
      showToast('Error connecting to server.', true);
    } finally {
      setLoading(false);
    }
  }, [domain, page, searchTerm, selectedDesignation, selectedStatus, showToast]);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  // Teacher Profile Quick View
  const handleOpenView = async (teacher) => {
    setViewModalOpen(true);
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/${domain}/staff/panel/teacher?id=${teacher.id}`);
      const data = await res.json();
      if (data.success && data.teacher) {
        setSelectedTeacher(data.teacher);
      } else {
        setSelectedTeacher(teacher);
      }
    } catch {
      setSelectedTeacher(teacher);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Confirm delete
  const confirmDelete = (teacher) => {
    setTeacherToDelete(teacher);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!teacherToDelete) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/${domain}/staff/panel/teacher?id=${teacherToDelete.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Teacher removed successfully.');
        setDeleteModalOpen(false);
        setTeacherToDelete(null);
        fetchTeachers();
      } else {
        showToast(data.error || 'Failed to delete teacher.', true);
      }
    } catch (err) {
      console.error(err);
      showToast('Error deleting teacher.', true);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded shadow-lg text-xs font-medium animate-in fade-in slide-in-from-top-2">
          <FiCheck className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}
      {toastError && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-rose-600 text-white px-4 py-2.5 rounded shadow-lg text-xs font-medium animate-in fade-in slide-in-from-top-2">
          <FiX className="w-4 h-4" />
          <span>{toastError}</span>
        </div>
      )}

      {/* Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Total Faculty</p>
            <FiUsers className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">{stats.total_teachers}</span>
            <span className="text-[10px] font-medium text-slate-500">Registered</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Active Status</p>
            <FiCheck className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">{stats.active_teachers}</span>
            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">On Duty</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Inactive</p>
            <FiX className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-slate-600 dark:text-slate-400 font-mono">{stats.inactive_teachers}</span>
            <span className="text-[10px] font-medium text-slate-500">Deactivated</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Designations</p>
            <FiAward className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-amber-600 dark:text-amber-400 font-mono">{designations.length}</span>
            <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">Categories</span>
          </div>
        </div>
      </div>

      {/* Main Interactive Workstation Area */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-4">
        {/* Action & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Search teachers by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full text-xs pl-8 pr-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400 transition"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedDesignation}
              onChange={(e) => {
                setSelectedDesignation(e.target.value);
                setPage(1);
              }}
              className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Designations</option>
              {designations.map((d) => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            <button
              onClick={fetchTeachers}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded border border-slate-300 dark:border-slate-700 transition"
              title="Refresh roster"
            >
              <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <Link
              href={`/${domain}/staff-panel/teacher-registration`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition"
            >
              <FiUserPlus className="w-3.5 h-3.5" />
              <span>Register Teacher</span>
            </Link>
          </div>
        </div>

        {/* High-Density Data Table */}
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2">Teacher Profile</th>
                <th className="px-3 py-2">Designation</th>
                <th className="px-3 py-2">Contact Details</th>
                <th className="px-3 py-2">Joining &amp; Salary</th>
                <th className="px-3 py-2 text-center">Qualifications</th>
                <th className="px-3 py-2 text-center">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
              {loading && teachers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-slate-400">
                    <FiRefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                    <span>Loading teachers roster...</span>
                  </td>
                </tr>
              ) : teachers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-slate-400">
                    <FiUsers className="w-6 h-6 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                    <p className="font-medium text-slate-600 dark:text-slate-400">No teachers found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Register your first teacher by clicking &quot;Register Teacher&quot; above.
                    </p>
                  </td>
                </tr>
              ) : (
                teachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Teacher Profile */}
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2.5">
                        {teacher.photo_url ? (
                          <img
                            src={teacher.photo_url}
                            alt={teacher.name}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 text-xs shrink-0">
                            {teacher.name?.charAt(0) || 'T'}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white leading-tight">
                            {teacher.name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-slate-400 uppercase font-mono">
                              ID: #{teacher.id}
                            </span>
                            {teacher.blood_group && (
                              <span className="text-[9px] px-1 rounded bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900 font-semibold">
                                {teacher.blood_group}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Designation */}
                    <td className="px-3 py-2">
                      {teacher.designation_title ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                          {teacher.designation_title}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">Unassigned</span>
                      )}
                    </td>

                    {/* Contact */}
                    <td className="px-3 py-2">
                      <p className="text-slate-900 dark:text-white flex items-center gap-1">
                        <FiMail className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[150px]">{teacher.email}</span>
                      </p>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] flex items-center gap-1 mt-0.5">
                        <FiPhone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{teacher.number}</span>
                      </p>
                    </td>

                    {/* Joining & Salary */}
                    <td className="px-3 py-2">
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 font-mono">
                        {teacher.joining_date ? new Date(teacher.joining_date).toLocaleDateString() : 'N/A'}
                      </p>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                        {teacher.salary ? `${Number(teacher.salary).toLocaleString()} BDT` : 'Not Set'}
                      </p>
                    </td>

                    {/* Qualifications count */}
                    <td className="px-3 py-2 text-center">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800">
                        <FiAward className="w-3 h-3" />
                        <span>{teacher.qualification_count || 0}</span>
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium border ${
                          teacher.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                            : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                        }`}
                      >
                        {teacher.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-2 text-right space-x-1">
                      <button
                        onClick={() => handleOpenView(teacher)}
                        className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="View Full Profile"
                      >
                        <FiEye className="w-3.5 h-3.5" />
                      </button>
                      <Link
                        href={`/${domain}/staff-panel/teacher-update?id=${teacher.id}`}
                        className="p-1 inline-flex rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Edit Teacher"
                      >
                        <FiEdit2 className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        onClick={() => confirmDelete(teacher)}
                        className="p-1 rounded text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                        title="Delete Teacher"
                      >
                        <FiTrash2 className="w-3.5 h-3.5" />
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
            Showing {teachers.length} of {pagination.total} teachers
          </span>
          {pagination.totalPages > 1 && (
            <div className="flex items-center gap-1 font-mono">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-semibold text-slate-900 dark:text-white">
                {page} / {pagination.totalPages}
              </span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick View Profile Modal */}
      {viewModalOpen && selectedTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <FiUsers className="w-4 h-4 text-blue-600" />
                <span>Teacher Profile Dossier</span>
              </h3>
              <button
                onClick={() => setViewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            {loadingDetails ? (
              <div className="py-8 text-center text-slate-400">
                <FiRefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                <span>Loading complete teacher record...</span>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {/* Header Profile Info */}
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700">
                  {selectedTeacher.photo_url ? (
                    <img
                      src={selectedTeacher.photo_url}
                      alt={selectedTeacher.name}
                      className="w-14 h-14 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700 shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-lg font-bold text-slate-600 dark:text-slate-200 shrink-0">
                      {selectedTeacher.name?.charAt(0) || 'T'}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{selectedTeacher.name}</h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                        {selectedTeacher.designation_title || 'Unassigned'}
                      </span>
                    </div>
                    <p className="text-slate-500 mt-0.5">{selectedTeacher.email} • {selectedTeacher.number}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                      <span>Salary: <strong>{Number(selectedTeacher.salary || 0).toLocaleString()} BDT</strong></span>
                      <span>Joined: <strong>{selectedTeacher.joining_date ? new Date(selectedTeacher.joining_date).toLocaleDateString() : 'N/A'}</strong></span>
                      <span>Gender: <strong className="capitalize">{selectedTeacher.gender || 'N/A'}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Address info */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Present Address:</span>
                    <p className="text-slate-500 mt-0.5">{selectedTeacher.address || 'Not specified'}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Permanent Address:</span>
                    <p className="text-slate-500 mt-0.5">{selectedTeacher.permanent_address || 'Not specified'}</p>
                  </div>
                </div>

                {/* Qualifications Section */}
                <div>
                  <h5 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                    <FiAward className="w-3.5 h-3.5 text-purple-600" />
                    <span>Academic Qualifications ({selectedTeacher.qualifications?.length || 0})</span>
                  </h5>
                  {selectedTeacher.qualifications && selectedTeacher.qualifications.length > 0 ? (
                    <div className="border border-slate-200 dark:border-slate-800 rounded divide-y divide-slate-100 dark:divide-slate-800">
                      {selectedTeacher.qualifications.map((q) => (
                        <div key={q.id} className="p-2.5 flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-white">{q.degree}</span>
                            <p className="text-slate-500 text-[11px]">{q.institute} {q.board ? `(${q.board})` : ''}</p>
                          </div>
                          <div className="text-right">
                            <span className="font-mono text-slate-700 dark:text-slate-300">{q.passing_year || 'Year N/A'}</span>
                            {q.result && <p className="text-[10px] text-emerald-600 font-semibold">{q.result}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 italic text-[11px]">No qualifications recorded yet.</p>
                  )}
                </div>

                {/* Assigned Routine/Subjects */}
                {selectedTeacher.subjects && selectedTeacher.subjects.length > 0 && (
                  <div>
                    <h5 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                      <FiBookOpen className="w-3.5 h-3.5 text-blue-600" />
                      <span>Assigned Subjects ({selectedTeacher.subjects.length})</span>
                    </h5>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedTeacher.subjects.map((s) => (
                        <span key={s.id} className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-[11px]">
                          {s.subject_name} {s.class_name ? `(${s.class_name})` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Link
                href={`/${domain}/staff-panel/teacher-update?id=${selectedTeacher.id}`}
                className="px-3 py-1.5 rounded text-xs font-medium bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 transition flex items-center gap-1"
              >
                <FiEdit2 className="w-3 h-3" />
                <span>Edit Full Profile</span>
              </Link>
              <button
                type="button"
                onClick={() => setViewModalOpen(false)}
                className="px-3 py-1.5 rounded text-xs border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && teacherToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl w-full max-w-sm p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                <FiTrash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Delete Teacher Record?</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Are you sure you want to remove &quot;{teacherToDelete.name}&quot;?
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              This will remove the teacher along with their login sessions, routine assignments, qualifications, and attendance logs.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-3 py-1.5 rounded text-xs border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-1.5 rounded text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50 transition"
              >
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
