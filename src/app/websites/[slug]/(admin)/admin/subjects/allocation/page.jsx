'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FiPlus, FiTrash2, FiEdit2, FiX, FiBook, FiLayers } from 'react-icons/fi';

const AdminClassSubjectsPage = () => {
  const [assignments, setAssignments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');

  const [editingAssignment, setEditingAssignment] = useState(null);
  const [editClassId, setEditClassId] = useState('');
  const [editSubjectId, setEditSubjectId] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchAllData = async () => {
    try {
      const classRes = await fetch('/api/classes');
      const classData = await classRes.json();
      setClasses(classData.paylod?.classes || []);

      const subjectRes = await fetch('/api/subjects');
      const subjectData = await subjectRes.json();
      setSubjects(subjectData.paylod?.subjects || []);

      const assignmentsRes = await fetch('/api/class-subjects');
      const assignmentsData = await assignmentsRes.json();
      setAssignments(assignmentsData.paylod?.assignments || []);
    } catch (err) {
      toast.error('Failed to load class subject configuration lists.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAllData(); }, []);

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!classId || !subjectId) {
      toast.error('Class and Subject selections are required.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/class-subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_id: classId, subject_id: subjectId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to link subject with class.');
      toast.success(data.message || 'Subject successfully linked with class!');
      setClassId('');
      setSubjectId('');
      setShowAddForm(false);
      fetchAllData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (item) => {
    setEditingAssignment(item);
    setEditClassId(item.class_id ? item.class_id.toString() : '');
    setEditSubjectId(item.subject_id ? item.subject_id.toString() : '');
    setShowAddForm(false);
  };

  const handleUpdateAssignment = async (e) => {
    e.preventDefault();
    if (!editClassId || !editSubjectId) {
      toast.error('Class and Subject selections are required.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/class-subjects/${editingAssignment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_id: editClassId, subject_id: editSubjectId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update subject allocation.');
      toast.success(data.message || 'Subject allocation updated successfully!');
      setEditingAssignment(null);
      fetchAllData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAssignment = async (id, subjectName, className) => {
    const confirm = window.confirm(`Are you sure you want to remove "${subjectName}" from "${className}"?`);
    if (!confirm) return;
    try {
      const res = await fetch(`/api/class-subjects/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete allocation.');
      toast.success(data.message || 'Subject link deleted successfully!');
      fetchAllData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Group assignments by class
  const groupedByClass = classes.reduce((acc, cls) => {
    const classAssignments = assignments.filter(a => String(a.class_id) === String(cls.id));
    if (classAssignments.length > 0) {
      acc.push({ cls, items: classAssignments });
    }
    return acc;
  }, []);

  // Classes with no assignments yet
  const emptyClasses = classes.filter(cls =>
    !assignments.some(a => String(a.class_id) === String(cls.id))
  );

  return (
    <div className="w-full flex flex-col gap-5 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <FiBook className="text-primary" /> Subject Allocations
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Map subjects to academic classes. Each class has its own subject table.
          </p>
        </div>
        <button
          onClick={() => { setShowAddForm(!showAddForm); setEditingAssignment(null); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
        >
          {showAddForm ? <><FiX /> Close</> : <><FiPlus /> Allocate Subject</>}
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
          <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <FiPlus className="text-primary" /> Link Subject to Class
          </h2>
          <form onSubmit={handleCreateAssignment} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Class</label>
              <select required value={classId} onChange={(e) => setClassId(e.target.value)} disabled={submitting}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-primary cursor-pointer">
                <option value="">Select class...</option>
                {classes.map((cls) => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subject</label>
              <select required value={subjectId} onChange={(e) => setSubjectId(e.target.value)} disabled={submitting}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-primary cursor-pointer">
                <option value="">Select subject...</option>
                {subjects.map((sub) => <option key={sub.id} value={sub.id}>{sub.name} ({sub.code})</option>)}
              </select>
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl cursor-pointer">Cancel</button>
              <button type="submit" disabled={submitting}
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50">
                {submitting ? 'Linking...' : 'Link Subject'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Form */}
      {editingAssignment && (
        <div className="bg-white border border-primary/20 rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
          <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <FiEdit2 className="text-primary" /> Edit Allocation
          </h2>
          <form onSubmit={handleUpdateAssignment} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Class</label>
              <select required value={editClassId} onChange={(e) => setEditClassId(e.target.value)} disabled={submitting}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-primary cursor-pointer">
                <option value="">Select class...</option>
                {classes.map((cls) => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subject</label>
              <select required value={editSubjectId} onChange={(e) => setEditSubjectId(e.target.value)} disabled={submitting}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-primary cursor-pointer">
                <option value="">Select subject...</option>
                {subjects.map((sub) => <option key={sub.id} value={sub.id}>{sub.name} ({sub.code})</option>)}
              </select>
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onClick={() => setEditingAssignment(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl cursor-pointer">Cancel</button>
              <button type="submit" disabled={submitting}
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50">
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Per-class tables */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-semibold text-slate-400">Loading allocations...</span>
        </div>
      ) : groupedByClass.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center text-center bg-white border border-slate-100 rounded-2xl">
          <span className="text-4xl mb-2">📚</span>
          <h3 className="text-sm font-bold text-slate-600">No allocations yet</h3>
          <p className="text-xs text-slate-400 mt-1">Click "Allocate Subject" to start linking subjects to classes.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {groupedByClass.map(({ cls, items }) => (
            <div key={cls.id} className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
              {/* Class header */}
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2">
                <FiLayers className="text-primary text-sm" />
                <h3 className="text-sm font-extrabold text-slate-800">{cls.name}</h3>
                <span className="ml-auto text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  {items.length} subject{items.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Subject rows */}
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-50">
                    <th className="px-5 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">#</th>
                    <th className="px-5 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subject</th>
                    <th className="px-5 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {items.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-2.5 text-xs font-semibold text-slate-400">{idx + 1}</td>
                      <td className="px-5 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200/60 flex items-center justify-center shrink-0">
                            <FiBook className="text-primary text-xs" />
                          </div>
                          <span className="text-xs font-bold text-slate-800">{item.subject_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-2.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleStartEdit(item)}
                            className="p-1.5 bg-emerald-50 hover:bg-primary/10 text-primary rounded-lg transition-colors cursor-pointer"
                            title="Edit Allocation"
                          >
                            <FiEdit2 className="text-xs" />
                          </button>
                          <button
                            onClick={() => handleDeleteAssignment(item.id, item.subject_name, item.class_name)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-lg transition-colors cursor-pointer"
                            title="Remove Allocation"
                          >
                            <FiTrash2 className="text-xs" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          {/* Classes with no subjects (informational) */}
          {emptyClasses.length > 0 && (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl px-5 py-4 flex flex-wrap gap-2 items-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">No subjects yet:</span>
              {emptyClasses.map(cls => (
                <span key={cls.id} className="text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                  {cls.name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminClassSubjectsPage;
