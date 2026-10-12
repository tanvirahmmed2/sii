'use client';

import React, { useEffect, useState } from 'react';
import { 
  FiAward, FiBook, FiInfo, FiPrinter, FiCheckCircle, 
  FiXCircle, FiTrendingUp, FiStar, FiCalendar, FiFileText 
} from 'react-icons/fi';
import { printSingleMarkSheet } from 'src/lib/receipts/singleMarkSheet';

const ResultsPage = () => {
  const [data, setData] = useState({ results: [], marks: [], student: {} });
  const [loading, setLoading] = useState(true);
  const [selectedExamId, setSelectedExamId] = useState(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await fetch('/api/student/results');
        if (res.ok) {
          const resData = await res.json();
          const payload = resData.payload || resData.paylod || {};
          setData(payload);
          if (payload.results && payload.results.length > 0) {
            setSelectedExamId(payload.results[0].exam_id);
          }
        }
      } catch (error) {
        console.error('Error fetching results:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-400">Loading your academic results...</p>
      </div>
    );
  }

  const { results = [], marks = [], student = {} } = data || {};

  const currentResult = results.find((r) => r.exam_id === selectedExamId) || results[0];
  const filteredMarks = marks.filter((m) => m.exam_id === selectedExamId);

  // Compute stats for current result
  const totalFullMarks = filteredMarks.reduce((acc, m) => acc + (parseFloat(m.full_marks || m.total_marks || 100)), 0);
  const totalObtainedMarks = filteredMarks.reduce((acc, m) => acc + (parseFloat(m.marks_obtained || 0)), 0);
  const overallPercentage = totalFullMarks > 0 ? Math.round((totalObtainedMarks / totalFullMarks) * 100) : 0;

  const currentGpa = currentResult?.gpa ? Number(currentResult.gpa).toFixed(2) : '0.00';
  const currentGrade = currentResult?.grade_name || currentResult?.grade || (Number(currentGpa) >= 4 ? 'A+' : Number(currentGpa) >= 3 ? 'A' : 'B');
  const currentStatus = (currentResult?.result_status || (Number(currentGpa) >= 2.0 ? 'PASS' : 'FAIL')).toUpperCase();
  const isPassed = currentStatus === 'PASS';

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-12 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/70 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-wider mb-1">
            <FiAward /> Academic Evaluation & Marksheets
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">My Exam Results & Marks</h1>
          <p className="text-slate-500 text-xs sm:text-sm font-normal mt-0.5">
            Access certified term marksheets, subject scores, GPA calculations, and generate printable academic transcripts.
          </p>
        </div>

        {currentResult && (
          <button
            onClick={() => printSingleMarkSheet({
              student: student,
              exam: { name: currentResult.exam_name, term: currentResult.exam_term },
              result: { ...currentResult, gpa: currentGpa, status: currentStatus },
              marks: filteredMarks
            })}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer shrink-0"
          >
            <FiPrinter className="text-sm" /> Print Official Marksheet
          </button>
        )}
      </div>

      {results.length === 0 ? (
        <div className="bg-white border border-slate-200/70 rounded-3xl p-12 text-center flex flex-col items-center justify-center shadow-xs">
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 mb-3">
            <FiInfo className="text-3xl" />
          </div>
          <h3 className="font-bold text-slate-800 text-base mb-1">No Published Results Found</h3>
          <p className="text-slate-400 text-xs max-w-xs">
            There are no compiled examination results published by the administration for your account yet.
          </p>
        </div>
      ) : (
        <>
          {/* Term Selector Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {results.map((res) => {
              const isActive = selectedExamId === res.exam_id;
              return (
                <button
                  key={res.exam_id}
                  onClick={() => setSelectedExamId(res.exam_id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-emerald-700 text-white shadow-sm shadow-emerald-700/20 font-bold'
                      : 'bg-white border border-slate-200/70 text-slate-700 hover:border-emerald-300'
                  }`}
                >
                  <span>{res.exam_name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-emerald-700'
                  }`}>
                    GPA {Number(res.gpa || 0).toFixed(2)}
                  </span>
                </button>
              );
            })}
          </div>

          {currentResult && (
            <>
              {/* Performance KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-xs flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Grade Point Average</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-emerald-700 font-mono">{currentGpa}</span>
                    <span className="text-xs font-semibold text-slate-400">/ 5.00</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-2 font-medium">Evaluated Term GPA</span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-xs flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Letter Grade</span>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-black text-blue-600 font-mono">{currentGrade}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-2 font-medium">Overall Academic Standing</span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-xs flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Merit Rank</span>
                  <div className="flex items-center gap-1.5">
                    <FiTrendingUp className="text-amber-500 text-xl" />
                    <span className="text-2xl font-black text-slate-800 font-mono">
                      {currentResult.merit_rank ? `#${currentResult.merit_rank}` : 'Top Tier'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-2 font-medium">Class Section Position</span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-xs flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Total Score</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-slate-800 font-mono">{totalObtainedMarks || currentResult.obtained_marks || 0}</span>
                    <span className="text-xs text-slate-400">/ {totalFullMarks || currentResult.total_marks || 100}</span>
                  </div>
                  <span className="text-[10px] text-emerald-600 mt-2 font-semibold">{overallPercentage}% Aggregate Score</span>
                </div>

                <div className="col-span-2 sm:col-span-1 bg-white p-5 rounded-2xl border border-slate-200/70 shadow-xs flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Result Status</span>
                  <div>
                    {isPassed ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold">
                        <FiCheckCircle className="text-emerald-600" /> PASSED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-xs font-bold">
                        <FiXCircle className="text-rose-600" /> FAILED
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-2 font-medium">
                    {currentResult.published_at ? new Date(currentResult.published_at).toLocaleDateString('en-GB') : 'Official result'}
                  </span>
                </div>
              </div>

              {/* Subject Breakdown Table */}
              <div className="bg-white border border-slate-200/70 rounded-3xl p-6 sm:p-8 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <FiBook className="text-emerald-600" /> Subject-wise Performance Breakdown
                    </h2>
                    <p className="text-xs text-slate-400 font-medium">
                      Marks obtained, grade point conversion, and pass criteria for {currentResult.exam_name}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full self-start sm:self-auto">
                    Total Subjects: {filteredMarks.length}
                  </span>
                </div>

                {filteredMarks.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 font-medium text-xs border border-dashed border-slate-200 rounded-2xl">
                    No detailed subject marks recorded yet for this examination term.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                          <th className="py-3 px-4 rounded-l-xl">SL</th>
                          <th className="py-3 px-4">Subject Name</th>
                          <th className="py-3 px-4 text-center">Full Marks</th>
                          <th className="py-3 px-4 text-center">Pass Marks</th>
                          <th className="py-3 px-4 text-center">Obtained Marks</th>
                          <th className="py-3 px-4 text-center">Percentage</th>
                          <th className="py-3 px-4 text-center">Grade Point</th>
                          <th className="py-3 px-4 text-center">Letter Grade</th>
                          <th className="py-3 px-4 text-center">Status</th>
                          <th className="py-3 px-4 rounded-r-xl">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {filteredMarks.map((mark, idx) => {
                          const obtained = parseFloat(mark.marks_obtained || 0);
                          const full = parseFloat(mark.full_marks || mark.total_marks || 100);
                          const pass = parseFloat(mark.pass_marks || 40);
                          const pct = full > 0 ? Math.round((obtained / full) * 100) : 0;
                          const isSubjectPass = !mark.is_absent && obtained >= pass;

                          return (
                            <tr key={mark.id || idx} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                                {idx + 1}
                              </td>
                              <td className="py-3.5 px-4">
                                <p className="font-bold text-slate-800">{mark.subject_name}</p>
                                {mark.subject_code && (
                                  <span className="text-[10px] text-slate-400 font-mono">Code: {mark.subject_code}</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-center font-medium text-slate-500">
                                {full}
                              </td>
                              <td className="py-3.5 px-4 text-center font-medium text-slate-400">
                                {pass}
                              </td>
                              <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                                {mark.is_absent ? (
                                  <span className="text-rose-500 font-semibold text-xs">ABSENT</span>
                                ) : (
                                  obtained
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span className="font-semibold text-xs text-slate-600 font-mono">
                                  {pct}%
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center font-bold text-slate-700 font-mono">
                                {mark.grade_point ? Number(mark.grade_point).toFixed(1) : (pct >= 80 ? '5.0' : pct >= 70 ? '4.0' : pct >= 60 ? '3.5' : pct >= 50 ? '3.0' : pct >= 40 ? '2.0' : '0.0')}
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold text-xs ${
                                  isSubjectPass
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}>
                                  {mark.grade_name || mark.letter_grade || (pct >= 80 ? 'A+' : pct >= 70 ? 'A' : pct >= 60 ? 'A-' : pct >= 50 ? 'B' : pct >= 40 ? 'C' : 'F')}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                {isSubjectPass ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Pass
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                    Fail
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-xs text-slate-400">
                                {mark.remarks || '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Term-wise Comparative Table */}
              {results.length > 1 && (
                <div className="bg-white border border-slate-200/70 rounded-3xl p-6 sm:p-8 shadow-xs">
                  <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <FiTrendingUp className="text-emerald-600" /> Historical Term Performance Comparison
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead>
                        <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="py-3 px-4">Exam Term</th>
                          <th className="py-3 px-4 text-center">GPA</th>
                          <th className="py-3 px-4 text-center">Grade</th>
                          <th className="py-3 px-4 text-center">Merit Rank</th>
                          <th className="py-3 px-4 text-center">Result Status</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {results.map((r) => {
                          const isRowPass = (r.result_status || 'pass').toLowerCase() === 'pass';
                          return (
                            <tr key={r.exam_id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-3.5 px-4 font-bold text-slate-800">
                                {r.exam_name}
                                <span className="block text-xs font-normal text-slate-400">Term: {r.exam_term}</span>
                              </td>
                              <td className="py-3.5 px-4 text-center font-bold text-emerald-700 font-mono">
                                {Number(r.gpa || 0).toFixed(2)}
                              </td>
                              <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                                {r.grade_name || r.grade || '—'}
                              </td>
                              <td className="py-3.5 px-4 text-center font-mono text-slate-600">
                                {r.merit_rank ? `#${r.merit_rank}` : '—'}
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                  isRowPass
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}>
                                  {isRowPass ? 'Passed' : 'Failed'}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <button
                                  onClick={() => setSelectedExamId(r.exam_id)}
                                  className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                                >
                                  View Breakdown
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default ResultsPage;
