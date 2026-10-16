'use client';

import React, { useState, useEffect, useContext, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import Loader from 'src/component/common/Loader';

export default function DepartmentHeadPage() {
  const { website, getApiEndpoint, tenantUrl } = useContext(TenantWebsiteContext);

  // Data states
  const [deptHeads, setDeptHeads] = useState([]);
  const [availableDepartments, setAvailableDepartments] = useState([]);
  const [availableTeachers, setAvailableTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'

  // INLINE Workstation Form states (NO popup modal)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create'); // 'create' | 'edit'
  const [editingRecord, setEditingRecord] = useState(null);

  // Form input states
  const [formDeptId, setFormDeptId] = useState('');
  const [formTeacherId, setFormTeacherId] = useState('');
  const [formName, setFormName] = useState('');
  const [formTitle, setFormTitle] = useState('Head of Department');
  const [formDesignation, setFormDesignation] = useState('Department Head');
  const [formImage, setFormImage] = useState('');
  const [formImageId, setFormImageId] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formJoiningDate, setFormJoiningDate] = useState('');
  const [formBio, setFormBio] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formOrderNo, setFormOrderNo] = useState(0);
  const [formIsActive, setFormIsActive] = useState(true);

  // INLINE Delete state (NO popup modal)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Expandable message view state on cards
  const [expandedMessageId, setExpandedMessageId] = useState(null);

  // Ref to scroll smoothly to editor workstation
  const formSectionRef = useRef(null);
  const fileInputRef = useRef(null);

  // State for pending image file
  const [selectedImageFile, setSelectedImageFile] = useState(null);

  // Endpoints
  const apiEndpoint = useMemo(() => getApiEndpoint('staff/panel/dept-heads'), [getApiEndpoint]);

  // Fetch Department Heads & lists
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await axios.get(apiEndpoint);
      if (res.data?.success) {
        setDeptHeads(res.data.dept_heads || res.data.department_heads || []);
        setAvailableDepartments(res.data.available_departments || res.data.departments || []);
        setAvailableTeachers(res.data.available_teachers || res.data.teachers || []);
      } else {
        toast.error(res.data?.error || 'Failed to load department heads.');
      }
    } catch (err) {
      console.error('Error fetching department heads:', err);
      toast.error(err.response?.data?.error || 'Failed to connect to department heads server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiEndpoint]);

  useEffect(() => {
    let ignore = false;
    const init = async () => {
      setLoading(true);
      try {
        const res = await axios.get(apiEndpoint);
        if (!ignore && res.data?.success) {
          setDeptHeads(res.data.dept_heads || res.data.department_heads || []);
          setAvailableDepartments(res.data.available_departments || res.data.departments || []);
          setAvailableTeachers(res.data.available_teachers || res.data.teachers || []);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Error initializing department heads:', err);
          toast.error(err.response?.data?.error || 'Failed to load department heads.');
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    init();
    return () => {
      ignore = true;
    };
  }, [apiEndpoint]);

  // Set of department IDs that already have a designated head
  const assignedDeptIds = useMemo(() => {
    return new Set(deptHeads.map((dh) => String(dh.department_id)));
  }, [deptHeads]);

  // Handle Teacher Selection for instant auto-fill
  const handleSelectTeacher = (teacherId) => {
    setFormTeacherId(teacherId);
    if (!teacherId) return;

    const selectedTeacher = availableTeachers.find((t) => String(t.id) === String(teacherId));
    if (selectedTeacher) {
      if (!formName || formName === 'Head of Department') setFormName(selectedTeacher.name || '');
      if (!formEmail && selectedTeacher.email) setFormEmail(selectedTeacher.email);
      if (!formPhone && selectedTeacher.phone) setFormPhone(selectedTeacher.phone);
      if (selectedTeacher.designation && (!formDesignation || formDesignation === 'Department Head')) {
        setFormDesignation(`${selectedTeacher.designation} & Department Head`);
      }
      if (!formImage && selectedTeacher.photo) {
        setFormImage(selectedTeacher.photo);
        setFormImageId(selectedTeacher.photo_id || '');
      }
      toast.success(`Pre-filled profile from faculty: ${selectedTeacher.name}`);
    }
  };

  // Image Select handler (Local preview only, no remote upload until submit)
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (JPG, PNG, WebP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB.');
      return;
    }

    setSelectedImageFile(file);
    const objectUrl = URL.createObjectURL(file);
    setFormImage(objectUrl);
    toast.success('Photo selected! Click "Save Department Head" to apply.');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Open Create Form
  const openCreateForm = (preselectDeptId = '') => {
    setFormMode('create');
    setEditingRecord(null);
    setSelectedImageFile(null);

    // Pick first unassigned department if not specified
    const defaultDept =
      preselectDeptId ||
      availableDepartments.find((d) => !assignedDeptIds.has(String(d.id)))?.id ||
      availableDepartments[0]?.id ||
      '';

    setFormDeptId(defaultDept ? String(defaultDept) : '');
    setFormTeacherId('');
    setFormName('');
    setFormTitle('Head of Department');
    setFormDesignation('Department Head');
    setFormImage('');
    setFormImageId('');
    setFormEmail('');
    setFormPhone('');
    setFormJoiningDate('');
    setFormBio('');
    setFormMessage('');
    setFormOrderNo(deptHeads.length);
    setFormIsActive(true);

    setIsFormOpen(true);
    setTimeout(() => {
      formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  // Open Edit Form
  const openEditForm = (head) => {
    setFormMode('edit');
    setEditingRecord(head);
    setSelectedImageFile(null);

    setFormDeptId(String(head.department_id || ''));
    setFormTeacherId(head.teacher_id ? String(head.teacher_id) : '');
    setFormName(head.name || '');
    setFormTitle(head.title || 'Head of Department');
    setFormDesignation(head.designation || 'Department Head');
    setFormImage(head.image || '');
    setFormImageId(head.image_id || '');
    setFormEmail(head.email || '');
    setFormPhone(head.phone || '');
    setFormJoiningDate(head.joining_date ? head.joining_date.substring(0, 10) : '');
    setFormBio(head.bio || '');
    setFormMessage(head.message || '');
    setFormOrderNo(head.order_no !== undefined ? head.order_no : 0);
    setFormIsActive(head.is_active !== undefined ? Boolean(head.is_active) : true);

    setIsFormOpen(true);
    setTimeout(() => {
      formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  // Close Form
  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingRecord(null);
    setSelectedImageFile(null);
  };

  // Save / Update Form Submission
  const handleSubmitForm = async (e) => {
    e.preventDefault();

    if (!formDeptId) {
      toast.error('Please select an academic department.');
      return;
    }
    if (!formName.trim()) {
      toast.error('Please enter the department head full name.');
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading(
      formMode === 'create' ? 'Saving new department head...' : 'Updating department head profile...'
    );

    try {
      const formData = new FormData();
      formData.append('department_id', parseInt(formDeptId, 10));
      if (formTeacherId) formData.append('teacher_id', parseInt(formTeacherId, 10));
      formData.append('name', formName.trim());
      formData.append('title', formTitle.trim() || 'Head of Department');
      formData.append('designation', formDesignation.trim() || 'Department Head');
      if (formEmail.trim()) formData.append('email', formEmail.trim());
      if (formPhone.trim()) formData.append('phone', formPhone.trim());
      if (formJoiningDate) formData.append('joining_date', formJoiningDate);
      if (formBio.trim()) formData.append('bio', formBio.trim());
      if (formMessage.trim()) formData.append('message', formMessage.trim());
      formData.append('order_no', parseInt(formOrderNo, 10) || 0);
      formData.append('is_active', Boolean(formIsActive));

      if (formMode === 'edit' && editingRecord?.id) {
        formData.append('id', editingRecord.id);
      }

      if (selectedImageFile) {
        formData.append('image', selectedImageFile);
      } else {
        if (formImage && !formImage.startsWith('blob:')) {
          formData.append('image', formImage);
        }
        if (formImageId) {
          formData.append('image_id', formImageId);
        }
      }

      let res;
      if (formMode === 'create') {
        res = await axios.post(apiEndpoint, formData);
      } else {
        res = await axios.put(apiEndpoint, formData);
      }

      if (res.data?.success) {
        toast.success(res.data.message || 'Department head saved successfully!', { id: toastId });
        setSelectedImageFile(null);
        await fetchData(true);
        handleCloseForm();
      } else {
        toast.error(res.data?.error || 'Operation failed.', { id: toastId });
      }
    } catch (err) {
      console.error('Submit error:', err);
      toast.error(err.response?.data?.error || 'Server error while saving department head.', { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Action
  const handleDelete = async (id, name) => {
    setDeletingId(id);
    const toastId = toast.loading(`Removing department head "${name}"...`);
    try {
      const res = await axios.delete(`${apiEndpoint}?id=${id}`);
      if (res.data?.success) {
        toast.success(res.data.message || `Department head "${name}" removed.`, { id: toastId });
        setDeptHeads((prev) => prev.filter((item) => item.id !== id));
        setDeleteConfirmId(null);
        if (editingRecord?.id === id) {
          handleCloseForm();
        }
      } else {
        toast.error(res.data?.error || 'Failed to delete department head.', { id: toastId });
      }
    } catch (err) {
      console.error('Delete error:', err);
      toast.error(err.response?.data?.error || 'Server error while deleting.', { id: toastId });
    } finally {
      setDeletingId(null);
    }
  };

  // Filtered List
  const filteredHeads = useMemo(() => {
    return deptHeads.filter((item) => {
      // Department filter
      if (selectedDeptFilter !== 'all' && String(item.department_id) !== String(selectedDeptFilter)) {
        return false;
      }
      // Status filter
      if (statusFilter === 'active' && !item.is_active) return false;
      if (statusFilter === 'inactive' && item.is_active) return false;

      // Search term
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      const name = (item.name || '').toLowerCase();
      const title = (item.title || '').toLowerCase();
      const desig = (item.designation || '').toLowerCase();
      const deptName = (item.department_name || '').toLowerCase();
      const email = (item.email || '').toLowerCase();
      const phone = (item.phone || '').toLowerCase();

      return (
        name.includes(q) ||
        title.includes(q) ||
        desig.includes(q) ||
        deptName.includes(q) ||
        email.includes(q) ||
        phone.includes(q)
      );
    });
  }, [deptHeads, selectedDeptFilter, statusFilter, searchTerm]);

  // Key metrics
  const metrics = useMemo(() => {
    const totalHeads = deptHeads.length;
    const totalDepts = availableDepartments.length;
    const assignedCount = assignedDeptIds.size;
    const pendingDepts = Math.max(0, totalDepts - assignedCount);
    const activeHeads = deptHeads.filter((h) => h.is_active).length;
    return {
      totalHeads,
      totalDepts,
      pendingDepts,
      activeHeads,
    };
  }, [deptHeads, availableDepartments, assignedDeptIds]);

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-900/60">
            Academic Administration
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-2">
            Department Heads
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Designate, manage, and present executive leadership, chairpersons, and heads of each academic department with credentials, welcome messages, and official contacts.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer disabled:opacity-60"
            title="Refresh list"
          >
            Refresh
          </button>

          <Link
            href={tenantUrl('/staff-panel/departments')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
          >
            Departments Setup
          </Link>

          <Link
            href={tenantUrl('/staff-panel/department-information')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
          >
            Department Profiles
          </Link>

          {!isFormOpen ? (
            <button
              type="button"
              onClick={() => openCreateForm()}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-xs transition-colors cursor-pointer"
            >
              + Add Department Head
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCloseForm}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            >
              Close Workstation
            </button>
          )}
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Heads
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {metrics.totalHeads}
            </span>
            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Designated</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Departments
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {metrics.totalDepts}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Available</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Unassigned
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span
              className={`text-2xl font-bold ${
                metrics.pendingDepts > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600'
              }`}
            >
              {metrics.pendingDepts}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Vacant</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Active Status
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {metrics.activeHeads}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Published</span>
          </div>
        </div>
      </div>

      {/* INLINE WORKSTATION FORM (NO POPUP MODAL) */}
      {isFormOpen && (
        <div
          ref={formSectionRef}
          className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-blue-500/40 dark:border-blue-500/30 shadow-md p-5 sm:p-7 space-y-6 transition-all"
        >
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                {formMode === 'create'
                  ? '• New Department Head Workstation'
                  : `• Editing: ${editingRecord?.name || 'Department Head'}`}
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                {formMode === 'create'
                  ? 'Designate Department Head'
                  : `Update Department Head Profile (${editingRecord?.department_name || ''})`}
              </h2>
            </div>
            <button
              type="button"
              onClick={handleCloseForm}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer font-medium"
            >
              Cancel / Close
            </button>
          </div>

          <form onSubmit={handleSubmitForm} className="space-y-6">
            {/* Row 1: Department Selection & Teacher Quick-Fill */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Academic Department <span className="text-red-500">*</span>
                </label>
                <select
                  value={formDeptId}
                  onChange={(e) => setFormDeptId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                >
                  <option value="">-- Select Academic Department --</option>
                  {availableDepartments.map((dept) => {
                    const isTaken =
                      assignedDeptIds.has(String(dept.id)) &&
                      (formMode === 'create' || String(editingRecord?.department_id) !== String(dept.id));
                    return (
                      <option key={dept.id} value={dept.id} disabled={isTaken}>
                        {dept.name} {dept.code ? `(${dept.code})` : ''} {isTaken ? '— [Already Assigned]' : ''}
                      </option>
                    );
                  })}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Each academic department has one primary designated head card.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Quick Link from Registered Faculty (Optional)
                </label>
                <select
                  value={formTeacherId}
                  onChange={(e) => handleSelectTeacher(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                >
                  <option value="">-- None / Custom Head Profile --</option>
                  {availableTeachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name} {teacher.designation ? `(${teacher.designation})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Selecting a teacher will automatically pre-fill name, email, phone, and photo.
                </p>
              </div>
            </div>

            {/* Row 2: Name, Title & Designation */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  placeholder="e.g. Dr. Mohammad Rafiqul Islam"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Salutation / Title
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Professor & Dean, Head of Department"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Role / Designation
                </label>
                <input
                  type="text"
                  value={formDesignation}
                  onChange={(e) => setFormDesignation(e.target.value)}
                  placeholder="e.g. Department Head, Chairman"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Row 3: Contacts & Appointment Date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Official Email
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="e.g. head.eee@institution.edu.bd"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Official Contact Phone
                </label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="e.g. +880 1711-000000"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Joining / Appointment Date
                </label>
                <input
                  type="date"
                  value={formJoiningDate}
                  onChange={(e) => setFormJoiningDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Row 4: Image Upload & Preview */}
            <div className="bg-slate-50/70 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Executive Profile Photograph
              </label>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {/* Photo Preview */}
                <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
                  {formImage ? (
                    <img
                      src={formImage}
                      alt="Head Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '';
                      }}
                    />
                  ) : (
                    <span className="text-[10px] text-slate-400 text-center font-medium px-1">
                      No Photo
                    </span>
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="hidden"
                      id="head-image-input"
                    />
                    <label
                      htmlFor="head-image-input"
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer ${
                        uploadingImage ? 'opacity-60 pointer-events-none' : ''
                      }`}
                    >
                      {uploadingImage ? 'Uploading to Cloud...' : 'Upload Image'}
                    </label>

                    {formImage && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedImageFile(null);
                          setFormImage('');
                          setFormImageId('');
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="px-3 py-2 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                      >
                        Remove Photo
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={formImage}
                      onChange={(e) => setFormImage(e.target.value)}
                      placeholder="Or enter direct image URL (https://...)"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Recommended: Square portrait image (400x400 or larger), JPG or WebP format.
                  </p>
                </div>
              </div>
            </div>

            {/* Row 5: Bio & Welcome Message */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Executive Biography / Background Summary
                </label>
                <textarea
                  rows={4}
                  value={formBio}
                  onChange={(e) => setFormBio(e.target.value)}
                  placeholder="e.g. Dr. Mohammad Rafiqul Islam has over 20 years of academic teaching and engineering research experience..."
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Message from Head of Department
                </label>
                <textarea
                  rows={4}
                  value={formMessage}
                  onChange={(e) => setFormMessage(e.target.value)}
                  placeholder="Welcome to our department! We are dedicated to providing cutting-edge education, innovative research, and hands-on skills..."
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Row 6: Order No & Active Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-1 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Display Order Priority
                </label>
                <input
                  type="number"
                  min="0"
                  value={formOrderNo}
                  onChange={(e) => setFormOrderNo(parseInt(e.target.value, 10) || 0)}
                  className="w-32 px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <span className="text-[11px] text-slate-400 ml-2">Lower numbers appear first.</span>
              </div>

              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                </label>
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {formIsActive ? 'Active & Published' : 'Draft / Inactive'}
                  </span>
                  <p className="text-[10px] text-slate-400">
                    Controls visibility on public department detail pages.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleCloseForm}
                className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting || uploadingImage}
                className="inline-flex items-center gap-1.5 px-6 py-2.5 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-60"
              >
                {submitting
                  ? 'Saving...'
                  : formMode === 'create'
                  ? 'Save Department Head'
                  : 'Update Department Head'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Control Bar: Search & Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2.5 flex-wrap">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by head name, title, designation, department, email..."
              className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Department Filter */}
          <div className="w-48">
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
            >
              <option value="all">All Departments ({deptHeads.length})</option>
              {availableDepartments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="w-36">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          <div className="flex items-center p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Cards View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Table View
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader />
          <p className="text-xs text-slate-400">Loading department heads data...</p>
        </div>
      ) : filteredHeads.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto text-2xl font-bold border border-blue-100 dark:border-blue-900/50">
            DH
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No department heads found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {searchTerm || selectedDeptFilter !== 'all' || statusFilter !== 'all'
                ? 'No department heads match your current search and filter criteria.'
                : 'Get started by designating your first department head to lead an academic department.'}
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={() => openCreateForm()}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer"
            >
              + Designate Department Head
            </button>
          </div>
        </div>
      ) : viewMode === 'cards' ? (
        /* Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredHeads.map((head) => {
            const isDeleting = deletingId === head.id;
            const isConfirming = deleteConfirmId === head.id;
            const isMessageOpen = expandedMessageId === head.id;

            return (
              <div
                key={head.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  {/* Top card bar: Department badge & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/70 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-900/60 truncate max-w-[200px]">
                      {head.department_name} {head.department_code ? `(${head.department_code})` : ''}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        head.is_active
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          head.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                        }`}
                      />
                      {head.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Profile Header: Avatar & Names */}
                  <div className="flex items-center gap-3.5 pt-1">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 shadow-2xs">
                      {head.image ? (
                        <img
                          src={head.image}
                          alt={head.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '';
                          }}
                        />
                      ) : (
                        <span className="text-base uppercase">
                          {head.name
                            ? head.name
                                .split(' ')
                                .slice(0, 2)
                                .map((n) => n[0])
                                .join('')
                            : 'DH'}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {head.name}
                      </h3>
                      {head.title && (
                        <p className="text-[11px] font-medium text-blue-600 dark:text-blue-400 truncate mt-0.5">
                          {head.title}
                        </p>
                      )}
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {head.designation || 'Department Head'}
                      </p>
                    </div>
                  </div>

                  {/* Contact Info Pills */}
                  <div className="space-y-1.5 pt-1 text-[11px] text-slate-600 dark:text-slate-300">
                    {head.email && (
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-slate-400 text-xs shrink-0">@</span>
                        <a
                          href={`mailto:${head.email}`}
                          className="hover:underline hover:text-blue-600 truncate"
                        >
                          {head.email}
                        </a>
                      </div>
                    )}
                    {head.phone && (
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-slate-400 text-xs shrink-0">#</span>
                        <a
                          href={`tel:${head.phone}`}
                          className="hover:underline hover:text-blue-600 truncate"
                        >
                          {head.phone}
                        </a>
                      </div>
                    )}
                    {head.joining_date && (
                      <div className="flex items-center gap-2 text-slate-400">
                        <span className="text-xs shrink-0">•</span>
                        <span>Joined: {new Date(head.joining_date).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Bio / Message snippet */}
                  {(head.bio || head.message) && (
                    <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3 border border-slate-100 dark:border-slate-800/80 text-xs space-y-1.5">
                      {head.bio && (
                        <p className="text-slate-600 dark:text-slate-300 text-[11px] line-clamp-2">
                          <span className="font-semibold text-slate-700 dark:text-slate-200">Bio: </span>
                          {head.bio}
                        </p>
                      )}
                      {head.message && (
                        <div>
                          <button
                            type="button"
                            onClick={() => setExpandedMessageId(isMessageOpen ? null : head.id)}
                            className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
                          >
                            <span>{isMessageOpen ? 'Hide Welcome Note' : 'Read Welcome Note'}</span>
                            <span className="text-[10px]">{isMessageOpen ? '▲' : '▼'}</span>
                          </button>
                          {isMessageOpen && (
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1.5 italic bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 whitespace-pre-line">
                              "{head.message}"
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Card Actions & Inline Delete Confirmation */}
                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                  {isConfirming ? (
                    <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 rounded-xl p-2.5 text-center space-y-2">
                      <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">
                        Remove head "{head.name}"?
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isDeleting}
                          onClick={() => handleDelete(head.id, head.name)}
                          className="px-3 py-1 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer disabled:opacity-60"
                        >
                          {isDeleting ? 'Removing...' : 'Confirm Remove'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={tenantUrl(`/departments/${head.department_slug || head.department_id}`)}
                        target="_blank"
                        className="text-[11px] text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
                      >
                        Public Profile ↗
                      </Link>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditForm(head)}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(head.id)}
                          className="px-2.5 py-1.5 text-xs font-medium rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold">
                  <th className="py-3.5 px-4">Head & Title</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Designation</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Order</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                {filteredHeads.map((head) => {
                  const isDeleting = deletingId === head.id;
                  const isConfirming = deleteConfirmId === head.id;

                  return (
                    <tr
                      key={head.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
                            {head.image ? (
                              <img
                                src={head.image}
                                alt={head.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span>{head.name ? head.name.charAt(0).toUpperCase() : 'H'}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 dark:text-white truncate">
                              {head.name}
                            </div>
                            <div className="text-[11px] text-blue-600 dark:text-blue-400 truncate">
                              {head.title || 'Department Head'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-900 dark:text-white">
                          {head.department_name}
                        </span>
                        {head.department_code && (
                          <span className="text-[10px] text-slate-400 block">
                            Code: {head.department_code}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="text-slate-600 dark:text-slate-300">
                          {head.designation || 'Head of Department'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-[11px]">
                        <div>{head.email || '—'}</div>
                        <div className="text-slate-400">{head.phone || ''}</div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                        {head.order_no}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            head.is_active
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              head.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          {head.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {isConfirming ? (
                          <div className="inline-flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/50 p-1 rounded-lg border border-rose-200 dark:border-rose-900/60">
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-2 py-1 text-[11px] rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={isDeleting}
                              onClick={() => handleDelete(head.id, head.name)}
                              className="px-2.5 py-1 text-[11px] font-semibold rounded bg-rose-600 text-white cursor-pointer"
                            >
                              {isDeleting ? '...' : 'Confirm'}
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditForm(head)}
                              className="px-2.5 py-1 rounded text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(head.id)}
                              className="px-2.5 py-1 rounded text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-medium cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
