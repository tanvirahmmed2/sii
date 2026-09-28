'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FiPlus, FiTrash2, FiEdit2, FiX, FiClock, FiLayers } from 'react-icons/fi';
import RoutineCreateForm from '@/component/forms/RoutineCreateForm';
import RoutineEditForm from '@/component/forms/RoutineEditForm';

const RegistrarClassRoutinePage = () => {
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [days, setDays] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');

  const [routines, setRoutines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState(null);

  // Fetch classes and days on mount
  const fetchDays = async () => {
    try {
      const response = await fetch('/api/days');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setDays(data.paylod.days || []);
    } catch (err) {
      toast.error('Failed to retrieve academic weekdays.');
    }
  };

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await fetch('/api/classes');
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setClasses(data.paylod.classes || []);
      } catch (err) {
        toast.error('Failed to retrieve academic classes.');
      }
    };
    fetchClasses();
    fetchDays();
  }, []);

  // Fetch sections when selectedClassId changes
  useEffect(() => {
    if (!selectedClassId) {
      setSections([]);
      setSelectedSectionId('');
      setRoutines([]);
      return;
    }

    const fetchSections = async () => {
      try {
        const response = await fetch(`/api/sections?class_id=${selectedClassId}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setSections(data.paylod.sections || []);
        if (data.paylod.sections?.length > 0) {
          setSelectedSectionId(data.paylod.sections[0].id.toString());
        } else {
          setSelectedSectionId('');
        }
      } catch (err) {
        toast.error('Failed to retrieve class sections.');
      }
    };
    fetchSections();
  }, [selectedClassId]);

  // Fetch routines when class and section are selected
  const fetchRoutines = async () => {
    if (!selectedClassId) return;

    setLoading(true);
    try {
      let url = `/api/class-routines?class_id=${selectedClassId}`;
      if (selectedSectionId) {
        url += `&section_id=${selectedSectionId}`;
      }
      const response = await fetch(url);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setRoutines(data.paylod.routines || []);
    } catch (err) {
      toast.error('Failed to load routine timetables.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutines();
  }, [selectedClassId, selectedSectionId]);

  const handleDeleteRoutine = async (id, subjectName, day, times) => {
    const confirm = window.confirm(
      `Are you sure you want to delete the schedule for "${subjectName}" on ${day} (${times})?`
    );
    if (!confirm) return;

    try {
      const response = await fetch(`/api/class-routines/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete routine.');
      }

      toast.success(data.message || 'Routine entry deleted successfully!');
      fetchRoutines();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleToggleDayStatus = async (dayId, currentStatus) => {
    const nextStatus = currentStatus === 'on' ? 'off' : 'on';
    try {
      const response = await fetch(`/api/days/${dayId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error);
      toast.success(`Day status updated to ${nextStatus.toUpperCase()}`);
      fetchDays();
      fetchRoutines();
    } catch (err) {
      toast.error(err.message || 'Failed to update weekday status.');
    }
  };

  const handleStartEdit = (routine) => {
    setEditingRoutine(routine);
    setShowAddForm(false);
  };

  // Group routines dynamically by Day Name
  const groupedRoutines = days.reduce((acc, day) => {
    acc[day.name] = routines.filter((r) => r.day_of_week === day.name);
    return acc;
  }, {});

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-primary bg-primary-light px-3 py-1 rounded-full uppercase tracking-widest">
            Registrar Panel
          </span>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2 mt-2">
            <FiClock className="text-primary" /> Class Routine Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure weekday timetable routine schedules for classes and sections.
          </p>
        </div>

        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setEditingRoutine(null);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-semibold transition-all duration-200 shadow-xs cursor-pointer"
        >
          {showAddForm ? (
            <>
              <FiX className="text-lg" /> Close Form
            </>
          ) : (
            <>
              <FiPlus className="text-lg" /> Add Routine Slot
            </>
          )}
        </button>
      </div>

      {/* Day Status Controller Card */}
      <div className="w-full bg-white border border-slate-100 rounded-3xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.01)]">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
          📅 Weekly Academic Day Status (Click to Toggle Holiday)
        </h3>
        <div className="flex flex-wrap gap-2.5">
          {days.map((day) => (
            <button
              key={day.id}
              onClick={() => handleToggleDayStatus(day.id, day.status)}
              className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-all duration-200 cursor-pointer ${
                day.status === 'on'
                  ? 'bg-primary-light hover:bg-primary-light text-primary border-primary-light'
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-100 line-through'
              }`}
            >
              {day.name}: {day.status === 'on' ? 'Active' : 'Off Day'}
            </button>
          ))}
        </div>
      </div>

      {/* Selectors card */}
      <div className="w-full bg-white border border-slate-100 rounded-3xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.01)] flex flex-col sm:flex-row items-center gap-4">
        <div className="w-full sm:w-1/2 flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <FiLayers /> Select Academic Class
          </label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none transition-all duration-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 cursor-pointer"
          >
            <option value="">Select a class...</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name} ({cls.code})
              </option>
            ))}
          </select>
        </div>

        <div className="w-full sm:w-1/2 flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <FiLayers /> Select Section
          </label>
          <select
            value={selectedSectionId}
            onChange={(e) => setSelectedSectionId(e.target.value)}
            disabled={!selectedClassId}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none transition-all duration-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 cursor-pointer disabled:opacity-60"
          >
            <option value="">All Sections / Class-Wide</option>
            {sections.map((sec) => (
              <option key={sec.id} value={sec.id}>
                {sec.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Forms */}
      {showAddForm && !editingRoutine && (
        <RoutineCreateForm
          initialClassId={selectedClassId}
          initialSectionId={selectedSectionId}
          onSuccess={() => {
            fetchRoutines();
            setShowAddForm(false);
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {editingRoutine && (
        <RoutineEditForm
          routine={editingRoutine}
          onSuccess={() => {
            fetchRoutines();
            setEditingRoutine(null);
          }}
          onCancel={() => setEditingRoutine(null)}
        />
      )}

      {/* Timetable Grid View */}
      <div className="w-full bg-white border border-slate-100 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.02)] overflow-hidden p-6 md:p-8">
        <h2 className="text-base font-bold text-slate-800 mb-6 border-b border-slate-100 pb-3 flex items-center gap-2">
          📅 Day-to-Day Routine Schedule
        </h2>

        {!selectedClassId ? (
          <div className="w-full py-16 flex flex-col items-center justify-center text-center px-4">
            <span className="text-slate-300 text-6xl mb-4">📅</span>
            <h3 className="text-sm font-bold text-slate-600">No Target Specified</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-[280px]">
              Select an academic class from the selectors above to view and construct the routine schedule.
            </p>
          </div>
        ) : loading ? (
          <div className="w-full py-16 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-semibold text-slate-400">Loading schedule routines...</span>
          </div>
        ) : routines.length === 0 ? (
          <div className="w-full py-16 flex flex-col items-center justify-center text-center px-4">
            <span className="text-slate-300 text-6xl mb-4">🔔</span>
            <h3 className="text-sm font-bold text-slate-600">Routine Grid Empty</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-[280px]">
              There are no classes mapped on the timetable yet for the selected section. Click the add button to define timeslots.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {days.map((day) => {
              const daySlots = groupedRoutines[day.name] || [];
              const isOff = day.status === 'off';
              if (daySlots.length === 0 && !isOff) return null;

              return (
                <div key={day.id} className="flex flex-col md:flex-row gap-4 border-b border-slate-100/70 pb-5 last:border-0 last:pb-0">
                  {/* Day column label */}
                  <div className="w-full md:w-32 flex-shrink-0 flex flex-col gap-1 justify-center">
                    <span className={`inline-flex items-center justify-center px-3 py-1.5 font-bold text-sm rounded-xl ${isOff ? 'bg-slate-100 text-slate-400 line-through' : 'bg-primary-light text-primary'}`}>
                      {day.name}
                    </span>
                    {isOff && (
                      <span className="text-[10px] text-red-500 font-semibold self-center">Holiday / Off</span>
                    )}
                  </div>

                  {/* Slots list */}
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {isOff && daySlots.length === 0 ? (
                      <div className="col-span-full py-4 text-xs font-semibold text-slate-400 italic">
                        No classes scheduled (Academic holiday)
                      </div>
                    ) : (
                      daySlots.map((slot) => (
                        <div
                          key={slot.id}
                          className="bg-slate-50/50 hover:bg-white border border-slate-100 hover:border-slate-200/80 p-4.5 rounded-2xl flex flex-col justify-between gap-3.5 transition-all duration-200 hover:shadow-lg hover:shadow-slate-100/50 relative group"
                        >
                          {/* Action buttons (hover) */}
                          <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <button
                              onClick={() => handleStartEdit(slot)}
                              className="p-1.5 bg-white hover:bg-primary-light text-slate-500 hover:text-primary border border-slate-100 rounded-lg shadow-xs transition-colors duration-150 cursor-pointer"
                              title="Edit Slot"
                            >
                              <FiEdit2 className="text-xs" />
                            </button>
                            <button
                              onClick={() => handleDeleteRoutine(slot.id, slot.subject_name, slot.day_of_week, slot.times)}
                              className="p-1.5 bg-white hover:bg-red-50 text-slate-500 hover:text-red-600 border border-slate-100 rounded-lg shadow-xs transition-colors duration-150 cursor-pointer"
                              title="Delete Slot"
                            >
                              <FiTrash2 className="text-xs" />
                            </button>
                          </div>

                          <div>
                            {/* Subject Code & Name */}
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] font-bold text-primary bg-primary-light/50 border border-primary-light px-2 py-0.5 rounded-md">
                                {slot.subject_code}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                slot.section_name 
                                  ? 'text-primary bg-primary-light/50 border-primary-light' 
                                  : 'text-primary bg-primary-light/50 border-primary-light'
                              }`}>
                                {slot.section_name ? `Sec ${slot.section_name}` : 'Class-Wide'}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-slate-800 mt-2 pr-12">
                              {slot.subject_name}
                            </h4>

                            {/* Time Slots */}
                            <p className="text-xs font-semibold text-slate-500 mt-1.5 flex items-center gap-1">
                              <FiClock className="text-slate-400" /> {slot.times}
                            </p>
                          </div>

                          {/* Teacher & Room info */}
                          <div className="flex items-center justify-between border-t border-slate-100/80 pt-2.5 text-[11px] font-semibold text-slate-400">
                            <span className="truncate max-w-[120px]">
                              👤 {slot.teacher_name || 'Unassigned'}
                            </span>
                            <span>
                              📍 {slot.room_number ? `Room ${slot.room_number}` : 'No Room'}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default RegistrarClassRoutinePage;
