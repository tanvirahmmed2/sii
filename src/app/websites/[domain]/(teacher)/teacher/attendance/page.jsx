'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { FiCalendar, FiSearch, FiRefreshCw, FiFileText, FiDownload } from 'react-icons/fi';
import * as XLSX from 'xlsx';

const AttendanceViewPage = () => {
  // Filters
  const [filterDate, setFilterDate] = useState('');
  const [filterClassId, setFilterClassId] = useState('');
  const [filterSubjectId, setFilterSubjectId] = useState('');
  const [filterPeriodId, setFilterPeriodId] = useState('');

  // Data
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  // Dropdown options
  const [classOptions, setClassOptions] = useState([]);
  const [subjectOptions, setSubjectOptions] = useState([]);
  const [periodOptions, setPeriodOptions] = useState([]);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const res = await fetch('/api/teacher/attendance-dropdowns');
        const data = await res.json();
        if (res.ok && data.success) {
          const { assignments, periods } = data.paylod;

          const classesMap = new Map();
          for (const a of assignments || []) {
            const label = `Class ${a.class_name}${a.section_name ? ` · Sec ${a.section_name}` : ''}`;
            classesMap.set(a.class_id, label);
          }
          setClassOptions([...classesMap.entries()].map(([id, name]) => ({ id, name })));

          const subjectsMap = new Map();
          for (const a of assignments || []) {
            subjectsMap.set(a.subject_id, `${a.subject_name} (${a.subject_code})`);
          }
          setSubjectOptions([...subjectsMap.entries()].map(([id, name]) => ({ id, name })));

          setPeriodOptions((periods || []).map(p => ({
            id: p.id,
            name: `${p.name} (${p.start_time} – ${p.end_time})`
          })));
        }
      } catch (err) {
        console.error('Failed to load metadata:', err);
      }
    };
    fetchMetadata();
  }, []);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ mode: 'records' });
      if (filterDate) params.append('date', filterDate);
      if (filterClassId) params.append('class_id', filterClassId);
      if (filterSubjectId) params.append('subject_id', filterSubjectId);
      if (filterPeriodId) params.append('period_id', filterPeriodId);

      const res = await fetch(`/api/teacher/attendence?${params.toString()}`);
      const data = await res.json();

      if (res.ok && data.success) {
        setRecords(data.paylod.records || []);
      } else {
        toast.error(data.message || 'Failed to load records.');
      }
    } catch {
      toast.error('Error loading attendance records.');
    } finally {
      setLoading(false);
    }
  }, [filterDate, filterClassId, filterSubjectId, filterPeriodId]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Export records to XLSX
  const handleExportXLSX = () => {
    if (records.length === 0) {
      toast.error('No attendance records to export.');
      return;
    }

    const exportData = records.map((r, i) => ({
      '#': i + 1,
      'Date': r.date ? String(r.date).split('T')[0] : '',
      'Student Name': r.student_name,
      'Registration Number': r.registration_number,
      'Class': `${r.class_name}${r.section_name ? ` (${r.section_name})` : ''}`,
      'Subject': r.subject_name,
      'Period': r.period_name,
      'Status': r.status,
      'Remarks': r.remarks || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance_Records');
    XLSX.writeFile(workbook, `Teacher_Attendance_Records_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Exported attendance records to XLSX!');
  };

  const presentCount = records.filter((r) => r.status === 'Present').length;
  const absentCount = records.filter((r) => r.status === 'Absent').length;
  const lateCount = records.filter((r) => r.status === 'Late').length;
  const leaveCount = records.filter((r) => r.status === 'On Leave').length;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <FiCalendar className="text-primary" /> Teacher Attendance Sheet
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            View attendance logs, download XLSX reports, or record student attendance via XLSX.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/teacher/attendance/record"
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-xs font-medium shadow-2xs transition-colors"
          >
            <FiFileText className="text-xs" /> Record via XLSX
          </Link>

          <button
            onClick={handleExportXLSX}
            disabled={loading || records.length === 0}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium shadow-2xs transition-colors disabled:opacity-50"
          >
            <FiDownload className="text-xs" /> Export XLSX
          </button>
        </div>
      </div>

      {/* Simple Controls & Filters */}
      <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full sm:w-auto">
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-primary cursor-pointer"
          />

          <select
            value={filterClassId}
            onChange={(e) => setFilterClassId(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-primary"
          >
            <option value="">— All Classes —</option>
            {classOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={filterSubjectId}
            onChange={(e) => setFilterSubjectId(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-primary"
          >
            <option value="">— All Subjects —</option>
            {subjectOptions.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <select
            value={filterPeriodId}
            onChange={(e) => setFilterPeriodId(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-primary"
          >
            <option value="">— All Periods —</option>
            {periodOptions.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-600 font-medium self-end sm:self-auto">
          <span><strong className="text-emerald-600">P:</strong> {presentCount}</span>
          <span><strong className="text-amber-600">L:</strong> {lateCount}</span>
          <span><strong className="text-rose-600">A:</strong> {absentCount}</span>
          <span><strong className="text-blue-600">V:</strong> {leaveCount}</span>

          <button
            onClick={fetchRecords}
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
          <div className="w-full py-12 text-center text-xs text-slate-400">Loading attendance records...</div>
        ) : records.length === 0 ? (
          <div className="w-full py-12 text-center text-xs text-slate-400">No attendance records found.</div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-semibold text-slate-500 uppercase">
                  <th className="px-3 py-2 text-center w-10">#</th>
                  <th className="px-3 py-2">Student Name</th>
                  <th className="px-3 py-2">Reg. Number</th>
                  <th className="px-3 py-2">Class</th>
                  <th className="px-3 py-2">Subject</th>
                  <th className="px-3 py-2">Period</th>
                  <th className="px-3 py-2 text-center">Status</th>
                  <th className="px-3 py-2">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((r, i) => (
                  <tr key={r.id || i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-3 py-2 text-center text-slate-400 font-medium">{i + 1}</td>
                    <td className="px-3 py-2 font-medium text-slate-800">{r.student_name}</td>
                    <td className="px-3 py-2 text-slate-500 font-mono text-[11px]">{r.registration_number}</td>
                    <td className="px-3 py-2 text-slate-600">{r.class_name}{r.section_name ? ` · ${r.section_name}` : ''}</td>
                    <td className="px-3 py-2 text-slate-600">{r.subject_name}</td>
                    <td className="px-3 py-2 text-slate-600">{r.period_name}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                        r.status === 'Present' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                        r.status === 'Late' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                        r.status === 'On Leave' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                        'bg-rose-50 text-rose-700 border border-rose-100'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-500 font-mono text-[11px]">
                      {r.date ? String(r.date).split('T')[0] : ''}
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

export default AttendanceViewPage;
