'use client';

import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
  FiEdit2,
  FiTrash2,
  FiFileText,
  FiUploadCloud,
  FiDownload,
  FiExternalLink,
  FiPaperclip,
  FiEye,
  FiSearch,
  FiCalendar,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiPlus,
  FiRefreshCw,
} from 'react-icons/fi';
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

const TARGET_AUDIENCES = [
  'All',
  'Students',
  'Teachers',
  'Parents',
  'Staff',
];

export default function NoticesStaffPage() {
  const { website, getApiEndpoint } = useContext(TenantWebsiteContext);

  // Data states
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all'); // 'all' | 'active' | 'inactive'
  const [selectedAudience, setSelectedAudience] = useState('all');

  // In-Page Form State (NO POPUP MODAL)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);

  // In-Page Delete Confirmation (NO POPUP MODAL)
  const [noticeToDelete, setNoticeToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formAudience, setFormAudience] = useState('All');
  const [formPublishedDate, setFormPublishedDate] = useState('');
  const [formExpiryDate, setFormExpiryDate] = useState('');
  const [formDriveUrl, setFormDriveUrl] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIsPinned, setFormIsPinned] = useState(false);
  const [formIsActive, setFormIsActive] = useState(true);

  // PDF File Upload State
  const [selectedPdfFile, setSelectedPdfFile] = useState(null);
  const [existingPdfUrl, setExistingPdfUrl] = useState('');
  const [existingFileName, setExistingFileName] = useState('');
  const [existingFileSize, setExistingFileSize] = useState(0);
  const [removeExistingPdf, setRemoveExistingPdf] = useState(false);

  // API Endpoint
  const apiEndpoint = useMemo(() => getApiEndpoint('staff/panel/notices'), [getApiEndpoint]);

  // Format file size
  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // Fetch notices
  const fetchNotices = useCallback(
    async (showFeedback = false) => {
      if (!apiEndpoint) return;
      try {
        if (showFeedback) setRefreshing(true);
        const params = new URLSearchParams();
        if (selectedStatus !== 'all') params.append('status', selectedStatus);
        if (selectedAudience !== 'all') params.append('audience', selectedAudience);
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
    [apiEndpoint, selectedStatus, selectedAudience, searchTerm]
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
    setFormAudience('All');
    setFormPublishedDate(new Date().toISOString().split('T')[0]);
    setFormExpiryDate('');
    setFormDriveUrl('');
    setFormDescription('');
    setFormIsPinned(false);
    setFormIsActive(true);
    setSelectedPdfFile(null);
    setExistingPdfUrl('');
    setExistingFileName('');
    setExistingFileSize(0);
    setRemoveExistingPdf(false);
    setNoticeToDelete(null);
    setIsFormOpen(true);
  };

  // Handle open edit form
  const handleOpenEdit = (notice) => {
    setEditingNotice(notice);
    setFormTitle(notice.title || '');
    setFormAudience(notice.target_audience || 'All');
    setFormPublishedDate(
      notice.published_date
        ? new Date(notice.published_date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0]
    );
    setFormExpiryDate(
      notice.expiry_date
        ? new Date(notice.expiry_date).toISOString().split('T')[0]
        : ''
    );
    setFormDriveUrl(notice.drive_url || '');
    setFormDescription(notice.description || '');
    setFormIsPinned(Boolean(notice.is_pinned));
    setFormIsActive(Boolean(notice.is_active));
    setSelectedPdfFile(null);
    setExistingPdfUrl(notice.pdf_url || '');
    setExistingFileName(notice.file_name || '');
    setExistingFileSize(notice.file_size || 0);
    setRemoveExistingPdf(false);
    setNoticeToDelete(null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingNotice(null);
    setSelectedPdfFile(null);
  };

  // Handle PDF file selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        toast.error('Please select a valid PDF document (.pdf).');
        e.target.value = '';
        return;
      }
      if (file.size > 25 * 1024 * 1024) {
        toast.error('File size exceeds the 25MB limit.');
        e.target.value = '';
        return;
      }
      setSelectedPdfFile(file);
      setRemoveExistingPdf(false);
    }
  };

  // Save notice (Create or Update)
  const handleSaveNotice = async (e) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast.error('Notice title is required.');
      return;
    }

    setSubmitting(true);
    try {
      let res;

      // When a file is selected or PDF is being removed, send as multipart/form-data
      if (selectedPdfFile || removeExistingPdf) {
        const formData = new FormData();
        if (editingNotice) formData.append('id', editingNotice.id);
        formData.append('title', formTitle.trim());
        formData.append('target_audience', formAudience);
        formData.append('published_date', formPublishedDate);
        if (formExpiryDate) formData.append('expiry_date', formExpiryDate);
        if (formDriveUrl.trim()) formData.append('drive_url', formDriveUrl.trim());
        formData.append('description', formDescription || '');
        formData.append('is_pinned', formIsPinned ? 'true' : 'false');
        formData.append('is_active', formIsActive ? 'true' : 'false');

        if (selectedPdfFile) {
          formData.append('pdf', selectedPdfFile);
        }
        if (removeExistingPdf) {
          formData.append('remove_pdf', 'true');
        }

        const config = {
          headers: { 'Content-Type': 'multipart/form-data' },
        };

        if (editingNotice) {
          res = await axios.put(apiEndpoint, formData, config);
        } else {
          res = await axios.post(apiEndpoint, formData, config);
        }
      } else {
        // Send as regular JSON
        const payload = {
          title: formTitle.trim(),
          target_audience: formAudience,
          published_date: formPublishedDate,
          expiry_date: formExpiryDate || null,
          drive_url: formDriveUrl.trim() || null,
          description: formDescription,
          is_pinned: formIsPinned,
          is_active: formIsActive,
        };

        if (editingNotice) {
          payload.id = editingNotice.id;
          res = await axios.put(apiEndpoint, payload);
        } else {
          res = await axios.post(apiEndpoint, payload);
        }
      }

      if (res.data?.success) {
        toast.success(
          editingNotice ? 'Notice updated successfully.' : 'Notice published to bulletin successfully.'
        );
        setIsFormOpen(false);
        setEditingNotice(null);
        setSelectedPdfFile(null);
        fetchNotices();
      } else {
        toast.error(res.data?.error || 'Failed to save notice.');
      }
    } catch (err) {
      console.error('Save notice error:', err);
      toast.error(err.response?.data?.error || 'Error saving notice to server.');
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
  const pinnedCount = notices.filter((n) => n.is_pinned).length;
  const pdfCount = notices.filter((n) => n.pdf_url).length;

  return (
    <div className="w-full space-y-4">
      {/* Top Header & Overview Bar */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-3">
        <div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <FiFileText className="text-primary w-4 h-4" />
            Notices &amp; Circulars
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Publish institutional notices, exam routines, PDF circulars, and announcements with Cloudinary CDN storage.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isFormOpen && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="px-3.5 py-1.5 rounded-md bg-primary hover:bg-primary-dark text-white text-xs font-medium cursor-pointer shadow-xs transition flex items-center gap-1.5"
            >
              <FiPlus className="w-3.5 h-3.5" />
              <span>New Notice</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => fetchNotices(true)}
            disabled={refreshing}
            className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            <FiRefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
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
            <span className="text-[10px] text-slate-400">All Bulletins</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Live / Published
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
              {activeCount}
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Active</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Pinned Circulars
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-semibold text-amber-600 dark:text-amber-400 font-mono">
              {pinnedCount}
            </span>
            <span className="text-[10px] text-amber-600 dark:text-amber-400">Featured</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Cloudinary PDF Files
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-semibold text-primary font-mono">
              {pdfCount}
            </span>
            <span className="text-[10px] text-primary">CDN Hosted</span>
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
                Permanently delete this notice record? If a PDF was uploaded to Cloudinary, it will also be deleted from storage.
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
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 sm:p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                {editingNotice ? `Edit Notice: ${editingNotice.title}` : 'Publish New Notice'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Fill in the notice details below. Upload PDF documents directly to Cloudinary or link external files.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCloseForm}
              className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
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
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Annual Final Examination Routine & Practical Guidelines 2026"
                className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>

            {/* Target Audience & Dates Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Target Audience */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Target Audience
                </label>
                <select
                  value={formAudience}
                  onChange={(e) => setFormAudience(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
                >
                  {TARGET_AUDIENCES.map((aud) => (
                    <option key={aud} value={aud}>
                      {aud}
                    </option>
                  ))}
                </select>
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
                  className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
                />
              </div>

              {/* Expiry Date */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Expiry Date (Optional)
                </label>
                <input
                  type="date"
                  value={formExpiryDate}
                  onChange={(e) => setFormExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
                />
              </div>
            </div>

            {/* Cloudinary PDF Upload & Document Section */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-md p-3.5 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <FiUploadCloud className="text-primary w-4 h-4" />
                  <span>Attach Official PDF Document (Uploaded to Cloudinary CDN)</span>
                </label>
                <span className="text-[10px] text-slate-400">PDF up to 25MB</span>
              </div>

              {/* Existing PDF Alert in Edit Mode */}
              {existingPdfUrl && !removeExistingPdf && (
                <div className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FiPaperclip className="w-4 h-4 text-primary shrink-0" />
                    <div className="truncate">
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate block">
                        {existingFileName || 'Attached Notice Document.pdf'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {existingFileSize > 0 ? formatBytes(existingFileSize) : 'Cloudinary Stored'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={existingPdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-medium text-xs flex items-center gap-1"
                    >
                      <FiExternalLink className="w-3 h-3" />
                      <span>View PDF</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => setRemoveExistingPdf(true)}
                      className="px-2 py-1 text-[11px] rounded bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}

              {/* Show removal notice if marked for delete */}
              {removeExistingPdf && (
                <div className="flex items-center justify-between p-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-md text-xs text-rose-700 dark:text-rose-300">
                  <span>Current PDF will be removed upon saving.</span>
                  <button
                    type="button"
                    onClick={() => setRemoveExistingPdf(false)}
                    className="text-xs font-medium underline cursor-pointer"
                  >
                    Undo
                  </button>
                </div>
              )}

              {/* File Input */}
              <div className="space-y-1">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="block w-full text-xs text-slate-500 dark:text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                />
                {selectedPdfFile && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1">
                    <FiCheckCircle className="w-3.5 h-3.5" />
                    <span>Selected: {selectedPdfFile.name} ({formatBytes(selectedPdfFile.size)}) — Ready for Cloudinary upload</span>
                  </p>
                )}
              </div>

              {/* Optional Secondary Google Drive Link */}
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800">
                <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                  Optional External Document / Google Drive Link (Alternative fallback)
                </label>
                <input
                  type="url"
                  value={formDriveUrl}
                  onChange={(e) => setFormDriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/... or https://..."
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>

            {/* Description (Tiptap Editor) */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Notice Briefing &amp; Text Content</span>
                <span className="text-[10px] text-slate-400">Rich Text Formatted</span>
              </label>
              <TiptapEditor
                value={formDescription}
                onChange={(html) => setFormDescription(html)}
                placeholder="Compose detailed circular briefing, schedule details, timing, room directives..."
                minHeight="160px"
              />
            </div>

            {/* Checkboxes: Pin & Status */}
            <div className="flex flex-wrap items-center gap-6 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={formIsPinned}
                  onChange={(e) => setFormIsPinned(e.target.checked)}
                  className="w-4 h-4 rounded-sm border-slate-300 text-primary focus:ring-primary cursor-pointer"
                />
                <span>Pin notice to the top of notice bulletin (Featured)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="w-4 h-4 rounded-sm border-slate-300 text-primary focus:ring-primary cursor-pointer"
                />
                <span>Publish notice immediately as Active / Live</span>
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
                className="px-4 py-1.5 rounded-md bg-primary hover:bg-primary-dark text-white text-xs font-medium cursor-pointer shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {submitting ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Uploading &amp; Saving...</span>
                  </>
                ) : (
                  <span>{editingNotice ? 'Update Notice' : 'Save Notice'}</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SEARCH & FILTER CONTROLS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3 flex flex-col md:flex-row items-center justify-between gap-3 shadow-2xs">
        {/* Search */}
        <div className="relative w-full md:w-72">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search notices by title, keyword..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {/* Status Tab Filter */}
          <div className="flex items-center rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-0.5 text-xs">
            {['all', 'active', 'inactive'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setSelectedStatus(st)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium capitalize transition cursor-pointer ${
                  selectedStatus === st
                    ? 'bg-white dark:bg-slate-900 text-primary shadow-2xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Target Audience Filter */}
          <select
            value={selectedAudience}
            onChange={(e) => setSelectedAudience(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
          >
            <option value="all">All Audiences</option>
            {TARGET_AUDIENCES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* NOTICES LIST TABLE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden shadow-2xs">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-2">
            <Loader size="md" />
            <span className="text-xs text-slate-500">Loading notices repository...</span>
          </div>
        ) : notices.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <FiFileText className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              No notices found.
            </p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchTerm || selectedStatus !== 'all' || selectedAudience !== 'all'
                ? 'Try adjusting your search query or filter options.'
                : 'Click "+ New Notice" above to publish your first notice circular.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Notice Title &amp; Details</th>
                  <th className="py-2.5 px-3">Audience</th>
                  <th className="py-2.5 px-3">Attachment / PDF</th>
                  <th className="py-2.5 px-3">Published</th>
                  <th className="py-2.5 px-3">Views</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {notices.map((n) => {
                  const effectivePdf = n.pdf_url;
                  const effectiveDrive = n.drive_url;
                  const isPinned = Boolean(n.is_pinned);

                  return (
                    <tr
                      key={n.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                    >
                      {/* Title & Pinned */}
                      <td className="py-3 px-3 max-w-xs sm:max-w-sm">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isPinned && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 uppercase tracking-wider">
                                Pinned
                              </span>
                            )}
                            <span className="font-medium text-slate-900 dark:text-white line-clamp-2">
                              {n.title}
                            </span>
                          </div>
                          {n.description && (
                            <p className="text-[11px] text-slate-400 line-clamp-1">
                              {n.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Audience */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="text-[11px] text-slate-600 dark:text-slate-400">
                          {n.target_audience || 'All'}
                        </span>
                      </td>

                      {/* Attachment (Cloudinary PDF or Drive) */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {effectivePdf ? (
                          <div className="flex items-center gap-1.5">
                            <a
                              href={effectivePdf}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-primary/10 text-primary border border-primary/20 text-[11px] font-medium hover:bg-primary/20 transition"
                              title="Open Cloudinary PDF document"
                            >
                              <FiPaperclip className="w-3 h-3" />
                              <span className="max-w-[100px] truncate">
                                {n.file_name || 'View PDF'}
                              </span>
                            </a>
                            {n.file_size > 0 && (
                              <span className="text-[10px] text-slate-400">
                                {formatBytes(n.file_size)}
                              </span>
                            )}
                          </div>
                        ) : effectiveDrive ? (
                          <a
                            href={effectiveDrive}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                            title="Open Drive Link"
                          >
                            <FiExternalLink className="w-3 h-3" />
                            <span>External Drive</span>
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-400">Text Only</span>
                        )}
                      </td>

                      {/* Published Date */}
                      <td className="py-3 px-3 whitespace-nowrap text-slate-500 dark:text-slate-400">
                        {n.published_date
                          ? new Date(n.published_date).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : '—'}
                      </td>

                      {/* Views */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-mono text-slate-600 dark:text-slate-400">
                          {n.views_count || 0}
                        </span>
                      </td>

                      {/* Status Toggle */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(n)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                            n.is_active
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {n.is_active ? 'Live' : 'Hidden'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(n)}
                            className="p-1.5 text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            title="Edit Notice"
                          >
                            <FiEdit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setNoticeToDelete(n)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                            title="Delete Notice"
                          >
                            <FiTrash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
