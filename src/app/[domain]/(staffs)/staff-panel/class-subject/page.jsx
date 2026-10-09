'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { BiBookOpen, BiPlus, BiEdit, BiTrash, BiSearch, BiRefresh, BiAward, BiCheck, BiX } from 'react-icons/bi';

export default function ClassSubjectPage() {
  const params = useParams();
  const domain = params?.domain || '';

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState(null);
  const [formData, setFormData] = useState({
    class_id: '',
    subject_id: '',
    full_marks: 100,
    pass_marks: 33,
    is_optional: false
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Delete State
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [clsRes, subRes, csRes] = await Promise.all([
        fetch(`/api/${domain}/staff/panel/classes`),
        fetch(`/api/${domain}/staff/panel/subjects`),
        fetch(`/api/${domain}/staff/panel/class-subjects${selectedClassId ? `?class_id=${selectedClassId}` : ''}`)
      ]);

      const clsData = await clsRes.json();
      const subData = await subRes.json();
      const csData = await csRes.json();

      if (clsData.success) {
        setClasses(clsData.classes || []);
        if (!selectedClassId && clsData.classes?.length > 0) {
          setSelectedClassId(String(clsData.classes[0].id));
        }
      }
      if (subData.success) setSubjects(subData.subjects || []);
      if (csData.success) setClassSubjects(csData.classSubjects || []);
    } catch (err) {
      setErrorMsg('Network error fetching class subjects mapping.');
    } finally {
      setLoading(false);
    }
  }, [domain, selectedClassId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredMappings = useMemo(() => {
    return classSubjects.filter((cs) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        (cs.subject_name && cs.subject_name.toLowerCase().includes(q)) ||
        (cs.subject_code && cs.subject_code.toLowerCase().includes(q)) ||
        (cs.class_name && cs.class_name.toLowerCase().includes(q));
      const matchesClass = !selectedClassId || String(cs.class_id) === String(selectedClassId);
      return matchesSearch && matchesClass;
    });
  }, [classSubjects, searchTerm, selectedClassId]);

  // Unassigned subjects for the currently selected class
  const unassignedSubjects = useMemo(() => {
    if (!selectedClassId) return subjects;
    const assignedSubIds = new Set(
      classSubjects
        .filter((cs) => String(cs.class_id) === String(selectedClassId))
        .map((cs) => String(cs.subject_id))
    );
    return subjects.filter((s) => !assignedSubIds.has(String(s.id)));
  }, [subjects, classSubjects, selectedClassId]);

  const openAssignModal = () => {
    setEditingMapping(null);
    setFormData({
      class_id: selectedClassId || (classes[0]?.id ? String(classes[0].id) : ''),
      subject_id: unassignedSubjects[0]?.id ? String(unassignedSubjects[0].id) : '',
      full_marks: 100,
      pass_marks: 33,
      is_optional: false
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (cs) => {
    setEditingMapping(cs);
    setFormData({
      class_id: String(cs.class_id),
      subject_id: String(cs.subject_id),
      full_marks: cs.full_marks,
      pass_marks: cs.pass_marks,
      is_optional: Boolean(cs.is_optional)
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.class_id || !formData.subject_id) {
      setErrorMsg('Please select both a class and a subject.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');

      const url = `/api/${domain}/staff/panel/class-subjects`;
      const method = editingMapping ? 'PUT' : 'POST';
      const body = editingMapping ? { ...formData, id: editingMapping.id } : formData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (data.success) {
        setSuccessMsg(data.message || 'Subject mapping updated.');
        setTimeout(() => setSuccessMsg(''), 4000);
        setIsModalOpen(false);
        fetchData();
      } else {
        setErrorMsg(data.error || 'Failed to update mapping.');
      }
    } catch (err) {
      setErrorMsg('Network error saving mapping.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      setDeleting(true);
      const res = await fetch(`/api/${domain}/staff/panel/class-subjects?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Subject unassigned from class.');
        setTimeout(() => setSuccessMsg(''), 4000);
        setDeleteId(null);
        fetchData();
      } else {
        setErrorMsg(data.error || 'Failed to unassign subject.');
      }
    } catch (err) {
      setErrorMsg('Network error unassigning subject.');
    } finally {
      setDeleting(false);
    }
  };

  const activeClassObj = useMemo(() => {
    return classes.find((c) => String(c.id) === String(selectedClassId));
  }, [classes, selectedClassId]);

  return (
    <div className="w-full space-y-4">
      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Current Class</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-bold text-slate-900 dark:text-white">
              {activeClassObj ? activeClassObj.name : 'All Classes'}
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              {activeClassObj?.code || ''}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Assigned Subjects</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-blue-600 dark:text-blue-400 font-mono">{filteredMappings.length}</span>
            <span className="text-[10px] font-medium text-blue-600">In Syllabus</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Compulsory Courses</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {filteredMappings.filter(m => !m.is_optional).length}
            </span>
            <span className="text-[10px] font-medium text-emerald-600">Core Subjects</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Total Marks Load</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-purple-600 dark:text-purple-400 font-mono">
              {filteredMappings.reduce((sum, m) => sum + (parseFloat(m.full_marks) || 0), 0)}
            </span>
            <span className="text-[10px] font-medium text-purple-600">Total Marks</span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 rounded text-xs bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
          <span>{successMsg}</span>
          <span className="text-[10px] font-mono">OK</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3 rounded text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="text-[10px] font-mono cursor-pointer">DISMISS</button>
        </div>
      )}

      {/* Workstation Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-4">
        {/* Class Selection Tabs Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-100 dark:border-slate-800">
          {classes.map((c) => {
            const isActive = String(c.id) === String(selectedClassId);
            return (
              <button
                key={c.id}
                onClick={() => setSelectedClassId(String(c.id))}
                className={`px-3 py-1.5 rounded text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {c.name}
              </button>
            );
          })}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <BiSearch className="absolute left-2.5 top-2.5 text-slate-400 text-sm" />
              <input
                type="text"
                placeholder="Search assigned subject..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              className="p-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
              title="Refresh"
            >
              <BiRefresh className="text-base" />
            </button>
            <button
              onClick={openAssignModal}
              disabled={classes.length === 0 || subjects.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition cursor-pointer disabled:opacity-40"
            >
              <BiPlus className="text-base" />
              <span>Assign Subject</span>
            </button>
          </div>
        </div>

        {/* Mappings Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">Loading class subjects...</div>
          ) : filteredMappings.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <BiBookOpen className="mx-auto text-3xl text-slate-400" />
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                No subjects assigned to {activeClassObj?.name || 'this class'} yet.
              </p>
              <button
                onClick={openAssignModal}
                disabled={unassignedSubjects.length === 0}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer disabled:opacity-50"
              >
                Assign curriculum subjects now
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Subject Name</th>
                  <th className="py-2.5 px-3">Subject Code</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Full Marks</th>
                  <th className="py-2.5 px-3">Pass Marks</th>
                  <th className="py-2.5 px-3">Course Nature</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
                {filteredMappings.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <BiBookOpen className="text-slate-400 text-sm" />
                      <span>{item.subject_name}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                        {item.subject_code}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[11px] text-slate-600 dark:text-slate-400">
                      {item.subject_type || 'Theory'}
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold text-slate-900 dark:text-white">
                      {parseFloat(item.full_marks).toFixed(0)}
                    </td>
                    <td className="py-3 px-3 font-mono text-emerald-600 dark:text-emerald-400">
                      {parseFloat(item.pass_marks).toFixed(0)}
                    </td>
                    <td className="py-3 px-3">
                      {item.is_optional ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          Optional
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          <BiCheck /> Compulsory
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          title="Edit Marks / Option"
                        >
                          <BiEdit className="text-sm" />
                        </button>
                        <button
                          onClick={() => setDeleteId(item.id)}
                          className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          title="Unassign"
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

      {/* Assign / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-md w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {editingMapping ? 'Edit Subject Marks' : 'Assign Subject to Class'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Class
                </label>
                <select
                  value={formData.class_id}
                  onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                  disabled={Boolean(editingMapping)}
                  required
                  className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer disabled:opacity-60"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Subject *
                </label>
                {editingMapping ? (
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 p-2 bg-slate-100 dark:bg-slate-800 rounded">
                    {editingMapping.subject_name} ({editingMapping.subject_code})
                  </div>
                ) : (
                  <select
                    value={formData.subject_id}
                    onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                    required
                    className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                  >
                    <option value="">Select subject to assign...</option>
                    {unassignedSubjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code} - {s.type})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Full Marks (100)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    step="0.5"
                    value={formData.full_marks}
                    onChange={(e) => setFormData({ ...formData, full_marks: e.target.value })}
                    required
                    className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Pass Marks (33)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    step="0.5"
                    value={formData.pass_marks}
                    onChange={(e) => setFormData({ ...formData, pass_marks: e.target.value })}
                    required
                    className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="is_optional"
                  checked={formData.is_optional}
                  onChange={(e) => setFormData({ ...formData, is_optional: e.target.checked })}
                  className="rounded text-slate-900 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="is_optional" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  Mark as optional / elective course for this class
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded text-xs border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3.5 py-1.5 rounded text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingMapping ? 'Update Marks' : 'Assign Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-sm w-full p-4 shadow-xl space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Unassign Subject?</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Are you sure you want to remove this subject from the class curriculum? Any existing timetable periods for this subject in this class will also be cleared.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteId(null)}
                className="px-3 py-1.5 rounded text-xs border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                disabled={deleting}
                className="px-3 py-1.5 rounded text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer disabled:opacity-50"
              >
                {deleting ? 'Removing...' : 'Confirm Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
