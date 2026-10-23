'use client';

import React, { useState, useEffect, useContext, Suspense } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { printSingleMarkSheet } from 'src/lib/receipts/singleMarkSheet';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import { FiBookOpen, FiPrinter, FiUser, FiAward, FiSearch, FiCheckCircle } from 'react-icons/fi';

function AcademicResultsContent() {
  const { getApiEndpoint } = useContext(TenantWebsiteContext) || {};
  const [regNo, setRegNo] = useState('');
  const [selectedExamId, setSelectedExamId] = useState('');
  const [publishedExams, setPublishedExams] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const loadExams = async () => {
      try {
        const endpoint = getApiEndpoint ? getApiEndpoint('public/results') : '/api/public/results';
        const res = await fetch(endpoint);
        const resData = await res.json();
        const exams = resData?.paylod?.publishedExams || resData?.payload?.publishedExams || [];
        if (res.ok && resData.success && exams.length > 0) {
          setPublishedExams(exams);
          setSelectedExamId(exams[0].id.toString());
        }
      } catch (err) {
        console.error('Error loading published exams:', err);
      }
    };
    loadExams();
  }, [getApiEndpoint]);

  const fetchResults = async (targetRegNo, targetExamId = '') => {
    if (!targetRegNo.trim()) {
      toast.error('Please enter a student registration number.');
      return;
    }

    setLoading(true);
    setHasSearched(true);
    try {
      const examToUse = targetExamId || selectedExamId;
      const endpoint = getApiEndpoint ? getApiEndpoint('public/results') : '/api/public/results';
      let url = `${endpoint}?reg_no=${encodeURIComponent(targetRegNo.trim())}`;
      if (examToUse) {
        url += `&exam_id=${examToUse}`;
      }

      const res = await fetch(url);
      const resData = await res.json();
      const payload = resData?.paylod || resData?.payload;

      if (res.ok && resData.success && payload?.student) {
        setData(payload);
        if (payload?.publishedExams) {
          setPublishedExams(payload.publishedExams);
        }
        if (payload?.selectedResult?.exam?.id) {
          setSelectedExamId(payload.selectedResult.exam.id.toString());
        }
      } else {
        setData(null);
        toast.error(resData.error || resData.message || 'Result not found for this registration number.');
      }
    } catch {
      setData(null);
      toast.error('An error occurred while fetching examination results.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchResults(regNo, selectedExamId);
  };

  const handleExamChange = (e) => {
    const newExamId = e.target.value;
    setSelectedExamId(newExamId);
    if (regNo.trim()) {
      fetchResults(regNo, newExamId);
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-10 sm:py-16 px-4 sm:px-6 lg:px-8 transition-colors overflow-hidden">
      <div className="w-full max-w-5xl mx-auto space-y-8 sm:space-y-10">
        
        {/* Navigation Breadcrumb / Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-2">
            <Link
              href="/results"
              className="text-xs font-semibold text-slate-500 hover:text-primary transition"
            >
              Results Hub
            </Link>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="text-xs font-semibold text-primary">Academic Results</span>
          </div>

          <div className="inline-flex rounded-xl bg-slate-200/60 dark:bg-slate-800/60 p-1 text-xs">
            <Link
              href="/results/admission"
              className="px-3.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition font-medium"
            >
              Admission Results
            </Link>
            <span className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 font-semibold text-primary shadow-xs">
              Academic Results
            </span>
          </div>
        </div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-start gap-2 border-b border-slate-200 dark:border-slate-800 pb-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase bg-primary/10 text-primary border border-primary/20">
            <FiBookOpen className="w-3.5 h-3.5" /> Examination Registry
          </div>
          <h1 className="font-serif font-normal text-3xl sm:text-4xl lg:text-5xl text-slate-900 dark:text-white tracking-tight">
            Academic Examination Results
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl font-light">
            Search individual student academic transcripts, subject performance breakdowns, and print official marksheet documentation.
          </p>
        </motion.div>

        {/* Inquiry Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs border border-slate-200/80 dark:border-slate-800/80 p-6 sm:p-8 rounded-3xl shadow-xs"
        >
          <form onSubmit={handleSearchSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Student Registration Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2026-6001 or REG20261001"
                  value={regNo}
                  onChange={(e) => setRegNo(e.target.value)}
                  className="input-style w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Examination Term *
                </label>
                <select
                  value={selectedExamId}
                  onChange={handleExamChange}
                  className="input-style w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
                >
                  {publishedExams.length === 0 ? (
                    <option value="">No Published Exams Available</option>
                  ) : (
                    publishedExams.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.name} {ex.class_name ? `(${ex.class_name})` : ex.term ? `(${ex.term})` : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-semibold transition-all shadow-xs hover:shadow-md cursor-pointer disabled:opacity-60 flex items-center gap-2"
              >
                <FiSearch className="w-4 h-4" />
                <span>{loading ? 'Searching Records...' : 'Query Student Record'}</span>
              </motion.button>
            </div>
          </form>
        </motion.div>

        {/* Loading */}
        {loading ? (
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs border border-slate-200/80 dark:border-slate-800/80 p-12 rounded-3xl text-center shadow-xs">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 animate-pulse">
              Compiling individual student evaluation record...
            </span>
          </div>
        ) : data?.student ? (
          <div className="space-y-6 sm:space-y-8">
            
            {/* Student Individual Dossier Card */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-xs">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-primary block mb-1">
                  Verified Student Dossier
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl font-normal text-slate-900 dark:text-white">
                  {data.student.name}
                </h2>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2">
                  <span>Reg: <strong className="text-slate-900 dark:text-white font-mono font-medium">{data.student.registration_number || data.student.registration_no}</strong></span>
                  <span>Class: <strong className="text-slate-900 dark:text-white font-medium">{data.student.class_name}</strong> {data.student.section_name ? `(${data.student.section_name})` : ''}</span>
                  <span>Roll: <strong className="text-slate-900 dark:text-white font-mono font-medium">{data.student.roll || data.student.roll_no || 'N/A'}</strong></span>
                  {data.student.session_name && <span>Session: <strong className="text-slate-900 dark:text-white font-medium">{data.student.session_name}</strong></span>}
                </div>
              </div>

              {data.selectedResult && (
                <button
                  onClick={() => printSingleMarkSheet({
                    student: data.student,
                    exam: data.selectedResult.exam,
                    result: data.selectedResult.result,
                    marks: data.selectedResult.marks || []
                  })}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer shrink-0 flex items-center gap-2"
                >
                  <FiPrinter className="w-4 h-4" />
                  <span>Print Official Marksheet</span>
                </button>
              )}
            </div>

            {/* Performance Metric Strip */}
            {data.selectedResult?.result && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs border border-slate-200/80 dark:border-slate-800/80 p-4 sm:p-5 rounded-2xl shadow-xs">
                  <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    Total Marks
                  </span>
                  <span className="font-serif text-2xl font-normal text-slate-900 dark:text-white mt-1 block">
                    {data.selectedResult.result.total_marks || data.selectedResult.result.obtained_marks || 0}
                  </span>
                </div>

                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs border border-slate-200/80 dark:border-slate-800/80 p-4 sm:p-5 rounded-2xl shadow-xs">
                  <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    GPA Score
                  </span>
                  <span className="font-serif text-2xl font-normal text-primary mt-1 block">
                    {Number(data.selectedResult.result.gpa || 0).toFixed(2)}
                  </span>
                </div>

                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs border border-slate-200/80 dark:border-slate-800/80 p-4 sm:p-5 rounded-2xl shadow-xs">
                  <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    Letter Grade
                  </span>
                  <span className="font-serif text-2xl font-normal text-slate-900 dark:text-white mt-1 block">
                    {data.selectedResult.result.grade || data.selectedResult.result.grade_name || 'F'}
                  </span>
                </div>

                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs border border-slate-200/80 dark:border-slate-800/80 p-4 sm:p-5 rounded-2xl shadow-xs">
                  <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    Merit Position
                  </span>
                  <span className="font-serif text-2xl font-normal text-slate-900 dark:text-white mt-1 block">
                    {data.selectedResult.result.merit_rank ? `#${data.selectedResult.result.merit_rank}` : '—'}
                  </span>
                </div>

                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs border border-slate-200/80 dark:border-slate-800/80 p-4 sm:p-5 rounded-2xl shadow-xs col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    Result Status
                  </span>
                  <span className="mt-1.5 block">
                    {data.selectedResult.result.status === 'Pass' || data.selectedResult.result.result_status === 'passed' || Number(data.selectedResult.result.gpa) >= 2 ? (
                      <span className="inline-flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                        PASSED
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-xs font-semibold text-rose-600 dark:text-rose-400 border border-rose-500/20 bg-rose-500/10 px-2.5 py-0.5 rounded-full">
                        FAILED
                      </span>
                    )}
                  </span>
                </div>
              </div>
            )}

            {/* Subject Marks Breakdown Table */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs border border-slate-200/80 dark:border-slate-800/80 rounded-3xl shadow-xs overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-lg font-normal text-slate-900 dark:text-white">
                    Individual Subject Performance
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Official score breakdown for {data.selectedResult?.exam?.name || 'Selected Term Exam'}
                  </p>
                </div>
                {data.selectedResult?.marks && (
                  <span className="text-xs font-mono text-slate-400">
                    {data.selectedResult.marks.length} Subjects Evaluated
                  </span>
                )}
              </div>

              {!data.selectedResult?.marks || data.selectedResult.marks.length === 0 ? (
                <div className="p-8 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  No individual subject scores recorded for this evaluation.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                        <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[11px]">Subject</th>
                        <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[11px] text-center">Code</th>
                        <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Full Marks</th>
                        <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Marks Obtained</th>
                        <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[11px] text-center">Grade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                      {data.selectedResult.marks.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-white">{m.subject_name}</td>
                          <td className="px-5 py-3.5 text-center text-slate-500 dark:text-slate-400 font-mono">{m.subject_code || '—'}</td>
                          <td className="px-5 py-3.5 text-right font-mono">{parseFloat(m.total_marks || m.full_marks || 100).toFixed(0)}</td>
                          <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">{parseFloat(m.marks_obtained || 0).toFixed(2)}</td>
                          <td className="px-5 py-3.5 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              (m.letter_grade || m.grade_name) === 'F' 
                                ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20' 
                                : 'bg-primary/10 text-primary border border-primary/20'
                            }`}>
                              {m.letter_grade || m.grade_name || 'F'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        ) : hasSearched ? (
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs border border-slate-200/80 dark:border-slate-800/80 p-12 rounded-3xl text-center shadow-xs space-y-2">
            <h3 className="font-serif text-lg text-slate-900 dark:text-white">No Published Examination Records</h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto font-light">
              No examination marks have been published for registration number &quot;{regNo}&quot;.
            </p>
          </div>
        ) : null}

      </div>
    </div>
  );
}

export default function AcademicResultsPage() {
  return (
    <Suspense fallback={<div className="p-16 text-center text-xs text-slate-400">Loading Academic Results...</div>}>
      <AcademicResultsContent />
    </Suspense>
  );
}
