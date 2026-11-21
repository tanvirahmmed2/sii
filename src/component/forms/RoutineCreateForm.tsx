'use client';
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FiClock, FiBook, FiLayers } from 'react-icons/fi';
const RoutineCreateForm = ({ initialClassId = '', initialSectionId = '', onSuccess, onCancel }: any) => {
    const [classes, setClasses] = useState<any>([]);
    const [sections, setSections] = useState<any>([]);
    const [classSubjects, setClassSubjects] = useState<any>([]);
    const [filteredClassSubjects, setFilteredClassSubjects] = useState<any>([]);
    const [days, setDays] = useState<any>([]);
    const [classId, setClassId] = useState<any>(initialClassId);
    const [sectionId, setSectionId] = useState<any>(initialSectionId);
    const [classSubjectId, setClassSubjectId] = useState<any>('');
    const [dayId, setDayId] = useState<any>('');
    const [startTime, setStartTime] = useState<any>('');
    const [endTime, setEndTime] = useState<any>('');
    const [loadingLists, setLoadingLists] = useState<any>(true);
    const [submitting, setSubmitting] = useState<any>(false);
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
                    const activeDays = allDays.filter((d: any) => d.status === 'on');
                    if (activeDays.length > 0) {
                        setDayId(activeDays[0].id.toString());
                    }
                }
            }
            catch (err: any) {
                toast.error('Failed to load form lookup data.');
            }
            finally {
                setLoadingLists(false);
            }
        };
        fetchData();
    }, []);
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
            }
            catch (err: any) {
                toast.error('Failed to fetch sections.');
            }
        };
        fetchSections();
        const filtered = classSubjects.filter((cs: any) => String(cs.class_id) === String(classId));
        setFilteredClassSubjects(filtered);
        setClassSubjectId('');
    }, [classId, classSubjects]);
    const handleSubmit = async (e: any) => {
        e.preventDefault();
        if (!classId || !classSubjectId || !dayId || !startTime || !endTime) {
            toast.error('Class, Subject, Day, Start Time, and Finish Time are required.');
            return;
        }
        const selectedAssignment = classSubjects.find((cs: any) => String(cs.id) === String(classSubjectId));
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
            if (onSuccess)
                onSuccess();
        }
        catch (err: any) {
            toast.error(err.message);
        }
        finally {
            setSubmitting(false);
        }
    };
    if (loadingLists) {
        return (<div className="w-full bg-white border border-slate-100 rounded-3xl p-8 flex items-center justify-center">
        <div className="loader loader-sm"/>
      </div>);
    }
    return (<div className="w-full bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-[0_10px_30px_rgba(0,0,0,0.02)] animate-fade-up">
      <h2 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
        📅 Add Class Routine Entry
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <FiClock className="text-slate-400"/> Day of Week
            </label>
            <select required value={dayId} onChange={(e: any) => setDayId(e.target.value)} disabled={submitting} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none transition-all duration-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5">
              <option value="">Select Day...</option>
              {days.map((day: any) => (<option key={day.id} value={day.id} disabled={day.status === 'off'}>
                  {day.name} {day.status === 'off' ? '(Off)' : ''}
                </option>))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <FiLayers className="text-slate-400"/> Class
            </label>
            <select required value={classId} onChange={(e: any) => setClassId(e.target.value)} disabled={submitting} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none transition-all duration-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5">
              <option value="">Select Class...</option>
              {classes.map((c: any) => (<option key={c.id} value={c.id}>
                  {c.name}
                </option>))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <FiLayers className="text-slate-400"/> Section (Optional)
            </label>
            <select value={sectionId} onChange={(e: any) => setSectionId(e.target.value)} disabled={submitting || !classId} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none transition-all duration-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 disabled:opacity-60">
              <option value="">All Sections (Class-Wide)</option>
              {sections.map((s: any) => (<option key={s.id} value={s.id}>
                  {s.name}
                </option>))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <FiBook className="text-slate-400"/> Subject
            </label>
            <select required value={classSubjectId} onChange={(e: any) => setClassSubjectId(e.target.value)} disabled={submitting || !classId} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none transition-all duration-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 disabled:opacity-60">
              <option value="">Select Subject...</option>
              {filteredClassSubjects.map((cs: any) => (<option key={cs.id} value={cs.id}>
                  {cs.subject_name} ({cs.subject_code})
                </option>))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <FiClock className="text-slate-400"/> Start Time *
            </label>
            <input type="time" required value={startTime} onChange={(e: any) => setStartTime(e.target.value)} disabled={submitting} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none transition-all duration-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5"/>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <FiClock className="text-slate-400"/> Finish Time *
            </label>
            <input type="time" required value={endTime} onChange={(e: any) => setEndTime(e.target.value)} disabled={submitting} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none transition-all duration-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5"/>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button type="button" onClick={onCancel} disabled={submitting} className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-semibold rounded-xl transition-all duration-150 cursor-pointer disabled:opacity-60 bg-white">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="px-5 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-xl shadow-xs transition-all duration-150 cursor-pointer flex items-center gap-2 disabled:opacity-60">
            {submitting ? 'Adding...' : 'Add Routine Slot'}
          </button>
        </div>
      </form>
    </div>);
};
export default RoutineCreateForm;
