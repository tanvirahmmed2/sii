'use client';

import React, { useEffect, useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import TenantLoader from 'src/component/tenant/TenantLoader';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import { exportElementAsJpeg, exportElementAsPdf } from 'src/lib/export/documentExporter';

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
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <span className="text-[10px] font-semibold text-primary uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 border border-primary/20 inline-block mb-1">
            Academic Credentials &amp; Honors
          </span>
          <h1 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
            Academic Certificates &amp; Credentials
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Official institutional merit certificates, graduation credentials, and co-curricular recognition records.
          </p>
        </div>

        {selectedCert && (
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

      {certificates.length === 0 ? (
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-10 text-center space-y-2">
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm">No Academic Certificates Issued Yet</h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs max-w-sm mx-auto">
            Official achievement, course completion, and merit certificates issued by the institution will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Certificate Selection Roster */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3 space-y-2">
            <div className="px-2 py-1 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Issued Credentials ({certificates.length})
              </span>
              <span className="text-[11px] text-slate-400">Select to preview</span>
            </div>

            <div className="space-y-1 max-h-[500px] overflow-y-auto">
              {certificates.map((cert) => {
                const isSelected = selectedCert?.id === cert.id;
                const certDate = cert.issue_date ? new Date(cert.issue_date).toLocaleDateString('en-GB') : '—';

                return (
                  <div
                    key={cert.id}
                    onClick={() => setSelectedCert(cert)}
                    className={`p-2.5 rounded-md border transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-medium text-xs text-slate-900 dark:text-white">
                          {cert.certificate_no || `CERT-${cert.id}`}
                        </span>
                        <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 px-1.5 py-0.2 rounded font-semibold uppercase">
                          Certified
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                        {cert.award_title || cert.certificate_type || 'Certificate of Merit'}
                      </p>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        Issued: {certDate}
                      </span>
                    </div>

                    <span className="text-xs font-medium text-primary shrink-0">
                      {isSelected ? 'Viewing' : 'Select'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Visual Certificate Preview Area */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 sm:p-5 flex flex-col items-center space-y-4">
            <div className="flex items-center justify-between w-full border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Official Certificate Document
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  No: {selectedCert?.certificate_no || `CERT-${selectedCert?.id}`}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 uppercase tracking-wider">
                Official Credential
              </span>
            </div>

            {compiled && (
              <div className="w-full flex justify-center overflow-x-auto p-4 bg-slate-50 dark:bg-slate-950/60 rounded-md border border-slate-100 dark:border-slate-800">
                <style dangerouslySetInnerHTML={{ __html: compiled.css }} />
                <div
                  ref={certDocRef}
                  className="bg-white shadow-xs border border-slate-200 rounded p-6 max-w-2xl w-full"
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
