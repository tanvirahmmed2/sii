'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import { exportElementAsJpeg, exportElementAsPdf, exportMultipleCardsAsPdf } from 'src/lib/export/documentExporter';
import { FiSave, FiList, FiTrash2, FiSearch, FiRefreshCw, FiDownload, FiCheck, FiShield, FiUser } from 'react-icons/fi';

export default function OfficerIdCardDownloadPage() {
  const { website, getApiEndpoint } = useTenantWebsite();

  // Mode: 'generate' or 'archive'
  const [activeTab, setActiveTab] = useState('generate');

  const [loading, setLoading] = useState(false);
  const [officers, setOfficers] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');

  // Archive state
  const [issuedCards, setIssuedCards] = useState([]);
  const [loadingArchive, setLoadingArchive] = useState(false);
  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveStatus, setArchiveStatus] = useState('all');

  const [cardSideView, setCardSideView] = useState('both'); // 'both' | 'front' | 'back'
  const cardFrontRefs = useRef({});
  const cardBackRefs = useRef({});

  // Fetch officers & active template
  useEffect(() => {
    async function initData() {
      setLoading(true);
      try {
        // Attempt to load officer_id_card template, or fallback to teacher_id_card template
        let tplRes = await fetch(getApiEndpoint('staff/panel/templates?category=officer_id_card'));
        let tplData = await tplRes.json();
        if (tplRes.ok && tplData.success && tplData.active_template) {
          setActiveTemplate(tplData.active_template);
        } else {
          // Check teacher_id_card as fallback design
          tplRes = await fetch(getApiEndpoint('staff/panel/templates?category=teacher_id_card'));
          tplData = await tplRes.json();
          if (tplRes.ok && tplData.success && tplData.active_template) {
            setActiveTemplate(tplData.active_template);
          }
        }

        const res = await fetch(getApiEndpoint('staff/panel/officers'));
        const data = await res.json();
        if (res.ok && data.success) {
          const list = data.officers || data.payload?.officers || [];
          setOfficers(list);
          setSelectedIds(list.map((o) => o.id));
        }
      } catch (e) {
        console.warn('Notice loading officer data:', e);
      } finally {
        setLoading(false);
      }
    }

    initData();
  }, [getApiEndpoint]);

  // Fetch issued officer cards from website_officer_ids
  const fetchIssuedArchive = useCallback(async () => {
    setLoadingArchive(true);
    try {
      const params = new URLSearchParams();
      if (archiveSearch.trim()) params.set('search', archiveSearch.trim());
      if (archiveStatus !== 'all') params.set('status', archiveStatus);

      const res = await fetch(getApiEndpoint(`staff/panel/officer-ids?${params.toString()}`));
      const data = await res.json();
      if (res.ok && data.success) {
        setIssuedCards(data.payload?.id_cards || []);
      } else {
        toast.error(data.error || 'Failed to fetch issued officer cards.');
      }
    } catch {
      toast.error('Network error loading officer cards.');
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
    if (selectedIds.length === filteredOfficers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredOfficers.map((o) => o.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Issue & persist cards in database website_officer_ids
  const handleIssueAndSave = async () => {
    if (selectedIds.length === 0) {
      toast.error('Please select at least one officer.');
      return;
    }

    setIsSaving(true);
    toast.loading(`Issuing and recording ${selectedIds.length} officer cards...`, { id: 'save-officer-ids' });
    try {
      const officersToIssue = selectedOfficers.map((off) => ({
        officer_id: off.id,
        department: off.department,
        designation: off.designation,
      }));

      const res = await fetch(getApiEndpoint('staff/panel/officer-ids'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          officers: officersToIssue,
          template_id: activeTemplate?.id || null,
          valid_upto: 'Dec 2028',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'Officer ID cards recorded successfully!', { id: 'save-officer-ids' });
      } else {
        toast.error(data.error || 'Failed to record officer ID cards.', { id: 'save-officer-ids' });
      }
    } catch {
      toast.error('Network error recording officer ID cards.', { id: 'save-officer-ids' });
    } finally {
      setIsSaving(false);
    }
  };

  // Compile card HTML or return null to trigger built-in card
  const compileOfficerCard = (officer) => {
    if (!activeTemplate) return null;
    let frontHtml = activeTemplate.html_content || '';
    let backHtml = activeTemplate.html_back_content || '';
    const css = activeTemplate.css_content || '';

    const replacements = {
      // Identity & Designation
      '{{officer_name}}': officer.name || 'Administrative Officer',
      '{{name}}': officer.name || 'Administrative Officer',
      '{{teacher_name}}': officer.name || 'Administrative Officer',
      '{{designation}}': officer.designation || 'Administrative Officer',
      '{{department}}': officer.department || 'General Administration',
      '{{employee_id}}': officer.employee_id || `OFF-${officer.id}`,
      '{{officer_id}}': officer.employee_id || `OFF-${officer.id}`,
      '{{nid_number}}': officer.nid_number || '—',
      '{{joining_date}}': officer.joining_date ? new Date(officer.joining_date).toLocaleDateString() : '—',
      '{{card_number}}': `OFF-${officer.id}-${Date.now().toString().slice(-4)}`,
      '{{valid_upto}}': '31 Dec 2028',
      '{{barcode}}': `*OFF${officer.id}*`,
      '{{qr_code}}': website?.domain ? `https://${website.domain}/verify/OFF-${officer.id}` : `https://alpha.edu/verify/OFF-${officer.id}`,

      // Personal Details
      '{{gender}}': officer.gender || '—',
      '{{blood_group}}': officer.blood_group || 'O+',
      '{{date_of_birth}}': officer.date_of_birth ? new Date(officer.date_of_birth).toLocaleDateString() : '—',
      '{{dob}}': officer.date_of_birth ? new Date(officer.date_of_birth).toLocaleDateString() : '—',
      '{{religion}}': officer.religion || '—',
      '{{officer_photo}}': officer.photo_url || officer.image || '/default-avatar.png',
      '{{photo_url}}': officer.photo_url || officer.image || '/default-avatar.png',
      '{{teacher_photo}}': officer.photo_url || officer.image || '/default-avatar.png',
      '{{bio}}': officer.bio || 'Staff Member',

      // Contact Info
      '{{email}}': officer.email || '—',
      '{{phone}}': officer.phone || officer.number || '+880 1900-445566',
      '{{number}}': officer.phone || officer.number || '+880 1900-445566',
      '{{emergency_contact}}': officer.phone || website?.phone || '+880 1900-000000',

      // Addresses
      '{{address}}': officer.address || '—',
      '{{present_address}}': officer.address || '—',
      '{{permanent_address}}': officer.permanent_address || officer.address || '—',

      // Institutional
      '{{institution_name}}': website?.name || 'Educational Institution',
      '{{school_name}}': website?.name || 'Educational Institution',
      '{{institution_logo}}': website?.logo_url || '/school-logo.png',
      '{{school_logo}}': website?.logo_url || '/school-logo.png',
      '{{institution_address}}': website?.address || 'Main Campus',
      '{{institution_phone}}': website?.phone || '+880 2 000000',
      '{{institution_email}}': website?.email || 'admin@alpha.edu',
      '{{website_url}}': website?.domain ? 'https://' + website.domain : 'https://school.edu',
      '{{signatory_title}}': 'Registrar / Director',
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
  const handleDownloadSingleJpeg = async (officer) => {
    const frontEl = cardFrontRefs.current[officer.id];
    const backEl = cardBackRefs.current[officer.id];

    try {
      toast.loading(`Exporting JPEG for ${officer.name}...`, { id: 'officer-export' });
      if (cardSideView === 'both') {
        if (frontEl) await exportElementAsJpeg(frontEl, `Officer_ID_${officer.name.replace(/\s+/g, '_')}_Front`);
        if (backEl) await exportElementAsJpeg(backEl, `Officer_ID_${officer.name.replace(/\s+/g, '_')}_Back`);
      } else if (cardSideView === 'back' && backEl) {
        await exportElementAsJpeg(backEl, `Officer_ID_${officer.name.replace(/\s+/g, '_')}_Back`);
      } else if (frontEl) {
        await exportElementAsJpeg(frontEl, `Officer_ID_${officer.name.replace(/\s+/g, '_')}_Front`);
      }
      toast.success('JPEG downloaded successfully!', { id: 'officer-export' });
    } catch {
      toast.error('Failed to export JPEG', { id: 'officer-export' });
    }
  };

  // Export single card as PDF (Front, Back, or 2-page Both)
  const handleDownloadSinglePdf = async (officer) => {
    const frontEl = cardFrontRefs.current[officer.id];
    const backEl = cardBackRefs.current[officer.id];

    try {
      toast.loading(`Exporting PDF for ${officer.name}...`, { id: 'officer-export' });
      const options = {
        widthMm: activeTemplate?.dimension_width || 86,
        heightMm: activeTemplate?.dimension_height || 54,
      };

      if (cardSideView === 'both' && frontEl && backEl) {
        await exportMultipleCardsAsPdf([frontEl, backEl], `Officer_ID_${officer.name.replace(/\s+/g, '_')}_DualSided`, options);
      } else if (cardSideView === 'back' && backEl) {
        await exportElementAsPdf(backEl, `Officer_ID_${officer.name.replace(/\s+/g, '_')}_Back`, options);
      } else if (frontEl) {
        await exportElementAsPdf(frontEl, `Officer_ID_${officer.name.replace(/\s+/g, '_')}_Front`, options);
      }
      toast.success('PDF downloaded successfully!', { id: 'officer-export' });
    } catch {
      toast.error('Failed to export PDF', { id: 'officer-export' });
    }
  };

  // Batch Export selected cards as PDF
  const handleBatchPdfDownload = async () => {
    let targetElements = [];

    if (cardSideView === 'both') {
      targetElements = selectedOfficers.flatMap((o) => [
        cardFrontRefs.current[o.id],
        cardBackRefs.current[o.id],
      ]).filter(Boolean);
    } else if (cardSideView === 'back') {
      targetElements = selectedOfficers.map((o) => cardBackRefs.current[o.id]).filter(Boolean);
    } else {
      targetElements = selectedOfficers.map((o) => cardFrontRefs.current[o.id]).filter(Boolean);
    }

    if (targetElements.length === 0) {
      toast.error('Please select at least one officer card.');
      return;
    }

    setIsExporting(true);
    toast.loading(`Generating PDF (${cardSideView.toUpperCase()}) for ${selectedOfficers.length} officer cards...`, { id: 'officer-batch' });
    try {
      await exportMultipleCardsAsPdf(
        targetElements,
        `Officer_ID_Cards_${cardSideView}_Batch_${Date.now()}`,
        {
          widthMm: activeTemplate?.dimension_width || 86,
          heightMm: activeTemplate?.dimension_height || 54,
        }
      );
      toast.success('Batch PDF generated and downloaded!', { id: 'officer-batch' });
    } catch (e) {
      toast.error(e.message || 'Error generating batch PDF', { id: 'officer-batch' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleUpdateStatus = async (cardId, newStatus) => {
    try {
      const res = await fetch(getApiEndpoint('staff/panel/officer-ids'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cardId, card_status: newStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Card status updated to ${newStatus}`);
        setIssuedCards((prev) =>
          prev.map((c) => (c.id === cardId ? { ...c, card_status: newStatus } : c))
        );
      } else {
        toast.error(data.error || 'Failed to update status');
      }
    } catch {
      toast.error('Error updating status');
    }
  };

  const handleDeleteIssuedOfficerCard = async (cardId) => {
    if (!window.confirm('Are you sure you want to delete this officer ID card record?')) return;
    try {
      const res = await fetch(getApiEndpoint(`staff/panel/officer-ids?id=${cardId}`), {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Officer card record deleted.');
        setIssuedCards((prev) => prev.filter((c) => c.id !== cardId));
      } else {
        toast.error(data.error || 'Failed to delete card.');
      }
    } catch {
      toast.error('Error deleting officer card.');
    }
  };

  const filteredOfficers = officers.filter((o) => {
    const matchesSearch =
      (o.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.phone || '').includes(searchTerm) ||
      (o.designation || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDept = selectedDept === 'all' || o.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  const selectedOfficers = filteredOfficers.filter((o) => selectedIds.includes(o.id));

  // Departments list
  const departments = ['Hall', 'Library', 'Club', 'Accounts', 'Administration', 'General', 'Hostel', 'Inventory'];

  return (
    <div className="w-full space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800 print:hidden">
        <div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-white">
            Officer ID Card Generation &amp; Registry
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Generate high-resolution administrative passes, persist issued records in database, and export print files.
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
              <FiList /> Issued Officer Registry
            </button>
          </div>

          <a
            href="/staff-panel/officer-id-card"
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
          >
            Change Template
          </a>
        </div>
      </div>

      {activeTab === 'archive' ? (
        /* ================= ISSUED OFFICER REGISTRY ================= */
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
                <option value="reissued">Reissued</option>
              </select>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Search by Card #, Officer name, phone..."
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
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-slate-400">Loading officer cards...</span>
              </div>
            ) : issuedCards.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                No issued officer ID cards found. Switch to &quot;Generate Cards&quot; to issue new cards.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-500 tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-3.5 py-2.5">Card Number</th>
                      <th className="px-3.5 py-2.5">Officer</th>
                      <th className="px-3.5 py-2.5">Department &amp; Designation</th>
                      <th className="px-3.5 py-2.5">Issue &amp; Expiry</th>
                      <th className="px-3.5 py-2.5">Status</th>
                      <th className="px-3.5 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {issuedCards.map((card) => (
                      <tr key={card.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-3.5 py-2.5 font-mono text-[11px] font-semibold text-slate-900 dark:text-slate-100">
                          {card.card_number}
                        </td>
                        <td className="px-3.5 py-2.5">
                          <div className="flex items-center gap-2">
                            {card.officer_photo_url ? (
                              <img
                                src={card.officer_photo_url}
                                alt={card.officer_name}
                                className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center font-bold text-[10px]">
                                {card.officer_name?.[0] || 'O'}
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-white">
                                {card.officer_name || 'Officer'}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {card.officer_email || card.officer_phone || '-'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5">
                          <div>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {card.designation_name || 'Officer'}
                            </span>
                            <span className="text-[11px] text-slate-400 block">
                              {card.department_name || 'General'}
                            </span>
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-500 dark:text-slate-400">
                          <div>
                            Issued: {card.issue_date ? new Date(card.issue_date).toLocaleDateString() : '-'}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Valid: {card.valid_upto || (card.expiry_date ? new Date(card.expiry_date).toLocaleDateString() : 'Dec 2028')}
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5">
                          <select
                            value={card.card_status || 'active'}
                            onChange={(e) => handleUpdateStatus(card.id, e.target.value)}
                            className={`text-[10px] px-2 py-0.5 rounded font-semibold border cursor-pointer ${
                              card.card_status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                                : card.card_status === 'expired'
                                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
                                : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
                            }`}
                          >
                            <option value="active">Active</option>
                            <option value="expired">Expired</option>
                            <option value="lost">Lost</option>
                            <option value="revoked">Revoked</option>
                            <option value="reissued">Reissued</option>
                          </select>
                        </td>
                        <td className="px-3.5 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteIssuedOfficerCard(card.id)}
                            className="text-rose-500 hover:text-rose-700 p-1.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
                            title="Delete Record"
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
        /* ================= GENERATE CARDS DESK ================= */
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 print:hidden">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-48 sm:w-60">
                <input
                  type="text"
                  placeholder="Search officer name, phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
                <FiSearch className="absolute left-2.5 top-2.5 text-slate-400 text-xs" />
              </div>

              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              >
                <option value="all">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
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
                {selectedIds.length === filteredOfficers.length ? 'Deselect All' : 'Select All'}
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
            {selectedOfficers.map((o) => {
              const cardData = compileOfficerCard(o);
              const cardWidth = activeTemplate ? `${activeTemplate.dimension_width * 3.7795}px` : '325px';
              const cardHeight = activeTemplate ? `${activeTemplate.dimension_height * 3.7795}px` : '204px';

              return (
                <div
                  key={o.id}
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
                                cardFrontRefs.current[o.id] = el;
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
                                cardBackRefs.current[o.id] = el;
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
                      /* Modern Built-In Officer Card Badges */
                      <>
                        {(cardSideView === 'both' || cardSideView === 'front') && (
                          <div className="flex flex-col items-center gap-1.5">
                            {cardSideView === 'both' && (
                              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                                Front Side
                              </span>
                            )}
                            <div
                              ref={(el) => {
                                cardFrontRefs.current[o.id] = el;
                              }}
                              className="rounded overflow-hidden shadow-xs bg-white text-slate-900 border border-slate-200 dark:border-slate-800"
                              style={{
                                width: cardWidth,
                                height: cardHeight,
                                maxWidth: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                fontFamily: 'Inter, system-ui, sans-serif',
                                position: 'relative',
                              }}
                            >
                              {/* Top Banner */}
                              <div
                                style={{
                                  background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)',
                                  padding: '8px 10px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  color: '#ffffff',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <img
                                    src={website?.logo_url || '/school-logo.png'}
                                    alt="Logo"
                                    style={{ width: '22px', height: '22px', objectFit: 'contain' }}
                                  />
                                  <div>
                                    <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '0.2px', textTransform: 'uppercase' }}>
                                      {website?.name || 'CAMPUS PORTAL'}
                                    </div>
                                    <div style={{ fontSize: '7px', opacity: 0.8 }}>OFFICIAL IDENTITY CARD</div>
                                  </div>
                                </div>
                                <span style={{ fontSize: '7px', background: 'rgba(255,255,255,0.2)', padding: '2px 5px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: '700' }}>
                                  STAFF
                                </span>
                              </div>

                              {/* Body */}
                              <div style={{ flex: 1, display: 'flex', padding: '8px 10px', gap: '10px', alignItems: 'center', background: '#f8fafc' }}>
                                <div style={{ position: 'relative' }}>
                                  <img
                                    src={o.photo_url || '/default-avatar.png'}
                                    alt={o.name}
                                    style={{ width: '54px', height: '66px', objectFit: 'cover', borderRadius: '4px', border: '2px solid #cbd5e1' }}
                                  />
                                  <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: '#4f46e5', color: '#fff', fontSize: '6px', fontWeight: '700', padding: '1px 3px', borderRadius: '2px' }}>
                                    {o.blood_group || 'O+'}
                                  </div>
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '11px', fontWeight: '800', color: '#0f172a', lineHeight: '1.2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {o.name}
                                  </div>
                                  <div style={{ fontSize: '9px', fontWeight: '600', color: '#4338ca', marginTop: '1px' }}>
                                    {o.designation || 'Administrative Officer'}
                                  </div>
                                  <div style={{ fontSize: '8px', color: '#64748b', marginTop: '1px' }}>
                                    Dept: <b>{o.department || 'General'}</b>
                                  </div>
                                  <div style={{ fontSize: '7px', color: '#64748b', marginTop: '2px' }}>
                                    ID: <b style={{ color: '#0f172a' }}>OFF-{String(o.id).padStart(4, '0')}</b>
                                  </div>
                                  <div style={{ fontSize: '7px', color: '#64748b' }}>
                                    Phone: {o.phone || '-'}
                                  </div>
                                </div>
                              </div>

                              {/* Footer */}
                              <div style={{ padding: '4px 10px', background: '#ffffff', borderTop: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ fontSize: '7px', color: '#64748b' }}>
                                  Valid Thru: <b>Dec 2028</b>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <span style={{ fontSize: '6px', color: '#94a3b8', textTransform: 'uppercase' }}>Verified</span>
                                  <div style={{ width: '40px', height: '8px', background: 'repeating-linear-gradient(90deg, #000, #000 1px, transparent 1px, transparent 3px)' }} />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Back Side Built-in */}
                        {(cardSideView === 'both' || cardSideView === 'back') && (
                          <div className="flex flex-col items-center gap-1.5">
                            {cardSideView === 'both' && (
                              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                                Back Side
                              </span>
                            )}
                            <div
                              ref={(el) => {
                                cardBackRefs.current[o.id] = el;
                              }}
                              className="rounded overflow-hidden shadow-xs bg-white text-slate-900 border border-slate-200 dark:border-slate-800"
                              style={{
                                width: cardWidth,
                                height: cardHeight,
                                maxWidth: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                padding: '12px',
                                fontFamily: 'Inter, system-ui, sans-serif',
                                background: '#f8fafc',
                              }}
                            >
                              <div style={{ fontSize: '8px', color: '#475569', lineHeight: '1.4' }}>
                                <b>TERMS &amp; CONDITIONS:</b>
                                <br />
                                1. This card is non-transferable and property of {website?.name || 'Institution'}.
                                <br />
                                2. If found, please return to Admin Office.
                                <br />
                                3. Emergency: {o.phone || website?.phone || '+880 2 000000'}
                              </div>
                              <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                <div>
                                  <div style={{ fontSize: '7px', color: '#64748b' }}>Emergency Contact:</div>
                                  <div style={{ fontSize: '8px', fontWeight: '600', color: '#0f172a' }}>{website?.phone || '+880 1900-000000'}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ width: '50px', borderBottom: '1px solid #0f172a', marginBottom: '2px' }} />
                                  <div style={{ fontSize: '7px', color: '#64748b', fontWeight: '600' }}>Authorized Signature</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2 print:hidden">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(o.id)}
                        onChange={() => toggleSelect(o.id)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                        Include
                      </span>
                    </label>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleDownloadSingleJpeg(o)}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded text-[10px] font-medium text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                        title={`Download ${cardSideView.toUpperCase()} as high-res JPEG`}
                      >
                        JPEG
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadSinglePdf(o)}
                        className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded text-[10px] font-medium transition-colors cursor-pointer"
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

          {selectedOfficers.length === 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-8 text-center text-xs text-slate-500">
              No officers found matching the selected criteria.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
