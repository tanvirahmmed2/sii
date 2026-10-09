'use client';

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import StudentFilterBar from 'src/component/staff/StudentFilterBar';
import StudentFilterEmptyState from 'src/component/staff/StudentFilterEmptyState';

export default function StudentDailyAttendanceReportPage() {
  const { website, getApiEndpoint } = useTenantWebsite();

  const [hasFiltered, setHasFiltered] = useState(false);
  const [filterInfo, setFilterInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reportDate, setReportDate] = useState(new Date().toISOString().substring(0, 10));
  const [records, setRecords] = useState([]);

  const loadData = async ({ sessionId, classId, sectionId, sessionName, className, sectionName }) => {
    setLoading(true);
    setFilterInfo({ sessionId, classId, sectionId, sessionName, className, sectionName });
    try {
      const params = new URLSearchParams({
        date: reportDate,
        session_id: sessionId,
        class_id: classId,
      });
      if (sectionId) params.set('section_id', sectionId);

      const res = await fetch(getApiEndpoint(`staff/panel/students/attendance?${params.toString()}`));
      const data = await res.json();

      if (res.ok && data.success) {
        const list = data.payload?.attendance || [];
        setRecords(list);
        setHasFiltered(true);
        toast.success(`Generated daily report for ${reportDate}.`);
      } else {
        toast.error(data.error || 'Failed to fetch attendance report.');
      }
    } catch {
      toast.error('Network error generating report.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setHasFiltered(false);
    setFilterInfo(null);
    setRecords([]);
  };

  const extraDateFilter = (
    <div>
      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
        Report Date *
      </label>
      <input
        type="date"
        value={reportDate}
        onChange={(e) => setReportDate(e.target.value)}
        className="w-full text-xs px-2.5 py-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-primary"
      />
    </div>
  );

  const total = records.length;
  const present = records.filter((r) => r.status === 'present').length;
  const absent = records.filter((r) => r.status === 'absent').length;
  const late = records.filter((r) => r.status === 'late').length;
  const leave = records.filter((r) => r.status === 'leave').length;
  const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

  return (
    <div className="w-full space-y-4">
      {/* Page Header */}
      <div className="pb-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Daily Student Attendance Report
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Filter by session, class, section, and date to generate daily attendance metrics and printable audit records.
          </p>
        </div>

        {hasFiltered && (
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span>🖨️</span> Print Report
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="print:hidden">
        <StudentFilterBar
          onFilter={loadData}
          onReset={handleReset}
          loading={loading}
          extraFilters={extraDateFilter}
          submitLabel="Generate Report"
          title="Daily Attendance Report Filter"
          description="Select session, class, section, and date to produce report"
        />
      </div>

      {/* Show Data Only After Filter */}
      {!hasFiltered ? (
        <StudentFilterEmptyState
          icon="📊"
          title="Filter by Session, Class & Section to Generate Daily Report"
          description="Please select Academic Session, Class, Section, and Date above, then click 'Generate Report' to view attendance metrics."
        />
      ) : (
        <div className="space-y-4">
          {/* Print Letterhead (visible only in print) */}
          <div className="hidden print:block text-center border-b pb-3 mb-3">
            <h2 className="text-lg font-bold uppercase">{website?.name || 'Institutional Portal'}</h2>
            <p className="text-xs text-slate-600">Daily Student Attendance Audit Report</p>
            <p className="text-[11px] font-mono text-slate-500 mt-1">
              Date: {reportDate} | Class: {filterInfo?.className} | Section: {filterInfo?.sectionName} | Session: {filterInfo?.sessionName}
            </p>
          </div>

          {/* Metric KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-2xs">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Total Roster</span>
              <span className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1 block">{total}</span>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-2xs">
              <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider block">Present</span>
              <span className="text-xl font-bold font-mono text-emerald-600 mt-1 block">{present}</span>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-2xs">
              <span className="text-[10px] font-semibold text-rose-600 uppercase tracking-wider block">Absent</span>
              <span className="text-xl font-bold font-mono text-rose-600 mt-1 block">{absent}</span>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-2xs">
              <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider block">Late / Leave</span>
              <span className="text-xl font-bold font-mono text-amber-600 mt-1 block">{late + leave}</span>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-2xs">
              <span className="text-[10px] font-semibold text-primary uppercase tracking-wider block">Attendance Rate</span>
              <span className="text-xl font-bold font-mono text-primary mt-1 block">{rate}%</span>
            </div>
          </div>

          {/* Report Breakdown Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-2xs space-y-3">
            {records.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No attendance logs found for this date and class.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                    <tr>
                      <th className="px-3 py-2.5">Roll No</th>
                      <th className="px-3 py-2.5">Reg No</th>
                      <th className="px-3 py-2.5">Student Name</th>
                      <th className="px-3 py-2.5 text-center">Status</th>
                      <th className="px-3 py-2.5">Remark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {records.map((r) => (
                      <tr key={r.student_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-3 py-2 font-mono font-bold text-slate-900 dark:text-white">{r.roll_no || '—'}</td>
                        <td className="px-3 py-2 font-mono text-[11px] text-slate-600 dark:text-slate-400">{r.registration_no}</td>
                        <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">{r.name || 'Unnamed'}</td>
                        <td className="px-3 py-2 text-center">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              r.status === 'present'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                : r.status === 'absent'
                                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                                : r.status === 'late'
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                                : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-500 text-[11px]">{r.remark || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
