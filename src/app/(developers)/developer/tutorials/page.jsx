'use client';

import { useState, useEffect, useContext, useRef } from 'react';
import Image from 'next/image';
import { Context } from 'src/component/helper/Context';
import {
  BiVideo,
  BiPlayCircle,
  BiPlus,
  BiEditAlt,
  BiTrash,
  BiRefresh,
  BiSearch,
  BiX,
  BiCheckCircle,
  BiInfoCircle,
  BiLoaderAlt,
  BiLinkExternal,
} from 'react-icons/bi';

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

  // In-page creation / edit form state (NO POPUP MODAL)
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
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded p-5 sm:p-6 shadow-xs w-full max-w-full overflow-hidden">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight truncate">
              Video Tutorials Management
            </h1>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-secondary/10 text-secondary border border-secondary/20 shrink-0">
              Learning Center
            </span>
            {!canManage && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                <BiInfoCircle />
                <span>Read-Only</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 line-clamp-2">
            Add YouTube video URLs to publish step-by-step guides on the public /tutorials portal.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={fetchTutorials}
            className="flex items-center gap-1 px-3 py-2 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium transition-colors cursor-pointer"
            title="Refresh tutorials"
          >
            <BiRefresh className={`text-base ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          {canManage && (
            <button
              type="button"
              onClick={showForm && !editingTut ? closeForm : openCreateForm}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded text-xs font-semibold transition-all shadow-xs bg-secondary hover:bg-secondary-dark text-white cursor-pointer shrink-0"
            >
              {showForm && !editingTut ? (
                <>
                  <BiX className="text-base" />
                  <span>Close Form</span>
                </>
              ) : (
                <>
                  <BiPlus className="text-base" />
                  <span>New Tutorial</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Permission Warning if read-only */}
      {!canManage && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded p-3.5 flex items-center gap-2.5 text-xs">
          <BiInfoCircle className="text-base shrink-0" />
          <span>
            You are currently viewing video tutorials in read-only mode. Only <strong>Admin</strong>, <strong>Manager</strong>, or users with <strong>tutorials</strong> permissions can publish or edit.
          </span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Integrated In-Page Creation & Edit Form (NO POPUP MODAL) */}
      {/* ========================================================================= */}
      {showForm && (
        <div
          ref={formRef}
          className="bg-white border-2 border-secondary/30 rounded p-5 sm:p-6 shadow-sm space-y-4 animate-fade-in"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <BiVideo className="text-secondary text-lg" />
              <span>{editingTut ? `Edit Tutorial #${editingTut.id}` : 'Add Video Tutorial'}</span>
            </h3>
            <button
              type="button"
              onClick={closeForm}
              className="text-xs font-medium text-slate-400 hover:text-slate-600 flex items-center gap-1 cursor-pointer"
            >
              <BiX className="text-sm" /> Cancel
            </button>
          </div>

          {feedback.message && (
            <div
              className={`p-3 rounded text-xs font-medium flex items-center gap-2 ${
                feedback.type === 'error'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              {feedback.type === 'error' ? <BiInfoCircle className="text-sm shrink-0" /> : <BiCheckCircle className="text-sm shrink-0" />}
              <span>{feedback.message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tutorial Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Connecting Custom Domains & DNS Routing"
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3.5 py-2 text-xs focus:outline-none focus:border-secondary focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  YouTube Video URL <span className="text-rose-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  value={form.youtube_link}
                  onChange={(e) => setForm({ ...form, youtube_link: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3.5 py-2 text-xs focus:outline-none focus:border-secondary focus:bg-white transition-colors"
                />
              </div>
            </div>

            {/* Live Video Preview if valid YouTube URL is typed */}
            {previewId && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="w-20 h-12 rounded-lg overflow-hidden relative shrink-0 border border-slate-300 bg-black">
                  <Image
                    src={`https://img.youtube.com/vi/${previewId}/hqdefault.jpg`}
                    alt="Video thumbnail preview"
                    fill
                    unoptimized
                    className="object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <BiPlayCircle className="text-white text-xl" />
                  </div>
                </div>
                <div className="min-w-0 text-xs text-slate-600">
                  <span className="font-semibold text-emerald-600 flex items-center gap-1">
                    <BiCheckCircle className="text-sm" /> YouTube Video Detected
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">Video ID: {previewId}</span>
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
                placeholder="Brief summary of what creators and users will learn in this video guide..."
                className="w-full bg-slate-50 border border-slate-300 rounded px-3.5 py-2 text-xs focus:outline-none focus:border-secondary focus:bg-white transition-colors"
              />
            </div>

            <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-100 flex-wrap">
              <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded cursor-pointer hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                  className="accent-secondary h-4 w-4"
                />
                <span className="text-xs font-semibold text-slate-700">
                  Publish Immediately
                </span>
              </label>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-4 py-2 rounded border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 px-5 py-2 rounded bg-secondary hover:bg-secondary-dark text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {saving ? (
                    <>
                      <BiLoaderAlt className="animate-spin text-sm" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <BiCheckCircle className="text-sm" />
                      <span>{editingTut ? 'Update Tutorial' : 'Publish Tutorial'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Main List Card */}
      <div className="bg-white border border-slate-200 rounded shadow-xs overflow-hidden w-full max-w-full">
        {/* Search Bar */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50 w-full">
          <div className="relative w-full sm:w-80">
            <BiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            <input
              type="text"
              placeholder="Search tutorials by title, description, or URL..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded pl-8 pr-8 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-secondary transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                title="Clear search"
              >
                <BiX className="text-xs" />
              </button>
            )}
          </div>

          <div className="text-xs text-slate-500 font-medium shrink-0">
            Showing <span className="font-semibold text-slate-800">{filteredTutorials.length}</span> of {tutorials.length} tutorials
          </div>
        </div>

        {/* Responsive View List */}
        <div className="w-full max-w-full overflow-hidden">
          {/* Header Row */}
          <div className="hidden md:flex items-center gap-3 px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 text-[10px] font-semibold uppercase tracking-wider text-slate-400 select-none">
            <span className="w-8 shrink-0">#</span>
            <span className="w-20 shrink-0">Preview</span>
            <span className="flex-1 min-w-0">Tutorial Title &amp; Details</span>
            <span className="w-24 shrink-0 text-center hidden sm:block">Status</span>
            <span className="w-24 shrink-0 text-center hidden sm:block">Date</span>
            <span className="w-28 shrink-0 text-right">Actions</span>
          </div>

          {/* List Content */}
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
              <BiLoaderAlt className="animate-spin text-2xl text-secondary" />
              <span className="text-xs font-normal">Loading video guides...</span>
            </div>
          ) : filteredTutorials.length === 0 ? (
            <div className="py-16 px-4 text-center space-y-2">
              <div className="w-12 h-12 rounded bg-slate-100 text-slate-400 flex items-center justify-center text-2xl mx-auto">
                <BiVideo />
              </div>
              <h3 className="text-sm font-semibold text-slate-800">No Tutorials Found</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {searchTerm
                  ? `No tutorials matched "${searchTerm}". Try a different search term.`
                  : 'Start publishing YouTube video guides for platform creators.'}
              </p>
              {canManage && !searchTerm && (
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded bg-secondary text-white text-xs font-semibold hover:bg-secondary-dark transition-colors cursor-pointer mt-2"
                >
                  <BiPlus className="text-sm" />
                  <span>Publish First Tutorial</span>
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 w-full">
              {filteredTutorials.map((tut) => {
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
                  <div
                    key={tut.id}
                    className="p-3 sm:p-4 hover:bg-slate-50/70 transition-colors flex items-center gap-2.5 sm:gap-3 w-full min-w-0 overflow-hidden"
                  >
                    {/* ID */}
                    <span className="w-8 shrink-0 font-mono font-medium text-[11px] text-slate-400 hidden md:block">
                      #{tut.id}
                    </span>

                    {/* Video Thumbnail */}
                    <div className="w-16 h-11 sm:w-20 sm:h-12 rounded-lg overflow-hidden border border-slate-200 bg-slate-900 shrink-0 relative flex items-center justify-center group shadow-2xs">
                      {thumbUrl ? (
                        <Image
                          src={thumbUrl}
                          alt={tut.title || 'Video preview'}
                          width={96}
                          height={66}
                          unoptimized
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : null}
                      <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                        <BiPlayCircle className="text-white text-xl drop-shadow-md group-hover:scale-110 transition-transform" />
                      </div>
                    </div>

                    {/* Title & Details */}
                    <div className="flex-1 min-w-0 pr-1 space-y-1">
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        {canManage ? (
                          <button
                            type="button"
                            onClick={() => openEditForm(tut)}
                            className="text-xs sm:text-sm font-semibold text-slate-900 hover:text-secondary truncate block tracking-tight text-left cursor-pointer"
                            title={tut.title}
                          >
                            {tut.title}
                          </button>
                        ) : (
                          <span
                            className="text-xs sm:text-sm font-semibold text-slate-900 truncate block tracking-tight"
                            title={tut.title}
                          >
                            {tut.title}
                          </span>
                        )}
                      </div>

                      {tut.description ? (
                        <p className="text-[11px] text-slate-500 truncate block leading-normal">
                          {tut.description}
                        </p>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic block">No description provided</span>
                      )}

                      {/* Small screen date */}
                      <div className="text-[10px] text-slate-400 sm:hidden pt-0.5">
                        {formattedDate}
                      </div>
                    </div>

                    {/* Publish Status Toggle */}
                    <div className="w-24 shrink-0 text-center hidden sm:block">
                      {canManage ? (
                        <button
                          type="button"
                          disabled={togglingId === tut.id}
                          onClick={() => handleTogglePublish(tut)}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border cursor-pointer transition-colors ${
                            tut.is_published
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                          }`}
                          title="Click to toggle publish status"
                        >
                          {togglingId === tut.id ? (
                            <BiLoaderAlt className="animate-spin text-xs" />
                          ) : (
                            <span className={`w-1.5 h-1.5 rounded-full ${tut.is_published ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          )}
                          <span>{tut.is_published ? 'Published' : 'Draft'}</span>
                        </button>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                            tut.is_published
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${tut.is_published ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          <span>{tut.is_published ? 'Published' : 'Draft'}</span>
                        </span>
                      )}
                    </div>

                    {/* Date column (Tablet/Desktop) */}
                    <div className="w-24 shrink-0 text-center hidden sm:block">
                      <span className="text-[11px] text-slate-400 whitespace-nowrap">
                        {formattedDate}
                      </span>
                    </div>

                    {/* Actions column */}
                    <div className="w-28 shrink-0 flex items-center justify-end gap-1.5">
                      {tut.youtube_link && (
                        <a
                          href={tut.youtube_link}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-secondary hover:bg-slate-50 transition-colors"
                          title="Watch video on YouTube"
                        >
                          <BiLinkExternal className="text-sm" />
                        </a>
                      )}

                      {canManage && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEditForm(tut)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-secondary hover:bg-slate-50 transition-colors cursor-pointer"
                            title="Edit tutorial in form"
                          >
                            <BiEditAlt className="text-sm" />
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === tut.id}
                            onClick={() => handleDelete(tut.id, tut.title)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                            title="Delete tutorial"
                          >
                            <BiTrash className="text-sm" />
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
