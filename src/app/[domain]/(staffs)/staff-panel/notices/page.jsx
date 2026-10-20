'use client';

import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import Loader from 'src/component/common/Loader';

// Dynamically import TiptapEditor to prevent SSR hydration mismatch
const TiptapEditor = dynamic(() => import('src/component/website/ui/TiptapEditor.jsx'), {
  ssr: false,
  loading: () => (
    <div className="h-32 border border-slate-200 dark:border-slate-800 rounded-md animate-pulse bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center text-xs text-slate-400">
      Loading rich text editor...
    </div>
  ),
});

export default function NoticesStaffPage() {
  const { website, getApiEndpoint } = useContext(TenantWebsiteContext);

  // Data states
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all'); // 'all' | 'active' | 'inactive'

  // In-Page Form State (NO POPUP MODAL)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);

  // In-Page Delete Confirmation (NO POPUP MODAL)
  const [noticeToDelete, setNoticeToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formDriveUrl, setFormDriveUrl] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPublishedDate, setFormPublishedDate] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  // API Endpoint
  const apiEndpoint = useMemo(() => getApiEndpoint('staff/panel/notices'), [getApiEndpoint]);

  // Fetch notices
  const fetchNotices = useCallback(
    async (showFeedback = false) => {
      if (!apiEndpoint) return;
      try {
        if (showFeedback) setRefreshing(true);
        const params = new URLSearchParams();
        if (selectedStatus !== 'all') params.append('status', selectedStatus);
        if (searchTerm.trim()) params.append('search', searchTerm.trim());

        const queryUrl = `${apiEndpoint}${params.toString() ? `?${params.toString()}` : ''}`;
        const res = await axios.get(queryUrl);
        if (res.data?.success) {
          setNotices(res.data.notices || []);
          if (showFeedback) toast.success('Notices refreshed.');
        } else {
          toast.error(res.data?.error || 'Failed to load notices.');
        }
      } catch (err) {
        console.error('Fetch notices error:', err);
        toast.error(err.response?.data?.error || 'Failed to connect to notices server.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [apiEndpoint, selectedStatus, searchTerm]
  );

  useEffect(() => {
    let ignore = false;
    if (!ignore) {
      fetchNotices();
    }
    return () => {
      ignore = true;
    };
  }, [fetchNotices]);

  // Handle open create form
  const handleOpenCreate = () => {
    setEditingNotice(null);
    setFormTitle('');
    setFormDriveUrl('');
    setFormDescription('');
    setFormPublishedDate(new Date().toISOString().split('T')[0]);
    setFormIsActive(true);
    setNoticeToDelete(null);
    setIsFormOpen(true);
  };

  // Handle open edit form
  const handleOpenEdit = (notice) => {
    setEditingNotice(notice);
    setFormTitle(notice.title || '');
    setFormDriveUrl(notice.drive_url || '');
    setFormDescription(notice.description || '');
    setFormPublishedDate(
      notice.published_date
        ? new Date(notice.published_date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0]
    );
    setFormIsActive(Boolean(notice.is_active));
    setNoticeToDelete(null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingNotice(null);
  };

  const handleTitleChange = (e) => {
    setFormTitle(e.target.value);
  };

  // Save notice (Create or Update)
  const handleSaveNotice = async (e) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast.error('Notice title is required.');
      return;
    }
    if (!formDriveUrl.trim()) {
      toast.error('Document URL is required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: formTitle.trim(),
        drive_url: formDriveUrl.trim(),
        description: formDescription,
        published_date: formPublishedDate,
        is_active: formIsActive,
      };

      let res;
      if (editingNotice) {
        payload.id = editingNotice.id;
        res = await axios.put(apiEndpoint, payload);
      } else {
        res = await axios.post(apiEndpoint, payload);
      }

      if (res.data?.success) {
        toast.success(editingNotice ? 'Notice updated successfully.' : 'Notice published successfully.');
        setIsFormOpen(false);
        setEditingNotice(null);
        fetchNotices();
      } else {
        toast.error(res.data?.error || 'Failed to save notice.');
      }
    } catch (err) {
      console.error('Save notice error:', err);
      toast.error(err.response?.data?.error || 'Error saving notice to database.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete notice execution
  const handleConfirmDelete = async () => {
    if (!noticeToDelete) return;
    setDeleting(true);
    try {
      const res = await axios.delete(`${apiEndpoint}?id=${noticeToDelete.id}`);
      if (res.data?.success) {
        toast.success(`Notice "${noticeToDelete.title}" deleted.`);
        setNoticeToDelete(null);
        fetchNotices();
      } else {
        toast.error(res.data?.error || 'Failed to delete notice.');
      }
    } catch (err) {
      console.error('Delete notice error:', err);
      toast.error(err.response?.data?.error || 'Failed to delete notice record.');
    } finally {
      setDeleting(false);
    }
  };

  // Toggle active status
  const handleToggleStatus = async (notice) => {
    try {
      const res = await axios.put(apiEndpoint, {
        id: notice.id,
        is_active: !notice.is_active,
      });
      if (res.data?.success) {
        toast.success(`Notice status changed to ${!notice.is_active ? 'Active' : 'Inactive'}.`);
        fetchNotices();
      } else {
        toast.error(res.data?.error || 'Failed to update status.');
      }
    } catch (err) {
      console.error('Toggle status error:', err);
      toast.error('Network error updating status.');
    }
  };

  // KPIs
  const totalCount = notices.length;
  const activeCount = notices.filter((n) => n.is_active).length;
  const inactiveCount = notices.filter((n) => !n.is_active).length;

  return (
    <div className="w-full space-y-4">
      {/* Top Header & Overview Bar */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-3">
        <div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-white">
            Notices & Circulars
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Publish institutional notices, academic circulars, directives, and linked documents.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isFormOpen && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="px-3.5 py-1.5 rounded-md bg-primary hover:bg-primary-dark text-white text-xs font-medium cursor-pointer shadow-xs transition"
            >
              + New Notice
            </button>
          )}
          <button
            type="button"
            onClick={() => fetchNotices(true)}
            disabled={refreshing}
            className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium transition cursor-pointer disabled:opacity-50"
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* KPI Cards (High-Density Metric Bar) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Total Notices
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-semibold text-slate-900 dark:text-white font-mono">
              {totalCount}
            </span>
            <span className="text-[10px] text-slate-400">All Records</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Active / Live
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
              {activeCount}
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Published</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Archived / Hidden
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-semibold text-slate-600 dark:text-slate-400 font-mono">
              {inactiveCount}
            </span>
            <span className="text-[10px] text-slate-400">Draft / Inactive</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Storage Integration
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xs font-semibold text-slate-900 dark:text-white">
              Google Drive
            </span>
            <span className="text-[10px] text-primary">Connected</span>
          </div>
        </div>
      </div>

      {/* IN-PAGE DELETE CONFIRMATION BANNER (NO POPUP MODAL) */}
      {noticeToDelete && (
        <div className="w-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-md p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-rose-800 dark:text-rose-300">
                Confirm Deletion: "{noticeToDelete.title}"
              </p>
              <p className="text-[11px] text-rose-700 dark:text-rose-400 mt-0.5">
                Are you sure you want to permanently delete this notice? This action cannot be reversed.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setNoticeToDelete(null)}
                disabled={deleting}
                className="px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-3.5 py-1.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium cursor-pointer shadow-xs transition disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IN-PAGE FORM SECTION (NO POPUP MODAL) */}
      {isFormOpen && (
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                {editingNotice ? `Edit Notice: ${editingNotice.title}` : 'Create New Notice'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Fill in the notice details below. Rich briefings and external document URLs are supported.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCloseForm}
              className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Close
            </button>
          </div>

          <form onSubmit={handleSaveNotice} className="space-y-4">
            {/* Notice Title */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Notice Title *
              </label>
              <input
                type="text"
                required
                value={formTitle}
                onChange={handleTitleChange}
                placeholder="e.g. Mid-Term Examination Schedule & Practical Guidelines"
                className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Document URL */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Document / Google Drive Link *
                </label>
                <input
                  type="url"
                  required
                  value={formDriveUrl}
                  onChange={(e) => setFormDriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/..."
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>

              {/* Published Date */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Publish Date
                </label>
                <input
                  type="date"
                  value={formPublishedDate}
                  onChange={(e) => setFormPublishedDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
                />
              </div>
            </div>

            {/* Description (Tiptap Editor) */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Notice Briefing & Full Description</span>
                <span className="text-[10px] text-slate-400">Rich Text Formatted</span>
              </label>
              <TiptapEditor
                value={formDescription}
                onChange={(html) => setFormDescription(html)}
                placeholder="Compose detailed circular briefing, schedule details, timing, and room directives..."
                minHeight="160px"
              />
            </div>

            {/* Status Checkbox */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="formIsActive"
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
                className="w-4 h-4 rounded-sm border-slate-300 text-primary focus:ring-primary cursor-pointer"
              />
              <label
                htmlFor="formIsActive"
                className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Publish notice immediately as Active
              </label>
            </div>

            {/* Form Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleCloseForm}
                className="px-3.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-1.5 rounded-md bg-primary hover:bg-primary-dark text-white text-xs font-medium cursor-pointer shadow-xs transition disabled:opacity-50"
              >
                {submitting ? 'Saving...' : editingNotice ? 'Update Notice' : 'Save Notice'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Workstation Container (Table & Search Controls) */}
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md shadow-xs overflow-hidden">
        {/* Filter and Search Bar */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-900 dark:text-white">
              Notices List
            </span>
            <span className="px-2 py-0.5 rounded-sm text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {notices.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <input
              type="text"
              placeholder="Search notices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchNotices()}
              className="px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary min-w-[200px]"
            />

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            <button
              type="button"
              onClick={() => fetchNotices()}
              className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium transition cursor-pointer"
            >
              Filter
            </button>
          </div>
        </div>

        {/* Notices Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                <th className="py-2.5 px-3.5 font-semibold uppercase text-[10px] tracking-wider w-12">#</th>
                <th className="py-2.5 px-3.5 font-semibold uppercase text-[10px] tracking-wider">Notice Title</th>
                <th className="py-2.5 px-3.5 font-semibold uppercase text-[10px] tracking-wider">Document Attachment</th>
                <th className="py-2.5 px-3.5 font-semibold uppercase text-[10px] tracking-wider">Published Date</th>
                <th className="py-2.5 px-3.5 font-semibold uppercase text-[10px] tracking-wider text-center">Status</th>
                <th className="py-2.5 px-3.5 font-semibold uppercase text-[10px] tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center">
                    <Loader />
                  </td>
                </tr>
              ) : notices.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
                    No notices registered yet. Click "+ New Notice" to publish your first record.
                  </td>
                </tr>
              ) : (
                notices.map((notice, idx) => (
                  <tr
                    key={notice.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-3.5 font-mono text-slate-400 text-xs">{idx + 1}</td>
                    <td className="py-3 px-3.5 max-w-sm space-y-0.5">
                      <div className="font-semibold text-slate-900 dark:text-white line-clamp-1">
                        {notice.title}
                      </div>
                      {notice.description && (
                        <div
                          className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: notice.description }}
                        />
                      )}
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      {notice.drive_url ? (
                        <a
                          href={notice.drive_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-2 py-0.5 rounded-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-primary hover:underline text-[11px] font-medium"
                        >
                          View Document ↗
                        </a>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">No link</span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap font-mono text-slate-600 dark:text-slate-300 text-xs">
                      {notice.published_date
                        ? new Date(notice.published_date).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="py-3 px-3.5 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(notice)}
                        className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-semibold transition cursor-pointer ${
                          notice.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                            : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                        }`}
                        title="Click to toggle status"
                      >
                        {notice.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="py-3 px-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(notice)}
                          className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                          title="Edit"
                        >
                          <FiEdit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setNoticeToDelete(notice)}
                          className="p-1.5 rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/40 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          title="Delete"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
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
    </div>
  );
}
