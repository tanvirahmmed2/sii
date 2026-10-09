/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiCalendar,
  FiRefreshCw,
  FiCheck,
  FiX,
  FiSave,
  FiArrowLeft,
  FiUsers,
  FiCheckSquare
} from 'react-icons/fi';

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present', color: 'bg-emerald-600 text-white border-emerald-600' },
  { value: 'late', label: 'Late', color: 'bg-amber-600 text-white border-amber-600' },
  { value: 'absent', label: 'Absent', color: 'bg-rose-600 text-white border-rose-600' },
  { value: 'half_day', label: 'Half Day', color: 'bg-purple-600 text-white border-purple-600' },
  { value: 'leave', label: 'Leave', color: 'bg-blue-600 text-white border-blue-600' }
];

export default function TeacherAttendanceTakePage() {
  const params = useParams();
  const domain = params?.domain || '';

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [teachers, setTeachers] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    leave: 0,
    unmarked: 0
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState(null);
  const [toastError, setToastError] = useState(null);

  const showToast = useCallback((msg, isErr = false) => {
    if (isErr) {
      setToastError(msg);
      setTimeout(() => setToastError(null), 4000);
    } else {
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 3000);
    }
  }, []);

  // Fetch attendance for selected date
  const fetchAttendance = useCallback(async () => {
    if (!domain || !date) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/${domain}/staff/panel/teacher/attendance?date=${date}`);
      const data = await res.json();
      if (data.success) {
        setTeachers(data.teachers || []);
        if (data.summary) setSummary(data.summary);
      } else {
        showToast(data.error || 'Failed to load attendance roster.', true);
      }
    } catch (err) {
      console.error(err);
      showToast('Error connecting to server.', true);
    } finally {
      setLoading(false);
    }
  }, [domain, date, showToast]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // Update single teacher record in local state
  const handleStatusChange = (teacherId, newStatus) => {
    setTeachers((prev) =>
      prev.map((t) =>
        t.teacher_id === teacherId
          ? {
              ...t,
              status: newStatus,
              in_time: newStatus === 'absent' || newStatus === 'leave' ? '' : (t.in_time || '08:30 AM')
            }
          : t
      )
    );
  };

  const handleTimeChange = (teacherId, field, value) => {
    setTeachers((prev) =>
      prev.map((t) => (t.teacher_id === teacherId ? { ...t, [field]: value } : t))
    );
  };

  const handleRemarkChange = (teacherId, remark) => {
    setTeachers((prev) =>
      prev.map((t) => (t.teacher_id === teacherId ? { ...t, remark } : t))
    );
  };

  // Mark all present
  const markAllPresent = () => {
    setTeachers((prev) =>
      prev.map((t) => ({
        ...t,
        status: 'present',
        in_time: t.in_time || '08:30 AM',
        out_time: t.out_time || '04:00 PM'
      }))
    );
    showToast('All teachers marked as Present. Click "Save Attendance Roster" to persist.');
  };

  // Submit batch
  const handleSaveAttendance = async () => {
    try {
      setSaving(true);
      const records = teachers.map((t) => ({
        teacher_id: t.teacher_id,
        date,
        status: t.status === 'unmarked' ? 'present' : t.status,
        in_time: t.in_time || null,
        out_time: t.out_time || null,
        remark: t.remark || null
      }));

      const res = await fetch(`/api/${domain}/staff/panel/teacher/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records })
      });
      const data = await res.json();

      if (data.success) {
        showToast(data.message || 'Attendance roster saved successfully.');
        fetchAttendance();
      } else {
        showToast(data.error || 'Failed to save attendance.', true);
      }
    } catch (err) {
      console.error(err);
      showToast('Error saving attendance records.', true);
    } finally {
      setSaving(false);
    }
  };

  // Live counts
  const currentPresent = teachers.filter((t) => t.status === 'present').length;
  const currentAbsent = teachers.filter((t) => t.status === 'absent').length;
  const currentLate = teachers.filter((t) => t.status === 'late').length;
  const currentLeave = teachers.filter((t) => t.status === 'leave' || t.status === 'half_day').length;

  return (
    <div className="w-full space-y-4">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded shadow-lg text-xs font-medium animate-in fade-in slide-in-from-top-2">
          <FiCheck className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}
      {toastError && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-rose-600 text-white px-4 py-2.5 rounded shadow-lg text-xs font-medium animate-in fade-in slide-in-from-top-2">
          <FiX className="w-4 h-4" />
          <span>{toastError}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href={`/${domain}/staff-panel/teacher-list`} className="hover:text-slate-900 dark:hover:text-white flex items-center gap-1">
              <FiArrowLeft className="w-3.5 h-3.5" />
              <span>Teacher Directory</span>
            </Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Daily Attendance Log</span>
          </div>
          <h1 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FiCheckCircle className="w-5 h-5 text-emerald-600" />
            <span>Teacher Daily Attendance Tracker</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Log faculty attendance records, punctuality in/out times, and institutional leave statuses.
          </p>
        </div>

        {/* Date Selector & Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Roster Date:</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
            />
          </div>

          <button
            onClick={fetchAttendance}
            className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded border border-slate-300 dark:border-slate-700 transition"
            title="Refresh"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={markAllPresent}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <FiCheckSquare className="w-3.5 h-3.5 text-emerald-600" />
            <span>Mark All Present</span>
          </button>

          <button
            onClick={handleSaveAttendance}
            disabled={saving || loading || teachers.length === 0}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <FiSave className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Attendance Roster'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs">
          <span className="text-[10px] uppercase font-semibold text-slate-400">Total Teachers</span>
          <p className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-1">{teachers.length}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs">
          <span className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400">Present</span>
          <p className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">{currentPresent}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs">
          <span className="text-[10px] uppercase font-semibold text-amber-600 dark:text-amber-400">Late</span>
          <p className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">{currentLate}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs">
          <span className="text-[10px] uppercase font-semibold text-rose-600 dark:text-rose-400">Absent</span>
          <p className="text-lg font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">{currentAbsent}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs">
          <span className="text-[10px] uppercase font-semibold text-blue-600 dark:text-blue-400">Leave / Half-Day</span>
          <p className="text-lg font-bold font-mono text-blue-600 dark:text-blue-400 mt-1">{currentLeave}</p>
        </div>
      </div>

      {/* Attendance Roster Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-4">
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2">Faculty Member</th>
                <th className="px-3 py-2">Designation</th>
                <th className="px-3 py-2 text-center">Status</th>
                <th className="px-3 py-2">In Time</th>
                <th className="px-3 py-2">Out Time</th>
                <th className="px-3 py-2">Remarks / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-slate-400">
                    <FiRefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                    <span>Loading attendance roster...</span>
                  </td>
                </tr>
              ) : teachers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-slate-400">
                    <FiUsers className="w-6 h-6 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                    <p className="font-medium text-slate-600 dark:text-slate-400">No active teachers registered</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Register teachers first to take institutional attendance.
                    </p>
                  </td>
                </tr>
              ) : (
                teachers.map((row) => (
                  <tr key={row.teacher_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Faculty Profile */}
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {row.photo_url ? (
                          <img
                            src={row.photo_url}
                            alt={row.teacher_name}
                            className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 text-xs shrink-0">
                            {row.teacher_name?.charAt(0) || 'T'}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white leading-tight">
                            {row.teacher_name}
                          </p>
                          <p className="text-[10px] text-slate-400">{row.teacher_number || row.teacher_email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Designation */}
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                      {row.designation_title || <span className="text-slate-400 italic">Faculty</span>}
                    </td>

                    {/* Status Toggle Pills */}
                    <td className="px-3 py-2 text-center">
                      <div className="inline-flex rounded border border-slate-200 dark:border-slate-700 overflow-hidden text-[10px]">
                        {STATUS_OPTIONS.map((opt) => {
                          const isSelected = row.status === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => handleStatusChange(row.teacher_id, opt.value)}
                              className={`px-2 py-1 font-medium transition cursor-pointer ${
                                isSelected
                                  ? opt.color
                                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </td>

                    {/* In Time */}
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        placeholder="08:30 AM"
                        value={row.in_time || ''}
                        onChange={(e) => handleTimeChange(row.teacher_id, 'in_time', e.target.value)}
                        className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white w-24 font-mono focus:outline-hidden"
                      />
                    </td>

                    {/* Out Time */}
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        placeholder="04:00 PM"
                        value={row.out_time || ''}
                        onChange={(e) => handleTimeChange(row.teacher_id, 'out_time', e.target.value)}
                        className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white w-24 font-mono focus:outline-hidden"
                      />
                    </td>

                    {/* Remarks */}
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        placeholder="Optional note..."
                        value={row.remark || ''}
                        onChange={(e) => handleRemarkChange(row.teacher_id, e.target.value)}
                        className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white w-full max-w-xs focus:outline-hidden"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Action footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[11px] text-slate-500">
            Roster for {date} • {teachers.length} faculty entries
          </span>
          <button
            onClick={handleSaveAttendance}
            disabled={saving || loading || teachers.length === 0}
            className="flex items-center gap-1.5 px-5 py-2 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <FiSave className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Attendance Roster'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
