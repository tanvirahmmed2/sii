'use client';

import React, { useState, useEffect, useCallback, useContext } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  FiArrowLeft,
  FiBook,
  FiFileText,
  FiLayers,
  FiVideo,
  FiFolder,
  FiPlus,
  FiEdit,
  FiTrash2,
  FiDownload,
  FiCalendar,
  FiClock,
  FiUser,
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

export default function TeacherClassroomWorkstationPage() {
  const { id } = useParams();
  const { getApiEndpoint } = useContext(TenantWebsiteContext);

  const [classroom, setClassroom] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [activeTab, setActiveTab] = useState('syllabus'); // 'syllabus' | 'assignments' | 'lectures' | 'notes'
  const [loading, setLoading] = useState(true);

  // Lists
  const [syllabusList, setSyllabusList] = useState([]);
  const [assignmentsList, setAssignmentsList] = useState([]);
  const [lecturesList, setLecturesList] = useState([]);
  const [notesList, setNotesList] = useState([]);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    topic_name: '',
    subject_id: '',
    pdf_url: '',
    submission_date: '',
    description: ''
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch classroom details & subjects
  const fetchClassroomDetails = useCallback(async () => {
    try {
      const res = await fetch(getApiEndpoint(`teacher/classrooms/${id}`));
      const data = await res.json();
      if (data.success) {
        setClassroom(data.classroom);
        setSubjects(data.subjects || []);
      }
    } catch (err) {
      console.error('Error fetching classroom details:', err);
    }
  }, [getApiEndpoint, id]);

  // Fetch active tab items
  const fetchTabItems = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'syllabus') {
        const res = await fetch(getApiEndpoint(`teacher/classrooms/${id}/syllabus`));
        const data = await res.json();
        if (data.success) setSyllabusList(data.syllabus || []);
      } else if (activeTab === 'assignments') {
        const res = await fetch(getApiEndpoint(`teacher/classrooms/${id}/assignments`));
        const data = await res.json();
        if (data.success) setAssignmentsList(data.assignments || []);
      } else if (activeTab === 'lectures') {
        const res = await fetch(getApiEndpoint(`teacher/classrooms/${id}/lectures`));
        const data = await res.json();
        if (data.success) setLecturesList(data.lectures || []);
      } else if (activeTab === 'notes') {
        const res = await fetch(getApiEndpoint(`teacher/classrooms/${id}/notes`));
        const data = await res.json();
        if (data.success) setNotesList(data.notes || []);
      }
    } catch (err) {
      console.error(`Error fetching ${activeTab}:`, err);
    } finally {
      setLoading(false);
    }
  }, [getApiEndpoint, id, activeTab]);

  useEffect(() => {
    fetchClassroomDetails();
  }, [fetchClassroomDetails]);

  useEffect(() => {
    fetchTabItems();
  }, [fetchTabItems]);

  // Open modal handlers
  const openCreateModal = () => {
    setModalMode('create');
    setEditingItem(null);
    setFormError('');
    setFormData({
      title: '',
      topic_name: '',
      subject_id: subjects[0]?.id || '',
      pdf_url: '',
      submission_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      description: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setModalMode('edit');
    setEditingItem(item);
    setFormError('');
    setFormData({
      title: item.title || '',
      topic_name: item.topic_name || '',
      subject_id: item.subject_id || '',
      pdf_url: item.pdf_url || '',
      submission_date: item.submission_date ? String(item.submission_date).split('T')[0] : '',
      description: item.description || ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);

    try {
      if (!formData.subject_id) {
        setFormError('Please select a subject.');
        setSaving(false);
        return;
      }

      if (activeTab === 'assignments') {
        if (!formData.topic_name?.trim() || !formData.submission_date) {
          setFormError('Topic Name and Submission Date are required.');
          setSaving(false);
          return;
        }
      } else {
        if (!formData.title?.trim()) {
          setFormError('Title is required.');
          setSaving(false);
          return;
        }
      }

      const method = modalMode === 'create' ? 'POST' : 'PUT';
      const endpoint = `teacher/classrooms/${id}/${activeTab}`;
      const payload = modalMode === 'create'
        ? formData
        : { id: editingItem.id, ...formData };

      const res = await fetch(getApiEndpoint(endpoint), {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!data.success) {
        setFormError(data.error || 'Failed to save item.');
      } else {
        setStatusMessage(
          modalMode === 'create'
            ? `${activeTab.slice(0, -1)} added successfully!`
            : `${activeTab.slice(0, -1)} updated successfully!`
        );
        setIsModalOpen(false);
        fetchTabItems();
        setTimeout(() => setStatusMessage(''), 4000);
      }
    } catch (err) {
      setFormError(err.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`${getApiEndpoint(`teacher/classrooms/${id}/${activeTab}`)}?id=${deleteTarget.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage('Item deleted successfully.');
        setDeleteTarget(null);
        fetchTabItems();
        setTimeout(() => setStatusMessage(''), 4000);
      } else {
        alert(data.error || 'Failed to delete item.');
      }
    } catch (err) {
      alert(err.message || 'Error deleting item.');
    } finally {
      setDeleting(false);
    }
  };

  const tabItemsList = {
    syllabus: syllabusList,
    assignments: assignmentsList,
    lectures: lecturesList,
    notes: notesList
  }[activeTab] || [];

  return (
    <div className="space-y-6 pb-16">
      {/* Top Breadcrumb & Classroom Banner */}
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Link href="/teacher/classrooms" className="hover:text-emerald-600 flex items-center gap-1 font-semibold">
          <FiArrowLeft /> Back to Classrooms
        </Link>
        <span>/</span>
        <span className="text-slate-800 dark:text-slate-200 font-bold">{classroom?.name || 'Classroom'}</span>
      </div>

      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-sm border border-slate-800 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                {classroom?.class_name || 'Class'}
              </span>
              <span className="px-2.5 py-0.5 rounded-lg bg-white/10 text-white text-xs font-medium">
                {classroom?.session_name || 'Session'}
              </span>
              {classroom?.room_number && (
                <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold">
                  Room {classroom?.room_number}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {classroom?.name || 'Academic Classroom'}
            </h1>
            {classroom?.description && (
              <div
                className="text-slate-300 text-xs sm:text-sm mt-2 max-w-2xl prose prose-invert"
                dangerouslySetInnerHTML={{ __html: classroom.description }}
              />
            )}
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs transition-all shadow-md cursor-pointer self-start md:self-auto"
          >
            <FiPlus className="text-base" /> Add {activeTab === 'assignments' ? 'Assignment' : activeTab.slice(0, -1)}
          </button>
        </div>
      </div>

      {/* Notification */}
      {statusMessage && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 px-4 py-3 rounded-xl text-xs flex items-center gap-2 shadow-xs animate-in fade-in">
          <FiCheck className="text-emerald-500 shrink-0 text-base" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 flex flex-wrap gap-1 shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab('syllabus')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'syllabus'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
          }`}
        >
          <FiFileText className="text-sm" /> Syllabus ({syllabusList.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('assignments')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'assignments'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
          }`}
        >
          <FiLayers className="text-sm" /> Assignments &amp; Tasks ({assignmentsList.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('lectures')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'lectures'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
          }`}
        >
          <FiVideo className="text-sm" /> Lectures &amp; Slides ({lecturesList.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('notes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'notes'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
          }`}
        >
          <FiFolder className="text-sm" /> Study Notes ({notesList.length})
        </button>
      </div>

      {/* Content Stream */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800/60 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : tabItemsList.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center text-2xl">
            {activeTab === 'syllabus' && <FiFileText />}
            {activeTab === 'assignments' && <FiLayers />}
            {activeTab === 'lectures' && <FiVideo />}
            {activeTab === 'notes' && <FiFolder />}
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
            No {activeTab} Published Yet
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
            Publish your first {activeTab.slice(0, -1)} to make learning resources and task submissions available to enrolled students.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FiPlus /> Add {activeTab === 'assignments' ? 'Assignment' : activeTab.slice(0, -1)}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {tabItemsList.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs hover:shadow-sm transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold border border-indigo-200/60 dark:border-indigo-800/60">
                      {item.subject_name || 'Subject'} {item.subject_code ? `(${item.subject_code})` : ''}
                    </span>

                    {activeTab === 'assignments' && item.submission_date && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px] font-bold border border-amber-200/60 dark:border-amber-800/60 flex items-center gap-1">
                        <FiCalendar className="text-[10px]" /> Due: {new Date(item.submission_date).toLocaleDateString()}
                      </span>
                    )}

                    {item.teacher_name && (
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <FiUser className="text-[10px]" /> By {item.teacher_name}
                      </span>
                    )}

                    <span className="text-[10px] text-slate-400">
                      • {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white pt-0.5">
                    {activeTab === 'assignments' ? item.topic_name : item.title}
                  </h3>

                  {/* Rendered Description using Prose and HTML */}
                  {item.description && (
                    <div
                      className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 prose prose-slate dark:prose-invert max-w-none leading-relaxed bg-slate-50/70 dark:bg-slate-800/30 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800"
                      dangerouslySetInnerHTML={{ __html: item.description }}
                    />
                  )}
                </div>

                {/* Right Actions */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                  {item.pdf_url && (
                    <a
                      href={item.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold transition-colors"
                    >
                      <FiDownload className="text-xs" /> Attached Resource
                    </a>
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                      title="Edit"
                    >
                      <FiEdit className="text-sm" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(item)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="Delete"
                    >
                      <FiTrash2 className="text-sm" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 my-8">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <FiBook className="text-base" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white capitalize">
                  {modalMode === 'create' ? `Add ${activeTab === 'assignments' ? 'Assignment' : activeTab.slice(0, -1)}` : `Edit ${activeTab === 'assignments' ? 'Assignment' : activeTab.slice(0, -1)}`}
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
              {formError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  <FiAlertTriangle className="shrink-0 text-sm" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Subject Select */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Subject <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.subject_id}
                  onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="">Select Subject</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} {sub.code ? `(${sub.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title / Topic Name */}
              {activeTab === 'assignments' ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Assignment Topic <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Thermodynamics Experiment Report"
                      value={formData.topic_name}
                      onChange={(e) => setFormData({ ...formData, topic_name: e.target.value })}
                      required
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Submission Deadline <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.submission_date}
                      onChange={(e) => setFormData({ ...formData, submission_date: e.target.value })}
                      required
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder={`e.g. Chapter 3: Key Concepts & Lecture Notes`}
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              {/* PDF or Resource Link */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  PDF or Resource Document URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/materials/lecture3.pdf"
                  value={formData.pdf_url}
                  onChange={(e) => setFormData({ ...formData, pdf_url: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Rich Description using Tiptap */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description &amp; Guidelines (Tiptap Rich Text)
                </label>
                <TiptapEditor
                  value={formData.description}
                  onChange={(html) => setFormData({ ...formData, description: html })}
                  placeholder="Write clear instructions, outline topics, or summary points for students..."
                  minHeight="150px"
                />
              </div>

              {/* Actions */}
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
                  {saving ? 'Saving...' : modalMode === 'create' ? 'Publish' : 'Save Changes'}
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
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Item</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Are you sure you want to permanently remove{' '}
                <strong className="text-slate-800 dark:text-slate-200">
                  {deleteTarget.title || deleteTarget.topic_name}
                </strong>?
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
