'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FiSearch, FiAward, FiPrinter, FiCheckCircle, FiXCircle, FiBookOpen, FiUser, FiInfo, FiCalendar, FiFileText } from 'react-icons/fi';
import { printSingleMarkSheet } from '@/lib/receipts/singleMarkSheet';

const ResultsPortalPage = () => {
  const [regNo, setRegNo] = useState('');
  const [selectedExamId, setSelectedExamId] = useState('');
  const [publishedExams, setPublishedExams] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Load published exams list on mount
  useEffect(() => {
    const loadExams = async () => {
      try {
        const res = await fetch('/api/public/results');
        const resData = await res.json();
        if (res.ok && resData.success && resData.paylod?.publishedExams) {
          setPublishedExams(resData.paylod.publishedExams);
          if (resData.paylod.publishedExams.length > 0) {
            setSelectedExamId(resData.paylod.publishedExams[0].id.toString());
          }
        }
      } catch (err) {
        console.error('Error loading published exams:', err);
      }
    };
    loadExams();
  }, []);

  const fetchResults = async (targetRegNo, targetExamId = '') => {
    if (!targetRegNo.trim()) {
      toast.error('Please enter a student registration number.');
      return;
    }

    setLoading(true);
    setHasSearched(true);
    try {
      const examToUse = targetExamId || selectedExamId;
      let url = `/api/public/results?reg_no=${encodeURIComponent(targetRegNo.trim())}`;
      if (examToUse) {
        url += `&exam_id=${examToUse}`;
      }

      const res = await fetch(url);
      const resData = await res.json();

      if (res.ok && resData.success) {
        setData(resData.paylod);
        if (resData.paylod?.publishedExams) {
          setPublishedExams(resData.paylod.publishedExams);
        }
        if (resData.paylod?.selectedResult?.exam?.id) {
          setSelectedExamId(resData.paylod.selectedResult.exam.id.toString());
        }
      } else {
        setData(null);
        toast.error(resData.error || resData.message || 'Result not found for this registration number.');
      }
    } catch (err) {
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
    <div className="w-full min-h-[75vh] py-12 px-4 md:px-8  flex flex-col gap-8 animate-fade-up">
      {/* Header Title */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary-light text-secondary mb-3">
          <FiAward className="text-2xl" />
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 tracking-tight">
          Public Academic Results Inquiry
        </h1>
        <p className="text-xs md:text-sm text-slate-500 mt-1 max-w-lg mx-auto">
          Verify term examination results, GPA letter grades, and download official academic transcripts.
        </p>
      </div>

      {/* Inquiry Form Card */}
      <div className="w-full  mx-auto bg-white border border-slate-100 p-6 md:p-8 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.02)] flex flex-col gap-5">
        <form onSubmit={handleSearchSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Registration Number Field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <FiUser className="text-primary" /> Registration Number *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. 2026-6001"
                  value={regNo}
                  onChange={(e) => setRegNo(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:border-primary transition-all"
                />
              </div>
            </div>

            {/* Exam Selector Dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <FiCalendar className="text-primary" /> Term Examination
              </label>
              <select
                value={selectedExamId}
                onChange={handleExamChange}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-primary transition-all cursor-pointer"
              >
                {publishedExams.length === 0 ? (
                  <option value="">-- No Published Exams --</option>
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-primary hover:bg-primary-dark text-white rounded-2xl text-xs font-bold shadow-md shadow-sky-500/10 hover:shadow-sky-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 mt-1"
          >
            <FiSearch className="text-sm" />
            {loading ? 'Fetching Examination Results...' : 'Search Official Result'}
          </button>
        </form>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="w-full py-16 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-semibold text-slate-400">Compiling student academic record...</span>
        </div>
      ) : data?.selectedResult ? (
        <div className="flex flex-col gap-6 animate-fade-up">
          
          {/* Student Profile Card */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-[0_10px_30px_rgba(0,0,0,0.01)] flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary-light text-primary rounded-2xl flex items-center justify-center font-bold text-xl border border-primary-light shrink-0">
                {data.student.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">{data.student.name}</h2>
                <p className="text-xs font-semibold text-slate-400 mt-1">
                  Reg No: <strong className="text-slate-700">{data.student.registration_number}</strong> &bull; Class: <strong className="text-slate-700">{data.student.class_name}</strong> {data.student.section_name ? `(${data.student.section_name})` : ''} &bull; Roll: <strong className="text-slate-700">{data.student.roll || 'N/A'}</strong>
                </p>
              </div>
            </div>

            <button
              onClick={() => printSingleMarkSheet({
                student: data.student,
                exam: data.selectedResult.exam,
                result: data.selectedResult.result,
                marks: data.selectedResult.marks
              })}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold shadow-md transition-all cursor-pointer shrink-0"
            >
              <FiPrinter className="text-sm" /> Print Official Mark Sheet
            </button>
          </div>

          {/* Performance Summary Metrics */}
          {data.selectedResult.result && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Marks</span>
                <span className="text-2xl font-bold text-slate-900 mt-1">
                  {data.selectedResult.result.total_marks || 0}
                </span>
              </div>

              <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">GPA Point</span>
                <span className="text-2xl font-bold text-primary mt-1">
                  {Number(data.selectedResult.result.gpa || 0).toFixed(2)}
                </span>
              </div>

              <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Overall Grade</span>
                <span className="text-2xl font-bold text-slate-900 mt-1">
                  {data.selectedResult.result.grade || 'F'}
                </span>
              </div>

              <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Merit Rank</span>
                <span className="text-2xl font-bold text-indigo-600 mt-1">
                  {data.selectedResult.result.status === 'Pass' && data.selectedResult.result.grade !== 'F' && data.selectedResult.result.merit_rank
                    ? data.selectedResult.result.merit_rank
                    : '-'}
                </span>
              </div>

              <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Result Status</span>
                <span className="mt-1">
                  {data.selectedResult.result.status === 'Pass' || Number(data.selectedResult.result.gpa) >= 2 ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-xs font-bold">
                      <FiCheckCircle /> PASSED
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-600 border border-rose-100 rounded-full text-xs font-bold">
                      <FiXCircle /> FAILED
                    </span>
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Subject Marks Table */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-[0_10px_30px_rgba(0,0,0,0.01)]">
            <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
              <FiBookOpen className="text-primary" /> Subject-Wise Score Breakdown
            </h3>

            {data.selectedResult.marks.length === 0 ? (
              <p className="text-slate-400 text-xs font-semibold text-center py-6">No subject mark records available.</p>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest">Subject Name</th>
                      <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Code</th>
                      <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Full Marks</th>
                      <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Marks Obtained</th>
                      <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {data.selectedResult.marks.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3.5 font-bold text-slate-800">{m.subject_name}</td>
                        <td className="px-5 py-3.5 text-xs font-bold text-slate-400 text-center">{m.subject_code || 'N/A'}</td>
                        <td className="px-5 py-3.5 text-xs font-semibold text-slate-600 text-right">{parseFloat(m.total_marks || 100).toFixed(0)}</td>
                        <td className="px-5 py-3.5 font-semibold text-slate-900 text-right">{parseFloat(m.marks_obtained || 0).toFixed(2)}</td>
                        <td className="px-5 py-3.5 text-center">
                          <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold ${m.letter_grade === 'F' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                            {m.letter_grade || 'F'}
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
        <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-3">
          <FiInfo className="text-4xl text-slate-300" />
          <h3 className="text-base font-bold text-slate-800">No Published Results Found</h3>
          <p className="text-xs text-slate-400 max-w-sm">No published examination results are available for this registration number.</p>
        </div>
      ) : null}
    </div>
  );
};

export default ResultsPortalPage;
