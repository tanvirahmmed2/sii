'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

export default function ResidenceDisallocationsPage() {
  const { website, getApiEndpoint } = useTenantWebsite();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'history'
  const [records, setRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [halls, setHalls] = useState([]);
  const [selectedHall, setSelectedHall] = useState('');

  // Vacate Modal
  const [selectedAlloc, setSelectedAlloc] = useState(null);
  const [vacateDate, setVacateDate] = useState(new Date().toISOString().split('T')[0]);
  const [vacateReason, setVacateReason] = useState('Course completed / departed hall');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchHalls = async () => {
    try {
      const url = getApiEndpoint('/staff/panel/residence/halls');
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.success) {
        setHalls(data.payload.halls || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('status', activeTab === 'active' ? 'active' : 'vacated');
      if (selectedHall) params.set('hall_id', selectedHall);
      if (searchTerm.trim()) params.set('search', searchTerm.trim());

      const url = getApiEndpoint(`/staff/panel/residence/allocations?${params.toString()}`);
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch records.');
      }

      setRecords(data.payload.allocations || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHalls();
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [activeTab, selectedHall]);

  const handleVacateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAlloc) return;

    try {
      setIsSubmitting(true);
      const url = getApiEndpoint('/staff/panel/residence/allocations');
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedAlloc.id,
          action: 'vacate',
          vacated_date: vacateDate,
          vacate_reason: vacateReason,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to vacate resident.');
      }

      toast.success(data.message || 'Resident vacated successfully.');
      setSelectedAlloc(null);
      fetchRecords();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 inline-block mb-1">
            Path: /residence-disallocations
          </span>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Hall Clearance & Disallocation Desk
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Process student checkout, vacate assigned hall beds, release room seats, and audit historical disallocations.
          </p>
        </div>

        <button
          onClick={fetchRecords}
          disabled={loading}
          className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium cursor-pointer transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <span>🔄</span> Refresh
        </button>
      </div>

      {/* Tabs & Search */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-3 py-1.5 rounded-full font-medium transition cursor-pointer text-xs ${
                activeTab === 'active'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              Active Residents (Ready for Clearance)
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-full font-medium transition cursor-pointer text-xs ${
                activeTab === 'history'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              Vacated / Disallocated Archive
            </button>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedHall}
              onChange={(e) => setSelectedHall(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer outline-none"
            >
              <option value="">All Halls</option>
              {halls.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>

            <div className="flex items-center gap-1.5 max-w-xs w-full">
              <input
                type="text"
                placeholder="Search student, reg, room..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchRecords()}
                className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
              />
              <button
                onClick={fetchRecords}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium cursor-pointer"
              >
                Filter
              </button>
            </div>
          </div>
        </div>

        {/* Records Table */}
        {loading ? (
          <div className="text-center py-12 text-xs text-slate-500">
            <div className="inline-block w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
            <p>Loading resident clearance records...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-400">
            {activeTab === 'active'
              ? 'No active residents pending clearance in selected filter.'
              : 'No historical disallocation records found.'}
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2.5">Student Info</th>
                  <th className="px-3 py-2.5">Registration & Roll</th>
                  <th className="px-3 py-2.5">Hall & Room</th>
                  <th className="px-3 py-2.5">Seat</th>
                  <th className="px-3 py-2.5">Allocated Since</th>
                  {activeTab === 'history' && <th className="px-3 py-2.5">Vacated On & Reason</th>}
                  <th className="px-3 py-2.5 text-right">Clearance Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="px-3 py-2.5">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {r.student_name || 'Resident Student'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {r.student_number || r.student_email || '—'}
                      </div>
                    </td>

                    <td className="px-3 py-2.5 font-mono text-[11px]">
                      <div className="font-bold text-slate-800 dark:text-slate-200">{r.registration_no}</div>
                      <div className="text-[10px] text-slate-400">Roll: {r.roll_no || '—'}</div>
                    </td>

                    <td className="px-3 py-2.5">
                      <div className="font-semibold text-slate-900 dark:text-white">{r.hall_name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Room {r.room_number} (Floor {r.floor_number})
                      </div>
                    </td>

                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                        {r.seat_number}
                      </span>
                    </td>

                    <td className="px-3 py-2.5 text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                      {r.allocated_date ? new Date(r.allocated_date).toLocaleDateString() : '—'}
                    </td>

                    {activeTab === 'history' && (
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-rose-600 font-mono text-[11px]">
                          {r.vacated_date ? new Date(r.vacated_date).toLocaleDateString() : '—'}
                        </div>
                        <div className="text-[10px] text-slate-400 italic">
                          {r.vacate_reason || 'No remarks recorded'}
                        </div>
                      </td>
                    )}

                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      {r.status === 'active' ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAlloc(r);
                            setVacateDate(new Date().toISOString().split('T')[0]);
                            setVacateReason('Graduated / semester completed');
                          }}
                          className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold cursor-pointer transition shadow-2xs"
                        >
                          Clear & Vacate Seat ✕
                        </button>
                      ) : (
                        <span className="text-[10px] font-medium text-emerald-600">✓ Clearance Complete</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* VACATE MODAL */}
      {selectedAlloc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden my-8 space-y-4 p-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-rose-600 tracking-wider">
                  Check-out & Disallocate Desk
                </span>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Vacate Student from Seat
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAlloc(null)}
                className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleVacateSubmit} className="space-y-3 text-xs">
              <div className="p-3 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div className="font-semibold text-slate-900 dark:text-white text-sm">
                  {selectedAlloc.student_name}
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Reg No: {selectedAlloc.registration_no} • Roll: {selectedAlloc.roll_no || '—'}
                </div>
                <div className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-1">
                  Assigned: {selectedAlloc.hall_name} • Room {selectedAlloc.room_number} • {selectedAlloc.seat_number}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Vacate / Departure Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={vacateDate}
                  onChange={(e) => setVacateDate(e.target.value)}
                  className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Clearance / Vacation Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={vacateReason}
                  onChange={(e) => setVacateReason(e.target.value)}
                  placeholder="e.g. Course completed, student transferred, academic session ended..."
                  className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedAlloc(null)}
                  className="px-3.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-60 transition"
                >
                  {isSubmitting ? 'Processing...' : 'Confirm Vacate & Release Seat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
