'use client';

import React, { useEffect, useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import TenantLoader from 'src/component/tenant/TenantLoader';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import { exportElementAsJpeg, exportElementAsPdf } from 'src/lib/export/documentExporter';

export default function StudentTCPage() {
  const { website, getApiEndpoint } = useTenantWebsite();
  const [student, setStudent] = useState(null);
  const [tc, setTc] = useState(null);
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const tcDocRef = useRef(null);

  useEffect(() => {
    const fetchTc = async () => {
      try {
        const res = await fetch(getApiEndpoint('student/tc'));
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setStudent(data.student || null);
            setTc(data.tc || null);
            setTemplate(data.template || null);
          }
        }
      } catch (error) {
        console.error('Error fetching TC:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTc();
  }, [getApiEndpoint]);

  if (loading) {
    return <TenantLoader fullScreen={false} />;
  }

  const tcNumber = tc?.tc_number || `TC-${student?.registration_no || 'DRAFT'}`;
  const issueDateFormatted = tc?.issue_date ? new Date(tc.issue_date).toLocaleDateString('en-GB') : 'Official Issue';

  // Compile TC HTML with active template
  const compileTcHtml = () => {
    if (!tc || !template) return null;
    let html = template.custom_html || template.html_content || '';
    const css = template.custom_css || template.css_content || '';

    const replacements = {
      '{{tc_number}}': tcNumber,
      '{{serial_no}}': tcNumber,
      '{{student_name}}': student?.name || 'Student Name',
      '{{registration_no}}': student?.registration_no || 'REG-0001',
      '{{roll_no}}': student?.roll_no || '—',
      '{{admission_date}}': tc.admission_date ? new Date(tc.admission_date).toLocaleDateString('en-GB') : (student?.admission_date ? new Date(student.admission_date).toLocaleDateString('en-GB') : '—'),
      '{{date_of_birth}}': student?.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString('en-GB') : '—',
      '{{father_name}}': student?.father_name || 'Father Name',
      '{{mother_name}}': student?.mother_name || 'Mother Name',
      '{{leaving_date}}': tc.leaving_date ? new Date(tc.leaving_date).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'),
      '{{last_class}}': tc.last_class_passed || tc.last_class_name || student?.class_name || 'Class',
      '{{promoted_class}}': tc.promoted_class || 'Promoted to Next Higher Grade',
      '{{dues_status}}': tc.dues_status || 'All institutional dues paid up to date',
      '{{conduct}}': tc.conduct || 'Good & Exemplary',
      '{{reason}}': tc.reason_for_leaving || 'Parent / Guardian Relocation Request',
      '{{destination_school}}': tc.destination_school || 'Open for Enrollment',
      '{{issue_date}}': issueDateFormatted,
      '{{school_name}}': website?.name || 'Educational Institution',
      '{{institution_name}}': website?.name || 'Educational Institution',
      '{{school_logo}}': website?.logo_url || '/school-logo.png',
      '{{school_phone}}': website?.phone || '+880 1700-000000',
      '{{school_address}}': website?.address || 'Campus Main Office',
    };

    Object.entries(replacements).forEach(([k, v]) => {
      const reg = new RegExp(k.replace(/([{}])/g, '\\$1'), 'g');
      html = html.replace(reg, v);
    });

    return { html, css };
  };

  const compiled = compileTcHtml();

  const handleDownloadJpeg = async () => {
    if (!tcDocRef.current) return;
    setIsExporting(true);
    toast.loading('Exporting Transfer Certificate JPEG...', { id: 'tc-export' });
    try {
      await exportElementAsJpeg(tcDocRef.current, `Transfer_Certificate_${tcNumber}`);
      toast.success('TC JPEG downloaded successfully!', { id: 'tc-export' });
    } catch {
      toast.error('Failed to export JPEG.', { id: 'tc-export' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!tcDocRef.current) return;
    setIsExporting(true);
    toast.loading('Generating Official Transfer Certificate PDF...', { id: 'tc-export' });
    try {
      await exportElementAsPdf(tcDocRef.current, `Transfer_Certificate_${tcNumber}`, {
        widthMm: 210,
        heightMm: 297,
      });
      toast.success('Official TC PDF downloaded!', { id: 'tc-export' });
    } catch {
      toast.error('Failed to export PDF.', { id: 'tc-export' });
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <span className="text-[10px] font-semibold text-primary uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 border border-primary/20 inline-block mb-1">
            Institutional Academic Release
          </span>
          <h1 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
            Transfer Certificate (TC)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Official institutional clearance and migration credential document for transferring institutions.
          </p>
        </div>

        {tc && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownloadJpeg}
              disabled={isExporting}
              className="px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
            >
              Download JPEG
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
            >
              Download PDF
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-md bg-primary hover:bg-primary-dark text-white text-xs font-medium transition-colors shadow-xs cursor-pointer"
            >
              Print Certificate
            </button>
          </div>
        )}
      </div>

      {/* Student Summary Strip */}
      {student && (
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-semibold text-sm shrink-0">
              {student.name ? student.name.charAt(0).toUpperCase() : 'S'}
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">{student.name}</h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                <span>Reg: <strong className="font-mono font-medium text-slate-700 dark:text-slate-300">{student.registration_no}</strong></span>
                <span>•</span>
                <span>Class: <strong className="font-medium text-slate-700 dark:text-slate-300">{student.class_name}</strong></span>
                <span>•</span>
                <span>Session: <strong className="font-medium text-slate-700 dark:text-slate-300">{student.session_name || 'Active Session'}</strong></span>
              </div>
            </div>
          </div>

          <div>
            {tc ? (
              <span className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 text-[10px] font-semibold uppercase tracking-wider">
                TC Issued &amp; Registered
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 text-[10px] font-semibold uppercase tracking-wider">
                Active Enrolled Student
              </span>
            )}
          </div>
        </div>
      )}

      {/* TC Preview or Notice */}
      {tc ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Visual TC Preview */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 sm:p-5 flex flex-col items-center space-y-4">
            <div className="flex items-center justify-between w-full border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Transfer Certificate Preview
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  Certificate No: {tcNumber}
                </span>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                Issued: {issueDateFormatted}
              </span>
            </div>

            {compiled && (
              <div className="w-full flex justify-center overflow-x-auto p-4 bg-slate-50 dark:bg-slate-950/60 rounded-md border border-slate-100 dark:border-slate-800">
                <style dangerouslySetInnerHTML={{ __html: compiled.css }} />
                <div
                  ref={tcDocRef}
                  className="bg-white shadow-xs border border-slate-200 rounded p-6 max-w-3xl w-full"
                >
                  <div dangerouslySetInnerHTML={{ __html: compiled.html }} />
                </div>
              </div>
            )}
          </div>

          {/* TC Parameter Details */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 space-y-3">
            <h3 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">Clearance &amp; Exit Parameters</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">TC Serial</td>
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-900 dark:text-white">{tcNumber}</td>
                  </tr>
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">Last Class</td>
                    <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">{tc.last_class_passed || student?.class_name}</td>
                  </tr>
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">Promoted To</td>
                    <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">{tc.promoted_class || 'Grade Promotion'}</td>
                  </tr>
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">Reason</td>
                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">{tc.reason_for_leaving || 'Parent Request'}</td>
                  </tr>
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">Dues Clearance</td>
                    <td className="py-2.5 px-3 font-medium text-emerald-700 dark:text-emerald-400">{tc.dues_status || 'Paid In Full'}</td>
                  </tr>
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">Conduct</td>
                    <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">{tc.conduct || 'Very Good'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-10 text-center space-y-2">
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm">No Transfer Certificate (TC) Issued</h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs max-w-md mx-auto">
            You are currently an active enrolled student. An official Transfer Certificate is issued by the registrar upon graduation or formal exit clearance.
          </p>
        </div>
      )}
    </div>
  );
}
