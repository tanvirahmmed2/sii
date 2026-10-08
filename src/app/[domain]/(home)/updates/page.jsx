'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
}

export default function UpdatesPage() {
  const { website, tenantUrl } = useTenantWebsite();
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const fetchPublishedUpdates = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/marketing/updates');
      const data = await res.json();
      if (data?.success && Array.isArray(data?.updates)) {
        setUpdates(data.updates);
      } else {
        setError(data?.error || 'Failed to load updates.');
      }
    } catch (err) {
      setError(err.message || 'Error fetching updates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublishedUpdates();
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
    <div className="w-full min-h-screen py-8 md:py-12 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-6 max-w-4xl mx-auto text-center space-y-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 inline-block">
          System Changelog &amp; Releases
        </span>
        <h1 className="text-2xl sm:text-4xl font-semibold text-slate-900 dark:text-white tracking-tight">
          Campus Portal Releases &amp; Updates
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
          Recent software enhancements, administrative module rollouts, security upgrades, and new capabilities deployed for {website?.name || 'the campus'} portal.
        </p>

        {/* Search Bar */}
        <div className="pt-4 max-w-md mx-auto">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search release notes or features..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-900 dark:text-white outline-none focus:border-primary transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs font-medium cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Directory */}
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Release Changelog
            </h2>
            <p className="text-xs text-slate-400">
              Showing {filteredUpdates.length} release update{filteredUpdates.length === 1 ? '' : 's'}
            </p>
          </div>

          <button
            type="button"
            onClick={fetchPublishedUpdates}
            disabled={loading}
            className="self-start sm:self-auto px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer"
          >
            {loading ? 'Refreshing...' : 'Refresh List'}
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={fetchPublishedUpdates}
              className="underline font-semibold cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-5 space-y-3 animate-pulse"
              >
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-full" />
              </div>
            ))}
          </div>
        ) : filteredUpdates.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-10 text-center max-w-md mx-auto space-y-2">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
              [No Releases Published]
            </span>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
              {search ? 'No Matching Releases' : 'No Changelog Updates Available'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {search
                ? `No updates matched "${search}". Try searching a different term.`
                : 'Platform upgrade notes will be posted here as new versions roll out.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredUpdates.map((item) => {
              const formattedDate = item.release_date || item.created_at
                ? new Date(item.release_date || item.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : null;
              const plainSnippet = stripHtml(item.description);

              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-5 shadow-xs hover:border-primary/50 transition-colors flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                      {formattedDate && <span>{formattedDate}</span>}
                      <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 text-[10px] font-medium">
                        {item.version ? `v${item.version}` : 'Release'}
                      </span>
                    </div>

                    <h3 className="text-base font-semibold text-slate-900 dark:text-white line-clamp-2">
                      <Link href={tenantUrl(`/updates/${item.slug || item.id}`)} className="hover:text-primary transition-colors">
                        {item.title}
                      </Link>
                    </h3>

                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                      {plainSnippet || 'Explore newly published updates and feature improvements in this release.'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400">
                      {website?.name || 'Engineering'}
                    </span>
                    <Link
                      href={tenantUrl(`/updates/${item.slug || item.id}`)}
                      className="font-medium text-primary hover:underline text-xs"
                    >
                      Read Full Notes →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
