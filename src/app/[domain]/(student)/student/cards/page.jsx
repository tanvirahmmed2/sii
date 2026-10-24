'use client';

import React, { useEffect, useState, useMemo } from 'react';
import TenantLoader from 'src/component/tenant/TenantLoader';
import Link from 'next/link';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import { printAdmitCard } from 'src/lib/receipts/admit_card';
import { printStudentIDCard } from 'src/lib/receipts/student_id_card';
import { toast } from 'react-hot-toast';

export default function StudentCardsPortfolioPage() {
  const { getApiEndpoint, tenantUrl, website } = useTenantWebsite();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('all'); // 'all' | 'identity' | 'admit' | 'campus'
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedExamId, setExpandedExamId] = useState(null);
  const [activeModalCard, setActiveModalCard] = useState(null);
  const [idCardSide, setIdCardSide] = useState('front'); // 'front' | 'back'

  useEffect(() => {
    const fetchCards = async () => {
      try {
        const res = await fetch(getApiEndpoint('student/cards'));
        if (res.ok) {
          const json = await res.json();
          const payload = json.payload || json.paylod || json || {};
          setData(payload);
        } else {
          toast.error('Failed to load issued cards portfolio.');
        }
      } catch (error) {
        console.error('Error fetching cards portfolio:', error);
        toast.error('Network error loading cards.');
      } finally {
        setLoading(false);
      }
    };

    fetchCards();
  }, [getApiEndpoint]);

  const student = data?.student || null;
  const institution = data?.institution || website || {};
  const allCards = useMemo(() => data?.cards || [], [data?.cards]);

  // Filter cards based on tab and search
  const filteredCards = useMemo(() => {
    return allCards.filter((card) => {
      // Tab matching
      if (selectedFilter === 'identity') {
        if (card.type !== 'id_card' && card.type !== 'registration_card') return false;
      } else if (selectedFilter === 'admit') {
        if (card.type !== 'admit_card') return false;
      } else if (selectedFilter === 'campus') {
        if (card.type !== 'library_card' && card.type !== 'residence_card') return false;
      }

      // Query matching
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = card.title?.toLowerCase().includes(q);
        const numMatch = card.card_number?.toLowerCase().includes(q);
        const subtitleMatch = card.subtitle?.toLowerCase().includes(q);
        const badgeMatch = card.badge?.toLowerCase().includes(q);
        if (!titleMatch && !numMatch && !subtitleMatch && !badgeMatch) return false;
      }

      return true;
    });
  }, [allCards, selectedFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = allCards.length;
    const active = allCards.filter((c) => c.status === 'active').length;
    const admitCount = allCards.filter((c) => c.type === 'admit_card').length;
    return { total, active, admitCount };
  }, [allCards]);

  // Generic Printable Popup for Library, Hostel & Registration Cards
  const handlePrintGenericCard = (card) => {
    if (typeof window === 'undefined') return;
    const printWindow = window.open('', '_blank', 'width=850,height=920');
    if (!printWindow) {
      toast.error('Please allow popups to print official document.');
      return;
    }

    const schoolName = institution?.name || website?.name || 'Educational Institution';
    const schoolAddress = institution?.address || website?.address || 'Main Campus';

    const html = `<!DOCTYPE html>
    <html>
    <head>
      <title>${card.title} - ${student?.name || 'Student'}</title>
      <meta charset="utf-8" />
      <style>
        body {
          margin: 0;
          padding: 30px;
          background: #f8fafc;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .container {
          max-width: 520px;
          margin: 0 auto;
          background: #ffffff;
          border: 2px solid #0f172a;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 14px rgba(0,0,0,0.1);
        }
        .header {
          background: #0f172a;
          color: #ffffff;
          padding: 18px 20px;
          text-align: center;
        }
        .school-name {
          font-size: 15px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .school-sub {
          font-size: 9px;
          color: #94a3b8;
          margin-top: 2px;
        }
        .card-badge {
          display: inline-block;
          font-size: 10px;
          color: #38bdf8;
          font-weight: 700;
          margin-top: 6px;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          border: 1px solid #1e293b;
          background: #1e293b;
          padding: 2px 10px;
          border-radius: 4px;
        }
        .body {
          padding: 20px;
        }
        .photo-strip {
          display: flex;
          align-items: center;
          gap: 14px;
          padding-bottom: 14px;
          margin-bottom: 14px;
          border-bottom: 1px solid #e2e8f0;
        }
        .photo-box {
          width: 65px;
          height: 65px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background: #f1f5f9;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          color: #64748b;
          font-size: 18px;
        }
        .photo-box img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .holder-info h3 {
          margin: 0 0 2px;
          font-size: 14px;
          font-weight: 700;
          color: #0f172a;
        }
        .holder-info p {
          margin: 0;
          font-size: 11px;
          color: #64748b;
          font-family: monospace;
        }
        .details-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11.5px;
        }
        .details-table td {
          padding: 6px 4px;
          border-bottom: 1px solid #f1f5f9;
        }
        .details-table .lbl {
          color: #64748b;
          width: 42%;
          font-weight: 500;
        }
        .details-table .val {
          color: #0f172a;
          font-weight: 600;
        }
        .barcode-box {
          text-align: center;
          margin-top: 18px;
          padding-top: 14px;
          border-top: 1px dashed #cbd5e1;
        }
        .barcode-box img {
          width: 70px;
          height: 70px;
        }
        .barcode-num {
          font-family: monospace;
          font-size: 11px;
          letter-spacing: 2px;
          margin-top: 4px;
          color: #475569;
          font-weight: 600;
        }
        .footer-note {
          text-align: center;
          font-size: 9px;
          color: #94a3b8;
          padding: 10px 20px;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
        }
        .btn-print {
          display: block;
          margin: 0 auto 16px;
          background: #0284c7;
          color: white;
          border: none;
          padding: 10px 24px;
          border-radius: 6px;
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
        }
        @media print {
          body { padding: 0; background: white; }
          .btn-print { display: none; }
          .container { box-shadow: none; border-color: #000000; }
        }
      </style>
    </head>
    <body>
      <button class="btn-print" onclick="window.print()">Print Official Pass</button>
      <div class="container">
        <div class="header">
          <div class="school-name">${schoolName}</div>
          <div class="school-sub">${schoolAddress}</div>
          <div class="card-badge">${card.title}</div>
        </div>
        <div class="body">
          <div class="photo-strip">
            <div class="photo-box">
              ${student?.image ? `<img src="${student.image}" alt="${student.name}" />` : (student?.name?.slice(0, 2).toUpperCase() || 'ST')}
            </div>
            <div class="holder-info">
              <h3>${student?.name || 'Candidate'}</h3>
              <p>Registration No: ${student?.registration_number || 'N/A'}</p>
              <p>Roll: #${student?.roll || 'N/A'} | Class: ${student?.class_name || 'N/A'}</p>
            </div>
          </div>

          <table class="details-table">
            <tr><td class="lbl">Permit / Card No</td><td class="val font-mono">${card.card_number}</td></tr>
            <tr><td class="lbl">Session</td><td class="val">${student?.session_name || 'Academic Session'}</td></tr>
            <tr><td class="lbl">Section</td><td class="val">${student?.section_name || 'A'}</td></tr>
            <tr><td class="lbl">Blood Group</td><td class="val">${student?.blood_group || 'O+'}</td></tr>
            <tr><td class="lbl">Issue Date</td><td class="val">${card.issue_date || 'N/A'}</td></tr>
            <tr><td class="lbl">Valid Until</td><td class="val">${card.expiry_date || 'Active Session'}</td></tr>
            <tr><td class="lbl">Verification Status</td><td class="val">${card.status_label || 'Active & Authorized'}</td></tr>
            ${Object.entries(card.details || {}).map(([k, v]) => `<tr><td class="lbl">${k.replace(/_/g, ' ').toUpperCase()}</td><td class="val">${v}</td></tr>`).join('')}
          </table>

          <div class="barcode-box">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(card.card_number)}" alt="Barcode QR" />
            <div class="barcode-num">${card.card_number}</div>
          </div>
        </div>
        <div class="footer-note">
          Official Institutional Document • Non-Transferable • Property of ${schoolName}
        </div>
      </div>
    </body>
    </html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
  };

  // Central Card Print Handler
  const handlePrintCard = (card) => {
    if (card.type === 'id_card') {
      printStudentIDCard({
        id_card_no: card.card_number,
        student: {
          ...student,
          school_name: institution?.name || website?.name,
          school_address: institution?.address || website?.address
        },
        issue_date: card.issue_date,
        expiry_date: card.expiry_date
      });
    } else if (card.type === 'admit_card') {
      const examData = card.data || {};
      printAdmitCard(examData, student, examData.schedules || []);
    } else {
      handlePrintGenericCard(card);
    }
  };

  if (loading) {
    return <TenantLoader fullScreen={false} />;
  }

  return (
    <div className="w-full space-y-5 pb-12">
      {/* Page Header */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 gap-3">
        <div>
          <h1 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white tracking-tight">
            Issued Student Cards &amp; Identity Passes
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Access, inspect, and print your official institutional credentials, examination admit cards, and campus passes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {data?.idCard && (
            <button
              type="button"
              onClick={() => {
                const idCardItem = allCards.find((c) => c.type === 'id_card') || {
                  type: 'id_card',
                  card_number: data.idCard.id_card_no,
                  issue_date: data.idCard.issue_date,
                  expiry_date: data.idCard.expiry_date
                };
                handlePrintCard(idCardItem);
              }}
              className="px-3 py-1.5 rounded-md bg-primary hover:bg-primary-dark text-white text-xs font-medium cursor-pointer shadow-xs transition flex items-center gap-1.5"
            >
              <span>Print Primary ID Card</span>
            </button>
          )}
          <Link
            href={tenantUrl('/student/fees')}
            className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition cursor-pointer"
          >
            Check Fee Clearance
          </Link>
        </div>
      </div>

      {/* Candidate Enrollment Banner */}
      {student && (
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 shrink-0">
              {student.image ? (
                <img src={student.image} alt={student.name} className="w-full h-full object-cover" />
              ) : (
                student.name?.slice(0, 2).toUpperCase() || 'ST'
              )}
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{student.name}</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                  Enrolled &amp; Verified
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-mono">
                <span>Reg: <strong className="text-slate-700 dark:text-slate-200">{student.registration_number}</strong></span>
                {student.roll && <span>Roll: #{student.roll}</span>}
                <span>Class: {student.class_name} ({student.section_name})</span>
                <span>Session: {student.session_name}</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 pt-3 md:pt-0 md:pl-5 shrink-0">
            <div className="text-center">
              <p className="text-xs text-slate-400">Total Cards</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{stats.total}</p>
            </div>
            <div className="w-px h-7 bg-slate-200 dark:bg-slate-800" />
            <div className="text-center">
              <p className="text-xs text-slate-400">Active Passes</p>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{stats.active}</p>
            </div>
            <div className="w-px h-7 bg-slate-200 dark:bg-slate-800" />
            <div className="text-center">
              <p className="text-xs text-slate-400">Exam Permits</p>
              <p className="text-sm font-bold text-primary">{stats.admitCount}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'all', label: 'All Cards', count: allCards.length },
            { id: 'identity', label: 'Identity & Enrollment', count: allCards.filter(c => c.type === 'id_card' || c.type === 'registration_card').length },
            { id: 'admit', label: 'Exam Permits', count: stats.admitCount },
            { id: 'campus', label: 'Campus Passes', count: allCards.filter(c => c.type === 'library_card' || c.type === 'residence_card').length },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedFilter(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                selectedFilter === tab.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  selectedFilter === tab.id
                    ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search card number, exam, or permit..."
            className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
          />
        </div>
      </div>

      {/* Cards Portfolio Grid */}
      {filteredCards.length === 0 ? (
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-10 text-center space-y-2">
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">No Matching Cards Found</p>
          <p className="text-xs text-slate-400">
            {searchQuery ? 'No issued card matches your query.' : 'There are no credentials issued under this category at this time.'}
          </p>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="px-3 py-1 text-xs text-primary hover:underline font-medium cursor-pointer"
            >
              Clear search filter
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredCards.map((card) => {
            const isAdmit = card.type === 'admit_card';
            const isExpanded = isAdmit && expandedExamId === card.data?.id;

            return (
              <div
                key={card.id}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                {/* Physical Card Mockup Header */}
                <div className={`p-4 bg-gradient-to-br ${card.gradient || 'from-slate-800 to-slate-950'} text-white relative overflow-hidden`}>
                  {/* Subtle Background Pattern */}
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px]" />

                  {/* Header Row: Badge & Chip Icon */}
                  <div className="relative z-10 flex items-center justify-between pb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-white/20 backdrop-blur-xs text-white">
                      {card.badge}
                    </span>
                    {/* Chip Graphic */}
                    <div className="w-7 h-5 rounded bg-amber-400/80 border border-amber-300/90 flex items-center justify-center">
                      <div className="w-4 h-3 border border-amber-600/60 rounded-xs" />
                    </div>
                  </div>

                  {/* Title & Subtitle */}
                  <div className="relative z-10 pt-1 space-y-0.5">
                    <h3 className="text-sm font-bold tracking-tight text-white leading-tight">
                      {card.title}
                    </h3>
                    <p className="text-[11px] text-white/80 line-clamp-1">
                      {card.subtitle}
                    </p>
                  </div>

                  {/* Monospace Permit Number */}
                  <div className="relative z-10 pt-4 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-white/60">Credential Number</p>
                      <p className="font-mono text-xs font-semibold tracking-wider text-white">
                        {card.card_number}
                      </p>
                    </div>
                    {/* Status Pill */}
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                      card.status === 'active'
                        ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/40'
                        : 'bg-amber-500/30 text-amber-200 border border-amber-400/40'
                    }`}>
                      {card.status_label}
                    </span>
                  </div>
                </div>

                {/* Card Meta Details */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Issue Date</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">
                        {card.issue_date || 'Enrolled'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Valid Until</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">
                        {card.expiry_date || 'Active Session'}
                      </span>
                    </div>
                  </div>

                  {/* Key Highlights */}
                  {card.details && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                      {Object.entries(card.details).slice(0, 4).map(([k, v]) => (
                        <div key={k} className="truncate">
                          <span className="text-slate-400">{k.replace(/_/g, ' ')}: </span>
                          <span className="font-medium text-slate-700 dark:text-slate-200">{v}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveModalCard(card)}
                      className="px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition cursor-pointer flex-1 text-center"
                    >
                      Inspect Pass
                    </button>

                    {isAdmit && (
                      <button
                        type="button"
                        onClick={() => setExpandedExamId(isExpanded ? null : card.data?.id)}
                        className="px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium transition cursor-pointer"
                        title={isExpanded ? 'Hide Routine' : 'View Timetable'}
                      >
                        {isExpanded ? 'Routine ▲' : 'Routine ▼'}
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={!card.is_downloadable}
                      onClick={() => handlePrintCard(card)}
                      className="px-3 py-1.5 rounded-md bg-primary hover:bg-primary-dark text-white text-xs font-medium transition cursor-pointer shadow-2xs disabled:opacity-50 flex items-center gap-1 shrink-0"
                    >
                      Print
                    </button>
                  </div>
                </div>

                {/* Inline Timetable for Admit Cards */}
                {isExpanded && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 text-xs space-y-2">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block text-[11px] uppercase tracking-wider">
                      Subject Schedules ({card.data?.schedules?.length || 0})
                    </span>
                    {(!card.data?.schedules || card.data.schedules.length === 0) ? (
                      <p className="text-[11px] text-slate-400 italic">No subject timetable mapped.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {card.data.schedules.map((sch, idx) => (
                          <div
                            key={idx}
                            className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded flex items-center justify-between text-[11px]"
                          >
                            <div>
                              <p className="font-medium text-slate-900 dark:text-white leading-tight">{sch.subject_name}</p>
                              <span className="text-[10px] text-slate-400 font-mono">{sch.subject_code || 'General'}</span>
                            </div>
                            <div className="text-right">
                              <p className="font-mono font-medium text-slate-700 dark:text-slate-300">{sch.exam_date || 'TBA'}</p>
                              <span className="text-[10px] text-slate-400">{sch.start_time || '10:00 AM'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Card Inspection Modal */}
      {activeModalCard && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {activeModalCard.title}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  ID: {activeModalCard.card_number}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalCard(null)}
                className="w-7 h-7 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center text-sm font-semibold transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 overflow-y-auto space-y-4">
              {/* If ID Card: Provide Flip Toggle */}
              {activeModalCard.type === 'id_card' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIdCardSide('front')}
                      className={`px-3 py-1 rounded text-xs font-medium cursor-pointer transition ${
                        idCardSide === 'front'
                          ? 'bg-primary text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Front Side
                    </button>
                    <button
                      type="button"
                      onClick={() => setIdCardSide('back')}
                      className={`px-3 py-1 rounded text-xs font-medium cursor-pointer transition ${
                        idCardSide === 'back'
                          ? 'bg-primary text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Back Side &amp; Terms
                    </button>
                  </div>

                  {idCardSide === 'front' ? (
                    <div className="w-full max-w-xs mx-auto aspect-[1.586] rounded-xl bg-gradient-to-br from-blue-700 via-indigo-700 to-sky-800 text-white p-4 shadow-lg flex flex-col justify-between relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold tracking-wider uppercase opacity-80">{institution?.name || 'CAMPUS ID'}</span>
                        <span className="px-2 py-0.5 rounded text-[8px] font-bold bg-white/20 uppercase">Student</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-lg bg-white/20 border border-white/30 overflow-hidden flex items-center justify-center font-bold text-lg">
                          {student?.image ? (
                            <img src={student.image} alt={student.name} className="w-full h-full object-cover" />
                          ) : (
                            student?.name?.slice(0, 2).toUpperCase() || 'ST'
                          )}
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold leading-tight">{student?.name}</p>
                          <p className="text-[10px] font-mono opacity-80">Class: {student?.class_name} ({student?.section_name})</p>
                          <p className="text-[10px] font-mono opacity-80">Roll: #{student?.roll || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-white/20 text-[9px] font-mono">
                        <span>{activeModalCard.card_number}</span>
                        <span>Exp: {activeModalCard.expiry_date || 'Session Final'}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full max-w-xs mx-auto aspect-[1.586] rounded-xl bg-slate-900 text-white p-4 shadow-lg flex flex-col justify-between border border-slate-800">
                      <div>
                        <p className="text-[9px] font-bold text-sky-400 uppercase tracking-wider text-center">
                          Official Institutional Terms
                        </p>
                        <p className="text-[8px] text-slate-300 mt-1 leading-relaxed">
                          • Certified identity pass of {institution?.name || 'the institution'}.<br />
                          • Non-transferable; must be presented on demand.<br />
                          • Emergency Contact: {student?.emergency_phone || institution?.phone || '+880 1700-000000'}
                        </p>
                      </div>
                      <div className="text-center pt-2 border-t border-slate-800">
                        <p className="text-[8px] font-mono text-slate-400">Barcode: {activeModalCard.card_number}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Comprehensive Card Metadata Table */}
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-3.5 space-y-2 border border-slate-200 dark:border-slate-700/60 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Holder Legal Name</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{student?.name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Registration Number</span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-white">{student?.registration_number}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Class &amp; Section</span>
                    <span className="text-slate-800 dark:text-slate-200">{student?.class_name} ({student?.section_name})</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Academic Session</span>
                    <span className="text-slate-800 dark:text-slate-200">{student?.session_name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Issue Date</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">{activeModalCard.issue_date || 'Enrolled'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Validity Status</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{activeModalCard.status_label}</span>
                  </div>
                </div>

                {activeModalCard.details && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Specific Parameters</span>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(activeModalCard.details).map(([k, v]) => (
                        <div key={k}>
                          <span className="text-[10px] text-slate-400 block capitalize">{k.replace(/_/g, ' ')}</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* If Admit Card: Show Examination Routine Timetable */}
              {activeModalCard.type === 'admit_card' && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                    Examination Timetable ({activeModalCard.data?.schedules?.length || 0} Subjects)
                  </h4>
                  {(!activeModalCard.data?.schedules || activeModalCard.data.schedules.length === 0) ? (
                    <p className="text-xs text-slate-400 italic">No schedules mapped for this examination.</p>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-md">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] uppercase">
                            <th className="py-1.5 px-2.5">Subject</th>
                            <th className="py-1.5 px-2.5">Code</th>
                            <th className="py-1.5 px-2.5">Date</th>
                            <th className="py-1.5 px-2.5">Time</th>
                            <th className="py-1.5 px-2.5">Room</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {activeModalCard.data.schedules.map((sch, sIdx) => (
                            <tr key={sIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="py-1.5 px-2.5 font-medium text-slate-900 dark:text-white">{sch.subject_name}</td>
                              <td className="py-1.5 px-2.5 font-mono text-slate-500">{sch.subject_code || '—'}</td>
                              <td className="py-1.5 px-2.5 font-mono text-slate-700 dark:text-slate-300">{sch.exam_date || 'TBA'}</td>
                              <td className="py-1.5 px-2.5 font-mono text-slate-500">{sch.start_time || '10:00 AM'}</td>
                              <td className="py-1.5 px-2.5 text-slate-700 dark:text-slate-300">{sch.room_number || 'Hall A'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/80">
              <button
                type="button"
                onClick={() => setActiveModalCard(null)}
                className="px-3.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium cursor-pointer transition"
              >
                Close Inspector
              </button>
              <button
                type="button"
                disabled={!activeModalCard.is_downloadable}
                onClick={() => handlePrintCard(activeModalCard)}
                className="px-4 py-1.5 rounded-md bg-primary hover:bg-primary-dark text-white text-xs font-medium cursor-pointer shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <span>Print Official Document</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
