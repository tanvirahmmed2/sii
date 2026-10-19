'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';

const TiptapEditor = dynamic(() => import('src/component/website/ui/TiptapEditor.jsx'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-36 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-700 animate-pulse flex items-center justify-center text-xs text-slate-400">
      Loading Editor...
    </div>
  ),
});

export default function ClubNoticesPage() {
  const params = useParams();
  const domain = params?.domain || '';

  const [notices, setNotices] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClub, setSelectedClub] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Inline Form State (NO popup, NO slug)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);
  const [formClubId, setFormClubId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAttachmentUrl, setFormAttachmentUrl] = useState('');
  const [formPublishedDate, setFormPublishedDate] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Inline Delete State
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Notifications
  const [toastMessage, setToastMessage] = useState(null);
  const [toastError, setToastError] = useState(null);

  const showToast = (msg, isError = false) => {
    if (isError) {
      setToastError(msg);
      setTimeout(() => setToastError(null), 4000);
    } else {
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const fetchNotices = async () => {
    setLoading(true);
    try {
      let url = `/api/${domain}/staff/panel/clubs/notices?`;
      if (selectedClub !== 'all') url += `club_id=${selectedClub}&`;
      if (selectedStatus !== 'all') url += `status=${selectedStatus}&`;
      if (searchTerm.trim()) url += `search=${encodeURIComponent(searchTerm.trim())}&`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setNotices(data.notices || []);
        if (data.clubs) setClubs(data.clubs);
      } else {
        showToast(data.error || 'Failed to load notices', true);
      }
    } catch (err) {
      console.error('Fetch notices error:', err);
      showToast('Network error while loading club notices.', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, [domain, selectedClub, selectedStatus]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchNotices();
  };

  const openCreateForm = () => {
    setEditingNotice(null);
    setFormClubId(selectedClub !== 'all' ? selectedClub : clubs[0]?.id ? String(clubs[0].id) : '');
    setFormTitle('');
    setFormDescription('');
    setFormAttachmentUrl('');
    setFormPublishedDate(new Date().toISOString().split('T')[0]);
    setFormIsActive(true);
    setIsFormOpen(true);
  };

  const openEditForm = (notice) => {
    setEditingNotice(notice);
    setFormClubId(String(notice.club_id));
    setFormTitle(notice.title || '');
    setFormDescription(notice.description || '');
    setFormAttachmentUrl(notice.attachment_url || '');
    setFormPublishedDate(notice.published_date ? notice.published_date.split('T')[0] : '');
    setFormIsActive(notice.is_active);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingNotice(null);
    setFormTitle('');
    setFormDescription('');
    setFormAttachmentUrl('');
  };

  const handleSaveNotice = async (e) => {
    e.preventDefault();
    if (!formClubId || !formTitle.trim()) {
      showToast('Please select a club and enter notice title.', true);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        club_id: parseInt(formClubId, 10),
        title: formTitle.trim(),
        description: formDescription.trim(),
        attachment_url: formAttachmentUrl.trim(),
        published_date: formPublishedDate || new Date().toISOString().split('T')[0],
        is_active: formIsActive,
      };

      if (editingNotice) {
        payload.id = editingNotice.id;
      }

      const method = editingNotice ? 'PUT' : 'POST';
      const res = await fetch(`/api/${domain}/staff/panel/clubs/notices`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        showToast(editingNotice ? 'Notice updated successfully.' : 'Notice published successfully.');
        closeForm();
        fetchNotices();
      } else {
        showToast(data.error || 'Operation failed', true);
      }
    } catch (err) {
      console.error('Save notice error:', err);
      showToast('Network error while saving notice.', true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNotice = async (id) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/${domain}/staff/panel/clubs/notices?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showToast('Notice deleted successfully.');
        setConfirmDeleteId(null);
        fetchNotices();
      } else {
        showToast(data.error || 'Failed to delete notice', true);
      }
    } catch (err) {
      console.error('Delete notice error:', err);
      showToast('Network error while deleting notice.', true);
    } finally {
      setDeletingId(null);
    }
  };

  // KPIs
  const totalNotices = notices.length;
  const activeNotices = notices.filter((n) => n.is_active).length;
  const distinctClubs = new Set(notices.map((n) => n.club_id)).size;

  return (
    <div className="w-full space-y-4">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-3 rounded text-xs bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center justify-between shadow-2xs">
          <span>{toastMessage}</span>
          <span className="text-[10px] font-mono uppercase">OK</span>
        </div>
      )}
      {toastError && (
        <div className="p-3 rounded text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 flex items-center justify-between shadow-2xs">
          <span>{toastError}</span>
          <span className="text-[10px] font-mono uppercase">ERROR</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Total Notices</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-slate-900 dark:text-white font-mono">{totalNotices}</span>
            <span className="text-[10px] font-medium text-slate-500">Circulars</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Active Circulars</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 font-mono">{activeNotices}</span>
            <span className="text-[10px] font-medium text-emerald-600">Published</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Participating Clubs</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-slate-900 dark:text-white font-mono">{distinctClubs}</span>
            <span className="text-[10px] font-medium text-blue-600">Clubs with notices</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">System Cycle</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-slate-900 dark:text-white font-mono">2026-T1</span>
            <span className="text-[10px] font-medium text-slate-500">Current Session</span>
          </div>
        </div>
      </div>

      {/* Inline Create / Edit Notice Workstation Panel (NO popup, NO slug) */}
      {isFormOpen && (
        <div className="bg-white dark:bg-slate-900 border border-primary/30 rounded p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-semibold text-slate-900 dark:text-white">
              {editingNotice ? `Edit Notice: ${editingNotice.title}` : 'Publish New Club Notice'}
            </h3>
            <button
              onClick={closeForm}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSaveNotice} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Target Club *
                </label>
                <select
                  required
                  value={formClubId}
                  onChange={(e) => setFormClubId(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="">Select Club...</option>
                  {clubs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.category || 'General'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Notice Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual General Meeting & Agenda"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Publish Date
                </label>
                <input
                  type="date"
                  value={formPublishedDate}
                  onChange={(e) => setFormPublishedDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                Attachment Link (Google Drive, Cloud PDF)
              </label>
              <input
                type="url"
                placeholder="https://drive.google.com/... or https://..."
                value={formAttachmentUrl}
                onChange={(e) => setFormAttachmentUrl(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300">
                  Notice Details / Agenda & Guidelines
                </label>
                <span className="text-[10px] text-slate-400">Tiptap Rich Editor</span>
              </div>
              <TiptapEditor
                value={formDescription}
                onChange={(val) => setFormDescription(val)}
                placeholder="Write notice instructions, agenda, meeting schedule, guidelines, and venue..."
                minHeight="180px"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="noticeIsActive"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                />
                <label htmlFor="noticeIsActive" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  Notice is Active and visible to members
                </label>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded bg-primary hover:bg-primary-dark text-white text-xs font-medium cursor-pointer transition disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingNotice ? 'Update Notice' : 'Publish Notice'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Main Interactive Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search notices by title, description or club..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400 transition"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded text-xs font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              Filter
            </button>
          </form>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedClub}
              onChange={(e) => setSelectedClub(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Clubs</option>
              {clubs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            <button
              onClick={openCreateForm}
              className="px-3 py-1.5 rounded text-xs font-medium bg-primary hover:bg-primary-dark text-white cursor-pointer transition whitespace-nowrap"
            >
              + Publish Notice
            </button>
          </div>
        </div>

        {/* Notices Table (NO slug column) */}
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2">Notice Title</th>
                <th className="px-3 py-2">Club Name</th>
                <th className="px-3 py-2">Date Published</th>
                <th className="px-3 py-2">Attachment Link</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-3 py-8 text-center text-slate-400">
                    Loading club notices...
                  </td>
                </tr>
              ) : notices.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-3 py-8 text-center text-slate-400">
                    No club notices published yet. Click &quot;+ Publish Notice&quot; to issue a new notice.
                  </td>
                </tr>
              ) : (
                notices.map((n) => (
                  <tr key={n.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-3 py-2 font-medium text-slate-900 dark:text-white leading-tight">
                      {n.title}
                    </td>

                    <td className="px-3 py-2">
                      <span className="font-medium text-slate-800 dark:text-slate-200">{n.club_name}</span>
                      <p className="text-[10px] text-slate-400">{n.club_category}</p>
                    </td>

                    <td className="px-3 py-2 font-mono text-[11px] text-slate-500">
                      {n.published_date ? new Date(n.published_date).toLocaleDateString() : '—'}
                    </td>

                    <td className="px-3 py-2">
                      {n.attachment_url ? (
                        <a
                          href={n.attachment_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline text-[11px] truncate max-w-xs block"
                        >
                          View Document Link
                        </a>
                      ) : (
                        <span className="text-slate-400 text-[11px]">No Attachment</span>
                      )}
                    </td>

                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium border ${
                          n.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                            : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                        }`}
                      >
                        {n.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td className="px-3 py-2 text-right space-x-1 whitespace-nowrap">
                      {confirmDeleteId === n.id ? (
                        <div className="inline-flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-1 rounded">
                          <span className="text-[10px] text-rose-700 dark:text-rose-300">Delete?</span>
                          <button
                            onClick={() => handleDeleteNotice(n.id)}
                            disabled={deletingId === n.id}
                            className="px-1.5 py-0.5 bg-rose-600 text-white text-[10px] rounded cursor-pointer"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-1.5 py-0.5 border border-slate-300 text-slate-600 text-[10px] rounded cursor-pointer"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => openEditForm(n)}
                            className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer inline-flex items-center"
                            title="Edit Notice"
                          >
                            <FiEdit2 className="text-xs" />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(n.id)}
                            className="p-1 rounded text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer inline-flex items-center"
                            title="Delete Notice"
                          >
                            <FiTrash2 className="text-xs" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
