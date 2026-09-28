'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BiArrowBack,
  BiTrash,
  BiLinkExternal,
  BiLoaderAlt,
  BiGridAlt,
} from 'react-icons/bi';
import AppUpdateForm from '@/components/developer/forms/AppUpdateForm';

export default function AppDetailPage({ params }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;
  const router = useRouter();

  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const fetchApp = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/developer/apps/${encodeURIComponent(slug)}`);
      const data = await res.json();
      if (data.success && data.app) {
        setApp(data.app);
      } else {
        setError(data.error || 'App not found');
      }
    } catch (err) {
      console.error('Error fetching app details:', err);
      setError(err.message || 'Failed to load app');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApp();
  }, [slug]);

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete "${app?.title}"?`)) {
      return;
    }

    try {
      setDeleting(true);
      const res = await fetch(`/api/developer/apps/${encodeURIComponent(slug)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        router.push('/developer/apps');
      } else {
        alert(data.error || 'Failed to delete application');
      }
    } catch (err) {
      alert(err.message || 'Error deleting application');
    } finally {
      setDeleting(false);
    }
  };

  const handleUpdateSuccess = (updated) => {
    if (updated?.slug && updated.slug !== slug) {
      router.push(`/developer/apps/${updated.slug}`);
    } else {
      fetchApp();
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
        <BiLoaderAlt className="text-4xl animate-spin text-secondary" />
        <span className="text-xs font-semibold">Loading application form...</span>
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className="max-w-2xl mx-auto my-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 mx-auto flex items-center justify-center text-2xl">
          <BiGridAlt />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">App Not Found</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {error || `No application matching slug "${slug}" exists in the ecosystem.`}
        </p>
        <Link
          href="/developer/apps"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold transition-all"
        >
          <BiArrowBack />
          <span>Return to Apps</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* Header and Breadcrumbs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <Link href="/developer" className="hover:text-secondary">Dashboard</Link>
            <span>/</span>
            <Link href="/developer/apps" className="hover:text-secondary">Apps</Link>
            <span>/</span>
            <span className="text-slate-800 dark:text-slate-200 truncate max-w-50">{app.slug}</span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center text-xl shrink-0">
              <BiGridAlt />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                Edit Application
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-lg">
                Manage ecosystem parameters, descriptions, and gallery images for &quot;{app.title}&quot;
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/developer/apps"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition-all"
          >
            <BiArrowBack className="text-base" />
            <span>All Apps</span>
          </Link>

          {app.slug && (
            <a
              href={`/apps/${app.slug}`}
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
            title="Delete application permanently"
          >
            {deleting ? <BiLoaderAlt className="animate-spin text-base" /> : <BiTrash className="text-base" />}
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Direct Update Form Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs">
        <AppUpdateForm
          app={app}
          onSuccess={handleUpdateSuccess}
          onCancel={() => router.push('/developer/apps')}
        />
      </div>
    </div>
  );
}
