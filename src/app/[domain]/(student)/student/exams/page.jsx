'use client';

import React, { useEffect, useState } from 'react';
import TenantLoader from 'src/component/tenant/TenantLoader';
import Link from 'next/link';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

export default function StudentExamsPage() {
  const { getApiEndpoint, tenantUrl } = useTenantWebsite();
  const [exams, setExams] = useState([]);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applyingExamId, setApplyingExamId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const fetchStudentExams = async () => {
    try {
      const res = await fetch(getApiEndpoint('student/exams'));
      if (res.ok) {
        const data = await res.json();
        setExams(data.exams || []);
        setStudent(data.student || null);
      }
    } catch (error) {
      console.error('Error fetching student exams:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentExams();
  }, [getApiEndpoint]);

  const handleApply = async (examId) => {
    setApplyingExamId(examId);
    setFeedback(null);
    try {
      const res = await fetch(getApiEndpoint('student/exams/apply'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exam_id: examId }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        setFeedback({
          type: 'error',
          examId,
          text: resData.error || 'Failed to register for examination.',
        });
      } else {
        setFeedback({
          type: 'success',
          examId,
          text: resData.message || 'Registration submitted successfully! You may now pay the exam fee.',
        });
        await fetchStudentExams();
      }
    } catch {
      setFeedback({
        type: 'error',
        examId,
        text: 'Network connection error while submitting registration.',
      });
    } finally {
      setApplyingExamId(null);
    }
  };

  if (loading) {
    return <TenantLoader fullScreen={false} />;
  }

  return (
    <div className="w-full space-y-4 pb-8">
      {/* Header */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 gap-2">
        <div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-white">
            Available Class Examinations
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {student?.class_name ? `Exams scheduled for ${student.class_name}.` : 'Class examinations.'} Register for upcoming term assessments and check clearance status.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={tenantUrl('/student/cards')}
            className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium transition cursor-pointer"
          >
            Admit Cards Desk
          </Link>
          <Link
            href={tenantUrl('/student/fees')}
            className="px-3 py-1.5 rounded-md bg-primary hover:bg-primary-dark text-white text-xs font-medium transition cursor-pointer shadow-xs"
          >
            Pay Exam Fees
          </Link>
        </div>
      </div>

      {feedback && (
        <div
          className={`w-full px-3 py-2 rounded-md text-xs font-medium border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {exams.length === 0 ? (
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-8 text-center space-y-1">
          <p className="text-xs font-medium text-slate-700 dark:text-slate-300">No Examinations Scheduled</p>
          <p className="text-xs text-slate-400">
            There are currently no active or published examinations for your class.
          </p>
        </div>
      ) : (
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 sm:p-5 space-y-3">
          <div className="pb-1 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Scheduled Assessments Roster
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Review examination start dates, candidate status, and fee clearance.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50">
                  <th className="py-2.5 px-3 font-medium">Exam Name</th>
                  <th className="py-2.5 px-3 font-medium">Term</th>
                  <th className="py-2.5 px-3 font-medium">Start Date</th>
                  <th className="py-2.5 px-3 font-medium">End Date</th>
                  <th className="py-2.5 px-3 font-medium">Exam Fee</th>
                  <th className="py-2.5 px-3 font-medium text-center">Registration</th>
                  <th className="py-2.5 px-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {exams.map((exam) => {
                  const isRegistered = Boolean(exam.candidate_id);
                  const isFeePaid = (exam.payment_status || '').toLowerCase() === 'paid';
                  const feeAmount = parseFloat(exam.exam_fee_amount || 0);

                  return (
                    <tr key={exam.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                        {exam.name}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
                          {exam.term || 'Term Final'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {exam.start_date ? new Date(exam.start_date).toLocaleDateString('en-GB') : 'TBA'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {exam.end_date ? new Date(exam.end_date).toLocaleDateString('en-GB') : 'TBA'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-900 dark:text-white">
                        {feeAmount > 0 ? `৳${feeAmount.toFixed(2)}` : 'Free / Included'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {isRegistered ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                            Registered
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                            Not Registered
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!isRegistered ? (
                            <button
                              type="button"
                              disabled={applyingExamId === exam.id}
                              onClick={() => handleApply(exam.id)}
                              className="px-3 py-1 rounded-md bg-secondary hover:bg-secondary-dark text-white text-xs font-medium cursor-pointer shadow-xs transition disabled:opacity-50"
                            >
                              {applyingExamId === exam.id ? 'Registering...' : 'Register'}
                            </button>
                          ) : !isFeePaid && feeAmount > 0 ? (
                            <Link
                              href={tenantUrl('/student/fees')}
                              className="px-2.5 py-1 rounded border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 text-xs font-medium transition"
                            >
                              Pay Fee
                            </Link>
                          ) : (
                            <Link
                              href={tenantUrl('/student/cards')}
                              className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition"
                            >
                              Admit Card
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
