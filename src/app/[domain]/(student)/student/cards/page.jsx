'use client';

import React, { useEffect, useState } from 'react';
import TenantLoader from 'src/component/tenant/TenantLoader';
import Link from 'next/link';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import { printAdmitCard } from 'src/lib/receipts/admit_card';

const StudentAdmitCardsPage = () => {
  const { getApiEndpoint, tenantUrl } = useTenantWebsite();
  const [student, setStudent] = useState(null);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedExamId, setExpandedExamId] = useState(null);

  useEffect(() => {
    const fetchAdmitCards = async () => {
      try {
        const res = await fetch(getApiEndpoint('student/admit-cards'));
        if (res.ok) {
          const data = await res.json();
          const payload = data.payload || data.paylod || {};
          setStudent(payload.student || null);
          setExams(payload.exams || []);
          if (payload.exams && payload.exams.length > 0) {
            setExpandedExamId(payload.exams[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching admit cards:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAdmitCards();
  }, [getApiEndpoint]);

  if (loading) {
    return <TenantLoader fullScreen={false} />;
  }

  return (
    <div className="w-full space-y-4 pb-8">
      {/* Header */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 gap-2">
        <div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-white">
            Examination Entry Permits &amp; Admit Cards
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Download certified examination passes, verify candidate eligibility, and view seated subject schedules.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={tenantUrl('/student/fees')}
            className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium transition cursor-pointer"
          >
            Check Fee Clearance
          </Link>
        </div>
      </div>

      {/* Candidate Banner */}
      {student && (
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{student.name}</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                Candidate Verified
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-mono">
              <span>Registration No: <strong className="text-slate-700 dark:text-slate-300">{student.registration_number}</strong></span>
              <span>Class: {student.class_name} {student.section_name ? `(${student.section_name})` : ''}</span>
              {student.roll && <span>Roll: #{student.roll}</span>}
            </div>
          </div>
        </div>
      )}

      {/* Permits Roster */}
      {exams.length === 0 ? (
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-8 text-center space-y-1">
          <p className="text-xs font-medium text-slate-700 dark:text-slate-300">No Examination Passes Found</p>
          <p className="text-xs text-slate-400">
            There are no active or published examination admit cards for your class at this time.
          </p>
        </div>
      ) : (
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 sm:p-5 space-y-4">
          <div className="pb-1 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Available Examination Entry Permits
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Official hall tickets with seated subject schedules.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50">
                  <th className="py-2.5 px-3 font-medium">Examination</th>
                  <th className="py-2.5 px-3 font-medium">Term</th>
                  <th className="py-2.5 px-3 font-medium">Timeline</th>
                  <th className="py-2.5 px-3 font-medium">Permit Number</th>
                  <th className="py-2.5 px-3 font-medium text-center">Status</th>
                  <th className="py-2.5 px-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {exams.map((exam) => {
                  const startStr = exam.start_date ? new Date(exam.start_date).toLocaleDateString('en-GB') : 'TBA';
                  const endStr = exam.end_date ? new Date(exam.end_date).toLocaleDateString('en-GB') : 'TBA';
                  const isProvided = exam.isProvided;
                  const isExpanded = expandedExamId === exam.id;

                  return (
                    <React.Fragment key={exam.id}>
                      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                          <div>{exam.name}</div>
                          <span className="text-[11px] text-slate-400 font-normal">
                            {exam.schedules?.length || 0} scheduled subjects
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
                            {exam.term || 'Term Final'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap font-mono text-[11px]">
                          {startStr} &ndash; {endStr}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                          {exam.admit_card_number}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {isProvided ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                              Issued &amp; Ready
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
                              Pending Clearance
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setExpandedExamId(isExpanded ? null : exam.id)}
                              className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium transition cursor-pointer"
                            >
                              {isExpanded ? 'Hide Routine' : 'View Routine'}
                            </button>
                            {isProvided ? (
                              <button
                                type="button"
                                onClick={() => printAdmitCard(exam, student, exam.schedules || [])}
                                className="px-3 py-1 rounded-md bg-primary hover:bg-primary-dark text-white text-xs font-medium cursor-pointer shadow-xs transition"
                              >
                                Print Permit
                              </button>
                            ) : (
                              <span className="px-2 py-1 text-xs text-slate-400">Locked</span>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Timetable Schedule Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/60 dark:bg-slate-800/40">
                          <td colSpan={6} className="p-3 sm:p-4">
                            <div className="bg-white dark:bg-slate-900 rounded-md p-3 border border-slate-200 dark:border-slate-800 space-y-2">
                              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                                Subject Timetable for {exam.name}
                              </span>
                              {(!exam.schedules || exam.schedules.length === 0) ? (
                                <p className="text-xs text-slate-400 italic">No subject timetables mapped for this examination.</p>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50">
                                        <th className="py-1.5 px-2 font-medium">SL</th>
                                        <th className="py-1.5 px-2 font-medium">Subject</th>
                                        <th className="py-1.5 px-2 font-medium">Code</th>
                                        <th className="py-1.5 px-2 font-medium">Date</th>
                                        <th className="py-1.5 px-2 font-medium">Timing</th>
                                        <th className="py-1.5 px-2 font-medium">Hall</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                      {exam.schedules.map((sch, sIdx) => (
                                        <tr key={sch.id || sIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                          <td className="py-1.5 px-2 font-mono text-slate-400">{sIdx + 1}</td>
                                          <td className="py-1.5 px-2 font-medium text-slate-900 dark:text-white">{sch.subject_name}</td>
                                          <td className="py-1.5 px-2 font-mono text-slate-600 dark:text-slate-400">{sch.subject_code || '—'}</td>
                                          <td className="py-1.5 px-2 font-mono text-slate-700 dark:text-slate-300">
                                            {sch.exam_date ? new Date(sch.exam_date).toLocaleDateString('en-GB') : 'TBA'}
                                          </td>
                                          <td className="py-1.5 px-2 font-mono text-slate-600 dark:text-slate-400">
                                            {sch.start_time || '10:00 AM'} - {sch.end_time || '01:00 PM'}
                                          </td>
                                          <td className="py-1.5 px-2 text-slate-700 dark:text-slate-300">
                                            {sch.room_number || 'Main Examination Hall'}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentAdmitCardsPage;
