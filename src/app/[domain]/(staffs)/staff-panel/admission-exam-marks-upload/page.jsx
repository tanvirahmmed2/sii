'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
export default function AdmissionExamMarksUploadPage() {
  const params = useParams();
  const router = useRouter();
  const domain = params?.domain || '';
  const apiBase = domain ? `/api/${domain}` : '/api';
  const [circulars, setCirculars] = useState([]);
  const [selectedAdmissionId, setSelectedAdmissionId] = useState('');
  const [loadingCirculars, setLoadingCirculars] = useState(true);
  const [examData, setExamData] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const [savingMarks, setSavingMarks] = useState(false);

  // Local editable marks state: { [applicantId]: { [subjectId]: marks_obtained } }
  const [editedMarks, setEditedMarks] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Fetch available exam-based admission circulars
  useEffect(() => {
    const fetchCirculars = async () => {
      try {
        setLoadingCirculars(true);
        const res = await fetch(`${apiBase}/staff/panel/admissions/exam-marks`);
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const data = await res.json();
        if (data.success && data.circulars) {
          setCirculars(data.circulars);
          if (data.circulars.length > 0) {
            setSelectedAdmissionId(String(data.circulars[0].id));
          }
        }
      } catch (err) {
        console.error('Error fetching circulars:', err);
        toast.error('Failed to load admission circulars.');
      } finally {
        setLoadingCirculars(false);
      }
    };
    fetchCirculars();
  }, [apiBase]);

  // 2. Fetch exam details, subjects, and applicants for selected circular
  const fetchExamData = useCallback(async (silent = false) => {
    if (!selectedAdmissionId) return;
    if (!silent) setLoadingData(true);
    try {
      const res = await fetch(`${apiBase}/staff/panel/admissions/exam-marks?admission_id=${selectedAdmissionId}`);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setExamData(data);
        // Initialize editable marks map
        const initialMap = {};
        for (const app of data.applicants || []) {
          initialMap[app.id] = {};
          for (const b of app.marks_breakdown || []) {
            initialMap[app.id][b.subject_id] = b.marks_obtained !== null && b.marks_obtained !== undefined ? b.marks_obtained : '';
          }
        }
        setEditedMarks(initialMap);
      } else {
        toast.error(data.error || 'Failed to load exam data.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error loading exam marks.');
    } finally {
      setLoadingData(false);
    }
  }, [apiBase, selectedAdmissionId]);
  useEffect(() => {
    if (selectedAdmissionId) {
      fetchExamData();
    }
  }, [selectedAdmissionId, fetchExamData]);

  // Handle local mark cell change
  const handleMarkChange = (applicantId, subjectId, value) => {
    setEditedMarks(prev => ({
      ...prev,
      [applicantId]: {
        ...(prev[applicantId] || {}),
        [subjectId]: value
      }
    }));
  };

  // Save modified marks to database
  const handleSaveMarks = async () => {
    if (!examData || !examData.subjects) return;
    const marksRecords = [];
    for (const applicantId in editedMarks) {
      for (const subjectId in editedMarks[applicantId]) {
        const val = editedMarks[applicantId][subjectId];
        if (val !== '' && val !== null && val !== undefined) {
          marksRecords.push({
            applicant_id: parseInt(applicantId, 10),
            subject_id: parseInt(subjectId, 10),
            marks_obtained: parseFloat(val) || 0
          });
        }
      }
    }
    if (marksRecords.length === 0) {
      toast.error('No marks entered to save.');
      return;
    }
    setSavingMarks(true);
    try {
      const res = await fetch(`${apiBase}/staff/panel/admissions/exam-marks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          admission_id: parseInt(selectedAdmissionId, 10),
          marks_records: marksRecords
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'Marks saved and updateable successfully!');
        fetchExamData(true);
      } else {
        toast.error(data.error || 'Failed to update marks.');
      }
    } catch {
      toast.error('Network error saving marks.');
    } finally {
      setSavingMarks(false);
    }
  };

  // Download Excel Template with pre-filled applicants and subject columns
  const handleDownloadTemplate = () => {
    if (!examData || !examData.subjects || !examData.applicants) {
      toast.error('No exam or applicant data loaded.');
      return;
    }
    const subjects = examData.subjects;
    const applicants = examData.applicants;
    const rows = applicants.map(app => {
      const row = {
        'Application No': app.application_no,
        'Roll No': app.roll_no || `ROL-${app.id}`,
        'Applicant Name': app.applicant_name,
        'Phone': app.phone
      };
      for (const sub of subjects) {
        const existing = app.marks_breakdown?.find(b => b.subject_id === sub.id);
        const colHeader = `${sub.title} [Max: ${sub.mark}]`;
        row[colHeader] = existing?.marks_obtained !== null && existing?.marks_obtained !== undefined ? existing.marks_obtained : '';
      }
      row['Remarks'] = '';
      return row;
    });
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Exam Marks');
    const fileName = `Exam_Marks_${examData.circular.title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    toast.success('Excel marks template downloaded!');
  };

  // Upload Excel file and extract marks for each subject
  const handleExcelUpload = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async evt => {
      try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, {
          type: 'binary'
        });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonRows = XLSX.utils.sheet_to_json(worksheet);
        if (!jsonRows || jsonRows.length === 0) {
          toast.error('The uploaded Excel file contains no data.');
          return;
        }
        const subjects = examData.subjects;
        const applicants = examData.applicants;
        const updatedLocal = {
          ...editedMarks
        };
        let parsedCount = 0;
        for (const row of jsonRows) {
          const appNo = String(row['Application No'] || row['application_no'] || '').trim();
          const rollNo = String(row['Roll No'] || row['roll_no'] || '').trim();
          const matchedApp = applicants.find(a => appNo && a.application_no === appNo || rollNo && a.roll_no === rollNo);
          if (!matchedApp) continue;
          if (!updatedLocal[matchedApp.id]) {
            updatedLocal[matchedApp.id] = {};
          }

          // Match subject headers
          for (const sub of subjects) {
            for (const key in row) {
              if (key.toLowerCase().includes(sub.title.toLowerCase())) {
                const markVal = parseFloat(row[key]);
                if (!isNaN(markVal)) {
                  updatedLocal[matchedApp.id][sub.id] = Math.min(markVal, parseFloat(sub.mark));
                  parsedCount++;
                }
              }
            }
          }
        }
        setEditedMarks(updatedLocal);
        toast.success(`Parsed ${parsedCount} subject marks entries from Excel! Click 'Save All Marks' to apply.`);
      } catch (err) {
        console.error('Error parsing Excel:', err);
        toast.error('Failed to parse Excel file. Please use the downloaded template.');
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  // Filter applicants by search query
  const filteredApplicants = useMemo(() => {
    if (!examData?.applicants) return [];
    const q = searchTerm.toLowerCase().trim();
    if (!q) return examData.applicants;
    return examData.applicants.filter(a => a.applicant_name.toLowerCase().includes(q) || a.application_no.toLowerCase().includes(q) || a.roll_no && a.roll_no.toLowerCase().includes(q));
  }, [examData, searchTerm]);
  return <div className="w-full space-y-4">
      {/* Top Header & Workstation Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold text-purple-600 bg-purple-50 dark:bg-purple-950/50 dark:text-purple-300 px-2.5 py-0.5 rounded uppercase tracking-wider">
              Exam Workstation &bull; Step 1
            </span>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              Upload Subject-Based Exam Marks
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Download the intake template, enter subject marks via Excel (.xlsx) or direct inline editing, and update marks at any time.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/staff-panel/admission-exam-marks-process${selectedAdmissionId ? `?admission_id=${selectedAdmissionId}` : ''}`} className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition">
              <span>Process & Auto-Select</span>
              
            </Link>
          </div>
        </div>

        {/* Circular Selector & Actions Control Bar */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">
              Select Exam Circular:
            </label>
            <select value={selectedAdmissionId} onChange={e => setSelectedAdmissionId(e.target.value)} className="text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden font-medium cursor-pointer">
              {circulars.map(c => <option key={c.id} value={c.id}>
                  {c.title} ({c.class_name || 'Class'}) &bull; Seats: {c.capacity}
                </option>)}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Download Template Button */}
            <button onClick={handleDownloadTemplate} disabled={!examData} className="px-3 py-1.5 rounded text-xs font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50" title="Download pre-filled Excel template">
              
              <span>Download Excel Template (.xlsx)</span>
            </button>

            {/* Upload Excel Button */}
            <label className="px-3 py-1.5 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center gap-1.5 cursor-pointer shadow-2xs">
              
              <span>Upload Marks (.xlsx)</span>
              <input type="file" accept=".xlsx, .xls" onChange={handleExcelUpload} className="hidden" />
            </label>

            {/* Save All Marks Button */}
            <button onClick={handleSaveMarks} disabled={savingMarks || !examData} className="px-3.5 py-1.5 rounded text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 min-w-[110px] justify-center">
              {savingMarks ? <>
                  <div className="loader loader-xs loader-white" />
                  <span>Saving...</span>
                </> : <>
                  
                  <span>Save All Marks</span>
                </>}
            </button>
          </div>
        </div>
      </div>

      {/* Circular Summary & Subject Badges */}
      {examData && <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs">
            <span className="text-[10px] uppercase font-semibold text-slate-400">Target Intake</span>
            <div className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
              {examData.circular.class_name} &bull; {examData.circular.session_name}
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
              Capacity: {examData.circular.capacity} / Max {examData.circular.class_max_seats || 'Unlimited'} seats
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs">
            <span className="text-[10px] uppercase font-semibold text-slate-400">Exam Schedule</span>
            <div className="text-xs font-bold text-purple-600 dark:text-purple-400 mt-0.5">
              {examData.circular.exam_date ? new Date(examData.circular.exam_date).toLocaleDateString() : 'Date Not Set'}
            </div>
            <div className="text-[11px] text-slate-500 truncate mt-0.5" title={examData.circular.venue}>
              Venue: {examData.circular.venue || 'Campus Auditorium'}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs">
            <span className="text-[10px] uppercase font-semibold text-slate-400">Total Applicants</span>
            <div className="text-xl font-bold text-blue-600 dark:text-blue-400 font-mono mt-0.5">
              {examData.applicants?.length || 0}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs">
            <span className="text-[10px] uppercase font-semibold text-slate-400">Subjects Included</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {examData.subjects.map(s => <span key={s.id} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] font-mono rounded text-slate-700 dark:text-slate-300">
                  {s.title} ({s.mark} pts)
                </span>)}
            </div>
          </div>
        </div>}

      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-2.5 shadow-2xs flex items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          
          <input type="text" placeholder="Search candidate by name, application no, or roll..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden" />
        </div>

        <button onClick={() => fetchExamData(false)} title="Refresh marks data" className="p-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer">
          Refresh
        </button>
      </div>

      {/* Marks Table: Single Row Overflow Format */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50/75 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">App No</th>
                <th className="py-2.5 px-3">Roll No</th>
                <th className="py-2.5 px-3">Candidate Name</th>
                <th className="py-2.5 px-3">Status</th>
                {examData?.subjects.map(sub => <th key={sub.id} className="py-2.5 px-3 bg-purple-50/40 dark:bg-purple-950/20 text-purple-900 dark:text-purple-300">
                    {sub.title} (Max: {sub.mark})
                  </th>)}
                <th className="py-2.5 px-3">Total Score</th>
                <th className="py-2.5 px-3">Merit Rank</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loadingData ? <tr>
                  <td colSpan={4 + (examData?.subjects?.length || 0) + 2} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="loader loader-sm" />
                      <span className="text-xs">Loading applicants and exam marks...</span>
                    </div>
                  </td>
                </tr> : filteredApplicants.length === 0 ? <tr>
                  <td colSpan={4 + (examData?.subjects?.length || 0) + 2} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-1">
                      
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">No applicants found</span>
                    </div>
                  </td>
                </tr> : filteredApplicants.map(app => {
              let rowTotal = 0;
              const subjects = examData?.subjects || [];
              for (const sub of subjects) {
                const val = editedMarks[app.id]?.[sub.id];
                if (val !== '' && val !== null && val !== undefined) {
                  rowTotal += parseFloat(val) || 0;
                }
              }
              return <tr key={app.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2 px-3 font-mono font-bold text-sky-600 dark:text-sky-400">
                        {app.application_no}
                      </td>

                      <td className="py-2 px-3 font-mono text-slate-700 dark:text-slate-300">
                        {app.roll_no || 'N/A'}
                      </td>

                      <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">
                        {app.applicant_name}
                      </td>

                      <td className="py-2 px-3">
                        <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${app.status === 'selected' || app.status === 'accepted' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : app.status === 'completed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300' : app.status === 'rejected' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                          {app.status}
                        </span>
                      </td>

                      {/* Subject Mark Editable Inputs */}
                      {subjects.map(sub => {
                  const currentVal = editedMarks[app.id]?.[sub.id] ?? '';
                  const isOverMax = parseFloat(currentVal) > parseFloat(sub.mark);
                  return <td key={sub.id} className="py-1 px-2 bg-purple-50/20 dark:bg-purple-950/10">
                            <input type="number" step="0.5" min="0" max={sub.mark} placeholder="0.0" value={currentVal} onChange={e => handleMarkChange(app.id, sub.id, e.target.value)} className={`w-20 px-2 py-1 rounded text-xs font-mono font-semibold text-center border focus:outline-hidden ${isOverMax ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white'}`} />
                          </td>;
                })}

                      <td className="py-2 px-3 font-mono font-bold text-slate-900 dark:text-white">
                        {rowTotal.toFixed(2)} pts
                      </td>

                      <td className="py-2 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {app.merit_position ? <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300 font-bold text-[10px]">
                            Rank #{app.merit_position}
                          </span> : 'Unranked'}
                      </td>
                    </tr>;
            })}
            </tbody>
          </table>
        </div>
      </div>
    </div>;
}