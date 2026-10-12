'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FiPlusCircle, FiFileText, FiLink, FiLayers, FiBook } from 'react-icons/fi';

const SyllabusCreateForm = ({ initialClassId = '', onSuccess, onCancel }) => {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [link, setLink] = useState('');
  const [classId, setClassId] = useState(initialClassId);
  const [subjectId, setSubjectId] = useState('');

  const [loadingLists, setLoadingLists] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [classesRes, subjectsRes] = await Promise.all([
          fetch('/api/classes'),
          fetch('/api/subjects'),
        ]);

        const classesData = await classesRes.json();
        const subjectsData = await subjectsRes.json();

        setClasses(classesData.paylod.classes || []);
        setSubjects(subjectsData.paylod.subjects || []);
      } catch (err) {
        toast.error('Failed to load classes or subjects.');
      } finally {
        setLoadingLists(false);
      }
    };
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !title || !link || !classId || !subjectId) {
      toast.error('All fields are required.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/syllabuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          title: title.trim(),
          link: link.trim(),
          class_id: classId,
          subject_id: subjectId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create syllabus.');
      }

      toast.success(data.message || 'Syllabus created successfully!');
      // Reset form fields (retaining classId filter helper)
      setName('');
      setTitle('');
      setLink('');
      setSubjectId('');

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
        <FiPlusCircle className="text-primary" /> Create Syllabus Entry
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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

          {/* Subject selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <FiBook className="text-slate-400" /> Subject
            </label>
            <select
              required
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              disabled={submitting}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none transition-all duration-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5"
            >
              <option value="">Select Subject...</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name} ({sub.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Syllabus Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <FiFileText className="text-slate-400" /> Syllabus Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
              className="w-full px-3.5 py-2.5 bg-slate-55 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 bg-slate-50"
            />
          </div>

          {/* Syllabus Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <FiFileText className="text-slate-400" /> Syllabus Title / Term
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={submitting}
              className="w-full px-3.5 py-2.5 bg-slate-55 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 bg-slate-50"
            />
          </div>
        </div>

        {/* Syllabus Document URL */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <FiLink className="text-slate-400" /> Syllabus Link / Document URL
          </label>
          <input
            type="url"
            required
            value={link}
            onChange={(e) => setLink(e.target.value)}
            disabled={submitting}
            className="w-full px-3.5 py-2.5 bg-slate-55 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 bg-slate-50"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-semibold rounded-xl transition-all duration-150 cursor-pointer disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-xl shadow-xs transition-all duration-150 cursor-pointer flex items-center gap-2 disabled:opacity-60"
          >
            {submitting ? 'Creating...' : 'Save Syllabus'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SyllabusCreateForm;
