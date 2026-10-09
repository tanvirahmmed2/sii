'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { BiCalendarCheck, BiPlus, BiRefresh, BiTimeFive, BiCheck, BiX, BiReset } from 'react-icons/bi';

export default function ClassDaysPage() {
  const params = useParams();
  const domain = params?.domain || '';

  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchDays = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/${domain}/staff/panel/days`);
      const data = await res.json();
      if (data.success) {
        setDays(data.days || []);
      } else {
        setErrorMsg(data.error || 'Failed to fetch academic days.');
      }
    } catch (err) {
      setErrorMsg('Network error fetching academic days.');
    } finally {
      setLoading(false);
    }
  }, [domain]);

  useEffect(() => {
    fetchDays();
  }, [fetchDays]);

  const toggleDayStatus = async (day) => {
    const newStatus = day.status === 'on' ? 'off' : 'on';
    try {
      setSubmittingId(day.id);
      const res = await fetch(`/api/${domain}/staff/panel/days`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: day.id, status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`${day.name} marked as ${newStatus === 'on' ? 'Working Day' : 'Off / Weekend'}.`);
        setTimeout(() => setSuccessMsg(''), 3000);
        setDays((prev) =>
          prev.map((d) => (d.id === day.id ? { ...d, status: newStatus } : d))
        );
      } else {
        setErrorMsg(data.error || 'Failed to update day status.');
      }
    } catch (err) {
      setErrorMsg('Network error updating day status.');
    } finally {
      setSubmittingId(null);
    }
  };

  const handleResetStandard = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/${domain}/staff/panel/days`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_standard' })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Academic week restored to standard school schedule.');
        setTimeout(() => setSuccessMsg(''), 4000);
        fetchDays();
      } else {
        setErrorMsg(data.error || 'Failed to reset standard days.');
      }
    } catch (err) {
      setErrorMsg('Network error resetting days.');
    } finally {
      setLoading(false);
    }
  };

  const workingDaysCount = useMemo(() => {
    return days.filter((d) => d.status === 'on').length;
  }, [days]);

  const totalPeriodsScheduled = useMemo(() => {
    return days.reduce((sum, d) => sum + (parseInt(d.period_count, 10) || 0), 0);
  }, [days]);

  return (
    <div className="w-full space-y-4">
      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Total Scheduled Days</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">{days.length} Days</span>
            <span className="text-[10px] font-medium text-slate-500">Weekly Cycle</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Working School Days</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {workingDaysCount} Days
            </span>
            <span className="text-[10px] font-medium text-emerald-600">Active Lessons</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Weekend / Holidays</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-amber-600 dark:text-amber-400 font-mono">
              {days.length - workingDaysCount} Days
            </span>
            <span className="text-[10px] font-medium text-amber-600">Off-duty</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Configured Periods</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-blue-600 dark:text-blue-400 font-mono">
              {totalPeriodsScheduled}
            </span>
            <span className="text-[10px] font-medium text-blue-600">Time Slots</span>
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
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Academic Weekdays &amp; Operating Status
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Configure which days your campus operates classes and attendance.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchDays}
              className="p-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
              title="Refresh"
            >
              <BiRefresh className="text-base" />
            </button>
            <button
              onClick={handleResetStandard}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Reset to Sun-Thu on, Fri-Sat off"
            >
              <BiReset className="text-base" />
              <span>Standard Week Reset</span>
            </button>
          </div>
        </div>

        {/* Days Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">Loading academic days...</div>
          ) : days.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <BiCalendarCheck className="mx-auto text-3xl text-slate-400" />
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">No days configured.</p>
              <button
                onClick={handleResetStandard}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Initialize standard week
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Order</th>
                  <th className="py-2.5 px-3">Weekday Name</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Configured Periods</th>
                  <th className="py-2.5 px-3 text-right">Quick Toggle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
                {days.map((day) => (
                  <tr key={day.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">
                      #{day.day_order}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <BiCalendarCheck className="text-slate-400 text-sm" />
                      <span>{day.name}</span>
                    </td>
                    <td className="py-3 px-3">
                      {day.status === 'on' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <BiCheck /> Working Day
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                          <BiX /> Off / Holiday
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400">
                        <BiTimeFive className="text-xs" />
                        <span>{day.period_count} periods scheduled</span>
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => toggleDayStatus(day)}
                        disabled={submittingId === day.id}
                        className={`px-3 py-1 rounded text-[11px] font-semibold transition cursor-pointer disabled:opacity-50 ${
                          day.status === 'on'
                            ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        }`}
                      >
                        {submittingId === day.id
                          ? 'Updating...'
                          : day.status === 'on'
                          ? 'Mark as Weekend'
                          : 'Activate as Working Day'}
                      </button>
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
