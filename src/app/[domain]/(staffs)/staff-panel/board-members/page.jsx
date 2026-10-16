/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect, useContext, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
  FiUsers,
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
  FiExternalLink,
  FiShield
} from 'react-icons/fi';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import Loader from 'src/component/common/Loader';

// Dynamically import TiptapEditor to avoid SSR hydration issues
const TiptapEditor = dynamic(() => import('src/component/website/ui/TiptapEditor.jsx'), {
  ssr: false,
  loading: () => (
    <div className="h-36 border border-slate-200 dark:border-slate-800 rounded-lg animate-pulse bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center text-xs text-slate-400">
      Loading Rich Text Biography Editor...
    </div>
  ),
});

const COMMON_DESIGNATIONS = [
  'Chairman of the Board',
  'Vice Chairman',
  'Founder Trustee',
  'Managing Director',
  'Board of Director',
  'Governing Body Member',
  'Honorary Secretary',
  'Treasurer',
  'Executive Committee Member',
  'Academic Advisor'
];

export default function BoardMembersPage() {
  const { website, getApiEndpoint } = useContext(TenantWebsiteContext);

  // Data states
  const [boardMembers, setBoardMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, inactive
  const [designationFilter, setDesignationFilter] = useState('all');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [editingMember, setEditingMember] = useState(null);

  // Delete modal state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDesignation, setFormDesignation] = useState('');
  const [formBio, setFormBio] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formImageId, setFormImageId] = useState('');
  const [formOrderNo, setFormOrderNo] = useState(0);
  const [formIsActive, setFormIsActive] = useState(true);

  const fileInputRef = useRef(null);
  const [selectedImageFile, setSelectedImageFile] = useState(null);

  // API Endpoints
  const apiEndpoint = useMemo(() => getApiEndpoint('staff/panel/board-members'), [getApiEndpoint]);

  // Fetch Board Members
  const fetchBoardMembers = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      try {
        const res = await axios.get(apiEndpoint);
        if (res.data?.success) {
          setBoardMembers(res.data.board_members || []);
        }
      } catch (err) {
        console.error('Error fetching board members:', err);
        toast.error(err.response?.data?.error || 'Failed to load board members.');
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
          setBoardMembers(res.data.board_members || []);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Error loading board members:', err);
          toast.error(err.response?.data?.error || 'Failed to load board members.');
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
    setEditingMember(null);
    setSelectedImageFile(null);
    setFormName('');
    setFormTitle('');
    setFormDesignation('Governing Body Member');
    setFormBio('');
    setFormImageUrl('');
    setFormImageId('');
    setFormOrderNo(boardMembers.length > 0 ? boardMembers.length + 1 : 1);
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (member) => {
    setModalMode('edit');
    setEditingMember(member);
    setSelectedImageFile(null);
    setFormName(member.name || '');
    setFormTitle(member.title || '');
    setFormDesignation(member.designation || '');
    setFormBio(member.bio || '');
    setFormImageUrl(member.image || '');
    setFormImageId(member.image_id || '');
    setFormOrderNo(member.order_no ?? 0);
    setFormIsActive(Boolean(member.is_active));
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
    toast.success('Photo selected! Click "Save Board Member" to apply.');
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

    if (!formName.trim()) {
      toast.error('Member name is required.');
      return;
    }

    if (!formDesignation.trim()) {
      toast.error('Designation is required.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', formName.trim());
      formData.append('title', formTitle.trim());
      formData.append('designation', formDesignation.trim());
      formData.append('bio', formBio);
      formData.append('order_no', parseInt(formOrderNo, 10) || 0);
      formData.append('is_active', Boolean(formIsActive));

      if (modalMode === 'edit' && editingMember?.id) {
        formData.append('id', editingMember.id);
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
            ? 'Board member added successfully!'
            : 'Board member updated successfully!'
        );
        setSelectedImageFile(null);
        setIsModalOpen(false);
        fetchBoardMembers(true);
      } else {
        toast.error(res.data?.error || 'Failed to save board member.');
      }
    } catch (err) {
      console.error('Error saving board member:', err);
      toast.error(err.response?.data?.error || 'An error occurred while saving.');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle active status directly
  const handleToggleStatus = async (member) => {
    try {
      const res = await axios.put(apiEndpoint, {
        id: member.id,
        is_active: !member.is_active,
      });

      if (res.data?.success) {
        toast.success(`Marked as ${!member.is_active ? 'Active' : 'Inactive'}`);
        fetchBoardMembers(true);
      } else {
        toast.error(res.data?.error || 'Failed to update status.');
      }
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error(err.response?.data?.error || 'Could not update status.');
    }
  };

  // Delete Board Member
  const handleConfirmDelete = async () => {
    if (!memberToDelete) return;

    setSubmitting(true);
    try {
      const res = await axios.delete(`${apiEndpoint}?id=${memberToDelete.id}`);

      if (res.data?.success) {
        toast.success(res.data.message || 'Board member deleted successfully.');
        setDeleteConfirmOpen(false);
        setMemberToDelete(null);
        fetchBoardMembers(true);
      } else {
        toast.error(res.data?.error || 'Failed to delete board member.');
      }
    } catch (err) {
      console.error('Error deleting board member:', err);
      toast.error(err.response?.data?.error || 'Could not delete board member.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered List
  const filteredMembers = useMemo(() => {
    return boardMembers.filter((item) => {
      // Status filter
      if (statusFilter === 'active' && !item.is_active) return false;
      if (statusFilter === 'inactive' && item.is_active) return false;

      // Designation filter
      if (designationFilter !== 'all') {
        if (!item.designation?.toLowerCase().includes(designationFilter.toLowerCase())) {
          return false;
        }
      }

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const nameMatch = item.name?.toLowerCase().includes(query);
        const titleMatch = item.title?.toLowerCase().includes(query);
        const desigMatch = item.designation?.toLowerCase().includes(query);
        const bioMatch = item.bio?.toLowerCase().includes(query);
        return nameMatch || titleMatch || desigMatch || bioMatch;
      }

      return true;
    });
  }, [boardMembers, statusFilter, designationFilter, searchTerm]);

  return (
    <div className="w-full min-h-[calc(100vh-80px)] bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                Institutional Governance
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {website?.domain || 'Portal'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1 tracking-tight">
              Governing Body & Board Members
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
              Manage trustees, directors, and governing committee members. Upload portraits
              to Cloudinary and craft rich biographies with the Tiptap editor.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => fetchBoardMembers(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 transition shadow-xs cursor-pointer disabled:opacity-50"
              title="Refresh Members"
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
              <span>New Board Member</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="sm:col-span-6 relative">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search members by name, title, designation or biography..."
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

          <div className="sm:col-span-3">
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

          <div className="sm:col-span-3 flex items-center justify-end text-xs text-slate-500 dark:text-slate-400 px-2">
            Showing {filteredMembers.length} of {boardMembers.length} members
          </div>
        </div>

        {/* Content Table */}
        {loading ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-16 flex flex-col items-center justify-center gap-3">
            <Loader />
            <span className="text-xs text-slate-500 dark:text-slate-400 animate-pulse">
              Loading governing body members...
            </span>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <FiUsers className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No board members found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {searchTerm || statusFilter !== 'all'
                ? 'No items match your active search filters. Try clearing or relaxing the filters.'
                : 'There are currently no governing board members registered. Click "New Board Member" to publish your first entry.'}
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary-dark rounded-md transition shadow-xs cursor-pointer"
            >
              <FiPlus className="w-3.5 h-3.5" />
              <span>Add First Board Member</span>
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
                    <th scope="col" className="px-4 py-3.5 w-20">
                      Photo
                    </th>
                    <th scope="col" className="px-4 py-3.5">
                      Name & Governance Role
                    </th>
                    <th scope="col" className="px-4 py-3.5 w-44">
                      Designation
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
                  {filteredMembers.map((item, idx) => (
                    <tr
                      key={item.id || idx}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Order No / Index */}
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
                            className="block w-12 h-12 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 group relative"
                            title="Click to view full Cloudinary photo"
                          >
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white">
                              <FiExternalLink className="w-3 h-3" />
                            </div>
                          </a>
                        ) : (
                          <div className="w-12 h-12 rounded-full border border-dashed border-slate-300 dark:border-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-600 bg-slate-50 dark:bg-slate-950/50">
                            <FiImage className="w-4 h-4" />
                          </div>
                        )}
                      </td>

                      {/* Name & Bio Preview */}
                      <td className="px-4 py-3.5 space-y-1 max-w-md">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 dark:text-white text-xs">
                            {item.title ? `${item.title} ` : ''}
                            {item.name}
                          </span>
                        </div>

                        {/* Rich HTML preview from Tiptap */}
                        {item.bio && (
                          <div
                            className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed prose prose-xs dark:prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ __html: item.bio }}
                          />
                        )}
                      </td>

                      {/* Designation */}
                      <td className="px-4 py-3.5">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                          {item.designation}
                        </span>
                      </td>

                      {/* Order No */}
                      <td className="px-4 py-3.5 text-center font-mono text-xs text-slate-500">
                        {item.order_no ?? 0}
                      </td>

                      {/* Status Toggle */}
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

                      {/* Actions */}
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
                            setMemberToDelete(item);
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
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-lg bg-primary/10 text-primary">
                    <FiUsers className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {modalMode === 'create' ? 'Add New Board Member' : 'Edit Board Member'}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Provide member details, upload portrait to Cloudinary, and compose biography via Tiptap.
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

              {/* Modal Form Body */}
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Title / Honorific
                    </label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="e.g. Dr., Prof., Engr."
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                    />
                  </div>

                  <div className="sm:col-span-9">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Full Member Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Sarah Jenkins, M.Sc."
                      required
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Designation / Role <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      list="designationSuggestions"
                      value={formDesignation}
                      onChange={(e) => setFormDesignation(e.target.value)}
                      placeholder="e.g. Chairman of the Board, Founder Trustee"
                      required
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                    />
                    <datalist id="designationSuggestions">
                      {COMMON_DESIGNATIONS.map((d) => (
                        <option key={d} value={d} />
                      ))}
                    </datalist>
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

                {/* Cloudinary Image Upload Section */}
                <div className="space-y-2 border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-950/40">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <FiImage className="text-primary w-4 h-4" />
                      <span>Member Portrait (Cloudinary Stored)</span>
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
                        alt="Member Preview"
                        className="w-20 h-20 rounded-full object-cover border border-slate-200 dark:border-slate-700"
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
                            Click to select an official photo to upload
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

                {/* Tiptap Rich Text Biography */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Biography & Academic Background (Tiptap Rich Text Editor)
                    </label>
                    <span className="text-[10px] text-slate-400">
                      Supports headings, bold, italic, lists, and links
                    </span>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition">
                    <TiptapEditor
                      value={formBio}
                      onChange={(val) => setFormBio(val)}
                      placeholder="Compose member biography, career accomplishments, and education..."
                      minHeight="180px"
                    />
                  </div>
                </div>

                {/* Active Checkbox */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="formIsActive"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-primary focus:ring-primary/20 cursor-pointer"
                  />
                  <label
                    htmlFor="formIsActive"
                    className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none"
                  >
                    Publicly Active (Display on institutional website and governance directory)
                  </label>
                </div>

                {/* Modal Footer */}
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
                      <span>{modalMode === 'create' ? 'Add Board Member' : 'Save Changes'}</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmOpen && memberToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
              <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <FiTrash2 className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Delete Board Member?
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Are you sure you want to permanently delete{' '}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    &quot;{memberToDelete.title ? `${memberToDelete.title} ` : ''}
                    {memberToDelete.name}&quot;
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
                    setMemberToDelete(null);
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
