'use client';

import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

export default function StudentRegistrationPage() {
  const { website, getApiEndpoint } = useTenantWebsite();

  // Active tab: 'single', 'bulk' (directory removed per requirements)
  const [activeTab, setActiveTab] = useState('single');

  // Academic references
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loadingMetadata, setLoadingMetadata] = useState(false);

  // Single Registration Form State (reginumber, class are primary)
  const [singleRegNo, setSingleRegNo] = useState('');
  const [singleClassId, setSingleClassId] = useState('');
  const [singleSectionId, setSingleSectionId] = useState('');
  const [singleSessionId, setSingleSessionId] = useState('');
  const [singleRollNo, setSingleRollNo] = useState('');
  const [submittingSingle, setSubmittingSingle] = useState(false);
  const [singleSuccessResult, setSingleSuccessResult] = useState(null);

  // Bulk Upload State
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkRows, setBulkRows] = useState([]);
  const [parsingBulk, setParsingBulk] = useState(false);
  const [uploadingBulk, setUploadingBulk] = useState(false);
  const [bulkResults, setBulkResults] = useState(null);
  const fileInputRef = useRef(null);

  // Fetch classes, sections, sessions
  useEffect(() => {
    const fetchAcademicData = async () => {
      setLoadingMetadata(true);
      try {
        const [cRes, sRes, sesRes] = await Promise.all([
          fetch(getApiEndpoint('staff/panel/classes')).then((r) => r.json()).catch(() => ({})),
          fetch(getApiEndpoint('staff/panel/sections')).then((r) => r.json()).catch(() => ({})),
          fetch(getApiEndpoint('staff/panel/sessions')).then((r) => r.json()).catch(() => ({})),
        ]);

        if (cRes?.payload?.classes || cRes?.payload || cRes?.classes) {
          const cls = cRes.payload?.classes || cRes.payload || cRes.classes || [];
          setClasses(cls);
          if (cls[0]) setSingleClassId(String(cls[0].id));
        }

        if (sRes?.payload?.sections || sRes?.payload || sRes?.sections) {
          setSections(sRes.payload?.sections || sRes.payload || sRes.sections || []);
        }

        if (sesRes?.payload?.sessions || sesRes?.payload || sesRes?.sessions) {
          const ses = sesRes.payload?.sessions || sesRes.payload || sesRes.sessions || [];
          setSessions(ses);
          const currentSes = ses.find((s) => s.is_current) || ses[0];
          if (currentSes) setSingleSessionId(String(currentSes.id));
        }
      } catch (err) {
        console.error('Failed to load academic metadata:', err);
      } finally {
        setLoadingMetadata(false);
      }
    };

    fetchAcademicData();
  }, [getApiEndpoint]);

  // Filter sections by singleClassId
  const availableSections = sections.filter(
    (sec) => !singleClassId || String(sec.class_id) === String(singleClassId)
  );

  // Single Student Registration Handler
  const handleSingleRegister = async (e) => {
    e.preventDefault();

    if (!singleRegNo.trim()) {
      toast.error('Registration Number is required.');
      return;
    }

    if (!singleClassId) {
      toast.error('Please select a Class.');
      return;
    }

    setSubmittingSingle(true);
    try {
      const res = await fetch(getApiEndpoint('staff/panel/students'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registration_no: singleRegNo.trim(),
          class_id: singleClassId,
          section_id: singleSectionId || null,
          session_id: singleSessionId || null,
          roll_no: singleRollNo.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to register student.');
      }

      toast.success(data.message || 'Student registered successfully!');
      setSingleSuccessResult(data.payload);

      // Reset form
      setSingleRegNo('');
      setSingleRollNo('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmittingSingle(false);
    }
  };

  // Bulk Excel File Selector & Parser
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkFile(file);
    setParsingBulk(true);
    setBulkResults(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        // Normalize rows (primarily registration number and class)
        const normalized = jsonRows.map((row, idx) => {
          const regNo = (row['Registration No'] || row.Registration || row['Registration Number'] || row.registration_no || row.reginumber || row['Reg No'] || '').trim();
          const className = (row['Class Code'] || row.Class || row['Class Name'] || row.class || '').trim();
          const sectionName = (row['Section Name'] || row.Section || row.section || '').trim();
          const sessionName = (row['Session Name'] || row.Session || row.session || '').trim();
          const rollNo = (row['Roll No'] || row.Roll || row['Roll Number'] || row.roll_no || '').trim();

          const errors = [];
          if (!regNo) errors.push('Missing Registration No');
          if (!className) errors.push('Missing Class');

          return {
            rowIdx: idx + 1,
            regNo,
            className,
            sectionName,
            sessionName,
            rollNo,
            isValid: errors.length === 0,
            errors,
          };
        });

        setBulkRows(normalized);
        toast.success(`Loaded ${normalized.length} records from ${file.name}`);
      } catch (err) {
        console.error('Spreadsheet parsing failed:', err);
        toast.error('Unable to parse file. Please upload a valid .xlsx or .csv template.');
      } finally {
        setParsingBulk(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Dispatch Bulk Upload
  const handleBulkUpload = async () => {
    if (!bulkFile) {
      toast.error('Please select an Excel or CSV file.');
      return;
    }

    const invalidCount = bulkRows.filter((r) => !r.isValid).length;
    if (invalidCount > 0) {
      if (!confirm(`${invalidCount} row(s) have missing registration numbers or classes and will fail. Proceed anyway?`)) {
        return;
      }
    }

    setUploadingBulk(true);
    setBulkResults(null);

    try {
      const formData = new FormData();
      formData.append('file', bulkFile);

      const res = await fetch(getApiEndpoint('staff/panel/students/bulk'), {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Bulk registration failed.');
      }

      toast.success(data.message || 'Batch registration processed successfully!');
      setBulkResults(data.payload || data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploadingBulk(false);
    }
  };

  // Download Excel Template
  const handleDownloadTemplate = () => {
    const templateEndpoint = getApiEndpoint('staff/panel/students/template');
    window.open(templateEndpoint, '_blank');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  return (
    <div className="w-full space-y-5">
      {/* Page Title & Navigation Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Student Registration Workstation
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Register students individually or import in batch using Registration Number and Class.
          </p>
        </div>

        {/* Global Action Shortcut */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadTemplate}
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
          >
            <span>📥</span> Download Excel Template
          </button>
        </div>
      </div>

      {/* Main Tab Navigation (Directory Removed) */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 text-xs">
        {[
          { id: 'single', label: 'Single Student Registration', icon: '👤' },
          { id: 'bulk', label: 'Bulk Excel / CSV Import', icon: '📊' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 font-medium border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
              activeTab === tab.id
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: SINGLE STUDENT REGISTRATION */}
      {activeTab === 'single' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-2xs space-y-5">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Enroll Individual Student
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Staff can register students by Registration Number and Class. Demo password and 7-day setup credentials are created automatically.
            </p>
          </div>

          {/* Success Banner if just created */}
          {singleSuccessResult && (
            <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 space-y-2">
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5">
                  <span className="text-emerald-600 font-bold">✓</span> Student Registered Successfully!
                </span>
                <button
                  type="button"
                  onClick={() => setSingleSuccessResult(null)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px] pt-1">
                <div>
                  <span className="text-emerald-700 dark:text-emerald-400 font-sans">Reg No:</span> {singleSuccessResult.student?.registration_no}
                </div>
                <div>
                  <span className="text-emerald-700 dark:text-emerald-400 font-sans">Unique ID:</span> {singleSuccessResult.student?.student_unique_id}
                </div>
                <div>
                  <span className="text-emerald-700 dark:text-emerald-400 font-sans">Demo Password:</span> {singleSuccessResult.demoPassword}
                </div>
              </div>
              {singleSuccessResult.setupUrl && (
                <div className="pt-1 flex items-center gap-2">
                  <span className="font-semibold text-emerald-800 dark:text-emerald-300 font-sans">Setup Link:</span>
                  <input
                    type="text"
                    readOnly
                    value={singleSuccessResult.setupUrl}
                    className="flex-1 px-2 py-1 text-[10px] font-mono bg-white dark:bg-slate-900 rounded border border-emerald-300 dark:border-emerald-700"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(singleSuccessResult.setupUrl)}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-semibold cursor-pointer"
                  >
                    Copy Link
                  </button>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSingleRegister} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Registration Number */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Registration Number *
                </label>
                <input
                  type="text"
                  required
                  value={singleRegNo}
                  onChange={(e) => setSingleRegNo(e.target.value)}
                  placeholder="e.g. REG-2026-1001"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-900 dark:text-white outline-none focus:border-primary font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Unique student institutional registration code</span>
              </div>

              {/* Class Selection */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Academic Class *
                </label>
                <select
                  required
                  value={singleClassId}
                  onChange={(e) => setSingleClassId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-900 dark:text-white outline-none focus:border-primary cursor-pointer"
                >
                  <option value="">Select Academic Class</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.code ? `(${c.code})` : ''}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">Assigned academic standard</span>
              </div>

              {/* Academic Session */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Academic Session
                </label>
                <select
                  value={singleSessionId}
                  onChange={(e) => setSingleSessionId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-900 dark:text-white outline-none focus:border-primary cursor-pointer"
                >
                  <option value="">Select Session</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.is_current ? '(Current)' : ''}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">Term / enrollment academic year</span>
              </div>

              {/* Section */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Section (Optional)
                </label>
                <select
                  value={singleSectionId}
                  onChange={(e) => setSingleSectionId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-900 dark:text-white outline-none focus:border-primary cursor-pointer"
                >
                  <option value="">All / Unassigned Section</option>
                  {availableSections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.name}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">Class division group</span>
              </div>

              {/* Roll Number */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Roll Number (Optional)
                </label>
                <input
                  type="text"
                  value={singleRollNo}
                  onChange={(e) => setSingleRollNo(e.target.value)}
                  placeholder="e.g. 01"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-900 dark:text-white outline-none focus:border-primary font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Class roster seat sequence</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={submittingSingle}
                className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {submittingSingle ? (
                  <>
                    <span className="animate-spin text-sm">⏳</span>
                    <span>Registering Student...</span>
                  </>
                ) : (
                  <>
                    <span>👤 Register Student</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: BULK EXCEL / CSV IMPORT */}
      {activeTab === 'bulk' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-2xs space-y-5">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Batch Import from Excel (.xlsx) / CSV
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Bulk register students by Registration Number and Class. Optional columns include Section, Session, and Roll Number.
              </p>
            </div>
            <button
              onClick={handleDownloadTemplate}
              className="text-xs text-primary hover:underline font-medium cursor-pointer self-start sm:self-auto"
            >
              📥 Download Sample Spreadsheet
            </button>
          </div>

          {/* Drag & Drop File Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-primary dark:hover:border-primary rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer bg-slate-50/50 dark:bg-slate-950/50 transition-colors"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />
            <span className="text-2xl mb-1">📄</span>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {bulkFile ? bulkFile.name : 'Click to select Excel / CSV file'}
            </span>
            <span className="text-[10px] text-slate-400 mt-1">
              Supported formats: .xlsx, .xls, .csv. File must contain columns: Registration No, Class Code
            </span>
          </div>

          {/* Parsed Rows Preview */}
          {bulkRows.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Spreadsheet Preview ({bulkRows.length} rows loaded)
                </span>
                <span className="text-[11px] text-emerald-600 font-medium">
                  {bulkRows.filter((r) => r.isValid).length} ready for enrollment
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg max-h-72">
                <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold uppercase tracking-wider text-slate-500 sticky top-0">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Registration No</th>
                      <th className="px-3 py-2">Class</th>
                      <th className="px-3 py-2">Section</th>
                      <th className="px-3 py-2">Session</th>
                      <th className="px-3 py-2">Roll</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {bulkRows.slice(0, 50).map((row) => (
                      <tr key={row.rowIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-3 py-1.5 font-mono text-[10px] text-slate-400">{row.rowIdx}</td>
                        <td className="px-3 py-1.5 font-mono font-medium text-slate-900 dark:text-white">
                          {row.regNo || <span className="text-rose-500 font-sans italic">Missing</span>}
                        </td>
                        <td className="px-3 py-1.5">
                          {row.className || <span className="text-rose-500 italic">Missing</span>}
                        </td>
                        <td className="px-3 py-1.5 text-slate-500">{row.sectionName || '—'}</td>
                        <td className="px-3 py-1.5 text-slate-500">{row.sessionName || '—'}</td>
                        <td className="px-3 py-1.5 font-mono text-[11px]">{row.rollNo || '—'}</td>
                        <td className="px-3 py-1.5">
                          {row.isValid ? (
                            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                              ✓ Valid
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                              ✕ {row.errors.join(', ')}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleBulkUpload}
                  disabled={uploadingBulk}
                  className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {uploadingBulk ? (
                    <>
                      <span className="animate-spin text-sm">⏳</span>
                      <span>Processing Batch Registration...</span>
                    </>
                  ) : (
                    <>
                      <span>📊 Import &amp; Register {bulkRows.length} Students</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Bulk Results Summary */}
          {bulkResults && (
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <h3 className="font-semibold text-slate-900 dark:text-white">Batch Import Results</h3>
              <div className="flex items-center gap-4 text-xs font-medium">
                <span className="text-slate-600 dark:text-slate-400">
                  Total Processed: <strong className="text-slate-900 dark:text-white">{bulkResults.total || 0}</strong>
                </span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  Successfully Registered: <strong>{bulkResults.successful || 0}</strong>
                </span>
                <span className="text-rose-600 dark:text-rose-400">
                  Failed: <strong>{bulkResults.failed || 0}</strong>
                </span>
              </div>
              {bulkResults.errors && bulkResults.errors.length > 0 && (
                <div className="mt-2 text-[11px] text-rose-600 dark:text-rose-400 max-h-32 overflow-y-auto space-y-1">
                  {bulkResults.errors.map((err, i) => (
                    <div key={i}>
                      Row {err.row}: {err.error} ({err.registration_no || ''})
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
