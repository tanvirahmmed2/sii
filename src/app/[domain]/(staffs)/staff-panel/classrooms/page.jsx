'use client';

import React, { useState, useEffect, useCallback, useContext } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  FiBook,
  FiPlus,
  FiEdit,
  FiTrash2,
  FiSearch,
  FiFilter,
  FiCheckCircle,
  FiXCircle,
  FiFileText,
  FiLayers,
  FiCalendar,
  FiVideo,
  FiFolder,
  FiX,
  FiCheck,
  FiAlertTriangle,
  FiExternalLink
} from 'react-icons/fi';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const TiptapEditor = dynamic(() => import('src/component/website/ui/TiptapEditor.jsx'), {
  ssr: false,
  loading: () => (
    <div className="h-44 w-full bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 animate-pulse flex items-center justify-center text-xs text-slate-400">
      Loading rich text editor...
    </div>
  )
});

export default function StaffClassroomsPage() {
  const { getApiEndpoint } = useContext(TenantWebsiteContext);

  const [classrooms, setClassrooms] = useState([]);
  const [metaClasses, setMetaClasses] = useState([]);
  const [metaSessions, setMetaSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterSession, setFilterSession] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    class_id: '',
    session_id: '',
    name: '',
    room_number: '',
    description: '',
    is_active: true
  });
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch metadata
  const fetchMeta = useCallback(async () => {
    try {
      const res = await fetch(getApiEndpoint('staff/classrooms/meta'));
      const data = await res.json();
      if (data.success) {
        setMetaClasses(data.classes || []);
        setMetaSessions(data.sessions || []);
      }
    } catch (err) {
      console.error('Error fetching classroom meta:', err);
    }
  }, [getApiEndpoint]);

  // Fetch classrooms list
  const fetchClassrooms = useCallback(async () => {
    setLoading(true);
    try {
      let url = getApiEndpoint('staff/classrooms');
      const params = new URLSearchParams();
      if (filterClass) params.set('class_id', filterClass);
      if (filterSession) params.set('session_id', filterSession);
      const queryStr = params.toString();
      if (queryStr) url += `?${queryStr}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setClassrooms(data.classrooms || []);
      }
    } catch (err) {
      console.error('Error fetching classrooms:', err);
    } finally {
      setLoading(false);
    }
  }, [getApiEndpoint, filterClass, filterSession]);

  useEffect(() => {
    fetchMeta();
  }, [fetchMeta]);

  useEffect(() => {
    fetchClassrooms();
  }, [fetchClassrooms]);

  const openCreateModal = () => {
    setModalMode('create');
    setEditingId(null);
    setFormData({
      class_id: metaClasses[0]?.id || '',
      session_id: metaSessions.find(s => s.is_current)?.id || metaSessions[0]?.id || '',
      name: '',
      room_number: '',
      description: '',
      is_active: true
    });
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const openEditModal = (cr) => {
    setModalMode('edit');
    setEditingId(cr.id);
    setFormData({
      class_id: cr.class_id,
      session_id: cr.session_id,
      name: cr.name || '',
      room_number: cr.room_number || '',
      description: cr.description || '',
      is_active: Boolean(cr.is_active)
    });
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSaving(true);

    try {
      if (!formData.name?.trim()) {
        setErrorMessage('Classroom name is required.');
        setSaving(false);
        return;
      }

      if (modalMode === 'create' && (!formData.class_id || !formData.session_id)) {
        setErrorMessage('Class and Session are required.');
        setSaving(false);
        return;
      }

      const method = modalMode === 'create' ? 'POST' : 'PUT';
      const payload = modalMode === 'create'
        ? formData
        : { id: editingId, ...formData };

      const res = await fetch(getApiEndpoint('staff/classrooms'), {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!data.success) {
        setErrorMessage(data.error || 'Failed to save classroom.');
      } else {
        setSuccessMessage(modalMode === 'create' ? 'Classroom created successfully!' : 'Classroom updated successfully!');
        setIsModalOpen(false);
        fetchClassrooms();
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`${getApiEndpoint('staff/classrooms')}?id=${deleteTarget.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage('Classroom deleted successfully.');
        setDeleteTarget(null);
        fetchClassrooms();
        setTimeout(() => setSuccessMessage(''), 4000);
      } else {
        alert(data.error || 'Failed to delete classroom.');
      }
    } catch (err) {
      alert(err.message || 'Error deleting classroom.');
    } finally {
      setDeleting(false);
    }
  };

  // Filtered display
  const filteredClassrooms = classrooms.filter((cr) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      cr.name?.toLowerCase().includes(q) ||
      cr.class_name?.toLowerCase().includes(q) ||
      cr.session_name?.toLowerCase().includes(q) ||
      cr.room_number?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-sm border border-slate-800 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-2">
              <FiBook className="text-sm" /> Academic Classrooms
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Classrooms &amp; Learning Management
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
              Configure unified academic classrooms for each class and session. Assigned teachers manage syllabus, assignments, lectures, and notes with students.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs transition-all shadow-md cursor-pointer self-start md:self-auto"
          >
            <FiPlus className="text-base" /> New Classroom
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 px-4 py-3 rounded-xl text-xs flex items-center gap-2 shadow-xs animate-in fade-in">
          <FiCheck className="text-emerald-500 shrink-0 text-base" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Controls & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3 min-w-[240px]">
          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            <input
              type="text"
              placeholder="Search classrooms by title, class, room..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 text-slate-500 text-xs font-medium">
            <FiFilter className="text-slate-400" /> Filters:
          </div>

          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="">All Classes</option>
            {metaClasses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.class_name}
              </option>
            ))}
          </select>

          <select
            value={filterSession}
            onChange={(e) => setFilterSession(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="">All Sessions</option>
            {metaSessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.session_name} {s.is_current ? '(Current)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Classrooms Grid / List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 bg-slate-100 dark:bg-slate-800/60 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredClassrooms.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center text-2xl">
            <FiBook />
          </div>
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">No Classrooms Found</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
            {search || filterClass || filterSession
              ? 'Try adjusting your search criteria or class/session filter.'
              : 'Get started by creating your first academic classroom for a class and session.'}
          </p>
          {!search && !filterClass && !filterSession && (
            <button
              type="button"
              onClick={openCreateModal}
              className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FiPlus /> Create Classroom
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClassrooms.map((cr) => (
            <div
              key={cr.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold border border-indigo-200/60 dark:border-indigo-800/60">
                      {cr.class_name || 'Class'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-semibold border border-slate-200 dark:border-slate-700">
                      {cr.session_name || 'Session'}
                    </span>
                    {cr.room_number && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-[10px] font-semibold border border-amber-200/60 dark:border-amber-800/60">
                        Room {cr.room_number}
                      </span>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      cr.is_active
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                    }`}
                  >
                    {cr.is_active ? <FiCheckCircle className="text-[10px]" /> : <FiXCircle className="text-[10px]" />}
                    {cr.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {cr.name}
                </h3>

                {cr.description && (
                  <div
                    className="mt-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 prose prose-slate dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: cr.description }}
                  />
                )}

                {/* Sub-resource Badges */}
                <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-center">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl">
                    <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">Syllabus</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5 flex items-center justify-center gap-1">
                      <FiFileText className="text-xs text-indigo-500" /> {cr.syllabus_count || 0}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl">
                    <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">Tasks</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5 flex items-center justify-center gap-1">
                      <FiLayers className="text-xs text-amber-500" /> {cr.assignment_count || 0}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl">
                    <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">Lectures</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5 flex items-center justify-center gap-1">
                      <FiVideo className="text-xs text-rose-500" /> {cr.lecture_count || 0}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl">
                    <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">Notes</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5 flex items-center justify-center gap-1">
                      <FiFolder className="text-xs text-emerald-500" /> {cr.notes_count || 0}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-400">
                  ID: #{cr.id}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEditModal(cr)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer"
                    title="Edit Classroom"
                  >
                    <FiEdit className="text-sm" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(cr)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                    title="Delete Classroom"
                  >
                    <FiTrash2 className="text-sm" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 my-8">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <FiBook className="text-base" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {modalMode === 'create' ? 'Create New Classroom' : 'Edit Classroom'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <FiX className="text-lg" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {errorMessage && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  <FiAlertTriangle className="shrink-0 text-sm" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Class & Session (Editable on Create, Locked or Display on Edit) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Academic Class <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.class_id}
                    disabled={modalMode === 'edit'}
                    onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-60 cursor-pointer"
                  >
                    <option value="">Select Class</option>
                    {metaClasses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.class_name} ({c.code || `Class ${c.numeric_name}`})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Academic Session <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.session_id}
                    disabled={modalMode === 'edit'}
                    onChange={(e) => setFormData({ ...formData, session_id: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-60 cursor-pointer"
                  >
                    <option value="">Select Session</option>
                    {metaSessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.session_name} {s.is_current ? '(Active Session)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Classroom Name & Room Number */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Classroom Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Grade 10 - Alpha Learning Center"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Room / Campus Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Room 302"
                    value={formData.room_number}
                    onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Description Input using Tiptap Editor */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Classroom Overview &amp; Instructions (Tiptap Rich Text)
                </label>
                <TiptapEditor
                  value={formData.description}
                  onChange={(html) => setFormData({ ...formData, description: html })}
                  placeholder="Describe learning objectives, rules, and expectations for students in this classroom..."
                  minHeight="140px"
                />
              </div>

              {/* Status Toggle */}
              <div className="flex items-center gap-3 pt-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
                </label>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {formData.is_active ? 'Classroom is Active & Visible to Students' : 'Classroom is Hidden / Inactive'}
                </span>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all shadow-sm disabled:opacity-60 cursor-pointer flex items-center gap-1.5"
                >
                  {saving ? 'Saving...' : modalMode === 'create' ? 'Create Classroom' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xl">
              <FiTrash2 />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Classroom</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Are you sure you want to delete <strong className="text-slate-800 dark:text-slate-200">{deleteTarget.name}</strong>? This will permanently remove all associated syllabus, assignments, lectures, and notes.
              </p>
            </div>
            <div className="pt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition-all shadow-sm disabled:opacity-60 cursor-pointer"
              >
                {deleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
