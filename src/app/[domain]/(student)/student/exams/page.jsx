'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FiCalendar,
  FiClock,
  FiAward,
  FiCheckCircle,
  FiAlertCircle,
  FiDollarSign,
  FiFileText,
  FiInfo,
  FiArrowRight,
  FiCheck
} from 'react-icons/fi';

export default function StudentExamsPage() {
  const [exams, setExams] = useState([]);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applyingExamId, setApplyingExamId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const fetchStudentExams = async () => {
    try {
      const res = await fetch('/api/student/exams');
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
  }, []);

  const handleApply = async (examId) => {
    setApplyingExamId(examId);
    setFeedback(null);
    try {
      const res = await fetch('/api/student/exams/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exam_id: examId })
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        setFeedback({
          type: 'error',
          examId,
          text: resData.error || 'Failed to apply for examination.'
        });
      } else {
        setFeedback({
          type: 'success',
          examId,
          text: resData.message || 'Application submitted successfully! Your exam fee is pending.'
        });
        await fetchStudentExams();
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        examId,
        text: 'Network connection error while submitting application.'
      });
    } finally {
      setApplyingExamId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-400">Loading your examination portal...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <FiAward /> Academic Examination Hub
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Available Class Examinations
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-normal mt-0.5">
            {student?.class_name ? `Exams scheduled for ${student.class_name}` : 'Your class exams'}.
            Apply online for scheduled term exams and track pending registration fees.
          </p>
        </div>

        {student && (
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/80 px-4 py-2.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <div className="text-right">
              <div className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                Roll: {student.roll_no || 'N/A'}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                Reg: {student.registration_no || 'N/A'}
              </div>
            </div>
            <div className="h-7 w-px bg-slate-200 dark:bg-slate-700"></div>
            <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {student.class_name}
            </div>
          </div>
        )}
      </div>

      {feedback && (
        <div className={`p-4 rounded-2xl text-xs sm:text-sm font-medium flex items-center justify-between gap-3 shadow-xs animate-in fade-in ${
          feedback.type === 'error'
            ? 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
            : 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'error' ? <FiAlertCircle className="text-lg shrink-0" /> : <FiCheckCircle className="text-lg shrink-0" />}
            <span>{feedback.text}</span>
          </div>
          {feedback.type === 'success' && (
            <Link
              href="/student/fees"
              className="inline-flex items-center gap-1 font-bold underline hover:opacity-80 shrink-0"
            >
              View Fee Ledger <FiArrowRight />
            </Link>
          )}
        </div>
      )}

      {/* Examinations List */}
      {exams.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-12 text-center flex flex-col items-center justify-center shadow-xs">
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400 mb-3">
            <FiInfo className="text-3xl" />
          </div>
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base mb-1">
            No Active Exams Scheduled
          </h3>
          <p className="text-slate-400 text-xs max-w-sm">
            There are currently no examinations scheduled or published for your assigned class.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {exams.map((exam) => {
            const hasApplied = Boolean(exam.candidate_id);
            const isApplying = applyingExamId === exam.id;
            const feeAmount = parseFloat(exam.exam_fee_amount || 0);

            return (
              <div
                key={exam.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition flex flex-col justify-between gap-6"
              >
                {/* Top Section */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        Term: {exam.term}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        exam.status === 'current'
                          ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400'
                          : exam.status === 'upcoming'
                          ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
                      }`}>
                        {exam.status}
                      </span>
                      {hasApplied && (
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          exam.candidate_status === 'admit_issued'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400'
                            : exam.candidate_status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400'
                        }`}>
                          Application: {exam.candidate_status.replace('_', ' ')}
                        </span>
                      )}
                    </div>

                    <h2 className="text-xl font-bold text-slate-900 dark:text-white pt-1">
                      {exam.name}
                    </h2>

                    {exam.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
                        {exam.description}
                      </p>
                    )}
                  </div>

                  {/* Fee Info Badge */}
                  <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 flex flex-col items-end shrink-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Exam Fee
                    </span>
                    <span className="text-xl font-bold text-slate-900 dark:text-white font-mono mt-0.5">
                      ৳{feeAmount.toFixed(2)}
                    </span>
                    {hasApplied && (
                      <div className="mt-1">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                          exam.payment_status === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400'
                        }`}>
                          {exam.payment_status === 'paid' ? <FiCheck /> : <FiClock />} Fee {exam.payment_status}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 py-3 border-y border-slate-100 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                      Exam Timeline
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                      {exam.start_date ? new Date(exam.start_date).toLocaleDateString() : 'TBA'} — {exam.end_date ? new Date(exam.end_date).toLocaleDateString() : 'TBA'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                      Application Deadline
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                      {exam.application_end_date ? new Date(exam.application_end_date).toLocaleDateString() : 'Open until exam starts'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                      Target Class & Session
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {exam.class_name} ({exam.session_name || 'Standard'})
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                      Admit Card
                    </span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {exam.admit_card_number || (hasApplied ? 'Pending Issue' : 'Apply to obtain')}
                    </span>
                  </div>
                </div>

                {/* Action Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div>
                    {hasApplied ? (
                      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <FiCheckCircle className="text-base" />
                        <span>You are registered as a candidate for this examination.</span>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">
                        Click below to submit your exam registration. Your examination fee will be logged as pending.
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {hasApplied ? (
                      <>
                        <Link
                          href="/student/fees"
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition cursor-pointer"
                        >
                          <FiDollarSign /> View Fee & Pay
                        </Link>
                        {exam.admit_card_number && (
                          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white shadow-xs">
                            <FiFileText /> Admit Card #{exam.admit_card_number}
                          </span>
                        )}
                      </>
                    ) : (
                      <button
                        onClick={() => handleApply(exam.id)}
                        disabled={isApplying}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isApplying ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Submitting Application...</span>
                          </>
                        ) : (
                          <>
                            <FiCheckCircle className="text-sm" /> Apply for Exam
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
