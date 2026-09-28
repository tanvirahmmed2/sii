'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  BiVideo,
  BiPlus,
  BiTrash,
  BiEdit,
  BiRefresh,
  BiPlayCircle,
  BiUser,
  BiSearch,
  BiX,
  BiLinkExternal,
  BiLoaderAlt,
  BiCheckCircle,
} from 'react-icons/bi';

function extractYoutubeId(url) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

export default function DeveloperTutorialsPage() {
  const [tutorials, setTutorials] = useState([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  // In-page creation / edit form state (NO POPUP MODAL)
  const [showForm, setShowForm] = useState(false);
  const [editingTut, setEditingTut] = useState(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    youtube_link: '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const formRef = useRef(null);

  const fetchTutorials = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/developer/tutorials');
      const data = await res.json();
      if (data.success) {
        setTutorials(data.tutorials || []);
        setCanManage(Boolean(data.canManage));
      }
    } catch (err) {
      console.error('Failed to load tutorials:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetch('/api/developer/tutorials')
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data.success) {
          setTutorials(data.tutorials || []);
          setCanManage(Boolean(data.canManage));
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
    setEditingTut(null);
    setForm({ title: '', description: '', youtube_link: '' });
    setFormError('');
    setShowForm(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const openEditForm = (tut) => {
    setEditingTut(tut);
    setForm({
      title: tut.title,
      description: tut.description || '',
      youtube_link: tut.youtube_link,
    });
    setFormError('');
    setShowForm(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingTut(null);
    setForm({ title: '', description: '', youtube_link: '' });
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.youtube_link.trim()) {
      setFormError('Please provide both tutorial title and a valid YouTube link.');
      return;
    }

    try {
      setSaving(true);
      setFormError('');
      const url = editingTut
        ? `/api/developer/tutorials`
        : '/api/developer/tutorials';
      const method = editingTut ? 'PUT' : 'POST';
      const payload = editingTut
        ? { id: editingTut.id, ...form }
        : form;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        closeForm();
        fetchTutorials();
      } else {
        setFormError(data.error || 'Failed to save tutorial');
      }
    } catch (err) {
      setFormError(err.message || 'Error saving tutorial');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!confirm(`Are you sure you want to permanently delete "${title || 'this tutorial'}"?`)) return;
    try {
      setDeletingId(id);
      const res = await fetch(`/api/developer/tutorials?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setTutorials((prev) => prev.filter((t) => t.id !== id));
        if (editingTut?.id === id) {
          closeForm();
        }
      } else {
        alert(data.error || 'Failed to delete');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredTutorials = tutorials.filter((tut) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      tut.title?.toLowerCase().includes(q) ||
      tut.description?.toLowerCase().includes(q) ||
      tut.creator_name?.toLowerCase().includes(q)
    );
  });

  const previewId = extractYoutubeId(form.youtube_link);

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs w-full max-w-full overflow-hidden">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight truncate">
              Video Tutorials Management
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20 shrink-0">
              Learning Center
            </span>
          </div>
          <p className="text-xs text-slate-500 line-clamp-2">
            Create and maintain step-by-step video guides published to the public /tutorials portal.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={fetchTutorials}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Refresh tutorials"
            aria-label="Refresh"
          >
            <BiRefresh className="text-lg" />
          </button>
          {canManage && (
            <button
              type="button"
              onClick={showForm && !editingTut ? closeForm : openCreateForm}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs bg-secondary hover:bg-secondary-dark text-white cursor-pointer shrink-0"
              title="Add New Tutorial"
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

      {/* ========================================================================= */}
      {/* Integrated In-Page Creation & Edit Form (NO POPUP MODAL) */}
      {/* ========================================================================= */}
      {showForm && (
        <div
          ref={formRef}
          className="bg-white border-2 border-secondary/30 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4 animate-fade-in"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BiVideo className="text-secondary text-lg" />
              <span>{editingTut ? `Edit Tutorial #${editingTut.id}` : 'Create New Video Tutorial'}</span>
            </h3>
            <button
              type="button"
              onClick={closeForm}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tutorial Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Connecting Custom Domains & DNS Setup"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-secondary focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  YouTube Video Link <span className="text-rose-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  value={form.youtube_link}
                  onChange={(e) => setForm({ ...form, youtube_link: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-secondary focus:bg-white"
                />
              </div>
            </div>

            {/* Live Video Preview if valid YouTube URL is typed */}
            {previewId && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="w-16 h-10 rounded-lg overflow-hidden relative shrink-0 border border-slate-300 bg-black">
                  <Image
                    src={`https://img.youtube.com/vi/${previewId}/hqdefault.jpg`}
                    alt="Preview"
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 text-xs text-slate-600">
                  <span className="font-semibold text-emerald-600 flex items-center gap-1">
                    <BiCheckCircle /> Valid YouTube Video Detected
                  </span>
                  <span className="text-[11px] text-slate-400 truncate block">ID: {previewId}</span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Description / Overview
              </label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief summary of what creators will learn in this video guide..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-secondary focus:bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={closeForm}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-secondary hover:bg-secondary-dark text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  <>
                    <BiLoaderAlt className="animate-spin text-sm" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <BiCheckCircle className="text-base" />
                    <span>{editingTut ? 'Update Tutorial' : 'Publish Tutorial'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main List Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden w-full max-w-full">
        {/* Search Bar */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50 w-full">
          <div className="relative w-full sm:w-80">
            <BiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
            <input
              type="text"
              placeholder="Search tutorials by title, description, or creator..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl pl-8.5 pr-8 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                title="Clear search"
              >
                <BiX className="text-sm" />
              </button>
            )}
          </div>

          <div className="text-xs text-slate-500 font-medium shrink-0">
            Showing <span className="font-bold text-slate-800">{filteredTutorials.length}</span> of {tutorials.length} tutorials
          </div>
        </div>

        {/* Responsive View List (Strictly zero horizontal overflow) */}
        <div className="w-full max-w-full overflow-hidden">
          {/* Header Row */}
          <div className="hidden md:flex items-center gap-3 px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
            <span className="w-8 shrink-0">#</span>
            <span className="w-16 shrink-0">Preview</span>
            <span className="flex-1 min-w-0">Tutorial Title &amp; Details</span>
            <span className="w-32 shrink-0 hidden lg:block">Creator</span>
            <span className="w-24 shrink-0 text-center hidden sm:block">Date</span>
            <span className="w-24 shrink-0 text-right">Actions</span>
          </div>

          {/* List Content */}
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
              <BiLoaderAlt className="animate-spin text-2xl text-secondary" />
              <span className="text-xs font-semibold">Loading video guides...</span>
            </div>
          ) : filteredTutorials.length === 0 ? (
            <div className="py-16 px-4 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center text-2xl mx-auto">
                <BiVideo />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Tutorials Found</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {searchTerm
                  ? `No tutorials matched "${searchTerm}". Try a different keyword.`
                  : 'Start publishing video guides for platform users.'}
              </p>
              {canManage && !searchTerm && (
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-secondary text-white text-xs font-bold hover:bg-secondary-dark transition-colors cursor-pointer mt-2"
                >
                  <BiPlus />
                  <span>Create First Tutorial</span>
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
                    <span className="w-8 shrink-0 font-mono font-bold text-[11px] text-slate-400 hidden md:block">
                      #{tut.id}
                    </span>

                    {/* Video Thumbnail */}
                    <div className="w-12 h-9 sm:w-16 sm:h-11 rounded-lg overflow-hidden border border-slate-200 bg-slate-900 shrink-0 relative flex items-center justify-center group">
                      {thumbUrl ? (
                        <Image
                          src={thumbUrl}
                          alt={tut.title || 'Video preview'}
                          width={96}
                          height={66}
                          unoptimized
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <BiVideo className="text-slate-500 text-lg" />
                      )}
                      <div className="absolute inset-0 bg-slate-950/25 flex items-center justify-center group-hover:bg-slate-950/40 transition-colors">
                        <BiPlayCircle className="text-white/90 text-sm sm:text-base drop-shadow-sm" />
                      </div>
                    </div>

                    {/* Title & Details */}
                    <div className="flex-1 min-w-0 pr-1 space-y-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {canManage ? (
                          <button
                            type="button"
                            onClick={() => openEditForm(tut)}
                            className="text-xs sm:text-sm font-bold text-slate-900 hover:text-secondary truncate block tracking-tight text-left cursor-pointer"
                            title={tut.title}
                          >
                            {tut.title}
                          </button>
                        ) : (
                          <span
                            className="text-xs sm:text-sm font-bold text-slate-900 truncate block tracking-tight"
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

                      {/* Small screen metadata disclosure */}
                      <div className="flex items-center gap-2 pt-0.5 text-[10px] text-slate-400 sm:hidden">
                        {tut.creator_name && (
                          <span className="flex items-center gap-0.5 truncate">
                            <BiUser className="shrink-0" />
                            {tut.creator_name}
                          </span>
                        )}
                        <span>•</span>
                        <span>{formattedDate}</span>
                      </div>
                    </div>

                    {/* Creator column (Large screens) */}
                    <div className="w-32 shrink-0 hidden lg:flex items-center gap-1.5 text-xs text-slate-600 min-w-0">
                      <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400 text-xs">
                        <BiUser />
                      </div>
                      <span className="truncate text-[11px] font-medium">
                        {tut.creator_name || 'Platform Team'}
                      </span>
                    </div>

                    {/* Date column (Tablet/Desktop) */}
                    <div className="w-24 shrink-0 text-center hidden sm:block">
                      <span className="text-[11px] text-slate-400 whitespace-nowrap">
                        {formattedDate}
                      </span>
                    </div>

                    {/* Actions column */}
                    <div className="w-24 shrink-0 flex items-center justify-end gap-1">
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
                            <BiEdit className="text-sm" />
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === tut.id}
                            onClick={() => handleDelete(tut.id, tut.title)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                            title="Delete tutorial"
                          >
                            {deletingId === tut.id ? (
                              <BiLoaderAlt className="animate-spin text-sm" />
                            ) : (
                              <BiTrash className="text-sm" />
                            )}
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
