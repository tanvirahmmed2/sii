'use client';

import axios from 'axios';
import { useState, useEffect, useRef } from 'react';
import {
  BiSave,
  BiImage,
  BiTrash,
  BiGlobe,
  BiCategory,
  BiBookContent,
  BiFile,
  BiCloudUpload,
  BiLinkExternal,
  BiRefresh,
  BiCheckCircle,
  BiStar,
  BiImages,
  BiPlus,
} from 'react-icons/bi';

const CATEGORY_SUGGESTIONS = [
  'Platform',
  'Engineering',
  'Education',
  'Guides & Tutorials',
  'Product Updates',
  'SaaS Insights',
  'School Management',
  'Announcements',
];

export default function BlogForm({
  blog = null,
  initialData = null,
  onSuccess,
  onCancel,
  apiEndpoint = '/api/marketing/developer/blogs',
}) {
  const currentBlog = blog || initialData;
  const isEditing = Boolean(currentBlog?.id);

  const [formData, setFormData] = useState({
    id: currentBlog?.id || '',
    title: currentBlog?.title || '',
    excerpt: currentBlog?.excerpt || currentBlog?.summary || '',
    content: currentBlog?.content || '',
    category: currentBlog?.category || 'Platform',
    meta_title: currentBlog?.meta_title || '',
    meta_description: currentBlog?.meta_description || '',
    is_published: Boolean(currentBlog?.is_published),
    published_at: currentBlog?.published_at
      ? new Date(currentBlog.published_at).toISOString().slice(0, 16)
      : '',
  });

  // Multiple image gallery management
  const [gallery, setGallery] = useState([]); // [{ id, image, image_id, caption, is_primary }]
  const [pendingFiles, setPendingFiles] = useState([]); // [{ id: string, file: File, preview: string, is_primary: boolean }]
  const [customImageUrl, setCustomImageUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Cloudinary Asset Picker state
  const [showCloudinaryLibrary, setShowCloudinaryLibrary] = useState(false);
  const [cloudinaryAssets, setCloudinaryAssets] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(false);

  const fileInputRef = useRef(null);

  // Sync state if initialData/blog changes
  useEffect(() => {
    if (currentBlog) {
      setFormData({
        id: currentBlog.id || '',
        title: currentBlog.title || '',
        excerpt: currentBlog.excerpt || currentBlog.summary || '',
        content: currentBlog.content || '',
        category: currentBlog.category || 'Platform',
        meta_title: currentBlog.meta_title || '',
        meta_description: currentBlog.meta_description || '',
        is_published: Boolean(currentBlog.is_published),
        published_at: currentBlog.published_at
          ? new Date(currentBlog.published_at).toISOString().slice(0, 16)
          : '',
      });

      // Initialize gallery from currentBlog.images or currentBlog.image
      let initialImages = [];
      if (Array.isArray(currentBlog.images) && currentBlog.images.length > 0) {
        initialImages = currentBlog.images.map((img, idx) => ({
          id: img.id,
          image: img.image,
          image_id: img.image_id,
          caption: img.caption || '',
          is_primary: img.is_primary !== undefined ? Boolean(img.is_primary) : idx === 0,
          display_order: img.display_order ?? idx,
        }));
      } else if (currentBlog.image) {
        initialImages = [
          {
            id: null,
            image: currentBlog.image,
            image_id: currentBlog.image_id || null,
            caption: '',
            is_primary: true,
            display_order: 0,
          },
        ];
      }
      setGallery(initialImages);
      setPendingFiles([]);
    }
  }, [currentBlog]);

  // Handle title changes
  const handleTitleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      title: e.target.value,
    }));
  };

  // Handle selecting multiple files
  const handleFilesSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newPending = files.map((file, idx) => ({
      id: `pending-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      file,
      preview: URL.createObjectURL(file),
      is_primary: gallery.length === 0 && idx === 0,
    }));

    setPendingFiles((prev) => [...prev, ...newPending]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Remove a pending file
  const handleRemovePendingFile = (id) => {
    setPendingFiles((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      const remaining = prev.filter((p) => p.id !== id);

      if (item?.is_primary) {
        if (gallery.length > 0) {
          setGallery((g) => g.map((img, i) => ({ ...img, is_primary: i === 0 })));
        } else if (remaining.length > 0) {
          remaining[0].is_primary = true;
        }
      }
      return remaining;
    });
  };

  // Remove an existing gallery image
  const handleRemoveGalleryImage = (index) => {
    setGallery((prev) => {
      const item = prev[index];
      const remaining = prev.filter((_, i) => i !== index);

      if (item?.is_primary) {
        if (remaining.length > 0) {
          remaining[0].is_primary = true;
        } else if (pendingFiles.length > 0) {
          setPendingFiles((p) => p.map((f, i) => ({ ...f, is_primary: i === 0 })));
        }
      }
      return remaining;
    });
  };

  // Set an image as primary cover image
  const handleSetPrimary = (targetId, isPending = false) => {
    if (isPending) {
      setPendingFiles((prev) =>
        prev.map((f) => ({ ...f, is_primary: f.id === targetId }))
      );
      setGallery((prev) => prev.map((g) => ({ ...g, is_primary: false })));
    } else {
      setGallery((prev) =>
        prev.map((g, idx) => ({
          ...g,
          is_primary: (g.id !== undefined && g.id !== null ? g.id : idx) === targetId,
        }))
      );
      setPendingFiles((prev) => prev.map((f) => ({ ...f, is_primary: false })));
    }
  };

  // Add custom URL image to gallery
  const handleAddCustomUrl = () => {
    const url = customImageUrl.trim();
    if (!url) return;
    const isFirst = gallery.length === 0 && pendingFiles.length === 0;
    setGallery((prev) => [
      ...prev,
      {
        id: null,
        image: url,
        image_id: null,
        caption: '',
        is_primary: isFirst,
        display_order: prev.length,
      },
    ]);
    setCustomImageUrl('');
    setSuccessMsg('Added image from URL.');
  };

  // Load Cloudinary library
  const loadCloudinaryLibrary = async () => {
    setShowCloudinaryLibrary(true);
    setLoadingAssets(true);
    setError('');

    try {
      const res = await axios.get(`${apiEndpoint}?cloudinary_assets=true`);
      if (res.data?.success && res.data?.assets) {
        setCloudinaryAssets(res.data.assets);
      } else {
        setError(res.data?.error || 'Failed to load Cloudinary library.');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Error fetching Cloudinary assets.');
    } finally {
      setLoadingAssets(false);
    }
  };

  const handleSelectCloudinaryAsset = (asset) => {
    const isFirst = gallery.length === 0 && pendingFiles.length === 0;
    setGallery((prev) => [
      ...prev,
      {
        id: null,
        image: asset.secure_url,
        image_id: asset.public_id,
        caption: '',
        is_primary: isFirst,
        display_order: prev.length,
      },
    ]);
    setShowCloudinaryLibrary(false);
    setSuccessMsg(`Added Cloudinary asset: ${asset.public_id}`);
  };

  // Form Submission
  const handleSubmit = async (e, publishOverride) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    const targetPublished =
      publishOverride !== undefined ? publishOverride : formData.is_published;

    try {
      let res;
      if (pendingFiles.length > 0) {
        const payloadData = new FormData();
        if (isEditing && formData.id) payloadData.append('id', String(formData.id));
        payloadData.append('title', formData.title.trim());
        payloadData.append('excerpt', formData.excerpt.trim());
        payloadData.append('content', formData.content.trim());
        payloadData.append('category', formData.category.trim());
        payloadData.append('meta_title', formData.meta_title.trim());
        payloadData.append('meta_description', formData.meta_description.trim());
        payloadData.append('is_published', String(targetPublished));
        if (formData.published_at) {
          payloadData.append('published_at', new Date(formData.published_at).toISOString());
        }

        payloadData.append('existing_images', JSON.stringify(gallery));

        pendingFiles.forEach((item) => {
          payloadData.append('files', item.file);
        });

        res = isEditing
          ? await axios.put(apiEndpoint, payloadData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            })
          : await axios.post(apiEndpoint, payloadData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
      } else {
        const payload = {
          title: formData.title.trim(),
          excerpt: formData.excerpt.trim(),
          content: formData.content.trim(),
          category: formData.category.trim(),
          meta_title: formData.meta_title.trim(),
          meta_description: formData.meta_description.trim(),
          is_published: targetPublished,
          published_at: formData.published_at ? new Date(formData.published_at).toISOString() : null,
          images: gallery,
        };

        if (isEditing && formData.id) {
          payload.id = formData.id;
        }

        res = isEditing
          ? await axios.put(apiEndpoint, payload)
          : await axios.post(apiEndpoint, payload);
      }

      if (res.data?.success && res.data?.record) {
        const saved = res.data.record;
        setSuccessMsg(
          targetPublished
            ? 'Article published live successfully!'
            : 'Article draft saved successfully!'
        );
        pendingFiles.forEach((p) => {
          if (p.preview) URL.revokeObjectURL(p.preview);
        });
        setPendingFiles([]);
        if (Array.isArray(saved.images)) {
          setGallery(saved.images);
        }
        if (onSuccess) onSuccess(saved);
      } else {
        setError(res.data?.error || 'Failed to save blog article.');
      }
    } catch (err) {
      console.error('Save blog error:', err);
      setError(err.response?.data?.error || err.message || 'Error saving article.');
    } finally {
      setLoading(false);
    }
  };

  const totalImagesCount = gallery.length + pendingFiles.length;

  return (
    <div className="space-y-6">
      {/* Messages */}
      {error && (
        <div className="p-4 rounded bg-rose-50 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between gap-2">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError('')}
            className="text-rose-500 hover:text-rose-800 dark:hover:text-rose-200 font-medium cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <BiCheckCircle className="text-base shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg('')}
            className="text-emerald-500 hover:text-emerald-800 dark:hover:text-emerald-200 font-medium cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      <form onSubmit={(e) => handleSubmit(e, formData.is_published)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Column (2 spans) */}
          <div className="lg:col-span-2 space-y-5">
            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Article Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. The Future of Online Learning in 2026"
                value={formData.title}
                onChange={handleTitleChange}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-blue-600 transition-colors"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <BiCategory className="text-sm text-slate-400" />
                <span>Category</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  list="category-suggestions"
                  placeholder="e.g. Engineering, Education, Guides..."
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-blue-600 transition-colors"
                />
                <datalist id="category-suggestions">
                  {CATEGORY_SUGGESTIONS.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Excerpt / Brief Description */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Brief Description (Shown on Top of Article)
                </label>
                <span className="text-[10px] text-slate-400">
                  {formData.excerpt.length} characters
                </span>
              </div>
              <textarea
                rows={3}
                placeholder="A concise, high-level summary displayed boldly at the top of the article."
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-blue-600 transition-colors"
              />
            </div>

            {/* Content Body */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <BiBookContent className="text-sm text-slate-400" />
                <span>Article Description &amp; Content Body</span>
                <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={16}
                required
                placeholder="Write full article description here. This content will be interleaved with gallery images."
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded p-3.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-blue-600 transition-colors leading-relaxed"
              />
            </div>
          </div>

          {/* Sidebar Settings Column (1 span) */}
          <div className="space-y-5">
            {/* Publishing Status Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-3.5 shadow-xs">
              <h3 className="text-xs font-medium uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <BiFile className="text-sm text-blue-600 dark:text-blue-400" />
                <span>Publishing Status</span>
              </h3>

              <div className="flex items-center justify-between p-2.5 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-normal text-slate-700 dark:text-slate-300">
                  {formData.is_published ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                      <BiCheckCircle /> Live Published
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                      Draft (Private)
                    </span>
                  )}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      is_published: !prev.is_published,
                    }))
                  }
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                    formData.is_published
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 hover:bg-amber-200'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-200'
                  }`}
                >
                  {formData.is_published ? 'Set as Draft' : 'Mark Published'}
                </button>
              </div>

              {formData.is_published && (
                <div>
                  <label className="block text-[11px] font-normal text-slate-500 mb-1">
                    Published Timestamp
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.published_at}
                    onChange={(e) => setFormData({ ...formData, published_at: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              )}
            </div>

            {/* Multiple Images Gallery Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-medium uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <BiImages className="text-sm text-blue-600 dark:text-blue-400" />
                  <span>Article Images ({totalImagesCount})</span>
                </h3>

                <button
                  type="button"
                  onClick={loadCloudinaryLibrary}
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <BiPlus />
                  <span>Cloudinary</span>
                </button>
              </div>

              {/* Gallery Grid (Existing + Pending Images) */}
              {totalImagesCount > 0 ? (
                <div className="grid grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                  {/* Existing Saved Images */}
                  {gallery.map((img, idx) => {
                    const imgKey = img.id ? `img-${img.id}` : `url-${idx}`;
                    const targetId = img.id !== undefined && img.id !== null ? img.id : idx;
                    return (
                      <div
                        key={imgKey}
                        className={`group relative aspect-video rounded overflow-hidden border transition-all ${
                          img.is_primary
                            ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800'
                        }`}
                      >
                        <img
                          src={img.image}
                          alt={img.caption || `Image ${idx + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src =
                              'https://placehold.co/400x250/f1f5f9/94a3b8?text=Image+Not+Found';
                          }}
                        />

                        {/* Primary Badge */}
                        {img.is_primary && (
                          <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-medium uppercase tracking-wider flex items-center gap-0.5 shadow-xs">
                            <BiStar className="text-[10px]" /> Cover
                          </div>
                        )}

                        {/* Hover Overlay Actions */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-1">
                          {!img.is_primary && (
                            <button
                              type="button"
                              onClick={() => handleSetPrimary(targetId, false)}
                              className="p-1.5 rounded-full bg-slate-800 hover:bg-emerald-600 text-white transition-colors cursor-pointer"
                              title="Set as First/Cover Image"
                            >
                              <BiStar className="text-xs" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveGalleryImage(idx)}
                            className="p-1.5 rounded-full bg-slate-800 hover:bg-rose-600 text-white transition-colors cursor-pointer"
                            title="Remove image"
                          >
                            <BiTrash className="text-xs" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Pending Upload Files */}
                  {pendingFiles.map((item) => (
                    <div
                      key={item.id}
                      className={`group relative aspect-video rounded overflow-hidden border transition-all ${
                        item.is_primary
                          ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                          : 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/40'
                      }`}
                    >
                      <img
                        src={item.preview}
                        alt="Pending Upload"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-blue-600 text-white text-[9px] font-medium tracking-wide">
                        Pending
                      </div>

                      {item.is_primary && (
                        <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-medium flex items-center gap-0.5">
                          <BiStar /> Cover
                        </div>
                      )}

                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-1">
                        {!item.is_primary && (
                          <button
                            type="button"
                            onClick={() => handleSetPrimary(item.id, true)}
                            className="p-1.5 rounded-full bg-slate-800 hover:bg-emerald-600 text-white transition-colors cursor-pointer"
                            title="Set as First/Cover Image"
                          >
                            <BiStar className="text-xs" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemovePendingFile(item.id)}
                          className="p-1.5 rounded-full bg-slate-800 hover:bg-rose-600 text-white transition-colors cursor-pointer"
                          title="Remove file"
                        >
                          <BiTrash className="text-xs" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 px-3 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded bg-slate-50/50 dark:bg-slate-900/50">
                  <BiImage className="text-2xl text-slate-400 mx-auto mb-1" />
                  <p className="text-xs text-slate-500">No images attached yet.</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Upload one or multiple images below.</p>
                </div>
              )}

              {/* Multi-file Upload Input */}
              <div className="space-y-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  accept="image/*"
                  onChange={handleFilesSelect}
                  className="hidden"
                  id="blog-gallery-upload"
                />
                <label
                  htmlFor="blog-gallery-upload"
                  className="w-full border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 rounded p-3 text-center cursor-pointer flex flex-col items-center justify-center gap-1 text-slate-600 dark:text-slate-400 transition-colors"
                >
                  <BiCloudUpload className="text-xl text-slate-400" />
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    Upload Images (Select one or multiple)
                  </span>
                  <span className="text-[10px] text-slate-400">PNG, JPG, WEBP up to 10MB</span>
                </label>

                {/* Direct URL input fallback */}
                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    type="url"
                    placeholder="Or paste image URL (https://...)"
                    value={customImageUrl}
                    onChange={(e) => setCustomImageUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomUrl();
                      }
                    }}
                    className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-blue-600"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomUrl}
                    className="px-2.5 py-1.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors cursor-pointer shrink-0"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* SEO & Search Engine Optimization Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-3.5 shadow-xs">
              <h3 className="text-xs font-medium uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <BiGlobe className="text-sm text-blue-600 dark:text-blue-400" />
                <span>SEO &amp; Meta Tags</span>
              </h3>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Meta Title
                </label>
                <input
                  type="text"
                  placeholder={formData.title || 'Page title for search engines'}
                  value={formData.meta_title}
                  onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Meta Description
                </label>
                <textarea
                  rows={2}
                  placeholder={formData.excerpt || 'Brief description snippet shown in Google search results...'}
                  value={formData.meta_description}
                  onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-blue-600"
                />
              </div>

              {/* SERP Search Result Preview */}
              <div className="p-3 rounded bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 space-y-1">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                  Google Preview
                </div>
                <div className="text-xs font-medium text-blue-700 dark:text-blue-400 truncate">
                  {formData.meta_title || formData.title || 'Untitled Article'}
                </div>
                <div className="text-[10px] text-emerald-700 dark:text-emerald-400 truncate font-mono">
                  https://yoursite.com/blogs/...
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {formData.meta_description || formData.excerpt || 'Read the latest updates and insights on our educational platform.'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions Bar */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}

            {currentBlog?.slug && (
              <a
                href={`/blogs/${currentBlog.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-2 text-xs text-slate-500 hover:text-blue-600 dark:hover:text-blue-400"
              >
                <BiLinkExternal className="text-sm" />
                <span>View Live</span>
              </a>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              disabled={loading}
              onClick={(e) => handleSubmit(e, false)}
              className="flex-1 sm:flex-initial px-4 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save as Draft'}
            </button>

            <button
              type="submit"
              disabled={loading}
              onClick={(e) => handleSubmit(e, true)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <BiSave className="text-base" />
              <span>{loading ? 'Publishing...' : isEditing ? 'Update & Publish' : 'Publish Live'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Cloudinary Asset Picker Modal */}
      {showCloudinaryLibrary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-slate-900 dark:text-white">
                  Cloudinary Media Library
                </h3>
                <p className="text-xs text-slate-500">
                  Select an asset to add to the article gallery
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCloudinaryLibrary(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto">
              {loadingAssets ? (
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <BiRefresh className="text-2xl mx-auto animate-spin" />
                  <p className="text-xs">Loading Cloudinary assets...</p>
                </div>
              ) : cloudinaryAssets.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  No Cloudinary assets found or credentials not configured.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {cloudinaryAssets.map((asset) => (
                    <button
                      key={asset.public_id}
                      type="button"
                      onClick={() => handleSelectCloudinaryAsset(asset)}
                      className="group relative rounded border border-slate-200 dark:border-slate-700 overflow-hidden hover:ring-2 hover:ring-blue-600 text-left transition-all cursor-pointer aspect-video bg-slate-100 dark:bg-slate-800"
                    >
                      <img
                        src={asset.secure_url}
                        alt={asset.public_id}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1.5 text-[10px] text-white truncate">
                        {asset.public_id}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
