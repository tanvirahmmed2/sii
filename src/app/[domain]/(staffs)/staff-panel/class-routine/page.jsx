'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { BiCalendar, BiPlus, BiEdit, BiTrash, BiSearch, BiRefresh, BiTimeFive, BiDoorOpen, BiBook, BiGridAlt } from 'react-icons/bi';

export default function ClassRoutinePage() {
  const params = useParams();
  const domain = params?.domain || '';

  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);
  const [days, setDays] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('all');
  const [selectedDayId, setSelectedDayId] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState(null);
  const [formData, setFormData] = useState({
    period_id: '',
    class_subject_id: '',
    section_id: '',
    session_id: '',
    room_number: ''
  });
  const [modalClassId, setModalClassId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Delete State
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

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

  // Filtered sections for current active class
  const classSections = useMemo(() => {
    if (!selectedClassId) return sections;
    return sections.filter((s) => String(s.class_id) === String(selectedClassId));
  }, [sections, selectedClassId]);

  // Filtered routines
  const filteredRoutines = useMemo(() => {
    return routines.filter((r) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        (r.subject_name && r.subject_name.toLowerCase().includes(q)) ||
        (r.period_name && r.period_name.toLowerCase().includes(q)) ||
        (r.day_name && r.day_name.toLowerCase().includes(q)) ||
        (r.room_number && r.room_number.toLowerCase().includes(q));
      const matchesClass = !selectedClassId || String(r.class_id) === String(selectedClassId);
      const matchesSection = selectedSectionId === 'all' || String(r.section_id) === String(selectedSectionId);
      const matchesDay = selectedDayId === 'all' || String(r.day_id) === String(selectedDayId);
      return matchesSearch && matchesClass && matchesSection && matchesDay;
    });
  }, [routines, searchTerm, selectedClassId, selectedSectionId, selectedDayId]);

  // Modal helpers
  const modalClassSubjects = useMemo(() => {
    if (!modalClassId) return [];
    return classSubjects.filter((cs) => String(cs.class_id) === String(modalClassId));
  }, [classSubjects, modalClassId]);

  const modalSections = useMemo(() => {
    if (!modalClassId) return [];
    return sections.filter((s) => String(s.class_id) === String(modalClassId));
  }, [sections, modalClassId]);

  const openCreateModal = () => {
    setEditingRoutine(null);
    const activeCId = selectedClassId || (classes[0]?.id ? String(classes[0].id) : '');
    setModalClassId(activeCId);
    setFormData({
      period_id: periods[0]?.id ? String(periods[0].id) : '',
      class_subject_id: '',
      section_id: '',
      session_id: sessions.find(s => s.is_current)?.id ? String(sessions.find(s => s.is_current).id) : '',
      room_number: ''
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (r) => {
    setEditingRoutine(r);
    setModalClassId(String(r.class_id));
    setFormData({
      period_id: String(r.period_id),
      class_subject_id: String(r.class_subject_id),
      section_id: r.section_id ? String(r.section_id) : '',
      session_id: r.session_id ? String(r.session_id) : '',
      room_number: r.room_number || ''
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.period_id || !formData.class_subject_id) {
      setErrorMsg('Please select a Period and a Class Subject.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');

      const url = `/api/${domain}/staff/panel/period-class-subjects`;
      const method = editingRoutine ? 'PUT' : 'POST';
      const body = editingRoutine ? { ...formData, id: editingRoutine.id } : formData;

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

  const handleDelete = async (id) => {
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

  const activeClassObj = useMemo(() => {
    return classes.find((c) => String(c.id) === String(selectedClassId));
  }, [classes, selectedClassId]);

  return (
    <div className="w-full space-y-4">
      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Active Class</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-bold text-slate-900 dark:text-white">
              {activeClassObj ? activeClassObj.name : 'All Classes'}
            </span>
            <span className="text-[10px] font-mono text-slate-500">{activeClassObj?.code || ''}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Scheduled Slots</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-blue-600 dark:text-blue-400 font-mono">
              {filteredRoutines.length}
            </span>
            <span className="text-[10px] font-medium text-blue-600">Period Allocations</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Unique Subjects</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {new Set(filteredRoutines.map(r => r.subject_id)).size}
            </span>
            <span className="text-[10px] font-medium text-emerald-600">In Routine</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Active Weekdays</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-purple-600 dark:text-purple-400 font-mono">
              {new Set(filteredRoutines.map(r => r.day_id)).size} Days
            </span>
            <span className="text-[10px] font-medium text-purple-600">With Routine</span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 rounded text-xs bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
          <span>{successMsg}</span>
          <span className="text-[10px] font-mono">OK</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3 rounded text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="text-[10px] font-mono cursor-pointer">DISMISS</button>
        </div>
      )}

      {/* Workstation Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-4">
        {/* Class Selection Tabs Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-100 dark:border-slate-800">
          {classes.map((c) => {
            const isActive = String(c.id) === String(selectedClassId);
            return (
              <button
                key={c.id}
                onClick={() => {
                  setSelectedClassId(String(c.id));
                  setSelectedSectionId('all');
                }}
                className={`px-3 py-1.5 rounded text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {c.name}
              </button>
            );
          })}
        </div>

        {/* Toolbar & Secondary Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2 flex-1 max-w-xl">
            <div className="relative min-w-[180px] flex-1">
              <BiSearch className="absolute left-2.5 top-2.5 text-slate-400 text-sm" />
              <input
                type="text"
                placeholder="Search subject, period, or room..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              />
            </div>

            {/* Section filter */}
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Sections</option>
              {classSections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            {/* Day filter */}
            <select
              value={selectedDayId}
              onChange={(e) => setSelectedDayId(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Days</option>
              {days.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              className="p-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
              title="Refresh"
            >
              <BiRefresh className="text-base" />
            </button>
            <button
              onClick={openCreateModal}
              disabled={classes.length === 0 || periods.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition cursor-pointer disabled:opacity-40"
            >
              <BiPlus className="text-base" />
              <span>Allocate Slot</span>
            </button>
          </div>
        </div>

        {/* Routine Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">Loading class routine...</div>
          ) : filteredRoutines.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <BiCalendar className="mx-auto text-3xl text-slate-400" />
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                No routine timetable allocated for {activeClassObj?.name || 'this class'}.
              </p>
              <button
                onClick={openCreateModal}
                disabled={periods.length === 0 || classSubjects.length === 0}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer disabled:opacity-50"
              >
                Assign class subjects to period slots
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Weekday</th>
                  <th className="py-2.5 px-3">Period &amp; Time</th>
                  <th className="py-2.5 px-3">Subject</th>
                  <th className="py-2.5 px-3">Section</th>
                  <th className="py-2.5 px-3">Room</th>
                  <th className="py-2.5 px-3">Academic Session</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
                {filteredRoutines.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                        {item.day_name}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                          <BiTimeFive className="text-slate-400 text-xs" />
                          <span>{item.period_name}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {item.start_time} — {item.end_time}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <BiBook className="text-slate-400 text-sm" />
                      <div>
                        <div>{item.subject_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{item.subject_code}</div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      {item.section_name ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          <BiGridAlt className="text-xs" />
                          <span>{item.section_name}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">All Sections</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {item.room_number ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                          <BiDoorOpen /> Room {item.room_number}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                      {item.session_name || 'Annual'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          title="Edit"
                        >
                          <BiEdit className="text-sm" />
                        </button>
                        <button
                          onClick={() => setDeleteId(item.id)}
                          className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          title="Delete"
                        >
                          <BiTrash className="text-sm" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Allocate / Edit Modal */}
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Class
                  </label>
                  <select
                    value={modalClassId}
                    onChange={(e) => {
                      setModalClassId(e.target.value);
                      setFormData({ ...formData, class_subject_id: '', section_id: '' });
                    }}
                    disabled={Boolean(editingRoutine)}
                    required
                    className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer disabled:opacity-60"
                  >
                    {classes.map((c) => (
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
                    onChange={(e) => setFormData({ ...formData, section_id: e.target.value })}
                    className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                  >
                    <option value="">All Sections</option>
                    {modalSections.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Period Time Slot *
                </label>
                <select
                  value={formData.period_id}
                  onChange={(e) => setFormData({ ...formData, period_id: e.target.value })}
                  required
                  className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                >
                  <option value="">Select Period...</option>
                  {periods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.day_name}: {p.name} ({p.start_time} - {p.end_time})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Subject *
                </label>
                <select
                  value={formData.class_subject_id}
                  onChange={(e) => setFormData({ ...formData, class_subject_id: e.target.value })}
                  required
                  className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                >
                  <option value="">Select Subject...</option>
                  {modalClassSubjects.map((cs) => (
                    <option key={cs.id} value={cs.id}>
                      {cs.subject_name} ({cs.subject_code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Room Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 101, Lab A"
                    value={formData.room_number}
                    onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                    className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Academic Session
                  </label>
                  <select
                    value={formData.session_id}
                    onChange={(e) => setFormData({ ...formData, session_id: e.target.value })}
                    className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                  >
                    <option value="">Default Term</option>
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.is_current ? '(Current)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

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
                  disabled={submitting}
                  className="px-3.5 py-1.5 rounded text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingRoutine ? 'Update Slot' : 'Allocate Slot'}
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
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Remove Routine Slot?</h4>
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
