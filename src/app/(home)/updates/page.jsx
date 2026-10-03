'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BiSearch,
  BiBell,
  BiRefresh,
  BiRightArrowAlt,
  BiCalendar,
} from 'react-icons/bi';

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
}

export default function UpdatesPage() {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const fetchPublishedUpdates = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/marketing/updates');
      const data = res.ok ? await res.json() : { success: false };
      if (data?.success && Array.isArray(data?.updates)) {
        setUpdates(data.updates);
      } else {
        setError(data?.error || 'Failed to load platform updates.');
      }
    } catch (err) {
      setError(err.message || 'Error fetching changelog updates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    fetch('/api/marketing/updates')
      .then((res) => (res.ok ? res.json() : { success: false }))
      .then((data) => {
        if (!isMounted) return;
        if (data?.success && Array.isArray(data?.updates)) {
          setUpdates(data.updates);
        } else {
          setError(data?.error || 'Failed to load platform updates.');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Error fetching changelog updates.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredUpdates = updates.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (item.title || '').toLowerCase().includes(q) ||
      (item.version || '').toLowerCase().includes(q) ||
      (item.description || '').toLowerCase().includes(q) ||
      (item.changelog || '').toLowerCase().includes(q)
    );
  });

  return (
    <main className="min-h-screen bg-slate-50/60 dark:bg-slate-950 pb-24 transition-colors">
      {/* Hero Header */}
      <section className="relative overflow-hidden bg-primary text-white pt-20 pb-20 px-4 lg:px-8 border-b border-white/10">
        <div className="absolute inset-0 bg-linear-to-b from-primary/10 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 border border-white/20">
            <BiBell className="text-sm" /> Product Releases
          </div>

          <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight max-w-3xl mx-auto leading-tight">
            Product Updates &amp; Changelog
          </h1>

          <p className="text-sm sm:text-base max-w-2xl mx-auto leading-relaxed text-slate-200">
            Follow our journey as we continuously enhance the platform. Explore our latest system releases, feature rollouts, and improvements.
          </p>

          {/* Search Bar */}
          <div className="pt-4 max-w-xl mx-auto">
            <div className="relative">
              <BiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-400" />
              <input
                type="text"
                placeholder="Search updates by feature, version, or keyword..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/10 border border-white/15 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-300 focus:outline-none focus:border-white focus:bg-white/15 transition-all shadow-lg backdrop-blur-md"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold hover:text-white px-2 py-1 rounded-md bg-white/10 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Updates Section (List View) */}
      <section className="w-full px-4 sm:px-6 lg:px-8 pt-12 max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BiBell className="text-secondary text-2xl" /> All Releases
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Showing {filteredUpdates.length} product update{filteredUpdates.length === 1 ? '' : 's'}
            </p>
          </div>

          <button
            type="button"
            onClick={fetchPublishedUpdates}
            disabled={loading}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-900 text-xs font-semibold transition-colors cursor-pointer"
          >
            <BiRefresh className={`text-sm ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={fetchPublishedUpdates}
              className="text-rose-600 hover:underline font-semibold cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading ? (
          <div className="space-y-4 pt-2">
            {[1, 2, 3, 4].map((idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs animate-pulse space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-24" />
                  <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full w-20" />
                </div>
                <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-md w-2/3" />
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-md w-full" />
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-md w-4/5" />
              </div>
            ))}
          </div>
        ) : filteredUpdates.length === 0 ? (
          /* Empty State */
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center my-8 shadow-xs max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center text-3xl mx-auto mb-4">
              <BiBell />
            </div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
              {search ? 'No Matching Updates Found' : 'No Updates Published Yet'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm mx-auto leading-relaxed">
              {search
                ? `No updates matched "${search}". Try checking for typos or searching a different keyword.`
                : 'Exciting features and system updates will be announced here soon.'}
            </p>
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="mt-4 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                Clear Search Filter
              </button>
            )}
          </div>
        ) : (
          /* Clean List View with Title, Summary, and Link */
          <div className="space-y-4 pt-2">
            {filteredUpdates.map((item) => {
              const releaseDateVal = item.release_date || item.created_at;
              const formattedDate = releaseDateVal
                ? new Date(releaseDateVal).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : null;
              const summaryText = stripHtml(item.description);
              const targetUrl = `/updates/${item.slug || item.id}`;

              return (
                <article
                  key={item.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-secondary/50 rounded-2xl p-6 sm:p-7 shadow-xs hover:shadow-md transition-all space-y-3.5 group"
                >
                  {/* Top Metadata: Version & Date */}
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-secondary/10 text-secondary font-mono font-bold text-xs border border-secondary/20">
                      {item.version || 'Release'}
                    </span>

                    {formattedDate && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                        <BiCalendar className="text-secondary text-sm" />
                        <span>{formattedDate}</span>
                      </div>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white group-hover:text-secondary transition-colors tracking-tight">
                    <Link href={targetUrl} className="hover:underline">
                      {item.title}
                    </Link>
                  </h3>

                  {/* Summary */}
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {summaryText || 'Click to view full release notes and feature improvements.'}
                  </p>

                  {/* Link */}
                  <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80">
                    <Link
                      href={targetUrl}
                      className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-secondary hover:text-secondary-dark transition-colors"
                    >
                      <span>Read Full Update</span>
                      <BiRightArrowAlt className="text-base group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
