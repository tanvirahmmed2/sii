'use client';

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import StudentFilterBar from 'src/component/staff/StudentFilterBar';
import StudentFilterEmptyState from 'src/component/staff/StudentFilterEmptyState';

export default function StudentMonthlyAttendanceReportPage() {
  const { getApiEndpoint } = useTenantWebsite();

  const [hasFiltered, setHasFiltered] = useState(false);
  const [filterInfo, setFilterInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [targetMonth, setTargetMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [summaryData, setSummaryData] = useState([]);
  const [students, setStudents] = useState([]);

  const loadData = async ({ sessionId, classId, sectionId, sessionName, className, sectionName }) => {
    setLoading(true);
    setFilterInfo({ sessionId, classId, sectionId, sessionName, className, sectionName });
    try {
      const [sumRes, stuRes] = await Promise.all([
        fetch(
          getApiEndpoint(
            `staff/panel/students/attendance?month=${targetMonth}&session_id=${sessionId}&class_id=${classId}${
              sectionId ? `&section_id=${sectionId}` : ''
            }`
          )
        ).then((r) => r.json()).catch(() => ({})),
        fetch(
          getApiEndpoint(
            `staff/panel/students?session_id=${sessionId}&class_id=${classId}${
              sectionId ? `&section_id=${sectionId}` : ''
            }`
          )
        ).then((r) => r.json()).catch(() => ({})),
      ]);

      const sumList = sumRes?.payload?.summary || [];
      const stuList = stuRes?.payload?.students || [];

      setSummaryData(sumList);
      setStudents(stuList);
      setHasFiltered(true);
      toast.success(`Generated monthly report for ${targetMonth}.`);
    } catch {
      toast.error('Network error loading monthly report.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setHasFiltered(false);
    setFilterInfo(null);
    setSummaryData([]);
    setStudents([]);
  };

  const extraMonthFilter = (
    <div>
      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
        Target Month *
      </label>
      <input
        type="month"
        value={targetMonth}
        onChange={(e) => setTargetMonth(e.target.value)}
        className="w-full text-xs px-2.5 py-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-primary"
      />
    </div>
  );

  // Group summary by date
  const dateMap = {};
  summaryData.forEach((item) => {
    const dStr = String(item.date).substring(0, 10);
    if (!dateMap[dStr]) dateMap[dStr] = { date: dStr, present: 0, absent: 0, late: 0, leave: 0 };
    if (item.status === 'present') dateMap[dStr].present += parseInt(item.count, 10);
    if (item.status === 'absent') dateMap[dStr].absent += parseInt(item.count, 10);
    if (item.status === 'late') dateMap[dStr].late += parseInt(item.count, 10);
    if (item.status === 'leave') dateMap[dStr].leave += parseInt(item.count, 10);
  });
  const dateRows = Object.values(dateMap).sort((a, b) => b.date.localeCompare(a.date));

  const totalRecordedDays = dateRows.length;
  const totalPresents = summaryData
    .filter((s) => s.status === 'present')
    .reduce((acc, curr) => acc + parseInt(curr.count, 10), 0);
  const totalAbsents = summaryData
    .filter((s) => s.status === 'absent')
    .reduce((acc, curr) => acc + parseInt(curr.count, 10), 0);

  return (
    <div className="w-full space-y-4">
      {/* Page Header */}
      <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
          Monthly Student Attendance Report
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Filter by session, class, section, and month to evaluate attendance consistency and monthly attendance rates.
        </p>
      </div>

      {/* Filter Bar */}
      <StudentFilterBar
        onFilter={loadData}
        onReset={handleReset}
        loading={loading}
        extraFilters={extraMonthFilter}
        submitLabel="Generate Monthly Summary"
        title="Monthly Attendance Filter"
        description="Select session, class, section, and month to generate analytics"
      />

      {/* Show Data Only After Filter */}
      {!hasFiltered ? (
        <StudentFilterEmptyState
          icon="🗓️"
          title="Filter by Session, Class & Section to View Monthly Report"
          description="Please select Academic Session, Class, Section, and Month above, then click 'Generate Monthly Summary' to display attendance data."
        />
      ) : (
        <div className="space-y-4">
          {/* Monthly KPI Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-2xs">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Month Target</span>
              <span className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-1 block">{targetMonth}</span>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-2xs">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Instructional Days</span>
              <span className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-1 block">{totalRecordedDays} Days</span>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-2xs">
              <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider block">Total Presents</span>
              <span className="text-lg font-bold font-mono text-emerald-600 mt-1 block">{totalPresents}</span>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-2xs">
              <span className="text-[10px] font-semibold text-rose-600 uppercase tracking-wider block">Total Absences</span>
              <span className="text-lg font-bold font-mono text-rose-600 mt-1 block">{totalAbsents}</span>
            </div>
          </div>

          {/* Date-wise Matrix Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-2xs space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Daily Breakdown for {filterInfo?.className} ({filterInfo?.sectionName}) - {targetMonth}
            </h3>

            {dateRows.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No attendance records logged in this month for selected class.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                    <tr>
                      <th className="px-3 py-2.5">Date</th>
                      <th className="px-3 py-2.5 text-center">Present</th>
                      <th className="px-3 py-2.5 text-center">Absent</th>
                      <th className="px-3 py-2.5 text-center">Late</th>
                      <th className="px-3 py-2.5 text-center">Leave</th>
                      <th className="px-3 py-2.5 text-right">Attendance Ratio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {dateRows.map((row) => {
                      const dayTotal = row.present + row.absent + row.late + row.leave;
                      const dayPct = dayTotal > 0 ? Math.round(((row.present + row.late) / dayTotal) * 100) : 0;

                      return (
                        <tr key={row.date} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-3 py-2 font-mono font-medium text-slate-900 dark:text-white">
                            {row.date}
                          </td>
                          <td className="px-3 py-2 text-center font-mono text-emerald-600 font-semibold">
                            {row.present}
                          </td>
                          <td className="px-3 py-2 text-center font-mono text-rose-600 font-semibold">
                            {row.absent}
                          </td>
                          <td className="px-3 py-2 text-center font-mono text-amber-600">
                            {row.late}
                          </td>
                          <td className="px-3 py-2 text-center font-mono text-blue-600">
                            {row.leave}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                                dayPct >= 80
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                  : dayPct >= 60
                                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                              }`}
                            >
                              {dayPct}%
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
      )}
    </div>
  );
}
