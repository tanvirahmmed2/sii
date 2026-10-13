'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
  FiFileText,
  FiPlus,
  FiCalendar,
  FiUsers,
  FiDollarSign,
  FiCheckCircle,
  FiAlertCircle,
  FiSearch,
  FiEdit3,
  FiTrash2,
  FiRefreshCw,
  FiX,
  FiLayers,
  FiCheck
} from 'react-icons/fi';

export default function AdmissionCircularsPage() {
  const params = useParams();
  const domain = params?.domain || '';
  const apiBase = domain ? `/api/${domain}` : '/api';

  const [circulars, setCirculars] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  // Inline Workstation Form State (NO popup modal)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCircular, setEditingCircular] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const formSectionRef = useRef(null);

  // Form State
  const [form, setForm] = useState({
    title: '',
    department_id: '',
    session_id: '',
    class_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    result_date: new Date(Date.now() + 35 * 86400000).toISOString().split('T')[0],
    min_age: '10',
    max_age: '16',
    capacity: '100',
    status: 'open',
    is_published: true,
    fee_amount: '500',
    currency: 'BDT',
    description: '',
  });

  const fetchCirculars = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${apiBase}/staff/panel/admissions`);
      if (!res.ok) {
        throw new Error(`Server error (${res.status})`);
      }
      const data = await res.json();
      if (data.success) {
        setCirculars(data.circulars || []);
        setDepartments(data.departments || []);
        setSessions(data.sessions || []);
        setClasses(data.classes || []);
      } else {
        toast.error(data.error || 'Failed to fetch admission circulars.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error loading circulars.');
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    fetchCirculars();
  }, [fetchCirculars]);

  // Filter classes based on selected department & session in form
  const availableClassesForForm = useMemo(() => {
    return classes.filter((cls) => {
      if (form.department_id && String(cls.department_id) !== String(form.department_id)) {
        return false;
      }
      if (form.session_id && String(cls.session_id) !== String(form.session_id)) {
        return false;
      }
      return true;
    });
  }, [classes, form.department_id, form.session_id]);

  const openNewForm = () => {
    setEditingCircular(null);
    const activeSession = sessions.find((s) => s.is_current) || sessions[0];
    const firstDept = departments[0];
    setForm({
      title: '',
      department_id: firstDept ? String(firstDept.id) : '',
      session_id: activeSession ? String(activeSession.id) : '',
      class_id: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      result_date: new Date(Date.now() + 35 * 86400000).toISOString().split('T')[0],
      min_age: '10',
      max_age: '16',
      capacity: '100',
      status: 'open',
      is_published: true,
      fee_amount: '500',
      currency: 'BDT',
      description: '',
    });
    setIsFormOpen(true);
    setDeleteConfirmId(null);
    setTimeout(() => {
      formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const openEditForm = (circ) => {
    setEditingCircular(circ);
    setForm({
      title: circ.title || '',
      department_id: circ.department_id ? String(circ.department_id) : '',
      session_id: circ.session_id ? String(circ.session_id) : '',
      class_id: circ.class_id ? String(circ.class_id) : '',
      start_date: circ.start_date ? circ.start_date.split('T')[0] : '',
      end_date: circ.end_date ? circ.end_date.split('T')[0] : '',
      result_date: circ.result_date ? circ.result_date.split('T')[0] : '',
      min_age: circ.min_age !== null ? String(circ.min_age) : '',
      max_age: circ.max_age !== null ? String(circ.max_age) : '',
      capacity: circ.capacity !== null ? String(circ.capacity) : '100',
      status: circ.status || 'open',
      is_published: circ.is_published !== undefined ? Boolean(circ.is_published) : true,
      fee_amount: circ.fee_amount !== null && circ.fee_amount !== undefined ? String(circ.fee_amount) : '0',
      currency: circ.fee_currency || 'BDT',
      description: circ.description || '',
    });
    setIsFormOpen(true);
    setDeleteConfirmId(null);
    setTimeout(() => {
      formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingCircular(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Circular title is required.');
      return;
    }
    if (!form.department_id) {
      toast.error('Department selection is required.');
      return;
    }
    if (!form.session_id) {
      toast.error('Academic Session selection is required.');
      return;
    }
    if (!form.class_id) {
      toast.error('Class selection is required.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        id: editingCircular?.id,
        department_id: form.department_id ? parseInt(form.department_id, 10) : null,
        session_id: form.session_id ? parseInt(form.session_id, 10) : null,
        class_id: form.class_id ? parseInt(form.class_id, 10) : null,
        min_age: form.min_age ? parseInt(form.min_age, 10) : null,
        max_age: form.max_age ? parseInt(form.max_age, 10) : null,
        capacity: form.capacity ? parseInt(form.capacity, 10) : 100,
        fee_amount: form.fee_amount ? parseFloat(form.fee_amount) : 0,
      };

      const method = editingCircular ? 'PUT' : 'POST';
      const res = await fetch(`${apiBase}/staff/panel/admissions`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || (editingCircular ? 'Circular updated.' : 'Circular created.'));
        setIsFormOpen(false);
        setEditingCircular(null);
        fetchCirculars(true);
      } else {
        toast.error(data.error || 'Failed to save admission circular.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error during save operation.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      setDeletingId(id);
      const res = await fetch(`${apiBase}/staff/panel/admissions?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Admission circular deleted.');
        setDeleteConfirmId(null);
        fetchCirculars(true);
      } else {
        toast.error(data.error || 'Failed to delete admission circular.');
      }
    } catch {
      toast.error('Network error deleting circular.');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredCirculars = useMemo(() => {
    return circulars.filter((circ) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        circ.title.toLowerCase().includes(q) ||
        (circ.class_name && circ.class_name.toLowerCase().includes(q)) ||
        (circ.department_name && circ.department_name.toLowerCase().includes(q));
      const matchesStatus = statusFilter === 'all' || circ.status === statusFilter;
      const matchesDept = departmentFilter === 'all' || String(circ.department_id) === String(departmentFilter);
      return matchesSearch && matchesStatus && matchesDept;
    });
  }, [circulars, searchTerm, statusFilter, departmentFilter]);

  return (
    <div className="w-full space-y-4">
      {/* Header and KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Total Circulars</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">{circulars.length}</span>
            <span className="text-[10px] font-medium text-slate-500">Admissions</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Open Circulars</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {circulars.filter((c) => c.status === 'open').length}
            </span>
            <span className="text-[10px] font-medium text-emerald-600">Active Intake</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Total Applicants</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-blue-600 dark:text-blue-400 font-mono">
              {circulars.reduce((acc, c) => acc + (parseInt(c.total_applicants, 10) || 0), 0)}
            </span>
            <span className="text-[10px] font-medium text-blue-500">Submissions</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Departments Covered</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 font-mono">
              {departments.length}
            </span>
            <span className="text-[10px] font-medium text-slate-400">Academic Units</span>
          </div>
        </div>
      </div>

      {/* Inline Delete Confirmation Alert (NO popup modal) */}
      {deleteConfirmId && (
        <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 text-slate-900 dark:text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-start gap-2.5">
            <FiAlertCircle className="text-lg text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-rose-900 dark:text-rose-200">
                Confirm Deleting Admission Circular: {circulars.find((c) => c.id === deleteConfirmId)?.title || `#${deleteConfirmId}`}?
              </p>
              <p className="text-[11px] text-rose-700 dark:text-rose-300/80 mt-0.5">
                This will delete the circular configuration and associated application fee records.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              onClick={() => setDeleteConfirmId(null)}
              className="px-3 py-1.5 rounded text-xs border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => handleDelete(deleteConfirmId)}
              disabled={deletingId === deleteConfirmId}
              className="px-3.5 py-1.5 rounded text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {deletingId === deleteConfirmId ? (
                <>
                  <div className="loader loader-xs loader-white" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <FiTrash2 className="text-sm" />
                  <span>Confirm Delete</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Inline Workstation Form (NO popup modal) */}
      {isFormOpen && (
        <div ref={formSectionRef} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm space-y-4 animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {editingCircular ? `Edit Admission Circular: ${editingCircular.title}` : 'Create New Admission Circular'}
              </h3>
            </div>
            <button
              onClick={closeForm}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Close form"
            >
              <FiX className="text-lg" />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Circular Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Admission 2026 - Science & General Intake"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Department <span className="text-rose-500">*</span>
                </label>
                <select
                  value={form.department_id}
                  onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                  required
                  className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                >
                  <option value="">Select Department...</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} {d.code ? `(${d.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Academic Session <span className="text-rose-500">*</span>
                </label>
                <select
                  value={form.session_id}
                  onChange={(e) => setForm({ ...form, session_id: e.target.value })}
                  required
                  className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                >
                  <option value="">Select Session...</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.is_current ? '(Current)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Class <span className="text-rose-500">*</span>
                </label>
                <select
                  value={form.class_id}
                  onChange={(e) => setForm({ ...form, class_id: e.target.value })}
                  required
                  className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                >
                  <option value="">Select Target Class...</option>
                  {availableClassesForForm.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Start Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  required
                  className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Application Deadline <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  required
                  className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Result Date (Auto-Publish)
                </label>
                <input
                  type="date"
                  value={form.result_date}
                  onChange={(e) => setForm({ ...form, result_date: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Admission Fee Amount (BDT)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.fee_amount}
                  onChange={(e) => setForm({ ...form, fee_amount: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Available Seats / Capacity
                </label>
                <input
                  type="number"
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Min & Max Candidate Age
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="number"
                    placeholder="Min"
                    value={form.min_age}
                    onChange={(e) => setForm({ ...form, min_age: e.target.value })}
                    className="w-full text-xs px-2.5 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={form.max_age}
                    onChange={(e) => setForm({ ...form, max_age: e.target.value })}
                    className="w-full text-xs px-2.5 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                >
                  <option value="open">Open (Accepting Applications)</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="closed">Closed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Circular Description / Instructions
              </label>
              <textarea
                rows={2}
                placeholder="Enter intake guidelines, prerequisites, and instructions..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={closeForm}
                className="px-3.5 py-1.5 rounded text-xs border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-1.5 rounded text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition cursor-pointer disabled:opacity-50 min-w-[120px] flex items-center justify-center gap-1.5"
              >
                {saving ? (
                  <>
                    <div className="loader loader-xs loader-white" />
                    <span>Saving...</span>
                  </>
                ) : editingCircular ? (
                  <>
                    <FiCheck className="text-sm" />
                    <span>Update Circular</span>
                  </>
                ) : (
                  <>
                    <FiPlus className="text-sm" />
                    <span>Create Circular</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Control Bar: Search, Filters, Refresh, Create Action */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-64">
            <FiSearch className="absolute left-2.5 top-2.5 text-slate-400 text-xs" />
            <input
              type="text"
              placeholder="Search circulars..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
            />
          </div>

          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="upcoming">Upcoming</option>
            <option value="closed">Closed</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={() => fetchCirculars(false)}
            title="Refresh list"
            className="p-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <FiRefreshCw className="text-sm" />
          </button>

          {!isFormOpen && (
            <button
              onClick={openNewForm}
              className="px-3 py-1.5 rounded text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <FiPlus className="text-sm" />
              <span>Create Circular</span>
            </button>
          )}
        </div>
      </div>

      {/* Admission Circulars Table (Wide single row format) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50/75 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Title & Circular ID</th>
                <th className="py-2.5 px-3">Department</th>
                <th className="py-2.5 px-3">Session & Class</th>
                <th className="py-2.5 px-3">Application Window</th>
                <th className="py-2.5 px-3">Result Date</th>
                <th className="py-2.5 px-3">Fee (BDT)</th>
                <th className="py-2.5 px-3">Applicants</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="loader loader-sm" />
                      <span className="text-xs">Loading admission circulars...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredCirculars.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <FiFileText className="text-3xl text-slate-300 dark:text-slate-600 mb-1" />
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">No admission circulars found</span>
                      <span className="text-[11px] text-slate-400">Create an admission circular for a department and class</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCirculars.map((circ) => (
                  <tr
                    key={circ.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-2.5 px-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900 dark:text-white text-xs">{circ.title}</span>
                        <span className="text-[10px] font-mono text-slate-400">{circ.circular_number || `#${circ.id}`}</span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200 font-medium">
                      {circ.department_name ? (
                        <span className="inline-flex items-center gap-1">
                          <FiLayers className="text-slate-400 text-xs" />
                          {circ.department_name}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">None</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300">
                          {circ.session_name || 'N/A'}
                        </span>
                        <span className="text-slate-400">&bull;</span>
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                          {circ.class_name || 'N/A'}
                        </span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                      {circ.start_date ? new Date(circ.start_date).toLocaleDateString() : 'N/A'}
                      {' '}&rarr;{' '}
                      {circ.end_date ? new Date(circ.end_date).toLocaleDateString() : 'N/A'}
                    </td>

                    <td className="py-2.5 px-3 font-mono text-[11px] text-purple-600 dark:text-purple-400 font-medium">
                      {circ.result_date ? new Date(circ.result_date).toLocaleDateString() : 'Pending'}
                    </td>

                    <td className="py-2.5 px-3 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      ৳{parseFloat(circ.fee_amount || 0).toFixed(2)}
                    </td>

                    <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                      <span className="font-bold text-slate-900 dark:text-white">{circ.total_applicants || 0}</span>
                      <span className="text-slate-400 text-[10px] ml-1">/ {circ.capacity || 100}</span>
                    </td>

                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                          circ.status === 'open'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50'
                            : circ.status === 'upcoming'
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {circ.status || 'open'}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditForm(circ)}
                          title="Edit Circular"
                          className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition cursor-pointer"
                        >
                          <FiEdit3 className="text-sm" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(circ.id)}
                          title="Delete Circular"
                          className="p-1 rounded text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition cursor-pointer"
                        >
                          <FiTrash2 className="text-sm" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
