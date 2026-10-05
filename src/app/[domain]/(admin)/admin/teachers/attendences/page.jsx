'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FiCalendar, FiDownload, FiFileText, FiRefreshCw } from 'react-icons/fi';
import * as XLSX from 'xlsx';

const AdminAttendancesPage = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [monthlyData, setMonthlyData] = useState({ teachersList: [], attendanceLogs: [] });
  const [loading, setLoading] = useState(true);

  const fetchMonthlySheet = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/attendances?month=${selectedMonth}`);
      setMonthlyData({
        teachersList: response.data.paylod?.teachersList || [],
        attendanceLogs: response.data.paylod?.attendanceLogs || []
      });
    } catch (error) {
      toast.error(error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlySheet();
  }, [selectedMonth]);

  const getDaysInMonth = (yearMonthStr) => {
    const [year, month] = yearMonthStr.split('-').map(Number);
    return new Date(year, month, 0).getDate();
  };

  const totalDays = getDaysInMonth(selectedMonth);
  const daysArray = Array.from({ length: totalDays }, (_, i) => i + 1);

  const formatDayDate = (dayNum) => {
    const d = String(dayNum).padStart(2, '0');
    return `${selectedMonth}-${d}`;
  };

  const handleExportMonthlyXLSX = () => {
    if (monthlyData.teachersList.length === 0) {
      toast.error('No records to export.');
      return;
    }

    const rows = monthlyData.teachersList.map((teacher) => {
      const teacherLogs = monthlyData.attendanceLogs.filter((l) => l.teacher_id === teacher.teacher_id);
      let p = 0, lCount = 0, a = 0, v = 0;

      const rowObj = {
        'Teacher Name': teacher.name,
        'Email': teacher.email,
        'Designation': teacher.designation || 'Teacher'
      };

      for (let day = 1; day <= totalDays; day++) {
        const dateStr = formatDayDate(day);
        const log = teacherLogs.find((l) => {
          const lDate = l.date ? new Date(l.date).toISOString().split('T')[0] : '';
          return lDate === dateStr;
        });

        if (log) {
          if (log.status === 'Present') { rowObj[`Day ${day}`] = 'P'; p++; }
          else if (log.status === 'Late') { rowObj[`Day ${day}`] = 'L'; lCount++; }
          else if (log.status === 'Absent') { rowObj[`Day ${day}`] = 'A'; a++; }
          else if (log.status === 'On Leave') { rowObj[`Day ${day}`] = 'V'; v++; }
          else { rowObj[`Day ${day}`] = '-'; }
        } else {
          rowObj[`Day ${day}`] = '-';
        }
      }

      rowObj['Total Present'] = p;
      rowObj['Total Late'] = lCount;
      rowObj['Total Absent'] = a;
      rowObj['Total Leave'] = v;

      return rowObj;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Teacher_Attendance');
    XLSX.writeFile(workbook, `Teacher_Attendance_${selectedMonth}.xlsx`);
    toast.success('Downloaded XLSX sheet!');
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <FiCalendar className="text-primary" /> Teacher Monthly Attendance
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monthly sheet matrix for teacher attendance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/teachers/attendences/record"
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-xs font-medium shadow-2xs transition-colors"
          >
            <FiFileText className="text-xs" /> Record via XLSX
          </Link>

          <button
            onClick={handleExportMonthlyXLSX}
            disabled={loading || monthlyData.teachersList.length === 0}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium shadow-2xs transition-colors disabled:opacity-50"
          >
            <FiDownload className="text-xs" /> Download XLSX
          </button>
        </div>
      </div>

      {/* Simple Control Bar */}
      <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600">Month:</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-600 font-medium">
          <span><strong className="text-emerald-600">P</strong> = Present</span>
          <span><strong className="text-amber-600">L</strong> = Late</span>
          <span><strong className="text-rose-600">A</strong> = Absent</span>
          <span><strong className="text-blue-600">V</strong> = Leave</span>

          <button
            onClick={fetchMonthlySheet}
            disabled={loading}
            className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
            title="Refresh"
          >
            <FiRefreshCw className={`text-xs ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        {loading ? (
          <div className="w-full py-12 text-center text-xs text-slate-400">Loading attendance sheet...</div>
        ) : monthlyData.teachersList.length === 0 ? (
          <div className="w-full py-12 text-center text-xs text-slate-400">No teacher attendance records found for {selectedMonth}.</div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-semibold text-slate-500 uppercase">
                  <th className="px-3 py-2 sticky left-0 bg-slate-50 z-10 border-r border-slate-200">Teacher Name</th>
                  {daysArray.map((day) => (
                    <th key={day} className="px-1 py-2 text-center min-w-[24px] border-r border-slate-100">
                      {day}
                    </th>
                  ))}
                  <th className="px-2 py-2 text-center text-emerald-700 font-bold bg-emerald-50/50">P</th>
                  <th className="px-2 py-2 text-center text-amber-700 font-bold bg-amber-50/50">L</th>
                  <th className="px-2 py-2 text-center text-rose-700 font-bold bg-rose-50/50">A</th>
                  <th className="px-2 py-2 text-center text-blue-700 font-bold bg-blue-50/50">V</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthlyData.teachersList.map((teacher) => {
                  const teacherLogs = monthlyData.attendanceLogs.filter((l) => l.teacher_id === teacher.teacher_id);
                  let p = 0, lCount = 0, a = 0, v = 0;

                  return (
                    <tr key={teacher.teacher_id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-3 py-2 whitespace-nowrap font-medium text-slate-800 sticky left-0 bg-white z-10 border-r border-slate-200">
                        {teacher.name}
                      </td>

                      {daysArray.map((day) => {
                        const dateStr = formatDayDate(day);
                        const log = teacherLogs.find((l) => {
                          const lDate = l.date ? new Date(l.date).toISOString().split('T')[0] : '';
                          return lDate === dateStr;
                        });

                        let code = '-';
                        let colorClass = 'text-slate-300';

                        if (log) {
                          if (log.status === 'Present') { code = 'P'; colorClass = 'text-emerald-700 font-bold bg-emerald-50'; p++; }
                          else if (log.status === 'Late') { code = 'L'; colorClass = 'text-amber-700 font-bold bg-amber-50'; lCount++; }
                          else if (log.status === 'Absent') { code = 'A'; colorClass = 'text-rose-700 font-bold bg-rose-50'; a++; }
                          else if (log.status === 'On Leave') { code = 'V'; colorClass = 'text-blue-700 font-bold bg-blue-50'; v++; }
                        }

                        return (
                          <td key={day} className="px-0.5 py-1 text-center border-r border-slate-100">
                            <span className={`inline-block w-4 h-4 leading-4 rounded text-[10px] ${colorClass}`}>
                              {code}
                            </span>
                          </td>
                        );
                      })}

                      <td className="px-2 py-2 text-center font-bold text-emerald-700 bg-emerald-50/30">{p}</td>
                      <td className="px-2 py-2 text-center font-bold text-amber-700 bg-amber-50/30">{lCount}</td>
                      <td className="px-2 py-2 text-center font-bold text-rose-700 bg-rose-50/30">{a}</td>
                      <td className="px-2 py-2 text-center font-bold text-blue-700 bg-blue-50/30">{v}</td>
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
};

export default AdminAttendancesPage;
