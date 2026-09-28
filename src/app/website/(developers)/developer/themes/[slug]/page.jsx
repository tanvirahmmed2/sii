'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BiArrowBack,
  BiTrash,
  BiLinkExternal,
  BiLoaderAlt,
  BiPalette,
} from 'react-icons/bi';
import ThemeForm from '@/components/developer/forms/ThemeForm';

export default function ThemeDetailPage({ params }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;
  const router = useRouter();

  const [theme, setTheme] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const fetchTheme = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/developer/themes/${encodeURIComponent(slug)}`);
      const data = await res.json();
      if (data.success && data.record) {
        setTheme(data.record);
      } else {
        setError(data.error || 'Theme not found');
      }
    } catch (err) {
      console.error('Error fetching theme details:', err);
      setError(err.message || 'Failed to load theme');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTheme();
  }, [slug]);

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete theme "${theme?.title || theme?.name}"?`)) {
      return;
    }

    try {
      setDeleting(true);
      const res = await fetch(`/api/developer/themes/${encodeURIComponent(slug)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        router.push('/developer/themes');
      } else {
        alert(data.error || 'Failed to delete theme');
      }
    } catch (err) {
      alert(err.message || 'Error deleting theme');
    } finally {
      setDeleting(false);
    }
  };

  const handleUpdateSuccess = (updated) => {
    if (updated?.slug && updated.slug !== slug) {
      router.push(`/developer/themes/${updated.slug}`);
    } else {
      fetchTheme();
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
        <BiLoaderAlt className="text-4xl animate-spin text-secondary" />
        <span className="text-xs font-semibold">Loading theme form...</span>
      </div>
    );
  }

  if (error || !theme) {
    return (
      <div className="max-w-2xl mx-auto my-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 mx-auto flex items-center justify-center text-2xl">
          <BiPalette />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Theme Not Found</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {error || `No theme matching slug "${slug}" exists in the catalog.`}
        </p>
        <Link
          href="/developer/themes"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold transition-all"
        >
          <BiArrowBack />
          <span>Return to Themes</span>
        </Link>
      </div>
    );
  }

  const themeTitle = theme.title || theme.name || 'Untitled Theme';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header and Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <Link href="/developer" className="hover:text-secondary">Dashboard</Link>
            <span>/</span>
            <Link href="/developer/themes" className="hover:text-secondary">Themes</Link>
            <span>/</span>
            <span className="text-slate-800 dark:text-slate-200 truncate max-w-[200px]">{theme.slug}</span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center text-xl shrink-0">
              <BiPalette />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                Edit Theme
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-lg">
                Manage design styling, preview images, and configurations for &quot;{themeTitle}&quot;
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/developer/themes"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition-all"
          >
            <BiArrowBack className="text-base" />
            <span>All Themes</span>
          </Link>

          {theme.link && (
            <a
              href={theme.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition-all"
            >
              <BiLinkExternal className="text-base" />
              <span>Live Demo</span>
            </a>
          )}

          <button
            type="button"
            disabled={deleting}
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/40 dark:hover:bg-rose-950/30 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            title="Delete theme permanently"
          >
            {deleting ? <BiLoaderAlt className="animate-spin text-base" /> : <BiTrash className="text-base" />}
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Direct Update Form */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs">
        <ThemeForm
          initialData={theme}
          onSuccess={handleUpdateSuccess}
          onCancel={() => router.push('/developer/themes')}
        />
      </div>
    </div>
  );
}
