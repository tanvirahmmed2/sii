'use client';

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import { exportElementAsJpeg, exportElementAsPdf } from 'src/lib/export/documentExporter';

export default function TransferCertificatePage() {
  const { website, getApiEndpoint } = useTenantWebsite();

  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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
  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');

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
  }, []);

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setFatherName(student.guardian_name || student.father_name || 'Robert Hayes');
    setMotherName(student.mother_name || 'Eleanor Hayes');
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
        orientation: 'portrait',
      });
      toast.success('Official TC PDF downloaded!', { id: 'tc-export' });
    } catch {
      toast.error('Failed to export PDF', { id: 'tc-export' });
    } finally {
      setIsExporting(false);
    }
  };

  const compiled = compileTcDocument();

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="pb-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-white">
            Transfer Certificate (TC) Issuance
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Issue official academic departure certificates with formal institution seals and instant PDF/JPEG downloads.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/staff-panel/tc-templates"
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
        {/* Left Form: Select Student & Fill Parameters */}
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
              className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-slate-800 dark:focus:border-slate-400"
            />
            <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded">
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

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Father&apos;s Name</label>
                <input
                  type="text"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Mother&apos;s Name</label>
                <input
                  type="text"
                  value={motherName}
                  onChange={(e) => setMotherName(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Last Class Studied</label>
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
              <label className="block text-[11px] font-medium text-slate-500 mb-1">General Conduct &amp; Character</label>
              <input
                type="text"
                value={conduct}
                onChange={(e) => setConduct(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Right Preview Surface */}
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
              <div className="p-12 text-center text-xs text-slate-400">Select a student to generate TC preview</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
