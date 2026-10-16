/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect, useContext, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
  FiAward,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiX,
  FiSearch,
  FiRefreshCw,
  FiUploadCloud,
  FiCheckCircle,
  FiAlertCircle,
  FiImage,
  FiHash,
  FiExternalLink
} from 'react-icons/fi';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import Loader from 'src/component/common/Loader';

// Dynamically import TiptapEditor to avoid SSR hydration issues
const TiptapEditor = dynamic(() => import('src/component/website/ui/TiptapEditor.jsx'), {
  ssr: false,
  loading: () => (
    <div className="h-36 border border-slate-200 dark:border-slate-800 rounded-lg animate-pulse bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center text-xs text-slate-400">
      Loading Rich Text Editor...
    </div>
  ),
});

export default function InstitutionalMilestonesPage() {
  const { website, getApiEndpoint } = useContext(TenantWebsiteContext);

  // Data states
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, inactive

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [editingMilestone, setEditingMilestone] = useState(null);

  // Delete modal state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [milestoneToDelete, setMilestoneToDelete] = useState(null);

  // Form states
  const [formYear, setFormYear] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formImageId, setFormImageId] = useState('');
  const [formOrderNo, setFormOrderNo] = useState(0);
  const [formIsActive, setFormIsActive] = useState(true);

  const fileInputRef = useRef(null);
  const [selectedImageFile, setSelectedImageFile] = useState(null);

  // API Endpoints
  const apiEndpoint = useMemo(() => getApiEndpoint('staff/panel/milestones'), [getApiEndpoint]);

  // Fetch Milestones
  const fetchMilestones = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      try {
        const res = await axios.get(apiEndpoint);
        if (res.data?.success) {
          setMilestones(res.data.milestones || []);
        }
      } catch (err) {
        console.error('Error fetching milestones:', err);
        toast.error(err.response?.data?.error || 'Failed to load milestones.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [apiEndpoint]
  );

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await axios.get(apiEndpoint);
        if (!ignore && res.data?.success) {
          setMilestones(res.data.milestones || []);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Error loading milestones:', err);
          toast.error(err.response?.data?.error || 'Failed to load milestones.');
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    load();
    return () => {
      ignore = true;
    };
  }, [apiEndpoint]);

  // Open Create Modal
  const openCreateModal = () => {
    setModalMode('create');
    setEditingMilestone(null);
    setSelectedImageFile(null);
    setFormYear(new Date().getFullYear().toString());
    setFormTitle('');
    setFormDescription('');
    setFormImageUrl('');
    setFormImageId('');
    setFormOrderNo(milestones.length > 0 ? milestones.length + 1 : 1);
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (item) => {
    setModalMode('edit');
    setEditingMilestone(item);
    setSelectedImageFile(null);
    setFormYear(item.year || new Date().getFullYear().toString());
    setFormTitle(item.title || '');
    setFormDescription(item.description || '');
    setFormImageUrl(item.image || '');
    setFormImageId(item.image_id || '');
    setFormOrderNo(item.order_no ?? 0);
    setFormIsActive(Boolean(item.is_active));
    setIsModalOpen(true);
  };

  // Handle Local Photo Selection
  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please choose a valid photo file (PNG, JPG, WEBP, etc.)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image exceeds 10MB limit. Please upload a smaller image.');
      return;
    }

    setSelectedImageFile(file);
    const objectUrl = URL.createObjectURL(file);
    setFormImageUrl(objectUrl);
    toast.success('Photo selected! Click "Save Milestone" to apply.');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Remove current image
  const handleRemoveImage = () => {
    setSelectedImageFile(null);
    setFormImageUrl('');
    setFormImageId('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast.success('Photo unlinked.');
  };

  // Submit (Create or Update)
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formTitle.trim()) {
      toast.error('Milestone title is required.');
      return;
    }

    if (!formDescription || !formDescription.trim()) {
      toast.error('Milestone description is required.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('year', formYear.trim() || new Date().getFullYear().toString());
      formData.append('title', formTitle.trim());
      formData.append('description', formDescription);
      formData.append('order_no', parseInt(formOrderNo, 10) || 0);
      formData.append('is_active', Boolean(formIsActive));

      if (modalMode === 'edit' && editingMilestone?.id) {
        formData.append('id', editingMilestone.id);
      }

      if (selectedImageFile) {
        formData.append('file', selectedImageFile);
      } else {
        if (formImageUrl && !formImageUrl.startsWith('blob:')) {
          formData.append('image', formImageUrl);
        }
        if (formImageId) {
          formData.append('image_id', formImageId);
        }
      }

      let res;
      if (modalMode === 'create') {
        res = await axios.post(apiEndpoint, formData);
      } else {
        res = await axios.put(apiEndpoint, formData);
      }

      if (res.data?.success) {
        toast.success(
          modalMode === 'create'
            ? 'Milestone created successfully!'
            : 'Milestone updated successfully!'
        );
        setSelectedImageFile(null);
        setIsModalOpen(false);
        fetchMilestones(true);
      } else {
        toast.error(res.data?.error || 'Failed to save milestone.');
      }
    } catch (err) {
      console.error('Error saving milestone:', err);
      toast.error(err.response?.data?.error || 'An error occurred while saving.');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle active status
  const handleToggleStatus = async (item) => {
    try {
      const res = await axios.put(apiEndpoint, {
        id: item.id,
        is_active: !item.is_active,
      });

      if (res.data?.success) {
        toast.success(`Marked as ${!item.is_active ? 'Active' : 'Inactive'}`);
        fetchMilestones(true);
      } else {
        toast.error(res.data?.error || 'Failed to update status.');
      }
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error(err.response?.data?.error || 'Could not update status.');
    }
  };

  // Delete Milestone
  const handleConfirmDelete = async () => {
    if (!milestoneToDelete) return;

    setSubmitting(true);
    try {
      const res = await axios.delete(`${apiEndpoint}?id=${milestoneToDelete.id}`);

      if (res.data?.success) {
        toast.success(res.data.message || 'Milestone deleted successfully.');
        setDeleteConfirmOpen(false);
        setMilestoneToDelete(null);
        fetchMilestones(true);
      } else {
        toast.error(res.data?.error || 'Failed to delete milestone.');
      }
    } catch (err) {
      console.error('Error deleting milestone:', err);
      toast.error(err.response?.data?.error || 'Could not delete milestone.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered List
  const filteredMilestones = useMemo(() => {
    return milestones.filter((item) => {
      if (statusFilter === 'active' && !item.is_active) return false;
      if (statusFilter === 'inactive' && item.is_active) return false;

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const titleMatch = item.title?.toLowerCase().includes(query);
        const yearMatch = item.year?.toLowerCase().includes(query);
        const descMatch = item.description?.toLowerCase().includes(query);
        return titleMatch || yearMatch || descMatch;
      }

      return true;
    });
  }, [milestones, statusFilter, searchTerm]);

  return (
    <div className="w-full min-h-[calc(100vh-80px)] bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                Institution Profile
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {website?.domain || 'Portal'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1 tracking-tight">
              Institutional Milestones & Heritage Timeline
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
              Chronicle founding milestones, expansions, and historic events.
              Upload photos to Cloudinary and format narrative descriptions with Tiptap.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => fetchMilestones(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 transition shadow-xs cursor-pointer disabled:opacity-50"
              title="Refresh Records"
            >
              <FiRefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg transition shadow-xs cursor-pointer active:scale-[0.98]"
            >
              <FiPlus className="w-4 h-4" />
              <span>New Milestone</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="sm:col-span-8 relative">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search milestones by title, year or description..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          <div className="sm:col-span-4 flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            >
              <option value="all">Status: All Records</option>
              <option value="active">Status: Active Only</option>
              <option value="inactive">Status: Inactive Only</option>
            </select>
          </div>
        </div>

        {/* Content Table */}
        {loading ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-16 flex flex-col items-center justify-center gap-3">
            <Loader />
            <span className="text-xs text-slate-500 dark:text-slate-400 animate-pulse">
              Loading milestones timeline...
            </span>
          </div>
        ) : filteredMilestones.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <FiAlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No milestones found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {searchTerm || statusFilter !== 'all'
                ? 'No items match your active search filters.'
                : 'There are currently no milestones recorded. Click "New Milestone" to document your first milestone.'}
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary-dark rounded-md transition shadow-xs cursor-pointer"
            >
              <FiPlus className="w-3.5 h-3.5" />
              <span>Record First Milestone</span>
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-100/70 dark:bg-slate-800/60 uppercase text-[10px] text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold tracking-wider">
                  <tr>
                    <th scope="col" className="px-4 py-3.5 w-12 text-center">
                      #
                    </th>
                    <th scope="col" className="px-4 py-3.5 w-24">
                      Photo
                    </th>
                    <th scope="col" className="px-4 py-3.5 w-24">
                      Year
                    </th>
                    <th scope="col" className="px-4 py-3.5">
                      Milestone Title & Narrative
                    </th>
                    <th scope="col" className="px-4 py-3.5 w-24 text-center">
                      Order
                    </th>
                    <th scope="col" className="px-4 py-3.5 w-24 text-center">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3.5 w-28 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredMilestones.map((item, idx) => (
                    <tr
                      key={item.id || idx}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-4 py-3.5 text-center font-mono text-[11px] text-slate-400">
                        {item.order_no ?? idx + 1}
                      </td>

                      {/* Photo Thumbnail */}
                      <td className="px-4 py-3.5">
                        {item.image ? (
                          <a
                            href={item.image}
                            target="_blank"
                            rel="noreferrer"
                            className="block w-14 h-12 rounded-md overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 group relative"
                            title="Click to view full Cloudinary image"
                          >
                            <img
                              src={item.image}
                              alt={item.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white">
                              <FiExternalLink className="w-3 h-3" />
                            </div>
                          </a>
                        ) : (
                          <div className="w-14 h-12 rounded-md border border-dashed border-slate-300 dark:border-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-600 bg-slate-50 dark:bg-slate-950/50">
                            <FiImage className="w-4 h-4" />
                          </div>
                        )}
                      </td>

                      {/* Year */}
                      <td className="px-4 py-3.5">
                        <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-xs font-bold border border-slate-200 dark:border-slate-700">
                          {item.year}
                        </span>
                      </td>

                      {/* Title & Description */}
                      <td className="px-4 py-3.5 space-y-1 max-w-lg">
                        <div className="font-semibold text-slate-900 dark:text-white text-xs">
                          {item.title}
                        </div>
                        {item.description && (
                          <div
                            className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed prose prose-xs dark:prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ __html: item.description }}
                          />
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-center font-mono text-xs text-slate-500">
                        {item.order_no ?? 0}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition cursor-pointer ${
                            item.is_active
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 hover:bg-emerald-100'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                          }`}
                          title="Click to toggle Active status"
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          <span>{item.is_active ? 'Active' : 'Inactive'}</span>
                        </button>
                      </td>

                      <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="p-1.5 rounded text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          title="Edit"
                        >
                          <FiEdit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setMilestoneToDelete(item);
                            setDeleteConfirmOpen(true);
                          }}
                          className="p-1.5 rounded text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                          title="Delete"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal: Create / Edit Record */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl my-6">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-lg bg-primary/10 text-primary">
                    <FiAward className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {modalMode === 'create' ? 'Create New Milestone' : 'Edit Milestone'}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Record chronological milestones with Cloudinary photos and Tiptap narrative.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Milestone Year <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formYear}
                      onChange={(e) => setFormYear(e.target.value)}
                      placeholder="e.g. 2024 or 1998"
                      required
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Display Order Number
                    </label>
                    <div className="relative">
                      <FiHash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                      <input
                        type="number"
                        value={formOrderNo}
                        onChange={(e) => setFormOrderNo(e.target.value)}
                        min="0"
                        className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Milestone Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Inauguration of Advanced Computing Complex"
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition font-medium"
                  />
                </div>

                {/* Cloudinary Image Upload Section */}
                <div className="space-y-2 border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-950/40">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <FiImage className="text-primary w-4 h-4" />
                      <span>Historic Photo (Cloudinary Stored)</span>
                    </label>
                    {formImageUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="text-[11px] text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 font-medium cursor-pointer"
                      >
                        Remove Photo
                      </button>
                    )}
                  </div>

                  {formImageUrl ? (
                    <div className="flex items-center gap-4 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                      <img
                        src={formImageUrl}
                        alt="Milestone Preview"
                        className="w-20 h-20 rounded-md object-cover border border-slate-200 dark:border-slate-700"
                      />
                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          <FiCheckCircle className="w-3.5 h-3.5" />
                          <span>Uploaded to Cloudinary</span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
                          URL: {formImageUrl}
                        </p>
                        {formImageId && (
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate">
                            Public ID: {formImageId}
                          </p>
                        )}
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingImage}
                            className="text-[11px] font-medium text-primary hover:underline cursor-pointer"
                          >
                            Replace Photo
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => !uploadingImage && fileInputRef.current?.click()}
                      className={`border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-xl p-6 text-center cursor-pointer transition hover:border-primary/60 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 ${
                        uploadingImage ? 'opacity-50 pointer-events-none' : ''
                      }`}
                    >
                      {uploadingImage ? (
                        <div className="space-y-2 flex flex-col items-center">
                          <Loader />
                          <p className="text-xs text-primary font-medium">
                            Uploading photo to Cloudinary...
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <FiUploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
                            Click to select a photo to upload
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Uploads directly to Cloudinary (PNG, JPG, WEBP, up to 10MB)
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="hidden"
                  />
                </div>

                {/* Tiptap Rich Text Description */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Description & Content (Tiptap Rich Text Editor){' '}
                      <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400">
                      Supports headings, bold, italic, lists, and links
                    </span>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition">
                    <TiptapEditor
                      value={formDescription}
                      onChange={(val) => setFormDescription(val)}
                      placeholder="Compose detailed milestone narrative here..."
                      minHeight="180px"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="milestoneIsActive"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-primary focus:ring-primary/20 cursor-pointer"
                  />
                  <label
                    htmlFor="milestoneIsActive"
                    className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none"
                  >
                    Publicly Active (Display on institutional history & about timeline)
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    disabled={submitting || uploadingImage}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={submitting || uploadingImage}
                    className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg transition shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>{modalMode === 'create' ? 'Publish Milestone' : 'Save Changes'}</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmOpen && milestoneToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
              <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <FiTrash2 className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Delete Milestone?
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Are you sure you want to permanently delete{' '}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    &quot;{milestoneToDelete.title}&quot;
                  </span>
                  ? This action cannot be reversed. If a Cloudinary photo was attached, it will also
                  be cleaned up.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteConfirmOpen(false);
                    setMilestoneToDelete(null);
                  }}
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <span>Confirm Delete</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
