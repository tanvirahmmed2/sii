'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';

export default function ClassSetupPage() {
  const params = useParams();
  const domain = params?.domain || '';

  const [classes, setClasses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState('all');

  // Inline Workstation Form State (NO popup modal)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    department_id: '',
    max_seats: 40,
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Inline Delete Confirmation State (NO popup modal)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const formSectionRef = useRef(null);

  const fetchClasses = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch(`/api/${domain}/staff/panel/classes`);
      const data = await res.json();
      if (data.success) {
        setClasses(data.classes || []);
        setDepartments(data.available_departments || data.departments || []);
      } else {
        setErrorMsg(data.error || 'Failed to fetch classes.');
      }
    } catch {
      setErrorMsg('Network error fetching classes.');
    } finally {
      setLoading(false);
    }
  }, [domain]);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/${domain}/staff/panel/classes`);
        const data = await res.json();
        if (!ignore && data.success) {
          setClasses(data.classes || []);
          setDepartments(data.available_departments || data.departments || []);
        }
      } catch {
        if (!ignore) setErrorMsg('Network error fetching classes.');
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [domain]);

  const filteredClasses = useMemo(() => {
    return classes.filter(c => {
      if (selectedDepartmentFilter !== 'all' && String(c.department_id) !== String(selectedDepartmentFilter)) {
        return false;
      }
      const q = searchTerm.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        (c.code && c.code.toLowerCase().includes(q)) ||
        (c.department_name && c.department_name.toLowerCase().includes(q))
      );
    });
  }, [classes, searchTerm, selectedDepartmentFilter]);

  const totalSeats = useMemo(() => {
    return classes.reduce((sum, c) => sum + (parseInt(c.max_seats, 10) || 0), 0);
  }, [classes]);

  const totalSections = useMemo(() => {
    return classes.reduce((sum, c) => sum + (parseInt(c.section_count, 10) || 0), 0);
  }, [classes]);

  const openCreateForm = () => {
    setEditingClass(null);
    setFormData({
      name: '',
      code: `CLS-${classes.length + 1}`,
      department_id: departments[0]?.id ? String(departments[0].id) : '',
      max_seats: 40,
      description: ''
    });
    setErrorMsg('');
    setIsFormOpen(true);
    setDeleteConfirmId(null);
    setTimeout(() => {
      formSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 100);
  };

  const openEditForm = classItem => {
    setEditingClass(classItem);
    setFormData({
      name: classItem.name,
      code: classItem.code,
      department_id: classItem.department_id ? String(classItem.department_id) : '',
      max_seats: classItem.max_seats || 40,
      description: classItem.description || ''
    });
    setErrorMsg('');
    setIsFormOpen(true);
    setDeleteConfirmId(null);
    setTimeout(() => {
      formSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 100);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingClass(null);
    setErrorMsg('');
  };

  const handleFormSubmit = async e => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg('Class Name is required.');
      return;
    }
    // Only Department is strictly REQUIRED
    if (!formData.department_id) {
      setErrorMsg('Department is required to create a class.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');
      const url = `/api/${domain}/staff/panel/classes`;
      const method = editingClass ? 'PUT' : 'POST';
      const body = editingClass
        ? { ...formData, id: editingClass.id }
        : formData;

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message || 'Class saved successfully.');
        setTimeout(() => setSuccessMsg(''), 4000);
        setIsFormOpen(false);
        setEditingClass(null);
        fetchClasses(true);
      } else {
        setErrorMsg(data.error || 'Failed to save class.');
      }
    } catch {
      setErrorMsg('Network error saving class.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async id => {
    try {
      setDeletingId(id);
      const res = await fetch(`/api/${domain}/staff/panel/classes?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Class deleted successfully.');
        setTimeout(() => setSuccessMsg(''), 4000);
        setDeleteConfirmId(null);
        fetchClasses(true);
      } else {
        setErrorMsg(data.error || 'Failed to delete class.');
      }
    } catch {
      setErrorMsg('Network error deleting class.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Total Classes</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">{classes.length}</span>
            <span className="text-[10px] font-medium text-slate-500">Configured Grades</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Total Sections</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-blue-600 dark:text-blue-400 font-mono">{totalSections}</span>
            <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">Batches Active</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Total Seat Capacity</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">{totalSeats}</span>
            <span className="text-[10px] font-medium text-emerald-600">Students Intake</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Department Hierarchy</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Department-Centric
            </span>
            <span className="text-[10px] font-medium text-slate-400">Under Departments</span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 rounded text-xs bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
          <span className="flex items-center gap-1.5">{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-[10px] font-mono cursor-pointer hover:underline">DISMISS</button>
        </div>
      )}
      {errorMsg && (
        <div className="p-3 rounded text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 flex items-center justify-between">
          <span className="flex items-center gap-1.5">{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="text-[10px] font-mono cursor-pointer hover:underline">DISMISS</button>
        </div>
      )}

      {/* Inline Delete Confirmation Alert (NO popup modal) */}
      {deleteConfirmId && (
        <div className="p-4 rounded border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-rose-800 dark:text-rose-300">
              Confirm deletion of Class &quot;{classes.find(c => c.id === deleteConfirmId)?.name}&quot;?
            </p>
            <p className="text-[11px] text-rose-600 dark:text-rose-400">
              Warning: This will also remove any sections and classroom links assigned directly under this class.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setDeleteConfirmId(null)}
              className="px-3 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => handleDelete(deleteConfirmId)}
              disabled={deletingId === deleteConfirmId}
              className="px-3 py-1 text-xs font-semibold rounded bg-rose-600 hover:bg-rose-700 text-white cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {deletingId === deleteConfirmId ? 'Deleting...' : 'Confirm Delete'}
            </button>
          </div>
        </div>
      )}

      {/* Inline Workstation Form (NO popup modal) */}
      {isFormOpen && (
        <div ref={formSectionRef} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Class Workstation</span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {editingClass ? `Edit Class: ${editingClass.name}` : 'Setup New Academic Class / Grade'}
              </h3>
            </div>
            <button
              onClick={closeForm}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              Close
            </button>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Class Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Class 1, Grade 10, Standard 5"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Class Code / Identifier <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. CLS-01, G-10"
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value })}
                  required
                  className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden font-mono uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Academic Department (Discipline) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.department_id}
                  onChange={e => setFormData({ ...formData, department_id: e.target.value })}
                  required
                  className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                >
                  <option value="">-- Select Academic Department (Required) --</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} {d.code ? `(${d.code})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Every class belongs directly to an academic department/faculty.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Maximum Seat Capacity
                </label>
                <input
                  type="number"
                  min="1"
                  max="2000"
                  value={formData.max_seats}
                  onChange={e => setFormData({ ...formData, max_seats: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Default maximum seat allocation across all sections.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Description / Remarks
              </label>
              <input
                type="text"
                placeholder="Optional notes or details about this academic grade..."
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
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
                disabled={submitting}
                className="px-4 py-1.5 rounded text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition cursor-pointer disabled:opacity-50 min-w-[110px] flex items-center justify-center gap-1.5"
              >
                {submitting ? (
                  <span>Saving...</span>
                ) : editingClass ? (
                  <span>Update Class</span>
                ) : (
                  <span>Create Class</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Workstation Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 flex-1 max-w-xl flex-wrap">
            <div className="relative flex-1 min-w-[160px]">
              <input
                type="text"
                placeholder="Search class or department..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              />
            </div>
            {departments.length > 0 && (
              <div className="w-48">
                <select
                  value={selectedDepartmentFilter}
                  onChange={e => setSelectedDepartmentFilter(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                >
                  <option value="all">All Departments</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchClasses(false)}
              className="px-2.5 py-1.5 rounded text-xs border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
              title="Refresh"
            >
              Refresh
            </button>
            <button
              onClick={openCreateForm}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition cursor-pointer"
            >
              <span>+ Add Class</span>
            </button>
          </div>
        </div>

        {/* Classes Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-12 flex justify-center items-center">
              <span className="text-xs text-slate-400">Loading classes...</span>
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">No classes configured yet.</p>
              <button onClick={openCreateForm} className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                Set up your first school class
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Class / Grade</th>
                  <th className="py-2.5 px-3">Academic Department <span className="text-rose-500">*</span></th>
                  <th className="py-2.5 px-3">Class Code</th>
                  <th className="py-2.5 px-3">Max Seats</th>
                  <th className="py-2.5 px-3">Sections</th>
                  <th className="py-2.5 px-3">Subjects</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
                {filteredClasses.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-[11px] text-slate-700 dark:text-slate-300 shrink-0">
                          {item.name?.slice(0, 2).toUpperCase() || 'CL'}
                        </div>
                        <div>
                          <div>{item.name}</div>
                          {item.description && (
                            <div className="text-[10px] text-slate-400 font-normal truncate max-w-xs">{item.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        {item.department_name || `Department #${item.department_id}`}
                      </span>
                      {item.department_code && (
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {item.department_code}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                        {item.code}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300">
                      {item.max_seats} seats
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400">
                        <span>{item.section_count} sections</span>
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        <span>{item.subject_count} subjects</span>
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditForm(item)}
                          className="px-2 py-1 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          title="Edit"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(item.id)}
                          className="px-2 py-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          title="Delete"
                        >
                          Delete
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