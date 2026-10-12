'use client';

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import { exportElementAsJpeg, exportElementAsPdf } from 'src/lib/export/documentExporter';

export default function CertificatesPage() {
  const { website, getApiEndpoint } = useTenantWebsite();

  const [students, setStudents] = useState([]);
  const [recipientName, setRecipientName] = useState('Elena Rostova');
  const [awardTitle, setAwardTitle] = useState('Certificate of Academic Excellence');
  const [achievementDescription, setAchievementDescription] = useState(
    'For securing First Rank with Outstanding Performance in the Annual Institutional Science Olympiad.'
  );
  const [certNo, setCertNo] = useState(`CERT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [eventDate, setEventDate] = useState(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }));
  const [isExporting, setIsExporting] = useState(false);

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

        const stuRes = await fetch(getApiEndpoint('staff/panel/students?limit=20'));
        const stuData = await stuRes.json();
        if (stuRes.ok && stuData.success) {
          const list = stuData.payload?.students || [];
          setStudents(list);
          if (list[0]?.name) {
            setRecipientName(list[0].name);
          }
        }
      } catch (e) {
        console.warn('Notice loading certificate template:', e);
      }
    }
    initData();
  }, []);

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
        orientation: 'landscape',
      });
      toast.success('Official Certificate PDF downloaded!', { id: 'cert-export' });
    } catch {
      toast.error('Failed to export PDF', { id: 'cert-export' });
    } finally {
      setIsExporting(false);
    }
  };

  const compiled = compileCertificate();

  return (
    <div className="w-full space-y-4">
      {/* Page Header */}
      <div className="pb-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-white">
            Academic Certificate Generator
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Generate landscape institutional certificates for honors, graduation, and merit achievements with instant PDF and JPEG downloads.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/staff-panel/certificate-templates"
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
          >
            Change Template
          </a>
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Form */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-3.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Certificate Details
            </h3>

            {students.length > 0 && (
              <div className="text-xs">
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Pick from Roster (Optional)</label>
                <select
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                >
                  <option value="">Select student...</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name} ({s.registration_no})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="text-xs">
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Recipient Name *</label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
              />
            </div>

            <div className="text-xs">
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Award / Honor Title *</label>
              <input
                type="text"
                value={awardTitle}
                onChange={(e) => setAwardTitle(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="text-xs">
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Citation / Achievement Body</label>
              <textarea
                rows={3}
                value={achievementDescription}
                onChange={(e) => setAchievementDescription(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Certificate No</label>
                <input
                  type="text"
                  value={certNo}
                  onChange={(e) => setCertNo(e.target.value)}
                  className="w-full font-mono text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Award Date</label>
                <input
                  type="text"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Preview */}
        <div className="lg:col-span-8 flex flex-col items-center">
          <div className="w-full bg-slate-100 dark:bg-slate-950 p-4 rounded border border-slate-200 dark:border-slate-800 overflow-auto flex justify-center">
            {compiled ? (
              <div
                ref={printDocRef}
                className="bg-white shadow-md text-slate-900"
                style={{
                  width: '740px',
                  minHeight: '520px',
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
    </div>
  );
}
