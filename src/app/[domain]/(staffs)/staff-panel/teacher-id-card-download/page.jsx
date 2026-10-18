'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import { exportElementAsJpeg, exportElementAsPdf, exportMultipleCardsAsPdf } from 'src/lib/export/documentExporter';
import { FiSave, FiList, FiTrash2, FiSearch, FiRefreshCw } from 'react-icons/fi';

export default function TeacherIdCardDownloadPage() {
  const { website, getApiEndpoint } = useTenantWebsite();

  // Mode: 'generate' or 'archive'
  const [activeTab, setActiveTab] = useState('generate');

  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Archive state
  const [issuedCards, setIssuedCards] = useState([]);
  const [loadingArchive, setLoadingArchive] = useState(false);
  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveStatus, setArchiveStatus] = useState('all');

  const [cardSideView, setCardSideView] = useState('both'); // 'both' | 'front' | 'back'
  const cardFrontRefs = useRef({});
  const cardBackRefs = useRef({});

  // Fetch teachers & active template
  useEffect(() => {
    async function initData() {
      setLoading(true);
      try {
        const tplRes = await fetch(getApiEndpoint('staff/panel/templates?category=teacher_id_card'));
        const tplData = await tplRes.json();
        if (tplRes.ok && tplData.success && tplData.active_template) {
          setActiveTemplate(tplData.active_template);
        }

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
  }, [getApiEndpoint]);

  // Fetch issued faculty cards from website_teacher_ids
  const fetchIssuedArchive = useCallback(async () => {
    setLoadingArchive(true);
    try {
      const params = new URLSearchParams();
      if (archiveSearch.trim()) params.set('search', archiveSearch.trim());
      if (archiveStatus !== 'all') params.set('status', archiveStatus);

      const res = await fetch(getApiEndpoint(`staff/panel/teacher-ids?${params.toString()}`));
      const data = await res.json();
      if (res.ok && data.success) {
        setIssuedCards(data.payload?.id_cards || []);
      } else {
        toast.error(data.error || 'Failed to fetch issued faculty cards.');
      }
    } catch {
      toast.error('Network error loading faculty cards.');
    } finally {
      setLoadingArchive(false);
    }
  }, [archiveSearch, archiveStatus, getApiEndpoint]);

  useEffect(() => {
    if (activeTab === 'archive') {
      fetchIssuedArchive();
    }
  }, [activeTab, fetchIssuedArchive]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredTeachers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTeachers.map((t) => t.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Issue & persist cards in database website_teacher_ids
  const handleIssueAndSave = async () => {
    if (selectedIds.length === 0) {
      toast.error('Please select at least one teacher.');
      return;
    }

    setIsSaving(true);
    toast.loading(`Issuing and recording ${selectedIds.length} faculty cards...`, { id: 'save-faculty-ids' });
    try {
      const res = await fetch(getApiEndpoint('staff/panel/teacher-ids'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacher_ids: selectedIds,
          template_id: activeTemplate?.id || null,
          valid_upto: 'Dec 2028',
          card_status: 'active',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'Faculty ID cards recorded successfully!', { id: 'save-faculty-ids' });
      } else {
        toast.error(data.error || 'Failed to record faculty ID cards.', { id: 'save-faculty-ids' });
      }
    } catch {
      toast.error('Network error recording faculty ID cards.', { id: 'save-faculty-ids' });
    } finally {
      setIsSaving(false);
    }
  };

  // Compile card HTML with all comprehensive faculty data points
  const compileTeacherCard = (teacher) => {
    if (!activeTemplate) return null;
    let frontHtml = activeTemplate.html_content || '';
    let backHtml = activeTemplate.html_back_content || '';
    const css = activeTemplate.css_content || '';

    const replacements = {
      // Identity & Academic
      '{{teacher_name}}': teacher.name || teacher.teacher_name || 'Faculty Member',
      '{{name}}': teacher.name || teacher.teacher_name || 'Faculty Member',
      '{{designation}}': teacher.designation_name || teacher.designation || 'Lecturer',
      '{{designation_name}}': teacher.designation_name || teacher.designation || 'Lecturer',
      '{{department}}': teacher.department_name || teacher.department || 'Faculty of Education',
      '{{department_name}}': teacher.department_name || teacher.department || 'Faculty of Education',
      '{{employee_id}}': teacher.employee_id || teacher.code || `FAC-${teacher.id}`,
      '{{code}}': teacher.code || teacher.employee_id || `FAC-${teacher.id}`,
      '{{teacher_id}}': teacher.employee_id || teacher.code || `FAC-${teacher.id}`,
      '{{joining_date}}': teacher.joining_date ? new Date(teacher.joining_date).toLocaleDateString() : '—',
      '{{card_number}}': `TCH-${teacher.id}-${Date.now().toString().slice(-4)}`,
      '{{valid_upto}}': '31 Dec 2028',
      '{{barcode}}': `*TCH${teacher.id}*`,
      '{{qr_code}}': website?.domain ? `https://${website.domain}/verify/TCH-${teacher.id}` : `https://alpha.edu/verify/TCH-${teacher.id}`,

      // Personal Details
      '{{gender}}': teacher.gender || '—',
      '{{blood_group}}': teacher.blood_group || 'O+',
      '{{date_of_birth}}': teacher.date_of_birth ? new Date(teacher.date_of_birth).toLocaleDateString() : '—',
      '{{dob}}': teacher.date_of_birth ? new Date(teacher.date_of_birth).toLocaleDateString() : '—',
      '{{religion}}': teacher.religion || '—',
      '{{teacher_photo}}': teacher.photo_url || teacher.image || teacher.teacher_photo_url || '/default-avatar.png',
      '{{photo_url}}': teacher.photo_url || teacher.image || teacher.teacher_photo_url || '/default-avatar.png',

      // Contact Info
      '{{email}}': teacher.email || '—',
      '{{phone}}': teacher.phone || teacher.number || '+880 1800-112233',
      '{{number}}': teacher.number || teacher.phone || '+880 1800-112233',
      '{{emergency_contact}}': teacher.emergency_contact || teacher.phone || website?.phone || '+880 1800-998877',

      // Addresses
      '{{address}}': teacher.address || '—',
      '{{present_address}}': teacher.address || '—',
      '{{permanent_address}}': teacher.permanent_address || teacher.address || '—',

      // Institutional
      '{{institution_name}}': website?.name || 'Educational Institution',
      '{{school_name}}': website?.name || 'Educational Institution',
      '{{institution_logo}}': website?.logo_url || '/school-logo.png',
      '{{school_logo}}': website?.logo_url || '/school-logo.png',
      '{{institution_address}}': website?.address || 'Main Campus',
      '{{institution_phone}}': website?.phone || '+880 2 000000',
      '{{institution_email}}': website?.email || 'hr@alpha.edu',
      '{{website_url}}': website?.domain ? 'https://' + website.domain : 'https://school.edu',
      '{{signatory_title}}': 'Principal / Dean',
      '{{signature_url}}': '',
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
  const handleDownloadSingleJpeg = async (teacher) => {
    const frontEl = cardFrontRefs.current[teacher.id];
    const backEl = cardBackRefs.current[teacher.id];

    try {
      toast.loading(`Exporting JPEG for ${teacher.name}...`, { id: 'teacher-export' });
      if (cardSideView === 'both') {
        if (frontEl) await exportElementAsJpeg(frontEl, `Faculty_ID_${teacher.employee_id || teacher.name}_Front`);
        if (backEl) await exportElementAsJpeg(backEl, `Faculty_ID_${teacher.employee_id || teacher.name}_Back`);
      } else if (cardSideView === 'back' && backEl) {
        await exportElementAsJpeg(backEl, `Faculty_ID_${teacher.employee_id || teacher.name}_Back`);
      } else if (frontEl) {
        await exportElementAsJpeg(frontEl, `Faculty_ID_${teacher.employee_id || teacher.name}_Front`);
      }
      toast.success('JPEG downloaded successfully!', { id: 'teacher-export' });
    } catch {
      toast.error('Failed to export JPEG', { id: 'teacher-export' });
    }
  };

  // Export single card as PDF (Front, Back, or 2-page Both)
  const handleDownloadSinglePdf = async (teacher) => {
    const frontEl = cardFrontRefs.current[teacher.id];
    const backEl = cardBackRefs.current[teacher.id];

    try {
      toast.loading(`Exporting PDF for ${teacher.name}...`, { id: 'teacher-export' });
      const options = {
        widthMm: activeTemplate?.dimension_width || 86,
        heightMm: activeTemplate?.dimension_height || 54,
      };

      if (cardSideView === 'both' && frontEl && backEl) {
        await exportMultipleCardsAsPdf([frontEl, backEl], `Faculty_ID_${teacher.employee_id || teacher.name}_DualSided`, options);
      } else if (cardSideView === 'back' && backEl) {
        await exportElementAsPdf(backEl, `Faculty_ID_${teacher.employee_id || teacher.name}_Back`, options);
      } else if (frontEl) {
        await exportElementAsPdf(frontEl, `Faculty_ID_${teacher.employee_id || teacher.name}_Front`, options);
      }
      toast.success('PDF downloaded successfully!', { id: 'teacher-export' });
    } catch {
      toast.error('Failed to export PDF', { id: 'teacher-export' });
    }
  };

  // Batch Export selected cards as PDF
  const handleBatchPdfDownload = async () => {
    let targetElements = [];

    if (cardSideView === 'both') {
      targetElements = selectedTeachers.flatMap((t) => [
        cardFrontRefs.current[t.id],
        cardBackRefs.current[t.id],
      ]).filter(Boolean);
    } else if (cardSideView === 'back') {
      targetElements = selectedTeachers.map((t) => cardBackRefs.current[t.id]).filter(Boolean);
    } else {
      targetElements = selectedTeachers.map((t) => cardFrontRefs.current[t.id]).filter(Boolean);
    }

    if (targetElements.length === 0) {
      toast.error('Please select at least one teacher card.');
      return;
    }

    setIsExporting(true);
    toast.loading(`Generating PDF (${cardSideView.toUpperCase()}) for ${selectedTeachers.length} faculty cards...`, { id: 'teacher-batch' });
    try {
      await exportMultipleCardsAsPdf(
        targetElements,
        `Faculty_ID_Cards_${cardSideView}_Batch_${Date.now()}`,
        {
          widthMm: activeTemplate?.dimension_width || 86,
          heightMm: activeTemplate?.dimension_height || 54,
        }
      );
      toast.success('Batch PDF generated and downloaded!', { id: 'teacher-batch' });
    } catch (e) {
      toast.error(e.message || 'Error generating batch PDF', { id: 'teacher-batch' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteIssuedFacultyCard = async (cardId) => {
    if (!window.confirm('Are you sure you want to delete this faculty ID card record?')) return;
    try {
      const res = await fetch(getApiEndpoint(`staff/panel/teacher-ids?id=${cardId}`), {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Faculty card record deleted.');
        setIssuedCards((prev) => prev.filter((c) => c.id !== cardId));
      } else {
        toast.error(data.error || 'Failed to delete card.');
      }
    } catch {
      toast.error('Error deleting faculty card.');
    }
  };

  const filteredTeachers = teachers.filter((t) =>
    (t.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.code || t.employee_id || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedTeachers = filteredTeachers.filter((t) => selectedIds.includes(t.id));

  return (
    <div className="w-full space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800 print:hidden">
        <div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-white">
            Teacher ID Card Generation &amp; Registry
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Generate high-resolution faculty identification passes, persist issued records in database, and export print files.
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
              <FiList /> Issued Faculty Registry
            </button>
          </div>

          <a
            href="/staff-panel/teacher-id-card-templates"
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
          >
            Change Template
          </a>
        </div>
      </div>

      {activeTab === 'archive' ? (
        /* ================= ISSUED FACULTY REGISTRY ================= */
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Status:</span>
              <select
                value={archiveStatus}
                onChange={(e) => setArchiveStatus(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              >
                <option value="all">All</option>
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
                  placeholder="Search by Card #, Teacher name..."
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
                <span className="text-xs text-slate-400">Loading faculty cards...</span>
              </div>
            ) : issuedCards.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                No issued faculty ID cards found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-500 tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-3.5 py-2.5">Card Number</th>
                      <th className="px-3.5 py-2.5">Faculty Member</th>
                      <th className="px-3.5 py-2.5">Designation &amp; Dept</th>
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
                            {card.teacher_name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            ID: {card.employee_id} | Phone: {card.phone || '—'}
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-600 dark:text-slate-400">
                          <div>{card.designation_name || 'Faculty Member'}</div>
                          <div className="text-[10px] text-slate-400">{card.department_name || 'Department'}</div>
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
                            onClick={() => handleDeleteIssuedFacultyCard(card.id)}
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
        /* ================= GENERATE FACULTY CARDS ================= */
        <div className="space-y-4">
          {/* Action Toolbar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search faculty..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white w-48 sm:w-64"
              />
              <span className="text-xs text-slate-500 font-medium">
                ({selectedIds.length} of {filteredTeachers.length} selected)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Card Side Toggle */}
              <div className="inline-flex rounded border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setCardSideView('both')}
                  className={`px-2.5 py-1 rounded font-medium transition cursor-pointer ${
                    cardSideView === 'both'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Both Sides (Paired)
                </button>
                <button
                  type="button"
                  onClick={() => setCardSideView('front')}
                  className={`px-2.5 py-1 rounded font-medium transition cursor-pointer ${
                    cardSideView === 'front'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Front Only
                </button>
                <button
                  type="button"
                  onClick={() => setCardSideView('back')}
                  className={`px-2.5 py-1 rounded font-medium transition cursor-pointer ${
                    cardSideView === 'back'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
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
                {selectedIds.length === filteredTeachers.length ? 'Deselect All' : 'Select All'}
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

          {/* Cards Grid */}
          <div className={`grid grid-cols-1 ${cardSideView === 'both' ? 'md:grid-cols-2 xl:grid-cols-2' : 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'} gap-4 print:grid-cols-2`}>
            {selectedTeachers.map((t) => {
              const cardData = compileTeacherCard(t);
              const cardWidth = activeTemplate ? `${activeTemplate.dimension_width * 3.7795}px` : '325px';
              const cardHeight = activeTemplate ? `${activeTemplate.dimension_height * 3.7795}px` : '204px';

              return (
                <div
                  key={t.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 flex flex-col justify-between shadow-2xs gap-3 print:border-none print:shadow-none"
                >
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
                                cardFrontRefs.current[t.id] = el;
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
                                cardBackRefs.current[t.id] = el;
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

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs print:hidden">
                    <span className="font-medium text-slate-900 dark:text-white truncate max-w-[140px]" title={t.name}>
                      {t.name}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDownloadSingleJpeg(t)}
                        className="px-2 py-1 rounded text-[11px] font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                        title={`Download ${cardSideView.toUpperCase()} as high-res JPEG`}
                      >
                        JPEG
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadSinglePdf(t)}
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
    </div>
  );
}
