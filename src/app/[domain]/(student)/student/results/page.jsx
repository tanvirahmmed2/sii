'use client';

import React, { useEffect, useState } from 'react';
import TenantLoader from 'src/component/tenant/TenantLoader';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import { printSingleMarkSheet } from 'src/lib/receipts/singleMarkSheet';

const ResultsPage = () => {
  const { getApiEndpoint } = useTenantWebsite();
  const [data, setData] = useState({ results: [], marks: [], student: {} });
  const [loading, setLoading] = useState(true);
  const [selectedExamId, setSelectedExamId] = useState(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await fetch(getApiEndpoint('student/results'));
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
  }, [getApiEndpoint]);

  if (loading) {
    return <TenantLoader fullScreen={false} />;
  }

  const { results = [], marks = [], student = {} } = data || {};

  const currentResult = results.find((r) => r.exam_id === selectedExamId) || results[0];
  const filteredMarks = marks.filter((m) => m.exam_id === selectedExamId);

  const totalFullMarks = filteredMarks.reduce((acc, m) => acc + (parseFloat(m.full_marks || m.total_marks || 100)), 0);
  const totalObtainedMarks = filteredMarks.reduce((acc, m) => acc + (parseFloat(m.marks_obtained || 0)), 0);
  const overallPercentage = totalFullMarks > 0 ? Math.round((totalObtainedMarks / totalFullMarks) * 100) : 0;

  const currentGpa = currentResult?.gpa ? Number(currentResult.gpa).toFixed(2) : '0.00';
  const currentGrade = currentResult?.grade_name || currentResult?.grade || (Number(currentGpa) >= 4 ? 'A+' : Number(currentGpa) >= 3 ? 'A' : 'B');
  const currentStatus = (currentResult?.result_status || (Number(currentGpa) >= 2.0 ? 'PASS' : 'FAIL')).toUpperCase();
  const isPassed = currentStatus === 'PASS';

  return (
    <div className="w-full space-y-4 pb-8">
      {/* Header */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 gap-2">
        <div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-white">
            Academic Examination Results &amp; Marksheets
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Review certified marks, GPA averages, merit ranks, and print official term transcripts.
          </p>
        </div>

        {currentResult && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                printSingleMarkSheet({
                  student: student,
                  exam: { name: currentResult.exam_name, term: currentResult.exam_term },
                  result: { ...currentResult, gpa: currentGpa, status: currentStatus },
                  marks: filteredMarks,
                })
              }
              className="px-3.5 py-1.5 rounded-md bg-primary hover:bg-primary-dark text-white text-xs font-medium cursor-pointer shadow-xs transition"
            >
              Print Marksheet
            </button>
          </div>
        )}
      </div>

      {results.length === 0 ? (
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-8 text-center space-y-1">
          <p className="text-xs font-medium text-slate-700 dark:text-slate-300">No Published Results Found</p>
          <p className="text-xs text-slate-400">
            There are no compiled examination results published for your account yet.
          </p>
        </div>
      ) : (
        <>
          {/* Term Selector Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {results.map((res) => {
              const isSelected = selectedExamId === res.exam_id;
              return (
                <button
                  key={res.exam_id}
                  type="button"
                  onClick={() => setSelectedExamId(res.exam_id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'bg-primary text-white shadow-xs'
                      : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {res.exam_name} {res.exam_term ? `(${res.exam_term})` : ''}
                </button>
              );
            })}
          </div>

          {/* Assessment Scorecards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 space-y-1">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Grade Point Average</span>
              <div className="text-xl font-semibold font-mono text-slate-900 dark:text-white">{currentGpa}</div>
              <p className="text-[11px] text-slate-400">Scale of 5.00</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 space-y-1">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Letter Grade</span>
              <div className="text-xl font-semibold font-mono text-primary">{currentGrade}</div>
              <p className="text-[11px] text-slate-400">Evaluation level</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 space-y-1">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Marks Scored</span>
              <div className="text-xl font-semibold font-mono text-slate-900 dark:text-white">
                {totalObtainedMarks} <span className="text-xs text-slate-400 font-normal">/ {totalFullMarks}</span>
              </div>
              <p className="text-[11px] text-slate-400">{overallPercentage}% overall score</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 space-y-1">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Assessment Status</span>
              <div className="pt-0.5">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    isPassed
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                      : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
                  }`}
                >
                  {currentStatus}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {currentResult?.merit_rank ? `Merit Rank: #${currentResult.merit_rank}` : 'Finalized'}
              </p>
            </div>
          </div>

          {/* Subject Marks Table */}
          <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 sm:p-5 space-y-3">
            <div className="pb-1 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Subject-Wise Score Breakdown
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Detailed marks and grade points obtained in {currentResult?.exam_name}.
              </p>
            </div>

            {filteredMarks.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded">
                Detailed subject marks have not been uploaded for this assessment yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50">
                      <th className="py-2.5 px-3 font-medium">SL</th>
                      <th className="py-2.5 px-3 font-medium">Subject Name</th>
                      <th className="py-2.5 px-3 font-medium">Subject Code</th>
                      <th className="py-2.5 px-3 font-medium">Full Marks</th>
                      <th className="py-2.5 px-3 font-medium">Pass Marks</th>
                      <th className="py-2.5 px-3 font-medium">Marks Scored</th>
                      <th className="py-2.5 px-3 font-medium">Letter Grade</th>
                      <th className="py-2.5 px-3 font-medium text-right">Grade Point</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredMarks.map((m, idx) => {
                      const obtained = parseFloat(m.marks_obtained || 0);
                      const pass = parseFloat(m.pass_marks || 33);
                      const isSubPassed = !m.is_absent && obtained >= pass;

                      return (
                        <tr key={m.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                            {m.subject_name}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                            {m.subject_code || '—'}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                            {m.full_marks || m.total_marks || 100}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                            {pass}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-medium text-slate-900 dark:text-white">
                            {m.is_absent ? (
                              <span className="text-rose-600 font-semibold">Absent</span>
                            ) : (
                              <span className={isSubPassed ? 'text-slate-900 dark:text-white' : 'text-rose-600 font-semibold'}>
                                {obtained}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                                isSubPassed
                                  ? 'bg-primary/10 text-primary border border-primary/20'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
                              }`}
                            >
                              {m.letter_grade || m.grade_name || m.grade || (isSubPassed ? 'Pass' : 'F')}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-900 dark:text-white">
                            {m.grade_point ? Number(m.grade_point).toFixed(2) : (isSubPassed ? '3.00' : '0.00')}
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
  );
};

export default ResultsPage;
