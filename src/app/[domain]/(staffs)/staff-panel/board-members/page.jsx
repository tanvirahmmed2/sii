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

export default function BoardMembersPage() {
  const { website, getApiEndpoint } = useContext(TenantWebsiteContext);

  // Data states
  const [boardMembers, setBoardMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, inactive

  // In-Page Form State (NO POPUP MODAL)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create'); // 'create' | 'edit'
  const [editingMember, setEditingMember] = useState(null);

  // In-Page Delete Confirmation (NO POPUP MODAL)
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Form states
  const [formName, setFormName] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDesignation, setFormDesignation] = useState('');
  const [formBio, setFormBio] = useState('');
  const [formOrderNo, setFormOrderNo] = useState(0);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formImageId, setFormImageId] = useState('');
  const [selectedImageFile, setSelectedImageFile] = useState(null);

  const fileInputRef = useRef(null);

  // API Endpoint
  const apiEndpoint = useMemo(() => getApiEndpoint('staff/panel/board-members'), [getApiEndpoint]);

  // Fetch members
  const fetchBoardMembers = useCallback(
    async (showToast = false) => {
      if (!apiEndpoint) return;
      try {
        if (showToast) setRefreshing(true);
        const res = await axios.get(apiEndpoint);
        if (res.data?.success) {
          setBoardMembers(res.data.board_members || []);
          if (showToast) toast.success('Board members updated.');
        } else {
          toast.error(res.data?.error || 'Failed to load board members.');
        }
      } catch (err) {
        console.error('Error fetching board members:', err);
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
      fetchBoardMembers();
    }
    return () => {
      ignore = true;
    };
  }, [fetchBoardMembers]);

  // Open Create in-page form
  const handleOpenCreate = () => {
    setFormMode('create');
    setEditingMember(null);
    setFormName('');
    setFormTitle('');
    setFormDesignation('');
    setFormBio('');
    setFormOrderNo(boardMembers.length > 0 ? boardMembers.length + 1 : 1);
    setFormIsActive(true);
    setFormImageUrl('');
    setFormImageId('');
    setSelectedImageFile(null);
    setMemberToDelete(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsFormOpen(true);
  };

  // Open Edit in-page form
  const handleOpenEdit = (member) => {
    setFormMode('edit');
    setEditingMember(member);
    setFormName(member.name || '');
    setFormTitle(member.title || '');
    setFormDesignation(member.designation || '');
    setFormBio(member.bio || '');
    setFormOrderNo(member.order_no ?? 0);
    setFormIsActive(Boolean(member.is_active));
    setFormImageUrl(member.image || '');
    setFormImageId(member.image_id || '');
    setSelectedImageFile(null);
    setMemberToDelete(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingMember(null);
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
    if (!formName.trim()) {
      toast.error('Member name is required.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', formName.trim());
      formData.append('title', formTitle.trim());
      formData.append('designation', formDesignation.trim());
      formData.append('bio', formBio);
      formData.append('order_no', formOrderNo.toString());
      formData.append('is_active', formIsActive ? 'true' : 'false');

      if (selectedImageFile) {
        formData.append('file', selectedImageFile);
      } else {
        formData.append('image', formImageUrl);
        formData.append('image_id', formImageId);
      }

      let res;
      if (formMode === 'create') {
        res = await axios.post(apiEndpoint, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        formData.append('id', editingMember.id.toString());
        res = await axios.put(apiEndpoint, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      if (res.data?.success) {
        toast.success(
          formMode === 'create' ? 'Board member created.' : 'Board member updated.'
        );
        setIsFormOpen(false);
        setEditingMember(null);
        fetchBoardMembers();
      } else {
        toast.error(res.data?.error || 'Operation failed.');
      }
    } catch (err) {
      console.error('Error saving board member:', err);
      toast.error(err.response?.data?.error || 'Failed to save record.');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Status
  const handleToggleStatus = async (member) => {
    try {
      const formData = new FormData();
      formData.append('id', member.id.toString());
      formData.append('name', member.name);
      formData.append('title', member.title || '');
      formData.append('designation', member.designation || '');
      formData.append('bio', member.bio || '');
      formData.append('order_no', (member.order_no ?? 0).toString());
      formData.append('is_active', (!member.is_active).toString());
      formData.append('image', member.image || '');
      formData.append('image_id', member.image_id || '');

      const res = await axios.put(apiEndpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success) {
        toast.success(`Member ${!member.is_active ? 'activated' : 'deactivated'}.`);
        setBoardMembers((prev) =>
          prev.map((m) => (m.id === member.id ? { ...m, is_active: !member.is_active } : m))
        );
      } else {
        toast.error(res.data?.error || 'Failed to update status.');
      }
    } catch (err) {
      console.error('Error toggling status:', err);
      toast.error('Failed to change status.');
    }
  };

  // Delete Action (in-page confirmation)
  const handleConfirmDelete = async () => {
    if (!memberToDelete) return;
    setDeleting(true);
    try {
      const res = await axios.delete(`${apiEndpoint}?id=${memberToDelete.id}`);
      if (res.data?.success) {
        toast.success('Board member deleted.');
        setBoardMembers((prev) => prev.filter((m) => m.id !== memberToDelete.id));
        setMemberToDelete(null);
      } else {
        toast.error(res.data?.error || 'Failed to delete member.');
      }
    } catch (err) {
      console.error('Error deleting member:', err);
      toast.error('Failed to execute deletion.');
    } finally {
      setDeleting(false);
    }
  };

  // Filtered List
  const filteredMembers = useMemo(() => {
    return boardMembers.filter((item) => {
      const matchesSearch =
        !searchTerm.trim() ||
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.designation?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && item.is_active) ||
        (statusFilter === 'inactive' && !item.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [boardMembers, searchTerm, statusFilter]);

  // Metrics
  const totalCount = boardMembers.length;
  const activeCount = boardMembers.filter((m) => m.is_active).length;
  const inactiveCount = boardMembers.filter((m) => !m.is_active).length;

  return (
    <div className="w-full space-y-4">
      {/* Top Workstation Bar */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 gap-3">
        <div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-white">
            Governing Body & Board of Members
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage governing trustees, executive committee members, and leadership council records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isFormOpen && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-primary hover:bg-primary-dark rounded-md transition shadow-xs cursor-pointer"
            >
              + New Board Member
            </button>
          )}

          <button
            type="button"
            onClick={() => fetchBoardMembers(true)}
            disabled={refreshing}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer disabled:opacity-50"
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* KPI Metric Strip */}
      <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-md border border-slate-200 dark:border-slate-800">
          <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">
            Total Members
          </div>
          <div className="text-xl font-semibold text-slate-900 dark:text-white font-mono mt-1">
            {totalCount}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-md border border-slate-200 dark:border-slate-800">
          <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">
            Active Members
          </div>
          <div className="text-xl font-semibold text-emerald-600 font-mono mt-1">
            {activeCount}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-md border border-slate-200 dark:border-slate-800">
          <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">
            Inactive Members
          </div>
          <div className="text-xl font-semibold text-rose-600 font-mono mt-1">
            {inactiveCount}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-md border border-slate-200 dark:border-slate-800">
          <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">
            Display Status
          </div>
          <div className="text-xs font-medium text-slate-800 dark:text-slate-200 mt-2">
            Published at /about/board
          </div>
        </div>
      </div>

      {/* IN-PAGE DELETE CONFIRMATION BANNER (NO POPUP MODAL) */}
      {memberToDelete && (
        <div className="w-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-md p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-rose-800 dark:text-rose-300">
                Confirm Deletion: "{memberToDelete.name}"
              </p>
              <p className="text-[11px] text-rose-700 dark:text-rose-400 mt-0.5">
                Are you sure you want to permanently delete this board member? This action cannot be reversed.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setMemberToDelete(null)}
                disabled={deleting}
                className="px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-3.5 py-1.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium cursor-pointer shadow-xs transition disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IN-PAGE FORM SECTION (NO POPUP MODAL) */}
      {isFormOpen && (
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                {formMode === 'create' ? 'Create Board Member' : `Edit Board Member: ${editingMember?.name}`}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Fill in the details below. Photos are automatically uploaded to Cloudinary CDN.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCloseForm}
              className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Close
            </button>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Member Name *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Prof. Dr. A. K. Azad"
                  required
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Designation / Role *
                </label>
                <input
                  type="text"
                  value={formDesignation}
                  onChange={(e) => setFormDesignation(e.target.value)}
                  placeholder="e.g. Chairman, Board of Trustees"
                  required
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Title / Honorific Prefix
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Founder Chairman, Trustee"
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Order Index (Sorting)
                </label>
                <input
                  type="number"
                  value={formOrderNo}
                  onChange={(e) => setFormOrderNo(parseInt(e.target.value, 10) || 0)}
                  placeholder="0"
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>

            {/* Biography & Profile Summary */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Biography / Profile Summary
              </label>
              <TiptapEditor
                value={formBio}
                onChange={(html) => setFormBio(html)}
                placeholder="Write member's credentials, experience, leadership background..."
                minHeight="140px"
              />
            </div>

            {/* Photo Upload Section */}
            <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
                Official Portrait Photo
              </label>

              <div className="flex items-center gap-4">
                {formImageUrl ? (
                  <div className="relative w-16 h-16 rounded border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                    <img
                      src={formImageUrl}
                      alt="Portrait preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-[10px] text-slate-400 shrink-0">
                    No Photo
                  </div>
                )}

                <div className="space-y-1.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="block w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 dark:file:bg-slate-800 dark:file:text-slate-300 cursor-pointer"
                  />
                  {formImageUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="text-[11px] text-rose-600 hover:underline cursor-pointer"
                    >
                      Remove Photo
                    </button>
                  )}
                  <p className="text-[10px] text-slate-400">
                    Max size: 5MB. Formats: JPG, PNG, WEBP.
                  </p>
                </div>
              </div>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <input
                type="checkbox"
                id="formIsActiveBoard"
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
                className="w-4 h-4 rounded-sm border-slate-300 text-primary focus:ring-primary cursor-pointer"
              />
              <label
                htmlFor="formIsActiveBoard"
                className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Publish as Active (Visible on public /about/board page)
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleCloseForm}
                className="px-3.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-1.5 rounded-md bg-primary hover:bg-primary-dark text-white text-xs font-medium cursor-pointer shadow-xs transition disabled:opacity-50"
              >
                {submitting ? 'Saving...' : formMode === 'create' ? 'Create Member' : 'Update Member'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-12 gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-md border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="sm:col-span-8">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search board members by name, title, or designation..."
            className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
          />
        </div>

        <div className="sm:col-span-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
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
          <span className="text-xs text-slate-500 dark:text-slate-400">Loading board members...</span>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-10 text-center space-y-2">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            No board members found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {searchTerm || statusFilter !== 'all'
              ? 'No items match your active search filters.'
              : 'There are currently no board members published.'}
          </p>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-3 py-1.5 text-xs font-medium text-white bg-primary hover:bg-primary-dark rounded-md transition shadow-xs cursor-pointer mt-2"
          >
            + Create First Member
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
                  <th scope="col" className="px-3 py-2.5 w-48">
                    Member Name &amp; Designation
                  </th>
                  <th scope="col" className="px-3 py-2.5">
                    Bio &amp; Profile Summary
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
                {filteredMembers.map((item, idx) => (
                  <tr
                    key={item.id || idx}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-3 py-2.5 text-center font-mono text-[11px] text-slate-400">
                      {item.order_no ?? idx + 1}
                    </td>

                    <td className="px-3 py-2.5 space-y-0.5">
                      <div className="font-semibold text-slate-900 dark:text-white text-xs">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-primary font-medium">
                        {item.designation}
                      </div>
                      {item.title && (
                        <div className="text-[10px] text-slate-400">
                          {item.title}
                        </div>
                      )}
                    </td>

                    <td className="px-3 py-2.5 max-w-md">
                      {item.bio ? (
                        <div
                          className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: item.bio }}
                        />
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No bio provided</span>
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
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                          title="Edit"
                        >
                          <FiEdit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setMemberToDelete(item)}
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
    </div>
  );
}
