'use client';

import React, { useEffect, useState } from 'react';
import { FiAward, FiPrinter, FiLock, FiCheckCircle, FiInfo, FiUser, FiClock } from 'react-icons/fi';
import { printTestimonial } from '@/lib/receipts/testimonial';

const StudentTestimonialPage = () => {
  const [student, setStudent] = useState(null);
  const [testimonial, setTestimonial] = useState(null);
  const [isProvided, setIsProvided] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTestimonial = async () => {
      try {
        const res = await fetch('/api/student/testimonial');
        if (res.ok) {
          const data = await res.json();
          const payload = data.paylod || {};
          setStudent(payload.student || null);
          setTestimonial(payload.testimonial || null);
          setIsProvided(!!payload.isProvided);
        }
      } catch (error) {
        console.error('Error fetching testimonial:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTestimonial();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-400">Loading testimonial record...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto pb-12 animate-fade-up">
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/70 shadow-2xs">
        <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-wider mb-1">
          <FiAward /> Certification Portal
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Character Testimonial</h1>
        <p className="text-slate-500 text-xs sm:text-sm font-normal mt-1">
          Official academic and conduct testimonial issued by the institution headmaster or registrar.
        </p>
      </div>

      {/* Candidate Profile Summary */}
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

          <div>
            {isProvided ? (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full text-xs font-bold">
                <FiCheckCircle className="text-emerald-600 text-sm" /> Testimonial Available
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-50 text-amber-700 border border-amber-200/60 rounded-full text-xs font-bold">
                <FiClock className="text-amber-600 text-sm" /> Not Issued Yet
              </span>
            )}
          </div>
        </div>
      )}

      {/* Testimonial Card Display */}
      {isProvided && testimonial ? (
        <div className="bg-white border border-slate-200/70 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Testimonial Ref No</span>
              <p className="text-base font-bold text-slate-900 font-mono">{testimonial.testimonial_no}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Issue Date</span>
              <p className="text-sm font-semibold text-slate-700">
                {testimonial.issue_date ? new Date(testimonial.issue_date).toLocaleDateString('en-GB') : 'N/A'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Academic Performance</span>
              <p className="text-sm font-bold text-slate-900">{testimonial.academic_character || 'N/A'}</p>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">General Conduct</span>
              <p className="text-sm font-bold text-slate-900">{testimonial.conduct || 'N/A'}</p>
            </div>
          </div>

          {testimonial.remarks && (
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Institutional Remarks</span>
              <p className="text-xs text-slate-700 italic">{testimonial.remarks}</p>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              onClick={() => printTestimonial({
                testimonial_no: testimonial.testimonial_no,
                student: student,
                academic_character: testimonial.academic_character,
                conduct: testimonial.conduct,
                remarks: testimonial.remarks,
                issue_date: testimonial.issue_date ? new Date(testimonial.issue_date).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')
              })}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <FiPrinter className="text-sm" /> Print / Download Official Testimonial
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/70 rounded-3xl p-12 text-center flex flex-col items-center justify-center shadow-2xs space-y-3">
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400">
            <FiLock className="text-3xl text-slate-400" />
          </div>
          <h3 className="font-bold text-slate-800 text-base">Testimonial Not Issued Yet</h3>
          <p className="text-slate-400 text-xs max-w-sm">
            Your character testimonial has not been issued by the school administration or registrar's office yet. Please contact the administration once your term or graduation is completed.
          </p>
        </div>
      )}
    </div>
  );
};

export default StudentTestimonialPage;
