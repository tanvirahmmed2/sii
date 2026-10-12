'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  FiCalendar,
  FiSave,
  FiLayers,
  FiClock,
  FiInfo,
  FiRefreshCw,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
} from 'react-icons/fi';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const AttendanceRecordForm = () => {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dayName, setDayName] = useState('');
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [slotsError, setSlotsError] = useState('');
  const [saveResult, setSaveResult] = useState(null);

  const [students, setStudents] = useState([]);

  // On date change: derive day name + fetch teacher's scheduled slots
  useEffect(() => {
    if (!date) {
      setDayName('');
      setSlots([]);
      setSelectedSlot(null);
      setStudents([]);
      setSlotsError('');
      setSaveResult(null);
      return;
    }

    const [year, month, day] = date.split('-').map(Number);
    const localDate = new Date(year, month - 1, day);
    const name = DAY_NAMES[localDate.getDay()];
    setDayName(name);

    setSlots([]);
    setSelectedSlot(null);
    setStudents([]);
    setSlotsError('');
    setSaveResult(null);

    const fetchSlots = async () => {
      setLoadingSlots(true);
      try {
        const res = await fetch(`/api/teacher/attendance-dropdowns?date=${date}`);
        const data = await res.json();
        if (res.ok && data.success) {
          const fetchedSlots = data.paylod.slots || [];
          setSlots(fetchedSlots);
          if (fetchedSlots.length === 0) {
            setSlotsError(`No scheduled periods found for ${name}.`);
          }
        } else {
          setSlotsError(data.message || 'Failed to fetch periods.');
        }
      } catch {
        setSlotsError('Could not load your scheduled periods. Please try again.');
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [date]);

  const slotKey = (slot) =>
    `${slot.class_id}-${slot.section_id ?? 'null'}-${slot.subject_id}-${slot.period_id}`;

  const slotLabel = (slot) => {
    const time =
      slot.period_start_time && slot.period_end_time
        ? ` (${slot.period_start_time} – ${slot.period_end_time})`
        : '';
    const section = slot.section_name ? `, Sec ${slot.section_name}` : '';
    return `${slot.period_name}${time} — ${slot.subject_name} · Class ${slot.class_name}${section}`;
  };

  const handleSlotChange = (e) => {
    const key = e.target.value;
    const slot = slots.find((s) => slotKey(s) === key) || null;
    setSelectedSlot(slot);
    setStudents([]);
    setSaveResult(null);
  };

  const handleLoadSheet = async () => {
    if (!selectedSlot || !date) {
      toast.error('Please select a date and period slot first.');
      return;
    }

    setLoadingStudents(true);
    setSaveResult(null);
    try {
      const params = new URLSearchParams({
        class_id: selectedSlot.class_id,
        subject_id: selectedSlot.subject_id,
        period_id: selectedSlot.period_id,
        date,
      });
      if (selectedSlot.section_id) params.append('section_id', selectedSlot.section_id);

      const res = await fetch(`/api/teacher/attendence?${params.toString()}`);
      const data = await res.json();

      if (res.ok && data.success) {
        setStudents(data.paylod.attendanceSheet || []);
        toast.success(`Loaded ${data.paylod.attendanceSheet?.length || 0} students.`);
      } else {
        toast.error(data.message || 'Failed to load attendance sheet.');
      }
    } catch {
      toast.error('An error occurred while loading students.');
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleStatusChange = (studentId, status) => {
    setStudents((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, status } : s))
    );
  };

  const handleRemarksChange = (studentId, remarks) => {
    setStudents((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, remarks } : s))
    );
  };

  // Mark all as a given status at once
  const markAll = (status) => {
    setStudents((prev) => prev.map((s) => ({ ...s, status })));
    toast.success(`All students marked as ${status}.`);
  };

  const handleSaveAttendance = async () => {
    if (!selectedSlot || students.length === 0) {
      toast.error('No students to save.');
      return;
    }

    setSaving(true);
    setSaveResult(null);
    try {
      const records = students.map((s) => ({
        student_id: s.student_id,
        status: s.status,
        remarks: s.remarks || null,
      }));

      const res = await fetch('/api/teacher/attendence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: selectedSlot.class_id,
          section_id: selectedSlot.section_id || null,
          subject_id: selectedSlot.subject_id,
          period_id: selectedSlot.period_id,
          date,
          records,
        }),
      });

      const resData = await res.json();

      if (res.ok && resData.success) {
        setSaveResult({ success: true, data: resData.paylod, message: resData.message });
        toast.success(resData.message || 'Attendance saved successfully!');
      } else {
        toast.error(resData.message || 'Failed to save attendance.');
      }
    } catch {
      toast.error('An error occurred while saving attendance.');
    } finally {
      setSaving(false);
    }
  };

  const presentCount = students.filter((s) => s.status === 'Present').length;
  const absentCount = students.filter((s) => s.status === 'Absent').length;
  const lateCount = students.filter((s) => s.status === 'Late').length;

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* Step 1 + 2: Date & Slot */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 flex flex-col md:flex-row items-end gap-4">
        {/* Date */}
        <div className="w-full md:w-52 flex flex-col gap-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <FiCalendar className="text-xs" /> Step 1 — Pick Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-semibold text-slate-700 outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Day badge */}
        {dayName && (
          <div className="flex items-center gap-2 px-4 py-3 bg-primary-light border border-primary-light rounded-2xl shrink-0">
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Day</span>
            <span className="text-sm font-semibold text-primary">{dayName}</span>
          </div>
        )}

        {/* Period Slot */}
        <div className="flex-1 w-full flex flex-col gap-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <FiClock className="text-xs" /> Step 2 — Select Period
          </label>
          <select
            value={selectedSlot ? slotKey(selectedSlot) : ''}
            onChange={handleSlotChange}
            disabled={loadingSlots || slots.length === 0}
            className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-semibold text-slate-700 outline-none focus:border-primary transition-colors disabled:opacity-60"
          >
            <option value="">
              {loadingSlots
                ? 'Loading periods...'
                : slots.length === 0 && dayName
                ? `No periods scheduled for ${dayName}`
                : '-- Select Period Slot --'}
            </option>
            {slots.map((slot) => (
              <option key={slotKey(slot)} value={slotKey(slot)}>
                {slotLabel(slot)}
              </option>
            ))}
          </select>
          {slotsError && !loadingSlots && (
            <p className="text-[11px] text-rose-500 font-semibold flex items-center gap-1">
              <FiInfo className="text-xs" /> {slotsError}
            </p>
          )}
        </div>

        {/* Load Button */}
        <button
          onClick={handleLoadSheet}
          disabled={!selectedSlot || loadingStudents}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary-dark text-secondary disabled:bg-slate-100 disabled:text-slate-400 rounded-2xl text-sm font-bold shadow-md transition-all cursor-pointer whitespace-nowrap min-w-[120px]"
        >
          {loadingStudents ? (
            <div className="loader loader-sm" />
          ) : (
            <>
              <FiRefreshCw className="text-sm" />
              <span>Load Sheet</span>
            </>
          )}
        </button>
      </div>

      {/* Selected slot info */}
      {selectedSlot && (
        <div className="flex flex-wrap gap-2.5 -mt-4">
          <span className="px-3 py-1.5 bg-primary-light text-primary text-[11px] font-bold rounded-xl border border-primary-light">
            📚 {selectedSlot.subject_name} ({selectedSlot.subject_code})
          </span>
          <span className="px-3 py-1.5 bg-slate-50 text-slate-600 text-[11px] font-bold rounded-xl border border-slate-100">
            🏫 Class {selectedSlot.class_name}
            {selectedSlot.section_name ? `, Sec ${selectedSlot.section_name}` : ''}
          </span>
          <span className="px-3 py-1.5 bg-slate-50 text-slate-600 text-[11px] font-bold rounded-xl border border-slate-100">
            ⏱ {selectedSlot.period_name} · {selectedSlot.period_start_time} – {selectedSlot.period_end_time}
          </span>
          <span className="px-3 py-1.5 bg-slate-50 text-slate-600 text-[11px] font-bold rounded-xl border border-slate-100">
            📅 {date} ({dayName})
          </span>
        </div>
      )}

      {/* Save Result Banner */}
      {saveResult?.success && (
        <div className="flex items-start gap-3 p-4 bg-primary-light border border-primary-light rounded-2xl">
          <FiCheckCircle className="text-primary text-xl shrink-0 mt-0.5" />
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-bold text-primary">{saveResult.message}</span>
            {saveResult.data?.errors?.length > 0 && (
              <ul className="mt-1 flex flex-col gap-0.5">
                {saveResult.data.errors.map((e, i) => (
                  <li key={i} className="text-xs text-amber-700 font-semibold">⚠ {e}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Attendance Table or Empty State */}
      {students.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center flex flex-col items-center justify-center min-h-[260px]">
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 mb-4">
            <FiLayers className="text-3xl" />
          </div>
          <h3 className="font-bold text-slate-800 text-base mb-1">No Attendance Sheet Loaded</h3>
          <p className="text-slate-400 text-xs font-medium max-w-xs">
            Select a date and one of your scheduled period slots, then click{' '}
            <span className="font-bold text-primary">Load Sheet</span> to start marking attendance.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 gap-4 flex-wrap">
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Roll Call — {students.length} Students
              </h2>
              <div className="flex gap-2 mt-1.5 flex-wrap">
                <span className="text-[11px] font-bold px-2.5 py-1 bg-primary-light text-primary rounded-lg border border-primary-light">
                  ✓ Present: {presentCount}
                </span>
                <span className="text-[11px] font-bold px-2.5 py-1 bg-rose-50 text-rose-600 rounded-lg border border-rose-100">
                  ✗ Absent: {absentCount}
                </span>
                <span className="text-[11px] font-bold px-2.5 py-1 bg-amber-50 text-amber-600 rounded-lg border border-amber-100">
                  ⧗ Late: {lateCount}
                </span>
              </div>
            </div>

            {/* Bulk actions + Save */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mark all:</span>
              {['Present', 'Absent', 'Late'].map((s) => (
                <button
                  key={s}
                  onClick={() => markAll(s)}
                  className={`px-3 py-1.5 border rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    s === 'Present'
                      ? 'border-primary-light text-primary hover:bg-primary-light'
                      : s === 'Absent'
                      ? 'border-rose-200 text-rose-600 hover:bg-rose-50'
                      : 'border-amber-200 text-amber-600 hover:bg-amber-50'
                  }`}
                >
                  {s}
                </button>
              ))}
              <button
                onClick={handleSaveAttendance}
                disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-primary hover:bg-primary-dark disabled:bg-slate-100 text-secondary disabled:text-slate-400 rounded-2xl text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                <FiSave className="text-sm" />
                <span>{saving ? 'Saving...' : 'Save Attendance'}</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-3 text-xs font-bold text-slate-400 uppercase tracking-widest w-10">#</th>
                  <th className="pb-3 text-xs font-bold text-slate-400 uppercase tracking-widest">Student</th>
                  <th className="pb-3 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Status</th>
                  <th className="pb-3 text-xs font-bold text-slate-400 uppercase tracking-widest">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, index) => (
                  <tr
                    key={student.student_id}
                    className="border-b border-slate-50 hover:bg-slate-50/40 transition-colors group"
                  >
                    <td className="py-3.5 text-xs text-slate-400 font-bold">{index + 1}</td>
                    <td className="py-3.5">
                      <p className="text-sm font-bold text-slate-800">{student.student_name}</p>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Reg: {student.registration_number}
                      </span>
                    </td>
                    <td className="py-3.5">
                      <div className="flex items-center justify-center gap-1.5">
                        {['Present', 'Absent', 'Late'].map((status) => {
                          const isSelected = student.status === status;
                          let theme =
                            'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50';
                          if (isSelected) {
                            if (status === 'Present')
                              theme =
                                'bg-primary border-primary text-secondary shadow-xs';
                            if (status === 'Absent')
                              theme = 'bg-rose-600 border-rose-600 text-white shadow-xs';
                            if (status === 'Late')
                              theme =
                                'bg-amber-500 border-amber-500 text-white shadow-xs';
                          }
                          return (
                            <button
                              key={status}
                              onClick={() => handleStatusChange(student.student_id, status)}
                              className={`px-3 py-1.5 border rounded-xl text-xs font-bold transition-all cursor-pointer ${theme}`}
                            >
                              {status}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                    <td className="py-3.5 pr-2">
                      <input
                        type="text"
                        value={student.remarks || ''}
                        onChange={(e) => handleRemarksChange(student.student_id, e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-primary transition-colors"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom Save */}
          <div className="flex justify-end pt-2 border-t border-slate-100">
            <button
              onClick={handleSaveAttendance}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-dark disabled:bg-slate-100 text-secondary disabled:text-slate-400 rounded-2xl text-sm font-bold transition-all shadow-md cursor-pointer"
            >
              <FiSave className="text-sm" />
              <span>{saving ? 'Saving...' : 'Save All Attendance Records'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceRecordForm;
