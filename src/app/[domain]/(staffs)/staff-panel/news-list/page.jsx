'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FiFileText,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiSearch,
  FiCheckCircle,
  FiXCircle,
  FiCalendar,
  FiTag,
  FiRefreshCw,
  FiImage,
  FiCheck,
  FiX
} from 'react-icons/fi';

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

  useEffect(() => {
    fetchNews();
  }, [domain, selectedCategory, selectedStatus]);

  const showToast = (msg, isErr = false) => {
    if (isErr) {
      setToastError(msg);
      setTimeout(() => setToastError(null), 4000);
    } else {
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const fetchNews = async () => {
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
  };

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
    <div className="w-full space-y-6">
      {/* Toast Alerts */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-xl text-sm animate-fade-in font-medium">
          <FiCheckCircle className="text-lg shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
      {toastError && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-rose-600 text-white px-4 py-3 rounded-xl shadow-xl text-sm animate-fade-in font-medium">
          <FiXCircle className="text-lg shrink-0" />
          <span>{toastError}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Total Articles</p>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <FiFileText className="text-base" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono">{totalNews}</span>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Stories posted</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Live Feed (Published)</p>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <FiCheckCircle className="text-base" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">{publishedNews}</span>
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Active online</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Pending Drafts</p>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <FiCalendar className="text-base" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400 font-mono">{draftsNews}</span>
            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">In review</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Media Gallery</p>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <FiImage className="text-base" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-purple-600 dark:text-purple-400 font-mono">{totalImagesCount}</span>
            <span className="text-[11px] font-medium text-purple-600 dark:text-purple-400">Photos attached</span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {/* Header Toolbar */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FiFileText className="text-blue-500" />
              Campus News & Announcements
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Comprehensive list of academic events, bulletin posts, and institutional achievements.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Box */}
            <div className="relative min-w-[200px]">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
              <input
                type="text"
                placeholder="Search headlines or contents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchNews()}
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
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
              className="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="published">Published Only</option>
              <option value="draft">Drafts Only</option>
            </select>

            <button
              onClick={fetchNews}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
              title="Refresh"
            >
              <FiRefreshCw className={loading ? 'animate-spin' : ''} />
            </button>

            <button
              onClick={handleCreateNews}
              disabled={creating}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-secondary hover:bg-secondary-dark text-white shadow-xs transition cursor-pointer disabled:opacity-60"
            >
              {creating ? (
                <FiRefreshCw className="animate-spin text-sm" />
              ) : (
                <FiPlus className="text-sm" />
              )}
              <span>{creating ? 'Initializing...' : 'Create News'}</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4 font-semibold uppercase text-[10px] tracking-wider">Cover</th>
                <th className="py-3 px-4 font-semibold uppercase text-[10px] tracking-wider">Headline</th>
                <th className="py-3 px-4 font-semibold uppercase text-[10px] tracking-wider">Category</th>
                <th className="py-3 px-4 font-semibold uppercase text-[10px] tracking-wider">Photos</th>
                <th className="py-3 px-4 font-semibold uppercase text-[10px] tracking-wider">Date</th>
                <th className="py-3 px-4 font-semibold uppercase text-[10px] tracking-wider">Status</th>
                <th className="py-3 px-4 font-semibold uppercase text-[10px] tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <FiRefreshCw className="inline-block animate-spin text-lg mr-2 text-secondary" />
                    Loading news articles...
                  </td>
                </tr>
              ) : newsList.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400 dark:text-slate-500">
                    No news articles found. Click "Create News" to publish your first story.
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
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {coverImage?.image_url ? (
                          <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                            <img
                              src={coverImage.image_url}
                              alt={article.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 text-xs bg-slate-50 dark:bg-slate-800/40">
                            <FiImage className="text-slate-400" />
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 max-w-sm">
                        <p className="font-semibold text-slate-900 dark:text-white line-clamp-1">
                          {article.title}
                        </p>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                          <FiTag className="text-[9px]" />
                          {article.category || 'General'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          <FiImage className="text-[10px]" />
                          {photosCount} photo{photosCount !== 1 ? 's' : ''}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <FiCalendar className="text-slate-400 text-xs" />
                          <span>
                            {article.published_date
                              ? new Date(article.published_date).toLocaleDateString()
                              : '—'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <button
                          onClick={() => togglePublishStatus(article)}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition cursor-pointer ${
                            article.is_published
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 hover:bg-amber-100'
                          }`}
                        >
                          {article.is_published ? <FiCheck className="text-xs" /> : <FiX className="text-xs" />}
                          <span>{article.is_published ? 'Published' : 'Draft'}</span>
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <Link
                            href={`/${domain}/staff-panel/news-list/${article.slug}`}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                            title="Update News Article"
                          >
                            <FiEdit2 className="text-sm" />
                          </Link>
                          <button
                            onClick={() => {
                              setNewsToDelete(article);
                              setDeleteModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition cursor-pointer"
                            title="Delete News Article"
                          >
                            <FiTrash2 className="text-sm" />
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
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-scale-up">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50">
                <FiTrash2 className="text-xl" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete News Article</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-800 dark:text-slate-200">"{newsToDelete.title}"</strong>? This will permanently remove the article and all attached gallery photos.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setNewsToDelete(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteNews}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {deleting && <FiRefreshCw className="animate-spin text-xs" />}
                <span>Delete Permanently</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
