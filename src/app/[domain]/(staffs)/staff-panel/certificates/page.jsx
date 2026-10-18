'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import { exportElementAsJpeg, exportElementAsPdf } from 'src/lib/export/documentExporter';
import { FiSave, FiList, FiTrash2, FiSearch, FiRefreshCw } from 'react-icons/fi';

export default function CertificatesPage() {
  const { website, getApiEndpoint } = useTenantWebsite();

  // Mode: 'generate' or 'archive'
  const [activeTab, setActiveTab] = useState('generate');

  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [recipientName, setRecipientName] = useState('Elena Rostova');
  const [awardTitle, setAwardTitle] = useState('Certificate of Academic Excellence');
  const [certificateType, setCertificateType] = useState('Academic Excellence');
  const [achievementDescription, setAchievementDescription] = useState(
    'For securing First Rank with Outstanding Performance in the Annual Institutional Science Olympiad.'
  );
  const [certNo, setCertNo] = useState(`CERT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [eventDate, setEventDate] = useState(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }));
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Archive state
  const [issuedCerts, setIssuedCerts] = useState([]);
  const [loadingArchive, setLoadingArchive] = useState(false);
  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveType, setArchiveType] = useState('all');

  // Template
  const [activeTemplate, setActiveTemplate] = useState(null);
  const printDocRef = useRef(null);

  useEffect(() => {
    async function initData() {
      try {
        const tplRes = await fetch(getApiEndpoint('staff/panel/templates?category=certificate'));
        const tplData = await tplRes.json();
        if (tplRes.ok && tplData.success && tplData.active_template) {
          setActiveTemplate(tplData.active_template);
        }

        const stuRes = await fetch(getApiEndpoint('staff/panel/students?limit=50'));
        const stuData = await stuRes.json();
        if (stuRes.ok && stuData.success) {
          const list = stuData.payload?.students || [];
          setStudents(list);
          if (list[0]?.name) {
            setSelectedStudent(list[0]);
            setRecipientName(list[0].name);
          }
        }
      } catch (e) {
        console.warn('Notice loading certificate template:', e);
      }
    }
    initData();
  }, [getApiEndpoint]);

  // Fetch issued certificates archive
  const fetchIssuedCerts = useCallback(async () => {
    setLoadingArchive(true);
    try {
      const params = new URLSearchParams();
      if (archiveSearch.trim()) params.set('search', archiveSearch.trim());
      if (archiveType !== 'all') params.set('type', archiveType);

      const res = await fetch(getApiEndpoint(`staff/panel/certificates?${params.toString()}`));
      const data = await res.json();
      if (res.ok && data.success) {
        setIssuedCerts(data.payload?.certificates || []);
      } else {
        toast.error(data.error || 'Failed to fetch issued certificates.');
      }
    } catch {
      toast.error('Network error loading certificates.');
    } finally {
      setLoadingArchive(false);
    }
  }, [archiveSearch, archiveType, getApiEndpoint]);

  useEffect(() => {
    if (activeTab === 'archive') {
      fetchIssuedCerts();
    }
  }, [activeTab, fetchIssuedCerts]);

  const handleSelectStudent = (s) => {
    setSelectedStudent(s);
    setRecipientName(s.name);
  };

  const compileCertificate = () => {
    if (!activeTemplate) return null;
    let html = activeTemplate.html_content || '';
    const css = activeTemplate.css_content || '';

    const replacements = {
      '{{recipient_name}}': recipientName,
      '{{award_title}}': awardTitle,
      '{{achievement_description}}': achievementDescription,
      '{{certificate_no}}': certNo,
      '{{event_date}}': eventDate,
      '{{school_name}}': website?.name || 'Sky International Academy',
    };

    Object.entries(replacements).forEach(([k, v]) => {
      const reg = new RegExp(k.replace(/([{}])/g, '\\$1'), 'g');
      html = html.replace(reg, v);
    });

    return { html, css };
  };

  // Issue & Save in Database
  const handleIssueAndSaveCert = async () => {
    if (!selectedStudent) {
      toast.error('Please select a student.');
      return;
    }
    if (!awardTitle.trim()) {
      toast.error('Award title is required.');
      return;
    }

    setIsSaving(true);
    toast.loading('Issuing and recording Certificate...', { id: 'save-cert' });
    try {
      const res = await fetch(getApiEndpoint('staff/panel/certificates'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: selectedStudent.id,
          certificate_no: certNo,
          template_id: activeTemplate?.id || null,
          certificate_type: certificateType,
          award_title: awardTitle,
          achievement_description: achievementDescription,
          event_date: new Date().toISOString().split('T')[0],
          status: 'issued',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'Certificate recorded successfully!', { id: 'save-cert' });
        setCertNo(`CERT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
      } else {
        toast.error(data.error || 'Failed to record certificate.', { id: 'save-cert' });
      }
    } catch {
      toast.error('Network error recording certificate.', { id: 'save-cert' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportJpeg = async () => {
    if (!printDocRef.current) return;
    setIsExporting(true);
    toast.loading('Exporting High-Res JPEG...', { id: 'cert-export' });
    try {
      await exportElementAsJpeg(printDocRef.current, `Certificate_${recipientName.replace(/\s+/g, '_')}`);
      toast.success('Certificate JPEG downloaded!', { id: 'cert-export' });
    } catch {
      toast.error('Failed to export JPEG', { id: 'cert-export' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = async () => {
    if (!printDocRef.current) return;
    setIsExporting(true);
    toast.loading('Generating Official A4 PDF...', { id: 'cert-export' });
    try {
      await exportElementAsPdf(printDocRef.current, `Certificate_${recipientName.replace(/\s+/g, '_')}`, {
        widthMm: 297,
        heightMm: 210,
      });
      toast.success('Official Certificate PDF downloaded!', { id: 'cert-export' });
    } catch {
      toast.error('Failed to export PDF', { id: 'cert-export' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteCert = async (certId) => {
    if (!window.confirm('Delete this certificate record?')) return;
    try {
      const res = await fetch(getApiEndpoint(`staff/panel/certificates?id=${certId}`), {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Certificate record deleted.');
        setIssuedCerts((prev) => prev.filter((c) => c.id !== certId));
      } else {
        toast.error(data.error || 'Failed to delete certificate.');
      }
    } catch {
      toast.error('Error deleting certificate.');
    }
  };

  const compiled = compileCertificate();

  return (
    <div className="w-full space-y-4">
      {/* Page Header */}
      <div className="pb-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-white">
            Academic Certificate Generator &amp; Registry
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Generate landscape institutional certificates for honors and merit achievements, record in the database, and export print files.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="inline-flex rounded border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('generate')}
              className={`px-3 py-1 rounded font-medium transition cursor-pointer ${
                activeTab === 'generate'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Generate Certificate
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
              <FiList /> Issued Archive
            </button>
          </div>

          <a
            href="/staff-panel/certificate-templates"
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
          >
            Change Template
          </a>
        </div>
      </div>

      {activeTab === 'archive' ? (
        /* ================= ISSUED CERTIFICATES ARCHIVE ================= */
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Category:</span>
              <select
                value={archiveType}
                onChange={(e) => setArchiveType(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              >
                <option value="all">All Types</option>
                <option value="Academic Excellence">Academic Excellence</option>
                <option value="Merit & Honors">Merit &amp; Honors</option>
                <option value="Course Completion">Course Completion</option>
                <option value="Sports & Athletics">Sports &amp; Athletics</option>
              </select>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Search by Cert #, Student, Title..."
                  value={archiveSearch}
                  onChange={(e) => setArchiveSearch(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
                <FiSearch className="absolute left-2.5 top-2.5 text-slate-400 text-xs" />
              </div>
              <button
                type="button"
                onClick={fetchIssuedCerts}
                className="p-2 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                title="Refresh Archive"
              >
                <FiRefreshCw className={loadingArchive ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-2xs overflow-hidden">
            {loadingArchive ? (
              <div className="py-16 flex flex-col items-center justify-center gap-2">
                <div className="loader loader-sm" />
                <span className="text-xs text-slate-400">Loading certificates...</span>
              </div>
            ) : issuedCerts.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                No issued certificates found in the archive.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-500 tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-3.5 py-2.5">Certificate #</th>
                      <th className="px-3.5 py-2.5">Student / Recipient</th>
                      <th className="px-3.5 py-2.5">Award Title</th>
                      <th className="px-3.5 py-2.5">Type &amp; Issue Date</th>
                      <th className="px-3.5 py-2.5">Status</th>
                      <th className="px-3.5 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {issuedCerts.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-3.5 py-2.5 font-mono font-medium text-slate-900 dark:text-white">
                          {c.certificate_no}
                        </td>
                        <td className="px-3.5 py-2.5">
                          <div className="font-medium text-slate-900 dark:text-white">
                            {c.student_name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Reg: {c.registration_no} | Class: {c.class_name}
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5 max-w-xs">
                          <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {c.award_title}
                          </div>
                          <div className="text-slate-500 text-[11px] truncate">
                            {c.achievement_description}
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5 text-[11px]">
                          <div>{c.certificate_type}</div>
                          <div className="text-slate-400 font-mono">{c.issue_date}</div>
                        </td>
                        <td className="px-3.5 py-2.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                            {c.status}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteCert(c.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                            title="Delete Certificate"
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
        /* ================= GENERATE NEW CERTIFICATE ================= */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Form */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-3.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                1. Select Recipient Student
              </h3>
              <div className="max-h-32 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded divide-y divide-slate-100 dark:divide-slate-800">
                {students.map((s) => (
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

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-3.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                2. Certificate Particulars
              </h3>

              <div className="text-xs">
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Certificate Type</label>
                <select
                  value={certificateType}
                  onChange={(e) => setCertificateType(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                >
                  <option value="Academic Excellence">Academic Excellence</option>
                  <option value="Merit & Honors">Merit &amp; Honors</option>
                  <option value="Course Completion">Course Completion</option>
                  <option value="Sports & Athletics">Sports &amp; Athletics</option>
                  <option value="Special Achievement">Special Achievement</option>
                </select>
              </div>

              <div className="text-xs">
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Award Title</label>
                <input
                  type="text"
                  value={awardTitle}
                  onChange={(e) => setAwardTitle(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="text-xs">
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Achievement Description</label>
                <textarea
                  rows={3}
                  value={achievementDescription}
                  onChange={(e) => setAchievementDescription(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Certificate #</label>
                  <input
                    type="text"
                    value={certNo}
                    onChange={(e) => setCertNo(e.target.value)}
                    className="w-full font-mono text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Event / Issue Date</label>
                  <input
                    type="text"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleIssueAndSaveCert}
                  disabled={isSaving || !selectedStudent}
                  className="w-full py-2 px-3 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <FiSave /> {isSaving ? 'Issuing...' : 'Issue & Record in Database'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Preview */}
          <div className="lg:col-span-8 flex flex-col items-center space-y-3">
            <div className="w-full flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleExportJpeg}
                disabled={isExporting}
                className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer disabled:opacity-50"
              >
                Export JPEG
              </button>
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={isExporting}
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
                    width: '842px',
                    minHeight: '595px',
                    boxSizing: 'border-box',
                  }}
                >
                  <style dangerouslySetInnerHTML={{ __html: compiled.css }} />
                  <div dangerouslySetInnerHTML={{ __html: compiled.html }} />
                </div>
              ) : (
                <div className="p-12 text-center text-xs text-slate-400">Loading certificate preview...</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
