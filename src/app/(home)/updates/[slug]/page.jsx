'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { SITE_NAME } from 'src/lib/database/secret';
import {
  BiArrowBack,
  BiCalendar,
  BiBell,
  BiCheckCircle,
  BiLoaderAlt,
  BiTag,
  BiListCheck,
} from 'react-icons/bi';

export default function SingleUpdatePage({ params }) {
  const unwrappedParams = use(params);
  const slug = unwrappedParams?.slug;

  const [update, setUpdate] = useState(null);
  const [recentUpdates, setRecentUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;

    const fetchUpdate = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/marketing/updates/${encodeURIComponent(slug)}`);
        const data = res.ok ? await res.json() : { success: false };
        if (data.success && data.update) {
          setUpdate(data.update);
          setRecentUpdates(data.recentUpdates || []);
        } else {
          setError(data.error || 'Update not found.');
        }
      } catch (err) {
        setError(err.message || 'Failed to load update.');
      } finally {
        setLoading(false);
      }
    };

    fetchUpdate();
  }, [slug]);

  if (loading) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center gap-3 text-slate-400">
        <BiLoaderAlt className="animate-spin text-4xl text-secondary" />
        <p className="text-xs font-semibold">Loading product update...</p>
      </div>
    );
  }

  if (error || !update) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center text-3xl">
          <BiBell />
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Update Not Found</h2>
        <p className="text-xs text-slate-500 max-w-sm">
          {error || 'The requested product announcement could not be found.'}
        </p>
        <Link
          href="/updates"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
        >
          <BiArrowBack />
          <span>Back to All Updates</span>
        </Link>
      </div>
    );
  }

  const releaseDateVal = update.release_date || update.created_at;
  const formattedDate = new Date(releaseDateVal).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Navigation Breadcrumb (No slug!) */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <Link
            href="/updates"
            className="inline-flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300 hover:text-secondary dark:hover:text-secondary transition-colors"
          >
            <BiArrowBack className="text-base" />
            <span>Back to all updates</span>
          </Link>

          <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
            <span>Updates</span>
            <span>/</span>
            <span className="text-secondary font-bold">{update.version || 'Release'}</span>
          </div>
        </div>

        {/* Article Main Card */}
        <article className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xs space-y-8">
          {/* Header Info */}
          <div className="space-y-4 border-b border-slate-100 dark:border-slate-800 pb-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-secondary/10 text-secondary text-xs font-mono font-bold border border-secondary/20">
                <BiTag className="text-sm" /> {update.version || 'v1.0.0'}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <BiCalendar className="text-sm text-slate-400" />
                {formattedDate}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
              {update.title}
            </h1>
          </div>

          {/* Description Content */}
          {update.description && (
            <div className="prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-sans">
              {update.description}
            </div>
          )}

          {/* Detailed Changelog Section */}
          {update.changelog && (
            <div className="space-y-3 pt-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BiListCheck className="text-secondary text-xl" />
                <span>Changelog &amp; Detailed Notes</span>
              </h3>
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-5 sm:p-6 text-xs sm:text-sm font-mono text-slate-700 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                {update.changelog}
              </div>
            </div>
          )}

          {/* Footer Callout */}
          <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <BiCheckCircle className="text-secondary text-base" />
              <span>Published by {SITE_NAME} Platform Architecture Team</span>
            </div>

            <Link
              href="/updates"
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold transition-colors"
            >
              View All Releases
            </Link>
          </div>
        </article>

        {/* Other Recent Updates */}
        {recentUpdates.length > 0 && (
          <div className="space-y-4 pt-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Recent Announcements
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {recentUpdates.map((rec) => (
                <Link
                  key={rec.id}
                  href={`/updates/${rec.slug || rec.id}`}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs hover:border-secondary/40 dark:hover:border-secondary/40 hover:shadow-sm transition-all block group"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span className="font-mono text-secondary font-bold">{rec.version || 'Release'}</span>
                    <span>
                      {new Date(rec.release_date || rec.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-secondary transition-colors line-clamp-2">
                    {rec.title}
                  </h4>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
