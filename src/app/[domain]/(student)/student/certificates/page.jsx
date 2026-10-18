'use client';

import React, { useEffect, useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import TenantLoader from 'src/component/tenant/TenantLoader';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import { exportElementAsJpeg, exportElementAsPdf } from 'src/lib/export/documentExporter';
import { 
  FiAward, FiPrinter, FiDownload, FiCheckCircle, 
  FiLock, FiUser, FiFileText 
} from 'react-icons/fi';

export default function StudentCertificatesPage() {
  const { website, getApiEndpoint } = useTenantWebsite();
  const [student, setStudent] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [selectedCert, setSelectedCert] = useState(null);
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const certDocRef = useRef(null);

  useEffect(() => {
    const fetchCertificates = async () => {
      try {
        const res = await fetch(getApiEndpoint('student/certificates'));
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setStudent(data.student || null);
            setCertificates(data.certificates || []);
            setTemplate(data.template || null);
            if ((data.certificates || []).length > 0) {
              setSelectedCert(data.certificates[0]);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching certificates:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCertificates();
  }, [getApiEndpoint]);

  if (loading) {
    return <TenantLoader fullScreen={false} />;
  }

  // Compile Certificate HTML with active template
  const compileCertHtml = (cert) => {
    if (!cert || !template) return null;
    let html = template.custom_html || template.html_content || '';
    const css = template.custom_css || template.css_content || '';

    const certNo = cert.certificate_no || `CERT-${cert.id}`;
    const issueDateFormatted = cert.issue_date ? new Date(cert.issue_date).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');

    const replacements = {
      '{{certificate_no}}': certNo,
      '{{serial_no}}': certNo,
      '{{student_name}}': student?.name || 'Student Name',
      '{{name}}': student?.name || 'Student Name',
      '{{registration_no}}': student?.registration_no || 'REG-0001',
      '{{roll_no}}': student?.roll_no || '—',
      '{{class_name}}': student?.class_name || 'Class',
      '{{section_name}}': student?.section_name || 'Section',
      '{{session_name}}': student?.session_name || '2026-2027',
      '{{certificate_type}}': cert.certificate_type || 'Academic Excellence Certificate',
      '{{award_title}}': cert.award_title || 'Certificate of Achievement',
      '{{title}}': cert.award_title || 'Certificate of Achievement',
      '{{achievement_description}}': cert.achievement_description || 'For outstanding academic distinction, dedication, and exemplary performance.',
      '{{description}}': cert.achievement_description || 'For outstanding academic distinction, dedication, and exemplary performance.',
      '{{event_date}}': cert.event_date ? new Date(cert.event_date).toLocaleDateString('en-GB') : issueDateFormatted,
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

  const compiled = compileCertHtml(selectedCert);

  const handleDownloadJpeg = async () => {
    if (!certDocRef.current) return;
    setIsExporting(true);
    toast.loading('Exporting Certificate JPEG...', { id: 'cert-export' });
    try {
      await exportElementAsJpeg(certDocRef.current, `Certificate_${selectedCert?.certificate_no || 'academic'}`);
      toast.success('Certificate JPEG downloaded successfully!', { id: 'cert-export' });
    } catch {
      toast.error('Failed to export JPEG.', { id: 'cert-export' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!certDocRef.current) return;
    setIsExporting(true);
    toast.loading('Generating Official Certificate PDF...', { id: 'cert-export' });
    try {
      await exportElementAsPdf(certDocRef.current, `Certificate_${selectedCert?.certificate_no || 'academic'}`, {
        widthMm: 297,
        heightMm: 210,
      });
      toast.success('Official Certificate PDF downloaded!', { id: 'cert-export' });
    } catch {
      toast.error('Failed to export PDF.', { id: 'cert-export' });
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto pb-12 animate-fade-up">
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/70 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
            <FiAward /> Academic Distinctions &amp; Credentials
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Academic Certificates</h1>
          <p className="text-slate-500 text-xs sm:text-sm font-normal mt-1">
            Official institutional merit certificates, graduation credentials, and co-curricular recognition records.
          </p>
        </div>

        {selectedCert && (
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
              <FiPrinter className="text-xs" /> Print
            </button>
          </div>
        )}
      </div>

      {certificates.length === 0 ? (
        <div className="bg-white border border-slate-200/70 rounded-3xl p-12 text-center flex flex-col items-center justify-center shadow-xs space-y-3">
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400">
            <FiAward className="text-3xl" />
          </div>
          <h3 className="font-bold text-slate-800 text-base">No Academic Certificates Issued Yet</h3>
          <p className="text-slate-400 text-xs max-w-sm">
            Official achievement, course completion, and merit certificates issued by the institution will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Certificate List */}
          <div className="lg:col-span-5 bg-white border border-slate-200/70 rounded-3xl p-4 shadow-xs space-y-2">
            <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Issued Credentials ({certificates.length})
              </span>
              <span className="text-[11px] text-slate-400">Select to preview</span>
            </div>

            <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
              {certificates.map((cert) => {
                const isSelected = selectedCert?.id === cert.id;
                const certDate = cert.issue_date ? new Date(cert.issue_date).toLocaleDateString('en-GB') : '—';

                return (
                  <div
                    key={cert.id}
                    onClick={() => setSelectedCert(cert)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-1 ring-indigo-500'
                        : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs text-slate-900">
                          {cert.certificate_no || `CERT-${cert.id}`}
                        </span>
                        <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded font-semibold">
                          Certified
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-800 truncate max-w-[200px]">
                        {cert.award_title || cert.certificate_type || 'Certificate of Merit'}
                      </p>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        Issued: {certDate}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                        View
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Visual Certificate Preview */}
          <div className="lg:col-span-7 bg-white border border-slate-200/70 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col items-center space-y-4">
            <div className="flex items-center justify-between w-full border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Official Certificate Document
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  No: {selectedCert?.certificate_no || `CERT-${selectedCert?.id}`}
                </span>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <FiCheckCircle className="text-xs" /> Official Credential
              </span>
            </div>

            {compiled && (
              <div className="w-full flex justify-center overflow-x-auto p-4 bg-slate-50 rounded-2xl">
                <style dangerouslySetInnerHTML={{ __html: compiled.css }} />
                <div
                  ref={certDocRef}
                  className="bg-white shadow-md border border-slate-200 rounded p-8 max-w-2xl w-full"
                >
                  <div dangerouslySetInnerHTML={{ __html: compiled.html }} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
