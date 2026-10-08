'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

export default function BlogsPage() {
  const { website, tenantUrl } = useTenantWebsite();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const fetchBlogs = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/marketing/blogs');
      const data = await res.json();
      if (data?.success && Array.isArray(data?.blogs)) {
        setBlogs(data.blogs);
      } else {
        setError(data?.error || 'Failed to load articles.');
      }
    } catch (err) {
      setError(err.message || 'Error fetching articles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  const filteredBlogs = blogs.filter((blog) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (blog.title || '').toLowerCase().includes(q) ||
      (blog.summary || '').toLowerCase().includes(q) ||
      (blog.author_name || '').toLowerCase().includes(q) ||
      (blog.category || '').toLowerCase().includes(q) ||
      (blog.slug || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full min-h-screen py-8 md:py-12 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-6 max-w-4xl mx-auto text-center space-y-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 inline-block">
          Academic Publications &amp; Editorial
        </span>
        <h1 className="text-2xl sm:text-4xl font-semibold text-slate-900 dark:text-white tracking-tight">
          Articles &amp; Thought Leadership
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
          Educational insights, pedagogical methods, campus life reflections, and institutional research curated for the {website?.name || 'campus'} community.
        </p>

        {/* Search input */}
        <div className="pt-4 max-w-md mx-auto">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search articles by title, topic, or author..."
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

      {/* Main Articles Grid Section */}
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Published Articles
            </h2>
            <p className="text-xs text-slate-400">
              Showing {filteredBlogs.length} published article{filteredBlogs.length === 1 ? '' : 's'}
            </p>
          </div>

          <button
            type="button"
            onClick={fetchBlogs}
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
              onClick={fetchBlogs}
              className="underline font-semibold cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-5 space-y-3 animate-pulse"
              >
                <div className="aspect-16/10 bg-slate-100 dark:bg-slate-800 rounded" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-full" />
              </div>
            ))}
          </div>
        ) : filteredBlogs.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-10 text-center max-w-md mx-auto space-y-2">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
              [No Articles Available]
            </span>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
              {search ? 'No Matching Articles' : 'No Published Articles Found'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {search
                ? `No articles matched "${search}". Try searching a different keyword.`
                : 'Publications will appear here once officially published.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredBlogs.map((blog) => {
              const coverImg = blog.cover_image || blog.image;
              const formattedDate = blog.published_at || blog.created_at
                ? new Date(blog.published_at || blog.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : null;

              return (
                <article
                  key={blog.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 sm:p-5 shadow-xs hover:border-primary/50 transition-colors flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-3">
                    {coverImg && (
                      <div className="relative aspect-16/10 rounded overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={coverImg}
                          alt={blog.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      {blog.category && (
                        <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-medium">
                          {blog.category}
                        </span>
                      )}
                      {formattedDate && <span>{formattedDate}</span>}
                    </div>

                    <h3 className="text-base font-semibold text-slate-900 dark:text-white line-clamp-2">
                      <Link href={tenantUrl(`/blogs/${blog.slug}`)} className="hover:text-primary transition-colors">
                        {blog.title}
                      </Link>
                    </h3>

                    {blog.summary && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                        {blog.summary}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[11px] truncate">
                      {blog.author_name ? `By ${blog.author_name}` : 'Editorial Staff'}
                    </span>
                    <Link
                      href={tenantUrl(`/blogs/${blog.slug}`)}
                      className="font-medium text-primary hover:underline text-xs"
                    >
                      Read Article →
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Institutional Exploration Callout */}
      <div className="max-w-6xl mx-auto bg-slate-900 text-white rounded-md p-6 sm:p-8 border border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1.5 text-center md:text-left">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Campus Communications
          </span>
          <h2 className="text-lg sm:text-xl font-semibold text-white tracking-tight">
            Stay Connected with {website?.name || 'Our Community'}
          </h2>
          <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
            Browse official announcements, academic calendars, event schedules, and administrative notices through our campus news portal.
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-3">
          <Link
            href={tenantUrl('/news')}
            className="inline-block px-5 py-2.5 bg-white text-slate-900 hover:bg-slate-100 rounded text-xs font-semibold transition-colors"
          >
            Campus News →
          </Link>
          <Link
            href={tenantUrl('/notices')}
            className="inline-block px-5 py-2.5 border border-slate-700 text-white hover:bg-slate-800 rounded text-xs font-semibold transition-colors"
          >
            Notice Board →
          </Link>
        </div>
      </div>
    </div>
  );
}
