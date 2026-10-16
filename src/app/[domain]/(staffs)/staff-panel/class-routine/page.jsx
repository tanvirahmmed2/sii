'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';

export default function ClassRoutinePage() {
  const params = useParams();
  const domain = params?.domain || '';

  // Core Data
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);
  const [days, setDays] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & View Mode
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('all');
  const [selectedSessionId, setSelectedSessionId] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState(null);
  const [formData, setFormData] = useState({
    period_id: '',
    day_id: '',
    period_name: '',
    start_time: '',
    end_time: '',
    is_break: false,
    class_subject_id: '',
    section_id: '',
    session_id: '',
    room_number: ''
  });
  const [modalClassId, setModalClassId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [syncingPeriods, setSyncingPeriods] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Delete State
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch all timetable-related data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [clsRes, secRes, csRes, dayRes, perRes, sessRes, routRes] = await Promise.all([
        fetch(`/api/${domain}/staff/panel/classes`),
        fetch(`/api/${domain}/staff/panel/sections`),
        fetch(`/api/${domain}/staff/panel/class-subjects`),
        fetch(`/api/${domain}/staff/panel/days`),
        fetch(`/api/${domain}/staff/panel/periods`),
        fetch(`/api/${domain}/staff/panel/sessions`),
        fetch(`/api/${domain}/staff/panel/period-class-subjects${selectedClassId ? `?class_id=${selectedClassId}` : ''}`)
      ]);

      const [clsD, secD, csD, dayD, perD, sessD, routD] = await Promise.all([
        clsRes.json(),
        secRes.json(),
        csRes.json(),
        dayRes.json(),
        perRes.json(),
        sessRes.json(),
        routRes.json()
      ]);

      if (clsD.success) {
        setClasses(clsD.classes || []);
        if (!selectedClassId && clsD.classes?.length > 0) {
          setSelectedClassId(String(clsD.classes[0].id));
        }
      }
      if (secD.success) setSections(secD.sections || []);
      if (csD.success) setClassSubjects(csD.classSubjects || []);
      if (dayD.success) setDays(dayD.days || []);
      if (perD.success) setPeriods(perD.periods || []);
      if (sessD.success) setSessions(sessD.sessions || []);
      if (routD.success) setRoutines(routD.routines || []);
    } catch (err) {
      setErrorMsg('Network error fetching timetable data.');
    } finally {
      setLoading(false);
    }
  }, [domain, selectedClassId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Active Class Object
  const activeClassObj = useMemo(() => {
    return classes.find(c => String(c.id) === String(selectedClassId));
  }, [classes, selectedClassId]);

  // Current Active Academic Session
  const currentSession = useMemo(() => {
    return sessions.find(s => s.is_current) || sessions[0] || null;
  }, [sessions]);

  // Filtered Sections for current active class
  const classSections = useMemo(() => {
    if (!selectedClassId) return sections;
    return sections.filter(s => String(s.class_id) === String(selectedClassId));
  }, [sections, selectedClassId]);

  // Sorted Days of the Week
  const sortedDays = useMemo(() => {
    return [...days].sort((a, b) => (Number(a.day_order) || 0) - (Number(b.day_order) || 0));
  }, [days]);

  // Extract Canonical Period Columns (Day by Periods grid headers)
  const periodSlots = useMemo(() => {
    const slotMap = new Map();
    periods.forEach(p => {
      const rawName = (p.name || '').trim();
      if (!rawName) return;
      const key = rawName.toLowerCase();
      if (!slotMap.has(key)) {
        slotMap.set(key, {
          key,
          name: rawName,
          startTime: p.start_time || '',
          endTime: p.end_time || '',
          isBreak: Boolean(p.is_break),
          sortTime: p.start_time || '00:00'
        });
      } else {
        const existing = slotMap.get(key);
        if (!existing.startTime && p.start_time) {
          existing.startTime = p.start_time;
          existing.endTime = p.end_time;
          existing.sortTime = p.start_time;
        }
        if (p.is_break) existing.isBreak = true;
      }
    });

    return Array.from(slotMap.values()).sort((a, b) => (a.sortTime || '').localeCompare(b.sortTime || ''));
  }, [periods]);

  // Filtered Routines for active filters (Used in List View & KPIs)
  const filteredRoutines = useMemo(() => {
    return routines.filter(r => {
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !q ||
        (r.subject_name && r.subject_name.toLowerCase().includes(q)) ||
        (r.subject_code && r.subject_code.toLowerCase().includes(q)) ||
        (r.period_name && r.period_name.toLowerCase().includes(q)) ||
        (r.day_name && r.day_name.toLowerCase().includes(q)) ||
        (r.teacher_name && r.teacher_name.toLowerCase().includes(q)) ||
        (r.room_number && r.room_number.toLowerCase().includes(q));

      const matchesClass = !selectedClassId || String(r.class_id) === String(selectedClassId);
      const matchesSection = selectedSectionId === 'all' || !r.section_id || String(r.section_id) === String(selectedSectionId);
      const matchesSession = selectedSessionId === 'all' || !r.session_id || String(r.session_id) === String(selectedSessionId);

      return matchesSearch && matchesClass && matchesSection && matchesSession;
    });
  }, [routines, searchTerm, selectedClassId, selectedSectionId, selectedSessionId]);

  // Modal helpers
  const modalClassSubjects = useMemo(() => {
    if (!modalClassId) return [];
    return classSubjects.filter(cs => String(cs.class_id) === String(modalClassId));
  }, [classSubjects, modalClassId]);

  const modalSections = useMemo(() => {
    if (!modalClassId) return [];
    return sections.filter(s => String(s.class_id) === String(modalClassId));
  }, [sections, modalClassId]);

  // Open Create Modal (with optional pre-filled Day and Period Slot)
  const openCreateModal = (dayId = '', periodSlot = null, periodObj = null) => {
    setEditingRoutine(null);
    const activeCId = selectedClassId || (classes[0]?.id ? String(classes[0].id) : '');
    setModalClassId(activeCId);

    const defaultDay = dayId || (days[0]?.id ? String(days[0].id) : '');
    const defaultPeriodId = periodObj?.id ? String(periodObj.id) : (periods[0]?.id ? String(periods[0].id) : '');

    setFormData({
      period_id: defaultPeriodId,
      day_id: defaultDay,
      period_name: periodSlot?.name || periodObj?.name || '',
      start_time: periodSlot?.startTime || periodObj?.start_time || '09:00',
      end_time: periodSlot?.endTime || periodObj?.end_time || '09:45',
      is_break: Boolean(periodSlot?.isBreak || periodObj?.is_break),
      class_subject_id: modalClassSubjects[0]?.id ? String(modalClassSubjects[0].id) : '',
      section_id: selectedSectionId !== 'all' ? selectedSectionId : '',
      session_id: selectedSessionId !== 'all' ? selectedSessionId : (currentSession?.id ? String(currentSession.id) : ''),
      room_number: ''
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = r => {
    setEditingRoutine(r);
    setModalClassId(String(r.class_id));
    setFormData({
      period_id: String(r.period_id),
      day_id: String(r.day_id),
      period_name: r.period_name || '',
      start_time: r.start_time || '',
      end_time: r.end_time || '',
      is_break: Boolean(r.is_break),
      class_subject_id: String(r.class_subject_id),
      section_id: r.section_id ? String(r.section_id) : '',
      session_id: r.session_id ? String(r.session_id) : '',
      room_number: r.room_number || ''
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  // Save Routine Slot
  const handleFormSubmit = async e => {
    e.preventDefault();
    if (!formData.class_subject_id) {
      setErrorMsg('Please select a Subject for this routine slot.');
      return;
    }
    if (!formData.period_id && (!formData.day_id || !formData.period_name)) {
      setErrorMsg('Please specify a Day and Period.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');
      const url = `/api/${domain}/staff/panel/period-class-subjects`;
      const method = editingRoutine ? 'PUT' : 'POST';
      const body = editingRoutine
        ? {
            id: editingRoutine.id,
            period_id: formData.period_id,
            class_subject_id: formData.class_subject_id,
            section_id: formData.section_id || null,
            session_id: formData.session_id || null,
            room_number: formData.room_number || ''
          }
        : {
            ...formData,
            section_id: formData.section_id || null,
            session_id: formData.session_id || null,
            room_number: formData.room_number || ''
          };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message || 'Routine slot saved successfully.');
        setTimeout(() => setSuccessMsg(''), 4000);
        setIsModalOpen(false);
        fetchData();
      } else {
        setErrorMsg(data.error || 'Failed to save routine slot.');
      }
    } catch (err) {
      setErrorMsg('Network error saving routine slot.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Routine Slot
  const handleDelete = async id => {
    try {
      setDeleting(true);
      const res = await fetch(`/api/${domain}/staff/panel/period-class-subjects?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Routine slot removed successfully.');
        setTimeout(() => setSuccessMsg(''), 4000);
        setDeleteId(null);
        fetchData();
      } else {
        setErrorMsg(data.error || 'Failed to delete routine slot.');
      }
    } catch (err) {
      setErrorMsg('Network error removing routine slot.');
    } finally {
      setDeleting(false);
    }
  };

  // Sync Period Slots across all working days
  const handleSyncPeriods = async () => {
    try {
      setSyncingPeriods(true);
      setErrorMsg('');
      const res = await fetch(`/api/${domain}/staff/panel/periods`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_to_active_days' })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message || 'Period structure synchronized across working days.');
        setTimeout(() => setSuccessMsg(''), 5000);
        fetchData();
      } else {
        setErrorMsg(data.error || 'Failed to synchronize periods.');
      }
    } catch (err) {
      setErrorMsg('Network error synchronizing periods.');
    } finally {
      setSyncingPeriods(false);
    }
  };

  // Seed default 6-period school routine template if zero periods exist
  const handleSeedStandardPeriods = async () => {
    try {
      setSyncingPeriods(true);
      setErrorMsg('');
      const standardPeriods = [
        { name: 'Period 1', start_time: '08:30', end_time: '09:15', is_break: false },
        { name: 'Period 2', start_time: '09:15', end_time: '10:00', is_break: false },
        { name: 'Period 3', start_time: '10:00', end_time: '10:45', is_break: false },
        { name: 'Recess Break', start_time: '10:45', end_time: '11:15', is_break: true },
        { name: 'Period 4', start_time: '11:15', end_time: '12:00', is_break: false },
        { name: 'Period 5', start_time: '12:00', end_time: '12:45', is_break: false },
        { name: 'Period 6', start_time: '12:45', end_time: '01:30', is_break: false }
      ];

      const activeDays = days.filter(d => d.status === 'on');
      const targetDays = activeDays.length > 0 ? activeDays : days.slice(0, 5);

      let created = 0;
      for (const d of targetDays) {
        for (const p of standardPeriods) {
          await fetch(`/api/${domain}/staff/panel/periods`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              day_id: d.id,
              name: p.name,
              start_time: p.start_time,
              end_time: p.end_time,
              is_break: p.is_break
            })
          });
          created++;
        }
      }

      setSuccessMsg(`Initialized standard schedule (${created} period slots created).`);
      setTimeout(() => setSuccessMsg(''), 5000);
      fetchData();
    } catch (err) {
      setErrorMsg('Failed to initialize default periods.');
    } finally {
      setSyncingPeriods(false);
    }
  };

  // Print Routine
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full space-y-4">
      {/* Print-Only Header */}
      <div className="hidden print:block mb-6 text-center border-b pb-4">
        <h1 className="text-xl font-bold uppercase tracking-wide text-black">
          Official Class Routine &amp; Timetable
        </h1>
        <div className="flex justify-center items-center gap-4 text-xs mt-1 text-gray-700">
          <span><strong>Class:</strong> {activeClassObj?.name || 'All'}</span>
          {selectedSectionId !== 'all' && (
            <span><strong>Section:</strong> {classSections.find(s => String(s.id) === String(selectedSectionId))?.name}</span>
          )}
          <span><strong>Session:</strong> {selectedSessionId !== 'all' ? sessions.find(s => String(s.id) === String(selectedSessionId))?.name : (currentSession?.name || 'Annual')}</span>
          <span><strong>Date:</strong> {new Date().toLocaleDateString('en-GB')}</span>
        </div>
      </div>

      {/* KPI Overview Cards (Hidden during Print) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            Active Class
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-bold text-slate-900 dark:text-white truncate">
              {activeClassObj ? activeClassObj.name : 'All Classes'}
            </span>
            <span className="text-[10px] font-mono text-slate-500">{activeClassObj?.code || ''}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            Scheduled Routine Slots
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-blue-600 dark:text-blue-400 font-mono">
              {filteredRoutines.length}
            </span>
            <span className="text-[10px] font-medium text-blue-600">Active Lessons</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            Period Columns
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {periodSlots.length}
            </span>
            <span className="text-[10px] font-medium text-emerald-600">Daily Slots</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            Curriculum Subjects
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-purple-600 dark:text-purple-400 font-mono">
              {modalClassSubjects.length}
            </span>
            <span className="text-[10px] font-medium text-purple-600">Available</span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 rounded text-xs bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center justify-between print:hidden">
          <span>{successMsg}</span>
          <span className="text-[10px] font-mono">OK</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3 rounded text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 flex items-center justify-between print:hidden">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="text-[10px] font-mono cursor-pointer">
            DISMISS
          </button>
        </div>
      )}

      {/* Workstation Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-4 print:border-none print:shadow-none print:p-0">
        {/* Class Selection Tabs Bar (Print: Hidden) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-100 dark:border-slate-800 print:hidden">
          {classes.map(c => {
            const isActive = String(c.id) === String(selectedClassId);
            const countForClass = routines.filter(r => String(r.class_id) === String(c.id)).length;
            return (
              <button
                key={c.id}
                onClick={() => {
                  setSelectedClassId(String(c.id));
                  setSelectedSectionId('all');
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                <span>{c.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive
                      ? 'bg-slate-700 text-white dark:bg-slate-300 dark:text-slate-900'
                      : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                  }`}
                >
                  {countForClass}
                </span>
              </button>
            );
          })}
        </div>

        {/* Toolbar & Secondary Filters (Print: Hidden) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800 print:hidden">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {/* Search Box */}
            <div className="relative min-w-[200px] flex-1 max-w-xs">
              <input
                type="text"
                placeholder="Search subject, room, teacher..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Section Filter */}
            <select
              value={selectedSectionId}
              onChange={e => setSelectedSectionId(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Sections ({classSections.length})</option>
              {classSections.map(s => (
                <option key={s.id} value={s.id}>
                  Section {s.name}
                </option>
              ))}
            </select>

            {/* Session Filter */}
            <select
              value={selectedSessionId}
              onChange={e => setSelectedSessionId(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Sessions</option>
              {sessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.is_current ? '★ (Current)' : ''}
                </option>
              ))}
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="Timetable Grid View (Day by Periods)"
              >
                📅 Day × Periods
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="Detailed Linear List"
              >
                📋 List View
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer"
              title="Print Routine / Export to PDF"
            >
              <span>🖨️</span>
              <span>Print</span>
            </button>

            {periodSlots.length > 0 && (
              <button
                onClick={handleSyncPeriods}
                disabled={syncingPeriods}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer disabled:opacity-50"
                title="Synchronize period time slots to all active working days"
              >
                <span>⚡</span>
                <span>{syncingPeriods ? 'Syncing...' : 'Sync Periods'}</span>
              </button>
            )}

            <button
              onClick={fetchData}
              className="px-2.5 py-1.5 rounded text-xs border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
              title="Refresh Timetable Data"
            >
              🔄 Refresh
            </button>

            <button
              onClick={() => openCreateModal()}
              disabled={classes.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition cursor-pointer disabled:opacity-40 shadow-xs"
            >
              <span>＋</span>
              <span>Allocate Slot</span>
            </button>
          </div>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="py-20 flex flex-col justify-center items-center gap-3">
            <div className="loader loader-sm" />
            <span className="text-xs text-slate-500 font-medium">Loading class timetable routine...</span>
          </div>
        ) : periodSlots.length === 0 ? (
          /* Zero Periods Callout */
          <div className="py-16 text-center space-y-3 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto text-xl">
              ⏰
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              No Period Time Slots Configured
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              To view and allocate a Day by Periods class routine, configure daily periods (Period 1, Period 2, Recess, etc.) or initialize the standard institutional template.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={handleSeedStandardPeriods}
                disabled={syncingPeriods}
                className="px-3.5 py-1.5 rounded text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition cursor-pointer disabled:opacity-50"
              >
                {syncingPeriods ? 'Initializing...' : '⚡ Initialize Standard Routine (1 to 6)'}
              </button>
              <a
                href={`/staff-panel/class-periods`}
                className="px-3 py-1.5 rounded text-xs border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
              >
                Custom Periods Setup
              </a>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          /* ============================================================ */
          /* THE TIMETABLE MATRIX TABLE: DAY BY PERIODS                     */
          /* ============================================================ */
          <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-800">
            <table className="w-full border-collapse text-left text-xs min-w-[850px]">
              {/* TABLE HEADER: PERIODS COLUMNS */}
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                  {/* Top-Left Header: Day / Periods */}
                  <th className="py-3 px-3.5 font-bold uppercase text-[10px] tracking-wider w-36 border-r border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 sticky left-0 z-10 shadow-xs">
                    <div className="flex items-center gap-1.5">
                      <span>🗓️</span>
                      <span>Day \ Period</span>
                    </div>
                  </th>

                  {/* Period Time Slot Columns */}
                  {periodSlots.map((slot, sIdx) => (
                    <th
                      key={slot.key}
                      className={`py-2.5 px-3 text-center border-r last:border-r-0 border-slate-200 dark:border-slate-700 min-w-[150px] ${
                        slot.isBreak
                          ? 'bg-amber-50/70 dark:bg-amber-950/20 text-amber-900 dark:text-amber-300'
                          : ''
                      }`}
                    >
                      <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center justify-center gap-1">
                        {slot.isBreak && <span>☕</span>}
                        <span>{slot.name}</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                        {slot.startTime && slot.endTime ? `${slot.startTime} – ${slot.endTime}` : slot.startTime || ''}
                      </div>
                      {slot.isBreak && (
                        <span className="inline-block px-1.5 py-0.2 mt-1 rounded text-[9px] font-semibold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 uppercase tracking-wider">
                          Recess / Break
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>

              {/* TABLE BODY: DAYS AS ROWS */}
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {sortedDays.map(d => {
                  const isOffDay = d.status === 'off';

                  // Count routines scheduled on this day for the active class/section
                  const dayRoutineCount = routines.filter(r => {
                    const matchDay = String(r.day_id) === String(d.id);
                    const matchClass = !selectedClassId || String(r.class_id) === String(selectedClassId);
                    const matchSection = selectedSectionId === 'all' || !r.section_id || String(r.section_id) === String(selectedSectionId);
                    return matchDay && matchClass && matchSection;
                  }).length;

                  return (
                    <tr
                      key={d.id}
                      className={`transition-colors ${
                        isOffDay
                          ? 'bg-slate-50/50 dark:bg-slate-900/40 text-slate-500'
                          : 'hover:bg-slate-50/30 dark:hover:bg-slate-800/20'
                      }`}
                    >
                      {/* Left Column: Day Name & Order Badge */}
                      <td
                        className={`py-3.5 px-3.5 border-r border-slate-200 dark:border-slate-700 font-medium sticky left-0 z-10 shadow-xs ${
                          isOffDay
                            ? 'bg-slate-100/90 dark:bg-slate-800/90'
                            : 'bg-white dark:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            {d.name}
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                              isOffDay
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {isOffDay ? 'Weekend' : `Day ${d.day_order || ''}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isOffDay ? 'bg-amber-400' : 'bg-emerald-500'
                            }`}
                          />
                          <span>{dayRoutineCount} {dayRoutineCount === 1 ? 'class' : 'classes'}</span>
                        </div>
                      </td>

                      {/* Period Cells for this Day */}
                      {periodSlots.map(slot => {
                        // Find if day d has a period record matching slot.key
                        const dayPeriod = periods.find(
                          p =>
                            String(p.day_id) === String(d.id) &&
                            (p.name || '').trim().toLowerCase() === slot.key
                        );

                        // Find all routine allocations in this cell
                        const cellRoutines = routines.filter(r => {
                          const matchDay = String(r.day_id) === String(d.id);
                          const matchPeriod = dayPeriod ? String(r.period_id) === String(dayPeriod.id) : false;
                          const matchClass = !selectedClassId || String(r.class_id) === String(selectedClassId);
                          const matchSection =
                            selectedSectionId === 'all' || !r.section_id || String(r.section_id) === String(selectedSectionId);
                          const matchSession =
                            selectedSessionId === 'all' || !r.session_id || String(r.session_id) === String(selectedSessionId);

                          const q = searchTerm.trim().toLowerCase();
                          const matchSearch =
                            !q ||
                            (r.subject_name && r.subject_name.toLowerCase().includes(q)) ||
                            (r.subject_code && r.subject_code.toLowerCase().includes(q)) ||
                            (r.teacher_name && r.teacher_name.toLowerCase().includes(q)) ||
                            (r.room_number && r.room_number.toLowerCase().includes(q));

                          return matchDay && matchPeriod && matchClass && matchSection && matchSession && matchSearch;
                        });

                        const isBreakSlot = slot.isBreak || Boolean(dayPeriod?.is_break);

                        return (
                          <td
                            key={slot.key}
                            className={`p-2 border-r last:border-r-0 border-slate-200 dark:border-slate-700 align-top transition-colors ${
                              isBreakSlot
                                ? 'bg-amber-50/40 dark:bg-amber-950/15'
                                : isOffDay
                                ? 'bg-slate-50/40 dark:bg-slate-900/30'
                                : 'hover:bg-blue-50/20 dark:hover:bg-slate-800/30'
                            }`}
                          >
                            {/* CASE 1: BREAK / RECESS */}
                            {isBreakSlot ? (
                              <div className="h-full min-h-[72px] flex flex-col items-center justify-center p-2 rounded border border-dashed border-amber-200 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/20 text-center">
                                <span className="text-amber-600 dark:text-amber-400 text-xs">☕</span>
                                <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 mt-0.5">
                                  {slot.name}
                                </span>
                                <span className="text-[9px] font-mono text-amber-600 dark:text-amber-400">
                                  {slot.startTime} – {slot.endTime}
                                </span>
                              </div>
                            ) : cellRoutines.length > 0 ? (
                              /* CASE 2: SCHEDULED ROUTINE ALLOCATIONS */
                              <div className="space-y-1.5">
                                {cellRoutines.map(item => (
                                  <div
                                    key={item.id}
                                    className="group relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-2.5 shadow-2xs hover:border-slate-400 dark:hover:border-slate-500 transition-all"
                                  >
                                    {/* Subject Title & Code */}
                                    <div className="flex items-start justify-between gap-1">
                                      <h4 className="font-bold text-slate-900 dark:text-white text-xs leading-snug line-clamp-1" title={item.subject_name}>
                                        {item.subject_name}
                                      </h4>
                                      <span className="text-[9px] font-mono px-1 py-0.2 rounded font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0">
                                        {item.subject_code}
                                      </span>
                                    </div>

                                    {/* Section & Room Badges */}
                                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[10px]">
                                      {item.section_name ? (
                                        <span className="inline-flex items-center px-1.5 py-0.2 rounded font-medium bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                          Sec {item.section_name}
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 text-[10px]">All Sec</span>
                                      )}

                                      {item.room_number && (
                                        <span className="inline-flex items-center gap-0.5 font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300">
                                          <span>📍</span>
                                          <span>{item.room_number}</span>
                                        </span>
                                      )}
                                    </div>

                                    {/* Teacher Info (if assigned) */}
                                    {item.teacher_name && (
                                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1 truncate" title={item.teacher_name}>
                                        <span>👤</span>
                                        <span className="truncate">{item.teacher_name}</span>
                                      </div>
                                    )}

                                    {/* Action Hover Controls (Hidden in Print) */}
                                    <div className="absolute top-1.5 right-1.5 hidden group-hover:flex items-center gap-1 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xs p-0.5 rounded shadow-xs border border-slate-200 dark:border-slate-700 print:hidden">
                                      <button
                                        onClick={e => {
                                          e.stopPropagation();
                                          openEditModal(item);
                                        }}
                                        className="p-1 rounded text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                                        title="Edit Slot"
                                      >
                                        ✏️
                                      </button>
                                      <button
                                        onClick={e => {
                                          e.stopPropagation();
                                          setDeleteId(item.id);
                                        }}
                                        className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                                        title="Delete Slot"
                                      >
                                        🗑️
                                      </button>
                                    </div>
                                  </div>
                                ))}

                                {/* Add Another Subject in Same Slot (e.g. for different section) */}
                                <button
                                  onClick={() => openCreateModal(d.id, slot, dayPeriod)}
                                  className="w-full py-1 text-[10px] text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition cursor-pointer print:hidden flex items-center justify-center gap-1"
                                  title="Allocate another section or subject in this period"
                                >
                                  <span>＋ Add section slot</span>
                                </button>
                              </div>
                            ) : isOffDay ? (
                              /* CASE 3: WEEKEND / OFF DAY EMPTY */
                              <div className="group h-full min-h-[72px] flex flex-col items-center justify-center rounded border border-dashed border-slate-200 dark:border-slate-800 p-2 text-center text-slate-400 transition-colors hover:border-slate-400">
                                <span className="text-[11px] font-medium">— Weekend —</span>
                                <button
                                  onClick={() => openCreateModal(d.id, slot, dayPeriod)}
                                  className="mt-1 opacity-0 group-hover:opacity-100 text-[10px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer transition print:hidden"
                                >
                                  ＋ Schedule class
                                </button>
                              </div>
                            ) : (
                              /* CASE 4: ACTIVE WORKING DAY EMPTY SLOT */
                              <div
                                onClick={() => openCreateModal(d.id, slot, dayPeriod)}
                                className="group h-full min-h-[72px] flex flex-col items-center justify-center rounded border border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 p-2 cursor-pointer transition-all"
                                title={`Click to allocate subject for ${d.name} (${slot.name})`}
                              >
                                <span className="text-slate-300 dark:text-slate-600 group-hover:text-blue-600 dark:group-hover:text-blue-400 text-sm font-light transition">
                                  ＋
                                </span>
                                <span className="text-[10px] text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 font-medium transition mt-0.5">
                                  Allocate Slot
                                </span>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* ============================================================ */
          /* ALTERNATIVE VIEW: DETAILED LINEAR LIST TABLE                 */
          /* ============================================================ */
          <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-800">
            {filteredRoutines.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  No routine timetable allocated matching the current filters.
                </p>
                <button
                  onClick={() => openCreateModal()}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Assign class subjects to period slots
                </button>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Weekday</th>
                    <th className="py-2.5 px-3">Period &amp; Time</th>
                    <th className="py-2.5 px-3">Subject</th>
                    <th className="py-2.5 px-3">Section</th>
                    <th className="py-2.5 px-3">Room</th>
                    <th className="py-2.5 px-3">Teacher</th>
                    <th className="py-2.5 px-3">Session</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
                  {filteredRoutines.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                          {item.day_name}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {item.period_name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {item.start_time} — {item.end_time}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 dark:text-white">{item.subject_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{item.subject_code}</div>
                      </td>
                      <td className="py-3 px-3">
                        {item.section_name ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            Section {item.section_name}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">All Sections</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono">
                        {item.room_number ? `Room ${item.room_number}` : '—'}
                      </td>
                      <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                        {item.teacher_name || '—'}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                        {item.session_name || 'Annual'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(item)}
                            className="px-2 py-0.5 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            title="Edit"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteId(item.id)}
                            className="px-2 py-0.5 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                            title="Delete"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Official Routine Print Signatures (Shown only when printing) */}
      <div className="hidden print:grid grid-cols-3 gap-8 pt-16 mt-8 border-t border-gray-400 text-center text-xs font-semibold">
        <div>
          <div className="border-t border-black pt-1">Prepared by: Class Teacher</div>
        </div>
        <div>
          <div className="border-t border-black pt-1">Verified by: Routine In-Charge</div>
        </div>
        <div>
          <div className="border-t border-black pt-1">Approved by: Head of Institution</div>
        </div>
      </div>

      {/* Allocate / Edit Routine Slot Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-md w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {editingRoutine ? 'Edit Routine Slot' : 'Allocate Routine Slot'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3">
              {/* Class & Section Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Class *
                  </label>
                  <select
                    value={modalClassId}
                    onChange={e => {
                      setModalClassId(e.target.value);
                      setFormData({
                        ...formData,
                        class_subject_id: '',
                        section_id: ''
                      });
                    }}
                    disabled={Boolean(editingRoutine)}
                    required
                    className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer disabled:opacity-60"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Section
                  </label>
                  <select
                    value={formData.section_id}
                    onChange={e => setFormData({ ...formData, section_id: e.target.value })}
                    className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                  >
                    <option value="">All Sections</option>
                    {modalSections.map(s => (
                      <option key={s.id} value={s.id}>
                        Section {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Day & Period Time Slot Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Weekday *
                  </label>
                  <select
                    value={formData.day_id}
                    onChange={e => {
                      const newDayId = e.target.value;
                      // Filter periods matching this day
                      const dayPers = periods.filter(p => String(p.day_id) === String(newDayId));
                      setFormData({
                        ...formData,
                        day_id: newDayId,
                        period_id: dayPers[0]?.id ? String(dayPers[0].id) : ''
                      });
                    }}
                    required
                    className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                  >
                    <option value="">Select Day...</option>
                    {sortedDays.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.status === 'off' ? '(Weekend)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Period Slot *
                  </label>
                  <select
                    value={formData.period_id}
                    onChange={e => {
                      const selectedP = periods.find(p => String(p.id) === String(e.target.value));
                      setFormData({
                        ...formData,
                        period_id: e.target.value,
                        period_name: selectedP?.name || formData.period_name,
                        start_time: selectedP?.start_time || formData.start_time,
                        end_time: selectedP?.end_time || formData.end_time,
                        is_break: Boolean(selectedP?.is_break)
                      });
                    }}
                    required={!formData.period_name}
                    className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                  >
                    <option value="">
                      {formData.period_name ? `${formData.period_name} (${formData.start_time || ''})` : 'Select Period...'}
                    </option>
                    {periods
                      .filter(p => !formData.day_id || String(p.day_id) === String(formData.day_id))
                      .map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.start_time} - {p.end_time})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Subject Selection */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Curriculum Subject *
                </label>
                <select
                  value={formData.class_subject_id}
                  onChange={e => setFormData({ ...formData, class_subject_id: e.target.value })}
                  required
                  className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                >
                  <option value="">Select Subject...</option>
                  {modalClassSubjects.map(cs => (
                    <option key={cs.id} value={cs.id}>
                      {cs.subject_name} ({cs.subject_code})
                    </option>
                  ))}
                </select>
                {modalClassSubjects.length === 0 && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                    No subjects assigned to this class yet. Please add subjects to the class curriculum first.
                  </p>
                )}
              </div>

              {/* Room Number & Academic Session */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Room Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 101, Lab A"
                    value={formData.room_number}
                    onChange={e => setFormData({ ...formData, room_number: e.target.value })}
                    className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Academic Session
                  </label>
                  <select
                    value={formData.session_id}
                    onChange={e => setFormData({ ...formData, session_id: e.target.value })}
                    className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                  >
                    <option value="">Default Term</option>
                    {sessions.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.is_current ? '(Current)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded text-xs border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || modalClassSubjects.length === 0}
                  className="px-3.5 py-1.5 rounded text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition cursor-pointer disabled:opacity-50 min-w-[100px] flex items-center justify-center"
                >
                  {submitting ? (
                    <div className="loader loader-sm loader-white" />
                  ) : editingRoutine ? (
                    'Update Slot'
                  ) : (
                    'Allocate Slot'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-sm w-full p-4 shadow-xl space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
              Remove Routine Timetable Slot?
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Are you sure you want to remove this timetable slot from the schedule?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteId(null)}
                className="px-3 py-1.5 rounded text-xs border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                disabled={deleting}
                className="px-3 py-1.5 rounded text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer disabled:opacity-50"
              >
                {deleting ? 'Removing...' : 'Confirm Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}