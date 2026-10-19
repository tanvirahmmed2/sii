'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import StudentFilterBar from 'src/component/staff/StudentFilterBar';
import StudentFilterEmptyState from 'src/component/staff/StudentFilterEmptyState';
import { exportElementAsJpeg, exportElementAsPdf, exportMultipleCardsAsPdf } from 'src/lib/export/documentExporter';
import { FiSave, FiList, FiCheckCircle, FiTrash2, FiSearch, FiRefreshCw } from 'react-icons/fi';

export default function StudentIdCardDownloadPage() {
  const { website, getApiEndpoint } = useTenantWebsite();

  // Mode: 'generate' or 'archive'
  const [activeTab, setActiveTab] = useState('generate');

  // Generation state
  const [hasFiltered, setHasFiltered] = useState(false);
  const [filterInfo, setFilterInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isPrintPreview, setIsPrintPreview] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Archive / Issued cards state
  const [issuedCards, setIssuedCards] = useState([]);
  const [loadingArchive, setLoadingArchive] = useState(false);
  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveStatus, setArchiveStatus] = useState('all');

  // Template from database
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [systemTemplates, setSystemTemplates] = useState([]);
  const [classAssignments, setClassAssignments] = useState([]);
  const [isExporting, setIsExporting] = useState(false);

  // Card element refs map
  const cardFrontRefs = useRef({});
  const cardBackRefs = useRef({});
  const [cardSideView, setCardSideView] = useState('both'); // 'both' | 'front' | 'back'

  // Fetch active school template and class-specific assignments
  useEffect(() => {
    async function fetchActiveTemplate() {
      try {
        const res = await fetch(getApiEndpoint('staff/panel/templates?category=student_id_card'));
        const data = await res.json();
        if (res.ok && data.success) {
          if (data.active_template) setActiveTemplate(data.active_template);
          if (data.system_templates) setSystemTemplates(data.system_templates);
          if (data.class_assignments) setClassAssignments(data.class_assignments);
        }
      } catch (e) {
        console.warn('Notice loading active template:', e);
      }
    }
    fetchActiveTemplate();
  }, [getApiEndpoint]);

  // Resolve template for a specific student (Class-specific or school default)
  const getTemplateForStudent = useCallback((student) => {
    if (student?.class_id && classAssignments.length > 0) {
      const assigned = classAssignments.find((c) => String(c.class_id) === String(student.class_id));
      if (assigned?.system_template_id) {
        const found = systemTemplates.find((t) => t.id === assigned.system_template_id);
        if (found) return found;
      }
    }
    return activeTemplate || systemTemplates[0] || null;
  }, [classAssignments, systemTemplates, activeTemplate]);

  // Fetch Issued Cards Archive from website_student_ids
  const fetchIssuedArchive = useCallback(async () => {
    setLoadingArchive(true);
    try {
      const params = new URLSearchParams();
      if (archiveSearch.trim()) params.set('search', archiveSearch.trim());
      if (archiveStatus !== 'all') params.set('status', archiveStatus);

      const res = await fetch(getApiEndpoint(`staff/panel/student-ids?${params.toString()}`));
      const data = await res.json();
      if (res.ok && data.success) {
        setIssuedCards(data.payload?.id_cards || []);
      } else {
        toast.error(data.error || 'Failed to fetch issued ID cards.');
      }
    } catch {
      toast.error('Network error loading issued ID cards.');
    } finally {
      setLoadingArchive(false);
    }
  }, [archiveSearch, archiveStatus, getApiEndpoint]);

  useEffect(() => {
    if (activeTab === 'archive') {
      fetchIssuedArchive();
    }
  }, [activeTab, fetchIssuedArchive]);

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

  // Issue & persist cards in database website_student_ids
  const handleIssueAndSave = async () => {
    if (selectedIds.length === 0) {
      toast.error('Please select at least one student to issue ID cards.');
      return;
    }

    setIsSaving(true);
    toast.loading(`Issuing and recording ${selectedIds.length} ID cards...`, { id: 'save-ids' });
    try {
      const res = await fetch(getApiEndpoint('staff/panel/student-ids'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_ids: selectedIds,
          template_id: activeTemplate?.id || null,
          valid_upto: 'Dec 2027',
          card_status: 'active',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'ID Cards successfully issued and recorded!', { id: 'save-ids' });
      } else {
        toast.error(data.error || 'Failed to record ID cards.', { id: 'save-ids' });
      }
    } catch {
      toast.error('Network error recording ID cards.', { id: 'save-ids' });
    } finally {
      setIsSaving(false);
    }
  };

  // Helper to compile card HTML for a student (Both Front and Back)
  const compileStudentCard = (student) => {
    const tpl = getTemplateForStudent(student);
    if (!tpl) return null;
    let frontHtml = tpl.custom_html || tpl.html_content || '';
    let backHtml = tpl.custom_html_back || tpl.html_back_content || '';
    let css = (tpl.custom_css || tpl.css_content || '') + ' svg { width: 100% !important; height: 100% !important; max-width: 100% !important; max-height: 100% !important; display: block; }';

    if (!backHtml || !backHtml.trim()) {
      backHtml = `
        <div style="width: 100%; height: 100%; box-sizing: border-box; background: #0f172a; color: #f8fafc; padding: 14px; display: flex; flex-direction: column; justify-content: space-between; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center;">
          <div style="background: #1e293b; padding: 5px 10px; border-radius: 6px; font-size: 8.5px; font-weight: 700; color: #38bdf8; letter-spacing: 0.8px;">
            OFFICIAL STUDENT PASS TERMS
          </div>
          <div style="font-size: 8.5px; color: #94a3b8; line-height: 1.5; text-align: left; padding: 0 4px;">
            <p style="margin: 0 0 3px;">• This card certifies enrollment at {{school_name}}.</p>
            <p style="margin: 0 0 3px;">• Non-transferable; must be presented upon campus authority request.</p>
            <p style="margin: 0;">• Report loss immediately to the Registrar's Office.</p>
          </div>
          <div style="display: flex; flex-direction: column; align-items: center; gap: 3px;">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=50x50&data={{registration_no}}" alt="QR" style="width: 46px; height: 46px; background: white; padding: 2px; border-radius: 4px;" />
            <span style="font-family: monospace; font-size: 8px; color: #38bdf8;">{{registration_no}}</span>
          </div>
          <div style="font-size: 7.5px; color: #64748b; border-top: 1px solid #1e293b; padding-top: 4px;">
            Property of {{school_name}} • Hotline: {{emergency_contact}}
          </div>
        </div>
      `;
    }

    const replacements = {
      // Academic
      '{{student_name}}': student.student_name || student.name || 'Student Name',
      '{{registration_no}}': student.registration_no || student.student_unique_id || 'REG-0001',
      '{{roll_no}}': student.roll_no || '01',
      '{{student_unique_id}}': student.student_unique_id || student.registration_no || 'STU-0001',
      '{{class_name}}': student.class_name || filterInfo?.className || 'Class',
      '{{section_name}}': student.section_name || filterInfo?.sectionName || 'Sec A',
      '{{session_name}}': student.session_name || filterInfo?.sessionName || '2026-2027',
      '{{department_name}}': student.department_name || student.department || 'Science',
      '{{admission_date}}': student.admission_date ? new Date(student.admission_date).toLocaleDateString() : '—',
      '{{card_number}}': student.card_number || `STU-${student.registration_no || student.id}`,
      '{{valid_upto}}': student.valid_upto || 'Dec 2028',
      '{{expiry_date}}': student.expiry_date || student.valid_upto || 'Dec 2028',
      '{{barcode}}': `*${student.registration_no || student.id}*`,
      '{{qr_code}}': `https://${website?.domain || 'school.edu'}/verify/student/${student.registration_no || student.id}`,

      // Personal
      '{{gender}}': student.gender || '—',
      '{{blood_group}}': student.blood_group || 'O+',
      '{{date_of_birth}}': student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString() : '—',
      '{{religion}}': student.religion || '—',
      '{{student_photo}}': student.student_photo_url || student.primary_photo_url || student.image_url || '/default-avatar.png',

      // Contact
      '{{email}}': student.email || '—',
      '{{phone}}': student.number || student.phone || '—',
      '{{number}}': student.number || student.phone || '—',
      '{{emergency_contact}}': student.emergency_contact || student.guardian_phone || student.father_phone || website?.phone || '+880 1700-000000',

      // Parents & Guardians
      '{{father_name}}': student.father_name || 'Father Name',
      '{{father_phone}}': student.father_phone || '—',
      '{{father_occupation}}': student.father_occupation || '—',
      '{{father_nid}}': student.father_nid || '—',
      '{{mother_name}}': student.mother_name || 'Mother Name',
      '{{mother_phone}}': student.mother_phone || '—',
      '{{mother_occupation}}': student.mother_occupation || '—',
      '{{mother_nid}}': student.mother_nid || '—',
      '{{guardian_name}}': student.guardian_name || student.father_name || 'Guardian',
      '{{guardian_relation}}': student.guardian_relation || 'Parent',
      '{{guardian_phone}}': student.guardian_phone || student.father_phone || '—',
      '{{guardian_email}}': student.guardian_email || '—',
      '{{guardian_address}}': student.guardian_address || student.present_address || '—',

      // Addresses
      '{{present_address}}': student.present_address || student.address || '—',
      '{{permanent_address}}': student.permanent_address || student.address || '—',
      '{{city}}': student.city || 'Dhaka',
      '{{district}}': student.district || 'Dhaka',
      '{{upazila}}': student.upazila || '—',
      '{{postal_code}}': student.postal_code || '—',
      '{{country}}': student.country || 'Bangladesh',

      // Institutional
      '{{institution_name}}': website?.name || 'Educational Institution',
      '{{school_name}}': website?.name || 'Educational Institution',
      '{{institution_logo}}': website?.logo_url || '/school-logo.png',
      '{{school_logo}}': website?.logo_url || '/school-logo.png',
      '{{institution_address}}': website?.address || 'Main Campus',
      '{{institution_phone}}': website?.phone || '+880 2 000000',
      '{{institution_email}}': website?.email || 'info@school.edu',
      '{{website_url}}': website?.domain ? 'https://' + website.domain : 'https://school.edu',
      '{{signatory_title}}': 'Principal / Headmaster',
    };

    Object.entries(replacements).forEach(([k, v]) => {
      const reg = new RegExp(k.replace(/([{}])/g, '\\$1'), 'g');
      frontHtml = frontHtml.replace(reg, v);
      if (backHtml) {
        backHtml = backHtml.replace(reg, v);
      }
    });

    return { frontHtml, backHtml, css };
  };

  // Export single card as JPEG (Front, Back, or Both)
  const handleDownloadSingleJpeg = async (student) => {
    const frontEl = cardFrontRefs.current[student.id];
    const backEl = cardBackRefs.current[student.id];

    try {
      toast.loading(`Exporting JPEG for ${student.student_name || student.name}...`, { id: 'export-single' });
      if (cardSideView === 'both') {
        if (frontEl) await exportElementAsJpeg(frontEl, `ID_Card_${student.registration_no || student.name}_Front`);
        if (backEl) await exportElementAsJpeg(backEl, `ID_Card_${student.registration_no || student.name}_Back`);
      } else if (cardSideView === 'back' && backEl) {
        await exportElementAsJpeg(backEl, `ID_Card_${student.registration_no || student.name}_Back`);
      } else if (frontEl) {
        await exportElementAsJpeg(frontEl, `ID_Card_${student.registration_no || student.name}_Front`);
      }
      toast.success('JPEG downloaded successfully!', { id: 'export-single' });
    } catch {
      toast.error('Failed to export JPEG', { id: 'export-single' });
    }
  };

  // Export single card as PDF (Front, Back, or Both as 2-page document)
  const handleDownloadSinglePdf = async (student) => {
    const frontEl = cardFrontRefs.current[student.id];
    const backEl = cardBackRefs.current[student.id];

    try {
      toast.loading(`Exporting PDF for ${student.student_name || student.name}...`, { id: 'export-single' });
      const options = {
        widthMm: activeTemplate?.dimension_width || 54,
        heightMm: activeTemplate?.dimension_height || 86,
      };

      if (cardSideView === 'both' && frontEl && backEl) {
        // True 2-page PDF (Page 1 = Front, Page 2 = Back)
        await exportMultipleCardsAsPdf([frontEl, backEl], `ID_Card_${student.registration_no || student.name}_DualSided`, options);
      } else if (cardSideView === 'back' && backEl) {
        await exportElementAsPdf(backEl, `ID_Card_${student.registration_no || student.name}_Back`, options);
      } else if (frontEl) {
        await exportElementAsPdf(frontEl, `ID_Card_${student.registration_no || student.name}_Front`, options);
      }
      toast.success('PDF downloaded successfully!', { id: 'export-single' });
    } catch {
      toast.error('Failed to export PDF', { id: 'export-single' });
    }
  };

  // Batch Export selected cards as multi-page PDF (Handles dual-sided or single-sided)
  const handleBatchPdfDownload = async () => {
    let targetElements = [];

    if (cardSideView === 'both') {
      // 2 pages per student (Front, Back, Front, Back...)
      targetElements = selectedStudents.flatMap((s) => [
        cardFrontRefs.current[s.id],
        cardBackRefs.current[s.id],
      ]).filter(Boolean);
    } else if (cardSideView === 'back') {
      targetElements = selectedStudents.map((s) => cardBackRefs.current[s.id]).filter(Boolean);
    } else {
      targetElements = selectedStudents.map((s) => cardFrontRefs.current[s.id]).filter(Boolean);
    }

    if (targetElements.length === 0) {
      toast.error('Please select at least one student card.');
      return;
    }

    setIsExporting(true);
    toast.loading(`Generating batch PDF (${cardSideView.toUpperCase()}) for ${selectedStudents.length} student cards...`, { id: 'batch-pdf' });
    try {
      await exportMultipleCardsAsPdf(
        targetElements,
        `Student_ID_Cards_${cardSideView}_${filterInfo?.className || 'Batch'}_${Date.now()}`,
        {
          widthMm: activeTemplate?.dimension_width || 54,
          heightMm: activeTemplate?.dimension_height || 86,
        }
      );
      toast.success('Batch PDF generated and downloaded!', { id: 'batch-pdf' });
    } catch (e) {
      toast.error(e.message || 'Error generating batch PDF', { id: 'batch-pdf' });
    } finally {
      setIsExporting(false);
    }
  };

  // Revoke/Delete from archive
  const handleDeleteIssuedCard = async (cardId) => {
    if (!window.confirm('Are you sure you want to delete this issued ID card record?')) return;
    try {
      const res = await fetch(getApiEndpoint(`staff/panel/student-ids?id=${cardId}`), {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('ID Card record deleted.');
        setIssuedCards((prev) => prev.filter((c) => c.id !== cardId));
      } else {
        toast.error(data.error || 'Failed to delete ID card.');
      }
    } catch {
      toast.error('Error deleting ID card.');
    }
  };

  const selectedStudents = students.filter((s) => selectedIds.includes(s.id));

  return (
    <div className="w-full space-y-4">
      {/* Page Header (hidden in print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800 print:hidden">
        <div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-white">
            Student Identity Card Management &amp; Issuance
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Filter roster to issue official student cards, record card credentials into the registry, and export print-grade files.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="inline-flex rounded border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('generate')}
              className={`px-3 py-1 rounded font-medium transition cursor-pointer ${
                activeTab === 'generate'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Generate Cards
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('archive')}
              className={`px-3 py-1 rounded font-medium transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'archive'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <FiList /> Issued Cards Registry
            </button>
          </div>

          <a
            href="/staff-panel/student-id-card-templates"
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
          >
            Change Template
          </a>
        </div>
      </div>

      {activeTab === 'archive' ? (
        /* ================= ISSUED CARDS REGISTRY ================= */
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Status Filter:
              </span>
              <select
                value={archiveStatus}
                onChange={(e) => setArchiveStatus(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="lost">Lost</option>
                <option value="revoked">Revoked</option>
              </select>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Search by Card #, Reg, Student..."
                  value={archiveSearch}
                  onChange={(e) => setArchiveSearch(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
                <FiSearch className="absolute left-2.5 top-2.5 text-slate-400 text-xs" />
              </div>
              <button
                type="button"
                onClick={fetchIssuedArchive}
                className="p-2 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                title="Refresh Registry"
              >
                <FiRefreshCw className={loadingArchive ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-2xs overflow-hidden">
            {loadingArchive ? (
              <div className="py-16 flex flex-col items-center justify-center gap-2">
                <div className="loader loader-sm" />
                <span className="text-xs text-slate-400">Loading issued student cards...</span>
              </div>
            ) : issuedCards.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                No issued ID cards found in the institutional registry.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-500 tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-3.5 py-2.5">Card Number</th>
                      <th className="px-3.5 py-2.5">Student Details</th>
                      <th className="px-3.5 py-2.5">Class / Section</th>
                      <th className="px-3.5 py-2.5">Issue &amp; Expiry</th>
                      <th className="px-3.5 py-2.5">Status</th>
                      <th className="px-3.5 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {issuedCards.map((card) => (
                      <tr key={card.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-3.5 py-2.5 font-mono font-medium text-slate-900 dark:text-white">
                          {card.card_number}
                        </td>
                        <td className="px-3.5 py-2.5">
                          <div className="font-medium text-slate-900 dark:text-white">
                            {card.student_name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Reg: {card.registration_no} | Roll: {card.roll_no || '—'}
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-600 dark:text-slate-400">
                          {card.class_name || 'Class'} {card.section_name ? `(${card.section_name})` : ''}
                        </td>
                        <td className="px-3.5 py-2.5 text-[11px] font-mono">
                          <div>Issued: {card.issue_date}</div>
                          <div className="text-slate-400">Valid: {card.valid_upto || card.expiry_date}</div>
                        </td>
                        <td className="px-3.5 py-2.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                              card.card_status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                            }`}
                          >
                            {card.card_status}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteIssuedCard(card.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                            title="Delete Card Record"
                          >
                            <FiTrash2 />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ================= GENERATE & EXPORT CARDS ================= */
        <>
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

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded border border-slate-300 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setCardSideView('both')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                        cardSideView === 'both'
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Both Sides (Paired)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCardSideView('front')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                        cardSideView === 'front'
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Front Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setCardSideView('back')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                        cardSideView === 'back'
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Back Only
                    </button>
                  </div>

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
                    onClick={handleIssueAndSave}
                    disabled={selectedIds.length === 0 || isSaving}
                    className="px-3 py-1.5 rounded border border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs font-medium shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <FiSave /> {isSaving ? 'Issuing...' : `Issue & Save in DB (${selectedIds.length})`}
                  </button>
                  <button
                    type="button"
                    onClick={handleBatchPdfDownload}
                    disabled={selectedIds.length === 0 || isExporting}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded text-xs font-medium shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isExporting ? 'Generating PDF...' : `Download Batch PDF (${selectedIds.length} - ${cardSideView.toUpperCase()})`}
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
              <div className={`grid grid-cols-1 ${cardSideView === 'both' ? 'md:grid-cols-2 xl:grid-cols-2' : 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'} gap-4 print:grid-cols-2 print:gap-4`}>
                {selectedStudents.map((s) => {
                  const tpl = getTemplateForStudent(s);
                  const cardData = compileStudentCard(s);
                  const isLand = tpl ? parseFloat(tpl.dimension_width || 54) >= parseFloat(tpl.dimension_height || 86) : false;
                  const cardWidth = isLand ? '325px' : '204px';
                  const cardHeight = isLand ? '204px' : '325px';

                  return (
                    <div
                      key={s.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 flex flex-col justify-between shadow-2xs gap-2.5 print:border-none print:shadow-none"
                    >
                      <div className="flex items-center justify-between text-[11px] pb-1 border-b border-slate-100 dark:border-slate-800 print:hidden">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                          {s.student_name || s.name}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded truncate max-w-[150px]">
                          {tpl?.name || 'Default Template'}
                        </span>
                      </div>
                      {/* Card Container for Export */}
                      <div className={`flex flex-wrap justify-center items-center gap-3 overflow-hidden bg-slate-50 dark:bg-slate-950 p-3 rounded ${cardSideView === 'both' ? 'sm:flex-row' : ''}`}>
                        {cardData ? (
                          <>
                            <style dangerouslySetInnerHTML={{ __html: cardData.css }} />
                            {/* FRONT SIDE */}
                            {(cardSideView === 'both' || cardSideView === 'front') && (
                              <div className="flex flex-col items-center gap-1.5">
                                {cardSideView === 'both' && (
                                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                                    Front Side
                                  </span>
                                )}
                                <div
                                  ref={(el) => {
                                    cardFrontRefs.current[s.id] = el;
                                  }}
                                  className="rounded overflow-hidden shadow-xs bg-white text-slate-900 border border-slate-200 dark:border-slate-800"
                                  style={{
                                    width: cardWidth,
                                    height: cardHeight,
                                    maxWidth: '100%',
                                  }}
                                >
                                  <div
                                    dangerouslySetInnerHTML={{ __html: cardData.frontHtml }}
                                    style={{ width: '100%', height: '100%' }}
                                  />
                                </div>
                              </div>
                            )}

                            {/* BACK SIDE */}
                            {(cardSideView === 'both' || cardSideView === 'back') && (
                              <div className="flex flex-col items-center gap-1.5">
                                {cardSideView === 'both' && (
                                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                                    Back Side
                                  </span>
                                )}
                                <div
                                  ref={(el) => {
                                    cardBackRefs.current[s.id] = el;
                                  }}
                                  className="rounded overflow-hidden shadow-xs bg-white text-slate-900 border border-slate-200 dark:border-slate-800"
                                  style={{
                                    width: cardWidth,
                                    height: cardHeight,
                                    maxWidth: '100%',
                                  }}
                                >
                                  <div
                                    dangerouslySetInnerHTML={{
                                      __html:
                                        cardData.backHtml ||
                                        '<div class="flex items-center justify-center h-full p-4 text-center text-xs text-slate-400 font-medium">No Back Design Configured</div>',
                                    }}
                                    style={{ width: '100%', height: '100%' }}
                                  />
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="p-8 flex justify-center items-center">
                            <div className="loader loader-sm" />
                          </div>
                        )}
                      </div>

                      {/* Card Actions (hidden in print) */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs print:hidden">
                        <span className="font-medium text-slate-900 dark:text-white truncate max-w-[140px]" title={s.name}>
                          {s.name}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleDownloadSingleJpeg(s)}
                            className="px-2 py-1 rounded text-[11px] font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                            title={`Download ${cardSideView.toUpperCase()} as high-res JPEG`}
                          >
                            JPEG
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadSinglePdf(s)}
                            className="px-2 py-1 rounded text-[11px] font-medium bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 cursor-pointer"
                            title={`Download ${cardSideView.toUpperCase()} as print-grade PDF`}
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
        </>
      )}
    </div>
  );
}
