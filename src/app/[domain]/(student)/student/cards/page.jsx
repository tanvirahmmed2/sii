'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  FiFileText, FiPrinter, FiLock, FiCheckCircle, 
  FiInfo, FiDollarSign, FiUser, FiClock, FiCalendar, FiMapPin 
} from 'react-icons/fi';
import { printAdmitCard } from 'src/lib/receipts/admit_card';

const StudentAdmitCardsPage = () => {
  const [student, setStudent] = useState(null);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedExamId, setExpandedExamId] = useState(null);

  useEffect(() => {
    const fetchAdmitCards = async () => {
      try {
        const res = await fetch('/api/student/admit-cards');
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
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-400">Loading examination admit cards...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-12 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/70 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-wider mb-1">
            <FiFileText /> Examination Passes & Permits
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">Examination Admit Cards</h1>
          <p className="text-slate-500 text-xs sm:text-sm font-normal mt-0.5">
            Download certified examination entry passes, verify candidate registration, and review seated subject timetables.
          </p>
        </div>

        <Link
          href="/student/fees"
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors border border-slate-200/60 w-fit shrink-0"
        >
          <FiDollarSign className="text-amber-500 text-sm" />
          <span>Verify Fee Clearance</span>
        </Link>
      </div>

      {/* Candidate Banner */}
      {student && (
        <div className="bg-white border border-slate-200/70 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100/70 text-emerald-800 rounded-2xl flex items-center justify-center font-bold text-lg border border-emerald-200/60 shrink-0">
              {student.name ? student.name.charAt(0).toUpperCase() : <FiUser />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">{student.name}</h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                <span>Registration No: <strong className="text-slate-800 font-mono">{student.registration_number}</strong></span>
                <span>&bull;</span>
                <span>Class: <strong className="text-slate-800">{student.class_name} {student.section_name ? `(${student.section_name})` : ''}</strong></span>
                <span>&bull;</span>
                <span>Roll: <strong className="text-slate-800">{student.roll || 'N/A'}</strong></span>
              </div>
            </div>
          </div>

          <div className="px-4 py-2 bg-emerald-50 rounded-2xl border border-emerald-100 text-emerald-700 text-xs font-bold w-fit">
            Candidate Verified
          </div>
        </div>
      )}

      {/* Exams Roster Cards */}
      {exams.length === 0 ? (
        <div className="bg-white border border-slate-200/70 rounded-3xl p-12 text-center flex flex-col items-center justify-center shadow-xs">
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 mb-3">
            <FiInfo className="text-3xl" />
          </div>
          <h3 className="font-bold text-slate-800 text-base mb-1">No Examination Passes Found</h3>
          <p className="text-slate-400 text-xs max-w-xs">
            There are no active or published examination admit cards for your class section at this moment.
          </p>
        </div>
      ) : (
        /* Examination Permits Table */
        <div className="bg-white border border-slate-200/70 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col gap-6">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Available Examination Entry Permits</h2>
            <p className="text-xs text-slate-400 font-medium">Officially issued hall tickets with candidate seat allocations</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                  <th className="py-3 px-4 rounded-l-xl">Examination</th>
                  <th className="py-3 px-4">Term</th>
                  <th className="py-3 px-4">Examination Timeline</th>
                  <th className="py-3 px-4">Admit Card No.</th>
                  <th className="py-3 px-4 text-center">Permit Status</th>
                  <th className="py-3 px-4 text-right rounded-r-xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {exams.map((exam) => {
                  const startStr = exam.start_date ? new Date(exam.start_date).toLocaleDateString('en-GB') : 'TBA';
                  const endStr = exam.end_date ? new Date(exam.end_date).toLocaleDateString('en-GB') : 'TBA';
                  const isProvided = exam.isProvided;
                  const isExpanded = expandedExamId === exam.id;

                  return (
                    <React.Fragment key={exam.id}>
                      <tr className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-800">
                          {exam.name}
                          <span className="block text-xs font-normal text-slate-400">
                            {exam.schedules?.length || 0} scheduled subjects
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            {exam.term || 'Term Final'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-medium text-slate-600 whitespace-nowrap">
                          {startStr} &ndash; {endStr}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-xs text-slate-700">
                          {exam.admit_card_number}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {isProvided ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full text-xs font-bold">
                              <FiCheckCircle className="text-emerald-600" /> Issued &amp; Ready
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200/60 rounded-full text-xs font-bold">
                              <FiClock className="text-amber-600" /> Pending Verification
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setExpandedExamId(isExpanded ? null : exam.id)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                            >
                              {isExpanded ? 'Hide Routine' : 'View Routine'}
                            </button>
                            {isProvided ? (
                              <button
                                onClick={() => printAdmitCard(exam, student, exam.schedules || [])}
                                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                              >
                                <FiPrinter className="text-xs" /> Print Card
                              </button>
                            ) : (
                              <button
                                disabled
                                className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-400 rounded-xl text-xs font-medium cursor-not-allowed border border-slate-200"
                              >
                                <FiLock className="text-xs" /> Locked
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Timetable Schedule Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/70">
                          <td colSpan={6} className="p-4 sm:p-6">
                            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
                              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                <FiCalendar className="text-emerald-600" /> Scheduled Subjects for {exam.name}
                              </h4>
                              {(!exam.schedules || exam.schedules.length === 0) ? (
                                <p className="text-xs text-slate-400 italic">No subject timetables mapped for this examination.</p>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                      <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                                        <th className="py-2 px-3">SL</th>
                                        <th className="py-2 px-3">Subject Name</th>
                                        <th className="py-2 px-3">Subject Code</th>
                                        <th className="py-2 px-3">Examination Date</th>
                                        <th className="py-2 px-3">Timing</th>
                                        <th className="py-2 px-3">Hall / Room</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {exam.schedules.map((sch, sIdx) => (
                                        <tr key={sch.id || sIdx} className="hover:bg-slate-50">
                                          <td className="py-2.5 px-3 font-mono text-slate-400">{sIdx + 1}</td>
                                          <td className="py-2.5 px-3 font-bold text-slate-800">{sch.subject_name}</td>
                                          <td className="py-2.5 px-3 font-mono text-slate-600">{sch.subject_code || '—'}</td>
                                          <td className="py-2.5 px-3 font-semibold text-slate-700">
                                            {sch.exam_date ? new Date(sch.exam_date).toLocaleDateString('en-GB') : 'TBA'}
                                          </td>
                                          <td className="py-2.5 px-3 text-slate-600 font-mono">
                                            {sch.start_time || '10:00 AM'} - {sch.end_time || '01:00 PM'}
                                          </td>
                                          <td className="py-2.5 px-3 text-emerald-700 font-semibold">
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
