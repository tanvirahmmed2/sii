'use client';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import { FiUserCheck, FiUsers, FiBookOpen, FiCalendar } from 'react-icons/fi';

export default function ClassTeacherPage() {
  const params: any = useParams();
  const domain = params?.domain || '';
  const [assignments, setAssignments] = useState<any>([]);
  const [teachers, setTeachers] = useState<any>([]);
  const [classes, setClasses] = useState<any>([]);
  const [sections, setSections] = useState<any>([]);
  const [sessions, setSessions] = useState<any>([]);
  const [academicConfig, setAcademicConfig] = useState<any>(null);
  const [loading, setLoading] = useState<any>(true);
  const [searchTerm, setSearchTerm] = useState<any>('');
  const [classFilter, setClassFilter] = useState<any>('all');
  const [sessionFilter, setSessionFilter] = useState<any>('all');
  const [isFormOpen, setIsFormOpen] = useState<any>(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({
    teacher_id: '',
    class_id: '',
    section_id: '',
    session_id: '',
    role: 'Class Teacher',
    is_primary: true,
    remarks: '',
  });
  const [submitting, setSubmitting] = useState<any>(false);
  const [errorMsg, setErrorMsg] = useState<any>('');
  const [successMsg, setSuccessMsg] = useState<any>('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<any>(null);
  const formRef = useRef<any>(null);

  const fetchData = useCallback(async (silent: any = false) => {
    try {
      if (!silent) setLoading(true);
      const qs = new URLSearchParams();
      if (classFilter !== 'all') qs.set('class_id', classFilter);
      if (sessionFilter !== 'all') qs.set('session_id', sessionFilter);
      const res = await fetch(`/api/${domain}/staff/panel/class-teacher?${qs.toString()}`);
      const data = await res.json();
      if (data.success) {
        setAssignments(data.assignments || []);
        setTeachers(data.available_teachers || []);
        setClasses(data.available_classes || []);
        setSections(data.available_sections || []);
        setSessions(data.available_sessions || []);
        setAcademicConfig(data.academicConfig || null);
      } else {
        setErrorMsg(data.error || 'Failed to load class teacher assignments.');
      }
    } catch {
      setErrorMsg('Network error loading class teacher assignments.');
    } finally {
      setLoading(false);
    }
  }, [domain, classFilter, sessionFilter]);

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  const useClass = academicConfig ? Boolean(academicConfig.use_class) : true;
  const useSection = academicConfig ? Boolean(academicConfig.use_section) : true;
  const useSession = academicConfig ? Boolean(academicConfig.use_session) : true;
  const classLabel = academicConfig?.labels?.class || 'Class';
  const sectionLabel = academicConfig?.labels?.section || 'Section';
  const sessionLabel = academicConfig?.labels?.session || 'Academic Year';

  const filteredAssignments = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return assignments;
    return assignments.filter((a: any) =>
      String(a.teacher_name || '').toLowerCase().includes(q) ||
      String(a.teacher_email || '').toLowerCase().includes(q) ||
      String(a.class_name || '').toLowerCase().includes(q) ||
      String(a.section_name || '').toLowerCase().includes(q) ||
      String(a.session_name || '').toLowerCase().includes(q) ||
      String(a.role || '').toLowerCase().includes(q)
    );
  }, [assignments, searchTerm]);

  const openCreateForm = () => {
    setEditingItem(null);
    setFormData({
      teacher_id: teachers[0]?.id ? String(teachers[0].id) : '',
      class_id: useClass && classes[0]?.id ? String(classes[0].id) : '',
      section_id: '',
      session_id: useSession && sessions[0]?.id ? String(sessions[0].id) : '',
      role: 'Class Teacher',
      is_primary: true,
      remarks: '',
    });
    setErrorMsg('');
    setIsFormOpen(true);
    setDeleteConfirmId(null);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const openEditForm = (item: any) => {
    setEditingItem(item);
    setFormData({
      teacher_id: item.teacher_id ? String(item.teacher_id) : '',
      class_id: item.class_id ? String(item.class_id) : '',
      section_id: item.section_id ? String(item.section_id) : '',
      session_id: item.session_id ? String(item.session_id) : '',
      role: item.role || 'Class Teacher',
      is_primary: Boolean(item.is_primary),
      remarks: item.remarks || '',
    });
    setErrorMsg('');
    setIsFormOpen(true);
    setDeleteConfirmId(null);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!formData.teacher_id) {
      setErrorMsg('Please select a teacher.');
      return;
    }
    try {
      setSubmitting(true);
      setErrorMsg('');
      const method = editingItem ? 'PUT' : 'POST';
      const payload = editingItem ? { ...formData, id: editingItem.id } : formData;
      const res = await fetch(`/api/${domain}/staff/panel/class-teacher`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          class_id: payload.class_id || null,
          section_id: payload.section_id || null,
          session_id: payload.session_id || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message || 'Class teacher assignment saved.');
        setTimeout(() => setSuccessMsg(''), 4000);
        setIsFormOpen(false);
        setEditingItem(null);
        fetchData(true);
      } else {
        setErrorMsg(data.error || 'Failed to save class teacher assignment.');
      }
    } catch {
      setErrorMsg('Network error saving class teacher assignment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: any) => {
    try {
      setDeletingId(id);
      const res = await fetch(`/api/${domain}/staff/panel/class-teacher?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Assignment removed successfully.');
        setTimeout(() => setSuccessMsg(''), 4000);
        setDeleteConfirmId(null);
        fetchData(true);
      } else {
        setErrorMsg(data.error || 'Failed to remove assignment.');
      }
    } catch {
      setErrorMsg('Network error removing assignment.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-medium text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1.5">
            <FiUserCheck className="w-3.5 h-3.5 text-primary"/>
            <span>Assigned Coordinators</span>
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-semibold text-slate-900 dark:text-white font-mono">{assignments.length}</span>
            <span className="text-[10px] font-medium text-slate-500">Total Records</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-medium text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1.5">
            <FiUsers className="w-3.5 h-3.5 text-emerald-500"/>
            <span>Active Teachers</span>
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-semibold text-emerald-600 dark:text-emerald-400 font-mono">{teachers.length}</span>
            <span className="text-[10px] font-medium text-emerald-600">Available Faculty</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-medium text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1.5">
            <FiBookOpen className="w-3.5 h-3.5 text-blue-500"/>
            <span>Primary Class Teachers</span>
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-semibold text-blue-600 dark:text-blue-400 font-mono">
              {assignments.filter((a: any) => a.is_primary).length}
            </span>
            <span className="text-[10px] font-medium text-blue-600">Lead Coordinators</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-medium text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1.5">
            <FiCalendar className="w-3.5 h-3.5 text-amber-500"/>
            <span>Education Model</span>
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 font-mono">
              {academicConfig?.hierarchy_type || 'CLASS_SEC'}
            </span>
            <span className="text-[10px] font-medium text-slate-400">{classes.length} {classLabel}es</span>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 rounded text-xs bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
          <span>{successMsg}</span>
          <button type="button" onClick={() => setSuccessMsg('')} className="text-[10px] font-mono cursor-pointer hover:underline">DISMISS</button>
        </div>
      )}
      {errorMsg && (
        <div className="p-3 rounded text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg('')} className="text-[10px] font-mono cursor-pointer hover:underline">DISMISS</button>
        </div>
      )}

      {deleteConfirmId && (
        <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-rose-900 dark:text-rose-200">
              Remove this class teacher assignment?
            </p>
            <p className="text-[11px] text-rose-700 dark:text-rose-300/80 mt-0.5">
              This will unassign the faculty member from coordinator duties for this group.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={() => setDeleteConfirmId(null)} className="px-3 py-1.5 rounded text-xs border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer">
              Cancel
            </button>
            <button type="button" onClick={() => handleDelete(deleteConfirmId)} disabled={deletingId === deleteConfirmId} className="px-3.5 py-1.5 rounded text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer disabled:opacity-50">
              {deletingId === deleteConfirmId ? 'Removing...' : 'Confirm Remove'}
            </button>
          </div>
        </div>
      )}

      {isFormOpen && (
        <div ref={formRef} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              {editingItem ? 'Update Class Teacher Assignment' : 'Assign Class Teacher'}
            </h3>
            <button type="button" onClick={() => setIsFormOpen(false)} className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer">
              Close
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Faculty / Teacher <span className="text-rose-500">*</span>
                </label>
                <select aria-label="Faculty Teacher" value={formData.teacher_id} onChange={(e: any) => setFormData({ ...formData, teacher_id: e.target.value })} required className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer">
                  <option value="">Select Teacher...</option>
                  {teachers.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.designation_title ? `(${t.designation_title})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {useClass && (
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {classLabel}
                  </label>
                  <select aria-label={classLabel} value={formData.class_id} onChange={(e: any) => setFormData({ ...formData, class_id: e.target.value })} className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer">
                    <option value="">All / General</option>
                    {classes.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.code ? `(${c.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {useSection && (
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {sectionLabel}
                  </label>
                  <select aria-label={sectionLabel} value={formData.section_id} onChange={(e: any) => setFormData({ ...formData, section_id: e.target.value })} className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer">
                    <option value="">All / General</option>
                    {sections.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {useSession && (
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {sessionLabel}
                  </label>
                  <select aria-label={sessionLabel} value={formData.session_id} onChange={(e: any) => setFormData({ ...formData, session_id: e.target.value })} className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer">
                    <option value="">All / General</option>
                    {sessions.map((ses: any) => (
                      <option key={ses.id} value={ses.id}>
                        {ses.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Role Title
                </label>
                <select aria-label="Role Title" value={formData.role} onChange={(e: any) => setFormData({ ...formData, role: e.target.value })} className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer">
                  <option value="Class Teacher">Class Teacher</option>
                  <option value="Assistant Class Teacher">Assistant Class Teacher</option>
                  <option value="Academic Mentor">Academic Mentor</option>
                  <option value="Batch Coordinator">Batch Coordinator</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Remarks
                </label>
                <input type="text" aria-label="Remarks" value={formData.remarks} onChange={(e: any) => setFormData({ ...formData, remarks: e.target.value })} className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"/>
              </div>

              <div className="pt-4">
                <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={formData.is_primary} onChange={(e: any) => setFormData({ ...formData, is_primary: e.target.checked })} className="rounded text-primary cursor-pointer"/>
                  <span>Primary Lead Coordinator</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button type="button" onClick={() => setIsFormOpen(false)} className="px-3.5 py-1.5 rounded text-xs border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="px-4 py-1.5 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 cursor-pointer disabled:opacity-50">
                {submitting ? 'Saving...' : editingItem ? 'Update Assignment' : 'Save Assignment'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 flex-1 max-w-2xl flex-wrap">
            <input type="text" aria-label="Search teacher or class assignment" value={searchTerm} onChange={(e: any) => setSearchTerm(e.target.value)} className="flex-1 min-w-[180px] text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"/>
            {useClass && classes.length > 0 && (
              <select aria-label="Filter by class" value={classFilter} onChange={(e: any) => setClassFilter(e.target.value)} className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer">
                <option value="all">All {classLabel}es</option>
                {classes.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
            {useSession && sessions.length > 0 && (
              <select aria-label="Filter by session" value={sessionFilter} onChange={(e: any) => setSessionFilter(e.target.value)} className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer">
                <option value="all">All {sessionLabel}s</option>
                {sessions.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={() => fetchData(false)} className="px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs cursor-pointer">
              Refresh
            </button>
            <button type="button" onClick={openCreateForm} className="px-3 py-1.5 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 cursor-pointer">
              + Assign Class Teacher
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-12 flex justify-center items-center">
              <div className="loader loader-sm"/>
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">No class teacher assignments recorded yet.</p>
              <button type="button" onClick={openCreateForm} className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                Assign your first class teacher
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Teacher</th>
                  {useClass && <th className="py-2.5 px-3">{classLabel}</th>}
                  {useSection && <th className="py-2.5 px-3">{sectionLabel}</th>}
                  {useSession && <th className="py-2.5 px-3">{sessionLabel}</th>}
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
                {filteredAssignments.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-900 dark:text-white">{item.teacher_name}</div>
                      <div className="text-[10px] text-slate-400">{item.designation_title || item.teacher_email}</div>
                    </td>
                    {useClass && (
                      <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200">
                        {item.class_name || 'All'}
                      </td>
                    )}
                    {useSection && (
                      <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                        {item.section_name || 'All'}
                      </td>
                    )}
                    {useSession && (
                      <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">
                        {item.session_name || 'All'}
                      </td>
                    )}
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${item.is_primary
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                        : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'}`}>
                        {item.role || 'Class Teacher'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button type="button" onClick={() => openEditForm(item)} className="px-2 py-1 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                          Edit
                        </button>
                        <button type="button" onClick={() => setDeleteConfirmId(item.id)} className="px-2 py-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer">
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
