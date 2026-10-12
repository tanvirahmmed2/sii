'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FiFolderPlus, FiLayers, FiGrid, FiBook, FiUserCheck, FiCalendar } from 'react-icons/fi';

const ClassSubjectAssignForm = ({ classes, teachers, onSuccess, onCancel }) => {
  const [classId, setClassId] = useState('');
  const [classSubjectId, setClassSubjectId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [allClassSubjects, setAllClassSubjects] = useState([]);
  const [filteredClassSubjects, setFilteredClassSubjects] = useState([]);
  const [filteredSections, setFilteredSections] = useState([]);

  // Fetch all class subjects mappings
  useEffect(() => {
    const fetchClassSubjects = async () => {
      try {
        const res = await fetch('/api/class-subjects');
        const data = await res.json();
        setAllClassSubjects(data.paylod?.assignments || []);
      } catch (err) {
        console.error('Failed to load class subjects lookup', err);
      }
    };
    fetchClassSubjects();
  }, []);

  // Fetch sections and filter class-subjects based on selected class
  useEffect(() => {
    if (classId) {
      // Filter class subjects
      const filtered = allClassSubjects.filter(cs => String(cs.class_id) === String(classId));
      setFilteredClassSubjects(filtered);
      setClassSubjectId('');

      // Fetch sections
      fetch(`/api/sections?class_id=${classId}`)
        .then((res) => {
          if (!res.ok) throw new Error();
          return res.json();
        })
        .then((data) => {
          setFilteredSections(data.paylod.sections || []);
          setSectionId('');
        })
        .catch(() => {
          setFilteredSections([]);
          setSectionId('');
        });
    } else {
      setFilteredClassSubjects([]);
      setClassSubjectId('');
      setFilteredSections([]);
      setSectionId('');
    }
  }, [classId, allClassSubjects]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!classId || !classSubjectId || !teacherId) {
      toast.error('Class, Subject, and Teacher are required.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/class-subject-teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_subject_id: classSubjectId,
          section_id: sectionId || null,
          teacher_id: teacherId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to assign teacher.');
      }

      toast.success(data.message || 'Subject teacher assigned successfully!');
      setClassId('');
      setClassSubjectId('');
      setSectionId('');
      setTeacherId('');
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-[0_10px_30px_rgba(0,0,0,0.02)] animate-fade-up">
      <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <FiFolderPlus className="text-primary" /> Assign Subject Teacher
      </h2>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <FiLayers className="text-slate-400" /> Class *
          </label>
          <select
            required
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            disabled={submitting}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none transition-all duration-200 focus:bg-white focus:border-primary"
          >
            <option value="">Select a class...</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <FiBook className="text-slate-400" /> Subject *
          </label>
          <select
            required
            value={classSubjectId}
            onChange={(e) => setClassSubjectId(e.target.value)}
            disabled={submitting || !classId}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none transition-all duration-200 focus:bg-white focus:border-primary disabled:opacity-60"
          >
            <option value="">Select a subject...</option>
            {filteredClassSubjects.map((cs) => (
              <option key={cs.id} value={cs.id}>
                {cs.subject_name} ({cs.subject_code})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <FiGrid className="text-slate-400" /> Section
            <span className="text-[10px] font-bold text-slate-400 normal-case ml-0.5">(optional)</span>
          </label>
          <select
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
            disabled={submitting || !classId}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none transition-all duration-200 focus:bg-white focus:border-primary disabled:opacity-60"
          >
            <option value="">All Sections (class-wide)</option>
            {filteredSections.map((sec) => (
              <option key={sec.id} value={sec.id}>
                {sec.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <FiUserCheck className="text-slate-400" /> Assigned Teacher *
          </label>
          <select
            required
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
            disabled={submitting}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none transition-all duration-200 focus:bg-white focus:border-primary"
          >
            <option value="">Assign a teacher...</option>
            {teachers.map((teach) => (
              <option key={teach.id} value={teach.id}>
                {teach.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-3 md:col-span-4 mt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors duration-150 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-semibold transition-all duration-150 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {submitting ? (
              <div className="loader loader-sm loader-white" />
            ) : (
              'Assign Teacher'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ClassSubjectAssignForm;
