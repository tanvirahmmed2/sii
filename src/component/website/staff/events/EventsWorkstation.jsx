/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import Loader from 'src/component/common/Loader';

export default function EventsWorkstation({ portalType = 'staff' }) {
  const { tenantUrl, getApiEndpoint } = useContext(TenantWebsiteContext);

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [applicableFilter, setApplicableFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Create / Edit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formEventDate, setFormEventDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formImage, setFormImage] = useState('');
  const [formIsApplicable, setFormIsApplicable] = useState(true);
  const [formIsActive, setFormIsActive] = useState(true);

  // Applicants modal state
  const [applicantsModalOpen, setApplicantsModalOpen] = useState(false);
  const [activeEventForApplicants, setActiveEventForApplicants] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [applicantSearch, setApplicantSearch] = useState('');
  const [applicantStatusFilter, setApplicantStatusFilter] = useState('all');

  // Base API endpoint
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

  // Load events on trigger
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


  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingEvent(null);
    setFormTitle('');
    setFormDescription('');
    setFormLocation('');
    // Default date: tomorrow at 10:00 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    setFormEventDate(tomorrow.toISOString().slice(0, 16));
    setFormEndDate('');
    setFormImage('');
    setFormIsApplicable(true);
    setFormIsActive(true);
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (event) => {
    setEditingEvent(event);
    setFormTitle(event.title || '');
    setFormDescription(event.description || '');
    setFormLocation(event.location || '');
    setFormEventDate(event.event_date ? new Date(event.event_date).toISOString().slice(0, 16) : '');
    setFormEndDate(event.end_date ? new Date(event.end_date).toISOString().slice(0, 16) : '');
    setFormImage(event.image || '');
    setFormIsApplicable(Boolean(event.is_applicable));
    setFormIsActive(Boolean(event.is_active));
    setModalOpen(true);
  };

  // Save Event (Create or Update)
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
      const payload = {
        title: formTitle.trim(),
        description: formDescription,
        location: formLocation.trim(),
        event_date: new Date(formEventDate).toISOString(),
        end_date: formEndDate ? new Date(formEndDate).toISOString() : null,
        image: formImage.trim() || null,
        is_applicable: Boolean(formIsApplicable),
        is_active: Boolean(formIsActive),
      };

      if (editingEvent) {
        payload.id = editingEvent.id;
        const res = await axios.put(apiEventsUrl, payload);
        if (res.data?.success) {
          toast.success('Event updated successfully.');
          setModalOpen(false);
          fetchEvents(true);
        }
      } else {
        const res = await axios.post(apiEventsUrl, payload);
        if (res.data?.success) {
          toast.success('Event created successfully.');
          setModalOpen(false);
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
            : 'Event is now NOT applicable (Students cannot apply).'
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
    if (!window.confirm(`Are you sure you want to delete "${event.title}"? All applicant registrations will also be removed.`)) {
      return;
    }

    try {
      const res = await axios.delete(`${apiEventsUrl}?id=${event.id}`);
      if (res.data?.success) {
        toast.success('Event deleted successfully.');
        setEvents((prev) => prev.filter((e) => e.id !== event.id));
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete event.');
    }
  };

  // View Applicants
  const handleViewApplicants = async (event) => {
    setActiveEventForApplicants(event);
    setApplicantsModalOpen(true);
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

  // Update Applicant Status (Approve / Reject)
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
        [], // blank row
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

      // Set nice column widths
      ws['!cols'] = [
        { wch: 6 },  // SL
        { wch: 24 }, // Student Name
        { wch: 18 }, // Reg No
        { wch: 12 }, // Roll No
        { wch: 14 }, // Class
        { wch: 12 }, // Section
        { wch: 16 }, // Session
        { wch: 28 }, // Email
        { wch: 16 }, // Phone
        { wch: 22 }, // Application Date
        { wch: 14 }, // Status
        { wch: 20 }, // Notes
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
      // Search filter
      const matchesSearch =
        !searchTerm.trim() ||
        e.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.description?.toLowerCase().includes(searchTerm.toLowerCase());

      // Applicable filter
      const matchesApplicable =
        applicableFilter === 'all' ||
        (applicableFilter === 'applicable' && e.is_applicable) ||
        (applicableFilter === 'non_applicable' && !e.is_applicable);

      // Status filter
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && e.is_active) ||
        (statusFilter === 'inactive' && !e.is_active);

      return matchesSearch && matchesApplicable && matchesStatus;
    });
  }, [events, searchTerm, applicableFilter, statusFilter]);

  // Filtered Applicants inside modal
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

  // Summary counts
  const stats = useMemo(() => {
    const total = events.length;
    const applicable = events.filter((e) => e.is_applicable).length;
    const nonApplicable = total - applicable;
    const totalApplicants = events.reduce((sum, e) => sum + (parseInt(e.total_applicants, 10) || 0), 0);
    return { total, applicable, nonApplicable, totalApplicants };
  }, [events]);

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider mb-1">
            {portalType === 'officer' ? 'Officer Workstation' : 'Staff Operations Desk'}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Campus Events Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Create institutional events, toggle student applications, review registered student applicants, and export rosters in Excel (.xlsx).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchEvents(true)}
            disabled={refreshing}
            className="px-3 py-2 rounded-md border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium transition-colors cursor-pointer"
            title="Refresh events"
          >
            {refreshing ? 'Syncing...' : 'Sync'}
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 rounded-md bg-primary hover:bg-primary-dark text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Create New Event
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-2xs">
          <p className="text-[11px] uppercase font-semibold text-slate-500 dark:text-slate-400 tracking-wider">
            Total Events
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
              {stats.total}
            </span>
            <span className="text-xs text-slate-500">Scheduled</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-2xs">
          <p className="text-[11px] uppercase font-semibold text-emerald-600 dark:text-emerald-400 tracking-wider">
            Applicable (Students Apply)
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {stats.applicable}
            </span>
            <span className="text-xs text-emerald-600">Open for Students</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-2xs">
          <p className="text-[11px] uppercase font-semibold text-slate-500 dark:text-slate-400 tracking-wider">
            Information Only
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-slate-600 dark:text-slate-300 font-mono">
              {stats.nonApplicable}
            </span>
            <span className="text-xs text-slate-500">No Applications</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-2xs">
          <p className="text-[11px] uppercase font-semibold text-primary tracking-wider">
            Total Student Applicants
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-primary font-mono">
              {stats.totalApplicants}
            </span>
            <span className="text-xs text-primary font-medium">Registered</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search events by title, venue, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Applicable Filter */}
          <select
            value={applicableFilter}
            onChange={(e) => setApplicableFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-primary cursor-pointer"
          >
            <option value="all">All Application Modes</option>
            <option value="applicable">Applicable (Students Can Apply)</option>
            <option value="non_applicable">Not Applicable (Info Only)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-primary cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Events Table / Cards */}
      {loading ? (
        <div className="min-h-64 flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
          <Loader size="md" />
          <p className="text-xs text-slate-500 mt-3 font-medium">Loading events workstation...</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No Events Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {events.length === 0
              ? 'No campus events have been created yet. Click "+ Create New Event" to schedule your first event.'
              : 'No events match your current search and filter criteria.'}
          </p>
          {events.length === 0 && (
            <button
              onClick={handleOpenCreateModal}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-primary text-white text-xs font-semibold cursor-pointer"
            >
              Create Event Now
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Event Details</th>
                  <th className="py-3 px-4">Schedule & Venue</th>
                  <th className="py-3 px-4">Student Application</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Applicants</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {filteredEvents.map((event) => {
                  const eventDate = new Date(event.event_date);
                  const isUpcoming = eventDate > new Date();

                  return (
                    <tr
                      key={event.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      {/* Event Details */}
                      <td className="py-3.5 px-4">
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
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-medium text-xs">
                            <span>
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
                            </span>
                          </div>
                          {event.location ? (
                            <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                              <span className="truncate max-w-[180px]">{event.location}</span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">Campus Auditorium</span>
                          )}
                        </div>
                      </td>

                      {/* Student Application (is_applicable) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <button
                            onClick={() => handleToggleApplicable(event)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${
                              event.is_applicable
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                            }`}
                            title="Click to toggle whether students can apply"
                          >
                            {event.is_applicable ? (
                              <>
                                <span>Applicable (Open)</span>
                              </>
                            ) : (
                              <>
                                <span>Not Applicable (Info Only)</span>
                              </>
                            )}
                          </button>
                          <div className="text-[10px] text-slate-400">
                            {event.is_applicable ? 'Students can register' : 'Students cannot apply'}
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleActive(event)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                            event.is_active
                              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 hover:bg-blue-100'
                              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${event.is_active ? 'bg-blue-500' : 'bg-rose-500'}`} />
                          <span>{event.is_active ? 'Active' : 'Inactive'}</span>
                        </button>
                      </td>

                      {/* Applicants */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleViewApplicants(event)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-primary/10 hover:text-primary dark:hover:text-primary text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
                        >
                          <span>{event.total_applicants || 0} Registered</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleViewApplicants(event)}
                            className="px-2 py-1 text-xs text-slate-600 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer font-medium"
                            title="View applicants & export Excel"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(event)}
                            className="px-2 py-1 text-xs text-slate-600 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer font-medium"
                            title="Edit event"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(event)}
                            className="px-2 py-1 text-xs text-slate-600 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer font-medium"
                            title="Delete event"
                          >
                            Delete
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

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE OR EDIT EVENT */}
      {/* ========================================================================= */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingEvent ? 'Edit Campus Event' : 'Schedule New Campus Event'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set event information, schedule, and decide whether students can submit applications.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="px-2 py-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSubmitEvent} className="p-5 space-y-4">
              {/* Title */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Event Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual Inter-School Science Fair 2026"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-hidden focus:border-primary"
                />
              </div>

              {/* Date & Location Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Event Date & Time <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formEventDate}
                    onChange={(e) => setFormEventDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-hidden focus:border-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Location / Venue
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Main Auditorium / Sports Ground"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-hidden focus:border-primary"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Event Description & Guidelines
                </label>
                <textarea
                  rows={3}
                  placeholder="Provide details about the event, rules, eligibility, and agenda..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-hidden focus:border-primary"
                />
              </div>

              {/* Image URL */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Poster / Banner Image URL
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/images/event-poster.jpg"
                  value={formImage}
                  onChange={(e) => setFormImage(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-hidden focus:border-primary"
                />
              </div>

              {/* CRITICAL: is_applicable Toggle */}
              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 space-y-1">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsApplicable}
                    onChange={(e) => setFormIsApplicable(e.target.checked)}
                    className="mt-0.5 rounded text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-900 dark:text-white block">
                      Allow Student Applications (Applicable for Students)
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      If checked, enrolled students can view this event in their student portal and register their participation.
                      If unchecked, this event is published as <strong>Information-Only</strong> without application buttons.
                    </p>
                  </div>
                </label>
              </div>

              {/* is_active Toggle */}
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span>Publish as Active Event</span>
                </label>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded bg-primary hover:bg-primary-dark text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingEvent ? 'Save Changes' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: APPLICANTS ROSTER & EXCEL DOWNLOAD */}
      {/* ========================================================================= */}
      {applicantsModalOpen && activeEventForApplicants && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary uppercase">
                    Applicant Roster
                  </span>
                  {activeEventForApplicants.is_applicable ? (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      Applicable (Open)
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      Applications Closed
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                  {activeEventForApplicants.title}
                </h3>
                <div className="text-xs text-slate-500 flex items-center gap-3 mt-0.5">
                  <span>
                    📅 {new Date(activeEventForApplicants.event_date).toLocaleDateString()}
                  </span>
                  <span>📍 {activeEventForApplicants.location || 'Campus Auditorium'}</span>
                  <span>👥 {applicants.length} registered students</span>
                </div>
              </div>

              {/* Close & Excel buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadExcel}
                  disabled={applicants.length === 0}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-40"
                  title="Download full applicants list in Excel spreadsheet (.xlsx)"
                >
                  <span>Download in Excel Sheet</span>
                </button>

                <button
                  onClick={() => setApplicantsModalOpen(false)}
                  className="px-2 py-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="relative w-full sm:w-72">
                <input
                  type="text"
                  placeholder="Filter by student name, roll, reg..."
                  value={applicantSearch}
                  onChange={(e) => setApplicantSearch(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={applicantStatusFilter}
                  onChange={(e) => setApplicantStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
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
            <div className="flex-1 overflow-y-auto p-4">
              {loadingApplicants ? (
                <div className="py-16 text-center flex flex-col items-center justify-center">
                  <Loader size="md" />
                  <p className="text-xs text-slate-500 mt-2 font-medium">Fetching applicant records...</p>
                </div>
              ) : filteredApplicants.length === 0 ? (
                <div className="py-16 text-center space-y-2">
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    No Applicants Found
                  </h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    {applicants.length === 0
                      ? 'No students have applied for this event yet.'
                      : 'No applicant matches your search query.'}
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden">
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
                              onClick={() => handleRemoveApplicant(app)}
                              className="text-slate-400 hover:text-rose-600 px-2 py-0.5 text-xs rounded transition-colors cursor-pointer"
                              title="Remove from applicant roster"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Total Applicants: <strong>{applicants.length}</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadExcel}
                  disabled={applicants.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer disabled:opacity-40"
                >
                  <span>Download in Excel Sheet</span>
                </button>
                <button
                  onClick={() => setApplicantsModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
