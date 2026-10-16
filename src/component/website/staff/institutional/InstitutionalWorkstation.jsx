/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect, useContext, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import axios from 'axios';
import { toast } from 'react-hot-toast';
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

const FACILITY_TYPES = [
  'Campus Facility',
  'Academic Lab',
  'Digital Library',
  'Residential Hostel',
  'Sports & Fitness',
  'Auditorium & Events',
  'Healthcare & Clinic',
  'Dining & Cafeteria',
  'Transportation',
  'Administrative Wing',
  'Other Facility'
];

export default function InstitutionalWorkstation({ initialTab = 'missions' }) {
  const { website, getApiEndpoint } = useContext(TenantWebsiteContext);
  const [activeTab, setActiveTab] = useState(initialTab);

  // Data states
  const [missions, setMissions] = useState([]);
  const [visions, setVisions] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [infrastructure, setInfrastructure] = useState([]);
  const [boardMembers, setBoardMembers] = useState([]);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, inactive
  const [facilityTypeFilter, setFacilityTypeFilter] = useState('all');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [editingItem, setEditingItem] = useState(null);

  // Delete modal state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formName, setFormName] = useState('');
  const [formDesignation, setFormDesignation] = useState('');
  const [formSubtitle, setFormSubtitle] = useState('');
  const [formYear, setFormYear] = useState('');
  const [formFacilityType, setFormFacilityType] = useState('Campus Facility');
  const [formDescription, setFormDescription] = useState('');
  const [formOrderNo, setFormOrderNo] = useState(0);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formImageId, setFormImageId] = useState('');

  const fileInputRef = useRef(null);

  // Compute endpoints
  const endpoints = useMemo(() => {
    return {
      missions: getApiEndpoint('staff/panel/missions'),
      visions: getApiEndpoint('staff/panel/visions'),
      milestones: getApiEndpoint('staff/panel/milestones'),
      infrastructure: getApiEndpoint('staff/panel/infrastructure'),
      board_members: getApiEndpoint('staff/panel/board-members'),
    };
  }, [getApiEndpoint]);

  // Load current tab data
  const fetchData = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      try {
        if (activeTab === 'missions') {
          const res = await axios.get(endpoints.missions);
          if (res.data?.success) setMissions(res.data.missions || []);
        } else if (activeTab === 'visions') {
          const res = await axios.get(endpoints.visions);
          if (res.data?.success) setVisions(res.data.visions || []);
        } else if (activeTab === 'milestones') {
          const res = await axios.get(endpoints.milestones);
          if (res.data?.success) setMilestones(res.data.milestones || []);
        } else if (activeTab === 'infrastructure') {
          const res = await axios.get(endpoints.infrastructure);
          if (res.data?.success) setInfrastructure(res.data.infrastructure || []);
        } else if (activeTab === 'board_members') {
          const res = await axios.get(endpoints.board_members);
          if (res.data?.success) setBoardMembers(res.data.board_members || []);
        }
      } catch (err) {
        console.error('Error fetching institutional data:', err);
        toast.error(err.response?.data?.error || 'Failed to load records.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeTab, endpoints]
  );

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      setLoading(true);
      try {
        if (activeTab === 'missions') {
          const res = await axios.get(endpoints.missions);
          if (!ignore && res.data?.success) setMissions(res.data.missions || []);
        } else if (activeTab === 'visions') {
          const res = await axios.get(endpoints.visions);
          if (!ignore && res.data?.success) setVisions(res.data.visions || []);
        } else if (activeTab === 'milestones') {
          const res = await axios.get(endpoints.milestones);
          if (!ignore && res.data?.success) setMilestones(res.data.milestones || []);
        } else if (activeTab === 'infrastructure') {
          const res = await axios.get(endpoints.infrastructure);
          if (!ignore && res.data?.success) setInfrastructure(res.data.infrastructure || []);
        } else if (activeTab === 'board_members') {
          const res = await axios.get(endpoints.board_members);
          if (!ignore && res.data?.success) setBoardMembers(res.data.board_members || []);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Error loading tab data:', err);
          toast.error(err.response?.data?.error || 'Failed to load data.');
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    run();
    return () => {
      ignore = true;
    };
  }, [activeTab, endpoints]);

  // Open Create Modal
  const openCreateModal = () => {
    setModalMode('create');
    setEditingItem(null);
    setSelectedImageFile(null);
    setFormTitle('');
    setFormName('');
    setFormDesignation('');
    setFormSubtitle('');
    setFormYear(new Date().getFullYear().toString());
    setFormFacilityType('Campus Facility');
    setFormDescription('');
    setFormOrderNo(0);
    setFormIsActive(true);
    setFormImageUrl('');
    setFormImageId('');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (item) => {
    setModalMode('edit');
    setEditingItem(item);
    setSelectedImageFile(null);
    setFormTitle(item.title || '');
    setFormName(item.name || '');
    setFormDesignation(item.designation || '');
    setFormSubtitle(item.subtitle || '');
    setFormYear(item.year || new Date().getFullYear().toString());
    setFormFacilityType(item.facility_type || 'Campus Facility');
    setFormDescription(item.bio || item.description || '');
    setFormOrderNo(item.order_no ?? 0);
    setFormIsActive(Boolean(item.is_active));
    setFormImageUrl(item.image || '');
    setFormImageId(item.image_id || '');
    setIsModalOpen(true);
  };

  // Handle Local Photo Selection
  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please choose a valid image file (PNG, JPG, WEBP, etc.)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image exceeds 10MB limit. Please upload a smaller image.');
      return;
    }

    setSelectedImageFile(file);
    const objectUrl = URL.createObjectURL(file);
    setFormImageUrl(objectUrl);
    toast.success('Photo selected! Click "Save" to apply.');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Remove current image
  const handleRemoveImage = () => {
    setSelectedImageFile(null);
    setFormImageUrl('');
    setFormImageId('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast.success('Image unlinked.');
  };

  // Save (Create or Update)
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (activeTab === 'board_members') {
      if (!formName.trim()) {
        toast.error('Member name is required.');
        return;
      }
      if (!formDesignation.trim()) {
        toast.error('Designation is required.');
        return;
      }
    } else {
      if (!formTitle.trim()) {
        toast.error('Title is required.');
        return;
      }
      if (!formDescription || !formDescription.trim()) {
        toast.error('Description is required.');
        return;
      }
    }

    setSubmitting(true);
    try {
      let targetUrl = endpoints[activeTab];
      let method = modalMode === 'create' ? 'post' : 'put';

      let requestData;

      if (['milestones', 'infrastructure', 'board_members'].includes(activeTab)) {
        const formData = new FormData();
        formData.append('order_no', parseInt(formOrderNo, 10) || 0);
        formData.append('is_active', Boolean(formIsActive));

        if (modalMode === 'edit' && editingItem?.id) {
          formData.append('id', editingItem.id);
        }

        if (activeTab === 'board_members') {
          formData.append('name', formName.trim());
          formData.append('title', formTitle.trim());
          formData.append('designation', formDesignation.trim());
          formData.append('bio', formDescription);
        } else {
          formData.append('title', formTitle.trim());
          formData.append('description', formDescription);

          if (activeTab === 'milestones') {
            formData.append('year', formYear.trim() || new Date().getFullYear().toString());
          } else if (activeTab === 'infrastructure') {
            formData.append('subtitle', formSubtitle.trim());
            formData.append('facility_type', formFacilityType.trim());
          }
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

        requestData = formData;
      } else {
        const payload = {
          order_no: parseInt(formOrderNo, 10) || 0,
          is_active: Boolean(formIsActive),
          title: formTitle.trim(),
          description: formDescription,
        };
        if (modalMode === 'edit') {
          payload.id = editingItem.id;
        }
        requestData = payload;
      }

      const res = await axios[method](targetUrl, requestData);

      if (res.data?.success) {
        toast.success(
          modalMode === 'create' ? 'Item created successfully!' : 'Item updated successfully!'
        );
        setSelectedImageFile(null);
        setIsModalOpen(false);
        fetchData(true);
      } else {
        toast.error(res.data?.error || 'Failed to save item.');
      }
    } catch (err) {
      console.error('Error saving item:', err);
      toast.error(err.response?.data?.error || 'An error occurred while saving.');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle active status directly from row
  const handleToggleStatus = async (item) => {
    try {
      const targetUrl = endpoints[activeTab];
      const res = await axios.put(targetUrl, {
        id: item.id,
        is_active: !item.is_active,
      });

      if (res.data?.success) {
        toast.success(`Marked as ${!item.is_active ? 'Active' : 'Inactive'}`);
        fetchData(true);
      } else {
        toast.error(res.data?.error || 'Failed to update status.');
      }
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error(err.response?.data?.error || 'Could not update status.');
    }
  };

  // Delete Item
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;

    setSubmitting(true);
    try {
      const targetUrl = `${endpoints[activeTab]}?id=${itemToDelete.id}`;
      const res = await axios.delete(targetUrl);

      if (res.data?.success) {
        toast.success(res.data.message || 'Item deleted successfully.');
        setDeleteConfirmOpen(false);
        setItemToDelete(null);
        fetchData(true);
      } else {
        toast.error(res.data?.error || 'Failed to delete item.');
      }
    } catch (err) {
      console.error('Error deleting item:', err);
      toast.error(err.response?.data?.error || 'Could not delete item.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter current list
  const currentList = useMemo(() => {
    let list = [];
    if (activeTab === 'missions') list = missions;
    else if (activeTab === 'visions') list = visions;
    else if (activeTab === 'milestones') list = milestones;
    else if (activeTab === 'infrastructure') list = infrastructure;
    else if (activeTab === 'board_members') list = boardMembers;

    return list.filter((item) => {
      // Status filter
      if (statusFilter === 'active' && !item.is_active) return false;
      if (statusFilter === 'inactive' && item.is_active) return false;

      // Facility Type filter
      if (activeTab === 'infrastructure' && facilityTypeFilter !== 'all') {
        if (item.facility_type !== facilityTypeFilter) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const titleMatch = item.title?.toLowerCase().includes(query);
        const nameMatch = item.name?.toLowerCase().includes(query);
        const designationMatch = item.designation?.toLowerCase().includes(query);
        const descMatch = (item.description || item.bio)?.toLowerCase().includes(query);
        const yearMatch = item.year?.toLowerCase().includes(query);
        const subMatch = item.subtitle?.toLowerCase().includes(query);
        const typeMatch = item.facility_type?.toLowerCase().includes(query);
        return (
          titleMatch ||
          nameMatch ||
          designationMatch ||
          descMatch ||
          yearMatch ||
          subMatch ||
          typeMatch
        );
      }

      return true;
    });
  }, [
    activeTab,
    missions,
    visions,
    milestones,
    infrastructure,
    boardMembers,
    statusFilter,
    facilityTypeFilter,
    searchTerm,
  ]);

  return (
    <div className="w-full min-h-[calc(100vh-80px)] bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                Institutional Profile CMS
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {website?.domain || 'Portal'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1 tracking-tight">
              Institutional Profile & Governance
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
              Curate institutional missions, educational visions, chronological milestones, campus
              infrastructure facilities, and governing board members. All images are hosted on
              Cloudinary and rich biographies are crafted with Tiptap.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => fetchData(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 transition shadow-xs cursor-pointer disabled:opacity-50"
              title="Refresh Records"
            >
              <span>{refreshing ? 'Syncing...' : 'Refresh'}</span>
            </button>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg transition shadow-xs cursor-pointer active:scale-[0.98]"
            >
              <span>
                New{' '}
                {activeTab === 'missions'
                  ? 'Mission'
                  : activeTab === 'visions'
                  ? 'Vision'
                  : activeTab === 'milestones'
                  ? 'Milestone'
                  : activeTab === 'infrastructure'
                  ? 'Facility'
                  : 'Board Member'}
              </span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('missions')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'missions'
                ? 'bg-primary text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <span>Missions ({missions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('visions')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'visions'
                ? 'bg-primary text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <span>Visions ({visions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('milestones')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'milestones'
                ? 'bg-primary text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <span>Milestones ({milestones.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('infrastructure')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'infrastructure'
                ? 'bg-primary text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <span>Infrastructure & Campus ({infrastructure.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('board_members')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'board_members'
                ? 'bg-primary text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <span>Board Members ({boardMembers.length})</span>
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="sm:col-span-6 relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search ${
                activeTab === 'board_members' ? 'board members' : activeTab
              } by title, name, designation, or details...`}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
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

          {activeTab === 'infrastructure' ? (
            <div className="sm:col-span-3">
              <select
                value={facilityTypeFilter}
                onChange={(e) => setFacilityTypeFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              >
                <option value="all">Facility: All Types</option>
                {FACILITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="sm:col-span-3 flex items-center justify-end text-xs text-slate-500 dark:text-slate-400 px-2">
              Showing {currentList.length} of{' '}
              {activeTab === 'missions'
                ? missions.length
                : activeTab === 'visions'
                ? visions.length
                : activeTab === 'milestones'
                ? milestones.length
                : activeTab === 'infrastructure'
                ? infrastructure.length
                : boardMembers.length}{' '}
              records
            </div>
          )}
        </div>

        {/* Content Table / Cards */}
        {loading ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-16 flex flex-col items-center justify-center gap-3">
            <Loader />
            <span className="text-xs text-slate-500 dark:text-slate-400 animate-pulse">
              Loading {activeTab.replace('_', ' ')} data...
            </span>
          </div>
        ) : currentList.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              </div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No {activeTab.replace('_', ' ')} found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {searchTerm || statusFilter !== 'all'
                ? 'No items match your active search filters. Try clearing or relaxing the filters.'
                : `There are currently no ${activeTab.replace('_', ' ')} registered. Click "New ${
                    activeTab === 'board_members'
                      ? 'Board Member'
                      : activeTab.slice(0, -1)
                  }" to publish your first entry.`}
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary-dark rounded-md transition shadow-xs cursor-pointer"
            >
              <span>Create First Entry</span>
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
                    {(activeTab === 'milestones' ||
                      activeTab === 'infrastructure' ||
                      activeTab === 'board_members') && (
                      <th scope="col" className="px-4 py-3.5 w-24">
                        Image
                      </th>
                    )}
                    {activeTab === 'milestones' && (
                      <th scope="col" className="px-4 py-3.5 w-20">
                        Year
                      </th>
                    )}
                    <th scope="col" className="px-4 py-3.5">
                      {activeTab === 'board_members' ? 'Name & Designation' : 'Title & Details'}
                    </th>
                    {activeTab === 'infrastructure' && (
                      <th scope="col" className="px-4 py-3.5 w-36">
                        Facility Type
                      </th>
                    )}
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
                  {currentList.map((item, idx) => (
                    <tr
                      key={item.id || idx}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Order No / Index */}
                      <td className="px-4 py-3.5 text-center font-mono text-[11px] text-slate-400">
                        {item.order_no ?? idx + 1}
                      </td>

                      {/* Image Thumbnail (Milestones, Infrastructure, Board Members) */}
                      {(activeTab === 'milestones' ||
                        activeTab === 'infrastructure' ||
                        activeTab === 'board_members') && (
                        <td className="px-4 py-3.5">
                          {item.image ? (
                            <a
                              href={item.image}
                              target="_blank"
                              rel="noreferrer"
                              className={`block overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 group relative ${
                                activeTab === 'board_members'
                                  ? 'w-12 h-12 rounded-full'
                                  : 'w-14 h-12 rounded-md'
                              }`}
                              title="Click to view full Cloudinary image"
                            >
                              <img
                                src={item.image}
                                alt={item.name || item.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white">
                                ↗
                              </div>
                            </a>
                          ) : (
                            <div
                              className={`border border-dashed border-slate-300 dark:border-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-600 bg-slate-50 dark:bg-slate-950/50 ${
                                activeTab === 'board_members'
                                  ? 'w-12 h-12 rounded-full'
                                  : 'w-14 h-12 rounded-md'
                              }`}
                            >
                              <span className="text-[10px] text-slate-400">Photo</span>
                            </div>
                          )}
                        </td>
                      )}

                      {/* Year badge for Milestones */}
                      {activeTab === 'milestones' && (
                        <td className="px-4 py-3.5">
                          <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-xs font-semibold">
                            {item.year || '—'}
                          </span>
                        </td>
                      )}

                      {/* Title & Description or Board Member Details */}
                      <td className="px-4 py-3.5 space-y-1 max-w-md">
                        {activeTab === 'board_members' ? (
                          <>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-slate-900 dark:text-white text-xs">
                                {item.title ? `${item.title} ` : ''}
                                {item.name}
                              </span>
                              {item.designation && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                                  {item.designation}
                                </span>
                              )}
                            </div>

                            {item.bio && (
                              <div
                                className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed prose prose-xs dark:prose-invert max-w-none"
                                dangerouslySetInnerHTML={{ __html: item.bio }}
                              />
                            )}
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900 dark:text-white text-xs">
                                {item.title}
                              </span>
                              {item.subtitle && (
                                <span className="text-[11px] text-slate-400 truncate">
                                  • {item.subtitle}
                                </span>
                              )}
                            </div>

                            {/* Rich HTML preview from Tiptap */}
                            {item.description && (
                              <div
                                className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed prose prose-xs dark:prose-invert max-w-none"
                                dangerouslySetInnerHTML={{ __html: item.description }}
                              />
                            )}
                          </>
                        )}
                      </td>

                      {/* Facility Type Badge */}
                      {activeTab === 'infrastructure' && (
                        <td className="px-4 py-3.5">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
                            {item.facility_type || 'Campus Facility'}
                          </span>
                        </td>
                      )}

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
                          className="px-2 py-1 text-xs rounded text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer font-medium"
                          title="Edit"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setItemToDelete(item);
                            setDeleteConfirmOpen(true);
                          }}
                          className="px-2 py-1 text-xs rounded text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer font-medium"
                          title="Delete"
                        >
                          Delete
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
                  
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {modalMode === 'create' ? 'Create New' : 'Edit'}{' '}
                      {activeTab === 'missions'
                        ? 'Mission'
                        : activeTab === 'visions'
                        ? 'Vision'
                        : activeTab === 'milestones'
                        ? 'Milestone'
                        : activeTab === 'infrastructure'
                        ? 'Infrastructure Facility'
                        : 'Board Member'}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Fill out the fields below. Long text & biographies are formatted via Tiptap.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-2 py-1 text-xs rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Close
                </button>
              </div>

              {/* Modal Form Body */}
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* Board Member Specific Header Inputs (Name, Title, Designation) */}
                {activeTab === 'board_members' ? (
                  <div className="space-y-4">
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
                          Full Name <span className="text-rose-500">*</span>
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
                          value={formDesignation}
                          onChange={(e) => setFormDesignation(e.target.value)}
                          placeholder="e.g. Chairman of the Board, Founder Trustee, Managing Director"
                          required
                          className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Display Order Number
                        </label>
                        <div className="relative">
                          
                          <input
                            type="number"
                            value={formOrderNo}
                            onChange={(e) => setFormOrderNo(e.target.value)}
                            min="0"
                            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Milestone Year / Infrastructure Facility Type / Order */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {activeTab === 'milestones' && (
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
                      )}

                      {activeTab === 'infrastructure' && (
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Facility Classification <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={formFacilityType}
                            onChange={(e) => setFormFacilityType(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                          >
                            {FACILITY_TYPES.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Display Order Number
                        </label>
                        <div className="relative">
                          
                          <input
                            type="number"
                            value={formOrderNo}
                            onChange={(e) => setFormOrderNo(e.target.value)}
                            min="0"
                            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Title */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Title <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        placeholder={
                          activeTab === 'missions'
                            ? 'e.g. Applied Knowledge & Scientific Inquiry'
                            : activeTab === 'visions'
                            ? 'e.g. Center of Academic Innovation & Character'
                            : activeTab === 'milestones'
                            ? 'e.g. Inauguration of the Advanced Research Wing'
                            : 'e.g. Central Library & Computing Complex'
                        }
                        required
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                      />
                    </div>

                    {/* Subtitle (Infrastructure only) */}
                    {activeTab === 'infrastructure' && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Subtitle / Brief Tagline
                        </label>
                        <input
                          type="text"
                          value={formSubtitle}
                          onChange={(e) => setFormSubtitle(e.target.value)}
                          placeholder="e.g. Multi-story laboratory with 200+ connected terminals"
                          className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                        />
                      </div>
                    )}
                  </>
                )}

                {/* Cloudinary Image Upload Section (Milestones, Infrastructure, Board Members) */}
                {(activeTab === 'milestones' ||
                  activeTab === 'infrastructure' ||
                  activeTab === 'board_members') && (
                  <div className="space-y-2 border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-950/40">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <span>
                          {activeTab === 'board_members'
                            ? 'Member Portrait (Cloudinary Upload)'
                            : 'Cloudinary Stored Image'}
                        </span>
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

                    {/* Preview or Upload Area */}
                    {formImageUrl ? (
                      <div className="flex items-center gap-4 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                        <img
                          src={formImageUrl}
                          alt="Cloudinary Asset"
                          className={`object-cover border border-slate-200 dark:border-slate-700 ${
                            activeTab === 'board_members'
                              ? 'w-20 h-20 rounded-full'
                              : 'w-20 h-20 rounded-md'
                          }`}
                        />
                        <div className="flex-1 space-y-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
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
                              Replace Image
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
                              Uploading to Cloudinary...
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-1">
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
                )}

                {/* Tiptap Rich Text Description / Bio */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {activeTab === 'board_members'
                        ? 'Biography & Profile Details (Tiptap Rich Text Editor)'
                        : 'Description & Content (Tiptap Rich Text Editor)'}{' '}
                      {activeTab !== 'board_members' && <span className="text-rose-500">*</span>}
                    </label>
                    <span className="text-[10px] text-slate-400">
                      Supports headings, bold, italic, lists, and links
                    </span>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition">
                    <TiptapEditor
                      value={formDescription}
                      onChange={(val) => setFormDescription(val)}
                      placeholder={
                        activeTab === 'board_members'
                          ? 'Compose member biography, career highlights, and education...'
                          : `Compose detailed ${activeTab} description here...`
                      }
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
                      <span>
                        {modalMode === 'create'
                          ? activeTab === 'board_members'
                            ? 'Add Board Member'
                            : 'Publish Item'
                          : 'Save Changes'}
                      </span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmOpen && itemToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
              <div className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">Confirm Deletion</div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Delete {activeTab === 'board_members' ? 'Board Member' : activeTab.slice(0, -1)}?
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Are you sure you want to permanently delete{' '}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    &quot;{itemToDelete.name || itemToDelete.title}&quot;
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
                    setItemToDelete(null);
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
