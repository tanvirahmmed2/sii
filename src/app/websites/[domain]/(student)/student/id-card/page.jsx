'use client';

import React, { useEffect, useState } from 'react';
import { FiCreditCard, FiPrinter, FiLock, FiCheckCircle, FiUser, FiClock, FiCalendar } from 'react-icons/fi';
import { printStudentIDCard } from '@/lib/receipts/student_id_card';

const StudentIDCardPage = () => {
  const [student, setStudent] = useState(null);
  const [idCard, setIdCard] = useState(null);
  const [isProvided, setIsProvided] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIDCard = async () => {
      try {
        const res = await fetch('/api/student/id-card');
        if (res.ok) {
          const data = await res.json();
          const payload = data.paylod || {};
          setStudent(payload.student || null);
          setIdCard(payload.idCard || null);
          setIsProvided(!!payload.isProvided);
        }
      } catch (error) {
        console.error('Error fetching ID card:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchIDCard();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-400">Loading student ID card...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto pb-12 animate-fade-up">
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/70 shadow-2xs">
        <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
          <FiCreditCard /> Student Identity
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Student Identity Card</h1>
        <p className="text-slate-500 text-xs sm:text-sm font-normal mt-1">
          Official institutional identity card for student authentication and campus access.
        </p>
      </div>

      {/* Candidate Profile Summary */}
      {student && (
        <div className="bg-white border border-slate-200/70 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100/70 text-indigo-700 rounded-2xl flex items-center justify-center font-bold text-lg border border-indigo-200/60 shrink-0">
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
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200/60 rounded-full text-xs font-bold">
                <FiCheckCircle className="text-indigo-600 text-sm" /> ID Card Provided
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-50 text-amber-700 border border-amber-200/60 rounded-full text-xs font-bold">
                <FiClock className="text-amber-600 text-sm" /> Not Issued Yet
              </span>
            )}
          </div>
        </div>
      )}

      {/* ID Card Display */}
      {isProvided && idCard ? (
        <div className="bg-white border border-slate-200/70 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ID Card Number</span>
              <p className="text-base font-bold text-slate-900 font-mono">{idCard.id_card_no}</p>
            </div>
            <div className="flex items-center gap-6">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Issue Date</span>
                <p className="text-xs font-semibold text-slate-700">
                  {idCard.issue_date ? new Date(idCard.issue_date).toLocaleDateString('en-GB') : 'N/A'}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Expiry Date</span>
                <p className="text-xs font-semibold text-slate-700">
                  {idCard.expiry_date ? new Date(idCard.expiry_date).toLocaleDateString('en-GB') : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Visual Card Preview */}
          <div className="flex justify-center my-6">
            <div className="w-[300px] h-[450px] bg-white border-2 border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between relative overflow-hidden">
              <div className="bg-slate-900 text-white p-3 text-center rounded-xl">
                <p className="text-xs font-bold uppercase tracking-wider">Institutional Student ID</p>
                <p className="text-[9px] text-indigo-400 uppercase font-semibold">Official Pass</p>
              </div>

              <div className="flex flex-col items-center space-y-2 my-4">
                <div className="w-20 h-20 rounded-full border-2 border-indigo-600 bg-indigo-50 flex items-center justify-center font-bold text-2xl text-indigo-700">
                  {student.name ? student.name.charAt(0).toUpperCase() : 'S'}
                </div>
                <h3 className="font-bold text-slate-900 text-center text-sm">{student.name}</h3>
                <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                  {student.class_name} {student.section_name ? `(${student.section_name})` : ''}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-700 border-t border-slate-100 pt-3">
                <div className="flex justify-between"><span className="text-slate-400">Roll:</span> <span className="font-bold">{student.roll || 'N/A'}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Reg No:</span> <span className="font-bold">{student.registration_number}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Blood Group:</span> <span className="font-bold text-rose-600">{student.blood_group || 'N/A'}</span></div>
              </div>

              <div className="text-[9px] text-slate-400 border-t border-slate-100 pt-2 flex justify-between">
                <span>Card: {idCard.id_card_no}</span>
                <span>Status: Active</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              onClick={() => printStudentIDCard({
                id_card_no: idCard.id_card_no,
                student: student,
                expiry_date: idCard.expiry_date ? new Date(idCard.expiry_date).toLocaleDateString('en-GB') : '31/12/2026'
              })}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <FiPrinter className="text-sm" /> Print / Download Official Student ID Card
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/70 rounded-3xl p-12 text-center flex flex-col items-center justify-center shadow-2xs space-y-3">
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400">
            <FiLock className="text-3xl text-slate-400" />
          </div>
          <h3 className="font-bold text-slate-800 text-base">Student ID Card Not Provided Yet</h3>
          <p className="text-slate-400 text-xs max-w-sm">
            Your official student identity card has not been issued by the school administration or registrar's office yet. Please contact the office to issue your ID card.
          </p>
        </div>
      )}
    </div>
  );
};

export default StudentIDCardPage;
