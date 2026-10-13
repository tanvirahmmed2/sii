'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import {
  BiGridAlt,
  BiPlus,
  BiEdit,
  BiTrash,
  BiSearch,
  BiRefresh,
  BiDoorOpen,
  BiX,
  BiCheck,
  BiAlertTriangle,
  BiLayer
} from 'react-icons/bi';

export default function ClassSectionPage() {
  const params = useParams();
  const domain = params?.domain || '';

  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('all');

  // Inline Workstation Form State (NO popup modal)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [formData, setFormData] = useState({
    class_id: '',
    name: '',
    capacity: 40,
    room_number: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Inline Delete Confirmation State (NO popup modal)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const formSectionRef = useRef(null);

  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch(
        `/api/${domain}/staff/panel/sections${selectedClassId !== 'all' ? `?class_id=${selectedClassId}` : ''}`
      );
      const secData = await res.json();

      if (secData.success) {
        setSections(secData.sections || []);
        if (secData.available_classes) {
          setClasses(secData.available_classes);
        }
      } else {
        setErrorMsg(secData.error || 'Failed to fetch sections.');
      }
    } catch {
      setErrorMsg('Network error fetching sections data.');
    } finally {
      setLoading(false);
    }
  }, [domain, selectedClassId]);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const res = await fetch(
          `/api/${domain}/staff/panel/sections${selectedClassId !== 'all' ? `?class_id=${selectedClassId}` : ''}`
        );
        const data = await res.json();
        if (!ignore && data.success) {
          setSections(data.sections || []);
          if (data.available_classes) setClasses(data.available_classes);
        }
      } catch {
        if (!ignore) setErrorMsg('Network error fetching sections.');
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [domain, selectedClassId]);

  const filteredSections = useMemo(() => {
    return sections.filter((s) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        s.name.toLowerCase().includes(q) ||
        (s.class_name && s.class_name.toLowerCase().includes(q)) ||
        (s.department_name && s.department_name.toLowerCase().includes(q)) ||
        (s.room_number && s.room_number.toLowerCase().includes(q));
      const matchesClass = selectedClassId === 'all' || String(s.class_id) === String(selectedClassId);
      return matchesSearch && matchesClass;
    });
  }, [sections, searchTerm, selectedClassId]);

  const openCreateForm = () => {
    setEditingSection(null);
    setFormData({
      class_id: selectedClassId !== 'all' ? selectedClassId : classes[0]?.id ? String(classes[0].id) : '',
      name: '',
      capacity: 40,
      room_number: ''
    });
    setErrorMsg('');
    setIsFormOpen(true);
    setDeleteConfirmId(null);
    setTimeout(() => {
      formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const openEditForm = (sec) => {
    setEditingSection(sec);
    setFormData({
      class_id: String(sec.class_id),
      name: sec.name,
      capacity: sec.capacity || 40,
      room_number: sec.room_number || ''
    });
    setErrorMsg('');
    setIsFormOpen(true);
    setDeleteConfirmId(null);
    setTimeout(() => {
      formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingSection(null);
    setErrorMsg('');
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.class_id) {
      setErrorMsg('Please select a parent class.');
      return;
    }
    if (!formData.name.trim()) {
      setErrorMsg('Section name is required (e.g. Section A, Morning, Tulip).');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');

      const url = `/api/${domain}/staff/panel/sections`;
      const method = editingSection ? 'PUT' : 'POST';
      const body = editingSection ? { ...formData, id: editingSection.id } : formData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (data.success) {
        setSuccessMsg(data.message || 'Section saved successfully.');
        setTimeout(() => setSuccessMsg(''), 4000);
        setIsFormOpen(false);
        setEditingSection(null);
        fetchData(true);
      } else {
        setErrorMsg(data.error || 'Failed to save section.');
      }
    } catch {
      setErrorMsg('Network error saving section.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      setDeletingId(id);
      const res = await fetch(`/api/${domain}/staff/panel/sections?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Section deleted successfully.');
        setTimeout(() => setSuccessMsg(''), 4000);
        setDeleteConfirmId(null);
        fetchData(true);
      } else {
        setErrorMsg(data.error || 'Failed to delete section.');
      }
    } catch {
      setErrorMsg('Network error deleting section.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Total Sections</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">{sections.length}</span>
            <span className="text-[10px] font-medium text-slate-500">Active Batches</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Classes Mapped</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-blue-600 dark:text-blue-400 font-mono">
              {new Set(sections.map((s) => s.class_id)).size}
            </span>
            <span className="text-[10px] font-medium text-blue-600">Covered Grades</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Section Capacity</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {sections.reduce((sum, s) => sum + (parseInt(s.capacity, 10) || 0), 0)}
            </span>
            <span className="text-[10px] font-medium text-emerald-600">Max Desks</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Hierarchy Position</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Step 4 of 4
            </span>
            <span className="text-[10px] font-medium text-slate-400">Under Classes</span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 rounded text-xs bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <BiCheck className="text-base text-emerald-600" />
            {successMsg}
          </span>
          <button onClick={() => setSuccessMsg('')} className="text-[10px] font-mono cursor-pointer hover:underline">DISMISS</button>
        </div>
      )}
      {errorMsg && (
        <div className="p-3 rounded text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <BiAlertTriangle className="text-base text-rose-600" />
            {errorMsg}
          </span>
          <button onClick={() => setErrorMsg('')} className="text-[10px] font-mono cursor-pointer hover:underline">DISMISS</button>
        </div>
      )}

      {/* Inline Delete Confirmation Alert (NO popup modal) */}
      {deleteConfirmId && (
        <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 text-slate-900 dark:text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-start gap-2.5">
            <BiAlertTriangle className="text-lg text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-rose-900 dark:text-rose-200">
                Confirm Deleting Section: {sections.find((s) => s.id === deleteConfirmId)?.name || `#${deleteConfirmId}`}?
              </p>
              <p className="text-[11px] text-rose-700 dark:text-rose-300/80 mt-0.5">
                This will unassign students and routine schedules registered in this section.
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
                  <BiTrash className="text-sm" />
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
                {editingSection ? `Edit Section: ${editingSection.name}` : 'Create New Class Section / Batch'}
              </h3>
            </div>
            <button
              onClick={closeForm}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Close form"
            >
              <BiX className="text-lg" />
            </button>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Parent Class <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.class_id}
                  onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                  required
                  className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                >
                  <option value="">Select Target Class...</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.code ? `(${c.code})` : ''} {c.department_name ? `• [Dept: ${c.department_name}]` : ''} {c.session_name ? `• [Term: ${c.session_name}]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Section Name / Batch Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Section A, Morning Shift, Magnolia"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Max Student Capacity (Seats)
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assigned Room / Venue Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. Room 102, Science Lab B"
                  value={formData.room_number}
                  onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>
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
                disabled={submitting}
                className="px-4 py-1.5 rounded text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition cursor-pointer disabled:opacity-50 min-w-[110px] flex items-center justify-center gap-1.5"
              >
                {submitting ? (
                  <>
                    <div className="loader loader-xs loader-white" />
                    <span>Saving...</span>
                  </>
                ) : editingSection ? (
                  <>
                    <BiCheck className="text-sm" />
                    <span>Update Section</span>
                  </>
                ) : (
                  <>
                    <BiPlus className="text-sm" />
                    <span>Create Section</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sections Table Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 flex-1 max-w-lg flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <BiSearch className="absolute left-2.5 top-2.5 text-slate-400 text-sm" />
              <input
                type="text"
                placeholder="Search section, class, room..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              />
            </div>
            {classes.length > 0 && (
              <div className="w-48">
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                >
                  <option value="all">All Classes</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.code ? `(${c.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchData(false)}
              className="p-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
              title="Refresh"
            >
              <BiRefresh className="text-base" />
            </button>
            <button
              onClick={openCreateForm}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition cursor-pointer"
            >
              <BiPlus className="text-base" />
              <span>Add Section</span>
            </button>
          </div>
        </div>

        {/* Sections Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-12 flex justify-center items-center">
              <div className="loader loader-sm" />
            </div>
          ) : filteredSections.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <BiGridAlt className="mx-auto text-3xl text-slate-400" />
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">No sections found.</p>
              <button
                onClick={openCreateForm}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Create your first class section
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Section Name</th>
                  <th className="py-2.5 px-3">Parent Class</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3">Academic Session</th>
                  <th className="py-2.5 px-3">Max Capacity</th>
                  <th className="py-2.5 px-3">Assigned Room</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
                {filteredSections.map((sec) => (
                  <tr key={sec.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-[10px] shrink-0 border border-blue-100 dark:border-blue-900/40">
                          {sec.name?.slice(0, 2).toUpperCase() || 'SC'}
                        </div>
                        <span>{sec.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {sec.class_name}
                      </span>
                      {sec.class_code && (
                        <span className="ml-1 text-[10px] font-mono text-slate-400">
                          ({sec.class_code})
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {sec.department_name ? (
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                          {sec.department_name}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">General</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                      {sec.session_name || 'All Terms'}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300">
                      {sec.capacity} seats
                    </td>
                    <td className="py-3 px-3">
                      {sec.room_number ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                          <BiDoorOpen className="text-sm text-slate-400" />
                          <span>{sec.room_number}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Not set</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditForm(sec)}
                          className="p-1.5 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          title="Edit"
                        >
                          <BiEdit className="text-sm" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(sec.id)}
                          className="p-1.5 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          title="Delete"
                        >
                          <BiTrash className="text-sm" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
