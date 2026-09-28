'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { 
  FiPlus, FiFileText, FiImage, FiExternalLink, FiCalendar, 
  FiEdit3, FiTrash2, FiX, FiCheck 
} from 'react-icons/fi';

const stripHtml = (html) => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
};

const NewsListPage = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit Modal state
  const [editingItem, setEditingItem] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editImage, setEditImage] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/news');
      const data = res.data.paylod;
      setNews(data?.news || []);
    } catch (err) {
      console.error('Error fetching news:', err);
      toast.error('Failed to load news list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setEditTitle(item.title || '');
    setEditContent(item.content || '');
    setEditImage('');
    setImagePreview(item.image || '');
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
    if (!editTitle.trim() || !editContent.trim()) {
      toast.error('Title and content are required.');
      return;
    }

    setSavingEdit(true);
    try {
      const res = await axios.put(`/api/news/${editingItem.id}`, {
        title: editTitle.trim(),
        content: editContent.trim(),
        image: editImage || editingItem.image
      });

      toast.success(res.data.message || 'News article updated successfully!');
      setEditingItem(null);
      fetchNews();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update news article.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id, title) => {
    const confirmed = window.confirm(`Are you sure you want to delete news article "${title}"?`);
    if (!confirmed) return;

    try {
      const res = await axios.delete(`/api/news/${id}`);
      toast.success(res.data.message || 'News article deleted successfully.');
      setNews((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete news article.');
    }
  };

  return (
    <div className="w-full p-4 animate-fade-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 mt-2 tracking-tight flex items-center gap-2">
            <FiFileText className="text-primary" /> Published Campus News
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage institutional announcements, news stories, press releases, and generated URL slugs.
          </p>
        </div>
        <Link
          href="/admin/news/new"
          className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary-dark text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
        >
          <FiPlus className="text-sm" />
          <span>Write New Article</span>
        </Link>
      </div>

      {/* List Container Table */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.02)] overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-semibold text-slate-400">Loading published news...</span>
          </div>
        ) : news.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="p-4 pl-6 font-bold uppercase text-[10px] tracking-wider text-slate-400">Cover</th>
                  <th className="p-4 font-bold uppercase text-[10px] tracking-wider text-slate-400">Article Title &amp; Snippet</th>
                  <th className="p-4 font-bold uppercase text-[10px] tracking-wider text-slate-400">Published Date</th>
                  <th className="p-4 pr-6 font-bold uppercase text-[10px] tracking-wider text-slate-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {news.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Cover */}
                    <td className="p-4 pl-6">
                      {item.image ? (
                        <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-100 bg-slate-50 shrink-0">
                          <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-xl border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                          <FiImage className="text-base" />
                        </div>
                      )}
                    </td>

                    {/* Title & Content Snippet */}
                    <td className="p-4 max-w-xs md:max-w-sm">
                      <div className="font-semibold text-slate-900 text-sm leading-tight">{item.title}</div>
                      <p className="text-slate-500 text-xs mt-1 leading-relaxed line-clamp-2">
                        {stripHtml(item.content)}
                      </p>
                    </td>

                    {/* Date */}
                    <td className="p-4 whitespace-nowrap text-slate-500 font-semibold">
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <FiCalendar className="text-primary" />
                        {new Date(item.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-4 pr-6 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href="/news"
                          target="_blank"
                          className="p-2 text-primary hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
                          title="View public news page"
                        >
                          <FiExternalLink className="text-sm" />
                        </Link>
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-2 text-primary hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
                          title="Edit news article"
                        >
                          <FiEdit3 className="text-sm" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.title)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                          title="Delete news article"
                        >
                          <FiTrash2 className="text-sm" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-16 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mx-auto text-xl mb-4">
              <FiFileText />
            </div>
            <h3 className="font-bold text-slate-800 text-base">No news published</h3>
            <p className="text-slate-400 text-xs mt-1">
              Campus news articles published by administrative teams will be listed here.
            </p>
          </div>
        )}
      </div>

      {/* Edit Modal Dialog */}
      {editingItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl animate-scale-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FiEdit3 className="text-primary" /> Edit News Article
              </h2>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <FiX className="text-base" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="flex flex-col gap-4">
              {/* Title */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Article Title *
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-primary transition-all font-medium"
                />
              </div>

              {/* Cover Image Upload & Preview */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Cover Image
                </label>
                {imagePreview && (
                  <div className="w-full h-36 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden relative mb-2">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-primary hover:file:bg-emerald-50 cursor-pointer"
                />
              </div>

              {/* Article Content */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Article Content *
                </label>
                <textarea
                  rows={6}
                  required
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-primary transition-all resize-none font-medium"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  disabled={savingEdit}
                  className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-60 cursor-pointer flex items-center gap-1.5"
                >
                  <FiCheck className="text-sm" />
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

export default NewsListPage;
