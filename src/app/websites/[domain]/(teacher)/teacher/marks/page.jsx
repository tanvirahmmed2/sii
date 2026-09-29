'use client';

import React, { useEffect, useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import {
  FiAward, FiSave, FiLayers, FiInfo, FiUploadCloud, FiDownload,
  FiFileText, FiCheck, FiAlertCircle, FiEdit3
} from 'react-icons/fi';

const MarksEntryPage = () => {
  const [activeMode, setActiveMode] = useState('manual'); // 'manual' | 'spreadsheet'

  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);

  const [examId, setExamId] = useState('');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [subjectId, setSubjectId] = useState('');

  const [loadingDropdowns, setLoadingDropdowns] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);

  // Spreadsheet Upload States
  const [xlsxLoaded, setXlsxLoaded] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [fileName, setFileName] = useState('');
  const [parsedRecords, setParsedRecords] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const [uploadSummary, setUploadSummary] = useState(null);

  // Load SheetJS for Spreadsheet handling
  useEffect(() => {
    if (typeof window !== 'undefined' && window.XLSX) {
      setXlsxLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    script.async = true;
    script.onload = () => setXlsxLoaded(true);
    script.onerror = () => toast.error('Failed to load Excel library.');
    document.head.appendChild(script);
  }, []);

  // Load dropdown resources
  useEffect(() => {
    const fetchResources = async () => {
      try {
        const [examsRes, classesRes, subjectsRes] = await Promise.all([
          fetch('/api/exams'),
          fetch('/api/classes'),
          fetch('/api/teacher/subjects')
        ]);

        if (examsRes.ok && classesRes.ok && subjectsRes.ok) {
          const examsData = await examsRes.json();
          const classesData = await classesRes.json();
          const subjectsData = await subjectsRes.json();

          setExams(examsData.paylod?.exams || []);
          setClasses(classesData.paylod?.classes || []);
          setSubjects(subjectsData.paylod?.subjects || []);
        }
      } catch (err) {
        console.error('Failed to load form dropdowns:', err);
      } finally {
        setLoadingDropdowns(false);
      }
    };
    fetchResources();
  }, []);

  // Fetch sections when class changes
  useEffect(() => {
    if (!classId) {
      const timer = setTimeout(() => {
        setSections([]);
        setSectionId('');
      }, 0);
      return () => clearTimeout(timer);
    }

    const fetchSections = async () => {
      try {
        const res = await fetch(`/api/sections?class_id=${classId}`);
        if (res.ok) {
          const data = await res.json();
          setSections(data.paylod?.sections || []);
        }
      } catch (err) {
        console.error('Failed to load sections:', err);
      }
    };
    fetchSections();
  }, [classId]);

  // Load student list for manual marks entry
  const handleLoadStudents = async () => {
    if (!examId || !classId || !subjectId) {
      toast.error('Exam, Class, and Subject are required to load student lists.');
      return;
    }

    setLoadingStudents(true);
    try {
      const targetSec = sectionId || 'all';
      const res = await fetch(`/api/students/marks?exam_id=${examId}&class_id=${classId}&section_id=${targetSec}&subject_id=${subjectId}`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data.paylod?.students || []);
        toast.success('Student list loaded.');
      } else {
        toast.error('Failed to load student list.');
      }
    } catch (err) {
      toast.error('An error occurred loading students.');
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleMarkChange = (studentId, value) => {
    setStudents((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, marks_obtained: value } : s))
    );
  };

  const handleTotalMarkChange = (studentId, value) => {
    setStudents((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, total_marks: value } : s))
    );
  };

  const handleRemarksChange = (studentId, value) => {
    setStudents((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, remarks: value } : s))
    );
  };

  const handleSaveMarks = async () => {
    if (students.length === 0) return;

    setSaving(true);
    try {
      const marksPayload = students.map((s) => ({
        student_id: s.student_id,
        exam_id: parseInt(examId, 10),
        subject_id: parseInt(subjectId, 10),
        marks_obtained: s.marks_obtained !== null && s.marks_obtained !== '' ? parseFloat(s.marks_obtained) : 0,
        total_marks: s.total_marks ? parseFloat(s.total_marks) : 100,
        remarks: s.remarks || null
      }));

      const res = await fetch('/api/students/marks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marks: marksPayload })
      });

      if (res.ok) {
        toast.success('Marks saved successfully!');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to save marks.');
      }
    } catch (err) {
      toast.error('An error occurred saving marks.');
    } finally {
      setSaving(false);
    }
  };

  // --- SPREADSHEET DOWNLOAD & UPLOAD LOGIC ---
  const handleDownloadTemplate = async () => {
    if (!examId || !classId || !subjectId) {
      toast.error('Please select Exam, Class, and Subject to download template.');
      return;
    }
    if (!xlsxLoaded || !window.XLSX) {
      toast.error('Excel library is loading, please wait.');
      return;
    }

    setDownloadingTemplate(true);
    try {
      const targetSec = sectionId || 'all';
      const res = await fetch(`/api/students/marks?exam_id=${examId}&class_id=${classId}&section_id=${targetSec}&subject_id=${subjectId}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error('Failed to load student list for template.');
        return;
      }

      const roster = data.paylod?.students || [];
      if (roster.length === 0) {
        toast.error('No students found for the selected class/section.');
        return;
      }

      const selectedSub = subjects.find(s => String(s.subject_id || s.id) === String(subjectId));
      const subCode = selectedSub?.subject_code || selectedSub?.code || 'SUB';

      const rows = [
        ['Subject Code', 'Student Registration Number', 'Mark', 'Exam ID', 'Student Name (read-only)']
      ];

      for (const st of roster) {
        rows.push([subCode, st.registration_number, st.marks_obtained ?? '', examId, st.name]);
      }

      const ws = window.XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{ wch: 16 }, { wch: 28 }, { wch: 12 }, { wch: 12 }, { wch: 28 }];
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, 'Marks');

      const fileName = `marks_exam${examId}_class${classId}_${subCode}.xlsx`;
      window.XLSX.writeFile(wb, fileName);
      toast.success(`Downloaded template with ${roster.length} student rows.`);
    } catch {
      toast.error('Failed to generate spreadsheet template.');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const processFile = (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      toast.error('Unsupported format. Please upload an Excel (.xlsx, .xls) or CSV file.');
      return;
    }
    if (!xlsxLoaded || !window.XLSX) {
      toast.error('Excel library is loading, please wait.');
      return;
    }

    setFileName(file.name);
    setUploadSummary(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = window.XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = window.XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (rows.length < 2) {
          toast.error('The sheet is empty or has no header row.');
          return;
        }

        const headerRow = rows[0].map((h) => String(h).trim().toLowerCase());
        
        const subCodeIdx = headerRow.findIndex(h => h.includes('subject') || h.includes('sub'));
        const regIdx = headerRow.findIndex(h => h.includes('reg') || h.includes('number') || h.includes('student'));
        const markIdx = headerRow.findIndex(h => h.includes('mark') || h.includes('score'));
        const examIdx = headerRow.findIndex(h => h.includes('exam'));

        if (regIdx === -1 || markIdx === -1 || subCodeIdx === -1 || examIdx === -1) {
          toast.error('Sheet must contain headers: "Subject Code", "Student Registration Number", "Mark", and "Exam ID".');
          return;
        }

        const records = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;
          
          const subCode = row[subCodeIdx];
          const reg = row[regIdx];
          const markVal = row[markIdx];
          const exVal = row[examIdx];

          if (reg !== undefined && reg !== null && String(reg).trim() !== '') {
            records.push({
              subject_code: String(subCode || '').trim(),
              registration_number: String(reg).trim(),
              mark: markVal !== undefined && markVal !== null ? String(markVal).trim() : '',
              exam_id: String(exVal || examId || '').trim()
            });
          }
        }

        if (records.length === 0) {
          toast.error('No valid records found in spreadsheet.');
          return;
        }

        setParsedRecords(records);
        toast.success(`Parsed ${records.length} records from spreadsheet "${file.name}".`);
      } catch (err) {
        toast.error('Failed to parse spreadsheet file.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
  };

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) processFile(e.target.files[0]);
  };

  const handleSaveSpreadsheetMarks = async () => {
    if (parsedRecords.length === 0) {
      toast.error('Please upload and parse a spreadsheet file first.');
      return;
    }

    setSaving(true);
    setUploadSummary(null);
    try {
      const res = await fetch('/api/students/marks/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: parsedRecords })
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        const summary = resData.paylod;
        setUploadSummary(summary);
        toast.success(`Successfully uploaded marks for ${summary.successCount} student(s).`);
        if (summary.warningCount > 0) {
          toast(`⚠ ${summary.warningCount} row warnings logged during import.`);
        }
        setParsedRecords([]);
        setFileName('');
      } else {
        toast.error(resData.error || resData.message || 'Failed to upload spreadsheet marks.');
      }
    } catch {
      toast.error('An error occurred during spreadsheet marks submission.');
    } finally {
      setSaving(false);
    }
  };

  // Filter subjects assigned to the selected class
  const filteredSubjects = subjects.filter((s) => String(s.class_id) === String(classId));

  return (
    <div className="w-full max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <FiAward className="text-primary" /> Student Marks Evaluation
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Record and update student exam marks via manual roster or Excel spreadsheet upload.</p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveMode('manual')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              activeMode === 'manual' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <FiEdit3 className="text-xs" /> Manual
          </button>
          <button
            onClick={() => setActiveMode('spreadsheet')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              activeMode === 'spreadsheet' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <FiUploadCloud className="text-xs" /> Sheet Upload
          </button>
        </div>
      </div>

      {/* Shared Control Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs grid grid-cols-2 sm:grid-cols-5 gap-2">
        <select
          value={examId}
          onChange={(e) => setExamId(e.target.value)}
          disabled={loadingDropdowns}
          className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-primary col-span-2 sm:col-span-1"
        >
          <option value="">— Select Exam —</option>
          {exams.map((e) => (<option key={e.id} value={e.id}>{e.name} ({e.term || 'General'})</option>))}
        </select>

        <select
          value={classId}
          onChange={(e) => { setClassId(e.target.value); setSubjectId(''); }}
          disabled={loadingDropdowns}
          className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-primary"
        >
          <option value="">— Select Class —</option>
          {classes.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
        </select>

        <select
          value={sectionId}
          onChange={(e) => setSectionId(e.target.value)}
          disabled={!classId}
          className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-primary disabled:opacity-60"
        >
          <option value="">— All Sections —</option>
          {sections.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
        </select>

        <select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          disabled={!classId}
          className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-primary disabled:opacity-60"
        >
          <option value="">— Select Subject —</option>
          {filteredSubjects.map((s) => (<option key={s.subject_id || s.id} value={s.subject_id || s.id}>{s.subject_name || s.name}</option>))}
        </select>

        {activeMode === 'manual' ? (
          <button
            onClick={handleLoadStudents}
            disabled={!examId || !classId || !subjectId || loadingStudents}
            className="px-3 py-1.5 bg-primary hover:bg-primary-dark disabled:bg-slate-100 text-white disabled:text-slate-400 rounded-lg text-xs font-medium transition-colors"
          >
            {loadingStudents ? 'Loading...' : 'Load Students'}
          </button>
        ) : (
          <button
            onClick={handleDownloadTemplate}
            disabled={!examId || !classId || !subjectId || downloadingTemplate}
            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 inline-flex items-center gap-1 justify-center"
          >
            <FiDownload className="text-xs text-primary" />
            {downloadingTemplate ? 'Downloading...' : 'Get Template'}
          </button>
        )}
      </div>

      {/* MODE 1: MANUAL ENTRY */}
      {activeMode === 'manual' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {students.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Select exam, class, and subject above, then click &quot;Load Students&quot;.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
                <span className="text-xs font-semibold text-slate-600">{students.length} Students Loaded</span>
                <button
                  onClick={handleSaveMarks}
                  disabled={saving}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 rounded-lg text-xs font-medium transition-colors"
                >
                  <FiSave className="text-xs" />
                  {saving ? 'Saving...' : 'Save Marks'}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="text-[10px] font-semibold text-slate-500 uppercase border-b border-slate-200">
                      <th className="px-4 py-2.5">Student</th>
                      <th className="px-4 py-2.5 text-center w-28">Marks Obtained</th>
                      <th className="px-4 py-2.5 text-center w-28">Total Marks</th>
                      <th className="px-4 py-2.5">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map((s) => (
                      <tr key={s.student_id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-2.5">
                          <p className="font-semibold text-slate-800">{s.name}</p>
                          <span className="text-[10px] font-mono text-slate-400">{s.registration_number}</span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <input type="number" min="0" step="0.01"
                            value={s.marks_obtained !== null && s.marks_obtained !== undefined ? s.marks_obtained : ''}
                            onChange={(e) => handleMarkChange(s.student_id, e.target.value)}
                            className="w-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-center text-xs font-bold text-slate-700 outline-none focus:border-primary"
                          />
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <input type="number" min="1" step="0.01"
                            value={s.total_marks !== null && s.total_marks !== undefined ? s.total_marks : 100}
                            onChange={(e) => handleTotalMarkChange(s.student_id, e.target.value)}
                            className="w-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-center text-xs font-bold text-slate-400 outline-none focus:border-primary"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <input type="text"
                            value={s.remarks || ''}
                            onChange={(e) => handleRemarksChange(s.student_id, e.target.value)}
                            className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:border-primary"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* MODE 2: SPREADSHEET UPLOAD */}
      {activeMode === 'spreadsheet' && (
        <div className="flex flex-col gap-4">
          {/* Upload bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">Required columns: <strong>Subject Code</strong>, <strong>Student Registration Number</strong>, <strong>Mark</strong>, <strong>Exam ID</strong></p>
            <div className="flex items-center gap-2">
              <label
                className="px-3.5 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <FiUploadCloud className="text-xs" />
                {fileName ? fileName.slice(0, 20) + (fileName.length > 20 ? '...' : '') : 'Upload Sheet'}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {parsedRecords.length === 0 && !uploadSummary ? (
              <div className="bg-white border border-slate-200 rounded-xl py-12 text-center text-xs text-slate-400">
                Upload a marks sheet above to preview and submit.
              </div>
            ) : parsedRecords.length > 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
                  <span className="text-xs font-semibold text-slate-600">{parsedRecords.length} records parsed</span>
                  <button onClick={handleSaveSpreadsheetMarks} disabled={saving}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 rounded-lg text-xs font-medium">
                    <FiCheck className="text-xs" />
                    {saving ? 'Uploading...' : 'Submit Marks'}
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="text-[10px] font-semibold text-slate-500 uppercase border-b border-slate-200">
                        <th className="px-4 py-2">#</th>
                        <th className="px-4 py-2">Sub Code</th>
                        <th className="px-4 py-2">Registration No.</th>
                        <th className="px-4 py-2 text-center">Mark</th>
                        <th className="px-4 py-2 text-center">Exam ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedRecords.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2 text-slate-400">{idx + 1}</td>
                          <td className="px-4 py-2 font-mono text-[11px] text-slate-600">{row.subject_code}</td>
                          <td className="px-4 py-2 font-semibold text-slate-800">{row.registration_number}</td>
                          <td className="px-4 py-2 font-bold text-emerald-600 text-center">{row.mark}</td>
                          <td className="px-4 py-2 text-slate-500 text-center">{row.exam_id}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : uploadSummary && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-3">
                <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <FiCheck className="text-emerald-600" /> Upload Summary
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 text-center">
                    <span className="text-[10px] font-semibold text-emerald-700 uppercase block mb-1">Saved</span>
                    <span className="text-xl font-bold text-emerald-600">{uploadSummary.successCount}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-center">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Warnings</span>
                    <span className={`text-xl font-bold ${uploadSummary.warningCount > 0 ? 'text-amber-500' : 'text-slate-400'}`}>{uploadSummary.warningCount}</span>
                  </div>
                </div>
                {uploadSummary.warnings?.length > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-800 space-y-1 max-h-32 overflow-y-auto">
                    {uploadSummary.warnings.map((w, i) => <p key={i}>• {w}</p>)}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MarksEntryPage;
