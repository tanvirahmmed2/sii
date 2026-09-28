'use client';

import { useState, useEffect, useContext } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  BiSearch,
  BiPlus,
  BiTrash,
  BiRefresh,
  BiEdit,
  BiImage,
  BiLinkExternal,
  BiCheckCircle,
  BiTimeFive,
  BiUser,
  BiRocket,
  BiLoaderAlt,
  BiFile,
  BiX,
} from 'react-icons/bi';
import { Context } from '@/components/helper/Context';

export default function AdminBlogsPage() {
  const { user } = useContext(Context);
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState('ALL'); // 'ALL' | 'PUBLISHED' | 'DRAFTS'
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [actionError, setActionError] = useState('');
  const [creating, setCreating] = useState(false);

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canManage = permissions.includes('blogs');
  const router = useRouter();

  // Create default unpublished blog and redirect to edit workspace
  const handleCreateDefaultBlog = async () => {
    if (!canManage || creating) return;
    try {
      setCreating(true);
      setActionError('');
      const res = await fetch('/api/developer/blogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Untitled Article',
          content: '<p>Write your article content here...</p>',
          summary: '',
          is_published: false,
        }),
      });
      const data = await res.json();
      if (data.success && data.record?.slug) {
        router.push(`/developer/blogs/${data.record.slug}`);
      } else {
        setActionError(data.error || 'Failed to create article.');
        setCreating(false);
      }
    } catch (err) {
      setActionError(err.message || 'Error creating article.');
      setCreating(false);
    }
  };

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      setActionError('');
      const res = await fetch('/api/developer/blogs');
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
    let active = true;
    fetch('/api/developer/blogs')
      .then((res) => res.json())
      .then((data) => {
        if (active) {
          if (data.success) {
            setBlogs(data.records || []);
          } else {
            setActionError(data.error || 'Failed to fetch blogs');
          }
          setLoading(false);
        }
      })
      .catch((e) => {
        if (active) {
          setActionError(e.message || 'Error fetching blogs');
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const handleDelete = async (id, title) => {
    if (!confirm(`Are you sure you want to permanently delete "${title || 'this article'}"?`)) return;
    setDeletingId(id);
    setActionError('');
    try {
      const res = await fetch(`/api/developer/blogs?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setBlogs((prev) => prev.filter((b) => b.id !== id));
      } else {
        setActionError(data.error || 'Failed to delete blog');
      }
    } catch (e) {
      setActionError(e.message || 'Error deleting blog');
    } finally {
      setDeletingId(null);
    }
  };

  const handleTogglePublish = async (blog) => {
    setTogglingId(blog.id);
    setActionError('');
    try {
      const res = await fetch('/api/developer/blogs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: blog.id,
          is_published: !blog.is_published,
        }),
      });
      const data = await res.json();
      if (data.success && data.record) {
        setBlogs((prev) => prev.map((b) => (b.id === blog.id ? data.record : b)));
      } else {
        setActionError(data.error || 'Failed to toggle publication status');
      }
    } catch (e) {
      setActionError(e.message || 'Error updating status');
    } finally {
      setTogglingId(null);
    }
  };

  const filtered = blogs.filter((blog) => {
    if (filterTab === 'PUBLISHED' && !blog.is_published) return false;
    if (filterTab === 'DRAFTS' && blog.is_published) return false;

    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      blog.title?.toLowerCase().includes(q) ||
      blog.slug?.toLowerCase().includes(q) ||
      blog.summary?.toLowerCase().includes(q) ||
      blog.author_name?.toLowerCase().includes(q) ||
      blog.app_title?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs w-full max-w-full overflow-hidden">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight truncate">
              Platform Blog Articles
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
              Blogs &amp; News
            </span>
          </div>
          <p className="text-xs text-slate-500 line-clamp-2">
            Publish educational articles, marketing insights, and product guides linked with ecosystem apps.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={fetchBlogs}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Refresh list data"
            aria-label="Refresh"
          >
            <BiRefresh className="text-lg" />
          </button>
          <button
            type="button"
            disabled={creating || !canManage}
            onClick={handleCreateDefaultBlog}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs bg-secondary hover:bg-secondary-dark text-white cursor-pointer disabled:opacity-60 shrink-0"
            title="Create New Blog Article"
          >
            {creating ? <BiLoaderAlt className="animate-spin text-base" /> : <BiPlus className="text-base" />}
            <span>{creating ? 'Creating...' : 'Create Article'}</span>
          </button>
        </div>
      </div>

      {actionError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-between gap-2 w-full">
          <span className="truncate">{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError('')}
            className="text-rose-500 hover:text-rose-800 shrink-0 font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden w-full max-w-full">
        <div className="p-3.5 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50 w-full">
          {/* Search Field */}
          <div className="relative w-full sm:w-72 md:w-80">
            <BiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
            <input
              type="text"
              placeholder="Search by title, app, or author..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl pl-8.5 pr-8 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                title="Clear search"
              >
                <BiX className="text-sm" />
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-full sm:w-auto shrink-0">
            {[
              { key: 'ALL', label: `All (${blogs.length})` },
              { key: 'PUBLISHED', label: `Published (${blogs.filter((b) => b.is_published).length})` },
              { key: 'DRAFTS', label: `Drafts (${blogs.filter((b) => !b.is_published).length})` },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilterTab(tab.key)}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center whitespace-nowrap ${
                  filterTab === tab.key
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* Responsive View List (Strictly zero horizontal overflow) */}
        {/* ========================================================================= */}
        <div className="w-full max-w-full overflow-hidden">
          {/* Header Row (Hidden on small screens) */}
          <div className="hidden md:flex items-center gap-3 px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
            <span className="w-8 shrink-0">#</span>
            <span className="w-14 shrink-0">Cover</span>
            <span className="flex-1 min-w-0">Article Title &amp; Details</span>
            <span className="w-28 shrink-0 hidden lg:block">Author</span>
            <span className="w-16 shrink-0 text-center hidden md:block">Gallery</span>
            <span className="w-24 shrink-0 text-center">Status</span>
            <span className="w-20 shrink-0 text-center hidden sm:block">Date</span>
            <span className="w-24 shrink-0 text-right">Actions</span>
          </div>

          {/* List Content */}
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
              <BiLoaderAlt className="animate-spin text-2xl text-secondary" />
              <span className="text-xs font-semibold">Loading blog articles...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 px-4 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center text-2xl mx-auto">
                <BiFile />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Articles Found</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {searchTerm
                  ? `No articles matched "${searchTerm}". Try a different keyword.`
                  : filterTab !== 'ALL'
                  ? `No articles found in the ${filterTab.toLowerCase()} filter.`
                  : 'Start publishing guides and news for the creator network.'}
              </p>
              {canManage && !searchTerm && filterTab === 'ALL' && (
                <button
                  type="button"
                  onClick={handleCreateDefaultBlog}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-secondary text-white text-xs font-bold hover:bg-secondary-dark transition-colors cursor-pointer mt-2"
                >
                  <BiPlus />
                  <span>Create First Article</span>
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 w-full">
              {filtered.map((blog) => {
                const imageCount = Array.isArray(blog.images) ? blog.images.length : 0;
                const isBeingToggled = togglingId === blog.id;
                const thumb = blog.images?.[0]?.image_url || blog.images?.[0]?.image || null;
                const formattedDate = blog.published_at
                  ? new Date(blog.published_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })
                  : '—';

                return (
                  <div
                    key={blog.id}
                    className="p-3 sm:p-4 hover:bg-slate-50/70 transition-colors flex items-center gap-2.5 sm:gap-3 w-full min-w-0 overflow-hidden"
                  >
                    {/* ID (hidden on mobile) */}
                    <span className="w-8 shrink-0 font-mono font-bold text-[11px] text-slate-400 hidden md:block">
                      #{blog.id}
                    </span>

                    {/* Cover Thumbnail */}
                    <div className="w-12 h-9 sm:w-14 sm:h-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0 relative flex items-center justify-center">
                      {thumb ? (
                        <Image
                          src={thumb}
                          alt={blog.title || 'Thumbnail'}
                          width={80}
                          height={60}
                          unoptimized
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <BiImage className="text-slate-300 text-base" />
                      )}
                    </div>

                    {/* Title & Details (flex-1 min-w-0 with truncate to prevent overflow) */}
                    <div className="flex-1 min-w-0 pr-1 space-y-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Link
                          href={`/developer/blogs/${blog.slug}`}
                          className="text-xs sm:text-sm font-bold text-slate-900 hover:text-secondary truncate block tracking-tight"
                          title={blog.title}
                        >
                          {blog.title}
                        </Link>
                      </div>

                      {(blog.app_title || imageCount > 0 || blog.summary) && (
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 min-w-0">
                          {blog.app_title && (
                            <span
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 truncate max-w-[140px] shrink-0"
                              title={`Linked app: ${blog.app_title}`}
                            >
                              <BiRocket className="text-[10px] shrink-0" />
                              <span className="truncate">{blog.app_title}</span>
                            </span>
                          )}

                          {/* On mobile screens, show gallery count inline */}
                          {imageCount > 0 && (
                            <span className="inline-flex md:hidden items-center gap-0.5 text-[10px] text-slate-500 shrink-0">
                              <BiImage className="text-xs text-slate-400" />
                              <span>{imageCount}</span>
                            </span>
                          )}

                          {blog.summary && (
                            <span className="text-[11px] text-slate-400 truncate hidden sm:inline">
                              {blog.summary}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Author (Hidden on < lg) */}
                    <div className="w-28 shrink-0 hidden lg:flex items-center gap-1 text-[11px] text-slate-600 truncate">
                      <BiUser className="text-slate-400 shrink-0 text-xs" />
                      <span className="truncate">{blog.author_name || 'Staff'}</span>
                    </div>

                    {/* Gallery Count (Hidden on < md) */}
                    <div className="w-16 shrink-0 hidden md:flex items-center justify-center gap-1 text-[11px] text-slate-500">
                      <BiImage className="text-sm text-slate-400" />
                      <span>{imageCount}</span>
                    </div>

                    {/* Status Badge Toggle (Visible on all screens) */}
                    <div className="shrink-0">
                      <button
                        type="button"
                        disabled={isBeingToggled}
                        onClick={() => handleTogglePublish(blog)}
                        className={`inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                          blog.is_published
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                        }`}
                        title="Click to toggle publish status"
                      >
                        {isBeingToggled ? (
                          <BiLoaderAlt className="animate-spin text-xs" />
                        ) : blog.is_published ? (
                          <BiCheckCircle className="text-xs" />
                        ) : (
                          <BiTimeFive className="text-xs" />
                        )}
                        <span className="hidden sm:inline">
                          {blog.is_published ? 'Published' : 'Draft'}
                        </span>
                      </button>
                    </div>

                    {/* Date (Hidden on < sm) */}
                    <div className="w-20 shrink-0 hidden sm:block text-[11px] text-slate-500 text-center truncate">
                      {formattedDate}
                    </div>

                    {/* Actions Row */}
                    <div className="shrink-0 flex items-center justify-end gap-0.5 sm:gap-1">
                      {/* Public view if published */}
                      {blog.is_published && (
                        <Link
                          href={`/blogs/${blog.slug}`}
                          target="_blank"
                          className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-secondary hover:bg-slate-100 transition-colors"
                          title="View live public article"
                          aria-label="View public article"
                        >
                          <BiLinkExternal className="text-base" />
                        </Link>
                      )}

                      {/* Edit article */}
                      <Link
                        href={`/developer/blogs/${blog.slug}`}
                        className="p-1 sm:p-1.5 rounded-lg text-slate-500 hover:text-secondary hover:bg-secondary/10 transition-colors"
                        title="Edit article"
                        aria-label="Edit article"
                      >
                        <BiEdit className="text-base" />
                      </Link>

                      {/* Delete article */}
                      <button
                        type="button"
                        disabled={deletingId === blog.id}
                        onClick={() => handleDelete(blog.id, blog.title)}
                        className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                        title="Delete article"
                        aria-label="Delete article"
                      >
                        {deletingId === blog.id ? (
                          <BiLoaderAlt className="animate-spin text-base" />
                        ) : (
                          <BiTrash className="text-base" />
                        )}
                      </button>
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
