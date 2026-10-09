'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  FiFileText,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiExternalLink,
  FiSearch,
  FiCheckCircle,
  FiXCircle,
  FiCalendar,
  FiRefreshCw,
  FiLink,
  FiCheck,
  FiX
} from 'react-icons/fi';
import { FaGoogleDrive } from 'react-icons/fa';

// Dynamically import TiptapEditor to prevent any SSR hydration mismatch
const TiptapEditor = dynamic(() => import('src/component/website/ui/TiptapEditor.jsx'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-40 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center text-xs text-slate-400">
      Loading rich text editor...
    </div>
  ),
});

export default function NoticesPage() {
  const params = useParams();
  const domain = params?.domain || '';

  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [toastError, setToastError] = useState(null);

  // Delete Confirmation Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [noticeToDelete, setNoticeToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDriveUrl, setFormDriveUrl] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPublishedDate, setFormPublishedDate] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  useEffect(() => {
    fetchNotices();
  }, [domain, selectedStatus]);

  const showToast = (msg, isErr = false) => {
    if (isErr) {
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
      let url = `/api/${domain}/staff/panel/notices?`;
      if (selectedStatus !== 'all') url += `status=${selectedStatus}&`;
      if (searchTerm.trim()) url += `search=${encodeURIComponent(searchTerm.trim())}&`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setNotices(data.notices || []);
      } else {
        showToast(data.error || 'Failed to load notices', true);
      }
    } catch (err) {
      console.error('Fetch notices error:', err);
      showToast('Network error while loading notices', true);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingNotice(null);
    setFormTitle('');
    setFormSlug('');
    setFormDriveUrl('');
    setFormDescription('');
    setFormPublishedDate(new Date().toISOString().split('T')[0]);
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (notice) => {
    setEditingNotice(notice);
    setFormTitle(notice.title || '');
    setFormSlug(notice.slug || '');
    setFormDriveUrl(notice.drive_url || '');
    setFormDescription(notice.description || '');
    setFormPublishedDate(
      notice.published_date
        ? new Date(notice.published_date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0]
    );
    setFormIsActive(Boolean(notice.is_active));
    setIsModalOpen(true);
  };

  const handleTitleChange = (e) => {
    const val = e.target.value;
    setFormTitle(val);
    if (!editingNotice) {
      const autoSlug = val
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setFormSlug(autoSlug);
    }
  };

  const handleSaveNotice = async (e) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showToast('Notice title is required', true);
      return;
    }
    if (!formDriveUrl.trim()) {
      showToast('Drive URL or document link is required', true);
      return;
    }

    setSubmitting(true);
    try {
      const method = editingNotice ? 'PUT' : 'POST';
      const payload = {
        title: formTitle.trim(),
        slug: formSlug.trim(),
        drive_url: formDriveUrl.trim(),
        description: formDescription,
        published_date: formPublishedDate,
        is_active: formIsActive,
      };
      if (editingNotice) payload.id = editingNotice.id;

      const res = await fetch(`/api/${domain}/staff/panel/notices`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        showToast(editingNotice ? 'Notice updated successfully' : 'Notice created successfully');
        setIsModalOpen(false);
        fetchNotices();
      } else {
        showToast(data.error || 'Failed to save notice', true);
      }
    } catch (err) {
      console.error('Save notice error:', err);
      showToast('Network error while saving notice', true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNotice = async () => {
    if (!noticeToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/${domain}/staff/panel/notices?id=${noticeToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Notice "${noticeToDelete.title}" deleted`);
        setDeleteModalOpen(false);
        setNoticeToDelete(null);
        fetchNotices();
      } else {
        showToast(data.error || 'Failed to delete notice', true);
      }
    } catch (err) {
      console.error('Delete notice error:', err);
      showToast('Network error deleting notice', true);
    } finally {
      setDeleting(false);
    }
  };

  const toggleNoticeStatus = async (notice) => {
    try {
      const res = await fetch(`/api/${domain}/staff/panel/notices`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: notice.id,
          is_active: !notice.is_active,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Notice status toggled to ${!notice.is_active ? 'Active' : 'Inactive'}`);
        fetchNotices();
      } else {
        showToast(data.error || 'Failed to toggle status', true);
      }
    } catch (err) {
      console.error('Toggle status error:', err);
      showToast('Network error updating status', true);
    }
  };

  // KPIs
  const totalCount = notices.length;
  const activeCount = notices.filter((n) => n.is_active).length;
  const inactiveCount = notices.filter((n) => !n.is_active).length;

  return (
    <div className="w-full space-y-6">
      {/* Toast Alerts */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-xl text-sm animate-fade-in font-medium">
          <FiCheckCircle className="text-lg shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
      {toastError && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-rose-600 text-white px-4 py-3 rounded-xl shadow-xl text-sm animate-fade-in font-medium">
          <FiXCircle className="text-lg shrink-0" />
          <span>{toastError}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Total Notices</p>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <FiFileText className="text-base" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono">{totalCount}</span>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Registered records</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Active Published</p>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <FiCheckCircle className="text-base" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">{activeCount}</span>
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Live on website</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Inactive / Archived</p>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <FiXCircle className="text-base" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-slate-700 dark:text-slate-300 font-mono">{inactiveCount}</span>
            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">Hidden from students</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Cloud Storage</p>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <FaGoogleDrive className="text-base" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-sm font-semibold text-slate-900 dark:text-white">Google Drive</span>
            <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">Direct Linked</span>
          </div>
        </div>
      </div>

      {/* Main Workstation Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {/* Header Toolbar */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FiFileText className="text-secondary" />
              Notices & Circulars
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Publish official circulars and notices with rich formatted briefings and Google Drive documents.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Box */}
            <div className="relative min-w-[220px]">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
              <input
                type="text"
                placeholder="Search notices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchNotices()}
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition"
              />
            </div>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            <button
              onClick={fetchNotices}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
              title="Refresh"
            >
              <FiRefreshCw className={loading ? 'animate-spin' : ''} />
            </button>

            <button
              onClick={openCreateModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-secondary hover:bg-secondary-dark text-white shadow-xs transition-all cursor-pointer"
            >
              <FiPlus className="text-sm" />
              <span>New Notice</span>
            </button>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4 font-semibold uppercase text-[10px] tracking-wider">#</th>
                <th className="py-3 px-4 font-semibold uppercase text-[10px] tracking-wider">Title & Slug</th>
                <th className="py-3 px-4 font-semibold uppercase text-[10px] tracking-wider">Drive Document</th>
                <th className="py-3 px-4 font-semibold uppercase text-[10px] tracking-wider">Publish Date</th>
                <th className="py-3 px-4 font-semibold uppercase text-[10px] tracking-wider">Status</th>
                <th className="py-3 px-4 font-semibold uppercase text-[10px] tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <FiRefreshCw className="inline-block animate-spin text-lg mr-2 text-secondary" />
                    Loading notices data...
                  </td>
                </tr>
              ) : notices.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400 dark:text-slate-500">
                    No notices found matching your criteria. Click "New Notice" to publish your first notice.
                  </td>
                </tr>
              ) : (
                notices.map((notice, idx) => (
                  <tr
                    key={notice.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-3.5 px-4 max-w-sm">
                      <p className="font-semibold text-slate-900 dark:text-white line-clamp-1">
                        {notice.title}
                      </p>
                      <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                        /{notice.slug}
                      </p>
                    </td>
                    <td className="py-3.5 px-4">
                      {notice.drive_url ? (
                        <a
                          href={notice.drive_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-medium hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors text-[11px]"
                          title={notice.drive_url}
                        >
                          <FaGoogleDrive className="text-xs text-blue-500 shrink-0" />
                          <span className="truncate max-w-[140px]">View Attachment</span>
                          <FiExternalLink className="text-[10px] shrink-0" />
                        </a>
                      ) : (
                        <span className="text-slate-400 italic">No link</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <FiCalendar className="text-slate-400 text-xs" />
                        <span>
                          {notice.published_date
                            ? new Date(notice.published_date).toLocaleDateString()
                            : '—'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleNoticeStatus(notice)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition cursor-pointer ${
                          notice.is_active
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        {notice.is_active ? <FiCheck className="text-xs" /> : <FiX className="text-xs" />}
                        <span>{notice.is_active ? 'Active' : 'Inactive'}</span>
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(notice)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                          title="Edit Notice"
                        >
                          <FiEdit2 className="text-sm" />
                        </button>
                        <button
                          onClick={() => {
                            setNoticeToDelete(notice);
                            setDeleteModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition cursor-pointer"
                          title="Delete Notice"
                        >
                          <FiTrash2 className="text-sm" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal with Tiptap Editor */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-8 animate-scale-up">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingNotice ? 'Edit Notice' : 'Create New Notice'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Fill in the details below. Rich briefings and Google Drive document URLs are supported.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <FiX className="text-base" />
              </button>
            </div>

            <form onSubmit={handleSaveNotice} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Title */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Notice Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mid-Term Examination Schedule & Guidelines"
                    value={formTitle}
                    onChange={handleTitleChange}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition"
                  />
                </div>

                {/* Slug */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    URL Slug <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. mid-term-examination-schedule"
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Drive URL */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <FaGoogleDrive className="text-blue-500 text-xs" />
                    <span>Google Drive Document URL</span> <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://drive.google.com/file/d/..."
                    value={formDriveUrl}
                    onChange={(e) => setFormDriveUrl(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition"
                  />
                </div>

                {/* Published Date */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Publish Date
                  </label>
                  <input
                    type="date"
                    value={formPublishedDate}
                    onChange={(e) => setFormPublishedDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition cursor-pointer"
                  />
                </div>
              </div>

              {/* Tiptap Rich Text Editor for Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Notice Briefing & Full Description</span>
                  <span className="text-[11px] font-normal text-slate-400">Powered by Tiptap Editor</span>
                </label>
                <TiptapEditor
                  value={formDescription}
                  onChange={(html) => setFormDescription(html)}
                  placeholder="Compose official notice briefing, instructions, timing and details..."
                  minHeight="200px"
                />
              </div>

              {/* Status Toggle */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="formIsActive"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-secondary focus:ring-secondary cursor-pointer"
                />
                <label htmlFor="formIsActive" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Publish notice immediately as Active
                </label>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-secondary hover:bg-secondary-dark text-white shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting && <FiRefreshCw className="animate-spin text-xs" />}
                  <span>{editingNotice ? 'Update Notice' : 'Save Notice'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-scale-up">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50">
                <FiTrash2 className="text-xl" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Notice</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Are you sure you want to permanently delete the notice{' '}
              <strong className="text-slate-900 dark:text-white">"{noticeToDelete?.title}"</strong>?
              This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteNotice}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {deleting && <FiRefreshCw className="animate-spin text-xs" />}
                <span>Delete Permanently</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
