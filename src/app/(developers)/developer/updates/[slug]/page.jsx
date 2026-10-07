'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import LoadingScreen from 'src/component/common/LoadingScreen';

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
    return <LoadingScreen fullScreen={false} label="Loading product update..." />;
  }

  if (error || !update) {
    return (
      <div className="w-full bg-white border border-slate-200 rounded p-6 text-center space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Update Not Found</h2>
        <p className="text-xs text-slate-500">{error || 'The requested release could not be loaded.'}</p>
        <Link
          href="/developer/updates"
          className="inline-flex items-center px-3 py-1.5 rounded bg-slate-900 text-white text-xs font-medium"
        >
          Back to Updates
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded p-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
            <Link href="/developer" className="hover:text-slate-800">Dashboard</Link>
            <span>/</span>
            <Link href="/developer/updates" className="hover:text-slate-800">Updates</Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">{update.version}</span>
          </div>
          <h1 className="text-base font-semibold text-slate-900">
            Edit Release: {update.version} - &ldquo;{update.title}&rdquo;
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {update.slug && (
            <Link
              href={`/updates/${update.slug}`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium"
            >
              View Public
            </Link>
          )}

          <button
            type="button"
            disabled={deleting}
            onClick={handleDelete}
            className="px-3 py-1.5 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium disabled:opacity-50 cursor-pointer"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs">
          {successMsg}
        </div>
      )}

      {error && (
        <div className="p-3 rounded bg-rose-50 text-rose-700 border border-rose-200 text-xs">
          {error}
        </div>
      )}

      {/* Edit Form */}
      <div className="bg-white border border-slate-200 rounded p-4">
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Version Tag <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={editForm.version}
                onChange={(e) => setEditForm({ ...editForm, version: e.target.value })}
                placeholder="e.g. v2.4.0"
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-800"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Release Date
              </label>
              <input
                type="date"
                value={editForm.release_date}
                onChange={(e) => setEditForm({ ...editForm, release_date: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-800"
              />
            </div>

            <div className="sm:col-span-4 flex items-end pb-1">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={editForm.is_published}
                  onChange={(e) => setEditForm({ ...editForm, is_published: e.target.checked })}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs text-slate-700 font-normal">
                  Published publicly
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
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Release Summary
            </label>
            <textarea
              rows={3}
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded p-3 text-xs text-slate-900 focus:outline-none focus:border-slate-800 leading-relaxed font-sans"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Changelog / Detailed Release Notes
            </label>
            <textarea
              rows={6}
              value={editForm.changelog}
              onChange={(e) => setEditForm({ ...editForm, changelog: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded p-3 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-800 leading-relaxed"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Link
              href="/developer/updates"
              className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
