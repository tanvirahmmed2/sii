'use client';

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import { exportElementAsJpeg, exportElementAsPdf } from 'src/lib/export/documentExporter';

export default function TestimonialPage() {
  const { website, getApiEndpoint } = useTenantWebsite();

  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Active Template
  const [activeTemplate, setActiveTemplate] = useState(null);
  const printDocRef = useRef(null);

  // Testimonial Specific Fields
  const [examName, setExamName] = useState('Secondary School Certificate (SSC)');
  const [passingYear, setPassingYear] = useState(new Date().getFullYear().toString());
  const [gpa, setGpa] = useState('5.00 (A+)');
  const [sessionName, setSessionName] = useState('2024 - 2026');
  const [conduct, setConduct] = useState('praiseworthy, disciplined and exemplary');
  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');

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
  }, []);

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setFatherName(student.guardian_name || student.father_name || 'Carlos Alverez');
    setMotherName(student.mother_name || 'Maria Alverez');
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
      '{{issue_date}}': new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
      '{{school_name}}': website?.name || 'Educational Institution',
    };

    Object.entries(replacements).forEach(([k, v]) => {
      const reg = new RegExp(k.replace(/([{}])/g, '\\$1'), 'g');
      html = html.replace(reg, v);
    });

    return { html, css };
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
        orientation: 'portrait',
      });
      toast.success('Official Testimonial PDF downloaded!', { id: 'tm-export' });
    } catch {
      toast.error('Failed to export PDF', { id: 'tm-export' });
    } finally {
      setIsExporting(false);
    }
  };

  const compiled = compileTestimonial();

  return (
    <div className="w-full space-y-4">
      {/* Page Header */}
      <div className="pb-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-white">
            Academic Testimonial Issuance
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Issue formal character and academic commendation testimonials with instant PDF and JPEG export.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/staff-panel/testimonial-templates"
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
          >
            Change Template
          </a>
          {selectedStudent && (
            <>
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
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Form: Select Student & Testimonial Details */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              1. Select Student
            </h3>
            <input
              type="text"
              placeholder="Search by student name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-slate-800 dark:focus:border-slate-400"
            />
            <div className="max-h-44 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded">
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

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              2. Academic Commendation Particulars
            </h3>

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
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Passing Year</label>
                <input
                  type="text"
                  value={passingYear}
                  onChange={(e) => setPassingYear(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">GPA / Result</label>
                <input
                  type="text"
                  value={gpa}
                  onChange={(e) => setGpa(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-emerald-600"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Session</label>
              <input
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>

            <div className="text-xs">
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Moral Conduct Statement</label>
              <input
                type="text"
                value={conduct}
                onChange={(e) => setConduct(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Right Preview */}
        <div className="lg:col-span-7 flex flex-col items-center">
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
              <div className="p-12 text-center text-xs text-slate-400">Select a student to generate testimonial preview</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
