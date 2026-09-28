'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { FiFile, FiPlus, FiDownload, FiInfo, FiTrash2, FiClock, FiEdit3, FiX, FiCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';
import TiptapEditor from '@/component/helper/TiptapEditor';
import RichTextDisplay from '@/component/helper/RichTextDisplay';

const MaterialsPageContent = () => {
  const searchParams = useSearchParams();
  const classSubjectId = searchParams.get('class_subject_id');
  const subjectName = searchParams.get('subject_name') || 'Subject Details';

  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    file_url: ''
  });

  const fetchMaterials = async () => {
    try {
      const res = await fetch(`/api/lms/study-materials?class_subject_id=${classSubjectId}`);
      if (res.ok) {
        const data = await res.json();
        setMaterials(data.paylod?.study_materials || []);
      }
    } catch (error) {
      console.error('Error fetching study materials:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (classSubjectId) {
      fetchMaterials();
    } else {
      setLoading(false);
    }
  }, [classSubjectId]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({ title: '', description: '', file_url: '' });
    setShowAddForm(true);
  };

  const handleOpenEdit = (mat) => {
    setEditingId(mat.id);
    setFormData({
      title: mat.title || '',
      description: mat.description || '',
      file_url: mat.file_url || ''
    });
    setShowAddForm(true);
  };

  const handleCancelForm = () => {
    setShowAddForm(false);
    setEditingId(null);
    setFormData({ title: '', description: '', file_url: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.file_url) {
      toast.error('Title and file URL are required.');
      return;
    }

    try {
      const url = '/api/lms/study-materials';
      const method = editingId ? 'PUT' : 'POST';
      const payload = editingId
        ? { id: editingId, ...formData }
        : { class_subject_id: classSubjectId, ...formData };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        toast.success(editingId ? 'Study material updated successfully!' : 'Study material uploaded successfully!');
        handleCancelForm();
        fetchMaterials();
      } else {
        toast.error(data.message || data.error || 'Operation failed.');
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('An unexpected error occurred.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this study material?')) return;
    try {
      const res = await fetch(`/api/lms/study-materials?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Study material deleted.');
        fetchMaterials();
      } else {
        toast.error(data.error || 'Failed to delete study material.');
      }
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete study material.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/70 shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Study Materials</h1>
          <p className="text-slate-500 text-xs sm:text-sm font-medium mt-0.5">
            Subject: <strong className="text-emerald-700">{subjectName}</strong>
          </p>
        </div>
        <button
          onClick={showAddForm ? handleCancelForm : handleOpenCreate}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition-all shadow-2xs cursor-pointer w-fit"
        >
          {showAddForm ? (
            <>
              <FiX className="text-sm" />
              <span>Cancel</span>
            </>
          ) : (
            <>
              <FiPlus className="text-sm" />
              <span>Upload Material</span>
            </>
          )}
        </button>
      </div>

      {/* Add / Edit Form */}
      {showAddForm && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 max-w-3xl mx-auto w-full shadow-sm">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-base">
              {editingId ? 'Edit Study Material' : 'Upload New Study Material'}
            </h3>
            <button onClick={handleCancelForm} className="text-slate-400 hover:text-slate-600 p-1">
              <FiX className="text-lg" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-600">Material Title *</label>
              <input
                type="text"
                placeholder="e.g. Chapter 4 Grammar Notes"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-600">Resource URL / Google Drive File Link *</label>
              <input
                type="url"
                placeholder="https://..."
                value={formData.file_url}
                onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-600">Description / Instructions</label>
              <TiptapEditor
                value={formData.description}
                onChange={(val) => setFormData({ ...formData, description: val })}
              />
            </div>

            <div className="flex items-center justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={handleCancelForm}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <FiCheck />
                <span>{editingId ? 'Save Changes' : 'Post Material'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Materials List View */}
      {materials.length === 0 ? (
        <div className="bg-white border border-slate-200/70 rounded-3xl p-12 text-center flex flex-col items-center justify-center shadow-2xs">
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 mb-3">
            <FiInfo className="text-3xl" />
          </div>
          <h3 className="font-bold text-slate-800 text-base mb-1">No Study Materials Shared Yet</h3>
          <p className="text-slate-400 text-xs font-normal max-w-xs">
            Click "Upload Material" above to share reference resources with students.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {materials.map((mat) => (
            <div
              key={mat.id}
              className="bg-white border border-slate-200/70 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-xs transition-all duration-200"
            >
              <div className="flex items-start gap-4 flex-1">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 shrink-0">
                  <FiFile className="text-xl" />
                </div>

                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-base">{mat.title}</h3>
                    {mat.created_at && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[10px] font-medium">
                        <FiClock className="text-[10px]" />
                        {new Date(mat.created_at).toLocaleDateString('en-GB')}
                      </span>
                    )}
                  </div>

                  {mat.description && (
                    <div className="text-slate-600 text-xs leading-relaxed max-w-3xl">
                      <RichTextDisplay content={mat.description} />
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="shrink-0 flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                <a
                  href={mat.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  <FiDownload className="text-xs" />
                  <span>View File</span>
                </a>
                <button
                  onClick={() => handleOpenEdit(mat)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/60 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  title="Edit material"
                >
                  <FiEdit3 className="text-xs text-blue-600" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDelete(mat.id)}
                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer border border-slate-200/60"
                  title="Delete material"
                >
                  <FiTrash2 className="text-xs" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const MaterialsPage = () => {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
      </div>
    }>
      <MaterialsPageContent />
    </Suspense>
  );
};

export default MaterialsPage;
