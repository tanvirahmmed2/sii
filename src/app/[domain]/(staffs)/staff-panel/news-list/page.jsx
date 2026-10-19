/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';

const DEFAULT_CATEGORIES = [
  'General',
  'Academic',
  'Sports',
  'Cultural',
  'Events',
  'Achievements',
  'Campus Life'
];

export default function NewsListPage() {
  const params = useParams();
  const router = useRouter();
  const domain = params?.domain || '';

  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [creating, setCreating] = useState(false);

  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [newsToDelete, setNewsToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Notifications
  const [toastMessage, setToastMessage] = useState(null);
  const [toastError, setToastError] = useState(null);

  const showToast = useCallback((msg, isErr = false) => {
    if (isErr) {
      setToastError(msg);
      setTimeout(() => setToastError(null), 4000);
    } else {
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 4000);
    }
  }, []);

  const fetchNews = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/${domain}/staff/panel/news?`;
      if (selectedStatus !== 'all') url += `status=${selectedStatus}&`;
      if (selectedCategory !== 'all') url += `category=${encodeURIComponent(selectedCategory)}&`;
      if (searchTerm.trim()) url += `search=${encodeURIComponent(searchTerm.trim())}&`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setNewsList(data.news || []);
      } else {
        showToast(data.error || 'Failed to load news articles', true);
      }
    } catch (err) {
      console.error('Fetch news error:', err);
      showToast('Network error while loading news articles', true);
    } finally {
      setLoading(false);
    }
  }, [domain, selectedStatus, selectedCategory, searchTerm, showToast]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const handleCreateNews = async () => {
    setCreating(true);
    try {
      const res = await fetch(`/api/${domain}/staff/panel/news`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_demo: true }),
      });
      const data = await res.json();

      if (data.success && data.news?.slug) {
        router.push(`/${domain}/staff-panel/news-list/${data.news.slug}`);
      } else {
        router.push(`/${domain}/staff-panel/news-create`);
      }
    } catch (err) {
      console.error('Create demo news error:', err);
      router.push(`/${domain}/staff-panel/news-create`);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteNews = async () => {
    if (!newsToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/${domain}/staff/panel/news?id=${newsToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.success) {
        showToast(`Article "${newsToDelete.title}" deleted`);
        setDeleteModalOpen(false);
        setNewsToDelete(null);
        fetchNews();
      } else {
        showToast(data.error || 'Failed to delete news article', true);
      }
    } catch (err) {
      console.error('Delete news error:', err);
      showToast('Network error deleting article', true);
    } finally {
      setDeleting(false);
    }
  };

  const togglePublishStatus = async (article) => {
    try {
      const res = await fetch(`/api/${domain}/staff/panel/news`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: article.id,
          is_published: !article.is_published,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Article "${article.title}" marked as ${!article.is_published ? 'Published' : 'Draft'}`);
        fetchNews();
      }
    } catch (err) {
      console.error('Toggle status error:', err);
    }
  };

  // KPIs
  const totalNews = newsList.length;
  const publishedNews = newsList.filter((n) => n.is_published).length;
  const draftsNews = newsList.filter((n) => !n.is_published).length;
  const totalImagesCount = newsList.reduce(
    (acc, n) => acc + (Array.isArray(n.images) ? n.images.length : 0),
    0
  );

  return (
    <div className="w-full space-y-4">
      {/* Toast Alerts */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-md shadow-lg text-xs font-medium animate-fade-in">
          <span>{toastMessage}</span>
        </div>
      )}
      {toastError && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-rose-600 text-white px-4 py-2 rounded-md shadow-lg text-xs font-medium animate-fade-in">
          <span>{toastError}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3.5 shadow-xs">
          <p className="text-[11px] uppercase font-medium text-slate-400 dark:text-slate-500 tracking-wider">Total Articles</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-semibold text-slate-900 dark:text-white font-mono">{totalNews}</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Stories posted</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3.5 shadow-xs">
          <p className="text-[11px] uppercase font-medium text-slate-400 dark:text-slate-500 tracking-wider">Live Feed</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400 font-mono">{publishedNews}</span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400">Active online</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3.5 shadow-xs">
          <p className="text-[11px] uppercase font-medium text-slate-400 dark:text-slate-500 tracking-wider">Pending Drafts</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-semibold text-amber-600 dark:text-amber-400 font-mono">{draftsNews}</span>
            <span className="text-[11px] text-amber-600 dark:text-amber-400">In review</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3.5 shadow-xs">
          <p className="text-[11px] uppercase font-medium text-slate-400 dark:text-slate-500 tracking-wider">Media Gallery</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-semibold text-primary font-mono">{totalImagesCount}</span>
            <span className="text-[11px] text-primary">Photos attached</span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md shadow-xs overflow-hidden">
        {/* Header Toolbar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Campus News & Announcements
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Comprehensive list of academic events, bulletin posts, and institutional achievements.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Box */}
            <input
              type="text"
              placeholder="Search headlines..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchNews()}
              className="text-xs px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary transition min-w-[200px]"
            />

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
            >
              <option value="all">All Categories</option>
              {DEFAULT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="published">Published Only</option>
              <option value="draft">Drafts Only</option>
            </select>

            <button
              onClick={fetchNews}
              className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium transition cursor-pointer"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>

            <button
              onClick={handleCreateNews}
              disabled={creating}
              className="px-3.5 py-1.5 rounded-md text-xs font-medium bg-primary hover:bg-primary-dark text-white shadow-xs transition cursor-pointer disabled:opacity-60"
            >
              {creating ? (
                <div className="loader loader-sm loader-white" />
              ) : (
                <span>Create News</span>
              )}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                <th className="py-2.5 px-3 font-semibold uppercase text-[10px] tracking-wider">Cover</th>
                <th className="py-2.5 px-3 font-semibold uppercase text-[10px] tracking-wider">Headline</th>
                <th className="py-2.5 px-3 font-semibold uppercase text-[10px] tracking-wider">Category</th>
                <th className="py-2.5 px-3 font-semibold uppercase text-[10px] tracking-wider">Photos</th>
                <th className="py-2.5 px-3 font-semibold uppercase text-[10px] tracking-wider">Date</th>
                <th className="py-2.5 px-3 font-semibold uppercase text-[10px] tracking-wider">Status</th>
                <th className="py-2.5 px-3 font-semibold uppercase text-[10px] tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center">
                    <div className="flex justify-center items-center">
                      <div className="loader loader-sm" />
                    </div>
                  </td>
                </tr>
              ) : newsList.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400 dark:text-slate-500">
                    No news articles found. Click &quot;Create News&quot; to publish your first story.
                  </td>
                </tr>
              ) : (
                newsList.map((article) => {
                  const coverImage = Array.isArray(article.images)
                    ? article.images.find((img) => img.is_cover) || article.images[0]
                    : null;
                  const photosCount = Array.isArray(article.images) ? article.images.length : 0;

                  return (
                    <tr
                      key={article.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Cover Photo */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {coverImage?.image_url ? (
                          <div className="w-10 h-10 rounded overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                            <img
                              src={coverImage.image_url}
                              alt={article.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 text-[10px] bg-slate-50 dark:bg-slate-800/40">
                            No Pic
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-3 max-w-sm">
                        <p className="font-medium text-slate-900 dark:text-white line-clamp-1">
                          {article.title}
                        </p>
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
                          {article.category || 'General'}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {photosCount} photo{photosCount !== 1 ? 's' : ''}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
                        {article.published_date
                          ? new Date(article.published_date).toLocaleDateString()
                          : '—'}
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <button
                          onClick={() => togglePublishStatus(article)}
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium transition cursor-pointer border ${
                            article.is_published
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 hover:bg-amber-100'
                          }`}
                        >
                          {article.is_published ? 'Published' : 'Draft'}
                        </button>
                      </td>

                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <Link
                            href={`/${domain}/staff-panel/news-list/${article.slug}`}
                            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                            title="Edit News Article"
                          >
                            <FiEdit2 className="text-xs" />
                          </Link>
                          <button
                            onClick={() => {
                              setNewsToDelete(article);
                              setDeleteModalOpen(true);
                            }}
                            className="p-1.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition cursor-pointer"
                            title="Delete News Article"
                          >
                            <FiTrash2 className="text-xs" />
                          </button>
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

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && newsToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md w-full max-w-md shadow-2xl p-5 space-y-4 animate-scale-up">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <FiTrash2 className="text-lg" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Delete News Article</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-800 dark:text-slate-200">&ldquo;{newsToDelete.title}&rdquo;</strong>? This will permanently remove the article and all attached gallery photos.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setNewsToDelete(null);
                }}
                className="px-3 py-1.5 rounded-md text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteNews}
                className="px-3.5 py-1.5 rounded-md text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {deleting ? (
                  <div className="loader loader-sm loader-white" />
                ) : (
                  <span>Delete Permanently</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
