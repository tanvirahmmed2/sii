'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FiPlus, FiTrash2, FiEdit2, FiX, FiClock, FiLayers } from 'react-icons/fi';
import RoutineCreateForm from '@/component/forms/RoutineCreateForm';
import RoutineEditForm from '@/component/forms/RoutineEditForm';

const AdminClassRoutinePage = () => {
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [days, setDays] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');

  const [routines, setRoutines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState(null);

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

  const fetchRoutines = async () => {
    if (!selectedClassId) return;
    setLoading(true);
    try {
      let url = `/api/class-routines?class_id=${selectedClassId}`;
      if (selectedSectionId) url += `&section_id=${selectedSectionId}`;
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

  useEffect(() => { fetchRoutines(); }, [selectedClassId, selectedSectionId]);

  const handleDeleteRoutine = async (id, subjectName, day, times) => {
    const confirm = window.confirm(
      `Are you sure you want to delete the schedule for "${subjectName}" on ${day} (${times})?`
    );
    if (!confirm) return;
    try {
      const response = await fetch(`/api/class-routines/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete routine.');
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

  // Group routines by day name
  const groupedRoutines = days.reduce((acc, day) => {
    acc[day.name] = routines.filter((r) => r.day_of_week === day.name);
    return acc;
  }, {});

  return (
    <div className="w-full flex flex-col gap-5 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <FiClock className="text-primary" /> Class Routine
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure weekday timetable schedules for classes and sections.
          </p>
        </div>
        <button
          onClick={() => { setShowAddForm(!showAddForm); setEditingRoutine(null); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
        >
          {showAddForm ? <><FiX /> Close</> : <><FiPlus /> Add Slot</>}
        </button>
      </div>

      {/* Day toggle pills */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
          Weekly Day Status — click to toggle holiday
        </p>
        <div className="flex flex-wrap gap-2">
          {days.map((day) => (
            <button
              key={day.id}
              onClick={() => handleToggleDayStatus(day.id, day.status)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                day.status === 'on'
                  ? 'bg-emerald-50 text-primary border-emerald-200/60'
                  : 'bg-rose-50 text-rose-600 border-rose-100 line-through opacity-70'
              }`}
            >
              {day.name} {day.status === 'on' ? '' : '(Off)'}
            </button>
          ))}
        </div>
      </div>

      {/* Class / Section selector */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <FiLayers className="text-xs" /> Class
          </label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-primary cursor-pointer"
          >
            <option value="">Select a class...</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>{cls.name} ({cls.code})</option>
            ))}
          </select>
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <FiLayers className="text-xs" /> Section
          </label>
          <select
            value={selectedSectionId}
            onChange={(e) => setSelectedSectionId(e.target.value)}
            disabled={!selectedClassId}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-primary cursor-pointer disabled:opacity-50"
          >
            <option value="">All Sections / Class-Wide</option>
            {sections.map((sec) => (
              <option key={sec.id} value={sec.id}>{sec.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Forms */}
      {showAddForm && !editingRoutine && (
        <RoutineCreateForm
          initialClassId={selectedClassId}
          initialSectionId={selectedSectionId}
          onSuccess={() => { fetchRoutines(); setShowAddForm(false); }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {editingRoutine && (
        <RoutineEditForm
          routine={editingRoutine}
          onSuccess={() => { fetchRoutines(); setEditingRoutine(null); }}
          onCancel={() => setEditingRoutine(null)}
        />
      )}

      {/* Timetable tables */}
      <div className="flex flex-col gap-4">
        {!selectedClassId ? (
          <div className="bg-white border border-slate-100 rounded-2xl py-16 flex flex-col items-center justify-center text-center">
            <span className="text-4xl mb-2">📅</span>
            <h3 className="text-sm font-bold text-slate-600">No class selected</h3>
            <p className="text-xs text-slate-400 mt-1">Select a class above to view its routine.</p>
          </div>
        ) : loading ? (
          <div className="bg-white border border-slate-100 rounded-2xl py-14 flex flex-col items-center justify-center gap-3">
            <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-semibold text-slate-400">Loading schedule...</span>
          </div>
        ) : routines.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-2xl py-16 flex flex-col items-center justify-center text-center">
            <span className="text-4xl mb-2">🔔</span>
            <h3 className="text-sm font-bold text-slate-600">No routines yet</h3>
            <p className="text-xs text-slate-400 mt-1">Click "Add Slot" to define timetable entries.</p>
          </div>
        ) : (
          days.map((day) => {
            const slots = groupedRoutines[day.name] || [];
            const isOff = day.status === 'off';
            if (slots.length === 0 && !isOff) return null;

            return (
              <div key={day.id} className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                {/* Day header */}
                <div className={`px-5 py-3 border-b border-slate-100 flex items-center gap-2 ${isOff ? 'bg-rose-50/40' : 'bg-slate-50/60'}`}>
                  <span className={`text-sm font-extrabold ${isOff ? 'text-rose-400 line-through' : 'text-slate-800'}`}>
                    {day.name}
                  </span>
                  {isOff && (
                    <span className="text-[10px] font-bold text-rose-500 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full">
                      Holiday / Off
                    </span>
                  )}
                  <span className="ml-auto text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {slots.length} slot{slots.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {isOff && slots.length === 0 ? (
                  <div className="px-5 py-4 text-xs text-slate-400 italic">No classes scheduled (academic holiday)</div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-50">
                        <th className="px-5 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subject</th>
                        <th className="px-5 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Time</th>
                        <th className="px-5 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Section</th>
                        <th className="px-5 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Teacher</th>
                        <th className="px-5 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Room</th>
                        <th className="px-5 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {slots.map((slot) => (
                        <tr key={slot.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-5 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-primary bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md">
                                {slot.subject_code}
                              </span>
                              <span className="text-xs font-bold text-slate-800">{slot.subject_name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600">
                              <FiClock className="text-slate-400 text-xs" />
                              {slot.times}
                            </span>
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                              {slot.section_name ? `Sec ${slot.section_name}` : 'Class-Wide'}
                            </span>
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            <span className="text-xs text-slate-500 font-medium">
                              {slot.teacher_name || <span className="text-slate-300">Unassigned</span>}
                            </span>
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            <span className="text-xs text-slate-500 font-medium">
                              {slot.room_number ? `Room ${slot.room_number}` : <span className="text-slate-300">—</span>}
                            </span>
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleStartEdit(slot)}
                                className="p-1.5 bg-emerald-50 hover:bg-primary/10 text-primary rounded-lg transition-colors cursor-pointer"
                                title="Edit Slot"
                              >
                                <FiEdit2 className="text-xs" />
                              </button>
                              <button
                                onClick={() => handleDeleteRoutine(slot.id, slot.subject_name, slot.day_of_week, slot.times)}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-lg transition-colors cursor-pointer"
                                title="Delete Slot"
                              >
                                <FiTrash2 className="text-xs" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AdminClassRoutinePage;
