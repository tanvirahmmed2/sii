'use client';

import React, { useEffect, useState } from 'react';
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiAlertCircle,
  FiCalendar,
  FiUsers,
  FiCheck,
  FiX,
  FiBell
} from 'react-icons/fi';

const AdminClubAnnouncementsPage = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form States
  const [formData, setFormData] = useState({
    club_id: '',
    title: '',
    content: '',
    is_important: false,
    expires_at: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchAnnouncementsAndClubs = async () => {
    setLoading(true);
    try {
      const [annRes, clubRes] = await Promise.all([
        fetch('/api/clubs/announcements'),
        fetch('/api/clubs')
      ]);

      if (annRes.ok) {
        const annData = await annRes.json();
        const payload = annData.paylod || annData.payload || {};
        setAnnouncements(payload.announcements || []);
      }

      if (clubRes.ok) {
        const clubData = await clubRes.json();
        const payload = clubData.paylod || clubData.payload || {};
        setClubs(payload.clubs || []);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncementsAndClubs();
  }, []);

  const openCreateModal = () => {
    setFormData({
      club_id: clubs[0]?.id || '',
      title: '',
      content: '',
      is_important: false,
      expires_at: ''
    });
    setIsCreateOpen(true);
  };

  const openEditModal = (item) => {
    setEditingId(item.id);
    setFormData({
      club_id: item.club_id || '',
      title: item.title || '',
      content: item.content || '',
      is_important: Boolean(item.is_important),
      expires_at: item.expires_at ? new Date(item.expires_at).toISOString().split('T')[0] : ''
    });
    setIsEditOpen(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.club_id || !formData.title || !formData.content) {
      alert('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/clubs/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setIsCreateOpen(false);
        fetchAnnouncementsAndClubs();
      } else {
        const errData = await res.json();
        alert(errData.message || 'Failed to create announcement');
      }
    } catch (err) {
      console.error('Error creating announcement:', err);
      alert('Failed to create announcement.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.content) {
      alert('Please fill in required fields.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/clubs/announcements/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setIsEditOpen(false);
        fetchAnnouncementsAndClubs();
      } else {
        const errData = await res.json();
        alert(errData.message || 'Failed to update announcement');
      }
    } catch (err) {
      console.error('Error updating announcement:', err);
      alert('Failed to update announcement.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    try {
      const res = await fetch(`/api/clubs/announcements/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      } else {
        alert('Failed to delete announcement');
      }
    } catch (err) {
      console.error('Error deleting announcement:', err);
    }
  };

  return (
    <div className="w-full py-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-primary bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-widest">
            Control Panel
          </span>
          <h1 className="text-2xl font-semibold text-slate-900 mt-2 tracking-tight">
            Club Announcements Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Create, update, and manage official club notices and urgent announcements.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary-dark text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
        >
          <FiPlus />
          <span>New Club Announcement</span>
        </button>
      </div>

      {/* Announcements List Table */}
      <div className="bg-white border border-slate-200/80 rounded-3xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-semibold text-slate-400">Loading club announcements...</span>
          </div>
        ) : announcements.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs text-slate-600">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="p-4 font-semibold uppercase text-[10px] tracking-wider text-slate-400 pl-6">Club</th>
                  <th className="p-4 font-semibold uppercase text-[10px] tracking-wider text-slate-400">Announcement Title</th>
                  <th className="p-4 font-semibold uppercase text-[10px] tracking-wider text-slate-400">Priority</th>
                  <th className="p-4 font-semibold uppercase text-[10px] tracking-wider text-slate-400">Created Date</th>
                  <th className="p-4 font-semibold uppercase text-[10px] tracking-wider text-slate-400 text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                {announcements.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="p-4 pl-6">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-primary bg-emerald-50 px-2.5 py-1 rounded-md uppercase tracking-wider">
                        <FiUsers className="text-xs" />
                        {item.club_name}
                      </span>
                    </td>
                    <td className="p-4 max-w-xs md:max-w-md">
                      <div className="font-bold text-slate-900">{item.title}</div>
                      <div className="truncate text-slate-500 text-[11px] mt-0.5 max-w-[300px] font-normal">
                        {item.content}
                      </div>
                    </td>
                    <td className="p-4">
                      {item.is_important ? (
                        <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold rounded-full uppercase tracking-wider inline-flex items-center gap-1">
                          <FiAlertCircle className="text-xs text-amber-600" /> Urgent
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-full uppercase">
                          Standard
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-slate-500 font-medium">
                      <span className="flex items-center gap-1.5">
                        <FiCalendar className="text-primary text-xs" />
                        {new Date(item.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </td>
                    <td className="p-4 text-right pr-6 space-x-1">
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Edit Announcement"
                      >
                        <FiEdit2 className="text-sm" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Announcement"
                      >
                        <FiTrash2 className="text-sm" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center space-y-3">
            <FiBell className="text-4xl text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">No Club Announcements</h3>
            <p className="text-xs text-slate-400">
              No notices or urgent announcements have been published for clubs yet.
            </p>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FiPlus className="text-primary" /> Create Club Announcement
              </h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <FiX className="text-lg" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs font-semibold text-slate-700">
              <div className="space-y-1">
                <label className="block">Target Club *</label>
                <select
                  value={formData.club_id}
                  onChange={(e) => setFormData({ ...formData, club_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-xs font-bold text-slate-800"
                  required
                >
                  {clubs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block">Announcement Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Mandatory Member Orientation Meeting"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-xs font-medium text-slate-800"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block">Announcement Details / Content *</label>
                <textarea
                  rows={4}
                  placeholder="Enter detailed notice information for club members..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-xs font-medium text-slate-800"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="create_is_important"
                  checked={formData.is_important}
                  onChange={(e) => setFormData({ ...formData, is_important: e.target.checked })}
                  className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
                />
                <label htmlFor="create_is_important" className="text-xs text-slate-800 cursor-pointer">
                  Mark as Urgent / Priority Notice
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Publishing...' : 'Publish Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FiEdit2 className="text-primary" /> Edit Club Announcement
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
                  value={formData.club_id}
                  onChange={(e) => setFormData({ ...formData, club_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-xs font-bold text-slate-800"
                  required
                >
                  {clubs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block">Announcement Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-xs font-medium text-slate-800"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block">Announcement Details / Content *</label>
                <textarea
                  rows={4}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-xs font-medium text-slate-800"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="edit_is_important"
                  checked={formData.is_important}
                  onChange={(e) => setFormData({ ...formData, is_important: e.target.checked })}
                  className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
                />
                <label htmlFor="edit_is_important" className="text-xs text-slate-800 cursor-pointer">
                  Mark as Urgent / Priority Notice
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
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
                  className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer disabled:opacity-50"
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

export default AdminClubAnnouncementsPage;
