'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import {
  FiFileText,
  FiSearch,
  FiPrinter,
  FiAlertCircle,
  FiCheckCircle,
  FiCalendar,
  FiMapPin,
  FiClock,
  FiArrowRight,
  FiInfo
} from 'react-icons/fi';
import { motion } from 'framer-motion';

function AdmitCardContent() {
  const searchParams = useSearchParams();
  const params = useParams();
  const domain = params?.domain || '';
  const apiBase = domain ? `/api/${domain}` : '/api';

  const initialQuery = searchParams.get('query') || searchParams.get('application_no') || searchParams.get('roll_no') || '';

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(() => Boolean(initialQuery));
  const [admitCard, setAdmitCard] = useState(null);
  const [compiledHtml, setCompiledHtml] = useState(null);
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [viewMode, setViewMode] = useState('template');
  const [errorMsg, setErrorMsg] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const fetchAdmitCard = async (queryVal) => {
    if (!queryVal?.trim()) {
      toast.error('Please enter your Application Tracking No, Exam Roll, or Registered Email.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setAdmitCard(null);
    setCompiledHtml(null);
    setActiveTemplate(null);
    setHasSearched(true);

    try {
      const res = await fetch(`${apiBase}/admissions/admit-card?query=${encodeURIComponent(queryVal.trim())}`);
      const data = await res.json();

      if (res.ok && data.success && data.admit_card) {
        setAdmitCard(data.admit_card);
        setCompiledHtml(data.compiled_html || null);
        setActiveTemplate(data.active_template || null);
        toast.success('Admit card retrieved successfully!');
      } else {
        setErrorMsg(data.error || 'Admit card not found or not yet issued.');
        if (data.error) {
          toast.error(data.error);
        }
      }
    } catch {
      setErrorMsg('Network error connecting to institutional portal. Please try again.');
      toast.error('Network error loading admit card.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialQuery) return;
    let isMounted = true;
    (async () => {
      try {
        const res = await fetch(`${apiBase}/admissions/admit-card?query=${encodeURIComponent(initialQuery.trim())}`);
        const data = await res.json();
        if (isMounted) {
          if (res.ok && data.success && data.admit_card) {
            setAdmitCard(data.admit_card);
            setCompiledHtml(data.compiled_html || null);
            setActiveTemplate(data.active_template || null);
          } else {
            setErrorMsg(data.error || 'Admit card not found or not yet issued.');
          }
          setHasSearched(true);
        }
      } catch {
        if (isMounted) {
          setErrorMsg('Network error connecting to institutional portal. Please try again.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [initialQuery, apiBase]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAdmitCard(searchQuery);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-4xl mx-auto space-y-6">
        {/* Screen Header (Hidden during print) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="print:hidden text-center space-y-2.5 py-2"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-full text-xs font-semibold uppercase tracking-wider">
            <FiFileText className="w-3.5 h-3.5" /> Official Admission Examination
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-normal text-slate-900 dark:text-white tracking-tight">
            Download Admission Test Admit Card
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
            Enter your Application Number, Exam Roll Number, or Registered Email to view and print your verified examination admit card.
          </p>
        </motion.div>

        {/* Search Toolbar (Hidden during print) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="print:hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3"
        >
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Enter Application No (e.g. APP-2026-1001), Exam Roll (e.g. 20261), or Email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <FiSearch className="w-3.5 h-3.5" />
                  <span>Get Admit Card</span>
                </>
              )}
            </button>
          </form>
        </motion.div>

        {/* Error / Pending Notice */}
        {hasSearched && errorMsg && !admitCard && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="print:hidden bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-6 text-center space-y-3 shadow-xs"
          >
            <FiAlertCircle className="w-8 h-8 text-amber-600 dark:text-amber-400 mx-auto" />
            <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
              Admit Card Notice
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
              {errorMsg}
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <Link
                href="/admission/apply"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl shadow-xs transition inline-flex items-center gap-1.5"
              >
                <span>Check Application Status</span>
                <FiArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </motion.div>
        )}

        {/* Printable Admit Card Document */}
        {admitCard && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Top Toolbar Actions (Hidden during print) */}
            <div className="print:hidden flex flex-wrap items-center justify-between gap-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-purple-900 dark:text-purple-200">
                <FiCheckCircle className="text-purple-600 dark:text-purple-400 w-4 h-4" />
                <span>Admit Card Verified &amp; Ready for Examination</span>
                {activeTemplate?.name && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                    Layout: {activeTemplate.name}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {compiledHtml && (
                  <div className="flex items-center gap-1 bg-white dark:bg-purple-900/60 p-0.5 rounded-lg border border-purple-300 dark:border-purple-700 text-xs">
                    <button
                      type="button"
                      onClick={() => setViewMode('template')}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
                        viewMode === 'template'
                          ? 'bg-purple-600 text-white font-semibold shadow-xs'
                          : 'text-purple-900 dark:text-purple-200 hover:text-purple-700'
                      }`}
                    >
                      Template Design
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('classic')}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
                        viewMode === 'classic'
                          ? 'bg-purple-600 text-white font-semibold shadow-xs'
                          : 'text-purple-900 dark:text-purple-200 hover:text-purple-700'
                      }`}
                    >
                      Classic Grid
                    </button>
                  </div>
                )}
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <FiPrinter className="w-3.5 h-3.5" />
                  <span>Print / Save PDF</span>
                </button>
              </div>
            </div>

            {/* ADMIT CARD SHEET */}
            {viewMode === 'template' && compiledHtml ? (
              <div
                id="admit-card-printable"
                className="bg-white text-slate-900 border border-slate-200 rounded-xl p-4 shadow-sm print:border-none print:shadow-none print:p-0 print:m-0 flex justify-center"
              >
                <div
                  className="w-full max-w-[800px] overflow-hidden"
                  dangerouslySetInnerHTML={{ __html: compiledHtml }}
                />
              </div>
            ) : (
            <div
              id="admit-card-printable"
              className="bg-white text-slate-900 border-2 border-slate-900 rounded-xl p-8 shadow-sm space-y-6 print:border-none print:shadow-none print:p-0 print:m-0"
            >
              {/* Institution Header */}
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
                <div className="flex items-center gap-4">
                  {admitCard.institution?.logo_url ? (
                    <Image
                      src={admitCard.institution.logo_url}
                      alt="Logo"
                      width={64}
                      height={64}
                      className="w-16 h-16 object-contain rounded-lg border border-slate-200 p-1"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-slate-900 text-white rounded-lg flex items-center justify-center font-serif font-bold text-2xl">
                      {admitCard.institution?.name ? admitCard.institution.name.charAt(0) : 'I'}
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-bold uppercase tracking-tight text-slate-900">
                      {admitCard.institution?.name || 'Educational Institution'}
                    </h2>
                    <p className="text-xs text-slate-600 max-w-md">
                      {admitCard.institution?.address || 'Main Campus'}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Phone: {admitCard.institution?.phone || 'N/A'} &bull; Email: {admitCard.institution?.email || 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="inline-block px-3 py-1 bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider rounded">
                    ADMIT CARD
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono mt-1">
                    Admission Intake
                  </p>
                </div>
              </div>

              {/* Title & Circular Banner */}
              <div className="bg-slate-100 p-2.5 rounded text-center border border-slate-300">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-800">
                  {admitCard.admission?.title} &bull; Class: {admitCard.admission?.class_name || 'General'}
                  {admitCard.admission?.session_name ? ` (${admitCard.admission?.session_name})` : ''}
                </span>
              </div>

              {/* Candidate Details & Photos Grid */}
              <div className="grid grid-cols-12 gap-4 items-start">
                {/* Details Table (9 Cols) */}
                <div className="col-span-9 space-y-3">
                  <table className="w-full text-xs text-left">
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="py-1.5 font-bold text-slate-500 w-36">Exam Roll No:</td>
                        <td className="py-1.5 font-mono font-bold text-base text-purple-700">
                          {admitCard.applicant?.exam_roll || admitCard.applicant?.roll_no || 'TBA'}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1.5 font-bold text-slate-500">Application Tracking:</td>
                        <td className="py-1.5 font-mono font-semibold text-slate-900">
                          {admitCard.applicant?.application_no}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1.5 font-bold text-slate-500">Candidate Name:</td>
                        <td className="py-1.5 font-bold text-slate-900 uppercase">
                          {admitCard.applicant?.applicant_name}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1.5 font-bold text-slate-500">Father&apos;s Name:</td>
                        <td className="py-1.5 text-slate-800">
                          {admitCard.applicant?.father_name || 'N/A'}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1.5 font-bold text-slate-500">Mother&apos;s Name:</td>
                        <td className="py-1.5 text-slate-800">
                          {admitCard.applicant?.mother_name || 'N/A'}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1.5 font-bold text-slate-500">Date of Birth &amp; Gender:</td>
                        <td className="py-1.5 text-slate-800 font-mono">
                          {admitCard.applicant?.date_of_birth ? new Date(admitCard.applicant.date_of_birth).toLocaleDateString() : 'N/A'} &bull; {admitCard.applicant?.gender || 'N/A'}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1.5 font-bold text-slate-500">Candidate Contact:</td>
                        <td className="py-1.5 font-mono text-slate-800">
                          {admitCard.applicant?.phone} &bull; {admitCard.applicant?.email}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Candidate Photo & Signature (3 Cols) */}
                <div className="col-span-3 flex flex-col items-center gap-2">
                  <div className="w-28 h-28 border-2 border-slate-900 rounded bg-slate-100 overflow-hidden flex items-center justify-center">
                    {admitCard.applicant?.photo_url ? (
                      <Image
                        src={admitCard.applicant.photo_url}
                        alt="Candidate Photo"
                        width={112}
                        height={112}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] text-slate-400 text-center px-1">
                        Candidate Photo
                      </span>
                    )}
                  </div>

                  <div className="w-28 h-10 border border-slate-400 rounded bg-slate-50 overflow-hidden flex items-center justify-center">
                    {admitCard.applicant?.signature_url ? (
                      <Image
                        src={admitCard.applicant.signature_url}
                        alt="Signature"
                        width={112}
                        height={40}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-[9px] text-slate-400">
                        Candidate Signature
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-400">Candidate Signature</span>
                </div>
              </div>

              {/* Examination Schedule & Venue Info */}
              <div className="bg-slate-50 border border-slate-300 rounded p-4 space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="flex items-start gap-2">
                    <FiCalendar className="w-4 h-4 text-purple-700 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-700 block">Exam Date &amp; Time:</span>
                      <span className="font-mono text-slate-900 font-semibold">
                        {admitCard.exam?.exam_date ? new Date(admitCard.exam.exam_date).toLocaleString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'Will be notified via SMS/Portal'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <FiMapPin className="w-4 h-4 text-purple-700 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-700 block">Examination Venue:</span>
                      <span className="text-slate-900 font-medium">
                        {admitCard.exam?.venue || 'Main Institutional Campus'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Subjects Table */}
              {Array.isArray(admitCard.exam?.subjects) && admitCard.exam.subjects.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    Subject Marks Breakdown &amp; Duration
                  </span>
                  <table className="w-full text-xs text-left border border-slate-300">
                    <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold">
                      <tr>
                        <th className="py-2 px-3 border-r border-slate-300">#</th>
                        <th className="py-2 px-3 border-r border-slate-300">Subject Title</th>
                        <th className="py-2 px-3 border-r border-slate-300 text-center">Full Marks</th>
                        <th className="py-2 px-3 text-center">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {admitCard.exam.subjects.map((sub, idx) => (
                        <tr key={sub.id || idx}>
                          <td className="py-1.5 px-3 border-r border-slate-300 font-mono">{idx + 1}</td>
                          <td className="py-1.5 px-3 border-r border-slate-300 font-semibold">{sub.title}</td>
                          <td className="py-1.5 px-3 border-r border-slate-300 text-center font-mono font-bold">{sub.mark}</td>
                          <td className="py-1.5 px-3 text-center font-mono">{sub.time || '1 hour'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Instructions */}
              <div className="border-t border-slate-300 pt-3 text-[10px] text-slate-600 space-y-1">
                <span className="font-bold text-slate-900 uppercase block">Important Instructions:</span>
                <p className="leading-relaxed">
                  {admitCard.exam?.instructions ||
                    '1. Candidate must bring a printed copy of this admit card to the examination venue. 2. Please arrive at least 30 minutes prior to exam commencement. 3. Cellular devices, programmable calculators, and notes are strictly prohibited inside the hall. 4. Preserve this admit card for intake and enrollment procedures.'}
                </p>
              </div>

              {/* Signatures Footer */}
              <div className="pt-8 flex justify-between items-end text-xs">
                <div className="text-center">
                  <div className="w-40 border-t border-slate-400 pt-1 text-[10px] font-medium text-slate-600">
                    Candidate Signature
                  </div>
                </div>

                <div className="text-center">
                  <div className="w-40 border-t border-slate-900 pt-1 text-[10px] font-bold text-slate-900 uppercase">
                    Authorized Controller of Exams
                  </div>
                </div>
              </div>
            </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default function AdmissionAdmitCardPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full min-h-screen flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <AdmitCardContent />
    </Suspense>
  );
}
