'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { 
  FiPlus, FiAward, FiCalendar, FiExternalLink, FiImage, 
  FiEdit3, FiTrash2, FiX, FiCheck 
} from 'react-icons/fi';

const stripHtml = (html) => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
};

const AchievementListPage = () => {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [editingItem, setEditingItem] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editImage, setEditImage] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchAchievements = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/achievements');
      const data = res.data.paylod;
      setAchievements(data?.achievements || []);
    } catch (err) {
      console.error('Error fetching achievements:', err);
      toast.error('Failed to load achievements list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAchievements();
  }, []);

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setEditTitle(item.title || '');
    setEditDescription(item.description || '');
    setEditImage('');
    setImagePreview(item.image_url || '');
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be under 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setEditImage(reader.result);
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editTitle || !editDescription) {
      toast.error('Title and description are required.');
      return;
    }

    setSavingEdit(true);
    try {
      const payload = {
        title: editTitle,
        description: editDescription,
        ...(editImage ? { image: editImage } : {}),
      };

      const res = await axios.put(`/api/achievements/${editingItem.id}`, payload);
      if (res.data?.success) {
        toast.success('Achievement updated successfully');
        setEditingItem(null);
        fetchAchievements();
      }
    } catch (err) {
      console.error('Error updating achievement:', err);
      toast.error(err.response?.data?.error || 'Failed to update achievement.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this achievement record?')) return;

    try {
      const res = await axios.delete(`/api/achievements/${id}`);
      if (res.data?.success) {
        toast.success('Achievement deleted successfully');
        fetchAchievements();
      }
    } catch (err) {
      console.error('Error deleting achievement:', err);
      toast.error(err.response?.data?.error || 'Failed to delete achievement.');
    }
  };

  return (
    <div className="w-full p-4 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 mt-2 tracking-tight">
            Institutional Achievements
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Manage academic awards, sports titles, and institutional honors.
          </p>
        </div>

        <Link
          href="/admin/achievements/new"
          className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
        >
          <FiPlus className="text-sm" />
          <span>Record New Achievement</span>
        </Link>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs animate-pulse flex flex-col gap-4">
              <div className="w-full h-40 bg-slate-200 rounded-xl"></div>
              <div className="w-3/4 h-5 bg-slate-200 rounded"></div>
              <div className="w-full h-12 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : achievements.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {achievements.map((item) => {
            const cleanDesc = stripHtml(item.description);
            const itemDate = item.created_at ? new Date(item.created_at) : null;

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs hover:border-emerald-200/60 hover:shadow-md transition-all flex flex-col justify-between group"
              >
                {/* Cover Image */}
                {item.image_url ? (
                  <div className="w-full h-44 bg-slate-100 overflow-hidden relative">
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="w-full h-32 bg-amber-50 flex items-center justify-center text-amber-500">
                    <FiAward className="text-4xl" />
                  </div>
                )}

                {/* Details */}
                <div className="p-5 flex flex-col gap-2 flex-1">
                  {itemDate && (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <FiCalendar className="text-xs text-primary" />
                      <span>{itemDate.toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                    </div>
                  )}

                  <h3 className="font-semibold text-slate-900 text-base leading-snug group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>

                  <p className="text-slate-500 text-xs leading-relaxed line-clamp-3 whitespace-pre-wrap">
                    {cleanDesc}
                  </p>
                </div>

                {/* Actions */}
                <div className="px-5 py-3.5 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    href={`/achievements/${item.slug || item.id}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:text-primary"
                  >
                    <span>View Page</span>
                    <FiExternalLink />
                  </Link>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-primary hover:bg-emerald-50 transition-colors cursor-pointer"
                      title="Edit Achievement"
                    >
                      <FiEdit3 className="text-sm" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      title="Delete Achievement"
                    >
                      <FiTrash2 className="text-sm" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center max-w-md mx-auto shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mx-auto text-xl mb-4">
            <FiAward />
          </div>
          <h3 className="font-bold text-slate-800 text-base">No achievements found</h3>
          <p className="text-slate-500 text-xs mt-1 mb-4">
            Start by recording institutional awards and milestone honors.
          </p>
          <Link
            href="/admin/achievements/new"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-bold text-xs px-4 py-2 rounded-xl transition-all"
          >
            <FiPlus /> Record Achievement
          </Link>
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-bold text-slate-900 text-base">Edit Achievement Record</h2>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <FiX className="text-lg" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Description *
                </label>
                <textarea
                  rows={4}
                  required
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Replace Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-primary hover:file:bg-emerald-50 cursor-pointer"
                />
                {imagePreview && (
                  <div className="mt-3 relative w-full h-32 bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex items-center gap-1.5 px-5 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <FiCheck />
                  <span>{savingEdit ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AchievementListPage;
