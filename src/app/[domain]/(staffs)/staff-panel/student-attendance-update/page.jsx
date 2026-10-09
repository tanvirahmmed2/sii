'use client';

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import StudentFilterBar from 'src/component/staff/StudentFilterBar';
import StudentFilterEmptyState from 'src/component/staff/StudentFilterEmptyState';

export default function StudentAttendanceUpdatePage() {
  const { getApiEndpoint } = useTenantWebsite();

  const [hasFiltered, setHasFiltered] = useState(false);
  const [filterInfo, setFilterInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [targetDate, setTargetDate] = useState(new Date().toISOString().substring(0, 10));
  const [attendanceRecords, setAttendanceRecords] = useState([]);

  const loadData = async ({ sessionId, classId, sectionId, sessionName, className, sectionName }) => {
    setLoading(true);
    setFilterInfo({ sessionId, classId, sectionId, sessionName, className, sectionName });
    try {
      const params = new URLSearchParams({
        date: targetDate,
        session_id: sessionId,
        class_id: classId,
      });
      if (sectionId) params.set('section_id', sectionId);

      const res = await fetch(getApiEndpoint(`staff/panel/students/attendance?${params.toString()}`));
      const data = await res.json();

      if (res.ok && data.success) {
        const list = (data.payload?.attendance || []).map((item) => ({
          student_id: item.student_id,
          registration_no: item.registration_no,
          roll_no: item.roll_no,
          name: item.name,
          status: item.status || 'present',
          remark: item.remark || '',
        }));

        setAttendanceRecords(list);
        setHasFiltered(true);
        toast.success(`Loaded ${list.length} student attendance logs for ${targetDate}.`);
      } else {
        toast.error(data.error || 'Failed to fetch attendance logs.');
      }
    } catch {
      toast.error('Network error loading attendance logs.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setHasFiltered(false);
    setFilterInfo(null);
    setAttendanceRecords([]);
  };

  const updateStudentStatus = (studentId, status) => {
    setAttendanceRecords((prev) =>
      prev.map((r) => (r.student_id === studentId ? { ...r, status } : r))
    );
  };

  const handleSave = async () => {
    if (!filterInfo || attendanceRecords.length === 0) return;

    setSaving(true);
    try {
      const res = await fetch(getApiEndpoint('staff/panel/students/attendance'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: targetDate,
          class_id: filterInfo.classId,
          section_id: filterInfo.sectionId || null,
          session_id: filterInfo.sessionId || null,
          records: attendanceRecords.map((r) => ({
            student_id: r.student_id,
            status: r.status,
            remark: r.remark,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update attendance.');
      }

      toast.success(data.message || 'Attendance logs updated successfully!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const extraDateFilter = (
    <div>
      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
        Target Date *
      </label>
      <input
        type="date"
        value={targetDate}
        onChange={(e) => setTargetDate(e.target.value)}
        className="w-full text-xs px-2.5 py-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-primary"
      />
    </div>
  );

  return (
    <div className="w-full space-y-4">
      {/* Page Header */}
      <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
          Modify &amp; Update Student Attendance
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Filter by session, class, and section to edit past attendance entries and rectify absent or late marks.
        </p>
      </div>

      {/* Filter Bar */}
      <StudentFilterBar
        onFilter={loadData}
        onReset={handleReset}
        loading={loading}
        extraFilters={extraDateFilter}
        submitLabel="Load Log for Date"
        title="Filter Attendance Log"
        description="Select session, class, section, and date to modify attendance"
      />

      {/* Show Data Only After Filter */}
      {!hasFiltered ? (
        <StudentFilterEmptyState
          icon="✏️"
          title="Filter by Session, Class & Section to Update Attendance"
          description="Please select Academic Session, Class, Section, and Target Date above, then click 'Load Log for Date' to edit attendance records."
        />
      ) : (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-slate-900 dark:text-white">
                Log for {targetDate}:
              </span>
              <span className="text-slate-500">
                {attendanceRecords.length} student records found in {filterInfo?.className} ({filterInfo?.sectionName})
              </span>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 bg-primary hover:bg-primary/90 text-white rounded text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5 self-start sm:self-auto"
            >
              {saving ? 'Updating...' : '💾 Save Attendance Updates'}
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-2xs space-y-3">
            {attendanceRecords.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No attendance entries found for this class and date.
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
                    {attendanceRecords.map((r) => (
                      <tr key={r.student_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-3 py-2 font-mono font-bold text-slate-900 dark:text-white">
                          {r.roll_no || '—'}
                        </td>
                        <td className="px-3 py-2 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          {r.registration_no}
                        </td>
                        <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">
                          {r.name || <span className="text-slate-400 italic">Unnamed</span>}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <select
                            value={r.status}
                            onChange={(e) => updateStudentStatus(r.student_id, e.target.value)}
                            className={`text-xs px-2 py-1 rounded border font-semibold cursor-pointer outline-none ${
                              r.status === 'present'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                                : r.status === 'absent'
                                ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
                                : r.status === 'late'
                                ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
                                : 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800'
                            }`}
                          >
                            <option value="present">Present</option>
                            <option value="absent">Absent</option>
                            <option value="late">Late</option>
                            <option value="leave">Leave</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            placeholder="Add modification note..."
                            value={r.remark}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAttendanceRecords((prev) =>
                                prev.map((item) =>
                                  item.student_id === r.student_id ? { ...item, remark: val } : item
                                )
                              );
                            }}
                            className="w-full text-[11px] px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-primary"
                          />
                        </td>
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
