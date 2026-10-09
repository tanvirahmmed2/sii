'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

export default function ResidenceReportFeesPage() {
  const { website, getApiEndpoint } = useTenantWebsite();

  const [loading, setLoading] = useState(true);
  const [allocations, setAllocations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHall, setSelectedHall] = useState('');
  const [halls, setHalls] = useState([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('status', 'active');
      if (selectedHall) params.set('hall_id', selectedHall);
      if (searchTerm.trim()) params.set('search', searchTerm.trim());

      const url = getApiEndpoint(`/staff/panel/residence/allocations?${params.toString()}`);
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);

      setAllocations(data.payload.allocations || []);
    } catch (err) {
      toast.error(err.message || 'Failed to fetch residence fee data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchHalls = async () => {
    try {
      const url = getApiEndpoint('/staff/panel/residence/halls');
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.success) setHalls(data.payload.halls || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchHalls();
  }, []);

  useEffect(() => {
    fetchData();
  }, [selectedHall]);

  const totalMonthlyBilled = allocations.reduce((sum, a) => sum + parseFloat(a.fee_monthly || 0), 0);

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 inline-block mb-1">
            Path: /residence-report-fees
          </span>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Residence Accommodation Fees Report
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Monthly accommodation billings, bed rent breakdown, and resident financial roster.
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium cursor-pointer transition flex items-center gap-1.5"
        >
          <span>🔄</span> Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Active Billing Residents</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">{allocations.length}</span>
            <span className="text-[10px] font-medium text-blue-600">Students</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400 tracking-wider">Total Monthly Billed</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-emerald-600 font-mono">
              ৳{totalMonthlyBilled.toLocaleString()}
            </span>
            <span className="text-[10px] font-medium text-emerald-600">Per Month</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-indigo-600 dark:text-indigo-400 tracking-wider">Average Monthly Rent</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-indigo-600 font-mono">
              ৳{allocations.length > 0 ? Math.round(totalMonthlyBilled / allocations.length).toLocaleString() : 0}
            </span>
            <span className="text-[10px] font-medium text-slate-500">Per Student</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Resident Monthly Fee Ledger
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
              placeholder="Search student, reg, room..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchData()}
              className="text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary max-w-xs"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-xs text-slate-500">
            <div className="inline-block w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
            <p>Loading fee report...</p>
          </div>
        ) : allocations.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-400">
            No active residents found for billing.
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2.5">Resident Student</th>
                  <th className="px-3 py-2.5">Registration</th>
                  <th className="px-3 py-2.5">Hall & Room</th>
                  <th className="px-3 py-2.5">Seat No</th>
                  <th className="px-3 py-2.5">Allocated Since</th>
                  <th className="px-3 py-2.5">Monthly Rent</th>
                  <th className="px-3 py-2.5">Billing Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {allocations.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="px-3 py-2.5 font-semibold text-slate-900 dark:text-white">
                      {a.student_name || 'Resident Student'}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-slate-800 dark:text-slate-200">
                      {a.registration_no}
                    </td>
                    <td className="px-3 py-2.5">
                      {a.hall_name} • Room {a.room_number}
                    </td>
                    <td className="px-3 py-2.5 font-mono font-bold">
                      {a.seat_number}
                    </td>
                    <td className="px-3 py-2.5 text-[11px] text-slate-500 font-mono">
                      {a.allocated_date ? new Date(a.allocated_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-3 py-2.5 font-mono font-bold text-slate-900 dark:text-white">
                      ৳{parseFloat(a.fee_monthly || 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        Active Billed
                      </span>
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
