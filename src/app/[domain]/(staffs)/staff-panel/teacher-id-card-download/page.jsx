'use client';

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import { exportElementAsJpeg, exportElementAsPdf, exportMultipleCardsAsPdf } from 'src/lib/export/documentExporter';

export default function TeacherIdCardDownloadPage() {
  const { website, getApiEndpoint } = useTenantWebsite();

  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const cardRefs = useRef({});

  // Fetch teachers & active template
  useEffect(() => {
    async function initData() {
      setLoading(true);
      try {
        // 1. Fetch active template
        const tplRes = await fetch(getApiEndpoint('staff/panel/templates?category=teacher_id_card'));
        const tplData = await tplRes.json();
        if (tplRes.ok && tplData.success && tplData.active_template) {
          setActiveTemplate(tplData.active_template);
        }

        // 2. Fetch teachers roster
        const res = await fetch(getApiEndpoint('staff/panel/teacher'));
        const data = await res.json();
        if (res.ok && data.success) {
          const list = data.payload?.teachers || data.teachers || [];
          setTeachers(list);
          setSelectedIds(list.map((t) => t.id));
        }
      } catch (e) {
        console.warn('Notice loading teacher data:', e);
      } finally {
        setLoading(false);
      }
    }

    initData();
  }, []);

  const toggleSelectAll = () => {
    if (selectedIds.length === teachers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(teachers.map((t) => t.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Compile card HTML
  const compileTeacherCard = (teacher) => {
    if (!activeTemplate) return null;
    let html = activeTemplate.html_content || '';
    const css = activeTemplate.css_content || '';

    const replacements = {
      '{{teacher_name}}': teacher.name || 'Faculty Member',
      '{{designation}}': teacher.designation_name || teacher.designation || 'Lecturer',
      '{{department}}': teacher.department_name || teacher.department || 'Faculty of Education',
      '{{employee_id}}': teacher.employee_id || teacher.code || `FAC-${teacher.id}`,
      '{{phone}}': teacher.number || teacher.phone || '+1 (555) 019-2834',
      '{{blood_group}}': teacher.blood_group || 'O+',
      '{{teacher_photo}}': teacher.image || teacher.photo_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300',
      '{{school_name}}': website?.name || 'Educational Institution',
      '{{school_logo}}': website?.logo_url || 'https://api.iconify.design/lucide:shield-check.svg',
      '{{signature_url}}': '',
    };

    Object.entries(replacements).forEach(([k, v]) => {
      const reg = new RegExp(k.replace(/([{}])/g, '\\$1'), 'g');
      html = html.replace(reg, v);
    });

    return { html, css };
  };

  // Export single card as JPEG
  const handleDownloadSingleJpeg = async (teacher) => {
    const el = cardRefs.current[teacher.id];
    if (!el) return;
    try {
      toast.loading(`Exporting JPEG for ${teacher.name}...`, { id: 'teacher-export' });
      await exportElementAsJpeg(el, `Faculty_ID_${teacher.employee_id || teacher.name}`);
      toast.success('JPEG downloaded successfully!', { id: 'teacher-export' });
    } catch {
      toast.error('Failed to export JPEG', { id: 'teacher-export' });
    }
  };

  // Export single card as PDF
  const handleDownloadSinglePdf = async (teacher) => {
    const el = cardRefs.current[teacher.id];
    if (!el) return;
    try {
      toast.loading(`Exporting PDF for ${teacher.name}...`, { id: 'teacher-export' });
      await exportElementAsPdf(el, `Faculty_ID_${teacher.employee_id || teacher.name}`, {
        widthMm: activeTemplate?.dimension_width || 86,
        heightMm: activeTemplate?.dimension_height || 54,
        orientation: activeTemplate?.orientation || 'landscape',
      });
      toast.success('PDF downloaded successfully!', { id: 'teacher-export' });
    } catch {
      toast.error('Failed to export PDF', { id: 'teacher-export' });
    }
  };

  // Batch Export
  const handleBatchPdfDownload = async () => {
    const targetElements = selectedTeachers
      .map((t) => cardRefs.current[t.id])
      .filter(Boolean);

    if (targetElements.length === 0) {
      toast.error('Please select at least one teacher card.');
      return;
    }

    setIsExporting(true);
    toast.loading(`Generating PDF for ${targetElements.length} faculty cards...`, { id: 'teacher-batch' });
    try {
      await exportMultipleCardsAsPdf(
        targetElements,
        `Faculty_ID_Cards_Batch_${Date.now()}`,
        {
          widthMm: activeTemplate?.dimension_width || 86,
          heightMm: activeTemplate?.dimension_height || 54,
          orientation: activeTemplate?.orientation || 'landscape',
        }
      );
      toast.success('Batch PDF generated and downloaded!', { id: 'teacher-batch' });
    } catch (e) {
      toast.error(e.message || 'Error generating batch PDF', { id: 'teacher-batch' });
    } finally {
      setIsExporting(false);
    }
  };

  const filteredTeachers = teachers.filter((t) =>
    (t.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.employee_id || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedTeachers = filteredTeachers.filter((t) => selectedIds.includes(t.id));

  return (
    <div className="w-full space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800 print:hidden">
        <div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-white">
            Teacher ID Card Generation &amp; Export
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Generate high-resolution faculty identification passes with instant PDF and JPEG downloads.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/staff-panel/teacher-id-card"
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
          >
            Change Template
          </a>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search teacher by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-slate-800 dark:focus:border-slate-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleSelectAll}
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            {selectedIds.length === filteredTeachers.length ? 'Deselect All' : 'Select All'}
          </button>
          <button
            type="button"
            onClick={handleBatchPdfDownload}
            disabled={selectedTeachers.length === 0 || isExporting}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded text-xs font-medium shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isExporting ? 'Generating PDF...' : `Download Batch PDF (${selectedTeachers.length})`}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-16 flex justify-center items-center">
          <div className="loader loader-md" />
        </div>
      ) : filteredTeachers.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-12 text-center text-slate-500 text-xs">
          No faculty members found.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {selectedTeachers.map((t) => {
            const cardData = compileTeacherCard(t);

            return (
              <div
                key={t.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 flex flex-col justify-between shadow-2xs gap-3"
              >
                {/* Card Container */}
                <div className="flex justify-center items-center overflow-hidden bg-slate-50 dark:bg-slate-950 p-2 rounded">
                  <div
                    ref={(el) => {
                      cardRefs.current[t.id] = el;
                    }}
                    className="rounded overflow-hidden shadow-sm bg-slate-900 text-white"
                    style={{
                      width: activeTemplate ? `${activeTemplate.dimension_width * 3.7795}px` : '325px',
                      height: activeTemplate ? `${activeTemplate.dimension_height * 3.7795}px` : '204px',
                      maxWidth: '100%',
                    }}
                  >
                    {cardData ? (
                      <>
                        <style dangerouslySetInnerHTML={{ __html: cardData.css }} />
                        <div
                          dangerouslySetInnerHTML={{ __html: cardData.html }}
                          style={{ width: '100%', height: '100%' }}
                        />
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center p-4">
                        <div className="loader loader-sm" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-900 dark:text-white truncate max-w-[140px]">
                    {t.name}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleDownloadSingleJpeg(t)}
                      className="px-2 py-1 rounded text-[11px] font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      JPEG
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadSinglePdf(t)}
                      className="px-2 py-1 rounded text-[11px] font-medium bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:opacity-90 cursor-pointer"
                    >
                      PDF
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
