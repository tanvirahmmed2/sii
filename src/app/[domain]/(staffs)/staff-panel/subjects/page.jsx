'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { BiBook, BiPlus, BiEdit, BiTrash, BiSearch, BiRefresh, BiLayer } from 'react-icons/bi';

export default function SubjectsPage() {
  const params = useParams();
  const domain = params?.domain || '';

  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'Theory',
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Delete State
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchSubjects = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/${domain}/staff/panel/subjects`);
      const data = await res.json();
      if (data.success) {
        setSubjects(data.subjects || []);
      } else {
        setErrorMsg(data.error || 'Failed to fetch subjects.');
      }
    } catch (err) {
      setErrorMsg('Network error fetching subjects.');
    } finally {
      setLoading(false);
    }
  }, [domain]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  const filteredSubjects = useMemo(() => {
    return subjects.filter((s) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        s.name.toLowerCase().includes(q) ||
        (s.code && s.code.toLowerCase().includes(q));
      const matchesType = typeFilter === 'all' || s.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [subjects, searchTerm, typeFilter]);

  const openCreateModal = () => {
    setEditingSubject(null);
    setFormData({
      name: '',
      code: '',
      type: 'Theory',
      description: ''
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (sub) => {
    setEditingSubject(sub);
    setFormData({
      name: sub.name,
      code: sub.code,
      type: sub.type || 'Theory',
      description: sub.description || ''
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg('Subject Name is required.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');

      const url = `/api/${domain}/staff/panel/subjects`;
      const method = editingSubject ? 'PUT' : 'POST';
      const body = editingSubject ? { ...formData, id: editingSubject.id } : formData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (data.success) {
        setSuccessMsg(data.message || 'Subject saved successfully.');
        setTimeout(() => setSuccessMsg(''), 4000);
        setIsModalOpen(false);
        fetchSubjects();
      } else {
        setErrorMsg(data.error || 'Failed to save subject.');
      }
    } catch (err) {
      setErrorMsg('Network error saving subject.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      setDeleting(true);
      const res = await fetch(`/api/${domain}/staff/panel/subjects?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Subject deleted successfully.');
        setTimeout(() => setSuccessMsg(''), 4000);
        setDeleteId(null);
        fetchSubjects();
      } else {
        setErrorMsg(data.error || 'Failed to delete subject.');
      }
    } catch (err) {
      setErrorMsg('Network error deleting subject.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Total Subjects</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">{subjects.length}</span>
            <span className="text-[10px] font-medium text-slate-500">In Curriculum</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Theory Subjects</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-blue-600 dark:text-blue-400 font-mono">
              {subjects.filter(s => s.type === 'Theory').length}
            </span>
            <span className="text-[10px] font-medium text-blue-600">Lecture Based</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Practical / Lab</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {subjects.filter(s => s.type === 'Practical' || s.type === 'Both').length}
            </span>
            <span className="text-[10px] font-medium text-emerald-600">Lab &amp; Hands-on</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Assigned Deployments</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {subjects.reduce((sum, s) => sum + (s.class_count || 0), 0)} Classes
            </span>
            <span className="text-[10px] font-medium text-slate-400">Total Enrolled</span>
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
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 flex-1 max-w-lg">
            <div className="relative w-full">
              <BiSearch className="absolute left-2.5 top-2.5 text-slate-400 text-sm" />
              <input
                type="text"
                placeholder="Search subject by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="Theory">Theory</option>
              <option value="Practical">Practical</option>
              <option value="Both">Both (Theory &amp; Lab)</option>
              <option value="Optional">Optional</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchSubjects}
              className="p-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
              title="Refresh"
            >
              <BiRefresh className="text-base" />
            </button>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition cursor-pointer"
            >
              <BiPlus className="text-base" />
              <span>Add Subject</span>
            </button>
          </div>
        </div>

        {/* Subjects Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">Loading subjects...</div>
          ) : filteredSubjects.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <BiBook className="mx-auto text-3xl text-slate-400" />
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">No subjects cataloged yet.</p>
              <button
                onClick={openCreateModal}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Add your first academic subject
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Subject Name</th>
                  <th className="py-2.5 px-3">Subject Code</th>
                  <th className="py-2.5 px-3">Course Type</th>
                  <th className="py-2.5 px-3">Assigned Classes</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
                {filteredSubjects.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <BiBook className="text-slate-400 text-sm" />
                      <span>{sub.name}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                        {sub.code}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                        sub.type === 'Practical'
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                          : sub.type === 'Both'
                          ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300'
                          : sub.type === 'Optional'
                          ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'
                          : 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                      }`}>
                        {sub.type}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                        <BiLayer className="text-slate-400 text-xs" />
                        <span>{sub.class_count} classes</span>
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 dark:text-slate-400 text-[11px] truncate max-w-xs">
                      {sub.description || '—'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(sub)}
                          className="p-1 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          title="Edit"
                        >
                          <BiEdit className="text-sm" />
                        </button>
                        <button
                          onClick={() => setDeleteId(sub.id)}
                          className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
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

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-md w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {editingSubject ? 'Edit Subject Details' : 'Create New Subject'}
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
                  Subject Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mathematics, English, Physics"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Subject Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MATH-101"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Subject Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                  >
                    <option value="Theory">Theory</option>
                    <option value="Practical">Practical</option>
                    <option value="Both">Both (Theory &amp; Lab)</option>
                    <option value="Optional">Optional</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Description / Syllabus Overview
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief curriculum description..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full text-xs p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                />
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
                  {submitting ? 'Saving...' : editingSubject ? 'Update Subject' : 'Create Subject'}
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
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Delete Subject?</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Are you sure you want to remove this subject? It will also be unassigned from any classes that currently teach it.
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
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
