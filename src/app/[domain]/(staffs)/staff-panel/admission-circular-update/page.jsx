'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { toast } from 'react-hot-toast';

// Dynamically import TiptapEditor to prevent SSR hydration mismatch
const TiptapEditor = dynamic(() => import('src/component/website/ui/TiptapEditor.jsx'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-44 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center bg-slate-50 dark:bg-slate-800 text-xs text-slate-400">
      Loading Tiptap Rich Text Editor...
    </div>
  )
});

function CircularUpdateContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const domain = params?.domain || '';
  const apiBase = domain ? `/api/${domain}` : '/api';
  const initialId = searchParams.get('id') || '';
  const [circulars, setCirculars] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedId, setSelectedId] = useState(initialId);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCircular, setSelectedCircular] = useState(null);

  // Form State
  const [form, setForm] = useState({
    title: '',
    selection_method: 'manual',
    class_id: '',
    session_id: '',
    start_date: '',
    end_date: '',
    exam_date: '',
    min_age: '',
    max_age: '',
    capacity: 100,
    status: 'open',
    is_published: true,
    fee_title: 'Application Form Fee',
    fee_amount: 500,
    fee_currency: 'BDT',
    late_fee: 0,
    description: '',
    last_class: '',
    last_class_grade: '',
    last_institution: '',
    admit_publish_date: '',
    exam_venue: '',
    exam_instructions: '',
    exam_subjects: [
      { title: 'Mathematics', mark: 100, time: '1 hour' },
      { title: 'English', mark: 100, time: '1 hour' }
    ]
  });

  // Populate form with circular data
  const populateForm = useCallback(circ => {
    setSelectedCircular(circ);
    if (!circ) return;
    setForm({
      title: circ.title || '',
      selection_method: circ.selection_method || 'manual',
      class_id: circ.class_id ? String(circ.class_id) : '',
      session_id: circ.session_id ? String(circ.session_id) : '',
      start_date: circ.start_date ? new Date(circ.start_date).toISOString().split('T')[0] : '',
      end_date: circ.end_date ? new Date(circ.end_date).toISOString().split('T')[0] : '',
      exam_date: circ.admission_exam_date ? new Date(circ.admission_exam_date).toISOString().split('T')[0] : circ.exam_date ? new Date(circ.exam_date).toISOString().split('T')[0] : '',
      admit_publish_date: circ.admission_admit_publish_date ? new Date(circ.admission_admit_publish_date).toISOString().split('T')[0] : circ.admit_publish_date ? new Date(circ.admit_publish_date).toISOString().split('T')[0] : '',
      exam_venue: circ.exam_venue || '',
      exam_instructions: circ.exam_instructions || '',
      last_class: circ.last_class || '',
      last_class_grade: circ.last_class_grade !== null && circ.last_class_grade !== undefined ? String(circ.last_class_grade) : '',
      last_institution: circ.last_institution || '',
      min_age: circ.min_age !== null && circ.min_age !== undefined ? String(circ.min_age) : '',
      max_age: circ.max_age !== null && circ.max_age !== undefined ? String(circ.max_age) : '',
      capacity: circ.capacity || 100,
      status: circ.status || 'open',
      is_published: circ.is_published !== undefined ? Boolean(circ.is_published) : true,
      fee_title: circ.fee_title || 'Application Form Fee',
      fee_amount: circ.fee_amount !== undefined ? circ.fee_amount : 500,
      fee_currency: circ.fee_currency || 'BDT',
      late_fee: circ.late_fee !== undefined ? circ.late_fee : 0,
      description: circ.description || '',
      exam_subjects: Array.isArray(circ.exam_subjects) && circ.exam_subjects.length > 0 ? circ.exam_subjects : [
        { title: 'Mathematics', mark: 100, time: '1 hour' },
        { title: 'English', mark: 100, time: '1 hour' }
      ]
    });
  }, []);

  // Fetch all circulars & metadata
  const fetchData = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const res = await fetch(`${apiBase}/staff/panel/admissions`);
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }
      const data = await res.json();
      if (data.success) {
        const list = data.circulars || [];
        setCirculars(list);
        setClasses(data.classes || []);
        setSessions(data.sessions || []);
        if (list.length > 0) {
          const match = initialId ? list.find(c => String(c.id) === String(initialId)) : list[0];
          const target = match || list[0];
          setSelectedId(String(target.id));
          populateForm(target);
        }
      } else {
        toast.error(data.error || 'Failed to load admission circulars.');
      }
    } catch (err) {
      console.error('Error loading circulars:', err);
      toast.error('Network error loading admission circulars.');
    } finally {
      setLoading(false);
    }
  }, [apiBase, initialId, populateForm]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await fetch(`${apiBase}/staff/panel/admissions`);
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && data.success) {
          const list = data.circulars || [];
          setCirculars(list);
          setClasses(data.classes || []);
          setSessions(data.sessions || []);
          if (list.length > 0) {
            const match = initialId ? list.find(c => String(c.id) === String(initialId)) : list[0];
            const target = match || list[0];
            setSelectedId(String(target.id));
            populateForm(target);
          }
        }
      } catch (err) {
        console.error('Error loading circulars:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [apiBase, initialId, populateForm]);

  // Handle circular selection change
  const handleSelectCircular = id => {
    setSelectedId(id);
    const found = circulars.find(c => String(c.id) === String(id));
    if (found) {
      populateForm(found);
      router.replace(`/staff-panel/admission-circular-update?id=${id}`);
    }
  };

  // Form input change
  const handleChange = e => {
    const {
      name,
      value,
      type,
      checked
    } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Exam Subjects helper handlers
  const addSubjectRow = () => {
    setForm(prev => ({
      ...prev,
      exam_subjects: [...prev.exam_subjects, { title: '', mark: 100, time: '1 hour' }]
    }));
  };
  const removeSubjectRow = index => {
    setForm(prev => ({
      ...prev,
      exam_subjects: prev.exam_subjects.filter((_, i) => i !== index)
    }));
  };
  const updateSubjectRow = (index, field, value) => {
    setForm(prev => {
      const updated = [...prev.exam_subjects];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, exam_subjects: updated };
    });
  };

  // Submit update
  const handleSubmit = async e => {
    e.preventDefault();
    if (!selectedId) {
      toast.error('Please select an admission circular to update.');
      return;
    }
    if (!form.title.trim()) {
      toast.error('Circular title is required.');
      return;
    }
    if (!form.start_date || !form.end_date) {
      toast.error('Application start and end dates are required.');
      return;
    }
    if (new Date(form.start_date) > new Date(form.end_date)) {
      toast.error('Start date cannot be after end date.');
      return;
    }
    if (form.selection_method === 'merit') {
      if (!form.last_class || !form.last_class.trim() || form.last_class === 'N/A') {
        toast.error('Previous Class prerequisite is required for Merit-based admission.');
        return;
      }
    }
    if (form.selection_method === 'exam') {
      if (!form.exam_date) {
        toast.error('Exam Date is required for Exam-based admission.');
        return;
      }
      const validSubjects = form.exam_subjects.filter(s => s.title && s.title.trim());
      if (validSubjects.length === 0) {
        toast.error('At least one exam subject is required for Exam-based admission.');
        return;
      }
    }
    setSaving(true);
    try {
      const payload = {
        id: parseInt(selectedId, 10),
        title: form.title.trim(),
        selection_method: form.selection_method || 'manual',
        class_id: form.class_id ? parseInt(form.class_id, 10) : null,
        session_id: form.session_id ? parseInt(form.session_id, 10) : null,
        start_date: form.start_date,
        end_date: form.end_date,
        exam_date: form.selection_method === 'exam' ? form.exam_date : null,
        admit_publish_date: form.selection_method === 'exam' ? form.admit_publish_date : null,
        exam_venue: form.selection_method === 'exam' ? form.exam_venue : null,
        exam_instructions: form.selection_method === 'exam' ? form.exam_instructions : null,
        last_class: form.selection_method === 'merit' ? form.last_class.trim() : 'N/A',
        last_class_grade: form.selection_method === 'merit' && form.last_class_grade !== '' ? parseFloat(form.last_class_grade) : null,
        last_institution: form.selection_method === 'merit' ? form.last_institution.trim() : 'N/A',
        min_age: form.min_age ? parseInt(form.min_age, 10) : null,
        max_age: form.max_age ? parseInt(form.max_age, 10) : null,
        capacity: form.capacity ? parseInt(form.capacity, 10) : 100,
        status: form.status,
        is_published: Boolean(form.is_published),
        fee_title: form.fee_title.trim() || 'Application Form Fee',
        fee_amount: parseFloat(form.fee_amount) || 0,
        fee_currency: form.fee_currency || 'BDT',
        late_fee: parseFloat(form.late_fee) || 0,
        description: form.description ? form.description.trim() : null,
        exam_subjects: form.selection_method === 'exam' ? form.exam_subjects.filter(s => s.title && s.title.trim()) : []
      };
      const res = await fetch(`${apiBase}/staff/panel/admissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'Admission circular updated successfully!');
        // Refresh circulars in state
        setCirculars(prev => prev.map(c => String(c.id) === String(selectedId) ? {
          ...c,
          ...payload
        } : c));
        setSelectedCircular(prev => ({
          ...prev,
          ...payload
        }));
      } else {
        toast.error(data.error || 'Failed to update circular.');
      }
    } catch (err) {
      console.error('Save error:', err);
      toast.error('An error occurred while saving circular updates.');
    } finally {
      setSaving(false);
    }
  };
  if (loading) {
    return <div className="w-full p-16 flex justify-center items-center">
        <div className="loader loader-md" />
      </div>;
  }
  return <div className="w-full space-y-5">
      {/* Top Action Bar & Circular Selector */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1 max-w-lg space-y-1">
          <label className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
            Select Circular to Update
          </label>
          <select value={selectedId} onChange={e => handleSelectCircular(e.target.value)} className="w-full text-xs font-medium px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-sky-500 cursor-pointer">
            {circulars.length === 0 ? <option value="">No circulars found</option> : circulars.map(c => <option key={c.id} value={c.id}>
                  {c.title} (ID: #{c.id}) — {c.status?.toUpperCase()}
                </option>)}
          </select>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/staff-panel/admission-circulars" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
            Circulars List
          </Link>

          {selectedId && <>
              <Link href={`/staff-panel/admission-applicants?circular_id=${selectedId}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 transition">
                Applicants ({selectedCircular?.total_applicants || 0})
              </Link>
              <Link href="/staff-panel/admission-result" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition">
                Merit Results
              </Link>
            </>}
        </div>
      </div>

      {/* Selected Circular KPI Banner */}
      {selectedCircular && <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-400">Total Applicants</span>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
              {selectedCircular.total_applicants || 0}
            </div>
            <span className="text-[10px] text-slate-500">Capacity: {selectedCircular.capacity || 100} seats</span>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-amber-500">Pending Review</span>
            <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
              {selectedCircular.pending_applicants || 0}
            </div>
            <span className="text-[10px] text-slate-500">Awaiting evaluation</span>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-emerald-500">Selected / Merit</span>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {selectedCircular.selected_applicants || 0}
            </div>
            <span className="text-[10px] text-slate-500">Eligible for admission</span>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-sky-500">Enrolled Students</span>
            <div className="text-xl font-bold text-sky-600 dark:text-sky-400 mt-0.5">
              {selectedCircular.enrolled_applicants || 0}
            </div>
            <span className="text-[10px] text-slate-500">Completed admission</span>
          </div>
        </div>}

      {/* Main Edit Form Workstation */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 shadow-2xs space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              
              Circular Configuration &amp; Criteria
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Update intake circular details, application deadline, fees, and age requirements.
            </p>
          </div>

          <button type="submit" disabled={saving || !selectedId} className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white transition shadow-2xs disabled:opacity-50 cursor-pointer min-w-[140px]">
            {saving ? <div className="loader loader-sm loader-white" /> : <>
                <span>Save Circular Updates</span>
              </>}
          </button>
        </div>

        {/* Section 1: Core Details */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">1. Core Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Circular Title <span className="text-rose-500">*</span>
              </label>
              <input type="text" name="title" value={form.title} onChange={handleChange} placeholder="e.g., Grade 6 General Admission 2026-2027" required className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-sky-500" />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Selection Method
              </label>
              <select name="selection_method" value={form.selection_method} onChange={handleChange} className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-sky-500 cursor-pointer">
                <option value="exam">Exam Based Admission</option>
                <option value="merit">Merit Based (Past Grade / GPA)</option>
                <option value="manual">Manual Selection</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Target Class / Grade
              </label>
              <select name="class_id" value={form.class_id} onChange={handleChange} className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-sky-500 cursor-pointer">
                <option value="">General / All Classes</option>
                {classes.map(cls => <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Academic Session
              </label>
              <select name="session_id" value={form.session_id} onChange={handleChange} className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-sky-500 cursor-pointer">
                <option value="">Current Session</option>
                {sessions.map(sess => <option key={sess.id} value={sess.id}>
                    {sess.name}
                  </option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Intake Capacity (Seats)
              </label>
              <input type="number" name="capacity" value={form.capacity} onChange={handleChange} min="1" placeholder="100" className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-sky-500" />
            </div>
          </div>
        </div>

        {/* Section 2: Timeline & Dates */}
        <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">2. Timeline &amp; Dates</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Application Start Date <span className="text-rose-500">*</span>
              </label>
              <input type="date" name="start_date" value={form.start_date} onChange={handleChange} required className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-sky-500" />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Application End Date <span className="text-rose-500">*</span>
              </label>
              <input type="date" name="end_date" value={form.end_date} onChange={handleChange} required className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-sky-500" />
            </div>
          </div>
        </div>

        {/* Section 2B: Conditional Merit Requirements (Only when selection_method === 'merit') */}
        {form.selection_method === 'merit' && (
          <div className="p-3 bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-md space-y-2">
            <div className="flex items-center justify-between border-b border-amber-100 dark:border-amber-900/40 pb-1.5">
              <span className="text-[11px] font-semibold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                Applicant Past Academic Requirements (Required for Merit Evaluation)
              </span>
              <span className="text-[10px] text-amber-600 dark:text-amber-300 font-mono">
                Merit Selection Mode
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Previous Class Required <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="last_class"
                  placeholder="e.g. Class 5, SSC, or Grade 8"
                  value={form.last_class}
                  onChange={handleChange}
                  required={form.selection_method === 'merit'}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Minimum GPA / Grade Required
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="last_class_grade"
                  placeholder="e.g. 3.50 (optional)"
                  value={form.last_class_grade}
                  onChange={handleChange}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Previous Institution (or N/A)
                </label>
                <input
                  type="text"
                  name="last_institution"
                  placeholder="e.g. Recognized School or Board"
                  value={form.last_institution}
                  onChange={handleChange}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* Section 2C: Conditional Exam Configuration (Only when selection_method === 'exam') */}
        {form.selection_method === 'exam' && (
          <div className="p-4 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/50 rounded-lg space-y-3">
            <div className="flex items-center justify-between border-b border-purple-100 dark:border-purple-900/40 pb-2">
              <span className="text-xs font-semibold text-purple-900 dark:text-purple-200">
                Admission Exam Schedule &amp; Subject Marks Breakdown
              </span>
              <span className="text-[10px] text-purple-600 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/60 px-2 py-0.5 rounded font-mono">
                Exam-based Intake
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-purple-900 dark:text-purple-300 mb-1">
                  Exam Date &amp; Time <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  name="exam_date"
                  value={form.exam_date}
                  onChange={handleChange}
                  required={form.selection_method === 'exam'}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-purple-900 dark:text-purple-300 mb-1">
                  Admit Card Publish Date
                </label>
                <input
                  type="date"
                  name="admit_publish_date"
                  value={form.admit_publish_date}
                  onChange={handleChange}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-purple-900 dark:text-purple-300 mb-1">
                  Exam Venue
                </label>
                <input
                  type="text"
                  name="exam_venue"
                  placeholder="e.g. Main Campus Auditorium / Building 2"
                  value={form.exam_venue}
                  onChange={handleChange}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-purple-900 dark:text-purple-300">
                  Exam Subjects (Title, Mark, Time)
                </span>
                <button
                  type="button"
                  onClick={addSubjectRow}
                  className="text-[11px] font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400 cursor-pointer"
                >
                  + Add Subject
                </button>
              </div>

              <div className="space-y-2">
                {form.exam_subjects.map((sub, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Subject Title (e.g. Mathematics)"
                      value={sub.title}
                      onChange={e => updateSubjectRow(idx, 'title', e.target.value)}
                      className="flex-2 text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                    />
                    <input
                      type="number"
                      placeholder="Mark"
                      value={sub.mark}
                      onChange={e => updateSubjectRow(idx, 'mark', e.target.value)}
                      className="w-24 text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                    />
                    <input
                      type="text"
                      placeholder="Duration (e.g. 1 hour)"
                      value={sub.time}
                      onChange={e => updateSubjectRow(idx, 'time', e.target.value)}
                      className="w-28 text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                    {form.exam_subjects.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSubjectRow(idx)}
                        className="px-2 py-1 text-slate-400 hover:text-rose-600 rounded text-xs transition cursor-pointer"
                        title="Remove subject"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Section 2D: Manual Notice (When selection_method === 'manual') */}
        {form.selection_method === 'manual' && (
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-md">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-slate-800 dark:text-slate-200">Manual Selection Mode:</span> No entrance exam or prior academic grade minimums required. Staff will manually review and select applicants from the applicant workstation.
            </p>
          </div>
        )}

        {/* Section 3: Eligibility & Age Limits */}
        <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">3. Age Eligibility Criteria</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Minimum Age (Years)
              </label>
              <input type="number" name="min_age" value={form.min_age} onChange={handleChange} min="3" max="30" placeholder="e.g., 10" className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-sky-500" />
              <p className="text-[10px] text-slate-400">Leave blank if no minimum age restriction.</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Maximum Age (Years)
              </label>
              <input type="number" name="max_age" value={form.max_age} onChange={handleChange} min="3" max="35" placeholder="e.g., 14" className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-sky-500" />
              <p className="text-[10px] text-slate-400">Leave blank if no maximum age ceiling.</p>
            </div>
          </div>
        </div>

        {/* Section 4: Application Fee & Gateway Routing */}
        <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">4. Application Fee Structure</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Fee Title
              </label>
              <input type="text" name="fee_title" value={form.fee_title} onChange={handleChange} placeholder="Application Form Fee" className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-sky-500" />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Fee Amount <span className="text-rose-500">*</span>
              </label>
              <input type="number" name="fee_amount" value={form.fee_amount} onChange={handleChange} min="0" step="0.01" placeholder="500.00" required className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-sky-500 font-mono" />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Currency
              </label>
              <select name="fee_currency" value={form.fee_currency} onChange={handleChange} className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-sky-500 cursor-pointer font-mono">
                <option value="BDT">BDT (৳)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Late Submission Fee
              </label>
              <input type="number" name="late_fee" value={form.late_fee} onChange={handleChange} min="0" step="0.01" placeholder="0.00" className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-sky-500 font-mono" />
            </div>
          </div>
        </div>

        {/* Section 5: Status & Visibility */}
        <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">5. Status &amp; Visibility</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Intake Status
              </label>
              <select name="status" value={form.status} onChange={handleChange} className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-sky-500 cursor-pointer">
                <option value="open">Open (Accepting Applications)</option>
                <option value="closed">Closed (Intake Ended)</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className="flex items-center space-x-2 pt-6">
              <input type="checkbox" id="is_published" name="is_published" checked={form.is_published} onChange={handleChange} className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300 dark:border-slate-700 cursor-pointer" />
              <label htmlFor="is_published" className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                Publish on Public Website (Visible to applicants)
              </label>
            </div>
          </div>
        </div>

        {/* Section 6: Instructions & Guidelines with Tiptap Editor */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              6. Guidelines, Instructions &amp; Syllabus (Tiptap Rich Text Editor)
            </h3>
            <span className="text-[10px] text-slate-400 font-medium">Powered by Tiptap Editor</span>
          </div>
          <TiptapEditor
            value={form.description}
            onChange={(val) => setForm((prev) => ({ ...prev, description: val }))}
            placeholder="Enter instructions for candidates, required documents, photo specifications, exam syllabus, fee breakdown, etc..."
            minHeight="220px"
          />
        </div>

        {/* Bottom Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Link href="/staff-panel/admission-circulars" className="px-4 py-2 rounded text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
            Cancel
          </Link>

          <button type="submit" disabled={saving || !selectedId} className="inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white transition shadow-sm disabled:opacity-50 cursor-pointer min-w-[140px]">
            {saving ? <div className="loader loader-sm loader-white" /> : <>
                <span>Save Circular Updates</span>
              </>}
          </button>
        </div>
      </form>
    </div>;
}
export default function AdmissionCircularUpdatePage() {
  return <Suspense fallback={<div className="w-full p-16 flex justify-center items-center">
          <div className="loader loader-md" />
        </div>}>
      <CircularUpdateContent />
    </Suspense>;
}