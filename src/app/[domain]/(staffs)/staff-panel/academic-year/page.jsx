'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { BiCalendar, BiPlus, BiCheckCircle, BiEdit, BiTrash, BiSearch, BiRefresh, BiTimeFive } from 'react-icons/bi';

export default function AcademicYearPage() {
  const params = useParams();
  const domain = params?.domain || '';

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  // Delete State
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/${domain}/staff/panel/sessions`);
      const data = await res.json();
      if (data.success) {
        setSessions(data.sessions || []);
      } else {
        setErrorMsg(data.error || 'Failed to fetch academic sessions');
      }
    } catch (err) {
      setErrorMsg('Network error fetching academic sessions.');
    } finally {
      setLoading(false);
    }
  }, [domain]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [sessions, searchTerm, statusFilter]);

  const currentSession = useMemo(() => sessions.find((s) => s.is_current), [sessions]);

  const openCreateModal = () => {
    setEditingSession(null);
    setFormData({
      name: '',
      start_date: '',
      end_date: '',
      is_current: sessions.length === 0,
      status: 'active'
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (session) => {
    setEditingSession(session);
    setFormData({
      name: session.name,
      start_date: session.start_date ? session.start_date.split('T')[0] : '',
      end_date: session.end_date ? session.end_date.split('T')[0] : '',
      is_current: Boolean(session.is_current),
      status: session.status || 'active'
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
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
      const body = editingSession ? { ...formData, id: editingSession.id } : formData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (data.success) {
        setSuccessMsg(data.message || 'Academic session saved successfully.');
        setTimeout(() => setSuccessMsg(''), 4000);
        setIsModalOpen(false);
        fetchSessions();
      } else {
        setErrorMsg(data.error || 'Failed to save academic session.');
      }
    } catch (err) {
      setErrorMsg('Network error saving academic session.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetCurrent = async (session) => {
    try {
      const res = await fetch(`/api/${domain}/staff/panel/sessions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: session.id, is_current: true })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Session ${session.name} is now set as the current academic year.`);
        setTimeout(() => setSuccessMsg(''), 4000);
        fetchSessions();
      } else {
        setErrorMsg(data.error || 'Failed to switch current session.');
      }
    } catch (err) {
      setErrorMsg('Network error switching session.');
    }
  };

  const handleDelete = async (id) => {
    try {
      setDeleting(true);
      const res = await fetch(`/api/${domain}/staff/panel/sessions?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Academic session deleted successfully.');
        setTimeout(() => setSuccessMsg(''), 4000);
        setDeleteId(null);
        fetchSessions();
      } else {
        setErrorMsg(data.error || 'Failed to delete academic session.');
      }
    } catch (err) {
      setErrorMsg('Network error deleting session.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Total Sessions</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">{sessions.length}</span>
            <span className="text-[10px] font-medium text-slate-500">Recorded</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Active Current Year</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {currentSession ? currentSession.name : 'None Selected'}
            </span>
            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <BiCheckCircle /> Current
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Status Breakdown</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              {sessions.filter(s => s.status === 'active').length} Active
            </span>
            <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
              {sessions.filter(s => s.status !== 'active').length} Archived
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">System Cycle</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {currentSession?.start_date ? new Date(currentSession.start_date).getFullYear() : 'Annual'}
            </span>
            <span className="text-[10px] font-medium text-slate-400">Calendar Term</span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 rounded text-xs bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
          <span>{successMsg}</span>
          <span className="text-[10px] font-mono">OK</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3 rounded text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="text-[10px] font-mono cursor-pointer">DISMISS</button>
        </div>
      )}

      {/* Main Workstation Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-4">
        {/* Action Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <BiSearch className="absolute left-2.5 top-2.5 text-slate-400 text-sm" />
              <input
                type="text"
                placeholder="Search session (e.g. 2025-2026)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400 transition"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="upcoming">Upcoming</option>
              <option value="archived">Archived</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchSessions}
              className="p-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
              title="Refresh"
            >
              <BiRefresh className="text-base" />
            </button>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition cursor-pointer"
            >
              <BiPlus className="text-base" />
              <span>Add Session</span>
            </button>
          </div>
        </div>

        {/* Sessions Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">Loading academic sessions...</div>
          ) : filteredSessions.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <BiCalendar className="mx-auto text-3xl text-slate-400" />
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">No academic sessions found.</p>
              <button
                onClick={openCreateModal}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Create your first academic session
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Session Name</th>
                  <th className="py-2.5 px-3">Date Period</th>
                  <th className="py-2.5 px-3">Current Flag</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
                {filteredSessions.map((session) => (
                  <tr key={session.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <BiCalendar className="text-slate-400 text-sm" />
                      <span>{session.name}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                      {session.start_date ? new Date(session.start_date).toLocaleDateString() : 'N/A'}
                      {' — '}
                      {session.end_date ? new Date(session.end_date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-3 px-3">
                      {session.is_current ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <BiCheckCircle /> Active Current
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetCurrent(session)}
                          className="text-[10px] text-slate-500 hover:text-slate-900 dark:hover:text-white underline cursor-pointer"
                        >
                          Make Current
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium capitalize ${
                        session.status === 'active'
                          ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                          : session.status === 'upcoming'
                          ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}>
                        {session.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(session)}
                          className="p-1 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          title="Edit"
                        >
                          <BiEdit className="text-sm" />
                        </button>
                        <button
                          onClick={() => setDeleteId(session.id)}
                          className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          title="Delete"
                        >
                          <BiTrash className="text-sm" />
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

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-md w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {editingSession ? 'Edit Academic Session' : 'Create Academic Session'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Session Name / Academic Year *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2025-2026 or 2026"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Session Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                >
                  <option value="active">Active</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="archived">Archived</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="is_current"
                  checked={formData.is_current}
                  onChange={(e) => setFormData({ ...formData, is_current: e.target.checked })}
                  className="rounded text-slate-900 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="is_current" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  Set as current primary academic year
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded text-xs border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3.5 py-1.5 rounded text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingSession ? 'Update Session' : 'Create Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-sm w-full p-4 shadow-xl space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Delete Academic Session?</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Are you sure you want to remove this academic session? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteId(null)}
                className="px-3 py-1.5 rounded text-xs border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                disabled={deleting}
                className="px-3 py-1.5 rounded text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
