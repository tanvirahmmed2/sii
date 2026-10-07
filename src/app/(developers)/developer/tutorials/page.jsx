'use client';

import { useState, useEffect, useContext, useRef } from 'react';
import Image from 'next/image';
import { Context } from 'src/component/helper/Context';
import LoadingScreen from 'src/component/common/LoadingScreen';

function extractYoutubeId(url) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

export default function DeveloperTutorialsPage() {
  const { user } = useContext(Context);
  const [tutorials, setTutorials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  // In-page creation / edit form state
  const [showForm, setShowForm] = useState(false);
  const [editingTut, setEditingTut] = useState(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    youtube_link: '',
    is_published: true,
  });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const formRef = useRef(null);

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canManage =
    permissions.includes('tutorials') ||
    user?.role === 'admin' ||
    user?.role === 'manager';

  const fetchTutorials = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/marketing/developer/tutorials');
      const data = await res.json();
      if (data.success) {
        setTutorials(data.tutorials || data.records || []);
      }
    } catch (err) {
      console.error('Failed to load tutorials:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetch('/api/marketing/developer/tutorials')
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data.success) {
          setTutorials(data.tutorials || data.records || []);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        console.error('Failed to load tutorials:', err);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const openCreateForm = () => {
    if (!canManage) {
      alert('Access denied: tutorials permission required.');
      return;
    }
    setEditingTut(null);
    setForm({
      title: '',
      description: '',
      youtube_link: '',
      is_published: true,
    });
    setFeedback({ type: '', message: '' });
    setShowForm(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const openEditForm = (tut) => {
    if (!canManage) {
      alert('Access denied: tutorials permission required.');
      return;
    }
    setEditingTut(tut);
    setForm({
      title: tut.title || '',
      description: tut.description || '',
      youtube_link: tut.youtube_link || '',
      is_published: tut.is_published !== false,
    });
    setFeedback({ type: '', message: '' });
    setShowForm(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingTut(null);
    setForm({
      title: '',
      description: '',
      youtube_link: '',
      is_published: true,
    });
    setFeedback({ type: '', message: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canManage) {
      setFeedback({ type: 'error', message: 'Access denied: tutorials permission required to manage video guides.' });
      return;
    }

    if (!form.title.trim() || !form.youtube_link.trim()) {
      setFeedback({ type: 'error', message: 'Please provide both tutorial title and a valid YouTube video URL.' });
      return;
    }

    try {
      setSaving(true);
      setFeedback({ type: '', message: '' });
      const method = editingTut ? 'PUT' : 'POST';
      const payload = editingTut ? { id: editingTut.id, ...form } : form;

      const res = await fetch('/api/marketing/developer/tutorials', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        closeForm();
        fetchTutorials();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to save tutorial.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Error saving tutorial.' });
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (tut) => {
    if (!canManage) {
      alert('Access denied: tutorials permission required.');
      return;
    }

    const nextStatus = !tut.is_published;
    setTogglingId(tut.id);
    try {
      const res = await fetch('/api/marketing/developer/tutorials', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: tut.id, is_published: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setTutorials((prev) =>
          prev.map((item) => (item.id === tut.id ? { ...item, is_published: nextStatus } : item))
        );
      } else {
        alert(data.error || 'Failed to update tutorial status.');
      }
    } catch (err) {
      alert(err.message || 'Failed to toggle status.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id, title) => {
    if (!canManage) {
      alert('Access denied: tutorials permission required.');
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete "${title || 'this tutorial'}"?`)) return;
    try {
      setDeletingId(id);
      const res = await fetch(`/api/marketing/developer/tutorials?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setTutorials((prev) => prev.filter((t) => t.id !== id));
        if (editingTut?.id === id) {
          closeForm();
        }
      } else {
        alert(data.error || 'Failed to delete tutorial.');
      }
    } catch (err) {
      alert(err.message || 'Network error.');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredTutorials = tutorials.filter((tut) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (tut.title || '').toLowerCase().includes(q) ||
      (tut.description || '').toLowerCase().includes(q) ||
      (tut.youtube_link || '').toLowerCase().includes(q)
    );
  });

  const previewId = extractYoutubeId(form.youtube_link);

  return (
    <div className="w-full space-y-4">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded p-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-slate-900">
              Video Tutorials Management
            </h1>
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded border bg-slate-100 text-slate-700 border-slate-200">
              Learning Center
            </span>
            {!canManage && (
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200">
                Read-Only
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Add YouTube video URLs to publish step-by-step guides on the public /tutorials portal.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchTutorials}
            className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-xs transition-colors cursor-pointer"
          >
            Refresh
          </button>
          {canManage && (
            <button
              type="button"
              onClick={showForm && !editingTut ? closeForm : openCreateForm}
              className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors cursor-pointer"
            >
              {showForm && !editingTut ? 'Close Form' : 'New Tutorial'}
            </button>
          )}
        </div>
      </div>

      {!canManage && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded p-3 text-xs">
          You are currently viewing video tutorials in read-only mode.
        </div>
      )}

      {/* Integrated In-Page Creation & Edit Form */}
      {showForm && (
        <div
          ref={formRef}
          className="bg-white border border-slate-200 rounded p-4 space-y-3"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">
              {editingTut ? `Edit Tutorial #${editingTut.id}` : 'Add Video Tutorial'}
            </h2>
            <button
              type="button"
              onClick={closeForm}
              className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
            >
              ✕
            </button>
          </div>

          {feedback.message && (
            <div
              className={`p-3 rounded text-xs font-normal ${
                feedback.type === 'error'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              <span>{feedback.message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tutorial Title <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Connecting Custom Domains & DNS Routing"
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  YouTube Video URL <span className="text-rose-600">*</span>
                </label>
                <input
                  type="url"
                  required
                  value={form.youtube_link}
                  onChange={(e) => setForm({ ...form, youtube_link: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>
            </div>

            {previewId && (
              <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded border border-slate-200">
                <div className="w-16 h-10 rounded overflow-hidden relative shrink-0 border border-slate-200 bg-black">
                  <Image
                    src={`https://img.youtube.com/vi/${previewId}/hqdefault.jpg`}
                    alt="Preview"
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 text-xs text-slate-600">
                  <span className="font-medium text-emerald-700">
                    YouTube Video Detected
                  </span>
                  <div className="text-[10px] text-slate-400 font-mono">ID: {previewId}</div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Description / Overview
              </label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief summary of what creators and users will learn..."
                className="w-full bg-white border border-slate-300 rounded p-3 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs text-slate-700 font-normal">
                  Publish Immediately
                </span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'Saving...' : editingTut ? 'Update Tutorial' : 'Publish Tutorial'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Main List Card */}
      <div className="bg-white border border-slate-200 rounded p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Search tutorials by title, description, or URL..."
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

          <div className="text-xs text-slate-500 font-medium shrink-0">
            Showing <span className="font-semibold text-slate-800">{filteredTutorials.length}</span> of {tutorials.length} tutorials
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase font-semibold">
                <th className="pb-2 w-12">#</th>
                <th className="pb-2 w-20">Preview</th>
                <th className="pb-2">Tutorial Title &amp; Details</th>
                <th className="pb-2 text-center w-24 hidden sm:table-cell">Status</th>
                <th className="pb-2 text-center w-24 hidden sm:table-cell">Date</th>
                <th className="pb-2 text-right w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center">
                    <LoadingScreen fullScreen={false} size="sm" label="Loading video guides..." />
                  </td>
                </tr>
              ) : filteredTutorials.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No tutorials found.
                  </td>
                </tr>
              ) : (
                filteredTutorials.map((tut) => {
                  const videoId = extractYoutubeId(tut.youtube_link);
                  const thumbUrl = videoId
                    ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
                    : null;
                  const formattedDate = tut.created_at
                    ? new Date(tut.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : '—';

                  return (
                    <tr key={tut.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 font-mono text-[11px] text-slate-400">
                        #{tut.id}
                      </td>

                      <td className="py-2.5">
                        <div className="w-14 h-9 rounded overflow-hidden border border-slate-200 bg-slate-900 flex items-center justify-center relative">
                          {thumbUrl ? (
                            <Image
                              src={thumbUrl}
                              alt=""
                              width={56}
                              height={36}
                              unoptimized
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-[9px] text-slate-400 font-mono">Video</span>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5">
                        <div className="space-y-0.5">
                          {canManage ? (
                            <button
                              type="button"
                              onClick={() => openEditForm(tut)}
                              className="text-xs font-semibold text-slate-900 hover:underline text-left cursor-pointer"
                            >
                              {tut.title}
                            </button>
                          ) : (
                            <span className="text-xs font-semibold text-slate-900">
                              {tut.title}
                            </span>
                          )}

                          {tut.description ? (
                            <p className="text-[11px] text-slate-500 line-clamp-1 max-w-md">
                              {tut.description}
                            </p>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">No description provided</span>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 text-center hidden sm:table-cell">
                        {canManage ? (
                          <button
                            type="button"
                            disabled={togglingId === tut.id}
                            onClick={() => handleTogglePublish(tut)}
                            className={`text-[9px] font-medium px-1.5 py-0.5 rounded border cursor-pointer transition-colors ${
                              tut.is_published
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            {tut.is_published ? 'Published' : 'Draft'}
                          </button>
                        ) : (
                          <span
                            className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${
                              tut.is_published
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {tut.is_published ? 'Published' : 'Draft'}
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 text-center text-xs text-slate-500 hidden sm:table-cell font-mono">
                        {formattedDate}
                      </td>

                      <td className="py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {tut.youtube_link && (
                            <a
                              href={tut.youtube_link}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium"
                            >
                              Watch
                            </a>
                          )}

                          {canManage && (
                            <>
                              <button
                                type="button"
                                onClick={() => openEditForm(tut)}
                                className="px-2 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                disabled={deletingId === tut.id}
                                onClick={() => handleDelete(tut.id, tut.title)}
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
