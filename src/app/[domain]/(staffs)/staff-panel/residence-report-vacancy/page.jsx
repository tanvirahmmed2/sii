'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

export default function ResidenceReportVacancyPage() {
  const { website, getApiEndpoint } = useTenantWebsite();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    kpi: {},
    hallBreakdown: [],
    rooms: [],
  });

  const [selectedHall, setSelectedHall] = useState('');
  const [searchRoom, setSearchRoom] = useState('');

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedHall) params.set('hall_id', selectedHall);

      const url = getApiEndpoint(`/staff/panel/residence/reports?${params.toString()}`);
      const res = await fetch(url);
      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to load vacancy report.');
      }

      setData(result.payload || {});
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedHall]);

  const kpi = data.kpi || {};
  const halls = data.hallBreakdown || [];
  const rooms = data.rooms || [];

  const filteredRooms = rooms.filter((r) => {
    if (!searchRoom.trim()) return true;
    const term = searchRoom.toLowerCase();
    return (
      r.room_number?.toLowerCase().includes(term) ||
      r.hall_name?.toLowerCase().includes(term) ||
      r.room_type?.toLowerCase().includes(term)
    );
  });

  const totalSeats = kpi.total_capacity || 0;
  const occupiedSeats = kpi.occupied_seats || 0;
  const vacantSeats = kpi.vacant_seats || 0;
  const occupancyPercent = totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0;

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 inline-block mb-1">
            Path: /residence-report-vacancy
          </span>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Hall Vacancy & Occupancy Report
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time analytics on hall occupancy percentages, vacant bed counts, floor distributions, and room capacity.
          </p>
        </div>

        <button
          onClick={fetchReport}
          disabled={loading}
          className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium cursor-pointer transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <span>🔄</span> Refresh Report
        </button>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Total Campus Beds</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">{totalSeats}</span>
            <span className="text-[10px] font-medium text-slate-500">{kpi.total_rooms || 0} Rooms</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400 tracking-wider">Available Vacant Beds</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-emerald-600 font-mono">{vacantSeats}</span>
            <span className="text-[10px] font-medium text-emerald-600 font-bold">
              {totalSeats > 0 ? Math.round((vacantSeats / totalSeats) * 100) : 0}% Vacant
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-indigo-600 dark:text-indigo-400 tracking-wider">Occupied Beds</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-indigo-600 font-mono">{occupiedSeats}</span>
            <span className="text-[10px] font-medium text-indigo-600">{occupancyPercent}% Occupancy</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Estimated Monthly Rent</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">
              ৳{parseFloat(kpi.monthly_revenue || 0).toLocaleString()}
            </span>
            <span className="text-[10px] font-medium text-slate-500">Active</span>
          </div>
        </div>
      </div>

      {/* Hall Breakdown Cards */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
          Facility Breakdown by Hall
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {halls.map((h) => {
            const occ = parseFloat(h.occupancy_rate || 0);
            return (
              <div
                key={h.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-2xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">{h.name}</h3>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {h.code ? `${h.code} • ` : ''}
                      {h.gender === 'male' ? '♂ Boys' : h.gender === 'female' ? '♀ Girls' : 'Co-ed'} • {h.total_floors} Floors
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                    {occ}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{h.occupied_seats || 0} Occupied</span>
                    <span className="font-semibold text-emerald-600">{h.vacant_seats || 0} Vacant</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        occ > 90 ? 'bg-rose-500' : occ > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, occ)}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>Rooms: {h.total_rooms || 0}</span>
                  <span>Total Beds: {h.total_seats || 0}</span>
                  <span>Provost: {h.provost_name || '—'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Room-by-Room Vacancy Detail */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Room-Level Vacancy Roster
          </h2>

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

            <input
              type="text"
              placeholder="Search room number..."
              value={searchRoom}
              onChange={(e) => setSearchRoom(e.target.value)}
              className="text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary max-w-xs"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-xs text-slate-500">
            <div className="inline-block w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
            <p>Loading vacancy roster...</p>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-400">
            No rooms matching current filter.
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2.5">Room & Floor</th>
                  <th className="px-3 py-2.5">Hall Name</th>
                  <th className="px-3 py-2.5">Type</th>
                  <th className="px-3 py-2.5">Total Beds</th>
                  <th className="px-3 py-2.5">Occupied</th>
                  <th className="px-3 py-2.5">Vacant Beds</th>
                  <th className="px-3 py-2.5">Monthly Rent</th>
                  <th className="px-3 py-2.5">Vacancy Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRooms.map((r) => {
                  const isFull = (r.vacant_seats || 0) === 0;
                  const isEmpty = (r.occupied_seats || 0) === 0;

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-3 py-2.5 font-bold font-mono text-slate-900 dark:text-white">
                        Room {r.room_number} <span className="text-[10px] font-normal text-slate-400">(Fl. {r.floor_number})</span>
                      </td>

                      <td className="px-3 py-2.5 font-medium text-slate-800 dark:text-slate-200">
                        {r.hall_name}
                      </td>

                      <td className="px-3 py-2.5 capitalize text-slate-600 dark:text-slate-400">
                        {r.room_type}
                      </td>

                      <td className="px-3 py-2.5 font-mono">
                        {r.total_seats || r.capacity || 0}
                      </td>

                      <td className="px-3 py-2.5 font-mono text-indigo-600 font-semibold">
                        {r.occupied_seats || 0}
                      </td>

                      <td className="px-3 py-2.5 font-mono text-emerald-600 font-bold">
                        {r.vacant_seats || 0}
                      </td>

                      <td className="px-3 py-2.5 font-mono text-slate-700 dark:text-slate-300">
                        ৳{parseFloat(r.rent_monthly || 0).toLocaleString()}
                      </td>

                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            isFull
                              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                              : isEmpty
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          {isFull ? '● 100% Full' : isEmpty ? '○ 100% Empty' : `◐ Partial (${r.vacant_seats} left)`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
