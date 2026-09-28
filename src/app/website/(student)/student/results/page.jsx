'use client';

import React, { useEffect, useState } from 'react';
import { FiAward, FiBook, FiInfo, FiPrinter, FiCheckCircle } from 'react-icons/fi';
import { printSingleMarkSheet } from '@/lib/receipts/singleMarkSheet';

const ResultsPage = () => {
  const [data, setData] = useState({ results: [], marks: [] });
  const [loading, setLoading] = useState(true);
  const [selectedExamId, setSelectedExamId] = useState(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await fetch('/api/student/results');
        if (res.ok) {
          const resData = await res.json();
          if (resData.paylod) {
            setData(resData.paylod);
            if (resData.paylod.results && resData.paylod.results.length > 0) {
              setSelectedExamId(resData.paylod.results[0].exam_id);
            }
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
        <p className="text-sm font-medium text-slate-400">Loading your exam results...</p>
      </div>
    );
  }

  const { results = [], marks = [] } = data || {};

  const currentResult = results.find((r) => r.exam_id === selectedExamId);
  const filteredMarks = marks.filter((m) => m.exam_id === selectedExamId);

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/70 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-wider mb-1">
            <FiAward /> Academic Performance
          </div>
          <h1 className="text-2xl font-bold text-slate-800">My Marks & Report Cards</h1>
          <p className="text-slate-500 text-xs sm:text-sm font-normal mt-0.5">
            View term GPAs, subject score breakdowns, letter grades, and print official report cards.
          </p>
        </div>
      </div>

      {results.length === 0 ? (
        <div className="bg-white border border-slate-200/70 rounded-3xl p-12 text-center flex flex-col items-center justify-center shadow-xs">
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 mb-3">
            <FiInfo className="text-3xl" />
          </div>
          <h3 className="font-bold text-slate-800 text-base mb-1">No Results Published</h3>
          <p className="text-slate-400 text-xs max-w-xs">There are no compiled exam results published by administration yet.</p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Exam Selection Sidebar */}
          <div className="lg:w-1/3 flex flex-col gap-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
              Published Exam Terms
            </span>
            <div className="flex flex-col gap-2">
              {results.map((res) => {
                const isActive = selectedExamId === res.exam_id;
                return (
                  <button
                    key={res.exam_id}
                    onClick={() => setSelectedExamId(res.exam_id)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all duration-150 cursor-pointer flex items-center justify-between ${
                      isActive
                        ? 'bg-emerald-700 border-emerald-700 text-white shadow-sm shadow-emerald-700/20 font-semibold'
                        : 'bg-white border-slate-200/70 text-slate-700 hover:border-emerald-300'
                    }`}
                  >
                    <div>
                      <h3 className="font-bold text-sm mb-0.5">{res.exam_name}</h3>
                      <p className={`text-xs ${isActive ? 'text-emerald-100' : 'text-slate-400'}`}>
                        Term: {res.exam_term || 'Final'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-bold block ${isActive ? 'text-white' : 'text-emerald-600'}`}>
                        GPA {res.gpa}
                      </span>
                      <span className={`text-[10px] font-semibold ${isActive ? 'text-emerald-200' : 'text-slate-400'}`}>
                        Grade {res.grade}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Exam Marks Detailed Card */}
          <div className="lg:w-2/3 flex flex-col gap-6">
            {currentResult && (
              <>
                {/* Result summary banner */}
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                      Term Overview
                    </span>
                    <h2 className="text-lg font-bold text-white">{currentResult.exam_name}</h2>
                    <p className="text-xs text-slate-300">Term: {currentResult.exam_term}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/15 text-center">
                      <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider block">GPA</span>
                      <span className="text-xl font-bold text-emerald-400">{currentResult.gpa}</span>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/15 text-center">
                      <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider block">Grade</span>
                      <span className="text-xl font-bold text-blue-400">{currentResult.grade}</span>
                    </div>
                    <button
                      onClick={() => printSingleMarkSheet({
                        student: data.student || {},
                        exam: { name: currentResult.exam_name, term: currentResult.exam_term },
                        result: currentResult,
                        marks: filteredMarks
                      })}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0"
                    >
                      <FiPrinter className="text-sm" /> Print Mark Sheet
                    </button>
                  </div>
                </div>

                {/* Marks breakdown table */}
                <div className="bg-white border border-slate-200/70 rounded-3xl p-6 sm:p-8 shadow-xs">
                  <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <FiBook className="text-emerald-600" /> Subject-wise Score Breakdown
                  </h3>

                  {filteredMarks.length === 0 ? (
                    <p className="text-slate-400 text-xs font-medium text-center py-8">No marks breakdown recorded for this exam.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[500px]">
                        <thead>
                          <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            <th className="py-3 px-4">Subject</th>
                            <th className="py-3 px-4 text-center">Obtained Marks</th>
                            <th className="py-3 px-4 text-center">Total Marks</th>
                            <th className="py-3 px-4 text-center">Percentage</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                          {filteredMarks.map((mark) => {
                            const percent = Math.round((parseFloat(mark.marks_obtained) / parseFloat(mark.total_marks)) * 100);
                            return (
                              <tr key={mark.id} className="hover:bg-slate-50/60 transition-colors">
                                <td className="py-3.5 px-4">
                                  <p className="font-bold text-slate-800">{mark.subject_name}</p>
                                  {mark.subject_code && (
                                    <span className="text-[10px] text-slate-400 font-mono">Code: {mark.subject_code}</span>
                                  )}
                                </td>
                                <td className="py-3.5 px-4 font-bold text-slate-800 text-center">
                                  {mark.marks_obtained}
                                </td>
                                <td className="py-3.5 px-4 font-medium text-slate-400 text-center">
                                  {mark.total_marks}
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                  <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                    percent >= 40 
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                      : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                                  }`}>
                                    {percent}%
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsPage;
