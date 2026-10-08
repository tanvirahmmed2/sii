'use client';

import React, { useState, useEffect, useContext } from 'react';
import { toast } from 'react-hot-toast';
import { printSingleMarkSheet } from 'src/lib/receipts/singleMarkSheet';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const ResultsPortalPage = () => {
  const { getApiEndpoint } = useContext(TenantWebsiteContext);
  const [regNo, setRegNo] = useState('');
  const [selectedExamId, setSelectedExamId] = useState('');
  const [publishedExams, setPublishedExams] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const loadExams = async () => {
      try {
        const res = await fetch(getApiEndpoint('public/results'));
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
      let url = `${getApiEndpoint('public/results')}?reg_no=${encodeURIComponent(targetRegNo.trim())}`;
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
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              Examination Registry
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            Academic Examination Results
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Verify term examination transcripts, overall grade point averages (GPA), and print official marks documentation.
          </p>
        </div>

        {/* Inquiry Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded shadow-xs">
          <form onSubmit={handleSearchSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Student Registration Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2026-6001"
                  value={regNo}
                  onChange={(e) => setRegNo(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Examination Term *
                </label>
                <select
                  value={selectedExamId}
                  onChange={handleExamChange}
                  className="w-full px-3 py-2 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-primary cursor-pointer"
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

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded text-xs font-medium transition-colors cursor-pointer disabled:opacity-60"
              >
                {loading ? 'Searching Records...' : 'Query Examination Record'}
              </button>
            </div>
          </form>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded text-center">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Compiling student evaluation record...
            </span>
          </div>
        ) : data?.selectedResult ? (
          <div className="space-y-6">
            
            {/* Student Info Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
              <div>
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                  Candidate Dossier
                </span>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {data.student.name}
                </h2>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400 mt-1">
                  <span>Reg: <strong className="text-slate-900 dark:text-slate-100 font-medium">{data.student.registration_number}</strong></span>
                  <span>Class: <strong className="text-slate-900 dark:text-slate-100 font-medium">{data.student.class_name}</strong> {data.student.section_name ? `(${data.student.section_name})` : ''}</span>
                  <span>Roll: <strong className="text-slate-900 dark:text-slate-100 font-medium">{data.student.roll || 'N/A'}</strong></span>
                </div>
              </div>

              <button
                onClick={() => printSingleMarkSheet({
                  student: data.student,
                  exam: data.selectedResult.exam,
                  result: data.selectedResult.result,
                  marks: data.selectedResult.marks
                })}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded text-xs font-medium transition-colors cursor-pointer shrink-0"
              >
                Print Official Marksheet
              </button>
            </div>

            {/* Performance Metric Strip */}
            {data.selectedResult.result && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded shadow-xs">
                  <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    Total Marks
                  </span>
                  <span className="text-xl font-semibold text-slate-900 dark:text-slate-100 mt-1 block">
                    {data.selectedResult.result.total_marks || 0}
                  </span>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded shadow-xs">
                  <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    GPA Score
                  </span>
                  <span className="text-xl font-semibold text-primary mt-1 block">
                    {Number(data.selectedResult.result.gpa || 0).toFixed(2)}
                  </span>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded shadow-xs">
                  <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    Letter Grade
                  </span>
                  <span className="text-xl font-semibold text-slate-900 dark:text-slate-100 mt-1 block">
                    {data.selectedResult.result.grade || 'F'}
                  </span>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded shadow-xs">
                  <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    Merit Position
                  </span>
                  <span className="text-xl font-semibold text-slate-900 dark:text-slate-100 mt-1 block">
                    {data.selectedResult.result.status === 'Pass' && data.selectedResult.result.grade !== 'F' && data.selectedResult.result.merit_rank
                      ? data.selectedResult.result.merit_rank
                      : '—'}
                  </span>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded shadow-xs col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    Result Status
                  </span>
                  <span className="mt-1 block">
                    {data.selectedResult.result.status === 'Pass' || Number(data.selectedResult.result.gpa) >= 2 ? (
                      <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded">
                        PASSED
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded">
                        FAILED
                      </span>
                    )}
                  </span>
                </div>
              </div>
            )}

            {/* Subject Marks Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Subject Performance Breakdown
                </h3>
              </div>

              {data.selectedResult.marks.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                  No individual subject scores recorded for this evaluation.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                        <th className="px-4 py-2.5 font-medium">Subject</th>
                        <th className="px-4 py-2.5 font-medium text-center">Code</th>
                        <th className="px-4 py-2.5 font-medium text-right">Full Marks</th>
                        <th className="px-4 py-2.5 font-medium text-right">Marks Obtained</th>
                        <th className="px-4 py-2.5 font-medium text-center">Grade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                      {data.selectedResult.marks.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-100">{m.subject_name}</td>
                          <td className="px-4 py-2.5 text-center text-slate-500 dark:text-slate-400">{m.subject_code || '—'}</td>
                          <td className="px-4 py-2.5 text-right">{parseFloat(m.total_marks || 100).toFixed(0)}</td>
                          <td className="px-4 py-2.5 text-right font-medium">{parseFloat(m.marks_obtained || 0).toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                              m.letter_grade === 'F' 
                                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800' 
                                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            }`}>
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
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded text-center">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No Published Examination Records</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              No examination marks have been published for registration number {regNo}.
            </p>
          </div>
        ) : null}

      </div>
    </div>
  );
};

export default ResultsPortalPage;
