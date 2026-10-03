'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BiArrowBack,
  BiSave,
  BiTrash,
  BiLoaderAlt,
  BiWorld,
  BiTag,
  BiCalendar,
} from 'react-icons/bi';

export default function UpdateDetailPage({ params }) {
  const resolvedParams = use(params);
  const slug = resolvedParams?.slug;
  const router = useRouter();

  const [update, setUpdate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [editForm, setEditForm] = useState({
    version: '',
    title: '',
    release_date: new Date().toISOString().split('T')[0],
    description: '',
    changelog: '',
    is_published: true,
  });

  useEffect(() => {
    if (!slug) return;
    let isMounted = true;
    fetch(`/api/marketing/developer/updates/${encodeURIComponent(slug)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success && (data.record || data.update)) {
          const rec = data.record || data.update;
          setUpdate(rec);
          const dateFormatted = rec.release_date
            ? new Date(rec.release_date).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0];

          setEditForm({
            version: rec.version || '',
            title: rec.title || '',
            release_date: dateFormatted,
            description: rec.description || '',
            changelog: rec.changelog || '',
            is_published: rec.is_published !== false,
          });
        } else {
          setError(data.error || 'Update not found');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Error fetching update:', err);
        setError(err.message || 'Failed to load update');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setError('');
    try {
      setSaving(true);
      const res = await fetch(`/api/marketing/developer/updates/${encodeURIComponent(slug)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: update.id,
          version: editForm.version.trim(),
          title: editForm.title.trim(),
          release_date: editForm.release_date || null,
          description: editForm.description.trim(),
          changelog: editForm.changelog.trim(),
          is_published: Boolean(editForm.is_published),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Update saved successfully!');
        if (data.record?.slug && data.record.slug !== slug) {
          router.replace(`/developer/updates/${data.record.slug}`);
        } else if (data.record) {
          setUpdate(data.record);
        }
      } else {
        setError(data.error || 'Failed to update record');
      }
    } catch (err) {
      setError(err.message || 'Network error updating record');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete "${update?.version} - ${update?.title}"?`)) {
      return;
    }

    try {
      setDeleting(true);
      const res = await fetch(`/api/marketing/developer/updates/${encodeURIComponent(slug)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        router.push('/developer/updates');
      } else {
        alert(data.error || 'Failed to delete update');
      }
    } catch (err) {
      alert(err.message || 'Network error deleting update');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
        <BiLoaderAlt className="animate-spin text-2xl text-secondary" />
        <span className="text-xs font-normal">Loading product update...</span>
      </div>
    );
  }

  if (error || !update) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Update Not Found</h2>
        <p className="text-xs text-slate-500">{error || 'The requested release could not be loaded.'}</p>
        <Link
          href="/developer/updates"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-secondary text-white text-xs font-medium"
        >
          <BiArrowBack />
          <span>Back to Updates</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 sm:p-6 shadow-xs">
        <div className="space-y-1">
          <Link
            href="/developer/updates"
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium mb-1"
          >
            <BiArrowBack /> Back to Updates Directory
          </Link>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Edit Release: {update.version} - &ldquo;{update.title}&rdquo;
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {update.slug && (
            <Link
              href={`/updates/${update.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium"
            >
              <BiWorld />
              <span>View Public</span>
            </Link>
          )}

          <button
            type="button"
            disabled={deleting}
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium disabled:opacity-50 cursor-pointer"
          >
            <BiTrash />
            <span>{deleting ? 'Deleting...' : 'Delete'}</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs">
          {successMsg}
        </div>
      )}

      {/* Edit Form */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 shadow-xs">
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-4">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Version Tag <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <BiTag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={editForm.version}
                  onChange={(e) => setEditForm({ ...editForm, version: e.target.value })}
                  placeholder="e.g. v2.4.0"
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded pl-8 pr-3 py-2 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-secondary focus:bg-white dark:focus:bg-slate-900"
                />
              </div>
            </div>

            <div className="sm:col-span-4">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Release Date
              </label>
              <div className="relative">
                <BiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={editForm.release_date}
                  onChange={(e) => setEditForm({ ...editForm, release_date: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded pl-8 pr-3 py-2 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-secondary focus:bg-white dark:focus:bg-slate-900"
                />
              </div>
            </div>

            <div className="sm:col-span-4 flex items-end pb-1.5">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={editForm.is_published}
                  onChange={(e) => setEditForm({ ...editForm, is_published: e.target.checked })}
                  className="rounded border-slate-300 dark:border-slate-700 text-secondary focus:ring-secondary w-4 h-4 cursor-pointer"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300 font-normal">
                  Published publicly
                </span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Release Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-secondary focus:bg-white dark:focus:bg-slate-900"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Release Summary
            </label>
            <textarea
              rows={3}
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-secondary focus:bg-white dark:focus:bg-slate-900 leading-relaxed font-sans"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Changelog / Detailed Release Notes
            </label>
            <textarea
              rows={6}
              value={editForm.changelog}
              onChange={(e) => setEditForm({ ...editForm, changelog: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-secondary focus:bg-white dark:focus:bg-slate-900 leading-relaxed"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Link
              href="/developer/updates"
              className="px-4 py-2 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-normal hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded bg-secondary hover:bg-secondary-dark text-white text-xs font-medium shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <BiSave className="text-base" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
