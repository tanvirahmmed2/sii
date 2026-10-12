'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import { exportElementAsJpeg, exportElementAsPdf } from 'src/lib/export/documentExporter';

export default function PostersPage() {
  const { website, getApiEndpoint } = useTenantWebsite();

  const [activeTemplate, setActiveTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Poster Customizable Fields
  const [headline, setHeadline] = useState('Admissions Open for Academic Session 2026-2027');
  const [subheadline, setSubheadline] = useState('World-class holistic education, state-of-the-art laboratories & competitive curriculum.');
  const [eventDate, setEventDate] = useState('Applications open until November 30, 2026');
  const [venue, setVenue] = useState('Main Campus Auditorium & Online Admission Portal');
  const [callToAction, setCallToAction] = useState('Apply online today at school portal');
  const [contactInfo, setContactInfo] = useState('');

  const posterRef = useRef(null);

  useEffect(() => {
    async function loadTemplate() {
      setLoading(true);
      try {
        const res = await fetch(getApiEndpoint('staff/panel/templates?category=poster'));
        const data = await res.json();
        if (res.ok && data.success && data.active_template) {
          setActiveTemplate(data.active_template);
        }
      } catch (e) {
        console.warn('Notice loading poster template:', e);
      } finally {
        setLoading(false);
      }
    }
    loadTemplate();
  }, []);

  // Compile live HTML
  const compilePoster = () => {
    if (!activeTemplate) return null;
    let html = activeTemplate.html_content || '';
    const css = activeTemplate.css_content || '';

    const replacements = {
      '{{school_name}}': website?.name || 'Academic Institution',
      '{{school_address}}': website?.address || 'Main Campus Secretariat',
      '{{school_logo}}': website?.logo_url || 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=120',
      '{{headline}}': headline,
      '{{subheadline}}': subheadline,
      '{{event_date}}': eventDate,
      '{{venue}}': venue,
      '{{call_to_action}}': callToAction,
      '{{emergency_contact}}': contactInfo || website?.phone || '+1 (555) 019-2834',
    };

    Object.entries(replacements).forEach(([k, v]) => {
      const reg = new RegExp(k.replace(/([{}])/g, '\\$1'), 'g');
      html = html.replace(reg, v);
    });

    return { html, css };
  };

  // Export JPEG
  const handleExportJpeg = async () => {
    if (!posterRef.current) return;
    setIsExporting(true);
    toast.loading('Exporting High-Res Poster JPEG...', { id: 'poster-export' });
    try {
      await exportElementAsJpeg(posterRef.current, `Website_Poster_${Date.now()}`);
      toast.success('Poster JPEG downloaded successfully!', { id: 'poster-export' });
    } catch {
      toast.error('Failed to export JPEG', { id: 'poster-export' });
    } finally {
      setIsExporting(false);
    }
  };

  // Export PDF
  const handleExportPdf = async () => {
    if (!posterRef.current) return;
    setIsExporting(true);
    toast.loading('Generating Print-Grade Poster PDF...', { id: 'poster-export' });
    try {
      await exportElementAsPdf(posterRef.current, `Website_Poster_${Date.now()}`, {
        widthMm: 210,
        heightMm: 297,
        orientation: 'portrait',
      });
      toast.success('Poster PDF downloaded successfully!', { id: 'poster-export' });
    } catch {
      toast.error('Failed to export PDF', { id: 'poster-export' });
    } finally {
      setIsExporting(false);
    }
  };

  const compiled = compilePoster();

  return (
    <div className="w-full space-y-4">
      {/* Page Header */}
      <div className="pb-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-white">
            Website Poster Generator &amp; Export
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Customize institutional marketing, admissions, and event posters with instant JPEG and PDF downloads.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/staff-panel/poster-templates"
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
          >
            Change Template
          </Link>
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
        {/* Left Form: Poster Particulars */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-3.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Poster Content &amp; Copy
            </h3>

            <div className="text-xs">
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Headline / Title *</label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="text-xs">
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Subheadline / Supporting Text</label>
              <textarea
                rows={3}
                value={subheadline}
                onChange={(e) => setSubheadline(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
              />
            </div>

            <div className="text-xs">
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Event Date / Deadline</label>
              <input
                type="text"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="text-xs">
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Venue / Portal Address</label>
              <input
                type="text"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="text-xs">
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Call to Action</label>
              <input
                type="text"
                value={callToAction}
                onChange={(e) => setCallToAction(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="text-xs">
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Inquiries / Hotline</label>
              <input
                type="text"
                value={contactInfo}
                placeholder={website?.phone || '+1 (555) 019-2834'}
                onChange={(e) => setContactInfo(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>
        </div>

        {/* Right Preview Surface */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="w-full bg-slate-100 dark:bg-slate-950 p-4 rounded border border-slate-200 dark:border-slate-800 overflow-auto flex justify-center">
            {compiled ? (
              <div
                ref={posterRef}
                className="bg-white shadow-md text-slate-900"
                style={{
                  width: activeTemplate ? `${Math.min(activeTemplate.dimension_width, 540)}px` : '500px',
                  minHeight: activeTemplate ? `${Math.min(activeTemplate.dimension_height, 600)}px` : '500px',
                  boxSizing: 'border-box',
                }}
              >
                <style dangerouslySetInnerHTML={{ __html: compiled.css }} />
                <div dangerouslySetInnerHTML={{ __html: compiled.html }} />
              </div>
            ) : (
              <div className="p-16 flex justify-center items-center">
                <div className="loader loader-md" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
