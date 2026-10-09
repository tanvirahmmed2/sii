'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { BiTimeFive, BiPlus, BiEdit, BiTrash, BiSearch, BiRefresh, BiCoffee, BiCalendar } from 'react-icons/bi';

export default function ClassPeriodsPage() {
  const params = useParams();
  const domain = params?.domain || '';

  const [days, setDays] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDayId, setSelectedDayId] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState(null);
  const [formData, setFormData] = useState({
    day_id: '',
    name: '',
    start_time: '08:00',
    end_time: '08:45',
    is_break: false
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Delete State
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [dayRes, perRes] = await Promise.all([
        fetch(`/api/${domain}/staff/panel/days`),
        fetch(`/api/${domain}/staff/panel/periods${selectedDayId !== 'all' ? `?day_id=${selectedDayId}` : ''}`)
      ]);

      const dayData = await dayRes.json();
      const perData = await perRes.json();

      if (dayData.success) {
        setDays(dayData.days || []);
      }
      if (perData.success) {
        setPeriods(perData.periods || []);
      }
    } catch (err) {
      setErrorMsg('Network error fetching periods.');
    } finally {
      setLoading(false);
    }
  }, [domain, selectedDayId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredPeriods = useMemo(() => {
    return periods.filter((p) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        p.name.toLowerCase().includes(q) ||
        (p.day_name && p.day_name.toLowerCase().includes(q)) ||
        p.start_time.toLowerCase().includes(q) ||
        p.end_time.toLowerCase().includes(q);
      const matchesDay = selectedDayId === 'all' || String(p.day_id) === String(selectedDayId);
      return matchesSearch && matchesDay;
    });
  }, [periods, searchTerm, selectedDayId]);

  const openCreateModal = () => {
    setEditingPeriod(null);
    setFormData({
      day_id: selectedDayId !== 'all' ? selectedDayId : (days[0]?.id ? String(days[0].id) : ''),
      name: '',
      start_time: '08:00',
      end_time: '08:45',
      is_break: false
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (p) => {
    setEditingPeriod(p);
    setFormData({
      day_id: String(p.day_id),
      name: p.name,
      start_time: p.start_time,
      end_time: p.end_time,
      is_break: Boolean(p.is_break)
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.day_id || !formData.name.trim() || !formData.start_time || !formData.end_time) {
      setErrorMsg('Day, period name, start time, and end time are required.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');

      const url = `/api/${domain}/staff/panel/periods`;
      const method = editingPeriod ? 'PUT' : 'POST';
      const body = editingPeriod ? { ...formData, id: editingPeriod.id } : formData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (data.success) {
        setSuccessMsg(data.message || 'Period saved successfully.');
        setTimeout(() => setSuccessMsg(''), 4000);
        setIsModalOpen(false);
        fetchData();
      } else {
        setErrorMsg(data.error || 'Failed to save period.');
      }
    } catch (err) {
      setErrorMsg('Network error saving period.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      setDeleting(true);
      const res = await fetch(`/api/${domain}/staff/panel/periods?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Period deleted successfully.');
        setTimeout(() => setSuccessMsg(''), 4000);
        setDeleteId(null);
        fetchData();
      } else {
        setErrorMsg(data.error || 'Failed to delete period.');
      }
    } catch (err) {
      setErrorMsg('Network error deleting period.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Total Periods</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">{periods.length}</span>
            <span className="text-[10px] font-medium text-slate-500">Configured Slots</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Lecture Slots</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-blue-600 dark:text-blue-400 font-mono">
              {periods.filter(p => !p.is_break).length}
            </span>
            <span className="text-[10px] font-medium text-blue-600">Active Lessons</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Recess &amp; Breaks</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-amber-600 dark:text-amber-400 font-mono">
              {periods.filter(p => p.is_break).length}
            </span>
            <span className="text-[10px] font-medium text-amber-600">Tiffin &amp; Break</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Assigned Classes</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {periods.reduce((sum, p) => sum + (p.routine_count || 0), 0)} Routines
            </span>
            <span className="text-[10px] font-medium text-slate-400">Timetable Slots</span>
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

      {/* Workstation Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-4">
        {/* Day Pills Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-100 dark:border-slate-800">
          <button
            onClick={() => setSelectedDayId('all')}
            className={`px-3 py-1 rounded text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
              selectedDayId === 'all'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            All Days
          </button>
          {days.map((d) => {
            const isActive = String(d.id) === String(selectedDayId);
            return (
              <button
                key={d.id}
                onClick={() => setSelectedDayId(String(d.id))}
                className={`px-3 py-1 rounded text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {d.name} {d.status === 'off' ? '(Off)' : ''}
              </button>
            );
          })}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <BiSearch className="absolute left-2.5 top-2.5 text-slate-400 text-sm" />
              <input
                type="text"
                placeholder="Search period title or timing..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              className="p-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
              title="Refresh"
            >
              <BiRefresh className="text-base" />
            </button>
            <button
              onClick={openCreateModal}
              disabled={days.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition cursor-pointer disabled:opacity-40"
            >
              <BiPlus className="text-base" />
              <span>Add Period</span>
            </button>
          </div>
        </div>

        {/* Periods Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">Loading periods...</div>
          ) : filteredPeriods.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <BiTimeFive className="mx-auto text-3xl text-slate-400" />
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">No periods scheduled.</p>
              <button
                onClick={openCreateModal}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Create your first class period
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Period Name</th>
                  <th className="py-2.5 px-3">Weekday</th>
                  <th className="py-2.5 px-3">Time Schedule</th>
                  <th className="py-2.5 px-3">Slot Type</th>
                  <th className="py-2.5 px-3">Assigned Routines</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
                {filteredPeriods.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      {p.is_break ? (
                        <BiCoffee className="text-amber-500 text-base" />
                      ) : (
                        <BiTimeFive className="text-slate-400 text-base" />
                      )}
                      <span>{p.name}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                        {p.day_name}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                      {p.start_time} — {p.end_time}
                    </td>
                    <td className="py-3 px-3">
                      {p.is_break ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          <BiCoffee /> Recess / Break
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          Class Lecture
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400 text-[11px]">
                      {p.routine_count} allocations
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          title="Edit"
                        >
                          <BiEdit className="text-sm" />
                        </button>
                        <button
                          onClick={() => setDeleteId(p.id)}
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
                {editingPeriod ? 'Edit Class Period' : 'Add New Class Period'}
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
                  Weekday *
                </label>
                <select
                  value={formData.day_id}
                  onChange={(e) => setFormData({ ...formData, day_id: e.target.value })}
                  required
                  className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                >
                  <option value="">Select Day...</option>
                  {days.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} {d.status === 'off' ? '(Holiday/Off)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Period Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1st Period, Assembly, Recess"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    required
                    className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    End Time *
                  </label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    required
                    className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="is_break"
                  checked={formData.is_break}
                  onChange={(e) => setFormData({ ...formData, is_break: e.target.checked })}
                  className="rounded text-slate-900 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="is_break" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  Mark as recess / break period (no subject allocated)
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
                  {submitting ? 'Saving...' : editingPeriod ? 'Update Period' : 'Add Period'}
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
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Delete Period?</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Are you sure you want to remove this time period? Any routine timetable slots mapped to this period will also be removed.
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
