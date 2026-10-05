'use client';

import { useState, useEffect, useContext } from 'react';
import Link from 'next/link';
import { Context } from 'src/component/helper/Context';

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
    <div className="w-full space-y-4">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded p-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-slate-900">
              Platform Blog Articles
            </h1>
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded border bg-slate-100 text-slate-700 border-slate-200">
              CMS Content
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Publish educational articles, marketing insights, and product release guides.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchBlogs}
            className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-xs transition-colors cursor-pointer"
          >
            Refresh
          </button>

          {canManage && (
            <Link
              href="/developer/blogs/create"
              className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors cursor-pointer"
            >
              Create Article
            </Link>
          )}
        </div>
      </div>

      {actionError && (
        <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs font-normal flex items-center justify-between gap-2">
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError('')}
            className="text-rose-600 hover:underline font-medium cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Search by title, category, or author..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {categories.length > 0 && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
              >
                <option value="ALL">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded">
              {[
                { key: 'ALL', label: `All (${blogs.length})` },
                { key: 'PUBLISHED', label: `Published (${blogs.filter((b) => b.is_published).length})` },
                { key: 'DRAFTS', label: `Drafts (${blogs.filter((b) => !b.is_published).length})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFilterTab(tab.key)}
                  className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                    filterTab === tab.key
                      ? 'bg-white text-slate-900 font-medium shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase font-semibold">
                <th className="pb-2 w-12">#</th>
                <th className="pb-2 w-14">Image</th>
                <th className="pb-2">Title &amp; Category</th>
                <th className="pb-2 hidden lg:table-cell">Author</th>
                <th className="pb-2 text-center">Status</th>
                <th className="pb-2 text-center hidden sm:table-cell">Date</th>
                <th className="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading articles...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No articles found.
                  </td>
                </tr>
              ) : (
                filtered.map((blog) => {
                  const isBeingToggled = togglingId === blog.id;
                  const formattedDate = blog.published_at
                    ? new Date(blog.published_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : '—';

                  return (
                    <tr key={blog.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 font-mono text-[11px] text-slate-400">
                        #{blog.id}
                      </td>

                      <td className="py-2.5">
                        <div className="w-10 h-7 rounded overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center">
                          {blog.image ? (
                            <img
                              src={blog.image}
                              alt=""
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <span className="text-[9px] text-slate-400 font-mono">N/A</span>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Link
                              href={`/developer/blogs/${blog.id}`}
                              className="text-xs font-semibold text-slate-900 hover:underline"
                            >
                              {blog.title}
                            </Link>
                            {blog.category && (
                              <span className="text-[9px] font-medium px-1.5 py-0.2 rounded border bg-slate-50 text-slate-600 border-slate-200">
                                {blog.category}
                              </span>
                            )}
                          </div>
                          {blog.excerpt && (
                            <p className="text-[11px] text-slate-500 line-clamp-1 max-w-md">
                              {blog.excerpt}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 hidden lg:table-cell">
                        <div className="text-xs text-slate-700">{blog.author_name || 'Staff'}</div>
                        <div className="text-[10px] text-slate-400 capitalize">{blog.author_role || 'Developer'}</div>
                      </td>

                      <td className="py-2.5 text-center">
                        <button
                          type="button"
                          disabled={isBeingToggled || !canManage}
                          onClick={() => handleTogglePublish(blog)}
                          className={`text-[9px] font-medium px-1.5 py-0.5 rounded border transition-colors cursor-pointer disabled:opacity-50 ${
                            blog.is_published
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                          }`}
                        >
                          {blog.is_published ? 'Published' : 'Draft'}
                        </button>
                      </td>

                      <td className="py-2.5 text-center text-xs text-slate-500 hidden sm:table-cell font-mono">
                        {formattedDate}
                      </td>

                      <td className="py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {blog.is_published && (
                            <a
                              href={`/blogs/${blog.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium"
                            >
                              View
                            </a>
                          )}

                          <Link
                            href={`/developer/blogs/${blog.id}`}
                            className="px-2 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium"
                          >
                            Edit
                          </Link>

                          {canManage && (
                            <button
                              type="button"
                              disabled={deletingId === blog.id}
                              onClick={() => handleDelete(blog.id, blog.title)}
                              className="px-2 py-1 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium cursor-pointer disabled:opacity-50"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
