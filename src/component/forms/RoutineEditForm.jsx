'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FiClock, FiBook, FiLayers } from 'react-icons/fi';

const RoutineEditForm = ({ routine, onSuccess, onCancel }) => {
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);
  const [filteredClassSubjects, setFilteredClassSubjects] = useState([]);
  const [days, setDays] = useState([]);

  const to24Hour = (timeStr) => {
    if (!timeStr) return '';
    const ampmMatch = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (ampmMatch) {
      let hours = parseInt(ampmMatch[1], 10);
      const minutes = ampmMatch[2];
      const ampm = ampmMatch[3].toUpperCase();
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      return `${hours.toString().padStart(2, '0')}:${minutes}`;
    }
    return timeStr.slice(0, 5);
  };

  const [classId, setClassId] = useState(routine.class_id ? routine.class_id.toString() : '');
  const [sectionId, setSectionId] = useState(routine.section_id ? routine.section_id.toString() : '');
  const [classSubjectId, setClassSubjectId] = useState('');
  const [dayId, setDayId] = useState(routine.day_id ? routine.day_id.toString() : '');
  const [startTime, setStartTime] = useState(to24Hour(routine.start_time));
  const [endTime, setEndTime] = useState(to24Hour(routine.end_time));

  const [loadingLists, setLoadingLists] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Load initial dropdown data (classes, class-subjects, days)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [classesRes, classSubjectsRes, daysRes] = await Promise.all([
          fetch('/api/classes').catch(() => null),
          fetch('/api/class-subjects').catch(() => null),
          fetch('/api/days').catch(() => null),
        ]);

        if (classesRes && classesRes.ok) {
          const classesData = await classesRes.json();
          setClasses(classesData.paylod?.classes || []);
        }
        if (classSubjectsRes && classSubjectsRes.ok) {
          const classSubjectsData = await classSubjectsRes.json();
          const list = classSubjectsData.paylod?.assignments || [];
          setClassSubjects(list);
          
          // Match routine subject assignment
          const currentClassId = routine.class_id ? routine.class_id.toString() : '';
          const currentSubjectId = routine.subject_id ? routine.subject_id.toString() : '';
          if (currentClassId) {
            const filtered = list.filter(cs => String(cs.class_id) === String(currentClassId));
            setFilteredClassSubjects(filtered);
            
            const matchedAssignment = list.find(
              cs => String(cs.class_id) === String(currentClassId) && String(cs.subject_id) === String(currentSubjectId)
            );
            if (matchedAssignment) {
              setClassSubjectId(matchedAssignment.id.toString());
            }
          }
        }
        if (daysRes && daysRes.ok) {
          const daysData = await daysRes.json();
          setDays(daysData.paylod?.days || []);
        }
      } catch (err) {
        toast.error('Failed to load form lookup data.');
      } finally {
        setLoadingLists(false);
      }
    };
    fetchData();
  }, [routine]);

  // Fetch sections and filter class-subjects when classId changes
  useEffect(() => {
    if (!classId) {
      setSections([]);
      setFilteredClassSubjects([]);
      return;
    }

    const fetchSections = async () => {
      try {
        const res = await fetch(`/api/sections?class_id=${classId}`);
        const data = await res.json();
        setSections(data.paylod?.sections || []);
      } catch (err) {
        toast.error('Failed to fetch sections.');
      }
    };
    fetchSections();

    // Filter class-subjects
    const filtered = classSubjects.filter(cs => String(cs.class_id) === String(classId));
    setFilteredClassSubjects(filtered);

    // If changing the class, reset the selected subject mapping
    if (String(routine.class_id) !== String(classId)) {
      setClassSubjectId('');
    }
  }, [classId, classSubjects, routine]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!classId || !classSubjectId || !dayId || !startTime || !endTime) {
      toast.error('Required fields are missing.');
      return;
    }

    const selectedAssignment = classSubjects.find(cs => String(cs.id) === String(classSubjectId));
    if (!selectedAssignment) {
      toast.error('Invalid subject selection.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/class-routines/${routine.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: classId,
          subject_id: selectedAssignment.subject_id,
          day_id: dayId,
          start_time: startTime,
          end_time: endTime,
          section_id: sectionId ? parseInt(sectionId, 10) : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update routine entry.');
      }

      toast.success(data.message || 'Routine entry updated successfully!');
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingLists) {
    return (
      <div className="w-full bg-white border border-slate-100 rounded-3xl p-8 flex items-center justify-center">
        <div className="loader loader-sm" />
      </div>
    );
  }

  return (
    <div className="w-full bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-[0_10px_30px_rgba(0,0,0,0.02)] animate-fade-up">
      <h2 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
        📅 Edit Class Routine Entry
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
          {/* Day of Week */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <FiClock className="text-slate-400" /> Day of Week
            </label>
            <select
              required
              value={dayId}
              onChange={(e) => setDayId(e.target.value)}
              disabled={submitting}
              className="w-full px-3.5 py-2.5 bg-slate-55 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none transition-all duration-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5"
            >
              <option value="">Select Day...</option>
              {days.map((day) => (
                <option key={day.id} value={day.id} disabled={day.status === 'off'}>
                  {day.name} {day.status === 'off' ? '(Off)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Class selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <FiLayers className="text-slate-400" /> Class
            </label>
            <select
              required
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              disabled={submitting}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none transition-all duration-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5"
            >
              <option value="">Select Class...</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Section selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <FiLayers className="text-slate-400" /> Section (Optional)
            </label>
            <select
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              disabled={submitting || !classId}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none transition-all duration-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 disabled:opacity-60"
            >
              <option value="">All Sections (Class-Wide)</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subject selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <FiBook className="text-slate-400" /> Subject
            </label>
            <select
              required
              value={classSubjectId}
              onChange={(e) => setClassSubjectId(e.target.value)}
              disabled={submitting || !classId}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none transition-all duration-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 disabled:opacity-60"
            >
              <option value="">Select Subject...</option>
              {filteredClassSubjects.map((cs) => (
                <option key={cs.id} value={cs.id}>
                  {cs.subject_name} ({cs.subject_code})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Start Time */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <FiClock className="text-slate-400" /> Start Time *
            </label>
            <input
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              disabled={submitting}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none transition-all duration-200 focus:bg-white focus:border-primary/5 bg-slate-50"
            />
          </div>

          {/* Finish Time */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <FiClock className="text-slate-400" /> Finish Time *
            </label>
            <input
              type="time"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              disabled={submitting}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none transition-all duration-200 focus:bg-white focus:border-primary/5 bg-slate-50"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-semibold rounded-xl transition-all duration-150 cursor-pointer disabled:opacity-60 bg-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-xl shadow-xs transition-all duration-150 cursor-pointer flex items-center gap-2 disabled:opacity-60"
          >
            {submitting ? 'Saving...' : 'Save Routine'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RoutineEditForm;
