'use client';

import React, { useEffect, useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { FiCalendar, FiClock, FiUploadCloud, FiDownload, FiBook, FiSave, FiInfo } from 'react-icons/fi';
import * as XLSX from 'xlsx';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const ExcelAttendanceForm = () => {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dayName, setDayName] = useState('');

  const [assignments, setAssignments] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);
  const [dropdownError, setDropdownError] = useState('');

  const [classOptions, setClassOptions] = useState([]);
  const [selectedClassKey, setSelectedClassKey] = useState('');
  const [selectedPeriodId, setSelectedPeriodId] = useState('');

  const [downloadingList, setDownloadingList] = useState(false);
  const [parsedRecords, setParsedRecords] = useState([]);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!date) {
      setDayName('');
      resetSelections();
      return;
    }

    const [year, month, day] = date.split('-').map(Number);
    const localDate = new Date(year, month - 1, day);
    setDayName(DAY_NAMES[localDate.getDay()]);
    resetSelections();
    fetchDropdowns(date);
  }, [date]);

  useEffect(() => {
    const seen = new Set();
    const options = [];
    for (const a of assignments) {
      const key = `${a.class_id}|${a.section_id ?? 'null'}`;
      if (!seen.has(key)) {
        seen.add(key);
        options.push({
          key,
          class_id: a.class_id,
          class_name: a.class_name,
          section_id: a.section_id,
          section_name: a.section_name,
        });
      }
    }
    setClassOptions(options);
  }, [assignments]);

  const resetSelections = () => {
    setAssignments([]);
    setPeriods([]);
    setClassOptions([]);
    setSelectedClassKey('');
    setSelectedPeriodId('');
    setParsedRecords([]);
    setDropdownError('');
  };

  const fetchDropdowns = async (dateStr) => {
    setLoadingDropdowns(true);
    setDropdownError('');
    try {
      const res = await fetch(`/api/teacher/attendance-dropdowns?date=${dateStr}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setAssignments(data.paylod.assignments || []);
        setPeriods(data.paylod.periods || []);

        if ((data.paylod.assignments || []).length === 0) {
          setDropdownError(`No classes scheduled for you on ${dayName || 'this day'}.`);
        } else if ((data.paylod.periods || []).length === 0) {
          setDropdownError('No academic periods found in the system.');
        }
      } else {
        setDropdownError(data.message || 'Failed to load class/period data.');
      }
    } catch {
      setDropdownError('Network error loading class/period data.');
    } finally {
      setLoadingDropdowns(false);
    }
  };

  const subjectsForClass = assignments.filter((a) => {
    const key = `${a.class_id}|${a.section_id ?? 'null'}`;
    return key === selectedClassKey;
  });

  const selectedClassObj = classOptions.find((c) => c.key === selectedClassKey) || null;
  const canProceed = selectedClassObj && selectedPeriodId && date;

  const handleDownloadStudentList = async () => {
    if (!canProceed) {
      toast.error('Please select date, class and period first.');
      return;
    }

    setDownloadingList(true);
    try {
      const params = new URLSearchParams({ class_id: selectedClassObj.class_id });
      if (selectedClassObj.section_id) params.append('section_id', selectedClassObj.section_id);

      const res = await fetch(`/api/teacher/students-list?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || data.message || 'Failed to fetch student list.');
        return;
      }

      const students = data.paylod.students || [];
      if (students.length === 0) {
        toast.error('No registered students found for this class.');
        return;
      }

      const rows = [
        ['Registration Number', 'Status (P=Present, A=Absent, L=Late, V=Leave)', 'Student Name']
      ];
      for (const s of students) {
        rows.push([s.registration_number, 'P', s.student_name]);
      }

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{ wch: 24 }, { wch: 34 }, { wch: 32 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance');

      const fileName = `attendance_class_${selectedClassObj.class_name}_${date}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success(`Downloaded template for ${students.length} students.`);
    } catch {
      toast.error('Failed to download student list.');
    } finally {
      setDownloadingList(false);
    }
  };

  const processFile = (file) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (rows.length < 2) {
          toast.error('The sheet is empty.');
          return;
        }

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

          if (reg !== undefined && reg !== null && String(reg).trim() !== '') {
            const s = String(rawStat || 'P').trim().toUpperCase();
            let status = 'Present';
            if (s === 'A' || s === 'ABSENT' || s === '0') status = 'Absent';
            else if (s === 'L' || s === 'LATE') status = 'Late';
            else if (s === 'V' || s === 'LEAVE' || s === 'ON LEAVE') status = 'On Leave';

            records.push({
              registration_number: String(reg).trim(),
              student_name: name || `Reg: ${reg}`,
              status
            });
          }
        }

        if (records.length === 0) {
          toast.error('No valid records found in file.');
          return;
        }

        setParsedRecords(records);
        toast.success(`Parsed ${records.length} records.`);
      } catch {
        toast.error('Failed to parse file.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSaveAttendance = async () => {
    if (!canProceed) {
      toast.error('Please select date, class and period first.');
      return;
    }
    if (parsedRecords.length === 0) {
      toast.error('Please upload an XLSX sheet first.');
      return;
    }

    const subject = subjectsForClass[0];
    if (!subject) {
      toast.error('No subject found for class.');
      return;
    }

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
          records: parsedRecords,
        }),
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        toast.success(`Registered attendance for ${resData.paylod.successCount} student(s)!`);
        setParsedRecords([]);
      } else {
        toast.error(resData.error || resData.message || 'Failed to save.');
      }
    } catch {
      toast.error('Error submitting attendance.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 shrink-0">Date:</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-primary cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 shrink-0">Class:</span>
            <select
              value={selectedClassKey}
              onChange={(e) => setSelectedClassKey(e.target.value)}
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
            <span className="text-xs font-semibold text-slate-600 shrink-0">Period:</span>
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

      {dropdownError && (
        <p className="text-xs text-rose-500 font-medium px-1">{dropdownError}</p>
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={handleDownloadStudentList}
          disabled={!canProceed || downloadingList}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
        >
          <FiDownload className="text-xs text-primary" />
          <span>{downloadingList ? 'Downloading...' : 'Sample Template (.xlsx)'}</span>
        </button>

        <div className="flex items-center gap-2">
          <label className="px-3.5 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1.5">
            <FiUploadCloud className="text-xs" />
            <span>Upload XLSX Sheet</span>
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />
          </label>

          <button
            onClick={handleSaveAttendance}
            disabled={saving || !canProceed || parsedRecords.length === 0}
            className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium disabled:opacity-50"
          >
            <FiSave className="text-xs" />
            <span>{saving ? 'Saving...' : 'Save Records'}</span>
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        {parsedRecords.length === 0 ? (
          <div className="w-full py-12 text-center text-xs text-slate-400">
            Select Class & Period → Download Template → Upload filled XLSX file.
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
                  <th className="px-4 py-2.5 text-right">Change Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parsedRecords.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2.5 text-center text-slate-400 font-medium">{idx + 1}</td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-slate-600">{item.registration_number}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-800">{item.student_name}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                        item.status === 'Present' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                        item.status === 'Late' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                        item.status === 'On Leave' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                        'bg-rose-50 text-rose-700 border border-rose-100'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-1">
                        {['Present', 'Absent', 'Late', 'On Leave'].map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => {
                              const updated = [...parsedRecords];
                              updated[idx].status = st;
                              setParsedRecords(updated);
                            }}
                            className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-colors border ${
                              item.status === st
                                ? 'bg-slate-800 text-white border-slate-800'
                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {st === 'Present' ? 'P' : st === 'Absent' ? 'A' : st === 'Late' ? 'L' : 'V'}
                          </button>
                        ))}
                      </div>
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

export default ExcelAttendanceForm;
