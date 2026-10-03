'use client';

import { useState, useEffect, useContext, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Context } from 'src/component/helper/Context';
import {
  BiPlus,
  BiEditAlt,
  BiTrash,
  BiCheck,
  BiX,
  BiRefresh,
  BiBell,
  BiSearch,
  BiCheckCircle,
  BiInfoCircle,
  BiWorld,
  BiCalendar,
  BiTag,
} from 'react-icons/bi';

export default function DeveloperUpdatesPage() {
  const { user } = useContext(Context);
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // In-page Editor states (no modal!)
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState(null);
  const [formData, setFormData] = useState({
    version: '',
    title: '',
    release_date: new Date().toISOString().split('T')[0],
    description: '',
    changelog: '',
    is_published: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const editorRef = useRef(null);

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canManage = permissions.includes('updates') || user?.role === 'admin' || user?.role === 'developer';

  const fetchUpdates = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/marketing/developer/updates');
      const data = await res.json();
      if (data.success) {
        setUpdates(data.records || []);
      }
    } catch (err) {
      console.error('Failed to fetch updates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetch('/api/marketing/developer/updates')
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data.success) {
          setUpdates(data.records || []);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        console.error('Failed to fetch updates:', err);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const openCreateInPage = () => {
    setEditingUpdate(null);
    setFormData({
      version: '',
      title: '',
      release_date: new Date().toISOString().split('T')[0],
      description: '',
      changelog: '',
      is_published: true,
    });
    setFeedback({ type: '', message: '' });
    setIsEditorOpen(true);
    setTimeout(() => {
      editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const openEditInPage = (update) => {
    setEditingUpdate(update);
    const dateFormatted = update.release_date
      ? new Date(update.release_date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    setFormData({
      version: update.version || '',
      title: update.title || '',
      release_date: dateFormatted,
      description: update.description || '',
      changelog: update.changelog || '',
      is_published: update.is_published !== false,
    });
    setFeedback({ type: '', message: '' });
    setIsEditorOpen(true);
    setTimeout(() => {
      editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setEditingUpdate(null);
    setFormData({
      version: '',
      title: '',
      release_date: new Date().toISOString().split('T')[0],
      description: '',
      changelog: '',
      is_published: true,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.version.trim() || !formData.title.trim()) {
      setFeedback({ type: 'error', message: 'Please provide both version (e.g. v1.2.0) and title.' });
      return;
    }

    setSubmitting(true);
    setFeedback({ type: '', message: '' });

    try {
      const method = editingUpdate ? 'PUT' : 'POST';
      const payload = {
        id: editingUpdate?.id,
        version: formData.version.trim(),
        title: formData.title.trim(),
        release_date: formData.release_date || null,
        description: formData.description.trim(),
        changelog: formData.changelog.trim(),
        is_published: Boolean(formData.is_published),
      };

      const res = await fetch('/api/marketing/developer/updates', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        setFeedback({
          type: 'success',
          message: editingUpdate ? 'Update saved successfully.' : 'Product update published successfully.',
        });
        closeEditor();
        fetchUpdates();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to save product update.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Network error occurred.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (update) => {
    const nextState = !update.is_published;
    try {
      const res = await fetch('/api/marketing/developer/updates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: update.id, is_published: nextState }),
      });
      const data = await res.json();
      if (data.success) {
        setUpdates((prev) =>
          prev.map((u) => (u.id === update.id ? { ...u, is_published: nextState } : u))
        );
        setFeedback({
          type: 'success',
          message: `"${update.version} - ${update.title}" marked as ${nextState ? 'Published' : 'Draft'}.`,
        });
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to change status.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Network error.' });
    }
  };

  const handleDelete = async (id, title, version) => {
    if (!confirm(`Are you sure you want to permanently delete update "${version} - ${title}"?`)) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/marketing/developer/updates?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: `Update "${version} - ${title}" deleted successfully.` });
        if (editingUpdate?.id === id) {
          closeEditor();
        }
        fetchUpdates();
      } else {
        alert(data.error || 'Failed to delete update.');
      }
    } catch (err) {
      alert(err.message || 'Network error occurred.');
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = useMemo(() => {
    return updates.filter((u) => {
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !q ||
        u.title?.toLowerCase().includes(q) ||
        u.version?.toLowerCase().includes(q) ||
        u.description?.toLowerCase().includes(q) ||
        u.changelog?.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'PUBLISHED' && u.is_published !== false) ||
        (statusFilter === 'DRAFT' && u.is_published === false);

      return matchesSearch && matchesStatus;
    });
  }, [updates, searchTerm, statusFilter]);

  const totalCount = updates.length;
  const publishedCount = updates.filter((u) => u.is_published !== false).length;
  const draftCount = totalCount - publishedCount;

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 sm:p-6 shadow-xs w-full max-w-full overflow-hidden">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-medium text-slate-900 dark:text-white tracking-tight truncate">
              Product Updates &amp; Changelog
            </h1>
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-secondary/10 text-secondary border border-secondary/20 shrink-0">
              Releases
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
            Publish, edit, and manage product versions, feature releases, announcements, and changelogs.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={fetchUpdates}
            className="p-2 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Refresh updates"
            aria-label="Refresh"
          >
            <BiRefresh className="text-base" />
          </button>

          {canManage && (
            <button
              type="button"
              onClick={() => {
                if (isEditorOpen && !editingUpdate) {
                  closeEditor();
                } else {
                  openCreateInPage();
                }
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded text-xs font-medium transition-all shadow-xs bg-secondary hover:bg-secondary-dark text-white cursor-pointer shrink-0"
              title="Post Update"
            >
              <BiPlus className="text-base" />
              <span>{isEditorOpen && !editingUpdate ? 'Close Form' : 'Post Update'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Toast Feedback */}
      {feedback.message && (
        <div
          className={`p-3.5 rounded flex items-center justify-between text-xs font-normal shadow-xs ${
            feedback.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            {feedback.type === 'error' ? (
              <BiInfoCircle className="text-base shrink-0" />
            ) : (
              <BiCheckCircle className="text-base shrink-0" />
            )}
            <span className="truncate">{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback({ type: '', message: '' })}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0 p-0.5 cursor-pointer"
          >
            <BiX className="text-base" />
          </button>
        </div>
      )}

      {/* In-Page Create / Edit Panel (No popup!) */}
      {isEditorOpen && (
        <div
          ref={editorRef}
          className="bg-white dark:bg-slate-900 border-2 border-secondary/40 dark:border-secondary/60 rounded shadow-md p-5 sm:p-6 transition-all space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse" />
              <h2 className="text-sm sm:text-base font-medium text-slate-900 dark:text-white">
                {editingUpdate ? `Edit Update: ${editingUpdate.version} - "${editingUpdate.title}"` : 'Post New Product Release / Update'}
              </h2>
              {editingUpdate && (
                <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded">
                  #{editingUpdate.id}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={closeEditor}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              title="Close editor"
            >
              <BiX className="text-xl" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              {/* Version */}
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Version Tag <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <BiTag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    placeholder="e.g. v2.4.0 or v1.0.1"
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded pl-8 pr-3 py-2 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-secondary focus:bg-white dark:focus:bg-slate-900 transition-colors"
                  />
                </div>
              </div>

              {/* Release Date */}
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Release Date
                </label>
                <div className="relative">
                  <BiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    value={formData.release_date}
                    onChange={(e) => setFormData({ ...formData, release_date: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded pl-8 pr-3 py-2 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-secondary focus:bg-white dark:focus:bg-slate-900 transition-colors"
                  />
                </div>
              </div>

              {/* Publish Toggle */}
              <div className="sm:col-span-4 flex items-end pb-1.5">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.is_published}
                    onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                    className="rounded border-slate-300 dark:border-slate-700 text-secondary focus:ring-secondary w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-normal">
                    Publish publicly on platform
                  </span>
                </label>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Release Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Major Platform Upgrade: PostgreSQL Architecture & Multi-Tenancy"
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-secondary focus:bg-white dark:focus:bg-slate-900 transition-colors"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Release Summary / Overview
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief summary of what this release brings to institutions and creators..."
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-secondary focus:bg-white dark:focus:bg-slate-900 leading-relaxed font-sans transition-colors"
              />
            </div>

            {/* Changelog */}
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Changelog / Release Notes (Markdown or bullet points)
              </label>
              <textarea
                rows={5}
                value={formData.changelog}
                onChange={(e) => setFormData({ ...formData, changelog: e.target.value })}
                placeholder={`• Added automated SSL certificate issuance for custom subdomains\n• Improved database query latency by 45%\n• Fixed mobile navigation drawer layout`}
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-secondary focus:bg-white dark:focus:bg-slate-900 leading-relaxed transition-colors"
              />
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={closeEditor}
                className="px-4 py-2 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-normal hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded bg-secondary hover:bg-secondary-dark text-white text-xs font-medium shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                <BiCheck className="text-base" />
                <span>{submitting ? 'Saving...' : editingUpdate ? 'Update Release' : 'Publish Release'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main List Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-xs overflow-hidden w-full max-w-full">
        {/* Search & Filter Bar */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50 w-full">
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <BiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            <input
              type="text"
              placeholder="Search updates by title, version, or changelog..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded pl-8.5 pr-8 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                title="Clear search"
              >
                <BiX className="text-sm" />
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded w-full sm:w-auto shrink-0 overflow-x-auto">
            {[
              { key: 'ALL', label: `All (${totalCount})` },
              { key: 'PUBLISHED', label: `Published (${publishedCount})` },
              { key: 'DRAFT', label: `Drafts (${draftCount})` },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded text-xs font-normal transition-all cursor-pointer text-center whitespace-nowrap ${
                  statusFilter === tab.key
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-medium'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Responsive View List */}
        <div className="w-full max-w-full overflow-hidden">
          {/* Header Row */}
          <div className="hidden md:flex items-center gap-3 px-4 py-2.5 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 text-[10px] font-mono uppercase tracking-wider text-slate-400 select-none">
            <span className="w-8 shrink-0">#</span>
            <span className="w-20 shrink-0">Version</span>
            <span className="flex-1 min-w-0">Update Title &amp; Summary</span>
            <span className="w-24 shrink-0 text-center">Status</span>
            <span className="w-28 shrink-0 text-center hidden sm:block">Release Date</span>
            <span className="w-28 shrink-0 text-right">Actions</span>
          </div>

          {/* List Content */}
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
              <div className="w-6 h-6 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-normal">Loading product releases...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 px-4 text-center space-y-2">
              <div className="w-12 h-12 rounded bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center text-2xl mx-auto">
                <BiBell />
              </div>
              <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200">No Product Updates Found</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                {searchTerm
                  ? `No updates matched "${searchTerm}". Try a different keyword.`
                  : statusFilter !== 'ALL'
                  ? `No updates found in the ${statusFilter.toLowerCase()} filter.`
                  : 'Start posting product changelog and release notes.'}
              </p>
              {canManage && !searchTerm && statusFilter === 'ALL' && (
                <button
                  type="button"
                  onClick={openCreateInPage}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded bg-secondary text-white text-xs font-medium hover:bg-secondary-dark transition-colors cursor-pointer mt-2"
                >
                  <BiPlus className="text-base" />
                  <span>Post First Update</span>
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 w-full">
              {filtered.map((update) => {
                const isCurrentlyEditing = editingUpdate?.id === update.id && isEditorOpen;
                const formattedDate = update.release_date || update.created_at
                  ? new Date(update.release_date || update.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : '—';

                return (
                  <div
                    key={update.id}
                    className={`p-3 sm:p-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors flex items-center gap-2.5 sm:gap-3 w-full min-w-0 overflow-hidden ${
                      isCurrentlyEditing
                        ? 'bg-secondary/5 dark:bg-secondary/10 border-l-4 border-l-secondary'
                        : ''
                    }`}
                  >
                    {/* ID */}
                    <span className="w-8 shrink-0 font-mono font-medium text-[11px] text-slate-400 hidden md:block">
                      #{update.id}
                    </span>

                    {/* Version Badge */}
                    <div className="w-20 shrink-0">
                      <span className="inline-block px-2.5 py-1 rounded bg-secondary/10 text-secondary border border-secondary/20 font-mono font-medium text-xs">
                        {update.version || 'v1.0.0'}
                      </span>
                    </div>

                    {/* Title & Details */}
                    <div className="flex-1 min-w-0 pr-1 space-y-0.5">
                      <div className="flex items-center gap-2 min-w-0">
                        {canManage ? (
                          <button
                            type="button"
                            onClick={() => openEditInPage(update)}
                            className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white hover:text-secondary truncate block tracking-tight text-left cursor-pointer"
                            title={update.title}
                          >
                            {update.title}
                          </button>
                        ) : (
                          <span
                            className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white truncate block tracking-tight"
                            title={update.title}
                          >
                            {update.title}
                          </span>
                        )}
                        {isCurrentlyEditing && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-secondary text-white shrink-0">
                            Editing In-Page
                          </span>
                        )}
                      </div>

                      {update.description ? (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate block leading-normal">
                          {update.description}
                        </p>
                      ) : update.changelog ? (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate block leading-normal font-mono">
                          {update.changelog}
                        </p>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic block">No summary added</span>
                      )}

                      {/* Small screen date */}
                      <div className="text-[10px] text-slate-400 sm:hidden pt-0.5 font-mono">
                        {formattedDate}
                      </div>
                    </div>

                    {/* Status Column */}
                    <div className="w-24 shrink-0 text-center">
                      <button
                        type="button"
                        onClick={() => canManage && handleToggleStatus(update)}
                        disabled={!canManage}
                        className={`inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                          canManage ? 'cursor-pointer hover:opacity-85' : 'cursor-default'
                        } ${
                          update.is_published !== false
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                        }`}
                        title={canManage ? 'Click to toggle status' : 'Status'}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            update.is_published !== false ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        <span>{update.is_published !== false ? 'Published' : 'Draft'}</span>
                      </button>
                    </div>

                    {/* Date Column (Desktop) */}
                    <div className="w-28 shrink-0 text-center hidden sm:block">
                      <span className="text-[11px] text-slate-400 font-mono whitespace-nowrap">
                        {formattedDate}
                      </span>
                    </div>

                    {/* Actions Column */}
                    <div className="w-28 shrink-0 flex items-center justify-end gap-1.5">
                      <Link
                        href={update.slug ? `/updates/${update.slug}` : '/updates'}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-secondary hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        title="View live product release"
                      >
                        <BiWorld className="text-base" />
                      </Link>

                      {canManage && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEditInPage(update)}
                            className="p-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-secondary hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Edit update in-page"
                          >
                            <BiEditAlt className="text-base" />
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === update.id}
                            onClick={() => handleDelete(update.id, update.title, update.version)}
                            className="p-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer disabled:opacity-50"
                            title="Delete update"
                          >
                            <BiTrash className="text-base" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
