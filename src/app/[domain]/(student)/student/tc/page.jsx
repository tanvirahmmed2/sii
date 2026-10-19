'use client';

import React, { useEffect, useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import TenantLoader from 'src/component/tenant/TenantLoader';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import { exportElementAsJpeg, exportElementAsPdf } from 'src/lib/export/documentExporter';
import { 
  FiFileText, FiPrinter, FiDownload, FiCheckCircle, 
  FiLock, FiClock, FiShield, FiUser 
} from 'react-icons/fi';

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
    <div className="flex flex-col gap-6 w-full pb-12 animate-fade-up">
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/70 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
            <FiFileText /> Institutional Academic Release
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Transfer Certificate (TC)</h1>
          <p className="text-slate-500 text-xs sm:text-sm font-normal mt-1">
            Official institutional clearance and transfer document for migrating to other educational institutions.
          </p>
        </div>

        {tc && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleDownloadJpeg}
              disabled={isExporting}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              <FiDownload className="text-xs" /> JPEG
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              <FiDownload className="text-xs" /> PDF
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <FiPrinter className="text-xs" /> Print TC
            </button>
          </div>
        )}
      </div>

      {/* Student Summary */}
      {student && (
        <div className="bg-white border border-slate-200/70 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100/70 text-indigo-700 rounded-2xl flex items-center justify-center font-bold text-lg border border-indigo-200/60 shrink-0">
              {student.name ? student.name.charAt(0).toUpperCase() : <FiUser />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">{student.name}</h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                <span>Reg No: <strong className="text-slate-800 font-mono">{student.registration_no}</strong></span>
                <span>&bull;</span>
                <span>Class: <strong className="text-slate-800">{student.class_name}</strong></span>
                <span>&bull;</span>
                <span>Session: <strong className="text-slate-800">{student.session_name || 'Active Session'}</strong></span>
              </div>
            </div>
          </div>

          <div>
            {tc ? (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full text-xs font-bold">
                <FiCheckCircle className="text-emerald-600 text-sm" /> TC Issued &amp; Registered
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-50 text-amber-700 border border-amber-200/60 rounded-full text-xs font-bold">
                <FiClock className="text-amber-600 text-sm" /> No TC Issued
              </span>
            )}
          </div>
        </div>
      )}

      {/* TC Preview or Notice */}
      {tc ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Visual TC Preview */}
          <div className="lg:col-span-8 bg-white border border-slate-200/70 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col items-center space-y-4">
            <div className="flex items-center justify-between w-full border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Transfer Certificate Preview
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  Certificate No: {tcNumber}
                </span>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                Issued: {issueDateFormatted}
              </span>
            </div>

            {compiled && (
              <div className="w-full flex justify-center overflow-x-auto p-4 bg-slate-50 rounded-2xl">
                <style dangerouslySetInnerHTML={{ __html: compiled.css }} />
                <div
                  ref={tcDocRef}
                  className="bg-white shadow-md border border-slate-200 rounded p-8 max-w-3xl w-full"
                >
                  <div dangerouslySetInnerHTML={{ __html: compiled.html }} />
                </div>
              </div>
            )}
          </div>

          {/* TC Parameter Details */}
          <div className="lg:col-span-4 bg-white border border-slate-200/70 rounded-3xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Clearance &amp; Exit Record</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-semibold text-slate-400">TC Serial</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{tcNumber}</td>
                  </tr>
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-semibold text-slate-400">Last Class</td>
                    <td className="py-2.5 px-3 font-bold text-slate-800">{tc.last_class_passed || student?.class_name}</td>
                  </tr>
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-semibold text-slate-400">Promoted To</td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">{tc.promoted_class || 'Grade Promotion'}</td>
                  </tr>
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-semibold text-slate-400">Reason</td>
                    <td className="py-2.5 px-3 text-slate-700">{tc.reason_for_leaving || 'Parent Request'}</td>
                  </tr>
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-semibold text-slate-400">Dues Clearance</td>
                    <td className="py-2.5 px-3 font-bold text-emerald-700">{tc.dues_status || 'Paid In Full'}</td>
                  </tr>
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-semibold text-slate-400">Conduct</td>
                    <td className="py-2.5 px-3 font-bold text-slate-800">{tc.conduct || 'Very Good'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/70 rounded-3xl p-12 text-center flex flex-col items-center justify-center shadow-xs space-y-3">
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400">
            <FiLock className="text-3xl text-slate-400" />
          </div>
          <h3 className="font-bold text-slate-800 text-base">No Transfer Certificate (TC) Issued</h3>
          <p className="text-slate-400 text-xs max-w-md">
            You are currently an active enrolled student. An official Transfer Certificate is issued by the registrar upon graduation or exit clearance.
          </p>
        </div>
      )}
    </div>
  );
}
