'use client';

import React, { useState, useEffect, useContext, useMemo } from 'react';
import Link from 'next/link';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import {
  FiFileText,
  FiCalendar,
  FiUsers,
  FiAward,
  FiArrowRight,
  FiCheckCircle,
  FiPlus,
  FiChevronDown,
  FiChevronUp,
  FiClock,
  FiMapPin,
  FiSearch,
  FiFilter,
  FiAlertCircle,
  FiBookOpen
} from 'react-icons/fi';

export default function AdmissionPortalPage() {
  const { tenantUrl, getApiEndpoint } = useContext(TenantWebsiteContext);
  const [circulars, setCirculars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [expandedDescriptions, setExpandedDescriptions] = useState({});

  useEffect(() => {
    const fetchActiveCirculars = async () => {
      try {
        const endpoint = getApiEndpoint ? getApiEndpoint('admissions/apply') : '/api/admissions/apply';
        const res = await fetch(endpoint);
        if (!res.ok) {
          throw new Error(`Server returned ${res.status}`);
        }
        const data = await res.json();
        if (data.success && data.circulars) {
          setCirculars(data.circulars);
        }
      } catch (err) {
        console.error('Failed to load active circulars:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchActiveCirculars();
  }, [getApiEndpoint]);

  const toggleDescription = (id) => {
    setExpandedDescriptions((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const filteredCirculars = useMemo(() => {
    return circulars.filter((circ) => {
      if (methodFilter !== 'all' && circ.selection_method !== methodFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const titleMatch = circ.title?.toLowerCase().includes(query);
        const classMatch = circ.class_name?.toLowerCase().includes(query);
        const deptMatch = circ.department_name?.toLowerCase().includes(query);
        const sessionMatch = circ.session_name?.toLowerCase().includes(query);
        if (!titleMatch && !classMatch && !deptMatch && !sessionMatch) {
          return false;
        }
      }
      return true;
    });
  }, [circulars, methodFilter, searchQuery]);

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 space-y-6 transition-colors max-w-6xl mx-auto">
      {/* Header */}
      <div className="w-full border-b border-slate-200 dark:border-slate-800 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 px-2.5 py-0.5 rounded tracking-wider">
            Academic Admissions &amp; Enrollment
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
            Intake Circulars &amp; Direct Applications
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Explore official enrollment circulars, review guidelines &amp; exam requirements, pay fees online, and check published merit rankings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={tenantUrl('/admission/results')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-2xs"
          >
            <FiAward className="w-4 h-4" /> Check Merit Results
          </Link>
          <Link
            href={tenantUrl('/admission/apply')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition shadow-2xs"
          >
            <FiPlus className="w-4 h-4" /> Apply for Admission
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1">
            <FiSearch className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search circulars by title, class, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-sky-500 transition"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <FiFilter className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="text-xs px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Methods</option>
              <option value="exam">Exam Based</option>
              <option value="merit">Merit Based</option>
              <option value="manual">Direct Review</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end text-xs text-slate-500">
          <span>Showing <strong>{filteredCirculars.length}</strong> circulars</span>
          {(searchQuery || methodFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setMethodFilter('all');
              }}
              className="text-xs text-sky-600 dark:text-sky-400 hover:underline font-medium cursor-pointer"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Admission Circulars List View */}
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 animate-pulse space-y-3"
              >
                <div className="flex items-center gap-2">
                  <div className="w-24 h-5 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="w-32 h-5 bg-slate-200 dark:bg-slate-800 rounded" />
                </div>
                <div className="w-3/4 h-6 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="w-full h-12 bg-slate-100 dark:bg-slate-800/60 rounded" />
              </div>
            ))}
          </div>
        ) : filteredCirculars.length > 0 ? (
          <div className="space-y-4">
            {filteredCirculars.map((circ) => {
              const isExam = circ.selection_method === 'exam';
              const isMerit = circ.selection_method === 'merit';
              const isExpanded = Boolean(expandedDescriptions[circ.id]);

              return (
                <div
                  key={circ.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-2xs hover:border-sky-300 dark:hover:border-sky-800 transition-all duration-200 flex flex-col space-y-4"
                >
                  {/* Top Header: Badges & Status */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Selection Method Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                          isExam
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60'
                            : isMerit
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                            : 'bg-sky-100 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60'
                        }`}
                      >
                        {isExam ? 'Exam Based Admission' : isMerit ? 'Merit Based (GPA)' : 'Direct Review'}
                      </span>

                      {/* Class Badge */}
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-md">
                        {circ.class_name || 'All Classes'}
                      </span>

                      {/* Academic Session */}
                      <span className="text-xs text-slate-500 font-mono">
                        Session: <strong>{circ.session_name || '2026-2027'}</strong>
                      </span>

                      {/* Department */}
                      {circ.department_name && (
                        <span className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                          {circ.department_name}
                        </span>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          circ.status === 'open'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : circ.status === 'upcoming'
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {circ.status === 'open' ? 'Open for Admission' : circ.status || 'Active'}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">#{circ.id}</span>
                    </div>
                  </div>

                  {/* Circular Title */}
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                      {circ.title}
                    </h2>
                  </div>

                  {/* Key Meta Specifications Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 px-3.5 bg-slate-50/80 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs">
                    {/* Application Window */}
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1">
                        <FiCalendar className="w-3 h-3 text-sky-600" /> Application Deadline
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                        {circ.end_date ? new Date(circ.end_date).toLocaleDateString() : 'Rolling'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        From: {circ.start_date ? new Date(circ.start_date).toLocaleDateString() : 'Open'}
                      </span>
                    </div>

                    {/* Capacity & Age */}
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1">
                        <FiUsers className="w-3 h-3 text-emerald-600" /> Seats &amp; Age
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block font-mono">
                        {circ.capacity || circ.class_max_seats || 'Open'} Seats
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Age: {circ.min_age !== null && circ.max_age !== null ? `${circ.min_age} - ${circ.max_age} yrs` : 'All ages'}
                      </span>
                    </div>

                    {/* Exam or Merit Schedule */}
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1">
                        <FiClock className="w-3 h-3 text-purple-600" /> {isExam ? 'Exam Date' : 'Results Published'}
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                        {isExam && circ.admission_exam_date
                          ? new Date(circ.admission_exam_date).toLocaleDateString()
                          : circ.result_date
                          ? new Date(circ.result_date).toLocaleDateString()
                          : 'To be announced'}
                      </span>
                      {isExam && circ.admission_admit_publish_date && (
                        <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                          Admit Card: {new Date(circ.admission_admit_publish_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {/* Prerequisites */}
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1">
                        <FiAward className="w-3 h-3 text-amber-600" /> Prerequisite
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">
                        {circ.last_class && circ.last_class !== 'N/A' ? circ.last_class : 'None specified'}
                      </span>
                      {circ.last_class_grade ? (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                          Min GPA: {circ.last_class_grade}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Open to all backgrounds</span>
                      )}
                    </div>
                  </div>

                  {/* Actions & Fee Row */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                    {/* Fee Display */}
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs text-slate-400 font-medium">Application Fee:</span>
                      <span className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                        ৳{parseFloat(circ.fee_amount || 0).toFixed(2)}
                      </span>
                      <span className="text-xs font-bold text-sky-600 dark:text-sky-400">
                        {circ.fee_currency || 'BDT'}
                      </span>
                    </div>

                    {/* Action Buttons: Show Description & Apply */}
                    <div className="flex items-center gap-2.5">
                      {/* Show / Hide Description Toggle Button */}
                      <button
                        type="button"
                        onClick={() => toggleDescription(circ.id)}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                          isExpanded
                            ? 'bg-sky-50 dark:bg-sky-950/50 border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300'
                            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {isExpanded ? (
                          <>
                            <FiChevronUp className="w-3.5 h-3.5" />
                            <span>Hide Description</span>
                          </>
                        ) : (
                          <>
                            <FiChevronDown className="w-3.5 h-3.5" />
                            <span>Show Description</span>
                          </>
                        )}
                      </button>

                      {/* Direct Apply Button */}
                      <Link
                        href={tenantUrl(`/admission/apply?admission_id=${circ.id}`)}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-2xs transition"
                      >
                        <span>Apply Now</span>
                        <FiArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>

                  {/* Expandable Description Section - Hidden by default */}
                  {isExpanded && (
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3.5 transition-all animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <FiFileText className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                          Official Circular Description &amp; Admission Guidelines
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">Tiptap Formatted</span>
                      </div>

                      {/* Rich Text HTML Rendering */}
                      {circ.description ? (
                        <div
                          className="prose prose-sm dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 text-xs sm:text-sm leading-relaxed [&_p]:mb-2.5 [&_h1]:text-base [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:mb-2 [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:mb-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2.5 [&_li]:mb-1 [&_strong]:font-bold [&_strong]:text-slate-900 dark:[&_strong]:text-white [&_a]:text-sky-600 [&_a]:underline bg-slate-50 dark:bg-slate-950/60 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner"
                          dangerouslySetInnerHTML={{ __html: circ.description }}
                        />
                      ) : (
                        <div className="text-xs italic text-slate-400 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/60 flex items-center gap-2">
                          <FiAlertCircle className="w-4 h-4 text-slate-400" />
                          <span>No extended written description or syllabus guidelines were attached to this circular.</span>
                        </div>
                      )}

                      {/* Exam Schedule & Subjects Breakdown if Exam-based */}
                      {isExam && (
                        <div className="bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-800/40 rounded-xl p-4 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-purple-900 dark:text-purple-200 uppercase tracking-wider flex items-center gap-1.5">
                              <FiClock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                              Admission Exam Details &amp; Subject Marks Breakdown
                            </span>
                            {circ.exam_venue && (
                              <span className="text-xs text-purple-700 dark:text-purple-300 font-medium flex items-center gap-1">
                                <FiMapPin className="w-3.5 h-3.5" />
                                {circ.exam_venue}
                              </span>
                            )}
                          </div>

                          {Array.isArray(circ.exam_subjects) && circ.exam_subjects.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                              {circ.exam_subjects.map((sub, sIdx) => (
                                <div
                                  key={sIdx}
                                  className="bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-900/40 rounded-lg p-2.5 flex items-center justify-between text-xs shadow-2xs"
                                >
                                  <span className="font-semibold text-slate-800 dark:text-slate-200">{sub.title}</span>
                                  <div className="flex items-center gap-1.5 font-mono text-[11px] text-purple-700 dark:text-purple-300">
                                    <span className="font-bold">{sub.mark} marks</span>
                                    <span>&bull;</span>
                                    <span>{sub.time}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-purple-800/80 dark:text-purple-300/80 italic">
                              Subject marks distribution will be published along with the admit cards.
                            </p>
                          )}

                          {circ.exam_instructions && (
                            <p className="text-xs text-purple-900 dark:text-purple-200 mt-2 pt-2 border-t border-purple-200/60 dark:border-purple-800/40">
                              <strong>Exam Hall Instructions:</strong> {circ.exam_instructions}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              No matching admission circulars found
            </h3>
            <p className="text-slate-500 text-xs max-w-sm mx-auto">
              {searchQuery || methodFilter !== 'all'
                ? 'Try adjusting your search query or selection method filter.'
                : 'Institutional circulars will be published here once announced by academic administration.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
