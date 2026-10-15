'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
export default function AdmissionCircularsPage() {
  const params = useParams();
  const domain = params?.domain || '';
  const apiBase = domain ? `/api/${domain}` : '/api';
  const [circulars, setCirculars] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [selectionMethodFilter, setSelectionMethodFilter] = useState('all');

  // Workstation Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCircular, setEditingCircular] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const formSectionRef = useRef(null);

  // Form State
  const [form, setForm] = useState({
    title: '',
    department_id: '',
    session_id: '',
    class_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    result_date: new Date(Date.now() + 35 * 86400000).toISOString().split('T')[0],
    min_age: '10',
    max_age: '16',
    capacity: '100',
    status: 'open',
    is_published: true,
    fee_amount: '500',
    currency: 'BDT',
    description: '',
    selection_method: 'manual',
    // 'exam' | 'merit' | 'manual'
    last_class: 'N/A',
    last_class_grade: '',
    last_institution: 'N/A',
    exam_date: new Date(Date.now() + 32 * 86400000).toISOString().split('T')[0],
    admit_publish_date: new Date(Date.now() + 25 * 86400000).toISOString().split('T')[0],
    exam_venue: '',
    exam_instructions: '',
    exam_subjects: [{
      title: 'Mathematics',
      mark: 100,
      time: '1 hour'
    }, {
      title: 'English',
      mark: 100,
      time: '1 hour'
    }]
  });
  const fetchCirculars = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${apiBase}/staff/panel/admissions`);
      if (!res.ok) {
        throw new Error(`Server error (${res.status})`);
      }
      const data = await res.json();
      if (data.success) {
        setCirculars(data.circulars || []);
        setDepartments(data.departments || []);
        setSessions(data.sessions || []);
        setClasses(data.classes || []);
      } else {
        toast.error(data.error || 'Failed to fetch admission circulars.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error loading circulars.');
    } finally {
      setLoading(false);
    }
  }, [apiBase]);
  useEffect(() => {
    fetchCirculars();
  }, [fetchCirculars]);

  // Filter classes based on selected department & session in form
  const availableClassesForForm = useMemo(() => {
    return classes.filter(cls => {
      if (form.department_id && String(cls.department_id) !== String(form.department_id)) {
        return false;
      }
      if (form.session_id && String(cls.session_id) !== String(form.session_id)) {
        return false;
      }
      return true;
    });
  }, [classes, form.department_id, form.session_id]);

  // Selected class object to inspect maximum seats
  const selectedClass = useMemo(() => {
    return classes.find(c => String(c.id) === String(form.class_id)) || null;
  }, [classes, form.class_id]);
  const isCapacityExceeded = useMemo(() => {
    if (!selectedClass || !selectedClass.max_seats) return false;
    const max = parseInt(selectedClass.max_seats, 10);
    const cap = parseInt(form.capacity, 10) || 0;
    return cap > max;
  }, [selectedClass, form.capacity]);
  const openNewForm = () => {
    setEditingCircular(null);
    const activeSession = sessions.find(s => s.is_current) || sessions[0];
    const firstDept = departments[0];
    const defaultCapacity = '50';
    setForm({
      title: '',
      department_id: firstDept ? String(firstDept.id) : '',
      session_id: activeSession ? String(activeSession.id) : '',
      class_id: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      result_date: new Date(Date.now() + 35 * 86400000).toISOString().split('T')[0],
      min_age: '10',
      max_age: '16',
      capacity: defaultCapacity,
      status: 'open',
      is_published: true,
      fee_amount: '500',
      currency: 'BDT',
      description: '',
      selection_method: 'manual',
      last_class: 'N/A',
      last_class_grade: '',
      last_institution: 'N/A',
      exam_date: new Date(Date.now() + 32 * 86400000).toISOString().split('T')[0],
      admit_publish_date: new Date(Date.now() + 25 * 86400000).toISOString().split('T')[0],
      exam_venue: '',
      exam_instructions: '',
      exam_subjects: [{
        title: 'Mathematics',
        mark: 100,
        time: '1 hour'
      }, {
        title: 'English',
        mark: 100,
        time: '1 hour'
      }]
    });
    setIsFormOpen(true);
    setDeleteConfirmId(null);
    setTimeout(() => {
      formSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 100);
  };
  const openEditForm = circ => {
    setEditingCircular(circ);
    setForm({
      title: circ.title || '',
      department_id: circ.department_id ? String(circ.department_id) : '',
      session_id: circ.session_id ? String(circ.session_id) : '',
      class_id: circ.class_id ? String(circ.class_id) : '',
      start_date: circ.start_date ? circ.start_date.split('T')[0] : '',
      end_date: circ.end_date ? circ.end_date.split('T')[0] : '',
      result_date: circ.result_date ? circ.result_date.split('T')[0] : '',
      min_age: circ.min_age !== null && circ.min_age !== undefined ? String(circ.min_age) : '',
      max_age: circ.max_age !== null && circ.max_age !== undefined ? String(circ.max_age) : '',
      capacity: circ.capacity !== null && circ.capacity !== undefined ? String(circ.capacity) : '100',
      status: circ.status || 'open',
      is_published: circ.is_published !== undefined ? Boolean(circ.is_published) : true,
      fee_amount: circ.fee_amount !== null && circ.fee_amount !== undefined ? String(circ.fee_amount) : '0',
      currency: circ.fee_currency || 'BDT',
      description: circ.description || '',
      selection_method: circ.selection_method || 'manual',
      last_class: circ.last_class || 'N/A',
      last_class_grade: circ.last_class_grade !== null && circ.last_class_grade !== undefined ? String(circ.last_class_grade) : '',
      last_institution: circ.last_institution || 'N/A',
      exam_date: circ.admission_exam_date ? circ.admission_exam_date.split('T')[0] : circ.exam_date ? circ.exam_date.split('T')[0] : '',
      admit_publish_date: circ.admission_admit_publish_date ? circ.admission_admit_publish_date.split('T')[0] : '',
      exam_venue: circ.exam_venue || '',
      exam_instructions: circ.exam_instructions || '',
      exam_subjects: Array.isArray(circ.exam_subjects) && circ.exam_subjects.length > 0 ? circ.exam_subjects.map(s => ({
        title: s.title,
        mark: s.mark,
        time: s.time
      })) : [{
        title: 'Mathematics',
        mark: 100,
        time: '1 hour'
      }, {
        title: 'English',
        mark: 100,
        time: '1 hour'
      }]
    });
    setIsFormOpen(true);
    setDeleteConfirmId(null);
    setTimeout(() => {
      formSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 100);
  };
  const closeForm = () => {
    setIsFormOpen(false);
    setEditingCircular(null);
  };

  // Exam Subjects helper handlers
  const addSubjectRow = () => {
    setForm(prev => ({
      ...prev,
      exam_subjects: [...prev.exam_subjects, {
        title: '',
        mark: 100,
        time: '1 hour'
      }]
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
      updated[index] = {
        ...updated[index],
        [field]: value
      };
      return {
        ...prev,
        exam_subjects: updated
      };
    });
  };
  const handleSave = async e => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Circular title is required.');
      return;
    }
    if (!form.department_id) {
      toast.error('Department selection is required.');
      return;
    }
    if (!form.session_id) {
      toast.error('Academic Session selection is required.');
      return;
    }
    if (!form.class_id) {
      toast.error('Target Class selection is required.');
      return;
    }
    if (isCapacityExceeded) {
      toast.error(`Capacity (${form.capacity}) exceeds class maximum seats (${selectedClass?.max_seats}).`);
      return;
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
        ...form,
        id: editingCircular?.id,
        department_id: form.department_id ? parseInt(form.department_id, 10) : null,
        session_id: form.session_id ? parseInt(form.session_id, 10) : null,
        class_id: form.class_id ? parseInt(form.class_id, 10) : null,
        min_age: form.min_age ? parseInt(form.min_age, 10) : null,
        max_age: form.max_age ? parseInt(form.max_age, 10) : null,
        capacity: form.capacity ? parseInt(form.capacity, 10) : 100,
        fee_amount: form.fee_amount ? parseFloat(form.fee_amount) : 0,
        last_class_grade: form.last_class_grade !== '' ? parseFloat(form.last_class_grade) : null,
        exam_subjects: form.selection_method === 'exam' ? form.exam_subjects.filter(s => s.title && s.title.trim()) : []
      };
      const method = editingCircular ? 'PUT' : 'POST';
      const res = await fetch(`${apiBase}/staff/panel/admissions`, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || (editingCircular ? 'Circular updated.' : 'Circular created.'));
        setIsFormOpen(false);
        setEditingCircular(null);
        fetchCirculars(true);
      } else {
        toast.error(data.error || 'Failed to save admission circular.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error during save operation.');
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = async id => {
    try {
      setDeletingId(id);
      const res = await fetch(`${apiBase}/staff/panel/admissions?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Admission circular deleted.');
        setDeleteConfirmId(null);
        fetchCirculars(true);
      } else {
        toast.error(data.error || 'Failed to delete admission circular.');
      }
    } catch {
      toast.error('Network error deleting circular.');
    } finally {
      setDeletingId(null);
    }
  };
  const filteredCirculars = useMemo(() => {
    return circulars.filter(circ => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = circ.title.toLowerCase().includes(q) || circ.class_name && circ.class_name.toLowerCase().includes(q) || circ.department_name && circ.department_name.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || circ.status === statusFilter;
      const matchesDept = departmentFilter === 'all' || String(circ.department_id) === String(departmentFilter);
      const matchesMethod = selectionMethodFilter === 'all' || circ.selection_method === selectionMethodFilter;
      return matchesSearch && matchesStatus && matchesDept && matchesMethod;
    });
  }, [circulars, searchTerm, statusFilter, departmentFilter, selectionMethodFilter]);
  return <div className="w-full space-y-4">
      {/* Header and KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Total Circulars</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">{circulars.length}</span>
            <span className="text-[10px] font-medium text-slate-500">Admissions</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Open Circulars</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {circulars.filter(c => c.status === 'open').length}
            </span>
            <span className="text-[10px] font-medium text-emerald-600">Active Intake</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Total Applicants</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-blue-600 dark:text-blue-400 font-mono">
              {circulars.reduce((acc, c) => acc + (parseInt(c.total_applicants, 10) || 0), 0)}
            </span>
            <span className="text-[10px] font-medium text-blue-500">Submissions</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Exam Based</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-purple-600 dark:text-purple-400 font-mono">
              {circulars.filter(c => c.selection_method === 'exam').length}
            </span>
            <span className="text-[10px] font-medium text-purple-500">Scheduled Exams</span>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Alert */}
      {deleteConfirmId && <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 text-slate-900 dark:text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-start gap-2.5">
            <div>
              <p className="text-xs font-bold text-rose-900 dark:text-rose-200">
                Confirm Deleting Admission Circular: {circulars.find(c => c.id === deleteConfirmId)?.title || `#${deleteConfirmId}`}?
              </p>
              <p className="text-[11px] text-rose-700 dark:text-rose-300/80 mt-0.5">
                This will delete the circular configuration, fee structure, and associated exam schedules.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button onClick={() => setDeleteConfirmId(null)} className="px-3 py-1.5 rounded text-xs border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 cursor-pointer">
              Cancel
            </button>
            <button onClick={() => handleDelete(deleteConfirmId)} disabled={deletingId === deleteConfirmId} className="px-3.5 py-1.5 rounded text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer disabled:opacity-50 flex items-center gap-1.5">
              {deletingId === deleteConfirmId ? <>
                  <div className="loader loader-xs loader-white" />
                  <span>Deleting...</span>
                </> : <>
                  <span>Confirm Delete</span>
                </>}
            </button>
          </div>
        </div>}

      {/* Workstation Form */}
      {isFormOpen && <div ref={formSectionRef} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm space-y-4 animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {editingCircular ? `Edit Admission Circular: ${editingCircular.title}` : 'Create New Admission Circular'}
              </h3>
            </div>
            <button onClick={closeForm} className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer" title="Close form">
              Close
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            {/* Section A: Title, Dept, Session */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Circular Title <span className="text-rose-500">*</span>
                </label>
                <input type="text" placeholder="e.g. Admission 2026 - Science & General Intake" value={form.title} onChange={e => setForm({
              ...form,
              title: e.target.value
            })} required className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden font-medium" />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Department <span className="text-rose-500">*</span>
                </label>
                <select value={form.department_id} onChange={e => setForm({
              ...form,
              department_id: e.target.value
            })} required className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer">
                  <option value="">Select Department...</option>
                  {departments.map(d => <option key={d.id} value={d.id}>
                      {d.name} {d.code ? `(${d.code})` : ''}
                    </option>)}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Academic Session <span className="text-rose-500">*</span>
                </label>
                <select value={form.session_id} onChange={e => setForm({
              ...form,
              session_id: e.target.value
            })} required className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer">
                  <option value="">Select Session...</option>
                  {sessions.map(s => <option key={s.id} value={s.id}>
                      {s.name} {s.is_current ? '(Current)' : ''}
                    </option>)}
                </select>
              </div>
            </div>

            {/* Section B: Class selection & Seat Capacity Ceiling */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Class <span className="text-rose-500">*</span>
                </label>
                <select value={form.class_id} onChange={e => setForm({
              ...form,
              class_id: e.target.value
            })} required className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer">
                  <option value="">Select Target Class...</option>
                  {availableClassesForForm.map(c => <option key={c.id} value={c.id}>
                      {c.name} {c.max_seats ? `(Max: ${c.max_seats} seats)` : ''}
                    </option>)}
                </select>
                {selectedClass && <p className="text-[10px] text-slate-500 mt-1 font-mono">
                    Class seat ceiling: <strong className="text-blue-600">{selectedClass.max_seats || 'Not set'} seats</strong>
                  </p>}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Intake Capacity (Seats) <span className="text-rose-500">*</span>
                </label>
                <input type="number" value={form.capacity} onChange={e => setForm({
              ...form,
              capacity: e.target.value
            })} className={`w-full text-xs px-3 py-2 rounded border font-mono ${isCapacityExceeded ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200' : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white'}`} />
                {isCapacityExceeded && <p className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold mt-1">
                    Exceeds class maximum seats ({selectedClass?.max_seats})!
                  </p>}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Selection Method <span className="text-rose-500">*</span>
                </label>
                <select value={form.selection_method} onChange={e => setForm({
              ...form,
              selection_method: e.target.value
            })} className="w-full text-xs px-3 py-2 rounded border border-blue-300 dark:border-blue-700 bg-blue-50/30 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 font-semibold focus:outline-hidden cursor-pointer">
                  <option value="exam">Exam Based Admission</option>
                  <option value="merit">Merit Based (Last Class Grade / GPA)</option>
                  <option value="manual">Manual Selection (Direct Staff Review)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Application Fee (BDT)
                </label>
                <input type="number" step="0.01" value={form.fee_amount} onChange={e => setForm({
              ...form,
              fee_amount: e.target.value
            })} className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono" />
              </div>
            </div>

            {/* Section C: Dates & Windows */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Start Date <span className="text-rose-500">*</span>
                </label>
                <input type="date" value={form.start_date} onChange={e => setForm({
              ...form,
              start_date: e.target.value
            })} required className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono" />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Application Deadline <span className="text-rose-500">*</span>
                </label>
                <input type="date" value={form.end_date} onChange={e => setForm({
              ...form,
              end_date: e.target.value
            })} required className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono" />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Result Date (Auto / Manual Publish)
                </label>
                <input type="date" value={form.result_date} onChange={e => setForm({
              ...form,
              result_date: e.target.value
            })} className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono" />
              </div>
            </div>

            {/* Section D: Background Prerequisites (Can be N/A) */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-md space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Applicant Past Academic Requirements (Candidates can specify N/A if not applicable)
                </span>
                <span className="text-[10px] text-slate-400">Prerequisite references</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Previous Class (or N/A)
                  </label>
                  <input type="text" placeholder="e.g. Class 5, SSC, or N/A" value={form.last_class} onChange={e => setForm({
                ...form,
                last_class: e.target.value
              })} className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Min Grade / GPA (or leave blank)
                  </label>
                  <input type="number" step="0.01" placeholder="e.g. 3.50 (optional)" value={form.last_class_grade} onChange={e => setForm({
                ...form,
                last_class_grade: e.target.value
              })} className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Previous Institution (or N/A)
                  </label>
                  <input type="text" placeholder="e.g. Recognized School or N/A" value={form.last_institution} onChange={e => setForm({
                ...form,
                last_institution: e.target.value
              })} className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
                </div>
              </div>
            </div>

            {/* Section E: Exam Configuration (Conditional if selection_method === 'exam') */}
            {form.selection_method === 'exam' && <div className="p-4 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/50 rounded-lg space-y-3 animate-fade-in">
                <div className="flex items-center justify-between border-b border-purple-100 dark:border-purple-900/40 pb-2">
                  <div className="flex items-center gap-2">
                    
                    <span className="text-xs font-bold text-purple-900 dark:text-purple-200">
                      Admission Exam Schedule & Subject Marks Breakdown
                    </span>
                  </div>
                  <span className="text-[10px] text-purple-600 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/60 px-2 py-0.5 rounded font-mono">
                    Exam-based Intake
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-purple-900 dark:text-purple-300 mb-1">
                      Exam Date & Time <span className="text-rose-500">*</span>
                    </label>
                    <input type="date" value={form.exam_date} onChange={e => setForm({
                ...form,
                exam_date: e.target.value
              })} required={form.selection_method === 'exam'} className="w-full text-xs px-2.5 py-1.5 rounded border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono" />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-purple-900 dark:text-purple-300 mb-1">
                      Admit Card Publish Date
                    </label>
                    <input type="date" value={form.admit_publish_date} onChange={e => setForm({
                ...form,
                admit_publish_date: e.target.value
              })} className="w-full text-xs px-2.5 py-1.5 rounded border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono" />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-purple-900 dark:text-purple-300 mb-1">
                      Exam Venue
                    </label>
                    <input type="text" placeholder="e.g. Main Campus Auditorium / Building 2" value={form.exam_venue} onChange={e => setForm({
                ...form,
                exam_venue: e.target.value
              })} className="w-full text-xs px-2.5 py-1.5 rounded border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-purple-900 dark:text-purple-300">
                      Exam Subjects (Title, Mark, Time)
                    </span>
                    <button type="button" onClick={addSubjectRow} className="text-[11px] font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400 flex items-center gap-1 cursor-pointer">
                      Add Subject
                    </button>
                  </div>

                  <div className="space-y-2">
                    {form.exam_subjects.map((sub, idx) => <div key={idx} className="flex items-center gap-2">
                        <input type="text" placeholder="Subject Title (e.g. Mathematics)" value={sub.title} onChange={e => updateSubjectRow(idx, 'title', e.target.value)} className="flex-2 text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium" />
                        <input type="number" placeholder="Mark" value={sub.mark} onChange={e => updateSubjectRow(idx, 'mark', e.target.value)} className="w-24 text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono" />
                        <input type="text" placeholder="Duration (e.g. 1 hour)" value={sub.time} onChange={e => updateSubjectRow(idx, 'time', e.target.value)} className="w-28 text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
                        {form.exam_subjects.length > 1 && <button type="button" onClick={() => removeSubjectRow(idx)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer" title="Remove subject">
                            Delete
                          </button>}
                      </div>)}
                  </div>
                </div>
              </div>}

            {/* Section F: Age, Status, Description */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Candidate Age Range
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <input type="number" placeholder="Min Age" value={form.min_age} onChange={e => setForm({
                ...form,
                min_age: e.target.value
              })} className="w-full text-xs px-2.5 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono" />
                  <input type="number" placeholder="Max Age" value={form.max_age} onChange={e => setForm({
                ...form,
                max_age: e.target.value
              })} className="w-full text-xs px-2.5 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Circular Status
                </label>
                <select value={form.status} onChange={e => setForm({
              ...form,
              status: e.target.value
            })} className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer">
                  <option value="open">Open (Accepting Applications)</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="closed">Closed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Publish to Public Portal
                </label>
                <div className="flex items-center gap-2 mt-2">
                  <input type="checkbox" id="is_published_checkbox" checked={form.is_published} onChange={e => setForm({
                ...form,
                is_published: e.target.checked
              })} className="w-4 h-4 rounded text-blue-600" />
                  <label htmlFor="is_published_checkbox" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    Display in website admission circulars list
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Circular Description / Guidelines
              </label>
              <textarea rows={2} placeholder="Enter intake guidelines, prerequisites, and instructions..." value={form.description} onChange={e => setForm({
            ...form,
            description: e.target.value
          })} className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden" />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button type="button" onClick={closeForm} className="px-3.5 py-1.5 rounded text-xs border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                Cancel
              </button>
              <button type="submit" disabled={saving || isCapacityExceeded} className="px-4 py-1.5 rounded text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition cursor-pointer disabled:opacity-50 min-w-[120px] flex items-center justify-center gap-1.5">
                {saving ? <>
                    <div className="loader loader-xs loader-white" />
                    <span>Saving...</span>
                  </> : editingCircular ? <>
                    
                    <span>Update Circular</span>
                  </> : <>
                    
                    <span>Create Circular</span>
                  </>}
              </button>
            </div>
          </form>
        </div>}

      {/* Control Bar: Search, Filters, Refresh, Create Action */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-64">
            
            <input type="text" placeholder="Search circulars..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden" />
          </div>

          {/* Department Filter */}
          <select value={departmentFilter} onChange={e => setDepartmentFilter(e.target.value)} className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer">
            <option value="all">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>
                {d.name}
              </option>)}
          </select>

          {/* Selection Method Filter */}
          <select value={selectionMethodFilter} onChange={e => setSelectionMethodFilter(e.target.value)} className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer">
            <option value="all">All Selection Methods</option>
            <option value="exam">Exam Based</option>
            <option value="merit">Merit Based</option>
            <option value="manual">Manual Selection</option>
          </select>

          {/* Status Filter */}
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer">
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="upcoming">Upcoming</option>
            <option value="closed">Closed</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button onClick={() => fetchCirculars(false)} title="Refresh list" className="p-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer">
            Refresh
          </button>

          {!isFormOpen && <button onClick={openNewForm} className="px-3 py-1.5 rounded text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition flex items-center gap-1.5 shadow-2xs cursor-pointer">
              
              <span>Create Circular</span>
            </button>}
        </div>
      </div>

      {/* Admission Circulars Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50/75 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Title & Method</th>
                <th className="py-2.5 px-3">Department</th>
                <th className="py-2.5 px-3">Session & Class</th>
                <th className="py-2.5 px-3">Capacity / Max</th>
                <th className="py-2.5 px-3">Application Window</th>
                <th className="py-2.5 px-3">Exam / Result Date</th>
                <th className="py-2.5 px-3">Fee</th>
                <th className="py-2.5 px-3">Applicants</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading ? <tr>
                  <td colSpan="10" className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="loader loader-sm" />
                      <span className="text-xs">Loading admission circulars...</span>
                    </div>
                  </td>
                </tr> : filteredCirculars.length === 0 ? <tr>
                  <td colSpan="10" className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-1">
                      
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">No admission circulars found</span>
                      <span className="text-[11px] text-slate-400">Create an admission circular for a department and class</span>
                    </div>
                  </td>
                </tr> : filteredCirculars.map(circ => <tr key={circ.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900 dark:text-white text-xs">{circ.title}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase ${circ.selection_method === 'exam' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800' : circ.selection_method === 'merit' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}>
                            {circ.selection_method === 'exam' ? 'Exam Based' : circ.selection_method === 'merit' ? 'Merit Based' : 'Manual Select'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">#{circ.id}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200 font-medium">
                      {circ.department_name ? <span className="inline-flex items-center gap-1">
                          
                          {circ.department_name}
                        </span> : <span className="text-slate-400 italic">None</span>}
                    </td>

                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300">
                          {circ.session_name || 'N/A'}
                        </span>
                        <span className="text-slate-400">&bull;</span>
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                          {circ.class_name || 'N/A'}
                        </span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 font-mono text-[11px]">
                      <span className="font-bold text-slate-900 dark:text-white">{circ.capacity || 100}</span>
                      <span className="text-slate-400 ml-1 text-[10px]">
                        / max {circ.class_max_seats || 'unlimited'}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                      {circ.start_date ? new Date(circ.start_date).toLocaleDateString() : 'N/A'}
                      {' '}&rarr;{' '}
                      {circ.end_date ? new Date(circ.end_date).toLocaleDateString() : 'N/A'}
                    </td>

                    <td className="py-2.5 px-3 font-mono text-[11px]">
                      {circ.selection_method === 'exam' && circ.admission_exam_date ? <div className="flex flex-col">
                          <span className="text-purple-600 dark:text-purple-400 font-semibold">
                            Exam: {new Date(circ.admission_exam_date).toLocaleDateString()}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Res: {circ.result_date ? new Date(circ.result_date).toLocaleDateString() : 'TBD'}
                          </span>
                        </div> : <span className="text-purple-600 dark:text-purple-400 font-medium">
                          {circ.result_date ? new Date(circ.result_date).toLocaleDateString() : 'Pending'}
                        </span>}
                    </td>

                    <td className="py-2.5 px-3 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      ৳{parseFloat(circ.fee_amount || 0).toFixed(2)}
                    </td>

                    <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                      <span className="font-bold text-slate-900 dark:text-white">{circ.total_applicants || 0}</span>
                      <span className="text-slate-400 text-[10px] ml-1">applicants</span>
                    </td>

                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${circ.status === 'open' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50' : circ.status === 'upcoming' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'}`}>
                        {circ.status || 'open'}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => openEditForm(circ)} title="Edit Circular" className="px-2 py-1 rounded text-xs text-slate-600 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition cursor-pointer font-medium">
                          Edit
                        </button>
                        <button onClick={() => setDeleteConfirmId(circ.id)} title="Delete Circular" className="px-2 py-1 rounded text-xs text-slate-600 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition cursor-pointer font-medium">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>;
}