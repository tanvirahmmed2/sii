'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
export default function AcademicYearPage() {
  const params = useParams();
  const domain = params?.domain || '';
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Inline Workstation Form State (NO popup modal)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    start_date: '',
    end_date: '',
    is_current: false,
    status: 'active'
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Inline Delete State (NO popup modal)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const formSectionRef = useRef(null);
  const fetchSessions = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch(`/api/${domain}/staff/panel/sessions`);
      const data = await res.json();
      if (data.success) {
        setSessions(data.sessions || []);
      } else {
        setErrorMsg(data.error || 'Failed to fetch academic sessions');
      }
    } catch {
      setErrorMsg('Network error fetching academic sessions.');
    } finally {
      setLoading(false);
    }
  }, [domain]);
  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/${domain}/staff/panel/sessions`);
        const data = await res.json();
        if (!ignore && data.success) {
          setSessions(data.sessions || []);
        }
      } catch {
        if (!ignore) setErrorMsg('Network error fetching academic sessions.');
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [domain]);
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = s.name.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [sessions, searchTerm, statusFilter]);
  const currentSession = useMemo(() => sessions.find(s => s.is_current), [sessions]);
  const openCreateForm = () => {
    setEditingSession(null);
    setFormData({
      name: '',
      start_date: '',
      end_date: '',
      is_current: sessions.length === 0,
      status: 'active'
    });
    setErrorMsg('');
    setIsFormOpen(true);
    setDeleteConfirmId(null);
    setTimeout(() => {
      formSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 100);
  };
  const openEditForm = session => {
    setEditingSession(session);
    setFormData({
      name: session.name,
      start_date: session.start_date ? session.start_date.split('T')[0] : '',
      end_date: session.end_date ? session.end_date.split('T')[0] : '',
      is_current: Boolean(session.is_current),
      status: session.status || 'active'
    });
    setErrorMsg('');
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
    setEditingSession(null);
    setErrorMsg('');
  };
  const handleFormSubmit = async e => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg('Academic session name is required (e.g. 2025-2026).');
      return;
    }
    try {
      setSubmitting(true);
      setErrorMsg('');
      const url = `/api/${domain}/staff/panel/sessions`;
      const method = editingSession ? 'PUT' : 'POST';
      const body = editingSession ? {
        ...formData,
        id: editingSession.id
      } : formData;
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message || 'Academic session saved successfully.');
        setTimeout(() => setSuccessMsg(''), 4000);
        setIsFormOpen(false);
        setEditingSession(null);
        fetchSessions(true);
      } else {
        setErrorMsg(data.error || 'Failed to save academic session.');
      }
    } catch {
      setErrorMsg('Network error saving academic session.');
    } finally {
      setSubmitting(false);
    }
  };
  const handleDelete = async id => {
    try {
      setDeletingId(id);
      const res = await fetch(`/api/${domain}/staff/panel/sessions?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Academic session deleted successfully.');
        setTimeout(() => setSuccessMsg(''), 4000);
        setDeleteConfirmId(null);
        fetchSessions(true);
      } else {
        setErrorMsg(data.error || 'Failed to delete academic session.');
      }
    } catch {
      setErrorMsg('Network error deleting academic session.');
    } finally {
      setDeletingId(null);
    }
  };
  return <div className="w-full space-y-4">
      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Total Sessions</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">{sessions.length}</span>
            <span className="text-[10px] font-medium text-slate-500">Academic Terms</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Active Status</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {sessions.filter(s => s.status === 'active').length}
            </span>
            <span className="text-[10px] font-medium text-emerald-600">In Operation</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Current Session</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400 truncate max-w-[150px]">
              {currentSession ? currentSession.name : 'None Selected'}
            </span>
            <span className="text-[10px] font-medium text-blue-500">Active Cycle</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Academic Architecture</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Independent Session
            </span>
            <span className="text-[10px] font-medium text-slate-400">Class Foundation</span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && <div className="p-3 rounded text-xs bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            
            {successMsg}
          </span>
          <button onClick={() => setSuccessMsg('')} className="text-[10px] font-mono cursor-pointer hover:underline">DISMISS</button>
        </div>}
      {errorMsg && <div className="p-3 rounded text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            
            {errorMsg}
          </span>
          <button onClick={() => setErrorMsg('')} className="text-[10px] font-mono cursor-pointer hover:underline">DISMISS</button>
        </div>}

      {/* Inline Delete Confirmation Alert (NO popup modal) */}
      {deleteConfirmId && <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 text-slate-900 dark:text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-start gap-2.5">
            
            <div>
              <p className="text-xs font-bold text-rose-900 dark:text-rose-200">
                Confirm Deleting Academic Session: {sessions.find(s => s.id === deleteConfirmId)?.name || `#${deleteConfirmId}`}?
              </p>
              <p className="text-[11px] text-rose-700 dark:text-rose-300/80 mt-0.5">
                This will unassign all classrooms, exams, and class mappings registered under this session.
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

      {/* Inline Workstation Form (NO popup modal) */}
      {isFormOpen && <div ref={formSectionRef} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm space-y-4 animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {editingSession ? `Edit Academic Session: ${editingSession.name}` : 'Create New Academic Session'}
              </h3>
            </div>
            <button onClick={closeForm} className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer" title="Close form">
              Close
            </button>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Session Name <span className="text-rose-500">*</span>
                </label>
                <input type="text" placeholder="e.g. 2025-2026, 2026 Academic Term" value={formData.name} onChange={e => setFormData({
              ...formData,
              name: e.target.value
            })} required className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 font-medium" />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Term Start Date
                </label>
                <input type="date" value={formData.start_date} onChange={e => setFormData({
              ...formData,
              start_date: e.target.value
            })} className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden font-mono" />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Term End Date
                </label>
                <input type="date" value={formData.end_date} onChange={e => setFormData({
              ...formData,
              end_date: e.target.value
            })} className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden font-mono" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Status
                </label>
                <select value={formData.status} onChange={e => setFormData({
              ...formData,
              status: e.target.value
            })} className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer">
                  <option value="active">Active (Currently Operational)</option>
                  <option value="upcoming">Upcoming (Future Enrollment)</option>
                  <option value="archived">Archived (Completed Term)</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                  <input type="checkbox" checked={formData.is_current} onChange={e => setFormData({
                ...formData,
                is_current: e.target.checked
              })} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer" />
                  <span>Mark as Current Primary Session for Institution</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button type="button" onClick={closeForm} className="px-3.5 py-1.5 rounded text-xs border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="px-4 py-1.5 rounded text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition cursor-pointer disabled:opacity-50 min-w-[110px] flex items-center justify-center gap-1.5">
                {submitting ? <>
                    <div className="loader loader-xs loader-white" />
                    <span>Saving...</span>
                  </> : editingSession ? <>
                    
                    <span>Update Session</span>
                  </> : <>
                    
                    <span>Create Session</span>
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
            
            <input type="text" placeholder="Search session..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden" />
          </div>

          {/* Status Filter */}
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="upcoming">Upcoming</option>
            <option value="archived">Archived</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button onClick={() => fetchSessions(false)} title="Refresh list" className="p-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer">
            Refresh
          </button>

          {!isFormOpen && <button onClick={openCreateForm} className="px-3 py-1.5 rounded text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition flex items-center gap-1.5 shadow-2xs cursor-pointer">
              
              <span>Create Session</span>
            </button>}
        </div>
      </div>

      {/* Sessions Data Table (Wide single row format) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50/75 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Session Name</th>
                <th className="py-2.5 px-3">Timeline (Start &rarr; End)</th>
                <th className="py-2.5 px-3">Primary / Current</th>
                <th className="py-2.5 px-3">Classes Bound</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading ? <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="loader loader-sm" />
                      <span className="text-xs">Loading academic sessions...</span>
                    </div>
                  </td>
                </tr> : filteredSessions.length === 0 ? <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-1">
                      
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">No academic sessions found</span>
                      <span className="text-[11px] text-slate-400">Create academic sessions independently for classes</span>
                    </div>
                  </td>
                </tr> : filteredSessions.map(session => <tr key={session.id} className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${session.is_current ? 'bg-blue-50/20 dark:bg-blue-950/10' : ''}`}>
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{session.name}</span>
                        {session.is_current && <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                            CURRENT
                          </span>}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                      {session.start_date ? new Date(session.start_date).toLocaleDateString() : 'N/A'}
                      {' '}&rarr;{' '}
                      {session.end_date ? new Date(session.end_date).toLocaleDateString() : 'N/A'}
                    </td>

                    <td className="py-2.5 px-3">
                      {session.is_current ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                           Primary Cycle
                        </span> : <span className="text-slate-400 text-[11px]">Standard</span>}
                    </td>

                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 font-mono">
                      {session.class_count || 0} classes
                    </td>

                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${session.status === 'active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50' : session.status === 'upcoming' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'}`}>
                        {session.status || 'active'}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => openEditForm(session)} title="Edit Session" className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition cursor-pointer">
                          Edit
                        </button>
                        <button onClick={() => setDeleteConfirmId(session.id)} title="Delete Session" className="p-1 rounded text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition cursor-pointer">
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