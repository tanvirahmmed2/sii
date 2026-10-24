'use client';

import React, { useEffect, useState, useMemo } from 'react';
import TenantLoader from 'src/component/tenant/TenantLoader';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

const AttendancePage = () => {
  const { getApiEndpoint } = useTenantWebsite();
  const [data, setData] = useState({ history: [], summary: null });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('logs'); // 'logs' | 'subjects'

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const res = await fetch(getApiEndpoint('student/attendance'));
        if (res.ok) {
          const resData = await res.json();
          setData(resData.payload || resData.paylod || { history: [], summary: null });
        }
      } catch (error) {
        console.error('Error fetching attendance:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, [getApiEndpoint]);

  const { history = [], summary = null } = data;

  const total = parseInt(summary?.total || history.length || 0, 10);
  const present = parseInt(summary?.present || history.filter(h => (h.status || '').toLowerCase() === 'present').length || 0, 10);
  const absent = parseInt(summary?.absent || history.filter(h => (h.status || '').toLowerCase() === 'absent').length || 0, 10);
  const late = parseInt(summary?.late || history.filter(h => (h.status || '').toLowerCase() === 'late').length || 0, 10);
  const leave = parseInt(summary?.leave || history.filter(h => (h.status || '').toLowerCase() === 'leave').length || 0, 10);

  const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 100;

  // Subject-wise stats
  const subjectStats = useMemo(() => {
    const map = {};
    history.forEach((row) => {
      const key = row.subject_name || 'General Daily Roll Call';
      if (!map[key]) {
        map[key] = {
          name: key,
          code: row.subject_code || '',
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          leave: 0,
        };
      }
      map[key].total += 1;
      const st = (row.status || '').toLowerCase();
      if (st === 'present') map[key].present += 1;
      else if (st === 'absent') map[key].absent += 1;
      else if (st === 'late') map[key].late += 1;
      else if (st === 'leave') map[key].leave += 1;
    });

    return Object.values(map).map((s) => {
      const subRate = s.total > 0 ? Math.round(((s.present + s.late) / s.total) * 100) : 100;
      return {
        ...s,
        rate: subRate,
        isEligible: subRate >= 75,
      };
    });
  }, [history]);

  // Filter history rows
  const filteredHistory = useMemo(() => {
    return history.filter((row) => {
      const matchStatus = statusFilter === 'all' || (row.status || '').toLowerCase() === statusFilter.toLowerCase();
      const matchSearch = searchTerm === '' ||
        (row.subject_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (row.subject_code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (row.date || '').includes(searchTerm);
      return matchStatus && matchSearch;
    });
  }, [history, statusFilter, searchTerm]);

  if (loading) {
    return <TenantLoader fullScreen={false} />;
  }

  const kpis = [
    {
      label: 'Aggregate Attendance',
      value: `${rate}%`,
      sub: `${present + late} of ${total} sessions attended`,
      isSuccess: rate >= 75,
      isWarning: rate < 75,
    },
    {
      label: 'Present Sessions',
      value: present,
      sub: 'Verified present',
    },
    {
      label: 'Late Check-ins',
      value: late,
      sub: 'Recorded with remarks',
    },
    {
      label: 'Absences',
      value: absent,
      sub: absent > 0 ? 'Review unexcused days' : 'Zero absences recorded',
      isWarning: absent > 0,
    },
  ];

  return (
    <div className="w-full space-y-4 pb-8">
      {/* Header */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 gap-2">
        <div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-white">
            Attendance Records &amp; Logs
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Monitor daily roll-call logs, course attendance percentages, and examination eligibility.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-1 text-xs font-medium rounded ${
              rate >= 75
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
            }`}
          >
            {rate >= 75 ? 'Exam Eligible (>=75%)' : 'Below Exam Threshold (<75%)'}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((kpi, idx) => (
          <div
            key={idx}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 space-y-1"
          >
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{kpi.label}</span>
            <div
              className={`text-lg font-semibold font-mono ${
                kpi.isWarning
                  ? 'text-rose-600 dark:text-rose-400'
                  : kpi.isSuccess
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-900 dark:text-white'
              }`}
            >
              {kpi.value}
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Main Content Card */}
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 sm:p-5 space-y-4">
        {/* Tab Controls & Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('logs')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition cursor-pointer ${
                activeTab === 'logs'
                  ? 'bg-primary text-white shadow-xs'
                  : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              Daily Attendance Logs ({filteredHistory.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('subjects')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition cursor-pointer ${
                activeTab === 'subjects'
                  ? 'bg-primary text-white shadow-xs'
                  : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              Subject-Wise Breakdown ({subjectStats.length})
            </button>
          </div>

          {activeTab === 'logs' && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search subject or date..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="present">Present</option>
                <option value="late">Late</option>
                <option value="absent">Absent</option>
                <option value="leave">Leave</option>
              </select>
            </div>
          )}
        </div>

        {/* Tab 1: Daily Attendance Logs Table */}
        {activeTab === 'logs' && (
          <div>
            {filteredHistory.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded">
                No attendance logs found matching filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50">
                      <th className="py-2.5 px-3 font-medium">Date</th>
                      <th className="py-2.5 px-3 font-medium">Session / Subject</th>
                      <th className="py-2.5 px-3 font-medium">Check-In</th>
                      <th className="py-2.5 px-3 font-medium">Check-Out</th>
                      <th className="py-2.5 px-3 font-medium text-center">Status</th>
                      <th className="py-2.5 px-3 font-medium">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredHistory.map((row) => {
                      const st = (row.status || '').toLowerCase();
                      const isPresent = st === 'present';
                      const isLate = st === 'late';
                      const isAbsent = st === 'absent';

                      return (
                        <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 font-mono font-medium text-slate-900 dark:text-white whitespace-nowrap">
                            {row.date ? new Date(row.date).toLocaleDateString('en-GB') : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                            {row.subject_name || 'Daily Roll Call'}
                            {row.subject_code && (
                              <span className="block text-[10px] text-slate-400 font-mono">({row.subject_code})</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                            {row.in_time || '—'}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                            {row.out_time || '—'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {isPresent ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                                Present
                              </span>
                            ) : isLate ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
                                Late
                              </span>
                            ) : isAbsent ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800">
                                Absent
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                                {row.status || 'Logged'}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                            {row.remark || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Subject-Wise Breakdown */}
        {activeTab === 'subjects' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50">
                  <th className="py-2.5 px-3 font-medium">Subject Name</th>
                  <th className="py-2.5 px-3 font-medium">Total Held</th>
                  <th className="py-2.5 px-3 font-medium">Attended</th>
                  <th className="py-2.5 px-3 font-medium">Absences</th>
                  <th className="py-2.5 px-3 font-medium">Rate</th>
                  <th className="py-2.5 px-3 font-medium text-right">Eligibility</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {subjectStats.map((sub, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                      {sub.name}
                      {sub.code && <span className="block text-[10px] text-slate-400 font-mono">({sub.code})</span>}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300">{sub.total}</td>
                    <td className="py-2.5 px-3 font-mono text-emerald-700 dark:text-emerald-400 font-medium">{sub.present + sub.late}</td>
                    <td className="py-2.5 px-3 font-mono text-rose-600 dark:text-rose-400">{sub.absent}</td>
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-900 dark:text-white">{sub.rate}%</td>
                    <td className="py-2.5 px-3 text-right">
                      {sub.isEligible ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                          Eligible
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800">
                          Ineligible
                        </span>
                      )}
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
};

export default AttendancePage;
