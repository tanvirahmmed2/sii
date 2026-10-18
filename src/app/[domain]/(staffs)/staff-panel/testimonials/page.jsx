'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import { exportElementAsJpeg, exportElementAsPdf } from 'src/lib/export/documentExporter';
import { FiSave, FiList, FiTrash2, FiSearch, FiRefreshCw } from 'react-icons/fi';

export default function TestimonialPage() {
  const { website, getApiEndpoint } = useTenantWebsite();

  // Mode: 'generate' or 'archive'
  const [activeTab, setActiveTab] = useState('generate');

  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Active Template
  const [activeTemplate, setActiveTemplate] = useState(null);
  const printDocRef = useRef(null);

  // Testimonial Specific Fields
  const [testimonialNo, setTestimonialNo] = useState(`TEST-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [examName, setExamName] = useState('Secondary School Certificate (SSC)');
  const [passingYear, setPassingYear] = useState(new Date().getFullYear().toString());
  const [gpa, setGpa] = useState('5.00 (A+)');
  const [sessionName, setSessionName] = useState('2024 - 2026');
  const [conduct, setConduct] = useState('praiseworthy, disciplined and exemplary');
  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');

  // Archive state
  const [issuedTestimonials, setIssuedTestimonials] = useState([]);
  const [loadingArchive, setLoadingArchive] = useState(false);
  const [archiveSearch, setArchiveSearch] = useState('');

  // Fetch template and students
  useEffect(() => {
    async function initData() {
      try {
        const tplRes = await fetch(getApiEndpoint('staff/panel/templates?category=testimonial'));
        const tplData = await tplRes.json();
        if (tplRes.ok && tplData.success && tplData.active_template) {
          setActiveTemplate(tplData.active_template);
        }

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
        console.warn('Notice loading testimonial data:', e);
      }
    }
    initData();
  }, [getApiEndpoint]);

  // Fetch issued testimonials archive from website_student_testimonials
  const fetchIssuedTestimonials = useCallback(async () => {
    setLoadingArchive(true);
    try {
      const params = new URLSearchParams();
      if (archiveSearch.trim()) params.set('search', archiveSearch.trim());

      const res = await fetch(getApiEndpoint(`staff/panel/testimonials?${params.toString()}`));
      const data = await res.json();
      if (res.ok && data.success) {
        setIssuedTestimonials(data.payload?.testimonials || []);
      } else {
        toast.error(data.error || 'Failed to fetch testimonials.');
      }
    } catch {
      toast.error('Network error loading testimonials.');
    } finally {
      setLoadingArchive(false);
    }
  }, [archiveSearch, getApiEndpoint]);

  useEffect(() => {
    if (activeTab === 'archive') {
      fetchIssuedTestimonials();
    }
  }, [activeTab, fetchIssuedTestimonials]);

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setFatherName(student.guardian_name || student.father_name || 'Guardian Name');
    setMotherName(student.mother_name || 'Mother Name');
    setSessionName(student.session_name || '2024 - 2026');
  };

  // Compile Testimonial document HTML
  const compileTestimonial = () => {
    if (!activeTemplate || !selectedStudent) return null;
    let html = activeTemplate.html_content || '';
    const css = activeTemplate.css_content || '';

    const replacements = {
      '{{student_name}}': selectedStudent.name || 'Student Name',
      '{{father_name}}': fatherName,
      '{{mother_name}}': motherName,
      '{{registration_no}}': selectedStudent.registration_no || selectedStudent.student_unique_id || 'REG-0001',
      '{{examination_name}}': examName,
      '{{passing_year}}': passingYear,
      '{{gpa}}': gpa,
      '{{session_name}}': sessionName,
      '{{conduct}}': conduct,
      '{{testimonial_no}}': testimonialNo,
      '{{issue_date}}': new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
      '{{school_name}}': website?.name || 'Educational Institution',
    };

    Object.entries(replacements).forEach(([k, v]) => {
      const reg = new RegExp(k.replace(/([{}])/g, '\\$1'), 'g');
      html = html.replace(reg, v);
    });

    return { html, css };
  };

  // Issue & Save Testimonial in Database
  const handleIssueAndSaveTestimonial = async () => {
    if (!selectedStudent) {
      toast.error('Please select a student.');
      return;
    }

    setIsSaving(true);
    toast.loading('Issuing and recording Testimonial...', { id: 'save-testimonial' });
    try {
      const res = await fetch(getApiEndpoint('staff/panel/testimonials'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: selectedStudent.id,
          testimonial_no: testimonialNo,
          template_id: activeTemplate?.id || null,
          examination_name: examName,
          session_name: sessionName,
          passing_year: passingYear,
          gpa: parseFloat(gpa) || 5.0,
          conduct,
          status: 'issued',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'Testimonial recorded successfully!', { id: 'save-testimonial' });
        setTestimonialNo(`TEST-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
      } else {
        toast.error(data.error || 'Failed to record testimonial.', { id: 'save-testimonial' });
      }
    } catch {
      toast.error('Network error recording testimonial.', { id: 'save-testimonial' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportJpeg = async () => {
    if (!printDocRef.current) return;
    setIsExporting(true);
    toast.loading('Exporting High-Res JPEG...', { id: 'tm-export' });
    try {
      await exportElementAsJpeg(printDocRef.current, `Testimonial_${selectedStudent?.name || 'Document'}`);
      toast.success('Testimonial JPEG downloaded!', { id: 'tm-export' });
    } catch {
      toast.error('Failed to export JPEG', { id: 'tm-export' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = async () => {
    if (!printDocRef.current) return;
    setIsExporting(true);
    toast.loading('Generating Official A4 PDF...', { id: 'tm-export' });
    try {
      await exportElementAsPdf(printDocRef.current, `Testimonial_${selectedStudent?.name || 'Document'}`, {
        widthMm: 210,
        heightMm: 297,
      });
      toast.success('Official Testimonial PDF downloaded!', { id: 'tm-export' });
    } catch {
      toast.error('Failed to export PDF', { id: 'tm-export' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteTestimonial = async (id) => {
    if (!window.confirm('Delete this testimonial record?')) return;
    try {
      const res = await fetch(getApiEndpoint(`staff/panel/testimonials?id=${id}`), {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Testimonial record deleted.');
        setIssuedTestimonials((prev) => prev.filter((t) => t.id !== id));
      } else {
        toast.error(data.error || 'Failed to delete testimonial.');
      }
    } catch {
      toast.error('Error deleting testimonial.');
    }
  };

  const compiled = compileTestimonial();

  return (
    <div className="w-full space-y-4">
      {/* Page Header */}
      <div className="pb-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-white">
            Academic Testimonial Issuance &amp; Registry
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Issue formal character commendation testimonials, record issuances in the database, and export formal seals.
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
              Issue Testimonial
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
            href="/staff-panel/testimonial-templates"
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
          >
            Change Template
          </a>
        </div>
      </div>

      {activeTab === 'archive' ? (
        /* ================= ISSUED TESTIMONIALS ARCHIVE ================= */
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                placeholder="Search by Testimonial #, Student, Exam..."
                value={archiveSearch}
                onChange={(e) => setArchiveSearch(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              <FiSearch className="absolute left-2.5 top-2.5 text-slate-400 text-xs" />
            </div>

            <button
              type="button"
              onClick={fetchIssuedTestimonials}
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
                <span className="text-xs text-slate-400">Loading testimonials...</span>
              </div>
            ) : issuedTestimonials.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                No issued testimonials found in the archive.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-500 tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-3.5 py-2.5">Testimonial #</th>
                      <th className="px-3.5 py-2.5">Student Details</th>
                      <th className="px-3.5 py-2.5">Examination &amp; Session</th>
                      <th className="px-3.5 py-2.5">GPA &amp; Conduct</th>
                      <th className="px-3.5 py-2.5">Status</th>
                      <th className="px-3.5 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {issuedTestimonials.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-3.5 py-2.5 font-mono font-medium text-slate-900 dark:text-white">
                          {t.testimonial_no || t.certificate_number}
                        </td>
                        <td className="px-3.5 py-2.5">
                          <div className="font-medium text-slate-900 dark:text-white">
                            {t.student_name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Reg: {t.registration_no} | Class: {t.class_name}
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-600 dark:text-slate-400">
                          <div>{t.examination_name || 'SSC Exam'}</div>
                          <div className="text-[10px] text-slate-400">
                            Year: {t.passing_year} | Session: {t.session_name}
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5 text-[11px]">
                          <div className="font-mono font-semibold">GPA: {t.gpa || '5.00'}</div>
                          <div className="text-slate-500 truncate max-w-xs">{t.conduct}</div>
                        </td>
                        <td className="px-3.5 py-2.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                            {t.status}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteTestimonial(t.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                            title="Delete Testimonial"
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
        /* ================= GENERATE TESTIMONIAL ================= */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Form */}
          <div className="lg:col-span-5 space-y-4">
            {/* Student Selector Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                1. Select Graduate Student
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

            {/* Testimonial Parameters */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                2. Testimonial Particulars
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Serial Number</label>
                  <input
                    type="text"
                    value={testimonialNo}
                    onChange={(e) => setTestimonialNo(e.target.value)}
                    className="w-full font-mono text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Passing Year</label>
                  <input
                    type="text"
                    value={passingYear}
                    onChange={(e) => setPassingYear(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="text-xs">
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Examination Name</label>
                <input
                  type="text"
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">GPA Secured</label>
                  <input
                    type="text"
                    value={gpa}
                    onChange={(e) => setGpa(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Academic Session</label>
                  <input
                    type="text"
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
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
                  onClick={handleIssueAndSaveTestimonial}
                  disabled={isSaving || !selectedStudent}
                  className="w-full py-2 px-3 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <FiSave /> {isSaving ? 'Issuing...' : 'Issue & Record in Database'}
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
                    width: '595px',
                    minHeight: '842px',
                    boxSizing: 'border-box',
                  }}
                >
                  <style dangerouslySetInnerHTML={{ __html: compiled.css }} />
                  <div dangerouslySetInnerHTML={{ __html: compiled.html }} />
                </div>
              ) : (
                <div className="p-12 text-center text-xs text-slate-400">Loading testimonial preview...</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
