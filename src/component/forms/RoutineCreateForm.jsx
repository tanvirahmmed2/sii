'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FiClock, FiBook, FiLayers } from 'react-icons/fi';

const RoutineCreateForm = ({ initialClassId = '', initialSectionId = '', onSuccess, onCancel }) => {
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);
  const [filteredClassSubjects, setFilteredClassSubjects] = useState([]);
  const [days, setDays] = useState([]);

  const [classId, setClassId] = useState(initialClassId);
  const [sectionId, setSectionId] = useState(initialSectionId);
  const [classSubjectId, setClassSubjectId] = useState('');
  const [dayId, setDayId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

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
          setClassSubjects(classSubjectsData.paylod?.assignments || []);
        }
        if (daysRes && daysRes.ok) {
          const daysData = await daysRes.json();
          const allDays = daysData.paylod?.days || [];
          setDays(allDays);
          
          const activeDays = allDays.filter(d => d.status === 'on');
          if (activeDays.length > 0) {
            setDayId(activeDays[0].id.toString());
          }
        }
      } catch (err) {
        toast.error('Failed to load form lookup data.');
      } finally {
        setLoadingLists(false);
      }
    };
    fetchData();
  }, []);

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
    setClassSubjectId('');
  }, [classId, classSubjects]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!classId || !classSubjectId || !dayId || !startTime || !endTime) {
      toast.error('Class, Subject, Day, Start Time, and Finish Time are required.');
      return;
    }

    const selectedAssignment = classSubjects.find(cs => String(cs.id) === String(classSubjectId));
    if (!selectedAssignment) {
      toast.error('Invalid subject selection.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/class-routines', {
        method: 'POST',
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
        throw new Error(data.message || 'Failed to create routine entry.');
      }

      toast.success(data.message || 'Routine entry added successfully!');
      setClassSubjectId('');
      setStartTime('');
      setEndTime('');

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
        📅 Add Class Routine Entry
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
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none transition-all duration-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5"
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
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none transition-all duration-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5"
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
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none transition-all duration-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5"
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
            {submitting ? 'Adding...' : 'Add Routine Slot'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RoutineCreateForm;
