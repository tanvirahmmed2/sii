'use client';

import React, { useEffect, useState } from 'react';
import { FiCheckCircle, FiXCircle, FiClock, FiActivity, FiCalendar, FiFileText } from 'react-icons/fi';

const AttendancePage = () => {
  const [data, setData] = useState({ history: [], summary: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const res = await fetch('/api/student/attendance');
        if (res.ok) {
          const resData = await res.json();
          setData(resData.paylod || { history: [], summary: null });
        }
      } catch (error) {
        console.error('Error fetching attendance:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-400">Loading attendance data...</p>
      </div>
    );
  }

  const { history = [], summary = null } = data;

  const total = parseInt(summary?.total || 0, 10);
  const present = parseInt(summary?.present || 0, 10);
  const absent = parseInt(summary?.absent || 0, 10);
  const late = parseInt(summary?.late || 0, 10);

  const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 100;

  const summaryCards = [
    { 
      label: 'Attendance Rate', 
      value: `${rate}%`, 
      sub: `${present + late} of ${total} classes attended`,
      color: rate >= 75 ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : 'text-amber-700 bg-amber-50 border-amber-100', 
      icon: FiActivity 
    },
    { 
      label: 'Present Days', 
      value: present, 
      sub: 'On-time class presence',
      color: 'text-emerald-700 bg-emerald-50 border-emerald-100', 
      icon: FiCheckCircle 
    },
    { 
      label: 'Absent Days', 
      value: absent, 
      sub: 'Unexcused absences',
      color: 'text-rose-700 bg-rose-50 border-rose-100', 
      icon: FiXCircle 
    },
    { 
      label: 'Late Entries', 
      value: late, 
      sub: 'Marked as late arrival',
      color: 'text-amber-700 bg-amber-50 border-amber-100', 
      icon: FiClock 
    }
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Present':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <FiCheckCircle className="text-xs" /> Present
          </span>
        );
      case 'Absent':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <FiXCircle className="text-xs" /> Absent
          </span>
        );
      case 'Late':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <FiClock className="text-xs" /> Late
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
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/70 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-wider mb-1">
            <FiCalendar /> Attendance Register
          </div>
          <h1 className="text-2xl font-bold text-slate-800">My Attendance Registry</h1>
          <p className="text-slate-500 text-xs sm:text-sm font-normal mt-0.5">
            Monitor your class presence, attendance percentages, and monthly log updates.
          </p>
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
                <span className="text-2xl sm:text-3xl font-bold block mb-0.5">{card.value}</span>
                <span className="text-[11px] font-medium opacity-80">{card.sub}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Attendance History Table */}
      <div className="bg-white border border-slate-200/70 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Attendance History Logs</h2>
            <p className="text-xs text-slate-400 font-medium">Recorded presence by date and class period</p>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            Total Logs: {history.length}
          </span>
        </div>
        
        {history.length === 0 ? (
          <div className="text-center py-12 text-slate-400 font-medium text-sm border border-dashed border-slate-200 rounded-2xl">
            No attendance entries have been registered yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[650px]">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Period & Timing</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {history.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-700 whitespace-nowrap">
                      {new Date(row.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {row.subject_name} {row.subject_code && <span className="text-xs font-mono text-slate-400 font-normal">({row.subject_code})</span>}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 text-xs font-medium">
                      {row.period_name || 'Period'} {row.start_time && <span className="text-slate-400">({row.start_time} - {row.end_time})</span>}
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(row.status)}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400">
                      {row.remarks || '—'}
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
