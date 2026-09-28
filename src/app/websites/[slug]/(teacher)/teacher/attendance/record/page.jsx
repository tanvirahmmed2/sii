'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
  FiArrowLeft, FiCalendar, FiBook, FiClock, FiDownload,
  FiUploadCloud, FiSave, FiToggleLeft, FiToggleRight
} from 'react-icons/fi';
import * as XLSX from 'xlsx';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const STATUS_CONFIG = {
  Present:  { label: 'P', bg: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  Absent:   { label: 'A', bg: 'bg-rose-50 text-rose-700 border-rose-100' },
  Late:     { label: 'L', bg: 'bg-amber-50 text-amber-700 border-amber-100' },
  'On Leave': { label: 'V', bg: 'bg-blue-50 text-blue-700 border-blue-100' },
};

const ALL_STATUSES = ['Present', 'Absent', 'Late', 'On Leave'];

// ── Status badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Present;
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${cfg.bg}`}>
      {status}
    </span>
  );
};

// ── Status toggle buttons ─────────────────────────────────────────────────────
const StatusToggle = ({ value, onChange }) => (
  <div className="flex gap-1">
    {ALL_STATUSES.map((st) => (
      <button
        key={st}
        type="button"
        onClick={() => onChange(st)}
        className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-colors border ${
          value === st
            ? 'bg-slate-800 text-white border-slate-800'
            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
        }`}
      >
        {STATUS_CONFIG[st].label}
      </button>
    ))}
  </div>
);

