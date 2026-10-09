/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  FiFileText,
  FiUploadCloud,
  FiTrash2,
  FiCheckCircle,
  FiXCircle,
  FiArrowLeft,
  FiSave,
  FiRefreshCw,
  FiImage,
  FiCalendar,
  FiTag,
  FiStar,
  FiCheck,
  FiX
} from 'react-icons/fi';

// Dynamically import TiptapEditor to avoid SSR hydration mismatch
const TiptapEditor = dynamic(() => import('src/component/website/ui/TiptapEditor.jsx'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-44 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center text-xs text-slate-400">
      Loading rich text editor...
    </div>
  ),
});

const DEFAULT_CATEGORIES = [
  'General',
  'Academic',
  'Sports',
  'Cultural',
  'Events',
  'Achievements',
  'Campus Life'
];

export default function UpdateNewsPage() {
  const params = useParams();
  const router = useRouter();
  const domain = params?.domain || '';
  const slug = params?.slug || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newsId, setNewsId] = useState(null);

  // Form Fields (NO slug shown or edited in frontend)
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('General');
  const [publishedDate, setPublishedDate] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');

  // Multi-image gallery state
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Notifications
  const [toastMessage, setToastMessage] = useState(null);
  const [toastError, setToastError] = useState(null);

  // Delete State
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const showToast = useCallback((msg, isErr = false) => {
    if (isErr) {
      setToastError(msg);
      setTimeout(() => setToastError(null), 4000);
    } else {
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 4000);
    }
  }, []);

  const fetchNewsData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/${domain}/staff/panel/news?slug=${encodeURIComponent(slug)}`);
      const data = await res.json();

      if (data.success && data.news) {
        const n = data.news;
        setNewsId(n.id);
        setTitle(n.title || '');
        setCategory(n.category || 'General');
        setPublishedDate(
          n.published_date
            ? new Date(n.published_date).toISOString().split('T')[0]
            : ''
        );
        setIsPublished(Boolean(n.is_published));
        setSummary(n.summary || '');
        setContent(n.content || '');
        setImages(Array.isArray(n.images) ? n.images : []);
      } else {
        showToast(data.error || 'Failed to load news article', true);
      }
    } catch (err) {
      console.error('Fetch news error:', err);
      showToast('Network error while loading news article', true);
    } finally {
      setLoading(false);
    }
  }, [domain, slug, showToast]);

  useEffect(() => {
    document.title = 'Update';
    if (slug) {
      fetchNewsData();
    }
  }, [domain, slug, fetchNewsData]);

  // Upload more photos to Cloudinary and attach directly
  const handleUploadPhotos = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    let successCount = 0;

    try {
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'news');

        const res = await fetch(`/api/${domain}/staff/panel/upload`, {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();

        if (data.success && data.image_url) {
          // If we have an existing newsId, persist immediately to news images table
          if (newsId) {
            const imgRes = await fetch(`/api/${domain}/staff/panel/news/images`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                news_id: newsId,
                image_url: data.image_url,
                image_id: data.image_id || data.publicId || null,
                caption: '',
                is_cover: images.length === 0,
                display_order: images.length,
              }),
            });
            const imgData = await imgRes.json();
            if (imgData.success && imgData.image) {
              setImages((prev) => [...prev, imgData.image]);
              successCount++;
            }
          }
        }
      }

      if (successCount > 0) {
        showToast(`Uploaded ${successCount} photo(s) to article gallery.`);
      }
    } catch (err) {
      console.error('Upload photos error:', err);
      showToast('Network error uploading photos', true);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSetCover = async (imgId) => {
    try {
      const res = await fetch(`/api/${domain}/staff/panel/news/images`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: imgId,
          is_cover: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setImages((prev) =>
          prev.map((img) => ({
            ...img,
            is_cover: img.id === imgId,
          }))
        );
        showToast('Designated as article cover photo');
      }
    } catch (err) {
      console.error('Set cover error:', err);
    }
  };

  const handleUpdateCaption = async (imgId, newCaption) => {
    try {
      await fetch(`/api/${domain}/staff/panel/news/images`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: imgId,
          caption: newCaption,
        }),
      });
      setImages((prev) =>
        prev.map((img) => (img.id === imgId ? { ...img, caption: newCaption } : img))
      );
    } catch (err) {
      console.error('Update caption error:', err);
    }
  };

  const handleRemovePhoto = async (imgId) => {
    try {
      const res = await fetch(`/api/${domain}/staff/panel/news/images?id=${imgId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setImages((prev) => prev.filter((img) => img.id !== imgId));
        showToast('Photo removed from article gallery');
      }
    } catch (err) {
      console.error('Delete photo error:', err);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Article headline title is required', true);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: newsId,
        current_slug: slug,
        title: title.trim(),
        category: category.trim(),
        published_date: publishedDate || null,
        is_published: isPublished,
        summary: summary,
        content: content,
      };

      const res = await fetch(`/api/${domain}/staff/panel/news`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        showToast('News article updated successfully!');
        if (data.news?.slug && data.news.slug !== slug) {
          router.replace(`/${domain}/staff-panel/news-list/${data.news.slug}`);
        } else {
          fetchNewsData();
        }
      } else {
        showToast(data.error || 'Failed to update news article', true);
      }
    } catch (err) {
      console.error('Update news error:', err);
      showToast('Network error while saving changes', true);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/${domain}/staff/panel/news?id=${newsId}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.success) {
        showToast('News article deleted successfully');
        setTimeout(() => {
          router.push(`/${domain}/staff-panel/news-list`);
        }, 800);
      } else {
        showToast(data.error || 'Failed to delete news article', true);
      }
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Network error deleting article', true);
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full py-24 text-center text-slate-400">
        <FiRefreshCw className="inline-block animate-spin text-2xl mb-3 text-secondary" />
        <p className="text-xs font-semibold">Loading news article...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
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

      {/* Top Header & Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href={`/${domain}/staff-panel/news-list`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <FiArrowLeft className="text-sm" />
          <span>Back to News Articles</span>
        </Link>

        <button
          type="button"
          onClick={() => setDeleteConfirmOpen(true)}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 transition cursor-pointer flex items-center gap-1.5"
        >
          <FiTrash2 className="text-xs" />
          <span>Delete Article</span>
        </button>
      </div>

      {/* Main Update Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {/* Header (Title: Update) */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <h1 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <FiFileText className="text-lg" />
            </div>
            Update News Article
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Modify campus bulletin headline, category, multi-photo gallery, and rich story content.
          </p>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">
          {/* Headline Title */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Headline Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Annual Inter-School Science Fair 2026 Concludes with Grand Gala"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FiTag className="text-slate-400 text-xs" />
                <span>Article Category</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
              >
                {DEFAULT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FiCalendar className="text-slate-400 text-xs" />
                <span>Publication Date</span>
              </label>
              <input
                type="date"
                value={publishedDate}
                onChange={(e) => setPublishedDate(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
              />
            </div>
          </div>

          {/* Integrated Multi-Image Gallery Manager */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <FiImage className="text-blue-500 text-sm" />
                  <span>Article Photo Gallery & Cover Picture</span>
                  <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                    {images.length} photo{images.length !== 1 ? 's' : ''}
                  </span>
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Select which photo should serve as the article cover image by clicking the star badge.
                </p>
              </div>

              <label className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-secondary hover:bg-secondary-dark text-white shadow-xs cursor-pointer flex items-center gap-1.5 transition">
                <FiUploadCloud className="text-sm" />
                <span>{uploading ? 'Uploading...' : 'Add Photos'}</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleUploadPhotos}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>

            {images.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                {images.map((img) => (
                  <div
                    key={img.id}
                    className={`relative rounded-xl border p-2 flex flex-col justify-between transition-all ${
                      img.is_cover
                        ? 'border-secondary bg-secondary/5 dark:bg-secondary/10 shadow-xs ring-1 ring-secondary'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                    }`}
                  >
                    <div className="relative h-28 rounded-lg overflow-hidden bg-slate-900/10">
                      <img
                        src={img.image_url}
                        alt={img.caption || 'Photo'}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(img.id)}
                        className="absolute top-1.5 right-1.5 p-1 rounded-md bg-slate-900/70 hover:bg-rose-600 text-white text-xs transition cursor-pointer"
                        title="Remove photo"
                      >
                        <FiTrash2 />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSetCover(img.id)}
                        className={`absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition cursor-pointer ${
                          img.is_cover
                            ? 'bg-secondary text-white'
                            : 'bg-slate-900/70 text-slate-200 hover:bg-slate-900'
                        }`}
                      >
                        <FiStar className={`text-[10px] ${img.is_cover ? 'fill-white' : ''}`} />
                        <span>{img.is_cover ? 'Cover Photo' : 'Set as Cover'}</span>
                      </button>
                    </div>

                    <div className="mt-2">
                      <input
                        type="text"
                        placeholder="Add caption..."
                        defaultValue={img.caption || ''}
                        onBlur={(e) => handleUpdateCaption(img.id, e.target.value)}
                        className="w-full px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 text-center bg-slate-50/50 dark:bg-slate-800/20">
                <FiImage className="mx-auto text-2xl mb-1 text-slate-400" />
                <p className="text-xs text-slate-500">No photos attached yet. Click &quot;Add Photos&quot; to upload album pictures.</p>
              </div>
            )}
          </div>

          {/* Tiptap Rich Text Editor for Summary */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Executive Summary / Lead Paragraph
              </label>
              <span className="text-[11px] text-slate-400">Tiptap Rich Text</span>
            </div>
            <TiptapEditor
              value={summary}
              onChange={(html) => setSummary(html)}
              placeholder="A concise executive lead summarising the key highlights of the article..."
              minHeight="140px"
            />
          </div>

          {/* Tiptap Rich Text Editor for Full Content */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Full Article Story & Body Content
              </label>
              <span className="text-[11px] text-slate-400">Tiptap Rich Text</span>
            </div>
            <TiptapEditor
              value={content}
              onChange={(html) => setContent(html)}
              placeholder="Write the comprehensive news story, speech transcripts, event outcomes, quotes, and highlights..."
              minHeight="280px"
            />
          </div>

          {/* Published Status Toggle */}
          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="isPublished"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="w-4 h-4 rounded text-secondary focus:ring-secondary cursor-pointer"
            />
            <label htmlFor="isPublished" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
              Publish immediately on public campus news feed (Active)
            </label>
          </div>

          {/* Save Action Bar */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <Link
              href={`/${domain}/staff-panel/news-list`}
              className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving || uploading}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-secondary hover:bg-secondary-dark text-white shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <FiRefreshCw className="animate-spin text-xs" />
                  <span>Saving Updates...</span>
                </>
              ) : (
                <>
                  <FiSave className="text-xs" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-scale-up">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50">
                <FiTrash2 className="text-xl" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete News Article</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Are you sure you want to permanently delete this article? All associated gallery photos will also be removed.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
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
