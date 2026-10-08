'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { FiArrowLeft, FiUploadCloud, FiDownload, FiSave, FiCalendar } from 'react-icons/fi';
import * as XLSX from 'xlsx';

const RecordTeacherAttendanceXlsxPage = () => {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [teachersList, setTeachersList] = useState([]);
  const [parsedRecords, setParsedRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTeachersList();
  }, []);

  const fetchTeachersList = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendances?date=${selectedDate}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load teachers.');

      const teachersRes = await fetch('/api/teachers');
      const teachersData = await teachersRes.json();
      const teachers = teachersData.paylod?.teachers || [];
      setTeachersList(teachers);

      const existingLogs = data.paylod?.attendances || [];

      setParsedRecords(
        teachers.map((t) => {
          const log = existingLogs.find((l) => l.teacher_id == t.id);
          return {
            teacher_id: t.id,
            name: t.name,
            email: t.email,
            date: selectedDate,
            status: log ? log.status : 'Present',
            check_in: log?.check_in || '09:00 AM',
            check_out: log?.check_out || '05:00 PM'
          };
        })
      );
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    if (teachersList.length === 0) {
      toast.error('No teachers found.');
      return;
    }

    const templateData = teachersList.map((t) => ({
      'Teacher ID': t.id,
      'Teacher Name': t.name,
      'Email': t.email,
      'Date (YYYY-MM-DD)': selectedDate,
      'Status (P=Present, A=Absent, L=Late, V=Leave)': 'P',
      'Check In': '09:00 AM',
      'Check Out': '05:00 PM'
    }));

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Teacher_Attendance');
    XLSX.writeFile(workbook, `Teacher_Template_${selectedDate}.xlsx`);
    toast.success('Downloaded template!');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const ws = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(ws);

        if (!rawData || rawData.length === 0) {
          toast.error('File has no data.');
          setUploading(false);
          return;
        }

        const mapped = rawData.map((row) => {
          const teacherId = row['Teacher ID'] || row['teacher_id'] || row['ID'] || row['id'];
          const name = row['Teacher Name'] || row['name'] || row['Name'] || '';
          const email = row['Email'] || row['email'] || '';
          const rowDate = row['Date (YYYY-MM-DD)'] || row['date'] || row['Date'] || selectedDate;
          const rawStatus = row['Status (P=Present, A=Absent, L=Late, V=Leave)'] || row['status'] || row['Status'] || 'P';

          const s = String(rawStatus).trim().toUpperCase();
          let status = 'Present';
          if (s === 'A' || s === 'ABSENT') status = 'Absent';
          else if (s === 'L' || s === 'LATE') status = 'Late';
          else if (s === 'V' || s === 'LEAVE' || s === 'ON LEAVE') status = 'On Leave';

          let matched = teachersList.find((t) => t.id == teacherId || t.email.toLowerCase() === email.toLowerCase());

          return {
            teacher_id: matched ? matched.id : teacherId,
            name: matched ? matched.name : name,
            email: matched ? matched.email : email,
            date: rowDate,
            status,
            check_in: row['Check In'] || row['check_in'] || null,
            check_out: row['Check Out'] || row['check_out'] || null
          };
        }).filter(r => r.teacher_id);

        if (mapped.length === 0) {
          toast.error('Could not match teacher records.');
        } else {
          setParsedRecords(mapped);
          toast.success(`Parsed ${mapped.length} rows.`);
        }
      } catch (err) {
        toast.error('Failed to parse file.');
      } finally {
        setUploading(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleSaveAttendance = async () => {
    if (parsedRecords.length === 0) return;

    setSaving(true);
    try {
      const res = await fetch('/api/attendances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, records: parsedRecords })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save.');

      toast.success('Teacher attendance saved!');
      router.push('/admin/teachers/attendences');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-2 pb-3 border-b border-slate-200">
        <Link
          href="/admin/teachers/attendences"
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-primary"
        >
          <FiArrowLeft className="text-xs" /> Back to Attendance Sheet
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">
              Record Teacher Attendance (XLSX)
            </h1>
            <p className="text-xs text-slate-500">
              Upload attendance sheet (P = Present, A = Absent, L = Late, V = Leave).
            </p>
          </div>

          <button
            onClick={handleDownloadTemplate}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50"
          >
            <FiDownload className="text-xs text-primary" /> Sample Template
          </button>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
            <FiCalendar className="text-primary" /> Date:
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-primary cursor-pointer"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="px-3.5 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1.5">
            <FiUploadCloud className="text-xs" />
            <span>{uploading ? 'Parsing...' : 'Upload XLSX Sheet'}</span>
            <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} className="hidden" />
          </label>

          <button
            onClick={handleSaveAttendance}
            disabled={saving || parsedRecords.length === 0}
            className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium disabled:opacity-50"
          >
            <FiSave className="text-xs" />
            <span>{saving ? 'Saving...' : 'Save Records'}</span>
          </button>
        </div>
      </div>

      {/* Preview Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        {loading ? (
          <div className="w-full py-12 text-center text-xs text-slate-400">Loading teacher data...</div>
        ) : parsedRecords.length === 0 ? (
          <div className="w-full py-12 text-center text-xs text-slate-400">No records loaded. Upload an XLSX file.</div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-semibold text-slate-500 uppercase">
                  <th className="px-4 py-2.5">Teacher Name</th>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Change Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parsedRecords.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2.5 whitespace-nowrap font-medium text-slate-800">
                      {item.name}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-slate-500">
                      {item.date}
                    </td>
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

export default RecordTeacherAttendanceXlsxPage;
