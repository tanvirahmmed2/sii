/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import Loader from 'src/component/common/Loader';

export default function EventsWorkstation({ portalType = 'staff' }) {
  const { getApiEndpoint } = useContext(TenantWebsiteContext);

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [applicableFilter, setApplicableFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Inline Form state (NO POPUP)
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formEventDate, setFormEventDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formImage, setFormImage] = useState('');
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [formIsApplicable, setFormIsApplicable] = useState(true);
  const [formIsActive, setFormIsActive] = useState(true);

  // Inline Applicants Workstation state (NO POPUP)
  const [activeEventForApplicants, setActiveEventForApplicants] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [applicantSearch, setApplicantSearch] = useState('');
  const [applicantStatusFilter, setApplicantStatusFilter] = useState('all');

  // Base API endpoints
  const apiEventsUrl = useMemo(() => {
    return portalType === 'officer'
      ? getApiEndpoint('officer/events')
      : getApiEndpoint('staff/panel/events');
  }, [portalType, getApiEndpoint]);

  const apiApplicantsUrl = useMemo(() => {
    return portalType === 'officer'
      ? getApiEndpoint('officer/events/applicants')
      : getApiEndpoint('staff/panel/events/applicants');
  }, [portalType, getApiEndpoint]);

  // Image Preview URL (local blob or existing image URL)
  const imagePreview = useMemo(() => {
    if (selectedImageFile) {
      return URL.createObjectURL(selectedImageFile);
    }
    if (!removeExistingImage && formImage) {
      return formImage;
    }
    return null;
  }, [selectedImageFile, removeExistingImage, formImage]);

  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  // Load events
  const fetchEvents = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await axios.get(apiEventsUrl);
      if (res.data?.success) {
        setEvents(res.data.events || []);
      }
    } catch (err) {
      console.error('Error fetching events:', err);
      toast.error(err.response?.data?.error || 'Failed to load events.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiEventsUrl]);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const res = await axios.get(apiEventsUrl);
        if (!ignore && res.data?.success) {
          setEvents(res.data.events || []);
        }
      } catch (err) {
        console.error('Error loading events:', err);
        if (!ignore) toast.error(err.response?.data?.error || 'Failed to load events.');
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    load();
    return () => {
      ignore = true;
    };
  }, [apiEventsUrl]);

  // Open inline Create form
  const handleOpenCreateForm = () => {
    setEditingEvent(null);
    setFormTitle('');
    setFormDescription('');
    setFormLocation('');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    setFormEventDate(tomorrow.toISOString().slice(0, 16));
    setFormEndDate('');
    setFormImage('');
    setSelectedImageFile(null);
    setRemoveExistingImage(false);
    setFormIsApplicable(true);
    setFormIsActive(true);
    setShowForm(true);
    setActiveEventForApplicants(null);
  };

  // Open inline Edit form
  const handleOpenEditForm = (event) => {
    setEditingEvent(event);
    setFormTitle(event.title || '');
    setFormDescription(event.description || '');
    setFormLocation(event.location || '');
    setFormEventDate(event.event_date ? new Date(event.event_date).toISOString().slice(0, 16) : '');
    setFormEndDate(event.end_date ? new Date(event.end_date).toISOString().slice(0, 16) : '');
    setFormImage(event.image || '');
    setSelectedImageFile(null);
    setRemoveExistingImage(false);
    setFormIsApplicable(Boolean(event.is_applicable));
    setFormIsActive(Boolean(event.is_active));
    setShowForm(true);
    setActiveEventForApplicants(null);
  };

  // Close inline form
  const handleCloseForm = () => {
    setShowForm(false);
    setEditingEvent(null);
    setSelectedImageFile(null);
    setRemoveExistingImage(false);
  };

  // Handle local file selection (no upload triggered)
  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (JPG, PNG, WEBP).');
      return;
    }
    setSelectedImageFile(file);
    setRemoveExistingImage(false);
  };

  // Remove photo from current state
  const handleRemovePhoto = () => {
    setSelectedImageFile(null);
    if (editingEvent && formImage) {
      setRemoveExistingImage(true);
    }
  };

  // Submit Event (Create or Update via Multipart Form Data)
  const handleSubmitEvent = async (e) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast.error('Event title is required.');
      return;
    }
    if (!formEventDate) {
      toast.error('Event date and time is required.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', formTitle.trim());
      formData.append('description', formDescription || '');
      formData.append('location', formLocation.trim() || '');
      formData.append('event_date', new Date(formEventDate).toISOString());
      if (formEndDate) {
        formData.append('end_date', new Date(formEndDate).toISOString());
      }
      formData.append('is_applicable', String(Boolean(formIsApplicable)));
      formData.append('is_active', String(Boolean(formIsActive)));

      if (editingEvent) {
        formData.append('id', editingEvent.id);
        if (selectedImageFile) {
          formData.append('image', selectedImageFile);
        } else if (removeExistingImage) {
          formData.append('remove_image', 'true');
        }

        const res = await axios.put(apiEventsUrl, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (res.data?.success) {
          toast.success('Event updated successfully.');
          handleCloseForm();
          fetchEvents(true);
        }
      } else {
        if (selectedImageFile) {
          formData.append('image', selectedImageFile);
        }

        const res = await axios.post(apiEventsUrl, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (res.data?.success) {
          toast.success('Event created successfully.');
          handleCloseForm();
          fetchEvents(true);
        }
      }
    } catch (err) {
      console.error('Error saving event:', err);
      toast.error(err.response?.data?.error || 'Failed to save event.');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle is_applicable quickly
  const handleToggleApplicable = async (event) => {
    const nextVal = !event.is_applicable;
    try {
      const res = await axios.put(apiEventsUrl, {
        id: event.id,
        is_applicable: nextVal,
      });
      if (res.data?.success) {
        setEvents((prev) =>
          prev.map((e) => (e.id === event.id ? { ...e, is_applicable: nextVal } : e))
        );
        toast.success(
          nextVal
            ? 'Event is now OPEN for student applications.'
            : 'Event set to Information-Only (No applications).'
        );
      }
    } catch (err) {
      toast.error('Failed to update applicability status.');
    }
  };

  // Toggle is_active
  const handleToggleActive = async (event) => {
    const nextVal = !event.is_active;
    try {
      const res = await axios.put(apiEventsUrl, {
        id: event.id,
        is_active: nextVal,
      });
      if (res.data?.success) {
        setEvents((prev) =>
          prev.map((e) => (e.id === event.id ? { ...e, is_active: nextVal } : e))
        );
        toast.success(nextVal ? 'Event activated.' : 'Event set to inactive.');
      }
    } catch (err) {
      toast.error('Failed to update active status.');
    }
  };

  // Delete event
  const handleDeleteEvent = async (event) => {
    if (!window.confirm(`Are you sure you want to delete "${event.title}"? All applicant registrations and event images will be permanently removed.`)) {
      return;
    }

    try {
      const res = await axios.delete(`${apiEventsUrl}?id=${event.id}`);
      if (res.data?.success) {
        toast.success('Event deleted successfully.');
        setEvents((prev) => prev.filter((e) => e.id !== event.id));
        if (activeEventForApplicants?.id === event.id) {
          setActiveEventForApplicants(null);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete event.');
    }
  };

  // View Applicants (Opens Inline Workstation, NO POPUP)
  const handleViewApplicants = async (event) => {
    setShowForm(false);
    setActiveEventForApplicants(event);
    setLoadingApplicants(true);
    setApplicants([]);
    setApplicantSearch('');
    setApplicantStatusFilter('all');

    try {
      const res = await axios.get(`${apiEventsUrl}?applicants=true&event_id=${event.id}`);
      if (res.data?.success) {
        setApplicants(res.data.applicants || []);
      }
    } catch (err) {
      console.error('Error fetching applicants:', err);
      toast.error(err.response?.data?.error || 'Failed to load applicants.');
    } finally {
      setLoadingApplicants(false);
    }
  };

  // Update Applicant Status
  const handleUpdateApplicantStatus = async (applicantId, newStatus) => {
    try {
      const res = await axios.put(apiApplicantsUrl, {
        applicant_id: applicantId,
        status: newStatus,
      });
      if (res.data?.success) {
        toast.success(`Applicant status updated to ${newStatus}.`);
        setApplicants((prev) =>
          prev.map((a) => (a.applicant_id === applicantId ? { ...a, status: newStatus } : a))
        );
      }
    } catch (err) {
      toast.error('Failed to update status.');
    }
  };

  // Remove an Applicant
  const handleRemoveApplicant = async (applicant) => {
    if (!window.confirm(`Remove student ${applicant.student_name} from this event?`)) {
      return;
    }

    try {
      const res = await axios.delete(`${apiApplicantsUrl}?applicant_id=${applicant.applicant_id}`);
      if (res.data?.success) {
        toast.success('Applicant removed.');
        setApplicants((prev) => prev.filter((a) => a.applicant_id !== applicant.applicant_id));
        setEvents((prev) =>
          prev.map((e) =>
            e.id === activeEventForApplicants?.id
              ? { ...e, total_applicants: Math.max(0, (e.total_applicants || 1) - 1) }
              : e
          )
        );
      }
    } catch (err) {
      toast.error('Failed to remove applicant.');
    }
  };

  // Download Applicants in Excel Sheet (.xlsx)
  const handleDownloadExcel = () => {
    if (!activeEventForApplicants) return;
    if (!applicants || applicants.length === 0) {
      toast.error('No applicants to export.');
      return;
    }

    try {
      const eventDateStr = activeEventForApplicants.event_date
        ? new Date(activeEventForApplicants.event_date).toLocaleString()
        : 'N/A';

      const rows = [
        ['CAMPUS EVENT APPLICANTS ROSTER'],
        ['Event Title:', activeEventForApplicants.title],
        ['Event Date & Time:', eventDateStr],
        ['Venue / Location:', activeEventForApplicants.location || 'N/A'],
        ['Total Registered Students:', applicants.length],
        ['Export Timestamp:', new Date().toLocaleString()],
        [],
        [
          'SL',
          'Student Name',
          'Registration No',
          'Roll No',
          'Class',
          'Section',
          'Academic Session',
          'Email Address',
          'Phone Number',
          'Application Date',
          'Status',
          'Notes'
        ]
      ];

      applicants.forEach((app, idx) => {
        rows.push([
          idx + 1,
          app.student_name || 'N/A',
          app.registration_no || 'N/A',
          app.roll_no || 'N/A',
          app.class_name || 'N/A',
          app.section_name || 'N/A',
          app.session_name || 'N/A',
          app.student_email || 'N/A',
          app.student_phone || 'N/A',
          app.applied_at ? new Date(app.applied_at).toLocaleString() : 'N/A',
          app.status || 'registered',
          app.notes || '',
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [
        { wch: 6 },
        { wch: 24 },
        { wch: 18 },
        { wch: 12 },
        { wch: 14 },
        { wch: 12 },
        { wch: 16 },
        { wch: 28 },
        { wch: 16 },
        { wch: 22 },
        { wch: 14 },
        { wch: 20 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Applicants');

      const safeTitle = (activeEventForApplicants.title || 'event')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .toLowerCase()
        .slice(0, 30);
      const fileName = `event_applicants_${safeTitle}_${new Date().toISOString().slice(0, 10)}.xlsx`;

      XLSX.writeFile(wb, fileName);
      toast.success(`Excel sheet downloaded: ${fileName}`);
    } catch (err) {
      console.error('Error generating Excel file:', err);
      toast.error('Failed to generate Excel file.');
    }
  };

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const matchesSearch =
        !searchTerm.trim() ||
        e.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesApplicable =
        applicableFilter === 'all' ||
        (applicableFilter === 'applicable' && e.is_applicable) ||
        (applicableFilter === 'non_applicable' && !e.is_applicable);

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && e.is_active) ||
        (statusFilter === 'inactive' && !e.is_active);

      return matchesSearch && matchesApplicable && matchesStatus;
    });
  }, [events, searchTerm, applicableFilter, statusFilter]);

  // Filtered Applicants
  const filteredApplicants = useMemo(() => {
    return applicants.filter((a) => {
      const matchesSearch =
        !applicantSearch.trim() ||
        a.student_name?.toLowerCase().includes(applicantSearch.toLowerCase()) ||
        a.registration_no?.toLowerCase().includes(applicantSearch.toLowerCase()) ||
        a.roll_no?.toString().includes(applicantSearch) ||
        a.student_phone?.includes(applicantSearch) ||
        a.class_name?.toLowerCase().includes(applicantSearch.toLowerCase());

      const matchesStatus =
        applicantStatusFilter === 'all' || a.status === applicantStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [applicants, applicantSearch, applicantStatusFilter]);

  // KPI stats
  const stats = useMemo(() => {
    const total = events.length;
    const applicable = events.filter((e) => e.is_applicable).length;
    const nonApplicable = total - applicable;
    const totalApplicants = events.reduce((sum, e) => sum + (parseInt(e.total_applicants, 10) || 0), 0);
    const totalInterested = events.reduce((sum, e) => sum + (parseInt(e.interested_count, 10) || 0), 0);
    return { total, applicable, nonApplicable, totalApplicants, totalInterested };
  }, [events]);

  return (
    <div className="w-full space-y-4">
      {/* Page Header */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="text-primary text-[11px] font-semibold uppercase tracking-wider mb-0.5">
            {portalType === 'officer' ? 'Officer Operations' : 'Staff Operations Desk'}
          </div>
          <h1 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
            Campus Events Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Schedule institutional events, toggle student applications, review registered student applicants, and export rosters in Excel (.xlsx).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchEvents(true)}
            disabled={refreshing}
            className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium transition cursor-pointer"
          >
            {refreshing ? 'Syncing...' : 'Sync'}
          </button>

          {!showForm && !activeEventForApplicants && (
            <button
              onClick={handleOpenCreateForm}
              className="px-3.5 py-1.5 rounded-md bg-primary hover:bg-primary-dark text-white text-xs font-medium transition cursor-pointer shadow-xs"
            >
              + Create New Event
            </button>
          )}

          {(showForm || activeEventForApplicants) && (
            <button
              onClick={() => {
                handleCloseForm();
                setActiveEventForApplicants(null);
              }}
              className="px-3.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium transition cursor-pointer"
            >
              Back to Events List
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3.5">
          <p className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 tracking-wider">
            Total Events
          </p>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="text-xl font-semibold text-slate-900 dark:text-white font-mono">
              {stats.total}
            </span>
            <span className="text-[11px] text-slate-500">Scheduled</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3.5">
          <p className="text-[10px] uppercase font-semibold text-emerald-700 dark:text-emerald-400 tracking-wider">
            Applicable (RSVP)
          </p>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="text-xl font-semibold text-emerald-700 dark:text-emerald-400 font-mono">
              {stats.applicable}
            </span>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400">Open</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3.5">
          <p className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 tracking-wider">
            Info Only
          </p>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="text-xl font-semibold text-slate-600 dark:text-slate-300 font-mono">
              {stats.nonApplicable}
            </span>
            <span className="text-[11px] text-slate-500">No RSVP</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3.5">
          <p className="text-[10px] uppercase font-semibold text-amber-700 dark:text-amber-400 tracking-wider">
            Student Interest
          </p>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="text-xl font-semibold text-amber-700 dark:text-amber-400 font-mono">
              {stats.totalInterested}
            </span>
            <span className="text-[11px] text-amber-700 dark:text-amber-400">Interested</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3.5">
          <p className="text-[10px] uppercase font-semibold text-primary tracking-wider">
            Total Applicants
          </p>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="text-xl font-semibold text-primary font-mono">
              {stats.totalApplicants}
            </span>
            <span className="text-[11px] text-primary">Registered</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* INLINE WORKSTATION SECTION 1: CREATE OR EDIT EVENT FORM (NO POPUP) */}
      {/* ========================================================================= */}
      {showForm && (
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                {editingEvent ? `Edit Event: ${editingEvent.title}` : 'Schedule New Campus Event'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Complete event details and attach a promotional image banner. The image is uploaded securely during table record creation.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCloseForm}
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSubmitEvent} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Event Title */}
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Event Title <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual Inter-School Science Fair 2026"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>

              {/* Start Date & Time */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Event Date & Time <span className="text-rose-600">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formEventDate}
                  onChange={(e) => setFormEventDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>

              {/* End Date & Time */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  End Date & Time (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>

              {/* Location / Venue */}
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Venue / Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Main Campus Auditorium / Science Complex Room 204"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>

              {/* Description */}
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Event Description & Guidelines
                </label>
                <textarea
                  rows={3}
                  placeholder="Provide event details, schedule agenda, eligibility criteria, and instructions for attendees..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>

              {/* Image Input (Table-first pattern like awards: held in local state, no direct upload) */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Event Banner / Poster Image
                </label>
                <div className="p-3 border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50/50 dark:bg-slate-800/40">
                  {imagePreview ? (
                    <div className="flex items-start gap-4">
                      <div className="w-24 h-24 rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden flex-shrink-0 bg-slate-100 dark:bg-slate-900">
                        <img
                          src={imagePreview}
                          alt="Event preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="space-y-2 flex-1">
                        <div className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                          {selectedImageFile ? selectedImageFile.name : 'Current Event Banner'}
                        </div>
                        {selectedImageFile && (
                          <div className="text-[11px] text-slate-500 font-mono">
                            {(selectedImageFile.size / 1024).toFixed(1)} KB • Ready to upload upon saving
                          </div>
                        )}
                        <div className="flex items-center gap-2 pt-1">
                          <label className="px-2.5 py-1 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer">
                            Change Photo
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleImageFileChange}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={handleRemovePhoto}
                            className="px-2.5 py-1 text-xs font-medium rounded-md border border-rose-200 text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          >
                            Remove Photo
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-4 border border-dashed border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900/60 text-center">
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        Select an event poster or promotional banner
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        PNG, JPG, or WEBP up to 5MB. Stored automatically when saving this event.
                      </p>
                      <label className="mt-2.5 px-3 py-1.5 text-xs font-medium rounded-md bg-primary hover:bg-primary-dark text-white transition cursor-pointer shadow-xs">
                        Select Image File
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageFileChange}
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* is_applicable Toggle */}
              <div className="md:col-span-2 p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsApplicable}
                    onChange={(e) => setFormIsApplicable(e.target.checked)}
                    className="mt-0.5 rounded text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="text-xs font-medium text-slate-900 dark:text-white block">
                      Allow Student Applications (Applicable for Enrolled Students)
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      If checked, enrolled students can view this event in their student portal and register their participation.
                      If unchecked, this event is published as <strong>Information-Only</strong> without registration buttons.
                    </p>
                  </div>
                </label>
              </div>

              {/* is_active Toggle */}
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span>Publish as Active Event (Visible on Institutional Website)</span>
                </label>
              </div>
            </div>

            {/* Form Action Buttons */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
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
                className="px-4 py-1.5 rounded-md bg-primary hover:bg-primary-dark text-white text-xs font-medium transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                {submitting ? 'Saving Event...' : editingEvent ? 'Save Changes' : 'Create Event'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* INLINE WORKSTATION SECTION 2: APPLICANTS ROSTER & EXCEL DOWNLOAD (NO POPUP) */}
      {/* ========================================================================= */}
      {activeEventForApplicants && (
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 uppercase">
                  Applicant Roster
                </span>
                {activeEventForApplicants.is_applicable ? (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                    Applicable (Open)
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                    Applications Closed
                  </span>
                )}
              </div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                {activeEventForApplicants.title}
              </h2>
              <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3 mt-1">
                <span>
                  Date: {new Date(activeEventForApplicants.event_date).toLocaleDateString()}
                </span>
                <span>•</span>
                <span>Venue: {activeEventForApplicants.location || 'Campus Auditorium'}</span>
                <span>•</span>
                <span>Registered Students: {applicants.length}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadExcel}
                disabled={applicants.length === 0}
                className="px-3.5 py-1.5 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium transition cursor-pointer shadow-xs disabled:opacity-40"
              >
                Download in Excel Sheet
              </button>
              <button
                type="button"
                onClick={() => setActiveEventForApplicants(null)}
                className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium transition cursor-pointer"
              >
                Close Roster
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                placeholder="Filter by student name, roll, reg..."
                value={applicantSearch}
                onChange={(e) => setApplicantSearch(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={applicantStatusFilter}
                onChange={(e) => setApplicantStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden"
              >
                <option value="all">All Applicant Statuses</option>
                <option value="registered">Registered</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>

              <span className="text-xs text-slate-500 whitespace-nowrap">
                Showing {filteredApplicants.length} of {applicants.length}
              </span>
            </div>
          </div>

          {/* Applicants List Table */}
          {loadingApplicants ? (
            <div className="py-12 text-center flex flex-col items-center justify-center">
              <Loader size="md" />
              <p className="text-xs text-slate-500 mt-2 font-medium">Fetching applicant records...</p>
            </div>
          ) : filteredApplicants.length === 0 ? (
            <div className="py-12 text-center space-y-1">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                No Applicants Found
              </p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {applicants.length === 0
                  ? 'No students have applied for this event yet.'
                  : 'No applicant matches your search query.'}
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Student</th>
                      <th className="py-2.5 px-3">Class & Section</th>
                      <th className="py-2.5 px-3">Contact Info</th>
                      <th className="py-2.5 px-3">Applied At</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {filteredApplicants.map((app, idx) => (
                      <tr
                        key={app.applicant_id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20"
                      >
                        <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {app.student_name}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Roll: {app.roll_no || 'N/A'} • Reg: {app.registration_no || 'N/A'}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {app.class_name || 'N/A'}
                          </span>
                          {app.section_name && (
                            <span className="text-slate-400 text-[11px] ml-1">
                              ({app.section_name})
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="text-slate-700 dark:text-slate-300">
                            {app.student_phone || 'N/A'}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                            {app.student_email || 'N/A'}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px] whitespace-nowrap">
                          {app.applied_at
                            ? new Date(app.applied_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : 'N/A'}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <select
                            value={app.status || 'registered'}
                            onChange={(e) =>
                              handleUpdateApplicantStatus(app.applicant_id, e.target.value)
                            }
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                              app.status === 'approved'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : app.status === 'rejected'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            } cursor-pointer`}
                          >
                            <option value="registered">Registered</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveApplicant(app)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            title="Remove from applicant roster"
                          >
                            <FiTrash2 className="text-sm" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* FILTER AND SEARCH BAR */}
      {/* ========================================================================= */}
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3.5 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search events by title, venue, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Applicable Filter */}
          <select
            value={applicableFilter}
            onChange={(e) => setApplicableFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Application Modes</option>
            <option value="applicable">Applicable (RSVP Open)</option>
            <option value="non_applicable">Not Applicable (Info Only)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* EVENTS TABLE WORKSTATION */}
      {/* ========================================================================= */}
      {loading ? (
        <div className="min-h-56 flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md">
          <Loader size="md" />
          <p className="text-xs text-slate-500 mt-2 font-medium">Loading campus events...</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="p-10 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md space-y-2">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No Events Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {events.length === 0
              ? 'No campus events have been created yet. Click "+ Create New Event" to schedule your first event.'
              : 'No events match your current search and filter criteria.'}
          </p>
          {events.length === 0 && !showForm && (
            <button
              onClick={handleOpenCreateForm}
              className="mt-2 inline-flex items-center px-3 py-1.5 rounded-md bg-primary hover:bg-primary-dark text-white text-xs font-medium cursor-pointer shadow-xs transition"
            >
              + Create First Event
            </button>
          )}
        </div>
      ) : (
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Event Details</th>
                  <th className="py-2.5 px-3">Schedule & Venue</th>
                  <th className="py-2.5 px-3">Student Application</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-center">Interested</th>
                  <th className="py-2.5 px-3 text-center">Applicants</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {filteredEvents.map((event) => {
                  const eventDate = new Date(event.event_date);

                  return (
                    <tr
                      key={event.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      {/* Event Details */}
                      <td className="py-3 px-3">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-md bg-slate-100 dark:bg-slate-800 overflow-hidden flex-shrink-0 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                            {event.image ? (
                              <img
                                src={event.image}
                                alt={event.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-[10px] text-slate-400 font-medium">Event</span>
                            )}
                          </div>
                          <div className="space-y-0.5 max-w-xs sm:max-w-md">
                            <span className="font-semibold text-slate-900 dark:text-white block truncate">
                              {event.title}
                            </span>
                            {event.description && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                                {event.description}
                              </p>
                            )}
                            <div className="text-[10px] text-slate-400 flex items-center gap-1.5 pt-0.5">
                              <span>By {event.created_by_name || event.created_by_type || 'Admin'}</span>
                              <span>•</span>
                              <span>{event.slug}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Schedule & Venue */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="text-slate-800 dark:text-slate-200 font-medium text-xs">
                            {eventDate.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                            {', '}
                            {eventDate.toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true,
                            })}
                          </div>
                          <div className="text-slate-500 text-[11px] truncate max-w-[180px]">
                            {event.location || 'Campus Auditorium'}
                          </div>
                        </div>
                      </td>

                      {/* Student Application (is_applicable) */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <button
                            type="button"
                            onClick={() => handleToggleApplicable(event)}
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border transition cursor-pointer ${
                              event.is_applicable
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                                : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                            }`}
                            title="Click to toggle whether students can apply"
                          >
                            {event.is_applicable ? 'Applicable (Open)' : 'Not Applicable (Info Only)'}
                          </button>
                          <div className="text-[10px] text-slate-400">
                            {event.is_applicable ? 'Students can register' : 'Students cannot apply'}
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(event)}
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold border transition cursor-pointer ${
                            event.is_active
                              ? 'bg-primary/10 text-primary border-primary/20'
                              : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${event.is_active ? 'bg-primary' : 'bg-rose-600'}`} />
                          <span>{event.is_active ? 'Active' : 'Inactive'}</span>
                        </button>
                      </td>

                      {/* Interested Count */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
                          {event.interested_count || 0}
                        </span>
                      </td>

                      {/* Applicants */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleViewApplicants(event)}
                          className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-primary/10 hover:text-primary dark:hover:text-primary text-slate-700 dark:text-slate-300 font-medium text-xs transition cursor-pointer"
                        >
                          {event.total_applicants || 0} Registered
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleViewApplicants(event)}
                            className="px-2 py-1 text-xs text-slate-600 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition cursor-pointer font-medium"
                            title="View applicants & export Excel"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditForm(event)}
                            className="p-1 text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition cursor-pointer"
                            title="Edit event"
                          >
                            <FiEdit2 className="text-sm" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEvent(event)}
                            className="p-1 text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition cursor-pointer"
                            title="Delete event"
                          >
                            <FiTrash2 className="text-sm" />
                          </button>
                        </div>
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
