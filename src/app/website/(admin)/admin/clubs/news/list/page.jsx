'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiFileText,
  FiImage,
  FiCalendar,
  FiUsers,
  FiX
} from 'react-icons/fi';
import Image from 'next/image';

const AdminClubNewsListPage = () => {
  const [clubNews, setClubNews] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({
    club_id: '',
    title: '',
    content: '',
    image: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [newsRes, clubsRes] = await Promise.all([
        fetch('/api/club-news'),
        fetch('/api/clubs')
      ]);

      if (newsRes.ok) {
        const newsData = await newsRes.json();
        const payload = newsData.paylod || newsData.payload || {};
        setClubNews(payload.clubNews || []);
      }

      if (clubsRes.ok) {
        const clubsData = await clubsRes.json();
        const payload = clubsData.paylod || clubsData.payload || {};
        setClubs(payload.clubs || []);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openEditModal = (item) => {
    setEditingItem(item);
    setEditForm({
      club_id: item.club_id || '',
      title: item.title || '',
      content: item.content || '',
      image: item.image || item.image_url || ''
    });
    setIsEditOpen(true);
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditForm((prev) => ({ ...prev, image: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editForm.club_id || !editForm.title || !editForm.content) {
      alert('Please fill in required fields (Club, Title, Content).');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/club-news/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });

      if (res.ok) {
        setIsEditOpen(false);
        fetchData();
      } else {
        const errData = await res.json();
        alert(errData.error || errData.message || 'Failed to update club news');
      }
    } catch (err) {
      console.error('Error updating club news:', err);
      alert('Failed to update club news article.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this news article?')) return;
    try {
      const res = await fetch(`/api/club-news/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setClubNews((prev) => prev.filter((item) => item.id !== id));
      } else {
        alert('Failed to delete article');
      }
    } catch (err) {
      console.error('Error deleting article:', err);
    }
  };

  return (
    <div className="w-full p-4 space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Club News & Articles
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage, edit, and update published club stories and announcements.
          </p>
        </div>
        <Link
          href="/admin/clubs/news/new"
          className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary-dark text-white font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-2xs"
        >
          <FiPlus className="text-sm" />
          <span>Publish News</span>
        </Link>
      </div>

      {/* Simple Clean Table List */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
        {loading ? (
          <div className="p-12 text-center space-y-2">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs font-semibold text-slate-400">Loading articles...</p>
          </div>
        ) : clubNews.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                  <th className="py-3 px-4 pl-6">Cover</th>
                  <th className="py-3 px-4">Club</th>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {clubNews.map((item) => {
                  const coverImg = item.image || item.image_url;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 pl-6">
                        {coverImg ? (
                          <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                            <Image width={100} height={100} src={coverImg} alt="" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                            <FiImage className="text-sm" />
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-primary bg-emerald-50 px-2.5 py-1 rounded-md uppercase">
                          <FiUsers className="text-xs" />
                          {item.club_name || 'Club'}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs md:max-w-md">
                        <div className="font-bold text-slate-900 truncate">{item.title}</div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5 font-normal">
                          {item.summary || item.content}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500 text-[11px]">
                        {new Date(item.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="py-3 px-4 text-right pr-6 whitespace-nowrap space-x-1">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1.5 text-slate-600 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Edit News Article"
                        >
                          <FiEdit2 className="text-sm" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-tertiary hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete News Article"
                        >
                          <FiTrash2 className="text-sm" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center space-y-2">
            <FiFileText className="text-3xl text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-700">No Published Club News</p>
            <p className="text-[11px] text-slate-400">Click "Publish News" to create an article.</p>
          </div>
        )}
      </div>

      {/* EDIT MODAL */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FiEdit2 className="text-primary" /> Edit Club News Article
              </h3>
              <button
                onClick={() => setIsEditOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <FiX className="text-lg" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4 text-xs font-semibold text-slate-700">
              <div className="space-y-1">
                <label className="block">Target Club *</label>
                <select
                  value={editForm.club_id}
                  onChange={(e) => setEditForm({ ...editForm, club_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-xs font-bold text-slate-800"
                  required
                >
                  <option value="">Select a club...</option>
                  {clubs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block">News Title *</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-xs font-medium text-slate-800"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block">Cover Image (Optional update)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                />
                {editForm.image && (
                  <div className="w-16 h-12 rounded-lg overflow-hidden border border-slate-200 mt-2 bg-slate-50">
                    <img src={editForm.image} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="block">Article Content *</label>
                <textarea
                  rows={5}
                  value={editForm.content}
                  onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-xs font-medium text-slate-800"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminClubNewsListPage;
