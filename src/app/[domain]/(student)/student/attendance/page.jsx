'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { 
  FiCheckCircle, FiXCircle, FiClock, FiActivity, 
  FiCalendar, FiFileText, FiSearch, FiFilter, FiAlertCircle 
} from 'react-icons/fi';

const AttendancePage = () => {
  const [data, setData] = useState({ history: [], summary: null });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeViewTab, setActiveViewTab] = useState('logs'); // 'logs' | 'subjects'

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const res = await fetch('/api/student/attendance');
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
  }, []);

  const { history = [], summary = null } = data;

  const total = parseInt(summary?.total || history.length || 0, 10);
  const present = parseInt(summary?.present || history.filter(h => (h.status || '').toLowerCase() === 'present').length || 0, 10);
  const absent = parseInt(summary?.absent || history.filter(h => (h.status || '').toLowerCase() === 'absent').length || 0, 10);
  const late = parseInt(summary?.late || history.filter(h => (h.status || '').toLowerCase() === 'late').length || 0, 10);
  const leave = parseInt(summary?.leave || history.filter(h => (h.status || '').toLowerCase() === 'leave').length || 0, 10);

  const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 100;

  // Compute subject-wise statistics
  const subjectStats = useMemo(() => {
    const map = {};
    history.forEach((row) => {
      const key = row.subject_name || 'General';
      if (!map[key]) {
        map[key] = {
          name: key,
          code: row.subject_code || '',
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          leave: 0
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
        isEligible: subRate >= 75
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
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-400">Loading attendance register...</p>
      </div>
    );
  }

  const summaryCards = [
    { 
      label: 'Aggregate Attendance', 
      value: `${rate}%`, 
      sub: `${present + late} of ${total} sessions attended`,
      color: rate >= 75 ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : 'text-amber-700 bg-amber-50 border-amber-100', 
      icon: FiActivity 
    },
    { 
      label: 'Present Days', 
      value: present, 
      sub: 'On-time lecture attendance',
      color: 'text-emerald-700 bg-emerald-50 border-emerald-100', 
      icon: FiCheckCircle 
    },
    { 
      label: 'Absences', 
      value: absent, 
      sub: 'Recorded unexcused absences',
      color: 'text-rose-700 bg-rose-50 border-rose-100', 
      icon: FiXCircle 
    },
    { 
      label: 'Late Check-ins', 
      value: late, 
      sub: 'Delayed arrival markings',
      color: 'text-amber-700 bg-amber-50 border-amber-100', 
      icon: FiClock 
    }
  ];

  const getStatusBadge = (status) => {
    const norm = (status || '').toLowerCase();
    switch (norm) {
      case 'present':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <FiCheckCircle className="text-xs" /> Present
          </span>
        );
      case 'absent':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <FiXCircle className="text-xs" /> Absent
          </span>
        );
      case 'late':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <FiClock className="text-xs" /> Late
          </span>
        );
      case 'leave':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <FiFileText className="text-xs" /> Authorized Leave
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-12 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/70 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-wider mb-1">
            <FiCalendar /> Institutional Attendance Registry
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">My Attendance Registry</h1>
          <p className="text-slate-500 text-xs sm:text-sm font-normal mt-0.5">
            Monitor period-wise presence, subject attendance percentages, and examination eligibility status (75% threshold).
          </p>
        </div>

        <div className="flex items-center gap-2">
          {rate >= 75 ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-700 text-xs font-bold">
              <FiCheckCircle className="text-base" /> Exam Eligible (&ge;75%)
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-2xl border border-amber-200 text-amber-800 text-xs font-bold">
              <FiAlertCircle className="text-base text-amber-600" /> Shortage Warning (&lt;75%)
            </div>
          )}
        </div>
      </div>

      {/* Grid Summaries */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className={`p-5 rounded-2xl border ${card.color} flex flex-col justify-between shadow-xs`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider opacity-90">{card.label}</span>
                <Icon className="text-xl opacity-80" />
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-bold block mb-0.5 font-mono">{card.value}</span>
                <span className="text-[11px] font-medium opacity-80">{card.sub}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveViewTab('logs')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeViewTab === 'logs'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Daily Attendance Logs ({filteredHistory.length})
        </button>
        <button
          onClick={() => setActiveViewTab('subjects')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeViewTab === 'subjects'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Subject-wise Attendance Rate ({subjectStats.length})
        </button>
      </div>

      {activeViewTab === 'subjects' ? (
        /* Subject-wise Attendance Table */
        <div className="bg-white border border-slate-200/70 rounded-3xl p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Subject-wise Class Attendance</h2>
              <p className="text-xs text-slate-400 font-medium">Verify your minimum 75% attendance threshold per subject</p>
            </div>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full self-start sm:self-auto">
              Total Subjects: {subjectStats.length}
            </span>
          </div>

          {subjectStats.length === 0 ? (
            <div className="text-center py-12 text-slate-400 font-medium text-xs border border-dashed border-slate-200 rounded-2xl">
              No subject-specific attendance recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                    <th className="py-3 px-4 rounded-l-xl">Subject</th>
                    <th className="py-3 px-4 text-center">Total Classes</th>
                    <th className="py-3 px-4 text-center">Present</th>
                    <th className="py-3 px-4 text-center">Absent</th>
                    <th className="py-3 px-4 text-center">Late / Leave</th>
                    <th className="py-3 px-4">Attendance Progress</th>
                    <th className="py-3 px-4 text-center rounded-r-xl">Exam Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {subjectStats.map((sub, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {sub.name}
                        {sub.code && <span className="block text-[10px] text-slate-400 font-mono font-normal">Code: {sub.code}</span>}
                      </td>
                      <td className="py-3.5 px-4 text-center font-semibold text-slate-700">
                        {sub.total}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-emerald-600">
                        {sub.present}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-rose-500">
                        {sub.absent}
                      </td>
                      <td className="py-3.5 px-4 text-center text-slate-500">
                        {sub.late + sub.leave}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                sub.rate >= 75 ? 'bg-emerald-500' : 'bg-amber-500'
                              }`}
                              style={{ width: `${Math.min(sub.rate, 100)}%` }}
                            />
                          </div>
                          <span className="font-bold text-xs font-mono text-slate-700 w-10 text-right">
                            {sub.rate}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {sub.isEligible ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Eligible
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Shortage
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
      ) : (
        /* Daily History Table */
        <div className="bg-white border border-slate-200/70 rounded-3xl p-6 sm:p-8 shadow-xs">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {['all', 'present', 'absent', 'late', 'leave'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === st
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs w-full md:w-64">
              <FiSearch className="text-slate-400" />
              <input
                type="text"
                placeholder="Search subject or date..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent text-slate-800 placeholder-slate-400 focus:outline-none w-full"
              />
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="text-center py-12 text-slate-400 font-medium text-xs border border-dashed border-slate-200 rounded-2xl">
              No matching attendance records found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[650px]">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                    <th className="py-3 px-4 rounded-l-xl">Date & Day</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Period & Timing</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 rounded-r-xl">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredHistory.map((row) => {
                    const rowDate = new Date(row.date);
                    const dateFormatted = !isNaN(rowDate) 
                      ? rowDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                      : row.date;

                    return (
                      <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-700 whitespace-nowrap">
                          {dateFormatted}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          {row.subject_name || 'Class Session'}
                          {row.subject_code && (
                            <span className="text-xs font-mono text-slate-400 font-normal ml-1">({row.subject_code})</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 text-xs font-medium">
                          {row.period_name || 'Period'} {row.start_time && <span className="text-slate-400">({row.start_time} - {row.end_time})</span>}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {getStatusBadge(row.status)}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-400">
                          {row.remarks || '—'}
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
    </div>
  );
};

export default AttendancePage;
