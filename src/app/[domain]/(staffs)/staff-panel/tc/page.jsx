'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import { exportElementAsJpeg, exportElementAsPdf } from 'src/lib/export/documentExporter';
import { FiSave, FiList, FiTrash2, FiSearch, FiRefreshCw, FiExternalLink, FiPrinter } from 'react-icons/fi';

export default function TransferCertificatePage() {
  const { website, getApiEndpoint } = useTenantWebsite();

  // Mode: 'issue' or 'archive'
  const [activeTab, setActiveTab] = useState('issue');

  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Template
  const [activeTemplate, setActiveTemplate] = useState(null);
  const printDocRef = useRef(null);

  // TC Custom Form Fields
  const [tcSerial, setTcSerial] = useState(`TC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [admissionDate, setAdmissionDate] = useState('15 January 2023');
  const [leavingDate, setLeavingDate] = useState(new Date().toISOString().split('T')[0]);
  const [lastClass, setLastClass] = useState('Grade 10');
  const [promotedClass, setPromotedClass] = useState('Promoted to Grade 11');
  const [duesStatus, setDuesStatus] = useState('All school dues paid up to current month');
  const [conduct, setConduct] = useState('Exemplary and Satisfactory');
  const [reason, setReason] = useState('Relocation of parents / Guardians request');
  const [destinationSchool, setDestinationSchool] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');

  // Archive state
  const [issuedTcs, setIssuedTcs] = useState([]);
  const [loadingArchive, setLoadingArchive] = useState(false);
  const [archiveSearch, setArchiveSearch] = useState('');

  // Fetch active TC template
  useEffect(() => {
    async function initData() {
      try {
        const tplRes = await fetch(getApiEndpoint('staff/panel/templates?category=tc'));
        const tplData = await tplRes.json();
        if (tplRes.ok && tplData.success && tplData.active_template) {
          setActiveTemplate(tplData.active_template);
        }

        // Fetch students roster
        const stuRes = await fetch(getApiEndpoint('staff/panel/students?limit=50'));
        const stuData = await stuRes.json();
        if (stuRes.ok && stuData.success) {
          const list = stuData.payload?.students || [];
          setStudents(list);
          if (list[0]) {
            handleSelectStudent(list[0]);
          }
        }
      } catch (e) {
        console.warn('Notice loading TC data:', e);
      }
    }
    initData();
  }, [getApiEndpoint]);

  // Fetch issued TCs archive
  const fetchIssuedTcs = useCallback(async () => {
    setLoadingArchive(true);
    try {
      const params = new URLSearchParams();
      if (archiveSearch.trim()) params.set('search', archiveSearch.trim());

      const res = await fetch(getApiEndpoint(`staff/panel/tc?${params.toString()}`));
      const data = await res.json();
      if (res.ok && data.success) {
        setIssuedTcs(data.payload?.tcs || []);
      } else {
        toast.error(data.error || 'Failed to fetch issued Transfer Certificates.');
      }
    } catch {
      toast.error('Network error loading issued TCs.');
    } finally {
      setLoadingArchive(false);
    }
  }, [archiveSearch, getApiEndpoint]);

  useEffect(() => {
    if (activeTab === 'archive') {
      fetchIssuedTcs();
    }
  }, [activeTab, fetchIssuedTcs]);

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setFatherName(student.guardian_name || student.father_name || 'Guardian Name');
    setMotherName(student.mother_name || 'Mother Name');
    setLastClass(student.class_name || 'Grade 10');
  };

  // Compile TC document HTML
  const compileTcDocument = () => {
    if (!activeTemplate || !selectedStudent) return null;
    let html = activeTemplate.html_content || '';
    const css = activeTemplate.css_content || '';

    const replacements = {
      '{{tc_serial}}': tcSerial,
      '{{student_name}}': selectedStudent.name || 'Student Name',
      '{{father_name}}': fatherName,
      '{{mother_name}}': motherName,
      '{{registration_no}}': selectedStudent.registration_no || selectedStudent.student_unique_id || 'REG-0001',
      '{{admission_date}}': admissionDate,
      '{{leaving_date}}': leavingDate,
      '{{last_class_passed}}': lastClass,
      '{{promoted_class}}': promotedClass,
      '{{dues_cleared}}': duesStatus,
      '{{conduct}}': conduct,
      '{{reason_for_leaving}}': reason,
      '{{destination_school}}': destinationSchool || 'General Secondary School',
      '{{issue_date}}': new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
      '{{school_name}}': website?.name || 'Educational Institution',
      '{{school_address}}': website?.address || 'Main Campus Secretariat',
    };

    Object.entries(replacements).forEach(([k, v]) => {
      const reg = new RegExp(k.replace(/([{}])/g, '\\$1'), 'g');
      html = html.replace(reg, v);
    });

    return { html, css };
  };

  // Issue & Save TC to Database (triggers exit creation in website_student_exits)
  const handleIssueAndSaveTc = async () => {
    if (!selectedStudent) {
      toast.error('Please select a student.');
      return;
    }
    if (!reason.trim()) {
      toast.error('Please provide the reason for leaving.');
      return;
    }

    if (
      !window.confirm(
        `Issue official Transfer Certificate ${tcSerial} for ${selectedStudent.name}? This will record their transfer in the Student Exit Registry and mark the student account as Departed.`
      )
    ) {
      return;
    }

    setIsSaving(true);
    toast.loading('Issuing and recording Transfer Certificate...', { id: 'save-tc' });
    try {
      const res = await fetch(getApiEndpoint('staff/panel/tc'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: selectedStudent.id,
          tc_number: tcSerial,
          template_id: activeTemplate?.id || null,
          admission_date: admissionDate,
          leaving_date: leavingDate,
          last_class_id: selectedStudent.class_id || null,
          last_class_passed: lastClass,
          promoted_class: promotedClass,
          reason_for_leaving: reason,
          destination_school: destinationSchool,
          dues_status: duesStatus,
          conduct: conduct,
          remarks: `Issued by staff. Destination: ${destinationSchool || 'Not specified'}`,
          status: 'issued',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Transfer Certificate recorded & departure filed in Exit Registry!', { id: 'save-tc' });
        // Automatically generate next serial
        setTcSerial(`TC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
      } else {
        toast.error(data.error || 'Failed to record TC.', { id: 'save-tc' });
      }
    } catch {
      toast.error('Network error saving TC.', { id: 'save-tc' });
    } finally {
      setIsSaving(false);
    }
  };

  // Export JPEG
  const handleExportJpeg = async () => {
    if (!printDocRef.current) return;
    setIsExporting(true);
    toast.loading('Exporting High-Res JPEG...', { id: 'tc-export' });
    try {
      await exportElementAsJpeg(printDocRef.current, `Transfer_Certificate_${selectedStudent?.name || tcSerial}`);
      toast.success('Transfer Certificate JPEG downloaded!', { id: 'tc-export' });
    } catch {
      toast.error('Failed to export JPEG', { id: 'tc-export' });
    } finally {
      setIsExporting(false);
    }
  };

  // Export PDF
  const handleExportPdf = async () => {
    if (!printDocRef.current) return;
    setIsExporting(true);
    toast.loading('Generating Official A4 PDF...', { id: 'tc-export' });
    try {
      await exportElementAsPdf(printDocRef.current, `Transfer_Certificate_${selectedStudent?.name || tcSerial}`, {
        widthMm: 210,
        heightMm: 297,
      });
      toast.success('Official TC PDF downloaded!', { id: 'tc-export' });
    } catch {
      toast.error('Failed to export PDF', { id: 'tc-export' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteTc = async (tcId) => {
    if (!window.confirm('Delete this Transfer Certificate record?')) return;
    try {
      const res = await fetch(getApiEndpoint(`staff/panel/tc?id=${tcId}`), {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Transfer Certificate record deleted.');
        setIssuedTcs((prev) => prev.filter((t) => t.id !== tcId));
      } else {
        toast.error(data.error || 'Failed to delete TC.');
      }
    } catch {
      toast.error('Error deleting TC.');
    }
  };

  const compiled = compileTcDocument();

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="pb-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-white">
            Transfer Certificate (TC) Issuance &amp; Registry
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Issue departure credentials, persist certified exit records in the database, and export formal seals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="inline-flex rounded border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('issue')}
              className={`px-3 py-1 rounded font-medium transition cursor-pointer ${
                activeTab === 'issue'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Issue Certificate
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('archive')}
              className={`px-3 py-1 rounded font-medium transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'archive'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <FiList /> Issued TCs Archive
            </button>
          </div>

          <a
            href="/staff-panel/tc-templates"
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
          >
            Change Template
          </a>
        </div>
      </div>

      {activeTab === 'archive' ? (
        /* ================= ISSUED TCS ARCHIVE ================= */
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                placeholder="Search by TC #, Student, Destination..."
                value={archiveSearch}
                onChange={(e) => setArchiveSearch(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              <FiSearch className="absolute left-2.5 top-2.5 text-slate-400 text-xs" />
            </div>

            <button
              type="button"
              onClick={fetchIssuedTcs}
              className="p-2 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
              title="Refresh Archive"
            >
              <FiRefreshCw className={loadingArchive ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-2xs overflow-hidden">
            {loadingArchive ? (
              <div className="py-16 flex flex-col items-center justify-center gap-2">
                <div className="loader loader-sm" />
                <span className="text-xs text-slate-400">Loading Transfer Certificates...</span>
              </div>
            ) : issuedTcs.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                No issued Transfer Certificates found in the archive.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-500 tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-3.5 py-2.5">TC Number</th>
                      <th className="px-3.5 py-2.5">Student Details</th>
                      <th className="px-3.5 py-2.5">Leaving Date</th>
                      <th className="px-3.5 py-2.5">Destination &amp; Reason</th>
                      <th className="px-3.5 py-2.5">Status</th>
                      <th className="px-3.5 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {issuedTcs.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-3.5 py-2.5 font-mono font-medium text-slate-900 dark:text-white">
                          {t.tc_number}
                        </td>
                        <td className="px-3.5 py-2.5">
                          <div className="font-medium text-slate-900 dark:text-white">
                            {t.student_name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Reg: {t.registration_no} | Class: {t.class_name}
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          {t.leaving_date}
                        </td>
                        <td className="px-3.5 py-2.5 max-w-xs">
                          {t.destination_school && (
                            <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {t.destination_school}
                            </div>
                          )}
                          <div className="text-slate-500 text-[11px] truncate">
                            {t.reason_for_leaving}
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                            {t.status}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteTc(t.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                            title="Delete TC Record"
                          >
                            <FiTrash2 />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ================= ISSUE NEW TC ================= */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Form */}
          <div className="lg:col-span-5 space-y-4">
            {/* Student Selector Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                1. Select Departing Student
              </h3>
              <input
                type="text"
                placeholder="Search by student name or reg..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded">
                {students
                  .filter((s) => (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((s) => (
                    <div
                      key={s.id}
                      onClick={() => handleSelectStudent(s)}
                      className={`p-2 text-xs flex items-center justify-between cursor-pointer transition ${
                        selectedStudent?.id === s.id
                          ? 'bg-slate-100 dark:bg-slate-800 font-medium text-slate-900 dark:text-white'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div>
                        <p className="font-medium">{s.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{s.registration_no}</p>
                      </div>
                      <span className="text-[10px] text-slate-500">{s.class_name}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Certificate Parameters Form */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                2. Certificate Particulars
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Serial Number</label>
                  <input
                    type="text"
                    value={tcSerial}
                    onChange={(e) => setTcSerial(e.target.value)}
                    className="w-full font-mono text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Date of Leaving</label>
                  <input
                    type="date"
                    value={leavingDate}
                    onChange={(e) => setLeavingDate(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Destination School / Institution
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dhaka Residential Model College..."
                  value={destinationSchool}
                  onChange={(e) => setDestinationSchool(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Last Class Passed</label>
                  <input
                    type="text"
                    value={lastClass}
                    onChange={(e) => setLastClass(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Promotion Status</label>
                  <input
                    type="text"
                    value={promotedClass}
                    onChange={(e) => setPromotedClass(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="text-xs">
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Reason for Leaving</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="text-xs">
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Conduct &amp; Character</label>
                <input
                  type="text"
                  value={conduct}
                  onChange={(e) => setConduct(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleIssueAndSaveTc}
                  disabled={isSaving || !selectedStudent}
                  className="w-full py-2 px-3 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <FiSave /> {isSaving ? 'Issuing...' : 'Issue & Record TC in Database'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Preview Surface */}
          <div className="lg:col-span-7 flex flex-col items-center space-y-3">
            <div className="w-full flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleExportJpeg}
                disabled={isExporting || !selectedStudent}
                className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer disabled:opacity-50"
              >
                Export JPEG
              </button>
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={isExporting || !selectedStudent}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 rounded text-xs font-medium shadow-xs cursor-pointer disabled:opacity-50"
              >
                Download A4 PDF
              </button>
            </div>

            <div className="w-full bg-slate-100 dark:bg-slate-950 p-4 rounded border border-slate-200 dark:border-slate-800 overflow-auto flex justify-center">
              {compiled ? (
                <div
                  ref={printDocRef}
                  className="bg-white shadow-md text-slate-900"
                  style={{
                    width: '595px',
                    minHeight: '842px',
                    boxSizing: 'border-box',
                  }}
                >
                  <style dangerouslySetInnerHTML={{ __html: compiled.css }} />
                  <div dangerouslySetInnerHTML={{ __html: compiled.html }} />
                </div>
              ) : (
                <div className="p-12 text-center text-xs text-slate-400">Select a student to generate TC preview</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
