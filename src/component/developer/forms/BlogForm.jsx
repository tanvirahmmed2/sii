'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  BiFile,
  BiCheck,
  BiX,
  BiImage,
  BiPlus,
  BiTrash,
  BiLoaderAlt,
  BiGlobe,
  BiTimeFive,
  BiUpload,
  BiCloudUpload,
  BiImages,
  BiCheckCircle,
} from 'react-icons/bi';

export default function BlogForm({
  blog = null,
  initialData = null,
  apps = [],
  onSuccess,
  onCancel,
  apiEndpoint = '/api/developer/blogs',
}) {
  const currentBlog = blog || initialData;
  const isEditing = Boolean(currentBlog?.id);

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    summary: '',
    content: '',
    app_id: '',
    is_published: false,
  });

  // Saved images from blogs_image
  const [images, setImages] = useState([]);
  // Local pending file uploads
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState(null);

  // Cloudinary Asset Picker Modal state
  const [showCloudinaryLibrary, setShowCloudinaryLibrary] = useState(false);
  const [cloudinaryAssets, setCloudinaryAssets] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [attachingAssetId, setAttachingAssetId] = useState(null);

  const [fetchedApps, setFetchedApps] = useState([]);
  const availableApps = apps && apps.length > 0 ? apps : fetchedApps;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fileInputRef = useRef(null);

  // Fetch available apps if not provided
  useEffect(() => {
    if (!apps || apps.length === 0) {
      let active = true;
      axios
        .get(apiEndpoint)
        .then((res) => {
          if (active && res.data?.apps) setFetchedApps(res.data.apps);
        })
        .catch(() => {});
      return () => {
        active = false;
      };
    }
  }, [apps, apiEndpoint]);

  // Sync state with incoming blog data when currentBlog changes
  const [prevBlogId, setPrevBlogId] = useState(currentBlog?.id);
  if (currentBlog?.id !== prevBlogId) {
    setPrevBlogId(currentBlog?.id);
    if (currentBlog) {
      setFormData({
        title: currentBlog.title || '',
        slug: currentBlog.slug || '',
        summary: currentBlog.summary || '',
        content: currentBlog.content || '',
        app_id: currentBlog.app_id ? String(currentBlog.app_id) : '',
        is_published: Boolean(currentBlog.is_published),
      });
      setImages(Array.isArray(currentBlog.images) ? currentBlog.images : []);
    } else {
      setFormData({
        title: '',
        slug: '',
        summary: '',
        content: '',
        app_id: '',
        is_published: false,
      });
      setImages([]);
    }
  }

  // Load existing Cloudinary account assets
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

  // Attach an existing Cloudinary asset to this blog
  const handleAttachExistingAsset = async (asset) => {
    if (!currentBlog?.id) {
      setError('Please save the blog draft first before attaching gallery assets.');
      return;
    }

    setAttachingAssetId(asset.public_id);
    setError('');
    setSuccessMsg('');

    try {
      const res = await axios.put(apiEndpoint, {
        id: currentBlog.id,
        public_id: asset.public_id,
        asset_id: asset.asset_id,
        secure_url: asset.secure_url,
        image_title: formData.title || 'Blog Image',
      });

      if (res.data?.success && res.data?.images) {
        setImages(res.data.images);
        setSuccessMsg(`Attached "${asset.public_id}" from Cloudinary.`);
      } else {
        setError(res.data?.error || 'Failed to attach Cloudinary asset.');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Error attaching asset.');
    } finally {
      setAttachingAssetId(null);
    }
  };

  // Handle local file selection
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setSelectedFiles((prev) => [...prev, ...files]);

    const newPreviews = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      name: file.name,
      size: (file.size / 1024).toFixed(1) + ' KB',
    }));

    setFilePreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeSelectedFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setFilePreviews((prev) => {
      const removed = prev[index];
      if (removed?.url) URL.revokeObjectURL(removed.url);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Upload selected files directly to Cloudinary via backend
  const handleUploadFilesToCloudinary = async () => {
    if (selectedFiles.length === 0) return;
    if (!currentBlog?.id) {
      setError('Please save the article first before uploading standalone images.');
      return;
    }

    setUploadingImages(true);
    setError('');
    setSuccessMsg('');

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('id', String(currentBlog.id));

      selectedFiles.forEach((file) => {
        uploadFormData.append('images', file);
      });

      const res = await axios.put(apiEndpoint, uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success && res.data?.images) {
        setImages(res.data.images);
        setSelectedFiles([]);
        setFilePreviews([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setSuccessMsg('Images uploaded to Cloudinary and saved to blogs_image.');
      } else {
        setError(res.data?.error || 'Failed to upload images to Cloudinary.');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Error uploading images.');
    } finally {
      setUploadingImages(false);
    }
  };

  // Delete an image from Cloudinary & blogs_image
  const handleDeleteImage = async (imageId) => {
    if (!confirm('Are you sure you want to permanently delete this image from Cloudinary?')) return;
    setDeletingImageId(imageId);
    setError('');
    setSuccessMsg('');

    try {
      const res = await axios.delete(`${apiEndpoint}?image_id=${imageId}`);
      if (res.data?.success) {
        setImages((prev) => prev.filter((img) => img.id !== imageId));
        setSuccessMsg('Image deleted from Cloudinary and database.');
      } else {
        setError(res.data?.error || 'Failed to delete image.');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Error deleting image.');
    } finally {
      setDeletingImageId(null);
    }
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
      // 1. If we have pending files and we are editing, upload them via multipart
      if (selectedFiles.length > 0 && isEditing) {
        const uploadFormData = new FormData();
        uploadFormData.append('id', String(currentBlog.id));
        uploadFormData.append('title', formData.title);
        uploadFormData.append('summary', formData.summary);
        uploadFormData.append('content', formData.content);
        uploadFormData.append('is_published', String(targetPublished));
        if (formData.app_id) uploadFormData.append('app_id', String(formData.app_id));

        selectedFiles.forEach((file) => {
          uploadFormData.append('images', file);
        });

        const res = await axios.put(apiEndpoint, uploadFormData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (res.data?.success && res.data?.record) {
          setSelectedFiles([]);
          setFilePreviews([]);
          if (fileInputRef.current) fileInputRef.current.value = '';
          if (res.data.record.images) setImages(res.data.record.images);
          setSuccessMsg(
            targetPublished
              ? 'Blog published successfully with uploaded images!'
              : 'Draft article saved successfully.'
          );
          if (onSuccess) onSuccess(res.data.record);
          return;
        } else {
          setError(res.data?.error || 'Failed to update blog.');
          return;
        }
      }

      // 2. Standard JSON submission
      const payload = {
        title: formData.title,
        summary: formData.summary,
        content: formData.content,
        app_id: formData.app_id ? Number(formData.app_id) : null,
        is_published: targetPublished,
      };

      if (isEditing) {
        payload.id = currentBlog.id;
      }

      const res = isEditing
        ? await axios.put(apiEndpoint, payload)
        : await axios.post(apiEndpoint, payload);

      if (res.data?.success && res.data?.record) {
        setSuccessMsg(
          targetPublished
            ? 'Blog published successfully!'
            : 'Blog draft saved successfully.'
        );
        if (res.data.record.images) {
          setImages(res.data.record.images);
        }
        if (onSuccess) onSuccess(res.data.record);
      } else {
        setError(res.data?.error || 'Failed to save blog post.');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Network error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs mb-6 transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-xl font-bold">
            <BiFile />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-800">
                {isEditing ? `Edit Article: ${formData.title || 'Untitled'}` : 'New Platform Blog Article'}
              </h3>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                  formData.is_published
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {formData.is_published ? (
                  <>
                    <BiGlobe className="text-xs" /> Published
                  </>
                ) : (
                  <>
                    <BiTimeFive className="text-xs" /> Draft
                  </>
                )}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {isEditing
                ? 'Manage article copy, associate ecosystem apps, and upload Cloudinary gallery images.'
                : 'Initialize an article draft for creators and ecosystem developers.'}
            </p>
          </div>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
            aria-label="Close"
          >
            <BiX className="text-xl" />
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="p-3 mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
          {successMsg}
        </div>
      )}

      <form onSubmit={(e) => handleSubmit(e)} className="space-y-5">
        {/* Title */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-slate-700">Article Title *</label>
          </div>
          <input
            type="text"
            required
            placeholder="e.g. 10 Architecture Patterns Dominating 2026"
            value={formData.title}
            onChange={(e) => {
              const newTitle = e.target.value;
              const autoSlug = newTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
              setFormData((prev) => ({ ...prev, title: newTitle, slug: autoSlug || prev.slug }));
            }}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-secondary focus:bg-white transition-colors"
          />
        </div>

        {/* Associated Ecosystem App */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Associated Ecosystem App <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <select
            value={formData.app_id}
            onChange={(e) => setFormData({ ...formData, app_id: e.target.value })}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-secondary focus:bg-white transition-colors"
          >
            <option value="">-- No App Linked (General Platform Article) --</option>
            {availableApps.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title} ({a.slug})
              </option>
            ))}
          </select>
        </div>

        {/* Summary */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Brief Summary</label>
          <textarea
            rows={2}
            placeholder="Short overview snippet for card previews, search results, and social feeds..."
            value={formData.summary}
            onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-secondary focus:bg-white transition-colors"
          />
        </div>

        {/* Body Content */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Article Body Content *</label>
          <textarea
            rows={7}
            required
            placeholder="Write full article content (HTML or Markdown supported)..."
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-secondary focus:bg-white transition-colors font-mono text-xs leading-relaxed"
          />
        </div>

        {/* Publication Status Toggle */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-800">Publication Status</div>
            <p className="text-[11px] text-slate-500">
              When published, this article will appear publicly in the /blogs directory and RSS feeds.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_published}
              onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            <span className="ml-2 text-xs font-bold text-slate-700">
              {formData.is_published ? 'Published' : 'Draft'}
            </span>
          </label>
        </div>

        {/* ========================================================================= */}
        {/* Cloudinary Gallery Images (blogs_image table) */}
        {/* ========================================================================= */}
        <div className="border border-slate-200 rounded-xl p-5 space-y-4 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <BiImage className="text-primary text-base" />
                <span>Gallery Images (blogs_image table)</span>
              </h4>
              <p className="text-[11px] text-slate-500">
                Upload image files to Cloudinary or attach existing assets. The first image serves as the article cover thumbnail.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadCloudinaryLibrary}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 hover:border-slate-400 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <BiImages className="text-sm" />
                <span>Cloudinary Assets</span>
              </button>
              <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700">
                {images.length} saved
              </span>
            </div>
          </div>

          {/* Saved Cloudinary Gallery Images */}
          {images.length > 0 ? (
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                Saved Images in Cloudinary
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {images.map((img, idx) => {
                  const imgUrl = img.image_url || img.image;
                  const isCover = idx === 0;

                  return (
                    <div
                      key={img.id || idx}
                      className="group relative rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden shadow-xs flex flex-col justify-between"
                    >
                      <div className="aspect-video bg-slate-100 overflow-hidden relative">
                        <img
                          src={imgUrl}
                          alt={img.alt_text || img.title || 'Blog image'}
                          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                          onError={(e) => {
                            e.currentTarget.src =
                              'https://placehold.co/600x400/f1f5f9/94a3b8?text=Image+Unavailable';
                          }}
                        />

                        {isCover && (
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-primary text-slate-900 font-extrabold text-[10px] shadow-xs">
                            Primary Cover
                          </div>
                        )}

                        <button
                          type="button"
                          disabled={deletingImageId === img.id}
                          onClick={() => handleDeleteImage(img.id)}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/95 hover:bg-rose-600 hover:text-white text-rose-600 transition-colors shadow-xs cursor-pointer"
                          title="Delete image from Cloudinary"
                        >
                          {deletingImageId === img.id ? (
                            <BiLoaderAlt className="animate-spin text-sm" />
                          ) : (
                            <BiTrash className="text-sm" />
                          )}
                        </button>
                      </div>

                      <div className="p-2.5 text-[11px] space-y-1">
                        <div className="font-semibold text-slate-800 truncate">
                          {img.title || img.alt_text || 'Untitled Image'}
                        </div>
                        {img.caption && (
                          <div className="text-slate-500 italic truncate text-[10px]">
                            &ldquo;{img.caption}&rdquo;
                          </div>
                        )}
                        <div className="font-mono text-[9px] text-slate-400 truncate">
                          {img.image_id || imgUrl}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
              No gallery images saved yet. Upload images below to store them in Cloudinary.
            </div>
          )}

          {/* Local File Selection Dropzone */}
          <div className="border border-dashed border-slate-300 hover:border-secondary rounded-xl p-4 bg-slate-50/60 transition-colors text-center space-y-3">
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              id="blog-image-file-input"
            />
            <label
              htmlFor="blog-image-file-input"
              className="cursor-pointer inline-flex flex-col items-center justify-center gap-1.5 text-slate-600 hover:text-secondary"
            >
              <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xl shadow-xs">
                <BiUpload />
              </div>
              <span className="text-xs font-bold text-slate-800">
                Click to browse images or drag files here
              </span>
              <span className="text-[11px] text-slate-400">
                PNG, JPG, WEBP, GIF up to 10MB each
              </span>
            </label>

            {/* Selected File Previews */}
            {filePreviews.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    Selected Files to Upload ({filePreviews.length}):
                  </span>
                  {isEditing && (
                    <button
                      type="button"
                      disabled={uploadingImages}
                      onClick={handleUploadFilesToCloudinary}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-white text-xs font-bold hover:bg-secondary-dark transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {uploadingImages ? (
                        <>
                          <BiLoaderAlt className="animate-spin text-sm" />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <BiCloudUpload className="text-base" />
                          <span>Upload Now to Cloudinary</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {filePreviews.map((prev, idx) => (
                    <div
                      key={idx}
                      className="relative rounded-xl border border-amber-200 bg-amber-50/50 p-2 flex items-center gap-3"
                    >
                      <img
                        src={prev.url}
                        alt="Preview"
                        className="w-12 h-12 object-cover rounded-lg border border-amber-200 shrink-0"
                      />
                      <div className="min-w-0 flex-1 text-left">
                        <div className="text-xs font-semibold text-slate-800 truncate">
                          {prev.name}
                        </div>
                        <div className="text-[10px] text-slate-500">{prev.size}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSelectedFile(idx)}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-white transition-colors"
                        title="Remove file"
                      >
                        <BiX className="text-lg" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Quick Actions:</span>
            <button
              type="button"
              disabled={loading}
              onClick={(e) => handleSubmit(e, true)}
              className="px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-colors cursor-pointer"
            >
              Save &amp; Publish Live
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={(e) => handleSubmit(e, false)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Save as Draft
            </button>
          </div>

          <div className="flex items-center gap-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary hover:bg-primary-dark text-slate-900 text-xs font-bold shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
            >
              {loading ? (
                <>
                  <BiLoaderAlt className="animate-spin text-base" />
                  <span>Saving Article...</span>
                </>
              ) : (
                <>
                  <BiCheck className="text-base" />
                  <span>{isEditing ? 'Save Changes' : 'Initialize Article'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* ========================================================================= */}
      {/* Cloudinary Asset Library Modal */}
      {/* ========================================================================= */}
      {showCloudinaryLibrary && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center text-xl">
                  <BiImages />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Cloudinary Media Library</h3>
                  <p className="text-[11px] text-slate-500">
                    Select an existing uploaded asset to attach to this blog gallery.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCloudinaryLibrary(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <BiX className="text-xl" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1">
              {loadingAssets ? (
                <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                  <BiLoaderAlt className="animate-spin text-3xl text-secondary" />
                  <span className="text-xs">Loading Cloudinary media assets...</span>
                </div>
              ) : cloudinaryAssets.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-xs">
                  No assets found in your Cloudinary account upload folder.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {cloudinaryAssets.map((asset) => {
                    const isAttaching = attachingAssetId === asset.public_id;
                    return (
                      <div
                        key={asset.public_id}
                        className="group relative rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs hover:border-secondary transition-all flex flex-col justify-between"
                      >
                        <div className="aspect-square bg-slate-100 relative overflow-hidden">
                          <img
                            src={asset.secure_url}
                            alt={asset.public_id}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <div className="p-2 space-y-1">
                          <div className="font-mono text-[9px] text-slate-500 truncate" title={asset.public_id}>
                            {asset.public_id}
                          </div>
                          <button
                            type="button"
                            disabled={isAttaching}
                            onClick={() => handleAttachExistingAsset(asset)}
                            className="w-full py-1 rounded-lg bg-slate-100 hover:bg-secondary hover:text-white text-slate-700 text-[10px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                          >
                            {isAttaching ? (
                              <BiLoaderAlt className="animate-spin" />
                            ) : (
                              <BiPlus />
                            )}
                            <span>{isAttaching ? 'Attaching...' : 'Attach Image'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-end bg-slate-50">
              <button
                type="button"
                onClick={() => setShowCloudinaryLibrary(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
