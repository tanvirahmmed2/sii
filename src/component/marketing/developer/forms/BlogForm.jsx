'use client';

import axios from 'axios';
import { useState, useEffect, useRef } from 'react';

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

  const [gallery, setGallery] = useState([]); 
  const [pendingFiles, setPendingFiles] = useState([]); 
  const [customImageUrl, setCustomImageUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [showCloudinaryLibrary, setShowCloudinaryLibrary] = useState(false);
  const [cloudinaryAssets, setCloudinaryAssets] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(false);

  const fileInputRef = useRef(null);

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

  const handleTitleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      title: e.target.value,
    }));
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newItems = files.map((file, idx) => ({
      id: `pending_${Date.now()}_${idx}`,
      file,
      preview: URL.createObjectURL(file),
      caption: '',
      is_primary: gallery.length === 0 && pendingFiles.length === 0 && idx === 0,
    }));

    setPendingFiles((prev) => [...prev, ...newItems]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemovePending = (id) => {
    setPendingFiles((prev) => {
      const match = prev.find((p) => p.id === id);
      if (match?.preview) URL.revokeObjectURL(match.preview);
      return prev.filter((p) => p.id !== id);
    });
  };

  const handleRemoveGalleryImage = async (imgIdOrUrl) => {
    setGallery((prev) => prev.filter((img) => (img.id ? img.id !== imgIdOrUrl : img.image !== imgIdOrUrl)));
  };

  const handleSetPrimary = (targetId, isFromPending = false) => {
    if (isFromPending) {
      setGallery((prev) => prev.map((img) => ({ ...img, is_primary: false })));
      setPendingFiles((prev) =>
        prev.map((item) => ({ ...item, is_primary: item.id === targetId }))
      );
    } else {
      setPendingFiles((prev) => prev.map((item) => ({ ...item, is_primary: false })));
      setGallery((prev) =>
        prev.map((img) => ({
          ...img,
          is_primary: img.id ? img.id === targetId : img.image === targetId,
        }))
      );
    }
  };

  const handleAddCustomUrl = () => {
    if (!customImageUrl || !customImageUrl.trim().startsWith('http')) {
      setError('Please enter a valid HTTP/HTTPS image URL.');
      return;
    }
    const isFirst = gallery.length === 0 && pendingFiles.length === 0;
    setGallery((prev) => [
      ...prev,
      {
        id: null,
        image: customImageUrl.trim(),
        image_id: null,
        caption: '',
        is_primary: isFirst,
        display_order: prev.length,
      },
    ]);
    setCustomImageUrl('');
    setError('');
  };

  const handleOpenCloudinaryLibrary = async () => {
    setShowCloudinaryLibrary(true);
    setLoadingAssets(true);
    try {
      const res = await axios.get(`${apiEndpoint}?cloudinary_assets=true`);
      if (res.data?.success && Array.isArray(res.data.assets)) {
        setCloudinaryAssets(res.data.assets);
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
        setError(res.data?.error || 'Failed to save article.');
      }
    } catch (err) {
      console.error('Save article error:', err);
      setError(err.response?.data?.error || err.message || 'Error occurred while saving article.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded font-medium flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError('')}
            className="text-rose-500 hover:text-rose-800 text-sm font-semibold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded font-medium flex items-center justify-between">
          <span>{successMsg}</span>
          <button
            type="button"
            onClick={() => setSuccessMsg('')}
            className="text-emerald-500 hover:text-emerald-800 text-sm font-semibold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      <form onSubmit={(e) => handleSubmit(e, formData.is_published)} className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Article Title <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={handleTitleChange}
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category
              </label>
              <input
                type="text"
                list="category-suggestions"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
              />
              <datalist id="category-suggestions">
                {CATEGORY_SUGGESTIONS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Brief Description
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  {formData.excerpt.length} characters
                </span>
              </div>
              <textarea
                rows={3}
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Article Content Body <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={16}
                required
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full font-mono bg-white border border-slate-300 rounded p-3 text-xs text-slate-900 focus:outline-none focus:border-slate-800 leading-relaxed"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded p-4 space-y-3">
              <h3 className="text-xs font-semibold text-slate-900">
                Publishing Status
              </h3>

              <div className="flex items-center justify-between p-2.5 rounded bg-slate-50 border border-slate-200">
                <span className="text-xs font-normal text-slate-700">
                  {formData.is_published ? (
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200">
                      Live Published
                    </span>
                  ) : (
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded border bg-slate-100 text-slate-600 border-slate-200">
                      Draft Article
                    </span>
                  )}
                </span>

                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, is_published: !prev.is_published }))}
                  className="px-2.5 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-medium cursor-pointer"
                >
                  {formData.is_published ? 'Set as Draft' : 'Mark Published'}
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Publication Schedule
                </label>
                <input
                  type="datetime-local"
                  value={formData.published_at}
                  onChange={(e) => setFormData({ ...formData, published_at: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800 font-mono"
                />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-slate-900">
                    Featured Media &amp; Gallery
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Select a primary cover image for article cards
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenCloudinaryLibrary}
                  className="text-xs text-slate-600 hover:text-slate-900 font-medium underline cursor-pointer"
                >
                  Cloudinary
                </button>
              </div>

              {(gallery.length > 0 || pendingFiles.length > 0) && (
                <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1 border border-slate-100 rounded">
                  {gallery.map((img, idx) => (
                    <div
                      key={img.id || idx}
                      className={`relative group rounded border overflow-hidden aspect-video bg-slate-100 ${
                        img.is_primary ? 'border-slate-900 ring-2 ring-slate-900/10' : 'border-slate-200'
                      }`}
                    >
                      <img
                        src={img.image}
                        alt="Gallery upload"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
                        {!img.is_primary && (
                          <button
                            type="button"
                            onClick={() => handleSetPrimary(img.id || img.image, false)}
                            className="px-2 py-0.5 rounded bg-white text-slate-900 text-[10px] font-medium hover:bg-slate-100 cursor-pointer"
                          >
                            Set Cover
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveGalleryImage(img.id || img.image)}
                          className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-medium hover:bg-rose-700 cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                      {img.is_primary && (
                        <span className="absolute top-1 left-1 px-1.5 py-0.2 rounded text-[9px] font-medium bg-slate-900 text-white">
                          Cover
                        </span>
                      )}
                    </div>
                  ))}

                  {pendingFiles.map((item) => (
                    <div
                      key={item.id}
                      className={`relative group rounded border overflow-hidden aspect-video bg-slate-100 ${
                        item.is_primary ? 'border-slate-900 ring-2 ring-slate-900/10' : 'border-slate-200'
                      }`}
                    >
                      <img
                        src={item.preview}
                        alt="New upload"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
                        {!item.is_primary && (
                          <button
                            type="button"
                            onClick={() => handleSetPrimary(item.id, true)}
                            className="px-2 py-0.5 rounded bg-white text-slate-900 text-[10px] font-medium hover:bg-slate-100 cursor-pointer"
                          >
                            Set Cover
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemovePending(item.id)}
                          className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-medium hover:bg-rose-700 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                      <span className="absolute bottom-1 right-1 px-1.5 py-0.2 rounded text-[9px] font-medium bg-amber-500 text-white">
                        Pending
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <input
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  id="blog-gallery-upload"
                />
                <label
                  htmlFor="blog-gallery-upload"
                  className="w-full border border-dashed border-slate-300 hover:border-slate-800 rounded p-3 text-center cursor-pointer flex flex-col items-center justify-center gap-0.5 text-slate-600 transition-colors"
                >
                  <span className="text-xs font-medium text-slate-800">
                    Upload Images (Click to Select)
                  </span>
                  <span className="text-[10px] text-slate-400">PNG, JPG, WEBP</span>
                </label>

                <div className="flex items-center gap-1.5 pt-1">
                  <div className="flex-1">
                    <label className="sr-only">Image URL</label>
                    <input
                      type="url"
                      value={customImageUrl}
                      onChange={(e) => setCustomImageUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomUrl();
                        }
                      }}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCustomUrl}
                    className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-medium transition-colors cursor-pointer shrink-0"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded p-4 space-y-3">
              <h3 className="text-xs font-semibold text-slate-900">
                SEO &amp; Meta Tags
              </h3>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Meta Title
                </label>
                <input
                  type="text"
                  value={formData.meta_title}
                  onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Meta Description
                </label>
                <textarea
                  rows={2}
                  value={formData.meta_description}
                  onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div className="p-2.5 rounded bg-slate-50 border border-slate-200 space-y-1">
                <div className="text-[10px] uppercase font-semibold text-slate-400">
                  Preview
                </div>
                <div className="text-xs font-medium text-slate-900 truncate">
                  {formData.meta_title || formData.title || 'Untitled Article'}
                </div>
                <div className="text-[10px] text-slate-500 truncate font-mono">
                  /blogs/...
                </div>
                <div className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                  {formData.meta_description || formData.excerpt || 'Read the latest updates and insights.'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}

            {currentBlog?.slug && (
              <a
                href={`/blogs/${currentBlog.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium"
              >
                View Live
              </a>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              disabled={loading}
              onClick={(e) => handleSubmit(e, false)}
              className="flex-1 sm:flex-initial px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save as Draft'}
            </button>

            <button
              type="submit"
              disabled={loading}
              onClick={(e) => handleSubmit(e, true)}
              className="flex-1 sm:flex-initial px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Publishing...' : isEditing ? 'Update & Publish' : 'Publish Live'}
            </button>
          </div>
        </div>
      </form>

      {showCloudinaryLibrary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white border border-slate-200 rounded shadow-lg w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-3.5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Cloudinary Media Library
                </h3>
                <p className="text-xs text-slate-500">
                  Select an asset to add to the article gallery
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCloudinaryLibrary(false)}
                className="text-slate-400 hover:text-slate-700 p-1 text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto">
              {loadingAssets ? (
                <div className="p-12 flex justify-center items-center">
                  <div className="loader loader-sm" />
                </div>
              ) : cloudinaryAssets.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  No Cloudinary assets found.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {cloudinaryAssets.map((asset) => (
                    <button
                      key={asset.public_id}
                      type="button"
                      onClick={() => handleSelectCloudinaryAsset(asset)}
                      className="group relative rounded border border-slate-200 overflow-hidden hover:border-slate-800 text-left transition-all cursor-pointer aspect-video bg-slate-100"
                    >
                      <img
                        src={asset.secure_url}
                        alt={asset.public_id}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-slate-900/80 p-1 text-[10px] text-white truncate">
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
