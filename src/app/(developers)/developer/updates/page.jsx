'use client';

import { useState, useEffect, useContext, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Context } from 'src/component/helper/Context';
import LoadingScreen from 'src/component/common/LoadingScreen';

export default function DeveloperUpdatesPage() {
  const { user } = useContext(Context);
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // In-page Editor states
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
    <div className="w-full space-y-4">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded p-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-slate-900">
              Product Updates &amp; Changelog
            </h1>
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded border bg-slate-100 text-slate-700 border-slate-200">
              Releases
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Publish, edit, and manage product versions, feature releases, announcements, and changelogs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchUpdates}
            className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-xs transition-colors cursor-pointer"
          >
            Refresh
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
              className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors cursor-pointer"
            >
              {isEditorOpen && !editingUpdate ? 'Close Form' : 'Post Update'}
            </button>
          )}
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback.message && (
        <div
          className={`p-3 rounded flex items-center justify-between text-xs font-normal ${
            feedback.type === 'error'
              ? 'bg-rose-50 text-rose-700 border border-rose-200'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback({ type: '', message: '' })}
            className="text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* In-Page Create / Edit Panel */}
      {isEditorOpen && (
        <div
          ref={editorRef}
          className="bg-white border border-slate-200 rounded p-4 space-y-3"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-sm font-semibold text-slate-900">
              {editingUpdate ? `Edit Update: ${editingUpdate.version} - "${editingUpdate.title}"` : 'Post New Product Release / Update'}
            </h2>
            <button
              type="button"
              onClick={closeEditor}
              className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Version Tag <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  placeholder="e.g. v2.4.0 or v1.0.1"
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-800"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Release Date
                </label>
                <input
                  type="date"
                  value={formData.release_date}
                  onChange={(e) => setFormData({ ...formData, release_date: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-800"
                />
              </div>

              <div className="sm:col-span-4 flex items-end pb-1">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.is_published}
                    onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs text-slate-700 font-normal">
                    Publish publicly on platform
                  </span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Release Title <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Major Platform Upgrade: PostgreSQL Architecture"
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Release Summary / Overview
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief summary of what this release brings..."
                className="w-full bg-white border border-slate-300 rounded p-3 text-xs text-slate-900 focus:outline-none focus:border-slate-800 leading-relaxed font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Changelog / Release Notes
              </label>
              <textarea
                rows={5}
                value={formData.changelog}
                onChange={(e) => setFormData({ ...formData, changelog: e.target.value })}
                placeholder="• Added automated SSL certificate issuance&#10;• Improved database query latency by 45%"
                className="w-full bg-white border border-slate-300 rounded p-3 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-800 leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={closeEditor}
                className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium disabled:opacity-50 cursor-pointer"
              >
                {submitting ? 'Saving...' : editingUpdate ? 'Update Release' : 'Publish Release'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main List Card */}
      <div className="bg-white border border-slate-200 rounded p-4 space-y-3">
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Search updates by title, version, or changelog..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded">
            {[
              { key: 'ALL', label: `All (${totalCount})` },
              { key: 'PUBLISHED', label: `Published (${publishedCount})` },
              { key: 'DRAFT', label: `Drafts (${draftCount})` },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                  statusFilter === tab.key
                    ? 'bg-white text-slate-900 font-medium shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Updates Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase font-semibold">
                <th className="pb-2 w-12">#</th>
                <th className="pb-2 w-20">Version</th>
                <th className="pb-2">Update Title &amp; Summary</th>
                <th className="pb-2 text-center w-24">Status</th>
                <th className="pb-2 text-center w-28 hidden sm:table-cell">Release Date</th>
                <th className="pb-2 text-right w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center">
                    <LoadingScreen fullScreen={false} size="sm" label="Loading product releases..." />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No product updates found.
                  </td>
                </tr>
              ) : (
                filtered.map((update) => {
                  const isCurrentlyEditing = editingUpdate?.id === update.id && isEditorOpen;
                  const formattedDate = update.release_date || update.created_at
                    ? new Date(update.release_date || update.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : '—';

                  return (
                    <tr
                      key={update.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        isCurrentlyEditing ? 'bg-slate-50 font-medium' : ''
                      }`}
                    >
                      <td className="py-2.5 font-mono text-[11px] text-slate-400">
                        #{update.id}
                      </td>

                      <td className="py-2.5">
                        <span className="font-mono text-xs font-medium text-slate-900">
                          {update.version || 'v1.0.0'}
                        </span>
                      </td>

                      <td className="py-2.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            {canManage ? (
                              <button
                                type="button"
                                onClick={() => openEditInPage(update)}
                                className="text-xs font-semibold text-slate-900 hover:underline text-left cursor-pointer"
                              >
                                {update.title}
                              </button>
                            ) : (
                              <span className="text-xs font-semibold text-slate-900">
                                {update.title}
                              </span>
                            )}
                            {isCurrentlyEditing && (
                              <span className="text-[9px] font-medium px-1.5 py-0.2 rounded border bg-slate-100 text-slate-700 border-slate-200">
                                Editing
                              </span>
                            )}
                          </div>

                          {update.description ? (
                            <p className="text-[11px] text-slate-500 line-clamp-1 max-w-md">
                              {update.description}
                            </p>
                          ) : update.changelog ? (
                            <p className="text-[11px] text-slate-500 line-clamp-1 max-w-md font-mono">
                              {update.changelog}
                            </p>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">No summary added</span>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => canManage && handleToggleStatus(update)}
                          disabled={!canManage}
                          className={`text-[9px] font-medium px-1.5 py-0.5 rounded border transition-colors ${
                            canManage ? 'cursor-pointer' : 'cursor-default'
                          } ${
                            update.is_published !== false
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {update.is_published !== false ? 'Published' : 'Draft'}
                        </button>
                      </td>

                      <td className="py-2.5 text-center text-xs text-slate-500 hidden sm:table-cell font-mono">
                        {formattedDate}
                      </td>

                      <td className="py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={update.slug ? `/updates/${update.slug}` : '/updates'}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium"
                          >
                            View
                          </Link>

                          {canManage && (
                            <>
                              <button
                                type="button"
                                onClick={() => openEditInPage(update)}
                                className="px-2 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                disabled={deletingId === update.id}
                                onClick={() => handleDelete(update.id, update.title, update.version)}
                                className="px-2 py-1 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium cursor-pointer disabled:opacity-50"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
