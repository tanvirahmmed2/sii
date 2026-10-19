'use client';

import React, { useState, useEffect, useContext, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
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
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8 space-y-8 transition-colors max-w-6xl mx-auto overflow-hidden">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full border-b border-slate-200/80 dark:border-slate-800 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <span className="text-xs uppercase tracking-[0.25em] font-semibold text-primary px-3 py-1 rounded-full bg-primary/10 border border-primary/20 inline-block">
            Academic Admissions &amp; Enrollment
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-normal text-slate-900 dark:text-white tracking-tight mt-2">
            Intake Circulars &amp; Direct Applications
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-2xl leading-relaxed">
            Explore official enrollment circulars, review guidelines &amp; exam requirements, pay fees online, and check published merit rankings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
            <Link
              href={tenantUrl('/admission/results')}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:border-primary/50 hover:text-primary text-xs font-semibold transition-all shadow-xs"
            >
              <FiAward className="w-4 h-4 text-primary" /> Check Merit Results
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
            <Link
              href={tenantUrl('/admission/apply')}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-semibold transition-all shadow-xs hover:shadow-md hover:shadow-primary/20"
            >
              <FiPlus className="w-4 h-4" /> Apply for Admission
            </Link>
          </motion.div>
        </div>
      </motion.div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1">
            <FiSearch className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search circulars by title, class, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-style w-full text-xs pl-10 pr-3 py-2"
            />
          </div>

          <div className="flex items-center gap-2">
            <FiFilter className="w-4 h-4 text-slate-400 hidden sm:block" />
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="input-style text-xs px-3 py-2 cursor-pointer"
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
              className="text-xs text-primary hover:underline font-medium cursor-pointer"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Admission Circulars List View */}
      <div className="space-y-6">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 animate-pulse space-y-3"
              >
                <div className="flex items-center gap-2">
                  <div className="w-24 h-5 bg-slate-200 dark:bg-slate-800 rounded-full" />
                  <div className="w-32 h-5 bg-slate-200 dark:bg-slate-800 rounded-full" />
                </div>
                <div className="w-3/4 h-6 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                <div className="w-full h-12 bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
              </div>
            ))}
          </div>
        ) : filteredCirculars.length > 0 ? (
          <div className="space-y-6">
            {filteredCirculars.map((circ) => {
              const isExam = circ.selection_method === 'exam';
              const isMerit = circ.selection_method === 'merit';
              const isExpanded = Boolean(expandedDescriptions[circ.id]);

              return (
                <div
                  key={circ.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300 flex flex-col space-y-5"
                >
                  {/* Top Header: Badges & Status */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Selection Method Badge */}
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
                        {isExam ? 'Exam Based Admission' : isMerit ? 'Merit Based (GPA)' : 'Direct Review'}
                      </span>

                      {/* Class Badge */}
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                        {circ.class_name || 'All Classes'}
                      </span>

                      {/* Academic Session */}
                      <span className="text-xs text-slate-500 font-mono">
                        Session: <strong>{circ.session_name || '2026-2027'}</strong>
                      </span>

                      {/* Department */}
                      {circ.department_name && (
                        <span className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                          {circ.department_name}
                        </span>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          circ.status === 'open'
                            ? 'bg-primary/15 text-primary border border-primary/30'
                            : circ.status === 'upcoming'
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
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
                    <h2 className="font-serif text-lg sm:text-xl font-semibold text-slate-900 dark:text-white leading-tight">
                      {circ.title}
                    </h2>
                  </div>

                  {/* Key Meta Specifications Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3.5 px-4 bg-slate-50/80 dark:bg-slate-850/60 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs">
                    {/* Application Window */}
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1">
                        <FiCalendar className="w-3 h-3 text-primary" /> Application Deadline
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
                        <FiUsers className="w-3 h-3 text-primary" /> Seats &amp; Age
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
                        <FiClock className="w-3 h-3 text-primary" /> {isExam ? 'Exam Date' : 'Results Published'}
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                        {isExam && circ.admission_exam_date
                          ? new Date(circ.admission_exam_date).toLocaleDateString()
                          : circ.result_date
                          ? new Date(circ.result_date).toLocaleDateString()
                          : 'To be announced'}
                      </span>
                      {isExam && circ.admission_admit_publish_date && (
                        <span className="text-[10px] text-primary font-medium">
                          Admit Card: {new Date(circ.admission_admit_publish_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {/* Prerequisites */}
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1">
                        <FiAward className="w-3 h-3 text-primary" /> Prerequisite
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">
                        {circ.last_class && circ.last_class !== 'N/A' ? circ.last_class : 'None specified'}
                      </span>
                      {circ.last_class_grade ? (
                        <span className="text-[10px] text-primary font-mono font-medium">
                          Min GPA: {circ.last_class_grade}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Open to all backgrounds</span>
                      )}
                    </div>
                  </div>

                  {/* Actions & Fee Row */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
                    {/* Fee Display */}
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs text-slate-400 font-medium">Application Fee:</span>
                      <span className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                        ৳{parseFloat(circ.fee_amount || 0).toFixed(2)}
                      </span>
                      <span className="text-xs font-semibold text-primary">
                        {circ.fee_currency || 'BDT'}
                      </span>
                    </div>

                    {/* Action Buttons: Show Description & Apply */}
                    <div className="flex items-center gap-3">
                      {/* Show / Hide Description Toggle Button */}
                      <button
                        type="button"
                        onClick={() => toggleDescription(circ.id)}
                        className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          isExpanded
                            ? 'bg-primary/10 border-primary/30 text-primary'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-primary/50 text-slate-700 dark:text-slate-200'
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
                        className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-semibold shadow-xs hover:shadow-md hover:shadow-primary/20 transition-all hover:-translate-y-0.5"
                      >
                        <span>Apply Now</span>
                        <FiArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>

                  {/* Expandable Description Section - Hidden by default */}
                  {isExpanded && (
                    <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 space-y-4 transition-all">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <FiFileText className="w-4 h-4 text-primary" />
                          Official Circular Description &amp; Admission Guidelines
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">Tiptap Formatted</span>
                      </div>

                      {/* Rich Text HTML Rendering */}
                      {circ.description ? (
                        <div
                          className="prose prose-sm dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 text-xs sm:text-sm leading-relaxed [&_p]:mb-2.5 [&_h1]:text-base [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:mb-2 [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:mb-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2.5 [&_li]:mb-1 [&_strong]:font-bold [&_strong]:text-slate-900 dark:[&_strong]:text-white [&_a]:text-primary [&_a]:underline bg-slate-50/70 dark:bg-slate-950/60 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-inner"
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
                        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
                              <FiClock className="w-3.5 h-3.5" />
                              Admission Exam Details &amp; Subject Marks Breakdown
                            </span>
                            {circ.exam_venue && (
                              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1">
                                <FiMapPin className="w-3.5 h-3.5 text-primary" />
                                {circ.exam_venue}
                              </span>
                            )}
                          </div>

                          {Array.isArray(circ.exam_subjects) && circ.exam_subjects.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                              {circ.exam_subjects.map((sub, sIdx) => (
                                <div
                                  key={sIdx}
                                  className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs shadow-xs"
                                >
                                  <span className="font-semibold text-slate-800 dark:text-slate-200">{sub.title}</span>
                                  <div className="flex items-center gap-1.5 font-mono text-[11px] text-primary">
                                    <span className="font-bold">{sub.mark} marks</span>
                                    <span>&bull;</span>
                                    <span>{sub.time}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                              Subject marks distribution will be published along with the admit cards.
                            </p>
                          )}

                          {circ.exam_instructions && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 pt-2 border-t border-primary/10">
                              <strong className="text-slate-800 dark:text-slate-200">Exam Hall Instructions:</strong> {circ.exam_instructions}
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
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3 shadow-xs">
            <h3 className="font-serif text-base font-semibold text-slate-900 dark:text-white">
              No matching admission circulars found
            </h3>
            <p className="text-slate-500 text-xs sm:text-sm max-w-sm mx-auto">
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
