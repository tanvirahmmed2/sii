'use client';

import { useState, useEffect, useContext } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Context } from 'src/component/helper/Context';
import {
  BiPlus,
  BiRefresh,
  BiSearch,
  BiTrash,
  BiEdit,
  BiGlobe,
  BiCheckCircle,
  BiTime,
  BiBookContent,
  BiTag,
  BiCategory,
} from 'react-icons/bi';

export default function AdminBlogsPage() {
  const { user } = useContext(Context);
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState('ALL'); // 'ALL' | 'PUBLISHED' | 'DRAFTS'
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [actionError, setActionError] = useState('');

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canManage = permissions.includes('blogs') || ['admin', 'manager'].includes((user?.role || '').toLowerCase());

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      setActionError('');
      const res = await fetch('/api/marketing/developer/blogs');
      const data = await res.json();
      if (data.success) {
        setBlogs(data.records || []);
      } else {
        setActionError(data.error || 'Failed to fetch blogs');
      }
    } catch (e) {
      console.error(e);
      setActionError(e.message || 'Error fetching blogs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  const handleDelete = async (id, title) => {
    if (!confirm(`Are you sure you want to permanently delete "${title || 'this article'}"?`)) return;
    setDeletingId(id);
    setActionError('');
    try {
      const res = await fetch(`/api/marketing/developer/blogs?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setBlogs((prev) => prev.filter((b) => b.id !== id));
      } else {
        setActionError(data.error || 'Failed to delete article');
      }
    } catch (err) {
      setActionError(err.message || 'Error deleting article');
    } finally {
      setDeletingId(null);
    }
  };

  const handleTogglePublish = async (blog) => {
    setTogglingId(blog.id);
    setActionError('');
    try {
      const newStatus = !blog.is_published;
      const res = await fetch('/api/marketing/developer/blogs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: blog.id,
          is_published: newStatus,
        }),
      });
      const data = await res.json();
      if (data.success && data.record) {
        setBlogs((prev) => prev.map((b) => (b.id === blog.id ? data.record : b)));
      } else {
        setActionError(data.error || 'Failed to update publication status');
      }
    } catch (err) {
      setActionError(err.message || 'Error updating status');
    } finally {
      setTogglingId(null);
    }
  };

  // Categories list
  const categories = Array.from(
    new Set(blogs.map((b) => b.category).filter(Boolean))
  );

  const filtered = blogs.filter((blog) => {
    if (filterTab === 'PUBLISHED' && !blog.is_published) return false;
    if (filterTab === 'DRAFTS' && blog.is_published) return false;
    if (selectedCategory !== 'ALL' && blog.category !== selectedCategory) return false;

    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      blog.title?.toLowerCase().includes(q) ||
      blog.excerpt?.toLowerCase().includes(q) ||
      blog.category?.toLowerCase().includes(q) ||
      blog.author_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 sm:p-6 shadow-xs w-full max-w-full">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-medium text-slate-900 dark:text-white tracking-tight truncate">
              Platform Blog Articles
            </h1>
            <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0">
              Content &amp; CMS
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Publish educational articles, marketing insights, and product release guides.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={fetchBlogs}
            className="p-2 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Refresh list data"
            aria-label="Refresh"
          >
            <BiRefresh className="text-base" />
          </button>

          {canManage && (
            <Link
              href="/developer/blogs/create"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded text-xs font-medium transition-all shadow-xs bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shrink-0"
              title="Create New Blog Article"
            >
              <BiPlus className="text-base" />
              <span>Create Article</span>
            </Link>
          )}
        </div>
      </div>

      {actionError && (
        <div className="p-4 rounded bg-rose-50 border border-rose-200 dark:bg-rose-950/30 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-normal flex items-center justify-between gap-2 w-full">
          <span className="truncate">{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError('')}
            className="text-rose-500 hover:text-rose-800 dark:hover:text-rose-200 shrink-0 font-medium cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-xs overflow-hidden w-full max-w-full">
        <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50 w-full">
          {/* Search Field */}
          <div className="relative w-full md:w-80">
            <BiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            <input
              type="text"
              placeholder="Search by title, category, or author..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded pl-8.5 pr-8 py-2 text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-600 transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Category Filter */}
            {categories.length > 0 && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-600"
              >
                <option value="ALL">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded w-full sm:w-auto shrink-0">
              {[
                { key: 'ALL', label: `All (${blogs.length})` },
                { key: 'PUBLISHED', label: `Published (${blogs.filter((b) => b.is_published).length})` },
                { key: 'DRAFTS', label: `Drafts (${blogs.filter((b) => !b.is_published).length})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFilterTab(tab.key)}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 rounded text-xs font-normal transition-all cursor-pointer text-center whitespace-nowrap ${
                    filterTab === tab.key
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-medium'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Responsive Table List */}
        <div className="w-full max-w-full overflow-hidden">
          {/* Header Row */}
          <div className="hidden md:flex items-center gap-3 px-4 py-2.5 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-[10px] font-medium uppercase tracking-wider text-slate-400 select-none">
            <span className="w-8 shrink-0">#</span>
            <span className="w-14 shrink-0">Cover</span>
            <span className="flex-1 min-w-0">Article Title &amp; Category</span>
            <span className="w-28 shrink-0 hidden lg:block">Author</span>
            <span className="w-24 shrink-0 text-center">Status</span>
            <span className="w-24 shrink-0 text-center hidden sm:block">Date</span>
            <span className="w-24 shrink-0 text-right">Actions</span>
          </div>

          {/* List Content */}
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
              <BiRefresh className="text-2xl animate-spin text-blue-600" />
              <span className="text-xs font-normal">Loading blog articles...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 px-4 text-center space-y-3">
              <div className="w-12 h-12 rounded bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center text-2xl mx-auto">
                <BiBookContent />
              </div>
              <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200">No Articles Found</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {searchTerm
                  ? `No articles matched "${searchTerm}". Try a different keyword.`
                  : filterTab !== 'ALL'
                  ? `No articles found in the ${filterTab.toLowerCase()} filter.`
                  : 'Start publishing guides and news for the creator network.'}
              </p>
              {canManage && !searchTerm && (
                <Link
                  href="/developer/blogs/create"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors cursor-pointer mt-2"
                >
                  <BiPlus className="text-base" />
                  <span>Create First Article</span>
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60 w-full">
              {filtered.map((blog) => {
                const isBeingToggled = togglingId === blog.id;
                const formattedDate = blog.published_at
                  ? new Date(blog.published_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : '—';

                return (
                  <div
                    key={blog.id}
                    className="p-3 sm:p-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors flex items-center gap-2.5 sm:gap-3 w-full min-w-0 overflow-hidden"
                  >
                    {/* ID */}
                    <span className="w-8 shrink-0 font-mono font-medium text-[11px] text-slate-400 hidden md:block">
                      #{blog.id}
                    </span>

                    {/* Cover Thumbnail */}
                    <div className="w-12 h-9 sm:w-14 sm:h-10 rounded overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0 relative flex items-center justify-center">
                      {blog.image ? (
                        <img
                          src={blog.image}
                          alt={blog.title || 'Thumbnail'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <BiBookContent className="text-slate-400 text-base" />
                      )}
                      {Array.isArray(blog.images) && blog.images.length > 1 && (
                        <span className="absolute bottom-0.5 right-0.5 px-1 py-0.2 rounded bg-black/70 text-white text-[9px] font-mono leading-none" title={`${blog.images.length} images`}>
                          {blog.images.length}
                        </span>
                      )}
                    </div>

                    {/* Title & Details */}
                    <div className="flex-1 min-w-0 pr-1 space-y-0.5">
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <Link
                          href={`/developer/blogs/${blog.id}`}
                          className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate tracking-tight"
                          title={blog.title}
                        >
                          {blog.title}
                        </Link>
                        {blog.category && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-normal bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                            {blog.category}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-400 min-w-0">
                        {blog.excerpt ? (
                          <span className="truncate max-w-sm">{blog.excerpt}</span>
                        ) : (
                          <span className="text-slate-400">ID #{blog.id}</span>
                        )}
                        {blog.views_count > 0 && (
                          <>
                            <span>•</span>
                            <span>{blog.views_count} views</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Author (Desktop) */}
                    <div className="w-28 shrink-0 hidden lg:block text-left">
                      <div className="text-xs font-normal text-slate-700 dark:text-slate-300 truncate">
                        {blog.author_name || 'Staff'}
                      </div>
                      <div className="text-[10px] text-slate-400 capitalize truncate">
                        {blog.author_role || 'Developer'}
                      </div>
                    </div>

                    {/* Status Badge & Toggle */}
                    <div className="w-24 shrink-0 text-center">
                      <button
                        type="button"
                        disabled={isBeingToggled || !canManage}
                        onClick={() => handleTogglePublish(blog)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider border transition-colors cursor-pointer disabled:opacity-50 ${
                          blog.is_published
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                            : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                        }`}
                        title="Click to toggle publication status"
                      >
                        {blog.is_published ? (
                          <>
                            <BiCheckCircle className="text-xs" /> Published
                          </>
                        ) : (
                          <>
                            <BiTime className="text-xs" /> Draft
                          </>
                        )}
                      </button>
                    </div>

                    {/* Date */}
                    <div className="w-24 shrink-0 text-center text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                      {formattedDate}
                    </div>

                    {/* Actions */}
                    <div className="w-24 shrink-0 flex items-center justify-end gap-1">
                      {blog.is_published && (
                        <a
                          href={`/blogs/${blog.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition-colors"
                          title="View live article"
                        >
                          <BiGlobe className="text-sm" />
                        </a>
                      )}

                      <Link
                        href={`/developer/blogs/${blog.id}`}
                        className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-colors"
                        title="Edit article"
                      >
                        <BiEdit className="text-sm" />
                      </Link>

                      {canManage && (
                        <button
                          type="button"
                          disabled={deletingId === blog.id}
                          onClick={() => handleDelete(blog.id, blog.title)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors cursor-pointer disabled:opacity-50"
                          title="Delete article"
                        >
                          <BiTrash className="text-sm" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
