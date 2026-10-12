'use client';

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import StudentFilterBar from 'src/component/staff/StudentFilterBar';
import StudentFilterEmptyState from 'src/component/staff/StudentFilterEmptyState';
import { exportElementAsJpeg, exportElementAsPdf, exportMultipleCardsAsPdf } from 'src/lib/export/documentExporter';

export default function StudentIdCardDownloadPage() {
  const { website, getApiEndpoint } = useTenantWebsite();

  const [hasFiltered, setHasFiltered] = useState(false);
  const [filterInfo, setFilterInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isPrintPreview, setIsPrintPreview] = useState(true);

  // Template from database
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  // Card element refs map
  const cardRefs = useRef({});

  // Fetch active school template
  useEffect(() => {
    async function fetchActiveTemplate() {
      try {
        const res = await fetch(getApiEndpoint('staff/panel/templates?category=student_id_card'));
        const data = await res.json();
        if (res.ok && data.success && data.active_template) {
          setActiveTemplate(data.active_template);
        }
      } catch (e) {
        console.warn('Notice loading active template:', e);
      }
    }
    fetchActiveTemplate();
  }, []);

  const loadData = async ({ sessionId, classId, sectionId, sessionName, className, sectionName }) => {
    setLoading(true);
    setFilterInfo({ sessionId, classId, sectionId, sessionName, className, sectionName });
    setSelectedIds([]);
    try {
      const params = new URLSearchParams({ session_id: sessionId, class_id: classId });
      if (sectionId) params.set('section_id', sectionId);

      const res = await fetch(getApiEndpoint(`staff/panel/students?${params.toString()}`));
      const data = await res.json();

      if (res.ok && data.success) {
        const list = data.payload?.students || [];
        setStudents(list);
        setSelectedIds(list.map((s) => s.id));
        setHasFiltered(true);
        toast.success(`Loaded ${list.length} students ready for ID cards.`);
      } else {
        toast.error(data.error || 'Failed to fetch students.');
      }
    } catch {
      toast.error('Network error loading students.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setHasFiltered(false);
    setFilterInfo(null);
    setStudents([]);
    setSelectedIds([]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === students.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(students.map((s) => s.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Helper to compile card HTML for a student
  const compileStudentCard = (student) => {
    if (!activeTemplate) return null;
    let html = activeTemplate.html_content || '';
    const css = activeTemplate.css_content || '';

    const replacements = {
      '{{student_name}}': student.name || 'Student Name',
      '{{registration_no}}': student.registration_no || student.student_unique_id || 'REG-0001',
      '{{roll_no}}': student.roll_no || '01',
      '{{class_name}}': student.class_name || filterInfo?.className || 'Class',
      '{{section_name}}': student.section_name || filterInfo?.sectionName || 'Sec A',
      '{{blood_group}}': student.blood_group || 'O+',
      '{{student_photo}}': student.primary_photo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300',
      '{{school_name}}': website?.name || 'Educational Institution',
      '{{school_logo}}': website?.logo_url || 'https://api.iconify.design/lucide:graduation-cap.svg',
      '{{valid_upto}}': 'Dec 2027',
      '{{emergency_contact}}': website?.phone || '+1 (555) 019-2834',
    };

    Object.entries(replacements).forEach(([k, v]) => {
      const reg = new RegExp(k.replace(/([{}])/g, '\\$1'), 'g');
      html = html.replace(reg, v);
    });

    return { html, css };
  };

  // Export single card as JPEG
  const handleDownloadSingleJpeg = async (student) => {
    const el = cardRefs.current[student.id];
    if (!el) return;
    try {
      toast.loading(`Exporting JPEG for ${student.name}...`, { id: 'export-single' });
      await exportElementAsJpeg(el, `ID_Card_${student.registration_no || student.name}`);
      toast.success('JPEG downloaded successfully!', { id: 'export-single' });
    } catch {
      toast.error('Failed to export JPEG', { id: 'export-single' });
    }
  };

  // Export single card as PDF
  const handleDownloadSinglePdf = async (student) => {
    const el = cardRefs.current[student.id];
    if (!el) return;
    try {
      toast.loading(`Exporting PDF for ${student.name}...`, { id: 'export-single' });
      await exportElementAsPdf(el, `ID_Card_${student.registration_no || student.name}`, {
        widthMm: activeTemplate?.dimension_width || 54,
        heightMm: activeTemplate?.dimension_height || 86,
        orientation: activeTemplate?.orientation || 'portrait',
      });
      toast.success('PDF downloaded successfully!', { id: 'export-single' });
    } catch {
      toast.error('Failed to export PDF', { id: 'export-single' });
    }
  };

  // Batch Export selected cards as multi-page PDF
  const handleBatchPdfDownload = async () => {
    const targetElements = selectedStudents
      .map((s) => cardRefs.current[s.id])
      .filter(Boolean);

    if (targetElements.length === 0) {
      toast.error('Please select at least one student card.');
      return;
    }

    setIsExporting(true);
    toast.loading(`Generating batch PDF for ${targetElements.length} student cards...`, { id: 'batch-pdf' });
    try {
      await exportMultipleCardsAsPdf(
        targetElements,
        `Student_ID_Cards_${filterInfo?.className || 'Batch'}_${Date.now()}`,
        {
          widthMm: activeTemplate?.dimension_width || 54,
          heightMm: activeTemplate?.dimension_height || 86,
          orientation: activeTemplate?.orientation || 'portrait',
        }
      );
      toast.success('Batch PDF generated and downloaded!', { id: 'batch-pdf' });
    } catch (e) {
      toast.error(e.message || 'Error generating batch PDF', { id: 'batch-pdf' });
    } finally {
      setIsExporting(false);
    }
  };

  const selectedStudents = students.filter((s) => selectedIds.includes(s.id));

  return (
    <div className="w-full space-y-4">
      {/* Page Header (hidden in print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800 print:hidden">
        <div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-white">
            Student ID Card Generation &amp; Export
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Filter by session, class, and section to generate official identification cards with instant PDF and JPEG export.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/staff-panel/student-id-card-templates"
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
          >
            Change Template
          </a>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="print:hidden">
        <StudentFilterBar
          onFilter={loadData}
          onReset={handleReset}
          loading={loading}
          title="Filter Students for ID Cards"
          description="Select session, class, and section to generate printable cards"
        />
      </div>

      {!hasFiltered ? (
        <StudentFilterEmptyState
          title="Filter by Session, Class & Section to Generate ID Cards"
          description="Please select Academic Session, Class, and Section above, then click 'View Data' to load students and generate ID cards."
        />
      ) : (
        <div className="space-y-4">
          {/* Action Toolbar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Queue:
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                {filterInfo?.sessionName}
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                Class: {filterInfo?.className}
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                Section: {filterInfo?.sectionName}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                ({selectedIds.length} of {students.length} selected)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer"
              >
                {selectedIds.length === students.length ? 'Deselect All' : 'Select All'}
              </button>
              <button
                type="button"
                onClick={() => setIsPrintPreview(!isPrintPreview)}
                className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer"
              >
                {isPrintPreview ? 'Checklist View' : 'Cards Preview'}
              </button>
              <button
                type="button"
                onClick={handleBatchPdfDownload}
                disabled={selectedIds.length === 0 || isExporting}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded text-xs font-medium shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isExporting ? 'Generating PDF...' : `Download Batch PDF (${selectedIds.length})`}
              </button>
            </div>
          </div>

          {/* Checklist Mode */}
          {!isPrintPreview && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-3 print:hidden">
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded">
                <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                    <tr>
                      <th className="px-3 py-2.5 w-8">
                        <input
                          type="checkbox"
                          checked={students.length > 0 && selectedIds.length === students.length}
                          onChange={toggleSelectAll}
                          className="cursor-pointer"
                        />
                      </th>
                      <th className="px-3 py-2.5">Reg No</th>
                      <th className="px-3 py-2.5">Roll No</th>
                      <th className="px-3 py-2.5">Student Name</th>
                      <th className="px-3 py-2.5">Class / Section</th>
                      <th className="px-3 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {students.map((s) => (
                      <tr
                        key={s.id}
                        onClick={() => toggleSelect(s.id)}
                        className={`cursor-pointer transition-colors ${
                          selectedIds.includes(s.id)
                            ? 'bg-slate-100/60 dark:bg-slate-800/60'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(s.id)}
                            onChange={() => toggleSelect(s.id)}
                            className="cursor-pointer"
                          />
                        </td>
                        <td className="px-3 py-2 font-mono font-medium text-slate-900 dark:text-white">
                          {s.registration_no}
                        </td>
                        <td className="px-3 py-2 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          {s.roll_no || '—'}
                        </td>
                        <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">
                          {s.name || 'Student Name'}
                        </td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                          {s.class_name} {s.section_name ? `(${s.section_name})` : ''}
                        </td>
                        <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDownloadSingleJpeg(s)}
                              className="px-2 py-0.5 rounded text-[10px] font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            >
                              JPEG
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadSinglePdf(s)}
                              className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:opacity-90 cursor-pointer"
                            >
                              PDF
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Cards Grid Preview & Export */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 print:grid-cols-2 print:gap-4">
            {selectedStudents.map((s) => {
              const cardData = compileStudentCard(s);

              return (
                <div
                  key={s.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 flex flex-col justify-between shadow-2xs gap-3 print:border-none print:shadow-none"
                >
                  {/* Card Container for Export */}
                  <div className="flex justify-center items-center overflow-hidden bg-slate-50 dark:bg-slate-950 p-2 rounded">
                    <div
                      ref={(el) => {
                        cardRefs.current[s.id] = el;
                      }}
                      className="rounded overflow-hidden shadow-sm bg-white text-slate-900"
                      style={{
                        width: activeTemplate ? `${activeTemplate.dimension_width * 3.7795}px` : '204px',
                        height: activeTemplate ? `${activeTemplate.dimension_height * 3.7795}px` : '325px',
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
                        <div className="p-4 text-center text-xs text-slate-400">Loading card layout...</div>
                      )}
                    </div>
                  </div>

                  {/* Card Actions (hidden in print) */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs print:hidden">
                    <span className="font-medium text-slate-900 dark:text-white truncate max-w-[120px]">
                      {s.name}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDownloadSingleJpeg(s)}
                        className="px-2 py-1 rounded text-[11px] font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                        title="Download as high-res JPEG"
                      >
                        JPEG
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadSinglePdf(s)}
                        className="px-2 py-1 rounded text-[11px] font-medium bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 cursor-pointer"
                        title="Download as print-grade PDF"
                      >
                        PDF
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
