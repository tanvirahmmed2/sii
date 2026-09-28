'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { SITE_NAME } from '@/lib/db/secret';
import {
  BiArrowBack,
  BiCalendar,
  BiBell,
  BiCheckCircle,
  BiLoaderAlt,
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
        const res = await fetch(`/api/updates?slug=${encodeURIComponent(slug)}`);
        const data = await res.json();
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
        <BiLoaderAlt className="animate-spin text-4xl text-emerald-600" />
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
        <h2 className="text-xl font-bold text-slate-800">Update Not Found</h2>
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

  const formattedDate = new Date(update.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <Link
            href="/updates"
            className="inline-flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
          >
            <BiArrowBack className="text-base" />
            <span>Back to all updates</span>
          </Link>

          <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
            <span>Updates</span>
            <span>/</span>
            <span className="text-slate-600 dark:text-slate-400 truncate max-w-[150px]">{update.slug}</span>
          </div>
        </div>

        {/* Article Main Card */}
        <article className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xs space-y-8">
          {/* Header Info */}
          <div className="space-y-4 border-b border-slate-100 dark:border-slate-800 pb-8">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                <BiBell className="text-sm" /> Product Update
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

          {/* Description Content with TipTap Rich Typography */}
          <div
            className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-slate-900 dark:prose-headings:text-white prose-p:text-slate-600 dark:prose-p:text-slate-300 prose-p:leading-relaxed prose-li:text-slate-600 dark:prose-li:text-slate-300 prose-code:text-emerald-700 dark:prose-code:text-emerald-400 prose-code:bg-slate-100 dark:prose-code:bg-slate-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-pre:rounded-xl prose-blockquote:border-emerald-600 prose-blockquote:text-slate-700 dark:prose-blockquote:text-slate-300"
            dangerouslySetInnerHTML={{ __html: update.description }}
          />

          {/* Footer Callout */}
          <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <BiCheckCircle className="text-emerald-600 text-base" />
              <span>Published by {SITE_NAME} Engineering Team</span>
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
                  href={`/updates/${rec.slug}`}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-sm transition-all block group"
                >
                  <p className="text-[11px] text-slate-400 mb-1">
                    {new Date(rec.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors line-clamp-2">
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
