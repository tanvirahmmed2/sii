'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FiFileText, FiPrinter, FiLock, FiCheckCircle, FiInfo, FiDollarSign, FiUser, FiClock } from 'react-icons/fi';
import { printAdmitCard } from '@/lib/receipts/admit_card';

const StudentAdmitCardsPage = () => {
  const [student, setStudent] = useState(null);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdmitCards = async () => {
      try {
        const res = await fetch('/api/student/admit-cards');
        if (res.ok) {
          const data = await res.json();
          const payload = data.paylod || {};
          setStudent(payload.student || null);
          setExams(payload.exams || []);
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
        <p className="text-sm font-medium text-slate-400">Loading admit cards...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-8 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/70 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-wider mb-1">
            <FiFileText /> Examination Permits
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Examination Admit Cards</h1>
          <p className="text-slate-500 text-xs sm:text-sm font-normal mt-0.5">
            View and download officially issued admit cards for upcoming term examinations.
          </p>
        </div>
      </div>

      {/* Candidate Banner */}
      {student && (
        <div className="bg-white border border-slate-200/70 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100/70 text-emerald-700 rounded-2xl flex items-center justify-center font-bold text-lg border border-emerald-200/60 shrink-0">
              {student.name ? student.name.charAt(0).toUpperCase() : <FiUser />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">{student.name}</h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                <span>Reg: <strong className="text-slate-700">{student.registration_number}</strong></span>
                <span>&bull;</span>
                <span>Class: <strong className="text-slate-700">{student.class_name} {student.section_name ? `(${student.section_name})` : ''}</strong></span>
                <span>&bull;</span>
                <span>Roll: <strong className="text-slate-700">{student.roll || 'N/A'}</strong></span>
              </div>
            </div>
          </div>

          <Link
            href="/student/fees"
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-medium transition-colors border border-slate-200/60 w-fit"
          >
            <FiDollarSign className="text-amber-500" />
            <span>Check Fee Dues</span>
          </Link>
        </div>
      )}

      {/* Exams Roster Cards */}
      {exams.length === 0 ? (
        <div className="bg-white border border-slate-200/70 rounded-3xl p-12 text-center flex flex-col items-center justify-center shadow-2xs">
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 mb-3">
            <FiInfo className="text-3xl" />
          </div>
          <h3 className="font-bold text-slate-800 text-base mb-1">No Examination Permits Found</h3>
          <p className="text-slate-400 text-xs max-w-xs">There are no published exam admit cards for your class at this moment.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {exams.map((exam) => {
            const startStr = exam.start_date ? new Date(exam.start_date).toLocaleDateString('en-GB') : 'N/A';
            const endStr = exam.end_date ? new Date(exam.end_date).toLocaleDateString('en-GB') : 'N/A';
            const isProvided = exam.isProvided;

            return (
              <div key={exam.id} className="bg-white border border-slate-200/70 rounded-3xl p-6 sm:p-8 flex flex-col gap-6 shadow-2xs">
                {/* Header bar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-800">{exam.name}</h2>
                      {exam.term && (
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded-full">
                          {exam.term}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-normal mt-1">
                      Timeline: <strong>{startStr}</strong> – <strong>{endStr}</strong> &bull; Total Timetable Entries: <strong>{exam.schedules.length}</strong>
                    </p>
                  </div>

                  {/* Issuance Status Badge */}
                  <div className="flex items-center gap-3">
                    {isProvided ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full text-xs font-semibold">
                        <FiCheckCircle className="text-emerald-600" /> Admit Card Provided
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200/60 rounded-full text-xs font-semibold">
                        <FiClock className="text-amber-600" /> Not Issued by Authority Yet
                      </span>
                    )}
                  </div>
                </div>

                {/* Body Content */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  {/* Left: Schedule Summary */}
                  <div className="flex flex-col gap-2 flex-1">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Scheduled Subjects</h3>
                    {exam.schedules.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No subject schedules mapped yet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {exam.schedules.map((sch) => (
                          <span key={sch.id} className="px-3 py-1.5 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-medium text-slate-700">
                            {sch.subject_name || 'Subject'} &bull; {sch.exam_date ? new Date(sch.exam_date).toLocaleDateString('en-GB') : 'TBA'}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right: Print / Gate Actions */}
                  <div className="flex flex-col gap-2 shrink-0">
                    {isProvided ? (
                      <button
                        onClick={() => printAdmitCard(exam, student, exam.schedules)}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
                      >
                        <FiPrinter className="text-sm" /> Print / Download Provided Admit Card
                      </button>
                    ) : (
                      <div className="flex flex-col gap-1.5 sm:items-end">
                        <button
                          disabled
                          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-400 rounded-xl text-xs font-semibold cursor-not-allowed border border-slate-200"
                        >
                          <FiLock className="text-sm text-slate-400" /> Admit Card Not Issued Yet
                        </button>
                        <p className="text-[11px] text-amber-600 font-medium flex items-center gap-1">
                          <FiInfo className="text-xs shrink-0" /> Admin / Registrar will issue your card once fee clearance is verified.
                        </p>
                      </div>
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
};

export default StudentAdmitCardsPage;
