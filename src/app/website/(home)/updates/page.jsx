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
      const res = await fetch('/api/updates');
      const data = await res.json();
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
    fetch('/api/updates')
      .then((res) => res.json())
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
      (item.description || '').toLowerCase().includes(q) ||
      (item.slug || '').toLowerCase().includes(q)
    );
  });

  return (
    <main className="min-h-screen bg-slate-50/60 pb-24">
      {/* Hero Header */}
      <section className="relative overflow-hidden bg-primary text-white pt-20 pb-20 px-4 lg:px-8 border-b border-white/10">
        <div className="absolute inset-0 bg-linear-to-b from-primary/10 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto text-center relative z-10 space-y-4">
          <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight max-w-3xl mx-auto leading-tight">
            Product Updates &amp; Changelog
          </h1>

          <p className="text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Follow our journey as we continuously enhance the portfolio builder. Discover our latest feature releases, performance boosts, and design studio tools.
          </p>

          {/* Search Bar */}
          <div className="pt-6 max-w-xl mx-auto">
            <div className="relative">
              <BiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-lg" />
              <input
                type="text"
                placeholder="Search updates by feature, release, or topic..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/10 border border-white/15 rounded-2xl pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-primary focus:bg-white/15 transition-all shadow-lg backdrop-blur-md"
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

      {/* Main Updates Directory Section */}
      <section className="w-full px-4 lg:px-8 pt-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <BiBell className="text-primary text-2xl" /> Product Changelog
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {filteredUpdates.length} release update{filteredUpdates.length === 1 ? '' : 's'}
            </p>
          </div>

          <button
            type="button"
            onClick={fetchPublishedUpdates}
            disabled={loading}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <BiRefresh className={`text-sm ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {error && (
          <div className="mt-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-between">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-8">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs animate-pulse space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="h-4 bg-slate-200 rounded-md w-24" />
                  <div className="h-4 bg-slate-100 rounded-full w-16" />
                </div>
                <div className="h-5 bg-slate-200 rounded-md w-3/4 pt-2" />
                <div className="space-y-2 pt-2">
                  <div className="h-3 bg-slate-100 rounded-md w-full" />
                  <div className="h-3 bg-slate-100 rounded-md w-5/6" />
                  <div className="h-3 bg-slate-100 rounded-md w-2/3" />
                </div>
                <div className="h-4 bg-slate-100 rounded-md w-28 pt-4" />
              </div>
            ))}
          </div>
        ) : filteredUpdates.length === 0 ? (
          /* Empty State */
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center my-8 shadow-xs max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-3xl mx-auto mb-4">
              <BiBell />
            </div>
            <h3 className="text-base font-semibold text-slate-800">
              {search ? 'No Matching Updates Found' : 'No Changelog Updates Published Yet'}
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
              {search
                ? `No updates matched "${search}". Try checking for typos or searching a different keyword.`
                : 'Stay tuned! Exciting features and platform upgrades will be announced here soon.'}
            </p>
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="mt-4 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Clear Search Filter
              </button>
            )}
          </div>
        ) : (
          /* Updates Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-8">
            {filteredUpdates.map((item) => {
              const formattedDate = item.created_at
                ? new Date(item.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : null;
              const plainSnippet = stripHtml(item.description);

              return (
                <div
                  key={item.id}
                  className="group rounded-3xl bg-white border border-slate-200/80 hover:border-secondary/40 transition-all duration-300 shadow-xs hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between overflow-hidden p-6 sm:p-7 space-y-4"
                >
                  <div className="space-y-3">
                    {/* Header Row: Date & Release Badge */}
                    <div className="flex items-center justify-between gap-2">
                      {formattedDate ? (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                          <BiCalendar className="text-secondary text-sm" />
                          <span>{formattedDate}</span>
                        </div>
                      ) : (
                        <div />
                      )}
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20">
                        Release
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 group-hover:text-secondary transition-colors tracking-tight line-clamp-2">
                      <Link href={`/updates/${item.slug}`}>
                        {item.title}
                      </Link>
                    </h3>

                    {/* Summary Snippet */}
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                      {plainSnippet || 'Explore newly published updates and feature improvements in this release.'}
                    </p>
                  </div>

                  {/* Read More Link */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <Link
                      href={`/updates/${item.slug}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-secondary group-hover:text-secondary-dark transition-colors"
                    >
                      <span>Read Full Update</span>
                      <BiRightArrowAlt className="text-base group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Creator Call To Action */}
      <section className="w-full px-4 lg:px-8 mt-20">
        <div className="bg-linear-to-r from-slate-900 to-slate-950 rounded-3xl p-8 sm:p-12 text-white border border-white/10 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl text-center md:text-left">
            <h3 className="text-2xl font-semibold tracking-tight">
              Ready to build with the latest tools?
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Create your account in seconds, connect your custom domain, and launch a complete online presence with all our newest features.
            </p>
          </div>
          <Link
            href="/creator/login"
            className="px-6 py-3.5 rounded-2xl bg-secondary hover:bg-secondary-dark text-white font-semibold text-sm shadow-xl flex items-center gap-2 shrink-0 transition-all hover:scale-105 cursor-pointer"
          >
            <span>Get Started Now</span>
            <BiRightArrowAlt className="text-lg" />
          </Link>
        </div>
      </section>
    </main>
  );
}
