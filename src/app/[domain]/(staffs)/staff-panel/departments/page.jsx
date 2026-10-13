'use client';

import React, { useState, useEffect, useContext, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
  FiGrid,
  FiList,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiX,
  FiSearch,
  FiRefreshCw,
  FiLayers,
  FiCalendar,
  FiCheckCircle,
  FiAlertCircle,
  FiBookOpen,
  FiCheck
} from 'react-icons/fi';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import Loader from 'src/component/common/Loader';

export default function DepartmentsPage() {
  const { website, getApiEndpoint, tenantUrl } = useContext(TenantWebsiteContext);

  // Data states
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Search & Filter & Views
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, inactive
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'

  // INLINE Form states (NO popup modal)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create'); // 'create' | 'edit'
  const [editingDept, setEditingDept] = useState(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formOrderNo, setFormOrderNo] = useState(0);
  const [formIsActive, setFormIsActive] = useState(true);

  // Inline Delete state
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const editorSectionRef = useRef(null);

  // API Endpoint
  const apiEndpoint = useMemo(() => getApiEndpoint('staff/panel/departments'), [getApiEndpoint]);

  // Fetch departments
  const fetchData = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      try {
        const res = await axios.get(apiEndpoint);
        if (res.data?.success) {
          setDepartments(res.data.departments || []);
        } else {
          toast.error(res.data?.error || 'Failed to fetch departments.');
        }
      } catch (err) {
        console.error('Error fetching departments:', err);
        toast.error(err.response?.data?.error || 'Failed to connect to department server.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [apiEndpoint]
  );

  useEffect(() => {
    let ignore = false;
    const init = async () => {
      setLoading(true);
      try {
        const res = await axios.get(apiEndpoint);
        if (!ignore && res.data?.success) {
          setDepartments(res.data.departments || []);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Error loading departments:', err);
          toast.error(err.response?.data?.error || 'Failed to load departments.');
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    init();
    return () => {
      ignore = true;
    };
  }, [apiEndpoint]);

  // Open Inline Create Form
  const openCreateForm = () => {
    setFormMode('create');
    setEditingDept(null);
    setFormName('');
    setFormCode('');
    setFormDescription('');
    setFormOrderNo(departments.length > 0 ? departments.length + 1 : 1);
    setFormIsActive(true);
    setIsFormOpen(true);

    setTimeout(() => {
      editorSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // Open Inline Edit Form
  const openEditForm = (dept) => {
    setFormMode('edit');
    setEditingDept(dept);
    setFormName(dept.name || '');
    setFormCode(dept.code || '');
    setFormDescription(dept.description || '');
    setFormOrderNo(dept.order_no ?? 0);
    setFormIsActive(Boolean(dept.is_active));
    setIsFormOpen(true);

    setTimeout(() => {
      editorSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleCloseForm = () => {
    if (submitting) return;
    setIsFormOpen(false);
    setEditingDept(null);
  };

  // Handle Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formName.trim()) {
      toast.error('Department name is required.');
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading(formMode === 'create' ? 'Creating department...' : 'Updating department...');

    try {
      const payload = {
        name: formName.trim(),
        code: formCode.trim().toUpperCase(),
        description: formDescription.trim(),
        order_no: parseInt(formOrderNo, 10) || 0,
        is_active: formIsActive,
      };

      if (formMode === 'create') {
        const res = await axios.post(apiEndpoint, payload);
        if (res.data?.success) {
          toast.success(res.data.message || 'Department created successfully!', { id: toastId });
          setIsFormOpen(false);
          await fetchData(true);
        } else {
          toast.error(res.data?.error || 'Failed to create department.', { id: toastId });
        }
      } else {
        const updatePayload = {
          ...payload,
          id: editingDept?.id,
        };
        const res = await axios.put(apiEndpoint, updatePayload);
        if (res.data?.success) {
          toast.success(res.data.message || 'Department updated successfully!', { id: toastId });
          setIsFormOpen(false);
          await fetchData(true);
        } else {
          toast.error(res.data?.error || 'Failed to update department.', { id: toastId });
        }
      }
    } catch (err) {
      console.error('Submit department error:', err);
      toast.error(err.response?.data?.error || 'Error saving department.', { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  // Inline Delete Execution
  const handleInlineDeleteConfirm = async (id) => {
    setDeletingId(id);
    const toastId = toast.loading('Deleting department...');

    try {
      const res = await axios.delete(`${apiEndpoint}?id=${id}`);
      if (res.data?.success) {
        toast.success(res.data.message || 'Department deleted successfully.', { id: toastId });
        setDeleteConfirmId(null);
        if (editingDept?.id === id) {
          setIsFormOpen(false);
          setEditingDept(null);
        }
        await fetchData(true);
      } else {
        toast.error(res.data?.error || 'Failed to delete department.', { id: toastId });
      }
    } catch (err) {
      console.error('Delete department error:', err);
      toast.error(err.response?.data?.error || 'Error deleting department.', { id: toastId });
    } finally {
      setDeletingId(null);
    }
  };

  // Filtered List
  const filteredDepartments = useMemo(() => {
    return departments.filter((d) => {
      // Status filter
      if (statusFilter === 'active' && !d.is_active) return false;
      if (statusFilter === 'inactive' && d.is_active) return false;

      // Search query
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      const name = (d.name || '').toLowerCase();
      const code = (d.code || '').toLowerCase();
      const desc = (d.description || '').toLowerCase();

      return name.includes(q) || code.includes(q) || desc.includes(q);
    });
  }, [departments, statusFilter, searchTerm]);

  // Metrics
  const metrics = useMemo(() => {
    const total = departments.length;
    const active = departments.filter((d) => d.is_active).length;
    const totalClasses = departments.reduce((acc, d) => acc + (d.class_count || 0), 0);
    const documented = departments.filter((d) => d.has_information).length;

    return {
      total,
      active,
      totalClasses,
      documented,
    };
  }, [departments]);

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
              Academic Organization: Departments &amp; Disciplines
            </span>
            <span className="text-[11px] font-medium text-slate-400">
              {website?.name || 'Institution Workspace'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            Academic Departments
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            First Step: Configure foundational institutional departments, faculties, and academic disciplines (e.g. Science, Arts, Commerce, Primary, General).
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer disabled:opacity-60"
            title="Refresh list"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            Refresh
          </button>

          <Link
            href={tenantUrl('/department-information')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
          >
            <FiBookOpen className="w-3.5 h-3.5 text-emerald-600" />
            Department Profiles
          </Link>

          <Link
            href={tenantUrl('/academic-year')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
          >
            <FiCalendar className="w-3.5 h-3.5 text-blue-600" />
            Academic Sessions
          </Link>

          {!isFormOpen ? (
            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-xs transition-colors cursor-pointer"
            >
              <FiPlus className="w-4 h-4" />
              Add Department
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCloseForm}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            >
              <FiX className="w-4 h-4" />
              Close Editor
            </button>
          )}
        </div>
      </div>

      {/* Analytics & Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Departments</span>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
              <FiLayers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{metrics.total}</span>
            <span className="text-[11px] text-slate-400">disciplines</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Operational Tracks</span>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
              <FiCheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{metrics.active}</span>
            <span className="text-[11px] text-slate-400">active status</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Classes</span>
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
              <FiLayers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{metrics.totalClasses}</span>
            <span className="text-[11px] text-slate-400">active classes</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Documented Profiles</span>
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50">
              <FiBookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{metrics.documented}</span>
            <span className="text-[11px] text-slate-400">profile bios</span>
          </div>
        </div>
      </div>

      {/* Inline Delete Confirmation Alert (NO popup modal) */}
      {deleteConfirmId && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 text-slate-900 dark:text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in shadow-xs">
          <div className="flex items-start gap-2.5">
            <FiAlertCircle className="text-lg text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-rose-900 dark:text-rose-200">
                Confirm Deleting Department: {departments.find((d) => d.id === deleteConfirmId)?.name || `#${deleteConfirmId}`}?
              </p>
              <p className="text-[11px] text-rose-700 dark:text-rose-300/80 mt-0.5">
                Deleting this department will unassign child classes and profile records.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={() => setDeleteConfirmId(null)}
              className="px-3 py-1.5 rounded-lg text-xs border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleInlineDeleteConfirm(deleteConfirmId)}
              disabled={deletingId === deleteConfirmId}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {deletingId === deleteConfirmId ? (
                <>
                  <FiRefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <FiTrash2 className="w-3.5 h-3.5" />
                  <span>Confirm Delete</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* INLINE Department Form (NO POPUP MODAL) */}
      {isFormOpen && (
        <div
          ref={editorSectionRef}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-blue-200 dark:border-blue-900/60 p-5 sm:p-6 shadow-md space-y-5 animate-fade-in"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                {formMode === 'create' ? <FiPlus /> : <FiEdit2 />}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {formMode === 'create' ? 'Create New Academic Department' : `Edit Department: ${editingDept?.name}`}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Step 1 in Academic Hierarchy: Foundational discipline for academic tracks.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCloseForm}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Department Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Department / Track Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Science, Business Studies, Humanities, Primary"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Department Code */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Department Code
                </label>
                <input
                  type="text"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  placeholder="e.g. SCI, BIZ, HUM, PRI"
                  className="w-full px-3.5 py-2.5 text-xs font-mono uppercase rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Order No */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Display Sequence Order
                </label>
                <input
                  type="number"
                  min="0"
                  value={formOrderNo}
                  onChange={(e) => setFormOrderNo(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Operational Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Operational Status
                </label>
                <div className="flex items-center gap-3 pt-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600" />
                  </label>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {formIsActive ? 'Active Department' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Department Overview / Remarks
              </label>
              <textarea
                rows={2}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Optional description of this academic department or curriculum discipline..."
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Buttons */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleCloseForm}
                disabled={submitting}
                className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-60"
              >
                {submitting && <FiRefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {formMode === 'create' ? 'Save Department' : 'Update Department'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Control Bar: Search & Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2.5 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by department name, code..."
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <FiX className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="w-36">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          <div className="flex items-center p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
              title="Card View"
            >
              <FiGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
              title="Table View"
            >
              <FiList className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader />
          <p className="text-xs text-slate-400">Loading academic departments...</p>
        </div>
      ) : filteredDepartments.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto text-2xl border border-blue-100 dark:border-blue-900/50">
            <FiLayers />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No academic departments found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {searchTerm || statusFilter !== 'all'
                ? 'No departments match your current filter criteria.'
                : 'Get started by creating your first academic department (e.g. Science, Arts, Primary).'}
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer"
            >
              <FiPlus className="w-4 h-4" />
              Add Department
            </button>
          </div>
        </div>
      ) : viewMode === 'cards' ? (
        /* Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDepartments.map((dept) => (
            <div
              key={dept.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm border border-blue-100 dark:border-blue-900/50 shrink-0">
                      {dept.code?.slice(0, 3) || dept.name?.slice(0, 2).toUpperCase() || 'DEP'}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                        {dept.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        {dept.code && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {dept.code}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">Order: {dept.order_no}</span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      dept.is_active
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {dept.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {dept.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 line-clamp-2">
                    {dept.description}
                  </p>
                )}

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <FiLayers className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{dept.class_count || 0} Classes</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    Order #{dept.order_no}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  {dept.has_information ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                      <FiCheck className="w-3.5 h-3.5" /> Profile Configured
                    </span>
                  ) : (
                    <Link
                      href={tenantUrl('/department-information')}
                      className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                    >
                      <FiBookOpen className="w-3 h-3" /> Setup Profile
                    </Link>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEditForm(dept)}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                    title="Edit Department"
                  >
                    <FiEdit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(dept.id)}
                    className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                    title="Delete Department"
                  >
                    <FiTrash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Department / Discipline</th>
                  <th className="py-3 px-3">Code</th>
                  <th className="py-3 px-3">Order</th>
                  <th className="py-3 px-3">Classes</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Profile</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredDepartments.map((dept) => (
                  <tr key={dept.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      <div>
                        <div>{dept.name}</div>
                        {dept.description && (
                          <div className="text-[11px] text-slate-400 font-normal truncate max-w-xs">
                            {dept.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono">
                      {dept.code ? (
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {dept.code}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500">#{dept.order_no}</td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {dept.class_count || 0}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          dept.is_active
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {dept.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {dept.has_information ? (
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Ready</span>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">None</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditForm(dept)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <FiEdit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(dept.id)}
                          className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
