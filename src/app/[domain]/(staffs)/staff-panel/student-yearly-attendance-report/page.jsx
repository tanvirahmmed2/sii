'use client';

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import StudentFilterBar from 'src/component/staff/StudentFilterBar';
import StudentFilterEmptyState from 'src/component/staff/StudentFilterEmptyState';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function StudentYearlyAttendanceReportPage() {
  const { getApiEndpoint } = useTenantWebsite();

  const [hasFiltered, setHasFiltered] = useState(false);
  const [filterInfo, setFilterInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [targetYear, setTargetYear] = useState(String(new Date().getFullYear()));
  const [students, setStudents] = useState([]);
  const [studentSummaries, setStudentSummaries] = useState([]);
  const [dailySummaries, setDailySummaries] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('students'); // 'students' | 'monthly'

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear + 1, currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4];

  const loadData = async ({ sessionId, classId, sectionId, sessionName, className, sectionName }) => {
    setLoading(true);
    setFilterInfo({ sessionId, classId, sectionId, sessionName, className, sectionName });
    try {
      const [attRes, stuRes] = await Promise.all([
        fetch(
          getApiEndpoint(
            `staff/panel/students/attendance?year=${targetYear}&session_id=${sessionId}&class_id=${classId}${
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

      const stuList = stuRes?.payload?.students || [];
      const sumList = attRes?.payload?.summary || [];
      const stuSums = attRes?.payload?.student_summaries || [];

      setStudents(stuList);
      setDailySummaries(sumList);
      setStudentSummaries(stuSums);
      setHasFiltered(true);
      toast.success(`Generated annual attendance report for ${targetYear}.`);
    } catch {
      toast.error('Network error loading annual attendance report.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setHasFiltered(false);
    setFilterInfo(null);
    setStudents([]);
    setStudentSummaries([]);
    setDailySummaries([]);
    setSearchTerm('');
  };

  const extraYearFilter = (
    <div>
      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
        Academic Year *
      </label>
      <select
        value={targetYear}
        onChange={(e) => setTargetYear(e.target.value)}
        className="w-full text-xs px-2.5 py-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-primary cursor-pointer"
      >
        {yearOptions.map((yr) => (
          <option key={yr} value={yr}>
            {yr}
          </option>
        ))}
      </select>
    </div>
  );

  // Map student_id -> stats
  const statsMap = {};
  studentSummaries.forEach((s) => {
    statsMap[s.student_id] = {
      present: parseInt(s.present_count || 0, 10),
      absent: parseInt(s.absent_count || 0, 10),
      late: parseInt(s.late_count || 0, 10),
      leave: parseInt(s.leave_count || 0, 10),
      total: parseInt(s.total_days || 0, 10),
    };
  });

  // Calculate distinct recorded instructional dates
  const distinctDates = new Set(dailySummaries.map((s) => String(s.date).substring(0, 10)));
  const totalDaysHeld = distinctDates.size;

  // Monthly breakdown for selected year (01 to 12)
  const monthlyBreakdown = Array.from({ length: 12 }, (_, i) => {
    const monthNum = String(i + 1).padStart(2, '0');
    const monthKey = `${targetYear}-${monthNum}`;
    const monthEntries = dailySummaries.filter((d) => String(d.date).startsWith(monthKey));
    const datesInMonth = new Set(monthEntries.map((e) => String(e.date).substring(0, 10)));
    const presents = monthEntries
      .filter((e) => e.status === 'present')
      .reduce((acc, curr) => acc + parseInt(curr.count, 10), 0);
    const absents = monthEntries
      .filter((e) => e.status === 'absent')
      .reduce((acc, curr) => acc + parseInt(curr.count, 10), 0);
    const late = monthEntries
      .filter((e) => e.status === 'late')
      .reduce((acc, curr) => acc + parseInt(curr.count, 10), 0);
    const leave = monthEntries
      .filter((e) => e.status === 'leave')
      .reduce((acc, curr) => acc + parseInt(curr.count, 10), 0);
    const totalLogs = presents + absents + late + leave;
    const rate = totalLogs > 0 ? Math.round(((presents + late) / totalLogs) * 100) : 0;

    return {
      monthNum,
      monthName: MONTH_NAMES[i],
      days: datesInMonth.size,
      presents,
      absents,
      late,
      leave,
      rate,
      hasData: datesInMonth.size > 0,
    };
  });

  // Overall metrics
  const totalLogsAll = dailySummaries.reduce((acc, curr) => acc + parseInt(curr.count, 10), 0);
  const totalPresentsAll = dailySummaries
    .filter((e) => e.status === 'present')
    .reduce((acc, curr) => acc + parseInt(curr.count, 10), 0);
  const totalLatesAll = dailySummaries
    .filter((e) => e.status === 'late')
    .reduce((acc, curr) => acc + parseInt(curr.count, 10), 0);
  const overallAnnualRate = totalLogsAll > 0 ? Math.round(((totalPresentsAll + totalLatesAll) / totalLogsAll) * 100) : 0;

  // Filter students by search term
  const filteredStudents = students.filter((s) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (s.name && s.name.toLowerCase().includes(term)) ||
      (s.registration_no && s.registration_no.toLowerCase().includes(term)) ||
      (s.roll_no && String(s.roll_no).toLowerCase().includes(term))
    );
  });

  return (
    <div className="w-full space-y-4">
      {/* Page Header */}
      <div className="pb-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Yearly Student Attendance Report
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Filter by academic session, class, section, and year to examine aggregate annual attendance and individual records.
          </p>
        </div>
        {hasFiltered && (
          <button
            onClick={() => window.print()}
            className="self-start sm:self-auto text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium transition cursor-pointer"
          >
            🖨️ Print Annual Report
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <StudentFilterBar
        onFilter={loadData}
        onReset={handleReset}
        loading={loading}
        extraFilters={extraYearFilter}
        submitLabel="Generate Annual Report"
        title="Annual Attendance Filter"
        description="Select session, class, section, and academic year to compile annual report"
      />

      {/* Show Data Only After Filter */}
      {!hasFiltered ? (
        <StudentFilterEmptyState
          icon="📊"
          title="Filter by Session, Class & Section to View Annual Report"
          description="Please select the Academic Session, Class, Section, and Year in the filter above, then click 'Generate Annual Report' to inspect results."
        />
      ) : (
        <div className="space-y-4">
          {/* Annual KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-2xs">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Academic Year</span>
              <span className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-1 block">{targetYear}</span>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-2xs">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Enrolled Students</span>
              <span className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-1 block">{students.length}</span>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-2xs">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Instructional Days</span>
              <span className="text-lg font-bold font-mono text-blue-600 mt-1 block">{totalDaysHeld} Days</span>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-2xs">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Annual Attendance Rate</span>
              <span className={`text-lg font-bold font-mono mt-1 block ${
                overallAnnualRate >= 80 ? 'text-emerald-600' : overallAnnualRate >= 60 ? 'text-amber-600' : 'text-rose-600'
              }`}>
                {overallAnnualRate}%
              </span>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <button
              onClick={() => setActiveTab('students')}
              className={`text-xs px-3 py-1.5 rounded font-medium transition cursor-pointer ${
                activeTab === 'students'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Student Annual Dossier ({students.length})
            </button>
            <button
              onClick={() => setActiveTab('monthly')}
              className={`text-xs px-3 py-1.5 rounded font-medium transition cursor-pointer ${
                activeTab === 'monthly'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Monthly Aggregate Breakdown
            </button>
          </div>

          {/* Student Dossier Tab */}
          {activeTab === 'students' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Annual Attendance Summary: {filterInfo?.className} ({filterInfo?.sectionName}) - Year {targetYear}
                </h3>
                <input
                  type="text"
                  placeholder="Search student name, reg, roll..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="text-xs px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none w-full sm:w-64"
                />
              </div>

              {filteredStudents.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No students found matching your criteria.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                  <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                      <tr>
                        <th className="px-3 py-2.5">Roll</th>
                        <th className="px-3 py-2.5">Reg No</th>
                        <th className="px-3 py-2.5">Student Name</th>
                        <th className="px-3 py-2.5 text-center">Present Days</th>
                        <th className="px-3 py-2.5 text-center">Absent Days</th>
                        <th className="px-3 py-2.5 text-center">Late</th>
                        <th className="px-3 py-2.5 text-center">Leave</th>
                        <th className="px-3 py-2.5 text-right">Annual Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredStudents.map((st) => {
                        const sStat = statsMap[st.id] || { present: 0, absent: 0, late: 0, leave: 0, total: 0 };
                        const sTotal = sStat.total;
                        const sRate = sTotal > 0 ? Math.round(((sStat.present + sStat.late) / sTotal) * 100) : 0;

                        return (
                          <tr key={st.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="px-3 py-2 font-mono font-medium text-slate-900 dark:text-white">
                              {st.roll_no || '—'}
                            </td>
                            <td className="px-3 py-2 font-mono text-slate-600 dark:text-slate-400">
                              {st.registration_no}
                            </td>
                            <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">
                              {st.name || <span className="italic text-slate-400">No Name</span>}
                            </td>
                            <td className="px-3 py-2 text-center font-mono text-emerald-600 font-semibold">
                              {sStat.present}
                            </td>
                            <td className="px-3 py-2 text-center font-mono text-rose-600 font-semibold">
                              {sStat.absent}
                            </td>
                            <td className="px-3 py-2 text-center font-mono text-amber-600">
                              {sStat.late}
                            </td>
                            <td className="px-3 py-2 text-center font-mono text-blue-600">
                              {sStat.leave}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {sTotal === 0 ? (
                                <span className="text-[10px] text-slate-400 italic">No records</span>
                              ) : (
                                <span
                                  className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                                    sRate >= 80
                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                      : sRate >= 60
                                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                                  }`}
                                >
                                  {sRate}%
                                </span>
                              )}
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

          {/* Monthly Aggregate Tab */}
          {activeTab === 'monthly' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-2xs space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                12-Month Calendar Analysis for Year {targetYear}
              </h3>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                    <tr>
                      <th className="px-3 py-2.5">Month</th>
                      <th className="px-3 py-2.5 text-center">Days Held</th>
                      <th className="px-3 py-2.5 text-center">Total Presents</th>
                      <th className="px-3 py-2.5 text-center">Total Absences</th>
                      <th className="px-3 py-2.5 text-center">Total Late</th>
                      <th className="px-3 py-2.5 text-center">Total Leaves</th>
                      <th className="px-3 py-2.5 text-right">Average Attendance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {monthlyBreakdown.map((m) => (
                      <tr key={m.monthNum} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">
                          {m.monthName} ({m.monthNum})
                        </td>
                        <td className="px-3 py-2 text-center font-mono text-slate-700 dark:text-slate-300">
                          {m.days}
                        </td>
                        <td className="px-3 py-2 text-center font-mono text-emerald-600 font-semibold">
                          {m.presents}
                        </td>
                        <td className="px-3 py-2 text-center font-mono text-rose-600 font-semibold">
                          {m.absents}
                        </td>
                        <td className="px-3 py-2 text-center font-mono text-amber-600">
                          {m.late}
                        </td>
                        <td className="px-3 py-2 text-center font-mono text-blue-600">
                          {m.leave}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {m.days === 0 ? (
                            <span className="text-[10px] text-slate-400 italic">No classes held</span>
                          ) : (
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                                m.rate >= 80
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                  : m.rate >= 60
                                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                              }`}
                            >
                              {m.rate}%
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