// ── Main page ─────────────────────────────────────────────────────────────────
const AttendanceRecordPage = () => {
  const [tab, setTab] = useState('manual'); // 'manual' | 'sheet'

  // Shared selectors
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dayName, setDayName] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [classOptions, setClassOptions] = useState([]);
  const [selectedClassKey, setSelectedClassKey] = useState('');
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);
  const [dropdownError, setDropdownError] = useState('');

  // Manual mode state
  const [studentRows, setStudentRows] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sheet mode state
  const [parsedRecords, setParsedRecords] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [sheetSaving, setSheetSaving] = useState(false);
  const fileInputRef = useRef(null);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const selectedClassObj = classOptions.find((c) => c.key === selectedClassKey) || null;
  const subjectsForClass = assignments.filter((a) => {
    const key = `${a.class_id}|${a.section_id ?? 'null'}`;
    return key === selectedClassKey;
  });
  const canProceed = selectedClassObj && selectedPeriodId && date;

  // ── Date change ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!date) { setDayName(''); resetSelections(); return; }
    const [y, m, d] = date.split('-').map(Number);
    setDayName(DAY_NAMES[new Date(y, m - 1, d).getDay()]);
    resetSelections();
    fetchDropdowns(date);
  }, [date]);

  // ── Class options ────────────────────────────────────────────────────────────
  useEffect(() => {
    const seen = new Set();
    const opts = [];
    for (const a of assignments) {
      const key = `${a.class_id}|${a.section_id ?? 'null'}`;
      if (!seen.has(key)) {
        seen.add(key);
        opts.push({ key, class_id: a.class_id, class_name: a.class_name, section_id: a.section_id, section_name: a.section_name });
      }
    }
    setClassOptions(opts);
  }, [assignments]);

  const resetSelections = () => {
    setAssignments([]); setPeriods([]); setClassOptions([]);
    setSelectedClassKey(''); setSelectedPeriodId('');
    setStudentRows([]); setParsedRecords([]);
    setDropdownError('');
  };

  const fetchDropdowns = async (dateStr) => {
    setLoadingDropdowns(true); setDropdownError('');
    try {
      const res = await fetch(`/api/teacher/attendance-dropdowns?date=${dateStr}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setAssignments(data.paylod.assignments || []);
        setPeriods(data.paylod.periods || []);
        if ((data.paylod.assignments || []).length === 0)
          setDropdownError(`No classes scheduled for you on ${dayName || 'this day'}.`);
        else if ((data.paylod.periods || []).length === 0)
          setDropdownError('No academic periods found. Ask admin to create periods.');
      } else {
        setDropdownError(data.message || 'Failed to load class/period data.');
      }
    } catch { setDropdownError('Network error loading class/period data.'); }
    finally { setLoadingDropdowns(false); }
  };

  // ── Load students for manual mode when class/period selected ─────────────────
  useEffect(() => {
    if (!selectedClassObj) { setStudentRows([]); return; }
    loadStudents();
  }, [selectedClassKey]);

  const loadStudents = async () => {
    if (!selectedClassObj) return;
    setLoadingStudents(true);
    try {
      const params = new URLSearchParams({ class_id: selectedClassObj.class_id });
      if (selectedClassObj.section_id) params.append('section_id', selectedClassObj.section_id);

      const res = await fetch(`/api/teacher/students-list?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.success) {
        const students = data.paylod.students || [];
        setStudentRows(students.map((s) => ({ ...s, status: 'Present' })));
      } else {
        toast.error(data.message || 'Failed to load students.');
      }
    } catch { toast.error('Error loading student list.'); }
    finally { setLoadingStudents(false); }
  };

  // ── Update single student status ──────────────────────────────────────────────
  const updateStatus = (idx, newStatus) => {
    setStudentRows((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], status: newStatus };
      return updated;
    });
  };

  // ── Bulk toggle: set all to same status ───────────────────────────────────────
  const setAllStatuses = (status) => {
    setStudentRows((prev) => prev.map((r) => ({ ...r, status })));
  };

  // ── Save manual attendance ────────────────────────────────────────────────────
  const handleSaveManual = async () => {
    if (!canProceed) { toast.error('Select date, class and period first.'); return; }
    if (studentRows.length === 0) { toast.error('No students loaded.'); return; }
    const subject = subjectsForClass[0];
    if (!subject) { toast.error('No subject found for class.'); return; }

    setSaving(true);
    try {
      const res = await fetch('/api/students/attendance/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: selectedClassObj.class_id,
          section_id: selectedClassObj.section_id || null,
          subject_id: subject.subject_id,
          period_id: selectedPeriodId,
          date,
          records: studentRows.map((s) => ({
            registration_number: s.registration_number,
            status: s.status
          })),
        }),
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        toast.success(`Saved attendance for ${resData.paylod.successCount} student(s)!`);
      } else {
        toast.error(resData.error || resData.message || 'Failed to save.');
      }
    } catch { toast.error('Error saving attendance.'); }
    finally { setSaving(false); }
  };

  // ── Download XLSX template ────────────────────────────────────────────────────
  const handleDownloadTemplate = async () => {
    if (!canProceed) { toast.error('Select date, class and period first.'); return; }
    try {
      const params = new URLSearchParams({ class_id: selectedClassObj.class_id });
      if (selectedClassObj.section_id) params.append('section_id', selectedClassObj.section_id);
      const res = await fetch(`/api/teacher/students-list?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || !data.success) { toast.error(data.message || 'Failed to fetch student list.'); return; }
      const students = data.paylod.students || [];
      if (students.length === 0) { toast.error('No students found.'); return; }

      const rows = [['Registration Number', 'Status (P=Present, A=Absent, L=Late, V=Leave)', 'Student Name']];
      for (const s of students) rows.push([s.registration_number, 'P', s.student_name]);

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{ wch: 24 }, { wch: 36 }, { wch: 30 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
      XLSX.writeFile(wb, `attendance_${selectedClassObj.class_name}_${date}.xlsx`);
      toast.success(`Downloaded template for ${students.length} students.`);
    } catch { toast.error('Failed to download template.'); }
  };

  // ── Parse uploaded XLSX/CSV ───────────────────────────────────────────────────
  const processFile = (file) => {
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const ws = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (rows.length < 2) { toast.error('Sheet is empty.'); return; }

        const headerRow = rows[0].map((h) => String(h).trim().toLowerCase());
        const regIdx = headerRow.findIndex((h) => h.includes('reg') || h.includes('number') || h.includes('id'));
        const statusIdx = headerRow.findIndex((h) => h.includes('status') || h.includes('absent') || h.includes('present'));
        const nameIdx = headerRow.findIndex((h) => h.includes('name') || h.includes('student'));

        if (regIdx === -1 || statusIdx === -1) {
          toast.error('Headers must contain "Registration Number" and "Status".');
          return;
        }

        const records = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;
          const reg = row[regIdx];
          const rawStat = row[statusIdx];
          const name = nameIdx !== -1 ? row[nameIdx] : '';
          if (reg === undefined || reg === null || String(reg).trim() === '') continue;

          const s = String(rawStat || 'P').trim().toUpperCase();
          let status = 'Present';
          if (s === 'A' || s === 'ABSENT' || s === '0') status = 'Absent';
          else if (s === 'L' || s === 'LATE') status = 'Late';
          else if (s === 'V' || s === 'LEAVE' || s === 'ON LEAVE') status = 'On Leave';

          records.push({ registration_number: String(reg).trim(), student_name: name || String(reg), status });
        }

        if (records.length === 0) { toast.error('No valid records found.'); return; }
        setParsedRecords(records);
        toast.success(`Parsed ${records.length} records from "${file.name}".`);
      } catch { toast.error('Failed to parse file.'); }
      finally { setUploading(false); }
    };
    reader.readAsArrayBuffer(file);
  };

  // ── Save sheet-parsed records ─────────────────────────────────────────────────
  const handleSaveSheet = async () => {
    if (!canProceed) { toast.error('Select date, class and period first.'); return; }
    if (parsedRecords.length === 0) { toast.error('Upload an XLSX sheet first.'); return; }
    const subject = subjectsForClass[0];
    if (!subject) { toast.error('No subject found for class.'); return; }

    setSheetSaving(true);
    try {
      const res = await fetch('/api/students/attendance/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: selectedClassObj.class_id,
          section_id: selectedClassObj.section_id || null,
          subject_id: subject.subject_id,
          period_id: selectedPeriodId,
          date,
          records: parsedRecords.map((r) => ({ registration_number: r.registration_number, status: r.status })),
        }),
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        toast.success(`Registered attendance for ${resData.paylod.successCount} student(s)!`);
        setParsedRecords([]);
      } else {
        toast.error(resData.error || resData.message || 'Failed to save.');
      }
    } catch { toast.error('Error submitting attendance.'); }
    finally { setSheetSaving(false); }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-5xl mx-auto space-y-5">

      {/* Back Link & Header */}
      <div className="flex flex-col gap-2 pb-3 border-b border-slate-200">
        <Link href="/teacher/attendance" className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-primary">
          <FiArrowLeft className="text-xs" /> Back to Attendance Sheet
        </Link>
        <div>
          <h1 className="text-lg font-bold text-slate-800 tracking-tight">Record Student Attendance</h1>
          <p className="text-xs text-slate-500">
            Choose Manual to mark attendance row-by-row, or Sheet to upload a filled XLSX file.
          </p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {[{ id: 'manual', label: 'Manual Entry' }, { id: 'sheet', label: 'Sheet Upload' }].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              tab === t.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Shared Control Bar: Date + Class + Period */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full">

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 shrink-0 flex items-center gap-1">
              <FiCalendar className="text-primary text-xs" /> Date:
            </span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-primary cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 shrink-0 flex items-center gap-1">
              <FiBook className="text-primary text-xs" /> Class:
            </span>
            <select
              value={selectedClassKey}
              onChange={(e) => { setSelectedClassKey(e.target.value); setSelectedPeriodId(''); setParsedRecords([]); }}
              disabled={loadingDropdowns || classOptions.length === 0}
              className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-primary disabled:opacity-60"
            >
              <option value="">
                {loadingDropdowns ? 'Loading...' : classOptions.length === 0 ? '— No classes —' : '— Select Class —'}
              </option>
              {classOptions.map((c) => (
                <option key={c.key} value={c.key}>
                  Class {c.class_name}{c.section_name ? ` · Sec ${c.section_name}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 shrink-0 flex items-center gap-1">
              <FiClock className="text-primary text-xs" /> Period:
            </span>
            <select
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              disabled={loadingDropdowns || periods.length === 0}
              className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-primary disabled:opacity-60"
            >
              <option value="">
                {loadingDropdowns ? 'Loading...' : periods.length === 0 ? '— No periods —' : '— Select Period —'}
              </option>
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.start_time} – {p.end_time})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {dropdownError && <p className="text-xs text-rose-500 font-medium px-1">{dropdownError}</p>}

      {/* ─────────────────── MANUAL TAB ─────────────────── */}
      {tab === 'manual' && (
        <>
          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Set all:</span>
              {ALL_STATUSES.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setAllStatuses(st)}
                  disabled={studentRows.length === 0}
                  className={`px-2.5 py-1 text-[10px] font-semibold rounded border transition-colors disabled:opacity-40 ${
                    STATUS_CONFIG[st].bg
                  }`}
                >
                  All {STATUS_CONFIG[st].label}
                </button>
              ))}
            </div>

            <button
              onClick={handleSaveManual}
              disabled={saving || !canProceed || studentRows.length === 0}
              className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium disabled:opacity-50 transition-colors"
            >
              <FiSave className="text-xs" />
              <span>{saving ? 'Saving...' : 'Save Attendance'}</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            {!selectedClassObj ? (
              <div className="w-full py-12 text-center text-xs text-slate-400">
                Select date, class and period above to load students.
              </div>
            ) : loadingStudents ? (
              <div className="w-full py-12 text-center text-xs text-slate-400">Loading students...</div>
            ) : studentRows.length === 0 ? (
              <div className="w-full py-12 text-center text-xs text-slate-400">No students found for this class.</div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-semibold text-slate-500 uppercase">
                      <th className="px-4 py-2.5 w-10 text-center">#</th>
                      <th className="px-4 py-2.5">Reg. Number</th>
                      <th className="px-4 py-2.5">Student Name</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5 text-right">Mark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {studentRows.map((s, idx) => (
                      <tr key={idx} className={`hover:bg-slate-50/50 ${s.status !== 'Present' ? 'bg-rose-50/20' : ''}`}>
                        <td className="px-4 py-2 text-center text-slate-400 font-medium">{idx + 1}</td>
                        <td className="px-4 py-2 font-mono text-[11px] text-slate-600">{s.registration_number}</td>
                        <td className="px-4 py-2 font-medium text-slate-800">{s.student_name}</td>
                        <td className="px-4 py-2"><StatusBadge status={s.status} /></td>
                        <td className="px-4 py-2 text-right">
                          <StatusToggle value={s.status} onChange={(st) => updateStatus(idx, st)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ─────────────────── SHEET TAB ─────────────────── */}
      {tab === 'sheet' && (
        <>
          {/* Actions */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={handleDownloadTemplate}
              disabled={!canProceed}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              <FiDownload className="text-xs text-primary" />
              <span>Sample Template (.xlsx)</span>
            </button>

            <div className="flex items-center gap-2">
              <label className="px-3.5 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1.5">
                <FiUploadCloud className="text-xs" />
                <span>{uploading ? 'Parsing...' : 'Upload XLSX Sheet'}</span>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                />
              </label>

              <button
                onClick={handleSaveSheet}
                disabled={sheetSaving || !canProceed || parsedRecords.length === 0}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium disabled:opacity-50 transition-colors"
              >
                <FiSave className="text-xs" />
                <span>{sheetSaving ? 'Saving...' : 'Save Records'}</span>
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            {parsedRecords.length === 0 ? (
              <div className="w-full py-12 text-center text-xs text-slate-400">
                Select class & period → Download template → Fill statuses → Upload here.
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-semibold text-slate-500 uppercase">
                      <th className="px-4 py-2.5 w-10 text-center">#</th>
                      <th className="px-4 py-2.5">Reg. Number</th>
                      <th className="px-4 py-2.5">Student Name</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5 text-right">Change</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRecords.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-4 py-2 text-center text-slate-400 font-medium">{idx + 1}</td>
                        <td className="px-4 py-2 font-mono text-[11px] text-slate-600">{item.registration_number}</td>
                        <td className="px-4 py-2 font-medium text-slate-800">{item.student_name}</td>
                        <td className="px-4 py-2"><StatusBadge status={item.status} /></td>
                        <td className="px-4 py-2 text-right">
                          <StatusToggle
                            value={item.status}
                            onChange={(st) => {
                              const updated = [...parsedRecords];
                              updated[idx] = { ...updated[idx], status: st };
                              setParsedRecords(updated);
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AttendanceRecordPage;
