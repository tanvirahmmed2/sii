'use client';

import React, { useState, useEffect, useContext, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import axios from 'axios';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import Loader from 'src/component/common/Loader';

// Dynamically import TiptapEditor to avoid SSR hydration issues
const TiptapEditor = dynamic(() => import('src/component/website/ui/TiptapEditor.jsx'), {
  ssr: false,
  loading: () => <div className="h-44 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-center text-xs text-slate-400">
      Loading Tiptap Rich Text Editor...
    </div>
});
export default function DepartmentInformationPage() {
  const {
    website,
    getApiEndpoint,
    tenantUrl
  } = useContext(TenantWebsiteContext);

  // Data states
  const [deptInfoList, setDeptInfoList] = useState([]);
  const [availableDepartments, setAvailableDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Search, filter & view modes
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('all');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'

  // INLINE Form states (NO popup modal)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create'); // 'create' | 'edit'
  const [editingRecord, setEditingRecord] = useState(null);

  // Form field states
  const [formDeptId, setFormDeptId] = useState('');
  const [formMotto, setFormMotto] = useState('');
  const [formSummary, setFormSummary] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formExpectedCost, setFormExpectedCost] = useState('');

  // INLINE Delete state (NO popup modal)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const editorSectionRef = useRef(null);

  // API Endpoint
  const apiEndpoint = useMemo(() => getApiEndpoint('staff/panel/department-information'), [getApiEndpoint]);

  // Fetch Department Information & Available Departments
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);else setRefreshing(true);
    try {
      const res = await axios.get(apiEndpoint);
      if (res.data?.success) {
        setDeptInfoList(res.data.department_information || []);
        setAvailableDepartments(res.data.available_departments || []);
      } else {
        toast.error(res.data?.error || 'Failed to load department information.');
      }
    } catch (err) {
      console.error('Error fetching department information:', err);
      toast.error(err.response?.data?.error || 'Failed to connect to department information server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiEndpoint]);
  useEffect(() => {
    let ignore = false;
    const init = async () => {
      setLoading(true);
      try {
        const res = await axios.get(apiEndpoint);
        if (!ignore && res.data?.success) {
          setDeptInfoList(res.data.department_information || []);
          setAvailableDepartments(res.data.available_departments || []);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Error initializing department information:', err);
          toast.error(err.response?.data?.error || 'Failed to load department information.');
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

  // Departments that already have an information record
  const configuredDeptIds = useMemo(() => {
    return new Set(deptInfoList.map(item => String(item.department_id)));
  }, [deptInfoList]);

  // Open Inline Create Form
  const openCreateForm = () => {
    setFormMode('create');
    setEditingRecord(null);

    // Pick first unconfigured department if available, else first department
    const firstUnconfigured = availableDepartments.find(d => !configuredDeptIds.has(String(d.id)));
    setFormDeptId(firstUnconfigured ? String(firstUnconfigured.id) : availableDepartments[0] ? String(availableDepartments[0].id) : '');
    setFormMotto('');
    setFormSummary('');
    setFormDescription('');
    setFormExpectedCost('');
    setIsFormOpen(true);
    setTimeout(() => {
      editorSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 100);
  };

  // Open Inline Edit Form
  const openEditForm = record => {
    setFormMode('edit');
    setEditingRecord(record);
    setFormDeptId(String(record.department_id));
    setFormMotto(record.motto || '');
    setFormSummary(record.summary || '');
    setFormDescription(record.description || '');
    setFormExpectedCost(record.expected_cost !== null && record.expected_cost !== undefined ? String(record.expected_cost) : '');
    setIsFormOpen(true);
    setTimeout(() => {
      editorSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 100);
  };
  const handleCloseForm = () => {
    if (submitting) return;
    setIsFormOpen(false);
    setEditingRecord(null);
  };

  // Handle Form Submission
  const handleSubmit = async e => {
    e.preventDefault();
    if (!formDeptId) {
      toast.error('Please select an academic department.');
      return;
    }
    setSubmitting(true);
    const toastId = toast.loading(formMode === 'create' ? 'Saving department profile...' : 'Updating department profile...');
    try {
      const payload = {
        department_id: parseInt(formDeptId, 10),
        motto: formMotto.trim(),
        summary: formSummary.trim(),
        description: formDescription,
        expected_cost: formExpectedCost !== '' ? parseFloat(formExpectedCost) || 0 : 0
      };
      if (formMode === 'create') {
        const res = await axios.post(apiEndpoint, payload);
        if (res.data?.success) {
          toast.success(res.data.message || 'Department profile created successfully!', {
            id: toastId
          });
          setIsFormOpen(false);
          await fetchData(true);
        } else {
          toast.error(res.data?.error || 'Failed to save department profile.', {
            id: toastId
          });
        }
      } else {
        const updatePayload = {
          ...payload,
          id: editingRecord?.id
        };
        const res = await axios.put(apiEndpoint, updatePayload);
        if (res.data?.success) {
          toast.success(res.data.message || 'Department profile updated successfully!', {
            id: toastId
          });
          setIsFormOpen(false);
          await fetchData(true);
        } else {
          toast.error(res.data?.error || 'Failed to update department profile.', {
            id: toastId
          });
        }
      }
    } catch (err) {
      console.error('Submit department information error:', err);
      toast.error(err.response?.data?.error || 'An unexpected error occurred while saving.', {
        id: toastId
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Inline Delete Trigger & Confirm
  const handleInlineDeleteConfirm = async id => {
    setDeletingId(id);
    const toastId = toast.loading('Removing department profile record...');
    try {
      const res = await axios.delete(`${apiEndpoint}?id=${id}`);
      if (res.data?.success) {
        toast.success(res.data.message || 'Department profile removed successfully.', {
          id: toastId
        });
        setDeleteConfirmId(null);
        if (editingRecord?.id === id) {
          setIsFormOpen(false);
          setEditingRecord(null);
        }
        await fetchData(true);
      } else {
        toast.error(res.data?.error || 'Failed to delete record.', {
          id: toastId
        });
      }
    } catch (err) {
      console.error('Delete department info error:', err);
      toast.error(err.response?.data?.error || 'Error deleting department information.', {
        id: toastId
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Filtered List
  const filteredList = useMemo(() => {
    return deptInfoList.filter(item => {
      // Dept filter
      if (selectedDeptFilter !== 'all' && String(item.department_id) !== String(selectedDeptFilter)) {
        return false;
      }

      // Search query
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      const name = (item.department_name || '').toLowerCase();
      const code = (item.department_code || '').toLowerCase();
      const motto = (item.motto || '').toLowerCase();
      const summary = (item.summary || '').toLowerCase();
      const desc = (item.description || '').toLowerCase();
      const session = (item.session_name || '').toLowerCase();
      return name.includes(q) || code.includes(q) || motto.includes(q) || summary.includes(q) || desc.includes(q) || session.includes(q);
    });
  }, [deptInfoList, selectedDeptFilter, searchTerm]);

  // Metrics
  const metrics = useMemo(() => {
    const totalProfiles = deptInfoList.length;
    const totalDepts = availableDepartments.length;
    const unconfigured = Math.max(0, totalDepts - totalProfiles);
    const totalCost = deptInfoList.reduce((acc, c) => acc + (parseFloat(c.expected_cost) || 0), 0);
    const avgCost = totalProfiles > 0 ? Math.round(totalCost / totalProfiles) : 0;
    return {
      totalProfiles,
      totalDepts,
      unconfigured,
      avgCost
    };
  }, [deptInfoList, availableDepartments]);
  return <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              Departmental Curricula Profiles
            </span>
            <span className="text-[11px] font-medium text-slate-400">
              {website?.name || 'Institution Workspace'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            Department Information
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Manage comprehensive department profiles, motto, executive overview, Tiptap-formatted syllabus descriptions, and expected annual tuition costs per department.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button type="button" onClick={() => fetchData(true)} disabled={refreshing || loading} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer disabled:opacity-60" title="Refresh record list">
            
            Refresh
          </button>

          <Link href={tenantUrl('/departments')} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors">
            
            Departments Setup
          </Link>

          {!isFormOpen ? <button type="button" onClick={openCreateForm} className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-xs transition-colors cursor-pointer">
              
              Add Department Profile
            </button> : <button type="button" onClick={handleCloseForm} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer">
              
              Close Editor
            </button>}
        </div>
      </div>

      {/* Analytics & Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Department Profiles</span>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
              
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {metrics.totalProfiles}
            </span>
            <span className="text-[11px] text-slate-400">
              / {metrics.totalDepts} depts
            </span>
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
            {metrics.totalDepts > 0 ? Math.round(metrics.totalProfiles / metrics.totalDepts * 100) : 0}% documented
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Academic Disciplines</span>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
              
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {metrics.totalDepts}
            </span>
            <span className="text-[11px] text-slate-400">total departments</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Configured in Departments setup
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Avg. Annual Cost</span>
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50">
              
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              ৳{metrics.avgCost.toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-400">/ yr</span>
          </div>
          <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-1">
            Expected academic commitment
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Pending Profiles</span>
            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/50">
              
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {metrics.unconfigured}
            </span>
            <span className="text-[11px] text-slate-400">pending profiles</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {metrics.unconfigured === 0 ? 'All departments documented' : 'Ready for profile creation'}
          </p>
        </div>
      </div>

      {/* INLINE CREATE / EDIT WORKSTATION FORM (NO POPUP MODAL) */}
      {isFormOpen && <div ref={editorSectionRef} className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-emerald-500/40 dark:border-emerald-500/30 shadow-md p-5 sm:p-6 space-y-5 transition-all">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                {formMode === 'create' ? '• New Department Profile Form' : `• Editing: ${editingRecord?.department_name}`}
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                {formMode === 'create' ? 'Add Department Information Profile' : `Update Information for ${editingRecord?.department_name}`}
              </h2>
            </div>
            <button type="button" onClick={handleCloseForm} className="px-2 py-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer" title="Close editor">
              Edit
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Department Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Academic Department <span className="text-red-500">*</span>
              </label>
              {formMode === 'create' ? <select value={formDeptId} onChange={e => setFormDeptId(e.target.value)} required className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer">
                  <option value="" disabled>Select an academic department...</option>
                  {availableDepartments.map(d => {
              const isConfigured = configuredDeptIds.has(String(d.id));
              return <option key={d.id} value={d.id}>
                        {d.name} {d.code ? `(${d.code})` : ''} {d.session_name ? `• [${d.session_name}]` : ''} {isConfigured ? '— [Profile Exists]' : '— [Ready]'}
                      </option>;
            })}
                </select> : <div className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span>
                    {editingRecord?.department_name} {editingRecord?.department_code ? `(${editingRecord?.department_code})` : ''} {editingRecord?.session_name ? `• ${editingRecord?.session_name}` : ''}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Dept ID: {formDeptId}</span>
                </div>}
              <p className="text-[11px] text-slate-400 mt-1">
                Each department holds one official curriculum profile in <code>website_department_information</code>.
              </p>
            </div>

            {/* Motto and Expected Cost grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Motto */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Department Motto
                </label>
                <input type="text" value={formMotto} onChange={e => setFormMotto(e.target.value)} placeholder="e.g. Empowering Scientific Inquiry & Innovation" maxLength={255} className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                <p className="text-[11px] text-slate-400 mt-1">
                  Guiding motto displayed across department banners and admissions.
                </p>
              </div>

              {/* Expected Cost per Academic Year */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Expected Cost per Academic Year (৳)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    ৳
                  </span>
                  <input type="number" step="0.01" min="0" value={formExpectedCost} onChange={e => setFormExpectedCost(e.target.value)} placeholder="e.g. 35000.00" className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Annual tuition and departmental fees commitment.
                </p>
              </div>
            </div>

            {/* Summary */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Executive Summary / Short Synopsis
              </label>
              <textarea rows={2} value={formSummary} onChange={e => setFormSummary(e.target.value)} placeholder="Provide a concise 1-2 sentence overview of this academic department and its objectives..." className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
            </div>

            {/* Detailed Description with Tiptap Editor */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Comprehensive Description &amp; Curriculum Specifications (Tiptap Rich Text)
                </label>
                <span className="text-[10px] text-slate-400">
                  Powered by Tiptap Editor
                </span>
              </div>
              <div className="rounded-xl border border-slate-300 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900">
                <TiptapEditor value={formDescription} onChange={val => setFormDescription(val)} placeholder="Compose detailed department specifications, academic prerequisites, laboratory facilities, and syllabus guidelines..." minHeight="220px" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Format headings, bulleted lists, bold highlights, blockquotes, and hyperlinks using the rich toolbar.
              </p>
            </div>

            {/* Form Action Buttons */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
              <button type="button" onClick={handleCloseForm} disabled={submitting} className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-60">
                
                {formMode === 'create' ? 'Save Department Profile' : 'Update Profile'}
              </button>
            </div>
          </form>
        </div>}

      {/* Control Bar: Search, Filters, View Modes */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2.5">
          <div className="relative flex-1 max-w-md">
            
            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search by department name, motto, description..." className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" />
            {searchTerm && <button type="button" onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                Close
              </button>}
          </div>

          <div className="w-52">
            <select value={selectedDeptFilter} onChange={e => setSelectedDeptFilter(e.target.value)} className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer">
              <option value="all">All Departments</option>
              {availableDepartments.map(d => <option key={d.id} value={d.id}>
                  {d.name} {d.code ? `(${d.code})` : ''}
                </option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-end md:self-auto">
          <span className="text-[11px] font-medium text-slate-400 mr-1 hidden sm:inline">
            View:
          </span>
          <button type="button" onClick={() => setViewMode('cards')} className={`p-2 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${viewMode === 'cards' ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400' : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`} title="Card View">
            View
          </button>
          <button type="button" onClick={() => setViewMode('table')} className={`p-2 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${viewMode === 'table' ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400' : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`} title="Table View">
            View
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? <div className="w-full py-20 flex flex-col items-center justify-center space-y-3">
          <Loader />
          <p className="text-xs text-slate-400">Loading department profiles...</p>
        </div> : filteredList.length === 0 ? <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center max-w-md mx-auto space-y-4 shadow-xs">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/50">
            
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {searchTerm || selectedDeptFilter !== 'all' ? 'No Matching Profiles' : 'No Department Profiles Created Yet'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              {searchTerm || selectedDeptFilter !== 'all' ? 'Try broadening your search term or clearing department filters.' : 'Establish department mottos, executive summaries, syllabus overviews via Tiptap, and expected annual cost.'}
            </p>
          </div>
          {!isFormOpen && <button type="button" onClick={openCreateForm} className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer">
              
              Add First Department Profile
            </button>}
        </div> : viewMode === 'cards' ? (/* Cards Grid View */
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredList.map(item => <div key={item.id} className={`bg-white dark:bg-slate-900 rounded-2xl border ${editingRecord?.id === item.id ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200 dark:border-slate-800'} overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group`}>
              <div>
                {/* Card Header Banner */}
                <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 bg-linear-to-br from-slate-50/80 via-white to-slate-50/20 dark:from-slate-850 dark:via-slate-900 dark:to-slate-900">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.department_code && <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-bold">
                            {item.department_code}
                          </span>}
                        {item.session_name && <span className="text-[10px] text-slate-400">
                            {item.session_name}
                          </span>}
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1.5">
                        {item.department_name}
                      </h3>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                        Annual Cost
                      </span>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        ৳{parseFloat(item.expected_cost || 0).toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400 block">per academic year</span>
                    </div>
                  </div>

                  {/* Motto Quote */}
                  {item.motto ? <div className="mt-3 px-3 py-2 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs italic flex items-center gap-2">
                      
                      <span className="line-clamp-2">&ldquo;{item.motto}&rdquo;</span>
                    </div> : <div className="mt-3 text-[11px] text-slate-400 italic">
                      No motto defined yet
                    </div>}
                </div>

                {/* Card Body */}
                <div className="p-5 space-y-3.5 text-xs text-slate-600 dark:text-slate-300">
                  {/* Summary */}
                  {item.summary ? <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                        Executive Summary
                      </span>
                      <p className="line-clamp-3 leading-relaxed text-slate-700 dark:text-slate-300">
                        {item.summary}
                      </p>
                    </div> : null}

                  {/* Description preview */}
                  {item.description ? <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                        Curriculum Specifications (Tiptap Content)
                      </span>
                      <div className="line-clamp-3 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{
                __html: item.description
              }} />
                    </div> : <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-400 italic flex items-center gap-1.5">
                      
                      Detailed specifications not configured
                    </div>}
                </div>
              </div>

              {/* Inline Delete Confirmation or Normal Card Footer */}
              {deleteConfirmId === item.id ? <div className="p-4 border-t border-red-200 dark:border-red-900 bg-red-50/80 dark:bg-red-950/40 flex items-center justify-between text-xs animate-fadeIn">
                  <div className="flex items-center gap-1.5 text-red-700 dark:text-red-300 font-medium">
                    
                    <span>Delete {item.department_name} profile?</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => setDeleteConfirmId(null)} disabled={deletingId === item.id} className="px-2.5 py-1 rounded-md text-[11px] border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                      Cancel
                    </button>
                    <button type="button" onClick={() => handleInlineDeleteConfirm(item.id)} disabled={deletingId === item.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] bg-red-600 hover:bg-red-700 text-white font-semibold cursor-pointer disabled:opacity-60">
                      {deletingId === item.id ? null : null}
                      Confirm
                    </button>
                  </div>
                </div> : <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-xs">
                  <div className="text-[10px] text-slate-400">
                    {item.created_by_staff_name && <span>By: {item.created_by_staff_name}</span>}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => openEditForm(item)} className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors cursor-pointer" title="Edit Profile">
                      Edit
                    </button>

                    <button type="button" onClick={() => setDeleteConfirmId(item.id)} className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors cursor-pointer" title="Delete Profile">
                      Delete
                    </button>
                  </div>
                </div>}
            </div>)}
        </div>) : (/* Table View */
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Motto</th>
                  <th className="py-3 px-4">Expected Cost</th>
                  <th className="py-3 px-4">Executive Summary</th>
                  <th className="py-3 px-4">Detailed Description</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredList.map(item => <tr key={item.id} className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors ${editingRecord?.id === item.id ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''}`}>
                    <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{item.department_name}</span>
                        {item.department_code && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                            {item.department_code}
                          </span>}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 max-w-xs">
                      {item.motto ? <span className="italic text-emerald-700 dark:text-emerald-400 line-clamp-1">
                          &ldquo;{item.motto}&rdquo;
                        </span> : <span className="text-slate-400 italic">—</span>}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        ৳{parseFloat(item.expected_cost || 0).toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400 block">/ academic year</span>
                    </td>

                    <td className="py-3.5 px-4 max-w-sm text-slate-600 dark:text-slate-300">
                      <p className="line-clamp-2">{item.summary || '—'}</p>
                    </td>

                    <td className="py-3.5 px-4 max-w-sm text-slate-500 dark:text-slate-400">
                      {item.description ? <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                          
                          Tiptap Formatted
                        </span> : <span className="text-slate-400 italic">None</span>}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {deleteConfirmId === item.id ? <div className="inline-flex items-center gap-1.5">
                          <span className="text-[11px] text-red-600 font-semibold mr-1">Delete?</span>
                          <button type="button" onClick={() => setDeleteConfirmId(null)} disabled={deletingId === item.id} className="px-2 py-1 text-[10px] rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 cursor-pointer">
                            Cancel
                          </button>
                          <button type="button" onClick={() => handleInlineDeleteConfirm(item.id)} disabled={deletingId === item.id} className="px-2 py-1 text-[10px] rounded bg-red-600 text-white font-semibold cursor-pointer disabled:opacity-60">
                            {deletingId === item.id ? 'Deleting...' : 'Yes'}
                          </button>
                        </div> : <div className="flex items-center justify-end gap-1.5">
                          <button type="button" onClick={() => openEditForm(item)} className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors cursor-pointer" title="Edit">
                            Edit
                          </button>
                          <button type="button" onClick={() => setDeleteConfirmId(item.id)} className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors cursor-pointer" title="Delete">
                            Delete
                          </button>
                        </div>}
                    </td>
                  </tr>)}
              </tbody>
            </table>
          </div>
        </div>)}
    </div>;
}