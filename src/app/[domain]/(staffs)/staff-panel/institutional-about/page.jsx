/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect, useContext, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import Loader from 'src/component/common/Loader';

// Dynamically import TiptapEditor to avoid SSR hydration issues
const TiptapEditor = dynamic(() => import('src/component/website/ui/TiptapEditor.jsx'), {
  ssr: false,
  loading: () => (
    <div className="h-32 border border-slate-200 dark:border-slate-800 rounded-md animate-pulse bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center text-xs text-slate-400">
      Loading Editor...
    </div>
  ),
});

export default function InstitutionalAboutPage() {
  const { website, getApiEndpoint } = useContext(TenantWebsiteContext);

  // Data states
  const [abouts, setAbouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, inactive

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [editingAbout, setEditingAbout] = useState(null);

  // Delete modal state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [aboutToDelete, setAboutToDelete] = useState(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formSubtitle, setFormSubtitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formOrderNo, setFormOrderNo] = useState(0);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formImageId, setFormImageId] = useState('');
  const [selectedImageFile, setSelectedImageFile] = useState(null);

  const fileInputRef = useRef(null);

  // API Endpoint
  const apiEndpoint = useMemo(() => getApiEndpoint('staff/panel/about'), [getApiEndpoint]);

  // Fetch about items
  const fetchAbouts = useCallback(
    async (showToast = false) => {
      if (!apiEndpoint) return;
      try {
        if (showToast) setRefreshing(true);
        const res = await axios.get(apiEndpoint);
        if (res.data?.success) {
          setAbouts(res.data.abouts || []);
          if (showToast) toast.success('About sections updated.');
        } else {
          toast.error(res.data?.error || 'Failed to load about sections.');
        }
      } catch (err) {
        console.error('Error fetching abouts:', err);
        toast.error(err.response?.data?.error || 'Failed to connect to server.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [apiEndpoint]
  );

  useEffect(() => {
    let ignore = false;
    if (!ignore) {
      fetchAbouts();
    }
    return () => {
      ignore = true;
    };
  }, [fetchAbouts]);

  // Open Create Modal
  const openCreateModal = () => {
    setModalMode('create');
    setEditingAbout(null);
    setFormTitle('');
    setFormSubtitle('');
    setFormDescription('');
    setFormOrderNo(abouts.length > 0 ? abouts.length + 1 : 1);
    setFormIsActive(true);
    setFormImageUrl('');
    setFormImageId('');
    setSelectedImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (about) => {
    setModalMode('edit');
    setEditingAbout(about);
    setFormTitle(about.title || '');
    setFormSubtitle(about.subtitle || '');
    setFormDescription(about.description || '');
    setFormOrderNo(about.order_no ?? 0);
    setFormIsActive(Boolean(about.is_active));
    setFormImageUrl(about.image || '');
    setFormImageId(about.image_id || '');
    setSelectedImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsModalOpen(true);
  };

  // Handle Image Selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB.');
        return;
      }
      setSelectedImageFile(file);
      setFormImageUrl(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setSelectedImageFile(null);
    setFormImageUrl('');
    setFormImageId('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handle Form Submit
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast.error('Title is required.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', formTitle.trim());
      formData.append('subtitle', formSubtitle.trim());
      formData.append('description', formDescription);
      formData.append('order_no', formOrderNo.toString());
      formData.append('is_active', formIsActive ? 'true' : 'false');

      if (selectedImageFile) {
        formData.append('file', selectedImageFile);
      } else {
        formData.append('image', formImageUrl);
        formData.append('image_id', formImageId);
      }

      let res;
      if (modalMode === 'create') {
        res = await axios.post(apiEndpoint, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        formData.append('id', editingAbout.id.toString());
        res = await axios.put(apiEndpoint, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      if (res.data?.success) {
        toast.success(
          modalMode === 'create' ? 'About section created.' : 'About section updated.'
        );
        setIsModalOpen(false);
        fetchAbouts();
      } else {
        toast.error(res.data?.error || 'Operation failed.');
      }
    } catch (err) {
      console.error('Error saving about section:', err);
      toast.error(err.response?.data?.error || 'Failed to save section.');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Status
  const handleToggleStatus = async (about) => {
    try {
      const formData = new FormData();
      formData.append('id', about.id.toString());
      formData.append('title', about.title);
      formData.append('subtitle', about.subtitle || '');
      formData.append('description', about.description || '');
      formData.append('order_no', (about.order_no ?? 0).toString());
      formData.append('is_active', (!about.is_active).toString());
      formData.append('image', about.image || '');
      formData.append('image_id', about.image_id || '');

      const res = await axios.put(apiEndpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success) {
        toast.success(`Section ${!about.is_active ? 'activated' : 'deactivated'}.`);
        setAbouts((prev) =>
          prev.map((a) => (a.id === about.id ? { ...a, is_active: !about.is_active } : a))
        );
      } else {
        toast.error(res.data?.error || 'Failed to update status.');
      }
    } catch (err) {
      console.error('Error toggling status:', err);
      toast.error('Failed to change status.');
    }
  };

  // Delete Action
  const handleDeleteClick = (about) => {
    setAboutToDelete(about);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!aboutToDelete) return;
    setSubmitting(true);
    try {
      const res = await axios.delete(`${apiEndpoint}?id=${aboutToDelete.id}`);
      if (res.data?.success) {
        toast.success('About section deleted.');
        setAbouts((prev) => prev.filter((a) => a.id !== aboutToDelete.id));
        setDeleteConfirmOpen(false);
        setAboutToDelete(null);
      } else {
        toast.error(res.data?.error || 'Failed to delete section.');
      }
    } catch (err) {
      console.error('Error deleting about section:', err);
      toast.error(err.response?.data?.error || 'Failed to delete section.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered List
  const filteredAbouts = useMemo(() => {
    return abouts.filter((item) => {
      if (statusFilter === 'active' && !item.is_active) return false;
      if (statusFilter === 'inactive' && item.is_active) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesTitle = item.title?.toLowerCase().includes(q);
        const matchesSubtitle = item.subtitle?.toLowerCase().includes(q);
        const matchesDesc = item.description?.toLowerCase().includes(q);
        return matchesTitle || matchesSubtitle || matchesDesc;
      }

      return true;
    });
  }, [abouts, statusFilter, searchTerm]);

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-white">
            Institutional About Sections
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage comprehensive institutional narratives, history highlights, and published statements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchAbouts(true)}
            disabled={refreshing || loading}
            className="px-3 py-1.5 text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md transition cursor-pointer disabled:opacity-50"
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="px-3.5 py-1.5 text-xs font-medium text-white bg-primary hover:bg-primary-dark rounded-md transition shadow-xs cursor-pointer"
          >
            + New About Section
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-12 gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-md border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="sm:col-span-8">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search sections by title, subtitle, or description..."
            className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
          />
        </div>

        <div className="sm:col-span-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
          >
            <option value="all">Status: All Records</option>
            <option value="active">Status: Active Only</option>
            <option value="inactive">Status: Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Content Table */}
      {loading ? (
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-12 flex flex-col items-center justify-center gap-2">
          <Loader />
          <span className="text-xs text-slate-500 dark:text-slate-400">Loading about sections...</span>
        </div>
      ) : filteredAbouts.length === 0 ? (
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-10 text-center space-y-2">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            No about sections found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {searchTerm || statusFilter !== 'all'
              ? 'No items match your active search filters.'
              : 'There are currently no about sections published.'}
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="px-3 py-1.5 text-xs font-medium text-white bg-primary hover:bg-primary-dark rounded-md transition shadow-xs cursor-pointer mt-2"
          >
            + Create First Section
          </button>
        </div>
      ) : (
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase text-[10px] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold tracking-wider">
                <tr>
                  <th scope="col" className="px-3 py-2.5 w-12 text-center">
                    #
                  </th>
                  <th scope="col" className="px-3 py-2.5 w-44">
                    Title &amp; Subtitle
                  </th>
                  <th scope="col" className="px-3 py-2.5">
                    Description &amp; Narrative
                  </th>
                  <th scope="col" className="px-3 py-2.5 w-16 text-center">
                    Photo
                  </th>
                  <th scope="col" className="px-3 py-2.5 w-24 text-center">
                    Status
                  </th>
                  <th scope="col" className="px-3 py-2.5 w-20 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredAbouts.map((item, idx) => (
                  <tr
                    key={item.id || idx}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-3 py-2.5 text-center font-mono text-[11px] text-slate-400">
                      {item.order_no ?? idx + 1}
                    </td>

                    <td className="px-3 py-2.5 space-y-0.5">
                      <div className="font-semibold text-slate-900 dark:text-white text-xs">
                        {item.title}
                      </div>
                      {item.subtitle && (
                        <div className="text-[11px] text-primary font-medium">
                          {item.subtitle}
                        </div>
                      )}
                    </td>

                    <td className="px-3 py-2.5 space-y-0.5 max-w-lg">
                      {item.description && (
                        <div
                          className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: item.description }}
                        />
                      )}
                    </td>

                    <td className="px-3 py-2.5 text-center">
                      {item.image ? (
                        <a
                          href={item.image}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block w-8 h-8 rounded border border-slate-200 dark:border-slate-700 overflow-hidden"
                        >
                          <img
                            src={item.image}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </a>
                      ) : (
                        <span className="text-[10px] text-slate-400">—</span>
                      )}
                    </td>

                    <td className="px-3 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(item)}
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium transition cursor-pointer ${
                          item.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                            : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                        }`}
                        title="Click to toggle status"
                      >
                        {item.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>

                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="p-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                          title="Edit"
                        >
                          <FiEdit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(item)}
                          className="p-1.5 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/40 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          title="Delete"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Create / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden my-8">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                {modalMode === 'create' ? 'Create About Section' : 'Edit About Section'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                Close ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Section Title *
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Founding Philosophy & Academic Tradition"
                  required
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Subtitle / Tagline
                  </label>
                  <input
                    type="text"
                    value={formSubtitle}
                    onChange={(e) => setFormSubtitle(e.target.value)}
                    placeholder="e.g. Institutional Vision and Identity"
                    className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Display Order No
                  </label>
                  <input
                    type="number"
                    value={formOrderNo}
                    onChange={(e) => setFormOrderNo(e.target.value)}
                    min="0"
                    className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary font-mono"
                  />
                </div>
              </div>

              {/* Photo Upload */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Section Photo (Optional)
                </label>

                {formImageUrl ? (
                  <div className="flex items-center gap-3 p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-md">
                    <div className="w-12 h-10 rounded overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0">
                      <img
                        src={formImageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-slate-800 dark:text-slate-200 truncate block">
                        {selectedImageFile ? selectedImageFile.name : 'Attached Image'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded border border-rose-200 dark:border-rose-900/40 cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md cursor-pointer"
                    >
                      Choose Photo File...
                    </button>
                    <span className="text-[11px] text-slate-400">JPG, PNG, WebP up to 5MB</span>
                  </div>
                )}

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              {/* Description (Tiptap) */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Section Narrative (Rich Text Editor) *
                </label>
                <div className="border border-slate-200 dark:border-slate-700 rounded-md overflow-hidden bg-white dark:bg-slate-900">
                  <TiptapEditor
                    value={formDescription}
                    onChange={(val) => setFormDescription(val)}
                    placeholder="Enter detailed narrative, mission objectives, and historical context..."
                    minHeight="120px"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="aboutIsActive"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-primary focus:ring-primary/20 cursor-pointer"
                />
                <label
                  htmlFor="aboutIsActive"
                  className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none"
                >
                  Publicly Active (Show on About page)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="px-3 py-1.5 text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3.5 py-1.5 text-xs font-medium text-white bg-primary hover:bg-primary-dark rounded-md transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {submitting
                    ? 'Saving...'
                    : modalMode === 'create'
                    ? 'Create Section'
                    : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 p-5 shadow-xl space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Delete About Section
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Are you sure you want to permanently delete{' '}
              <strong className="font-semibold text-slate-800 dark:text-slate-200">
                &ldquo;{aboutToDelete?.title}&rdquo;
              </strong>
              ? This action cannot be reversed.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={submitting}
                className="px-3 py-1.5 text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={submitting}
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-md transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
