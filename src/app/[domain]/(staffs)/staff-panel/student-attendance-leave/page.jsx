'use client';

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import StudentFilterBar from 'src/component/staff/StudentFilterBar';
import StudentFilterEmptyState from 'src/component/staff/StudentFilterEmptyState';

export default function StudentAttendanceLeavePage() {
  const { getApiEndpoint } = useTenantWebsite();

  const [hasFiltered, setHasFiltered] = useState(false);
  const [filterInfo, setFilterInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);

  // Leave Entry State
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [leaveDate, setLeaveDate] = useState(new Date().toISOString().substring(0, 10));
  const [leaveReason, setLeaveReason] = useState('Medical Leave');
  const [leaveNotes, setLeaveNotes] = useState('');
  const [submittingLeave, setSubmittingLeave] = useState(false);

  const loadData = async ({ sessionId, classId, sectionId, sessionName, className, sectionName }) => {
    setLoading(true);
    setFilterInfo({ sessionId, classId, sectionId, sessionName, className, sectionName });
    try {
      const params = new URLSearchParams({ session_id: sessionId, class_id: classId });
      if (sectionId) params.set('section_id', sectionId);

      const res = await fetch(getApiEndpoint(`staff/panel/students?${params.toString()}`));
      const data = await res.json();

      if (res.ok && data.success) {
        const list = data.payload?.students || [];
        setStudents(list);
        if (list[0]) setSelectedStudentId(String(list[0].id));
        setHasFiltered(true);
        toast.success(`Loaded ${list.length} students in this class/section.`);
      } else {
        toast.error(data.error || 'Failed to fetch students.');
      }
    } catch {
      toast.error('Network error loading students.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setHasFiltered(false);
    setFilterInfo(null);
    setStudents([]);
    setSelectedStudentId('');
  };

  const handleRecordLeave = async (e) => {
    e.preventDefault();
    if (!selectedStudentId) {
      toast.error('Please select a student.');
      return;
    }

    setSubmittingLeave(true);
    try {
      const res = await fetch(getApiEndpoint('staff/panel/students/attendance'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: leaveDate,
          class_id: filterInfo?.classId,
          section_id: filterInfo?.sectionId || null,
          session_id: filterInfo?.sessionId || null,
          records: [
            {
              student_id: selectedStudentId,
              status: 'leave',
              remark: `${leaveReason}: ${leaveNotes}`.trim(),
            },
          ],
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to record leave.');
      }

      toast.success(`Leave recorded for student on ${leaveDate}!`);
      setLeaveNotes('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmittingLeave(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Page Header */}
      <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
          Student Leave Management &amp; Excusal Input
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Filter by session, class, and section to authorize excused absences and record official medical/family leaves.
        </p>
      </div>

      {/* Filter Bar */}
      <StudentFilterBar
        onFilter={loadData}
        onReset={handleReset}
        loading={loading}
        title="Filter Roster for Leave Input"
        description="Select session, class, and section to record student leave"
      />

      {/* Show Data Only After Filter */}
      {!hasFiltered ? (
        <StudentFilterEmptyState
          icon="📝"
          title="Filter by Session, Class & Section to Manage Leaves"
          description="Please select Academic Session, Class, and Section above, then click 'View Data' to grant and record student leaves."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Leave Input Form */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-2xs space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Record Leave for Student
              </h3>
              <p className="text-[11px] text-slate-500">
                Grant authorized leave for enrolled student in {filterInfo?.className}
              </p>
            </div>

            <form onSubmit={handleRecordLeave} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Student *
                </label>
                <select
                  required
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-primary cursor-pointer"
                >
                  <option value="">Select Student</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.roll_no ? `[Roll: ${s.roll_no}] ` : ''}{s.name || 'Unnamed'} (Reg: {s.registration_no})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Leave Date *
                </label>
                <input
                  type="date"
                  required
                  value={leaveDate}
                  onChange={(e) => setLeaveDate(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Absence
                </label>
                <select
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-primary cursor-pointer"
                >
                  <option value="Medical Leave">Medical / Sick Leave</option>
                  <option value="Family Emergency">Family Emergency</option>
                  <option value="Religious Observance">Religious Observance</option>
                  <option value="Official Institutional Representation">Institutional Representation</option>
                  <option value="Other Excused Reason">Other Excused Reason</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Additional Notes &amp; Parent Approval Remark
                </label>
                <textarea
                  rows={2}
                  value={leaveNotes}
                  onChange={(e) => setLeaveNotes(e.target.value)}
                  placeholder="e.g. Doctor certificate submitted by father..."
                  className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={submittingLeave || students.length === 0}
                  className="px-5 py-2 bg-primary hover:bg-primary/90 text-white rounded text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {submittingLeave ? 'Recording...' : '📝 Submit Leave Entry'}
                </button>
              </div>
            </form>
          </div>

          {/* Roster overview for reference */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Eligible Students Roster ({students.length})
            </h3>
            <div className="max-h-80 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-500 sticky top-0">
                  <tr>
                    <th className="px-3 py-2">Roll</th>
                    <th className="px-3 py-2">Reg No</th>
                    <th className="px-3 py-2">Student Name</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {students.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => setSelectedStudentId(String(s.id))}
                      className={`cursor-pointer transition-colors ${
                        selectedStudentId === String(s.id)
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="px-3 py-1.5 font-mono">{s.roll_no || '—'}</td>
                      <td className="px-3 py-1.5 font-mono text-[11px]">{s.registration_no}</td>
                      <td className="px-3 py-1.5 truncate">{s.name || 'Unnamed'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
