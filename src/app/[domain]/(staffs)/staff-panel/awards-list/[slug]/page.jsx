/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  FiAward,
  FiUploadCloud,
  FiTrash2,
  FiCheckCircle,
  FiXCircle,
  FiArrowLeft,
  FiSave,
  FiRefreshCw,
  FiImage,
  FiCalendar,
  FiCompass,
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

export default function UpdateAwardPage() {
  const params = useParams();
  const router = useRouter();
  const domain = params?.domain || '';
  const slug = params?.slug || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [awardId, setAwardId] = useState(null);

  // Form Fields (NO slug shown or edited in frontend)
  const [title, setTitle] = useState('');
  const [year, setYear] = useState('');
  const [issuer, setIssuer] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Single Image State (Strictly 1 image for Award)
  const [image, setImage] = useState(null); // { image_url, image_id, caption }
  const [removeImage, setRemoveImage] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

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

  const fetchAwardData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/${domain}/staff/panel/awards?slug=${encodeURIComponent(slug)}`);
      const data = await res.json();

      if (data.success && data.award) {
        const a = data.award;
        setAwardId(a.id);
        setTitle(a.title || '');
        setYear(a.year ? a.year.toString() : '');
        setIssuer(a.issuer || '');
        setDescription(a.description || '');
        setIsActive(Boolean(a.is_active));
        if (a.image_url) {
          setImage({
            image_url: a.image_url,
            image_id: a.image_id,
            caption: a.image_caption || '',
          });
        } else {
          setImage(null);
        }
      } else {
        showToast(data.error || 'Failed to load award record', true);
      }
    } catch (err) {
      console.error('Fetch award error:', err);
      showToast('Network error while loading award details', true);
    } finally {
      setLoading(false);
    }
  }, [domain, slug, showToast]);

  useEffect(() => {
    document.title = 'Update';
    if (slug) {
      fetchAwardData();
    }
  }, [domain, slug, fetchAwardData]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'awards');

      const res = await fetch(`/api/${domain}/staff/panel/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.success && data.image_url) {
        setImage({
          image_url: data.image_url,
          image_id: data.image_id || data.publicId || null,
          caption: image?.caption || '',
        });
        setRemoveImage(false);
        showToast('Photo uploaded to Cloudinary');
      } else {
        showToast(data.error || 'Failed to upload photo', true);
      }
    } catch (err) {
      console.error('Upload error:', err);
      showToast('Network error while uploading photo', true);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Award title is required', true);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: awardId,
        current_slug: slug,
        title: title.trim(),
        year: year ? parseInt(year, 10) : null,
        issuer: issuer.trim() || null,
        description: description,
        is_active: isActive,
        remove_image: removeImage,
        image: !removeImage && image ? image : null,
      };

      const res = await fetch(`/api/${domain}/staff/panel/awards`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        showToast('Award updated successfully!');
        if (data.award?.slug && data.award.slug !== slug) {
          router.replace(`/${domain}/staff-panel/awards-list/${data.award.slug}`);
        } else {
          fetchAwardData();
        }
      } else {
        showToast(data.error || 'Failed to update award', true);
      }
    } catch (err) {
      console.error('Update award error:', err);
      showToast('Network error while saving changes', true);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/${domain}/staff/panel/awards?id=${awardId}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.success) {
        showToast('Award deleted successfully');
        setTimeout(() => {
          router.push(`/${domain}/staff-panel/awards-list`);
        }, 800);
      } else {
        showToast(data.error || 'Failed to delete award', true);
      }
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Network error deleting award', true);
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full py-24 text-center text-slate-400">
        <FiRefreshCw className="inline-block animate-spin text-2xl mb-3 text-secondary" />
        <p className="text-xs font-semibold">Loading award details...</p>
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
          href={`/${domain}/staff-panel/awards-list`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <FiArrowLeft className="text-sm" />
          <span>Back to Awards List</span>
        </Link>

        <button
          type="button"
          onClick={() => setDeleteConfirmOpen(true)}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 transition cursor-pointer flex items-center gap-1.5"
        >
          <FiTrash2 className="text-xs" />
          <span>Delete Award</span>
        </button>
      </div>

      {/* Main Update Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {/* Header (Title: Update) */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <h1 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <FiAward className="text-lg" />
            </div>
            Update Award
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Modify institutional award recognition, year, granting body, trophy photo, and full citation.
          </p>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">
          {/* Main Info */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Award Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. National Championship in Science Olympiad"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FiCalendar className="text-slate-400 text-xs" />
                <span>Award Year</span>
              </label>
              <input
                type="number"
                min="1950"
                max="2100"
                placeholder="2026"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FiCompass className="text-slate-400 text-xs" />
                <span>Granting Body / Issuer</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Ministry of Education / STEM Council"
                value={issuer}
                onChange={(e) => setIssuer(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition"
              />
            </div>
          </div>

          {/* Trophy Photograph Section (Strictly Single Image) */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <FiImage className="text-amber-500 text-sm" />
                <span>Trophy / Certificate Photograph</span>
                <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                  Strictly single image
                </span>
              </label>

              {image && !removeImage && (
                <button
                  type="button"
                  onClick={() => setRemoveImage(true)}
                  className="text-xs text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <FiTrash2 className="text-xs" /> Remove photo
                </button>
              )}
            </div>

            {!removeImage && image ? (
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row items-center gap-4">
                <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 bg-slate-900/10">
                  <img src={image.image_url} alt="Award photo" className="w-full h-full object-cover" />
                </div>
                <div className="space-y-2 flex-1 w-full">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <FiCheckCircle /> Cloudinary CDN Stored
                    </span>
                    <label className="text-xs font-semibold text-secondary hover:underline cursor-pointer">
                      <span>Replace Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                      Photo Caption (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Trophy receiving ceremony on stage"
                      value={image.caption || ''}
                      onChange={(e) => setImage({ ...image, caption: e.target.value })}
                      className="mt-1 w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-secondary rounded-2xl p-6 text-center transition-all bg-slate-50/50 dark:bg-slate-800/20">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={uploadingImage}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                  <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                    {uploadingImage ? (
                      <FiRefreshCw className="animate-spin text-xl text-secondary" />
                    ) : (
                      <FiUploadCloud className="text-2xl" />
                    )}
                  </div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {uploadingImage ? 'Uploading photo to Cloudinary...' : 'Click or drop photo here to upload'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Supports high-resolution PNG, JPG, WEBP.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Tiptap Rich Text Editor for Description */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Award Citation & Full Description
              </label>
              <span className="text-[11px] text-slate-400">Tiptap Rich Text</span>
            </div>
            <TiptapEditor
              value={description}
              onChange={(html) => setDescription(html)}
              placeholder="Detail the recognition context, jury citation, candidate achievements, and impact..."
              minHeight="220px"
            />
          </div>

          {/* Active Status Toggle */}
          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-secondary focus:ring-secondary cursor-pointer"
            />
            <label htmlFor="isActive" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
              Display on public awards showcase page (Active)
            </label>
          </div>

          {/* Save Action Bar */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <Link
              href={`/${domain}/staff-panel/awards-list`}
              className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving || uploadingImage}
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
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Award Entry</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Are you sure you want to permanently delete this award? This action cannot be undone.
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
