/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  FiAward,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiSearch,
  FiCheck,
  FiX,
  FiArrowLeft,
  FiUsers,
  FiRefreshCw,
  FiBookOpen,
  FiUpload
} from 'react-icons/fi';

function TeacherQualificationsContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const domain = params?.domain || '';
  const initialTeacherId = searchParams.get('teacher_id') || '';

  const [teachers, setTeachers] = useState([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState(initialTeacherId);
  const [qualifications, setQualifications] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    degree: '',
    institute: '',
    board: '',
    passing_year: '',
    result: '',
    certificate_url: '',
    certificate_id: ''
  });
  const [saving, setSaving] = useState(false);

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

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

  // Fetch teachers roster
  useEffect(() => {
    async function loadTeachers() {
      if (!domain) return;
      try {
        const res = await fetch(`/api/${domain}/staff/panel/teacher?limit=100`);
        const data = await res.json();
        if (data.success && Array.isArray(data.teachers)) {
          setTeachers(data.teachers);
          if (!selectedTeacherId && data.teachers.length > 0) {
            setSelectedTeacherId(String(data.teachers[0].id));
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadTeachers();
  }, [domain, selectedTeacherId]);

  // Fetch qualifications for selected teacher
  const fetchQualifications = useCallback(async (tId) => {
    if (!domain || !tId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/${domain}/staff/panel/teacher/qualifications?teacher_id=${tId}`);
      const data = await res.json();
      if (data.success) {
        setQualifications(data.qualifications || []);
      } else {
        showToast(data.error || 'Failed to load qualifications.', true);
      }
    } catch (err) {
      console.error(err);
      showToast('Error connecting to server.', true);
    } finally {
      setLoading(false);
    }
  }, [domain, showToast]);

  useEffect(() => {
    if (selectedTeacherId) {
      fetchQualifications(selectedTeacherId);
    }
  }, [selectedTeacherId, fetchQualifications]);

  const handleOpenCreate = () => {
    if (!selectedTeacherId) {
      showToast('Please select a teacher first.', true);
      return;
    }
    setModalMode('create');
    setEditingId(null);
    setFormData({
      degree: '',
      institute: '',
      board: '',
      passing_year: new Date().getFullYear() - 5,
      result: '',
      certificate_url: '',
      certificate_id: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (qual) => {
    setModalMode('edit');
    setEditingId(qual.id);
    setFormData({
      degree: qual.degree || '',
      institute: qual.institute || '',
      board: qual.board || '',
      passing_year: qual.passing_year || '',
      result: qual.result || '',
      certificate_url: qual.certificate_url || '',
      certificate_id: qual.certificate_id || ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.degree.trim() || !formData.institute.trim()) {
      showToast('Degree title and Institute are required.', true);
      return;
    }

    try {
      setSaving(true);
      const url = `/api/${domain}/staff/panel/teacher/qualifications`;
      const method = modalMode === 'create' ? 'POST' : 'PUT';
      const payload = modalMode === 'create'
        ? { ...formData, teacher_id: selectedTeacherId }
        : { ...formData, id: editingId };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        showToast(data.message || 'Qualification record saved.');
        setIsModalOpen(false);
        fetchQualifications(selectedTeacherId);
      } else {
        showToast(data.error || 'Failed to save qualification.', true);
      }
    } catch (err) {
      console.error(err);
      showToast('Error saving qualification.', true);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (qual) => {
    setItemToDelete(qual);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/${domain}/staff/panel/teacher/qualifications?id=${itemToDelete.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Qualification removed.');
        setDeleteModalOpen(false);
        setItemToDelete(null);
        fetchQualifications(selectedTeacherId);
      } else {
        showToast(data.error || 'Failed to delete qualification.', true);
      }
    } catch (err) {
      console.error(err);
      showToast('Error deleting record.', true);
    } finally {
      setDeleting(false);
    }
  };

  const currentTeacher = teachers.find((t) => String(t.id) === String(selectedTeacherId));

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

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href={`/${domain}/staff-panel/teacher-list`} className="hover:text-slate-900 dark:hover:text-white flex items-center gap-1">
              <FiArrowLeft className="w-3.5 h-3.5" />
              <span>Teacher Directory</span>
            </Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Faculty Qualifications</span>
          </div>
          <h1 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FiAward className="w-5 h-5 text-purple-600" />
            <span>Academic Qualifications Manager</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Document educational degrees, certifications, universities, and graduation credentials for each instructor.
          </p>
        </div>

        {/* Teacher selector and Add button */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Select Faculty:</span>
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
            >
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.designation_title || 'Teacher'})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition cursor-pointer"
          >
            <FiPlus className="w-3.5 h-3.5" />
            <span>Add Degree</span>
          </button>
        </div>
      </div>

      {/* Selected Teacher Summary Banner */}
      {currentTeacher && (
        <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-2xs">
          {currentTeacher.photo_url ? (
            <img
              src={currentTeacher.photo_url}
              alt={currentTeacher.name}
              className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center font-bold text-purple-700 dark:text-purple-300 text-sm shrink-0">
              {currentTeacher.name?.charAt(0) || 'T'}
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-slate-900 dark:text-white">{currentTeacher.name}</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800">
                {currentTeacher.designation_title || 'Faculty Member'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">{currentTeacher.email} • {currentTeacher.number}</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-semibold text-slate-400">Total Degrees</span>
            <p className="text-lg font-bold font-mono text-purple-600 dark:text-purple-400">{qualifications.length}</p>
          </div>
        </div>
      )}

      {/* Qualifications Data Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-4">
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2">Degree / Certificate</th>
                <th className="px-3 py-2">Institute / University</th>
                <th className="px-3 py-2">Board / Department</th>
                <th className="px-3 py-2 text-center">Passing Year</th>
                <th className="px-3 py-2 text-center">Result / GPA</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-slate-400">
                    <FiRefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                    <span>Loading qualifications...</span>
                  </td>
                </tr>
              ) : qualifications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-slate-400">
                    <FiAward className="w-6 h-6 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                    <p className="font-medium text-slate-600 dark:text-slate-400">No qualifications listed</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Click &quot;Add Degree&quot; to register educational background for this instructor.
                    </p>
                  </td>
                </tr>
              ) : (
                qualifications.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-3 py-2 font-semibold text-slate-900 dark:text-white">
                      {row.degree}
                    </td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                      {row.institute}
                    </td>
                    <td className="px-3 py-2 text-slate-500 dark:text-slate-400">
                      {row.board || <span className="text-slate-400 italic">None</span>}
                    </td>
                    <td className="px-3 py-2 text-center font-mono text-slate-700 dark:text-slate-300">
                      {row.passing_year || 'N/A'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {row.result ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                          {row.result}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right space-x-1">
                      <button
                        onClick={() => handleOpenEdit(row)}
                        className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Edit Degree"
                      >
                        <FiEdit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => confirmDelete(row)}
                        className="p-1 rounded text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                        title="Delete Degree"
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
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl w-full max-w-md p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <FiAward className="w-4 h-4 text-purple-600" />
                <span>{modalMode === 'create' ? 'Add Educational Qualification' : 'Edit Qualification'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Degree / Certificate <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. M.Sc in Computer Science, B.Ed, HSC"
                  value={formData.degree}
                  onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Institute / University <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. University of Dhaka"
                  value={formData.institute}
                  onChange={(e) => setFormData({ ...formData, institute: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Board / Department
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Science"
                    value={formData.board}
                    onChange={(e) => setFormData({ ...formData, board: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Passing Year
                  </label>
                  <input
                    type="number"
                    min="1950"
                    max="2035"
                    placeholder="e.g. 2019"
                    value={formData.passing_year}
                    onChange={(e) => setFormData({ ...formData, passing_year: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Result / GPA / Division
                </label>
                <input
                  type="text"
                  placeholder="e.g. CGPA 3.82 or 1st Class"
                  value={formData.result}
                  onChange={(e) => setFormData({ ...formData, result: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded text-xs border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white disabled:opacity-50 transition"
                >
                  {saving ? 'Saving...' : modalMode === 'create' ? 'Add Degree' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl w-full max-w-sm p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                <FiTrash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Delete Qualification?</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Are you sure you want to remove &quot;{itemToDelete.degree}&quot;?
                </p>
              </div>
            </div>

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

export default function TeacherQualificationsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-400">
          <FiRefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
          <span>Loading qualifications manager...</span>
        </div>
      }
    >
      <TeacherQualificationsContent />
    </Suspense>
  );
}
