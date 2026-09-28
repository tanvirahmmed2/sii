'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BiArrowBack,
  BiTrash,
  BiLinkExternal,
  BiBell,
  BiLoaderAlt,
  BiCheckCircle,
} from 'react-icons/bi';
import TiptapEditor from '@/components/ui/TiptapEditor';

export default function UpdateDetailPage({ params }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;
  const router = useRouter();

  const [update, setUpdate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
  });

  useEffect(() => {
    let isMounted = true;
    fetch(`/api/developer/updates/${encodeURIComponent(slug)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success && data.record) {
          setUpdate(data.record);
          setEditForm({
            title: data.record.title || '',
            description: data.record.description || '',
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
    try {
      setSaving(true);
      const res = await fetch(`/api/developer/updates/${encodeURIComponent(slug)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: update.id,
          title: editForm.title,
          description: editForm.description,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.record?.slug && data.record.slug !== slug) {
          router.replace(`/developer/updates/${data.record.slug}`);
        } else {
          setUpdate(data.record);
          alert('Update saved successfully');
        }
      } else {
        alert(data.error || 'Failed to update record');
      }
    } catch (err) {
      alert(err.message || 'Network error updating record');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete "${update?.title}"?`)) {
      return;
    }

    try {
      setDeleting(true);
      const res = await fetch(`/api/developer/updates/${encodeURIComponent(slug)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        router.push('/developer/updates');
      } else {
        alert(data.error || 'Failed to delete update');
      }
    } catch (err) {
      alert(err.message || 'Error deleting update');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
        <BiLoaderAlt className="text-4xl animate-spin text-secondary" />
        <span className="text-xs font-semibold">Loading product update form...</span>
      </div>
    );
  }

  if (error || !update) {
    return (
      <div className="max-w-2xl mx-auto my-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 mx-auto flex items-center justify-center text-2xl">
          <BiBell />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Update Not Found</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {error || `No product update found.`}
        </p>
        <Link
          href="/developer/updates"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold transition-all"
        >
          <BiArrowBack />
          <span>Return to Updates</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header and Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <Link href="/developer" className="hover:text-secondary">Dashboard</Link>
            <span>/</span>
            <Link href="/developer/updates" className="hover:text-secondary">Updates</Link>
            <span>/</span>
            <span className="text-slate-800 dark:text-slate-200 truncate max-w-[200px]">{update.title || 'Untitled'}</span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center text-xl shrink-0">
              <BiBell />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                Edit Product Update
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-lg">
                Update release notes, features, and fixes for &quot;{update.title}&quot;
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/developer/updates"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition-all"
          >
            <BiArrowBack className="text-base" />
            <span>All Updates</span>
          </Link>

          {update.slug && (
            <a
              href={`/updates/${update.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition-all"
            >
              <BiLinkExternal className="text-base" />
              <span>Public Page</span>
            </a>
          )}

          <button
            type="button"
            disabled={deleting}
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/40 dark:hover:bg-rose-950/30 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            title="Delete update permanently"
          >
            {deleting ? <BiLoaderAlt className="animate-spin text-base" /> : <BiTrash className="text-base" />}
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Direct Update Form */}
      <form onSubmit={handleSaveEdit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Update Title
          </label>
          <input
            type="text"
            required
            value={editForm.title}
            onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="e.g. Version 2.4 - New Analytics Dashboard & Fast Checkout"
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-secondary font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Description &amp; Changelog (TipTap Rich Editor)
          </label>
          <TiptapEditor
            value={editForm.description}
            onChange={(val) => setEditForm((prev) => ({ ...prev, description: val }))}
            placeholder="Write detailed changelog, feature highlights, bug fixes, and upgrade notes..."
            minHeight="260px"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Link
            href="/developer/updates"
            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition-all"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-secondary text-white text-xs font-bold hover:bg-secondary/90 transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            {saving ? <BiLoaderAlt className="animate-spin text-base" /> : <BiCheckCircle className="text-base" />}
            <span>Save Changes</span>
          </button>
        </div>
      </form>
    </div>
  );
}
