'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

export default function ResidenceReportPage() {
  const { website, getApiEndpoint } = useTenantWebsite();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ kpi: {}, hallBreakdown: [] });

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const url = getApiEndpoint('/staff/panel/residence/reports');
      const res = await fetch(url);
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error);
      setData(result.payload || {});
    } catch (err) {
      toast.error(err.message || 'Failed to load residence summary.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const kpi = data.kpi || {};
  const halls = data.hallBreakdown || [];

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 inline-block mb-1">
            Path: /residence-report
          </span>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Comprehensive Residence Executive Report
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Overview of campus accommodation capacity, student resident distribution, and revenue.
          </p>
        </div>

        <button
          onClick={fetchSummary}
          disabled={loading}
          className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium cursor-pointer transition flex items-center gap-1.5"
        >
          <span>🔄</span> Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Total Halls</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">{kpi.total_halls || 0}</span>
            <span className="text-[10px] font-medium text-blue-600">Active Facilities</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Total Rooms</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">{kpi.total_rooms || 0}</span>
            <span className="text-[10px] font-medium text-slate-500">{kpi.total_capacity || 0} Beds</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-indigo-600 dark:text-indigo-400 tracking-wider">Occupied Beds</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-indigo-600 font-mono">{kpi.occupied_seats || 0}</span>
            <span className="text-[10px] font-medium text-slate-500">
              {kpi.total_capacity > 0 ? Math.round(((kpi.occupied_seats || 0) / kpi.total_capacity) * 100) : 0}% Occupancy
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400 tracking-wider">Vacant Beds</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-emerald-600 font-mono">{kpi.vacant_seats || 0}</span>
            <span className="text-[10px] font-medium text-emerald-600">Available</span>
          </div>
        </div>
      </div>

      {/* Hall Breakdown Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-2xs space-y-4">
        <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          Hall Performance & Summary Roster
        </h2>

        {loading ? (
          <div className="text-center py-12 text-xs text-slate-500">
            <div className="inline-block w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
            <p>Loading report data...</p>
          </div>
        ) : halls.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-400">
            No residence halls configured yet.
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2.5">Hall Name</th>
                  <th className="px-3 py-2.5">Type</th>
                  <th className="px-3 py-2.5">Provost</th>
                  <th className="px-3 py-2.5">Rooms</th>
                  <th className="px-3 py-2.5">Total Beds</th>
                  <th className="px-3 py-2.5">Occupied</th>
                  <th className="px-3 py-2.5">Vacant</th>
                  <th className="px-3 py-2.5">Occupancy Rate</th>
                  <th className="px-3 py-2.5 text-right">Quick Navigation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {halls.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="px-3 py-2.5 font-semibold text-slate-900 dark:text-white">
                      {h.name}
                    </td>
                    <td className="px-3 py-2.5 capitalize text-slate-600 dark:text-slate-400">
                      {h.gender === 'male' ? '♂ Boys' : h.gender === 'female' ? '♀ Girls' : 'Co-ed'}
                    </td>
                    <td className="px-3 py-2.5">
                      {h.provost_name || '—'}
                    </td>
                    <td className="px-3 py-2.5 font-mono">
                      {h.total_rooms || 0}
                    </td>
                    <td className="px-3 py-2.5 font-mono">
                      {h.total_seats || 0}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-indigo-600 font-semibold">
                      {h.occupied_seats || 0}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-emerald-600 font-bold">
                      {h.vacant_seats || 0}
                    </td>
                    <td className="px-3 py-2.5 font-mono font-semibold">
                      {h.occupancy_rate || 0}%
                    </td>
                    <td className="px-3 py-2.5 text-right space-x-2">
                      <Link
                        href={`/staff-panel/residence-room?hall_id=${h.id}`}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        Rooms →
                      </Link>
                      <Link
                        href={`/staff-panel/residence-allocations?hall_id=${h.id}`}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        Allocations →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
